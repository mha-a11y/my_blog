/* ============================================================
   GitHub Section — Repo cards with CRUD
   ============================================================ */
(function () {
  'use strict';

  var container = document.getElementById('github-grid');
  var addBtn    = document.getElementById('add-repo-btn');

  var LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
    Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', Vue: '#41b883',
    CSS: '#563d7c', HTML: '#e34c26', 'C++': '#f34b7d', C: '#555555',
    Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF',
    Dart: '#00B4AB', Shell: '#89e051', Lua: '#000080'
  };

  var allRepos = [];
  var activeMonth = null;

  /* --- Archive sidebar (month filter) --- */
  function renderArchive() {
    var groups = window.groupByMonth(allRepos, 'updated');
    var archiveEl = document.getElementById('github-archive');
    if (!archiveEl) return;

    if (groups.length === 0) {
      archiveEl.innerHTML = '';
      return;
    }

    var html = '<div class="archive-title">归档</div>';
    html += '<div class="archive-list">';
    html += '<button class="archive-btn ' + (!activeMonth ? 'active' : '') + '" data-month="">全部 (' + allRepos.length + ')</button>';
    groups.forEach(function (g) {
      var count = g.items.length;
      html += '<button class="archive-btn ' + (activeMonth === g.label ? 'active' : '') +
              '" data-month="' + g.label + '">' + window.monthLabel(g.label) + ' (' + count + ')</button>';
    });
    html += '</div>';
    archiveEl.innerHTML = html;
  }

  function getFiltered() {
    if (!activeMonth) return allRepos;
    return allRepos.filter(function (r) {
      var d = new Date(r.updated);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      return key === activeMonth;
    });
  }

  function timeAgo(dateStr) {
    var diff = Date.now() - new Date(dateStr).getTime();
    var days = Math.floor(diff / 86400000);
    if (days <= 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return days + '天前';
    if (days < 30) return Math.floor(days / 7) + '周前';
    return Math.floor(days / 30) + '月前';
  }

  function formatNum(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function render(repos) {
    allRepos = repos;
    renderArchive();
    renderList();
  }

  function renderList() {
    if (!container) return;
    var repos = getFiltered();

    if (repos.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;grid-column:1/-1">还没有仓库，点击上方按钮添加 📦</p>';
      return;
    }

    repos.sort(function (a, b) { return new Date(b.updated) - new Date(a.updated); });

    container.innerHTML = repos.map(function (repo) {
      var color = LANG_COLORS[repo.language] || '#999';

      return '<article class="repo-card card" data-id="' + repo.id + '">' +
        '<div class="repo-card-header">' +
          '<div class="repo-name">' +
            '<svg viewBox="0 0 16 16" width="16" height="16" fill="var(--text-muted)"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.25.25 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>' +
            '<a href="' + window.escHtml(repo.url) + '" target="_blank" rel="noopener">' + window.escHtml(repo.name) + '</a>' +
          '</div>' +
          '<div class="repo-card-actions">' +
            '<button class="btn-edit-sm admin-only" data-action="edit" data-id="' + repo.id + '">编辑</button>' +
            '<button class="btn-delete-sm admin-only" data-action="delete" data-id="' + repo.id + '">删除</button>' +
          '</div>' +
        '</div>' +
        '<p class="repo-desc">' + window.escHtml(repo.description || '暂无描述') + '</p>' +
        '<div class="repo-meta">' +
          (repo.language ? '<span class="repo-lang"><span class="lang-dot" style="background:' + color + '"></span>' + window.escHtml(repo.language) + '</span>' : '') +
          '<span class="repo-stat">⭐ ' + formatNum(repo.stars) + '</span>' +
          '<span class="repo-stat">🍴 ' + formatNum(repo.forks) + '</span>' +
          '<span class="repo-stat">📅 ' + timeAgo(repo.updated) + '</span>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function openEditor(repo) {
    var isNew = !repo;
    var data = repo || { name: '', description: '', language: 'JavaScript', stars: 0, forks: 0, url: '', updated: window.toLocalDateString() };
    var langs = Object.keys(LANG_COLORS);

    window.openModal(
      isNew ? '添加仓库' : '编辑仓库',
      [
        { name: 'name',        label: '仓库名称',   type: 'text',     value: data.name },
        { name: 'description', label: '描述',       type: 'textarea', value: data.description },
        { name: 'language',    label: '语言',       type: 'select',   value: data.language, options: langs },
        { name: 'stars',       label: 'Stars',      type: 'number',   value: String(data.stars) },
        { name: 'forks',       label: 'Forks',      type: 'number',   value: String(data.forks) },
        { name: 'url',         label: '仓库链接',   type: 'text',     value: data.url },
        { name: 'updated',     label: '更新日期',   type: 'date',     value: data.updated }
      ],
      function (formData) {
        if (isNew) {
          var newItem = {
            id: window.genId(),
            name: formData.name,
            description: formData.description,
            language: formData.language,
            stars: parseInt(formData.stars, 10) || 0,
            forks: parseInt(formData.forks, 10) || 0,
            url: formData.url,
            updated: formData.updated
          };
          window.BlogData.create('github', newItem).then(function () {
            allRepos.push(newItem);
            window.BlogData.save('github', allRepos);
            renderArchive();
            renderList();
          });
        } else {
          window.BlogData.update('github', repo.id, {
            name: formData.name,
            description: formData.description,
            language: formData.language,
            stars: parseInt(formData.stars, 10) || 0,
            forks: parseInt(formData.forks, 10) || 0,
            url: formData.url,
            updated: formData.updated
          }).then(function () {
            allRepos = allRepos.map(function (r) {
              if (r.id === repo.id) {
                return { id: r.id, name: formData.name, description: formData.description, language: formData.language, stars: parseInt(formData.stars, 10) || 0, forks: parseInt(formData.forks, 10) || 0, url: formData.url, updated: formData.updated };
              }
              return r;
            });
            window.BlogData.save('github', allRepos);
            renderArchive();
            renderList();
          });
        }
      }
    );
  }

  if (container) {
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;

      var action = btn.getAttribute('data-action');
      var id = btn.getAttribute('data-id');

      if (action === 'edit') {
        if (!window.requireAdmin()) return;
        var repo = allRepos.find(function (r) { return r.id === id; });
        if (repo) openEditor(repo);
      } else if (action === 'delete') {
        if (!window.requireAdmin()) return;
        if (confirm('确定删除这个仓库？')) {
          window.BlogData.remove('github', id).then(function () {
            allRepos = allRepos.filter(function (r) { return r.id !== id; });
            window.BlogData.save('github', allRepos);
            renderArchive();
            renderList();
          });
        }
      }
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', function () { if (window.requireAdmin()) openEditor(null); });
  }

  /* Archive filter delegation */
  var archiveContainer = document.getElementById('github-archive');
  if (archiveContainer) {
    archiveContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('.archive-btn');
      if (!btn) return;
      activeMonth = btn.getAttribute('data-month') || null;
      renderArchive();
      renderList();
    });
  }

  window.BlogData.load('github', 'data/github.json', render);

})();
