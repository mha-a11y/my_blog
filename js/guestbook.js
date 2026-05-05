/* ============================================================
   Guestbook Section — Messages with CRUD, Archive & Reply
   ============================================================ */
(function () {
  'use strict';

  var container  = document.getElementById('guestbook-messages');
  var nameInput  = document.getElementById('gb-name');
  var msgInput   = document.getElementById('gb-msg');
  var submitBtn  = document.getElementById('gb-submit-btn');

  var AVATARS = ['😊', '🧑', '👩', '👨', '👩‍🎨', '👨‍💻', '🧑‍🚀', '👩‍🔬', '🐒', '🐱', '🌸', '✨', '🔥', '🌈', '🎵', '✈️', '🌱', '💡'];
  var allMessages = [];
  var activeDay = null;

  var ICON_EDIT = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';
  var ICON_DELETE = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
  var ICON_REPLY = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>';

  function randomAvatar() {
    return AVATARS[Math.floor(Math.random() * AVATARS.length)];
  }

  /* --- Archive sidebar (day filter) --- */
  function groupByDay(items) {
    var groups = {};
    items.forEach(function (item) {
      var d = new Date(item.date);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    var sorted = Object.keys(groups).sort().reverse();
    return sorted.map(function (k) { return { label: k, items: groups[k] }; });
  }

  function dayLabel(ymd) {
    var parts = ymd.split('-');
    return parseInt(parts[1], 10) + ' 月 ' + parseInt(parts[2], 10) + ' 日';
  }

  function renderArchive() {
    var archiveEl = document.getElementById('guestbook-archive');
    if (!archiveEl) return;

    var groups = groupByDay(allMessages);

    if (groups.length === 0) {
      archiveEl.innerHTML = '';
      return;
    }

    var html = '<div class="archive-title">归档</div>';
    html += '<div class="archive-list">';
    html += '<button class="archive-btn ' + (!activeDay ? 'active' : '') + '" data-day="">全部 (' + allMessages.length + ')</button>';
    groups.forEach(function (g) {
      var count = g.items.length;
      html += '<button class="archive-btn ' + (activeDay === g.label ? 'active' : '') +
              '" data-day="' + g.label + '">' + dayLabel(g.label) + ' (' + count + ')</button>';
    });
    html += '</div>';
    archiveEl.innerHTML = html;
  }

  function getFiltered() {
    if (!activeDay) return allMessages;
    return allMessages.filter(function (m) {
      var d = new Date(m.date);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      return key === activeDay;
    });
  }

  function render(messages) {
    allMessages = messages;
    renderArchive();
    renderList();
  }

  function renderList() {
    if (!container) return;
    var messages = getFiltered();

    if (messages.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">该时段暂无留言 💬</p>';
      return;
    }

    messages.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    container.innerHTML = messages.map(function (msg) {
      var replies = (msg.replies || []).map(function (r) {
        return '<div class="msg-reply-item">' +
          '<span class="msg-reply-author">Luna</span>' +
          '<span class="msg-reply-text">' + window.escHtml(r.text) + '</span>' +
          '<span class="msg-reply-date">' + window.formatDateTime(r.date) + '</span>' +
        '</div>';
      }).join('');

      return '<div class="msg-card" data-id="' + msg.id + '">' +
        '<div class="msg-card-header">' +
          '<div class="msg-avatar">' + (msg.avatar || '💬') + '</div>' +
          '<div>' +
            '<div class="msg-author">' + window.escHtml(msg.name) + '</div>' +
            '<div class="msg-date">' + window.formatDateTime(msg.date) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="msg-card-body">' + window.escHtml(msg.message) + '</div>' +
        (replies ? '<div class="msg-replies">' + replies + '</div>' : '') +
        '<div class="msg-card-footer">' +
          '<button class="msg-reply-toggle" data-action="reply-toggle" data-id="' + msg.id + '">' + ICON_REPLY + ' 回复</button>' +
          '<div class="msg-card-actions">' +
            '<button class="btn-edit-sm" data-action="edit" data-id="' + msg.id + '" title="编辑">' + ICON_EDIT + '</button>' +
            '<button class="btn-delete-sm" data-action="delete" data-id="' + msg.id + '" title="删除">' + ICON_DELETE + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="msg-reply-form" data-reply-for="' + msg.id + '" style="display:none">' +
          '<input type="text" class="form-input msg-reply-input" placeholder="回复 ' + window.escHtml(msg.name) + '...">' +
          '<button class="btn-action btn-add msg-reply-send" data-action="reply-send" data-id="' + msg.id + '">发送</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function addMessage() {
    var name = nameInput.value.trim();
    var message = msgInput.value.trim();
    if (!name || !message) {
      alert('请填写昵称和留言内容');
      return;
    }

    var newItem = {
      id: window.genId(),
      name: name,
      avatar: randomAvatar(),
      message: message,
      date: window.toLocalISOString(new Date()),
      replies: []
    };

    window.BlogData.create('guestbook', newItem).then(function () {
      allMessages.push(newItem);
      window.BlogData.save('guestbook', allMessages);
      renderArchive();
      renderList();
      nameInput.value = '';
      msgInput.value = '';
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', addMessage);
  }

  if (msgInput) {
    msgInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addMessage();
      }
    });
  }

  function openEditor(msg) {
    window.openModal(
      '编辑留言',
      [
        { name: 'name',    label: '昵称',   type: 'text',     value: msg.name },
        { name: 'message', label: '留言内容', type: 'textarea', value: msg.message }
      ],
      function (formData) {
        window.BlogData.update('guestbook', msg.id, {
          name: formData.name,
          message: formData.message
        }).then(function () {
          allMessages = allMessages.map(function (m) {
            if (m.id === msg.id) {
              return { id: m.id, name: formData.name, avatar: m.avatar, message: formData.message, date: m.date, replies: m.replies };
            }
            return m;
          });
          window.BlogData.save('guestbook', allMessages);
          renderList();
        });
      }
    );
  }

  /* Event delegation */
  if (container) {
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;

      var action = btn.getAttribute('data-action');
      var id = btn.getAttribute('data-id');

      if (action === 'edit') {
        var msg = allMessages.find(function (m) { return m.id === id; });
        if (msg) openEditor(msg);

      } else if (action === 'delete') {
        if (confirm('确定删除这条留言？')) {
          window.BlogData.remove('guestbook', id).then(function () {
            allMessages = allMessages.filter(function (m) { return m.id !== id; });
            window.BlogData.save('guestbook', allMessages);
            renderArchive();
            renderList();
          });
        }

      } else if (action === 'reply-toggle') {
        var form = container.querySelector('.msg-reply-form[data-reply-for="' + id + '"]');
        if (form) {
          var isVisible = form.style.display !== 'none';
          /* Hide all reply forms first */
          container.querySelectorAll('.msg-reply-form').forEach(function (f) { f.style.display = 'none'; });
          if (!isVisible) {
            form.style.display = 'flex';
            form.querySelector('.msg-reply-input').focus();
          }
        }

      } else if (action === 'reply-send') {
        var input = container.querySelector('.msg-reply-form[data-reply-for="' + id + '"] .msg-reply-input');
        var text = input ? input.value.trim() : '';
        if (!text) return;

        var targetMsg = allMessages.find(function (m) { return m.id === id; });
        if (!targetMsg) return;

        if (!targetMsg.replies) targetMsg.replies = [];
        targetMsg.replies.push({ text: text, date: window.toLocalISOString(new Date()) });

        window.BlogData.update('guestbook', id, { replies: targetMsg.replies }).then(function () {
          window.BlogData.save('guestbook', allMessages);
          renderList();
        });
      }
    });

    /* Enter to send reply */
    container.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.classList.contains('msg-reply-input')) {
        e.preventDefault();
        var form = e.target.closest('.msg-reply-form');
        if (form) {
          var sendBtn = form.querySelector('[data-action="reply-send"]');
          if (sendBtn) sendBtn.click();
        }
      }
    });
  }

  /* Archive filter delegation */
  var archiveContainer = document.getElementById('guestbook-archive');
  if (archiveContainer) {
    archiveContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('.archive-btn');
      if (!btn) return;
      activeDay = btn.getAttribute('data-day') || null;
      renderArchive();
      renderList();
    });
  }

  window.BlogData.load('guestbook', 'data/guestbook.json', render);

})();
