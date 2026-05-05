/* ============================================================
   AI Chat — Backend proxy, streaming, archive & query
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'ai-chat-current';
  var ADMIN_PASSWORD = 'luna2026';
  var SYSTEM_PROMPT = '你是这个博客主人的 AI 分身。你的性格幽默轻松、友善热情。你了解编程（前端、后端、AI 都略知一二）、热爱旅行摄影、喜欢读书和美食。回答问题时简洁有趣，偶尔可以夹带一些 emoji 表情。如果用户问到你不确定的事情，坦诚说不知道并给出合理建议。请用中文回复。';

  var MOCK_RESPONSES = [
    '嘿，你好呀！😄 AI 接口暂时连不上，不过等恢复后我就能真正和你聊天啦~',
    '这个问题很有趣！不过我现在处于离线模式，请稍后再试试 🤖',
    '作为博客主人的 AI 分身，我暂时无法回复，但服务恢复后就自由了！✨'
  ];

  var msgContainer = document.getElementById('chat-messages');
  var chatInput    = document.getElementById('chat-input');
  var sendBtn      = document.getElementById('chat-send');

  var currentMessages = [];
  var archives = [];
  var activeTab = 'chat'; // 'chat' | 'history'
  var searchQuery = '';
  var isAdmin = false;

  /* --- User ID (anonymous, per browser) --- */
  function getUserId() {
    var uid = localStorage.getItem('blog-user-id');
    if (!uid) {
      uid = 'u-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);
      localStorage.setItem('blog-user-id', uid);
    }
    return uid;
  }

  function checkAdminState() {
    isAdmin = sessionStorage.getItem('blog-admin') === 'true';
  }

  /* ============================================================
     Tabs & Archive UI
     ============================================================ */
  function injectTabsUI() {
    var container = document.querySelector('#ai-chat .section-inner');
    if (!container || document.getElementById('chat-tabs')) return;

    var tabsHTML =
      '<div class="chat-tabs" id="chat-tabs">' +
        '<button class="chat-tab active" data-tab="chat">当前对话</button>' +
        '<button class="chat-tab" data-tab="history">历史记录</button>' +
      '</div>';

    var chatContainer = container.querySelector('.chat-container');
    chatContainer.insertAdjacentHTML('beforebegin', tabsHTML);

    /* History panel */
    var historyHTML =
      '<div class="chat-history-panel" id="chat-history-panel" style="display:none">' +
        '<div class="chat-history-header">' +
          '<input type="text" id="chat-search-input" class="form-input chat-history-search" placeholder="搜索历史对话...">' +
          '<button class="chat-admin-btn" id="chat-admin-btn" title="管理员模式">🔑</button>' +
        '</div>' +
        '<div class="chat-history-list" id="chat-history-list"></div>' +
      '</div>';
    chatContainer.insertAdjacentHTML('afterend', historyHTML);

    /* Archive button in chat header */
    var chatHeader = chatContainer.querySelector('.chat-header');
    var archiveBtn = '<button class="chat-archive-btn" id="chat-archive-btn" title="归档当前对话">📥 归档</button>';
    chatHeader.insertAdjacentHTML('beforeend', archiveBtn);

    /* Bind events */
    document.getElementById('chat-tabs').addEventListener('click', function (e) {
      var tab = e.target.closest('.chat-tab');
      if (!tab) return;
      switchTab(tab.getAttribute('data-tab'));
    });

    document.getElementById('chat-archive-btn').addEventListener('click', archiveCurrentChat);
    document.getElementById('chat-search-input').addEventListener('input', function () {
      searchQuery = this.value.trim().toLowerCase();
      renderArchiveList();
    });

    document.getElementById('chat-admin-btn').addEventListener('click', function () {
      if (isAdmin) {
        isAdmin = false;
        sessionStorage.removeItem('blog-admin');
        this.textContent = '🔑';
        this.title = '管理员模式';
        updateChatHeaderAdmin();
        if (currentMessages.length === 0) showWelcome();
        renderArchiveList();
      } else {
        var pwd = prompt('请输入管理员密码：');
        if (pwd === ADMIN_PASSWORD) {
          isAdmin = true;
          sessionStorage.setItem('blog-admin', 'true');
          this.textContent = '🔓';
          this.title = '管理员模式（已开启，点击退出）';
          updateChatHeaderAdmin();
          if (currentMessages.length === 0) showWelcome();
          renderArchiveList();
        } else if (pwd !== null) {
          alert('密码错误');
        }
      }
    });
  }

  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.chat-tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tab);
    });

    var chatContainer = document.querySelector('.chat-container');
    var historyPanel  = document.getElementById('chat-history-panel');

    if (tab === 'chat') {
      chatContainer.style.display = '';
      historyPanel.style.display = 'none';
    } else {
      chatContainer.style.display = 'none';
      historyPanel.style.display = '';
      loadArchives();
    }
  }

  /* ============================================================
     Archive: load, save, search
     ============================================================ */
  function loadArchives() {
    fetch('/api/chat-history')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        archives = data || [];
        renderArchiveList();
      })
      .catch(function () {
        archives = [];
        renderArchiveList();
      });
  }

  function renderArchiveList() {
    var list = document.getElementById('chat-history-list');
    if (!list) return;

    var uid = getUserId();
    var filtered = isAdmin ? archives : archives.filter(function (a) { return a.userId === uid; });

    if (searchQuery) {
      filtered = filtered.filter(function (a) {
        if (a.title.toLowerCase().indexOf(searchQuery) !== -1) return true;
        return a.messages.some(function (m) {
          return m.content.toLowerCase().indexOf(searchQuery) !== -1;
        });
      });
    }

    var modeLabel = isAdmin ? '<div class="chat-admin-badge">🔓 管理员视图（共 ' + archives.length + ' 条）</div>' : '';

    if (filtered.length === 0) {
      var emptyMsg = searchQuery ? '没有找到匹配的对话 🔍' : '暂无归档对话，点击对话框中的 📥 按钮归档';
      list.innerHTML = modeLabel + '<p style="color:var(--text-muted);text-align:center;padding:2rem">' + emptyMsg + '</p>';
      return;
    }

    filtered.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    var html = modeLabel;

    html += filtered.map(function (archive) {
      var preview = '';
      if (archive.messages.length > 0) {
        var first = archive.messages[0];
        preview = (first.role === 'user' ? '👤 ' : '🤖 ') + first.content.substring(0, 60);
        if (first.content.length > 60) preview += '...';
      }

      var messagesHtml = archive.messages.map(function (m) {
        var avatar = m.role === 'ai' ? '🤖' : '👤';
        return '<div class="archive-msg archive-msg-' + m.role + '">' +
          '<span class="archive-msg-avatar">' + avatar + '</span>' +
          '<span class="archive-msg-text">' + window.escHtml(m.content) + '</span>' +
        '</div>';
      }).join('');

      return '<div class="archive-card" data-id="' + archive.id + '">' +
        '<div class="archive-card-header">' +
          '<div class="archive-card-title">' + window.escHtml(archive.title) + '</div>' +
          '<div class="archive-card-date">' + window.formatDateTime(archive.date) + '</div>' +
        '</div>' +
        '<div class="archive-card-preview">' + window.escHtml(preview) + '</div>' +
        '<div class="archive-card-meta">' +
          '<span>' + archive.messages.length + ' 条消息</span>' +
          '<div class="archive-card-actions">' +
            '<button class="btn-edit-sm" data-action="view" data-id="' + archive.id + '">查看</button>' +
            '<button class="btn-delete-sm" data-action="delete" data-id="' + archive.id + '">删除</button>' +
          '</div>' +
        '</div>' +
        '<div class="archive-msgs" data-msgs-for="' + archive.id + '" style="display:none">' + messagesHtml + '</div>' +
      '</div>';
    }).join('');
    list.innerHTML = html;
  }

  function archiveCurrentChat() {
    if (currentMessages.length === 0) {
      alert('当前对话为空，无法归档');
      return;
    }

    /* Generate title from first user message */
    var firstUser = currentMessages.find(function (m) { return m.role === 'user'; });
    var title = firstUser ? firstUser.content.substring(0, 30) : '对话记录';
    if (firstUser && firstUser.content.length > 30) title += '...';

    var archive = {
      id: window.genId(),
      userId: getUserId(),
      title: title,
      date: window.toLocalISOString(),
      messages: currentMessages.slice()
    };

    window.BlogData.create('chat-history', archive).then(function () {
      archives.push(archive);
      alert('对话已归档！可在"历史记录"标签中查看。');
    }).catch(function () {
      alert('归档失败，请重试');
    });
  }

  /* Archive event delegation */
  function bindArchiveEvents() {
    var panel = document.getElementById('chat-history-panel');
    if (!panel) return;

    panel.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;

      var action = btn.getAttribute('data-action');
      var id = btn.getAttribute('data-id');

      if (action === 'view') {
        var msgsEl = panel.querySelector('.archive-msgs[data-msgs-for="' + id + '"]');
        if (msgsEl) {
          var isExpanded = msgsEl.style.display !== 'none';
          panel.querySelectorAll('.archive-msgs').forEach(function (el) { el.style.display = 'none'; });
          if (!isExpanded) {
            msgsEl.style.display = 'block';
            btn.textContent = '收起';
          } else {
            btn.textContent = '查看';
          }
        }
      } else if (action === 'delete') {
        if (confirm('确定删除这条归档对话？')) {
          window.BlogData.remove('chat-history', id).then(function () {
            archives = archives.filter(function (a) { return a.id !== id; });
            renderArchiveList();
          });
        }
      }
    });
  }

  function viewArchive(archive) {
    /* Switch to chat tab and render the archived messages */
    switchTab('chat');
    msgContainer.innerHTML = '';

    /* Title bar */
    var titleEl = document.createElement('div');
    titleEl.className = 'chat-archive-viewing';
    titleEl.innerHTML = '<span>📖 正在查看归档: ' + window.escHtml(archive.title) + '</span>' +
      '<button class="btn-edit-sm" id="archive-back-btn">返回当前对话</button>';
    msgContainer.appendChild(titleEl);

    archive.messages.forEach(function (m) {
      renderMessage(m.role, m.content);
    });

    document.getElementById('archive-back-btn').addEventListener('click', function () {
      renderChatUI();
    });
  }

  function renderChatUI() {
    msgContainer.innerHTML = '';
    if (currentMessages.length === 0) {
      showWelcome();
    } else {
      currentMessages.forEach(function (m) {
        renderMessage(m.role, m.content);
      });
    }
  }

  /* ============================================================
     Chat Core
     ============================================================ */
  function getLocalHistory() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
  }

  function saveLocalHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-50)));
    } catch (e) { /* ignore */ }
  }

  function renderMessage(role, content) {
    if (!msgContainer) return null;
    var div = document.createElement('div');
    div.className = 'chat-msg chat-msg-' + role;
    var avatar = role === 'ai' ? '🤖' : '👤';
    div.innerHTML = '<div class="chat-msg-avatar">' + avatar + '</div>' +
                    '<div class="chat-bubble">' + formatContent(content) + '</div>';
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
    return div;
  }

  function formatContent(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(128,128,128,0.15);padding:0.1rem 0.35rem;border-radius:3px;font-size:0.85em">$1</code>');
  }

  function showTyping() {
    if (!msgContainer) return null;
    var div = document.createElement('div');
    div.className = 'chat-msg chat-msg-ai';
    div.id = 'typing-indicator';
    div.innerHTML = '<div class="chat-msg-avatar">🤖</div>' +
                    '<div class="chat-bubble"><div class="chat-typing"><span></span><span></span><span></span></div></div>';
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
    return div;
  }

  function removeTyping() {
    var el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  function updateChatHeaderAdmin() {
    var info = document.querySelector('.chat-header-info p');
    if (!info) return;
    info.textContent = isAdmin ? '在线 · 主人模式' : '在线 · 幽默轻松';
  }

  function showWelcome() {
    if (!msgContainer) return;
    var title = isAdmin ? '你好 Luna，这是你的 AI 分身！' : '你好，我是博客主人的 AI 分身！';
    var desc = isAdmin ? '现在你以主人身份对话，AI 会用第一人称和你聊。<br>随便聊聊吧~' : '我可以和你聊聊技术、旅行、读书，或者任何你感兴趣的话题。<br>快开始和我聊天吧~';
    msgContainer.innerHTML =
      '<div class="chat-welcome">' +
        '<span class="chat-welcome-icon">' + (isAdmin ? '👋' : '🤖') + '</span>' +
        '<h4>' + title + '</h4>' +
        '<p>' + desc + '</p>' +
      '</div>';
  }

  /* --- API call via backend proxy --- */
  async function streamFromAPI(userMessage) {
    var messages = [{ role: 'system', content: SYSTEM_PROMPT }];
    currentMessages.forEach(function (m) {
      messages.push({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content });
    });

    try {
      var response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages, isAdmin: isAdmin })
      });

      if (!response.ok) {
        var errData;
        try { errData = await response.json(); } catch (e) { errData = { error: '请求失败' }; }
        throw new Error(errData.error || 'API 请求失败 (' + response.status + ')');
      }

      removeTyping();
      var msgEl = renderMessage('ai', '');
      var bubble = msgEl.querySelector('.chat-bubble');
      var fullContent = '';

      if (response.body && response.body.getReader) {
        var reader = response.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';

        while (true) {
          var result = await reader.read();
          if (result.done) break;
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line || !line.startsWith('data: ')) continue;
            var data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              var parsed = JSON.parse(data);
              var delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta;
              if (delta && delta.content) {
                fullContent += delta.content;
                bubble.innerHTML = formatContent(fullContent);
                msgContainer.scrollTop = msgContainer.scrollHeight;
              }
            } catch (e) { /* ignore parse errors */ }
          }
        }
      } else {
        var rdata = await response.json();
        fullContent = (rdata.choices && rdata.choices[0] && rdata.choices[0].message && rdata.choices[0].message.content) || '请求完成，但返回内容为空。';
        bubble.innerHTML = formatContent(fullContent);
      }

      return fullContent;
    } catch (e) {
      removeTyping();
      console.warn('AI Chat API 请求失败:', e.message);
      return null;
    }
  }

  /* --- Send message --- */
  async function sendMessage(text) {
    if (!text || !text.trim()) return;
    text = text.trim();

    renderMessage('user', text);
    currentMessages.push({ role: 'user', content: text });
    saveLocalHistory(currentMessages);

    if (chatInput) chatInput.value = '';
    autoResizeInput(chatInput);

    showTyping();

    var aiContent = await streamFromAPI(text);

    if (!aiContent || !aiContent.trim()) {
      var msgs = msgContainer.querySelectorAll('.chat-msg-ai');
      var lastMsg = msgs[msgs.length - 1];
      if (lastMsg) lastMsg.remove();
      aiContent = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
      renderMessage('ai', aiContent);
    }

    currentMessages.push({ role: 'ai', content: aiContent });
    saveLocalHistory(currentMessages);
  }

  function autoResizeInput(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }

  function renderChatHistory() {
    currentMessages = getLocalHistory();
    if (currentMessages.length === 0) {
      showWelcome();
    } else {
      currentMessages.forEach(function (msg) {
        renderMessage(msg.role, msg.content);
      });
    }
  }

  /* --- Events --- */
  if (chatInput) {
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(chatInput.value);
      }
    });
    chatInput.addEventListener('input', function () {
      autoResizeInput(this);
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', function () {
      if (chatInput) sendMessage(chatInput.value);
    });
  }

  /* --- Init --- */
  checkAdminState();
  injectTabsUI();
  bindArchiveEvents();
  renderChatHistory();

  /* Update admin button UI if already logged in */
  if (isAdmin) {
    var adminBtn = document.getElementById('chat-admin-btn');
    if (adminBtn) {
      adminBtn.textContent = '🔓';
      adminBtn.title = '管理员模式（已开启，点击退出）';
    }
    updateChatHeaderAdmin();
  }

})();
