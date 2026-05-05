const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname, {
  setHeaders: function (res) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

const DATA_DIR = path.join(__dirname, 'data');

function readJSON(file) {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) return [];
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); }
  catch { return []; }
}

function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8');
  // Persist to GitHub so data survives Railway restarts
  pushToGitHub(file);
}

async function pushToGitHub(file) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return;
  const repo = process.env.GITHUB_REPO || 'mha-a11y/my_blog';
  const fp = 'data/' + file;
  const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
  try {
    // Get current file SHA (required for update)
    const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${fp}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'my-blog' }
    });
    let sha = undefined;
    if (getRes.ok) {
      const info = await getRes.json();
      sha = info.sha;
    }
    // Create or update file
    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${fp}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'my-blog'
      },
      body: JSON.stringify({
        message: 'Auto-save ' + file,
        content: Buffer.from(content).toString('base64'),
        sha: sha
      })
    });
    if (putRes.ok) console.log('[github-save]', file, 'persisted');
    else console.error('[github-save] failed:', putRes.status, await putRes.text());
  } catch (e) {
    console.error('[github-save] error:', e.message);
  }
}

// ========== AI Chat Proxy ==========
const ADMIN_SYSTEM_PROMPT = '你是博客主人 Luna 本人。你正在通过 AI 分身和访客对话，但现在对面是你自己（Luna），所以请用第一人称"我"来回答，就像你在和自己聊天一样。你可以回忆自己的经历、分享内心想法、用轻松的语气自言自语。偶尔可以用 emoji。请用中文回复。';

app.post('/api/chat', async (req, res) => {
  const { messages, isAdmin } = req.body;
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'mimo-v2.5-pro';

  if (!baseUrl || !apiKey) {
    return res.status(500).json({ error: 'AI 服务未配置' });
  }

  // Override system prompt if admin
  if (isAdmin && messages.length > 0 && messages[0].role === 'system') {
    messages[0].content = ADMIN_SYSTEM_PROMPT;
  }

  try {
    const { default: fetch } = await import('node-fetch');
    const upstream = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.8,
        stream: true
      })
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return res.status(upstream.status).json({ error: err });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Transform reasoning model responses manually
    let buffer = '';

    upstream.body.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) {
          res.write(line + '\n');
          continue;
        }
        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta;
          if (delta) {
            delete delta.reasoning_content;
            if (delta.content === null) delta.content = '';
          }
          res.write('data: ' + JSON.stringify(parsed) + '\n\n');
        } catch (e) {
          res.write(line + '\n');
        }
      }
    });

    upstream.body.on('end', () => {
      if (buffer.trim()) res.write(buffer);
      res.end();
    });

    upstream.body.on('error', (e) => {
      console.error('Upstream stream error:', e.message);
      res.end();
    });
  } catch (e) {
    console.error('AI proxy error:', e.message);
    res.status(500).json({ error: 'AI 服务请求失败: ' + e.message });
  }
});

// ========== CRUD Helpers ==========
function createCRUD(router, file, key) {
  // List all
  router.get(`/${key}`, (req, res) => {
    res.json(readJSON(file));
  });

  // Create
  router.post(`/${key}`, (req, res) => {
    const list = readJSON(file);
    const item = req.body;
    if (!item.id) item.id = 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    list.push(item);
    writeJSON(file, list);
    res.json(item);
  });

  // Update
  router.put(`/${key}/:id`, (req, res) => {
    const list = readJSON(file);
    const idx = list.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    list[idx] = { ...list[idx], ...req.body };
    writeJSON(file, list);
    res.json(list[idx]);
  });

  // Delete
  router.delete(`/${key}/:id`, (req, res) => {
    let list = readJSON(file);
    list = list.filter(i => i.id !== req.params.id);
    writeJSON(file, list);
    res.json({ ok: true });
  });
}

// ========== API Routes ==========
const api = express.Router();
createCRUD(api, 'essays.json', 'essays');
createCRUD(api, 'gallery.json', 'gallery');
createCRUD(api, 'github.json', 'github');
createCRUD(api, 'guestbook.json', 'guestbook');
createCRUD(api, 'chat-history.json', 'chat-history');

app.use('/api', api);

// ========== Fallback ==========
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Blog server running at http://localhost:${PORT}`);
});
