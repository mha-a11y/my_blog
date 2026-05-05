/* ============================================================
   Essays Section — CRUD with date-based archive grouping
   ============================================================ */
(function () {
  'use strict';

  var container = document.getElementById('essays-list');
  var addBtn    = document.getElementById('add-essay-btn');

  var allEssays = [];
  var activeMonth = null;

  /* --- Render archive sidebar (month filter) --- */
  function renderArchive() {
    var groups = window.groupByMonth(allEssays, 'date');
    var archiveEl = document.getElementById('essays-archive');
    if (!archiveEl) return;

    if (groups.length === 0) {
      archiveEl.innerHTML = '';
      return;
    }

    var html = '<div class="archive-title">归档</div>';
    html += '<button class="archive-btn ' + (!activeMonth ? 'active' : '') + '" data-month="">全部 (' + allEssays.length + ')</button>';
    groups.forEach(function (g) {
      var count = g.items.length;
      html += '<button class="archive-btn ' + (activeMonth === g.label ? 'active' : '') +
              '" data-month="' + g.label + '">' + window.monthLabel(g.label) + ' (' + count + ')</button>';
    });
    archiveEl.innerHTML = html;
  }

  function getFiltered() {
    if (!activeMonth) return allEssays;
    return allEssays.filter(function (e) {
      var d = new Date(e.date);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      return key === activeMonth;
    });
  }

  /* --- Render essays list --- */
  function render(essays) {
    allEssays = essays;
    renderArchive();
    renderList();
  }

  function renderList() {
    if (!container) return;
    var essays = getFiltered();

    if (essays.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">该时段暂无随笔 ✍️</p>';
      return;
    }

    /* Sort by date descending */
    essays.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    container.innerHTML = essays.map(function (essay) {
      var tags = (essay.tags || []).map(function (t) {
        return '<span class="essay-tag">' + window.escHtml(t) + '</span>';
      }).join('');

      var preview = essay.content.replace(/\n/g, ' ').substring(0, 180);
      if (essay.content.length > 180) preview += '...';

      return '<article class="essay-card card" data-id="' + essay.id + '">' +
        '<div class="essay-card-header">' +
          '<span class="essay-date">' + window.formatDate(essay.date) + '</span>' +
          '<div class="essay-card-actions">' +
            '<button class="btn-edit-sm" data-action="edit" data-id="' + essay.id + '">编辑</button>' +
            '<button class="btn-delete-sm" data-action="delete" data-id="' + essay.id + '">删除</button>' +
          '</div>' +
        '</div>' +
        '<h3>' + window.escHtml(essay.title) + '</h3>' +
        '<p class="essay-preview">' + window.escHtml(preview) + '</p>' +
        '<div class="essay-tags">' + tags + '</div>' +
      '</article>';
    }).join('');
  }

  function openEditor(essay) {
    var isNew = !essay;
    var data = essay || { title: '', date: window.toLocalDateString(), tags: '', content: '' };

    window.openModal(
      isNew ? '写随笔' : '编辑随笔',
      [
        { name: 'title',   label: '标题',     type: 'text',     value: data.title },
        { name: 'date',    label: '日期',     type: 'date',     value: data.date },
        { name: 'tags',    label: '标签 (逗号分隔)', type: 'text', value: (data.tags || []).join(', ') },
        { name: 'content', label: '内容',     type: 'textarea', value: data.content }
      ],
      function (formData) {
        var tags = formData.tags.split(',').map(function (t) { return t.trim(); }).filter(function (t) { return t; });

        if (isNew) {
          var newItem = {
            id: window.genId(),
            title: formData.title,
            date: formData.date,
            tags: tags,
            content: formData.content
          };
          window.BlogData.create('essays', newItem).then(function () {
            allEssays.push(newItem);
            window.BlogData.save('essays', allEssays);
            render(allEssays);
          });
        } else {
          window.BlogData.update('essays', essay.id, {
            title: formData.title,
            date: formData.date,
            tags: tags,
            content: formData.content
          }).then(function () {
            allEssays = allEssays.map(function (e) {
              if (e.id === essay.id) {
                return { id: e.id, title: formData.title, date: formData.date, tags: tags, content: formData.content };
              }
              return e;
            });
            window.BlogData.save('essays', allEssays);
            render(allEssays);
          });
        }
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
        var essay = allEssays.find(function (e) { return e.id === id; });
        if (essay) openEditor(essay);
      } else if (action === 'delete') {
        if (confirm('确定删除这篇随笔？')) {
          window.BlogData.remove('essays', id).then(function () {
            allEssays = allEssays.filter(function (e) { return e.id !== id; });
            window.BlogData.save('essays', allEssays);
            render(allEssays);
          });
        }
      }
    });
  }

  /* Archive filter delegation */
  var archiveContainer = document.getElementById('essays-archive');
  if (archiveContainer) {
    archiveContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('.archive-btn');
      if (!btn) return;
      activeMonth = btn.getAttribute('data-month') || null;
      renderArchive();
      renderList();
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', function () { openEditor(null); });
  }

  /* Init */
  window.BlogData.load('essays', 'data/essays.json', render);

})();
