/* ============================================================
   Gallery Section — Masonry layout, lightbox, CRUD
   ============================================================ */
(function () {
  'use strict';

  var grid       = document.getElementById('masonry-grid');
  var filterWrap = document.getElementById('gallery-filter');
  var addBtn     = document.getElementById('add-photo-btn');
  var lightbox   = document.getElementById('lightbox');
  var lbImg      = document.getElementById('lightbox-img');
  var lbTitle    = document.getElementById('lightbox-title');
  var lbDesc     = document.getElementById('lightbox-desc');

  var allPhotos      = [];
  var filteredPhotos = [];
  var activeCategory = null;
  var lbIndex        = -1;

  function renderFilter() {
    if (!filterWrap) return;
    var cats = {};
    allPhotos.forEach(function (p) { cats[p.category] = (cats[p.category] || 0) + 1; });

    var html = '<button class="filter-btn ' + (!activeCategory ? 'active' : '') + '" data-cat="">全部</button>';
    Object.keys(cats).sort().forEach(function (cat) {
      html += '<button class="filter-btn ' + (activeCategory === cat ? 'active' : '') + '" data-cat="' + window.escHtml(cat) + '">' + window.escHtml(cat) + ' (' + cats[cat] + ')</button>';
    });
    filterWrap.innerHTML = html;
  }

  function getFiltered() {
    if (!activeCategory) return allPhotos;
    return allPhotos.filter(function (p) { return p.category === activeCategory; });
  }

  function renderGrid() {
    if (!grid) return;
    filteredPhotos = getFiltered();

    if (filteredPhotos.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;column-span:all">该分类下暂无照片 📷</p>';
      return;
    }

    grid.innerHTML = filteredPhotos.map(function (photo, i) {
      return '<div class="masonry-item" data-index="' + i + '">' +
        '<img src="' + window.escHtml(photo.thumb) + '" alt="' + window.escHtml(photo.title) + '" loading="lazy">' +
        '<div class="masonry-overlay">' +
          '<h3>' + window.escHtml(photo.title) + '</h3>' +
          '<p>📍 ' + window.escHtml(photo.location) + '</p>' +
        '</div>' +
        '<div class="masonry-actions">' +
          '<button class="btn-edit-sm" data-action="edit" data-id="' + photo.id + '" title="编辑"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>' +
          '<button class="btn-delete-sm" data-action="delete" data-id="' + photo.id + '" title="删除"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>' +
        '</div>' +
      '</div>';
    }).join('');

    requestAnimationFrame(function () {
      grid.querySelectorAll('.masonry-item').forEach(function (item, i) {
        setTimeout(function () { item.classList.add('visible'); }, i * 60);
      });
    });
  }

  function openLightbox(index) {
    if (index < 0 || index >= filteredPhotos.length) return;
    lbIndex = index;
    var photo = filteredPhotos[index];
    lbImg.src = photo.full;
    lbImg.alt = photo.title;
    lbTitle.textContent = photo.title;
    lbDesc.textContent = '📍 ' + photo.location + (photo.description ? ' — ' + photo.description : '');
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev').addEventListener('click', function () {
    if (lbIndex > 0) openLightbox(lbIndex - 1);
  });
  document.getElementById('lightbox-next').addEventListener('click', function () {
    if (lbIndex < filteredPhotos.length - 1) openLightbox(lbIndex + 1);
  });

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') { if (lbIndex > 0) openLightbox(lbIndex - 1); }
    if (e.key === 'ArrowRight') { if (lbIndex < filteredPhotos.length - 1) openLightbox(lbIndex + 1); }
  });

  function openEditor(photo) {
    var isNew = !photo;
    var data = photo || { title: '', location: '', category: '山川', thumb: '', full: '', description: '' };
    var categories = ['山川', '城市', '大海', '星空', '其他'];

    window.openModal(
      isNew ? '添加照片' : '编辑照片',
      [
        { name: 'title',       label: '标题',     type: 'text',     value: data.title },
        { name: 'location',    label: '拍摄地点', type: 'text',     value: data.location },
        { name: 'category',    label: '分类',     type: 'select',   value: data.category, options: categories },
        { name: 'thumb',       label: '缩略图 URL', type: 'text',   value: data.thumb },
        { name: 'full',        label: '大图 URL',   type: 'text',   value: data.full },
        { name: 'description', label: '描述',     type: 'textarea', value: data.description }
      ],
      function (formData) {
        if (isNew) {
          var newItem = {
            id: window.genId(),
            title: formData.title,
            location: formData.location,
            category: formData.category,
            thumb: formData.thumb,
            full: formData.full,
            description: formData.description
          };
          window.BlogData.create('gallery', newItem).then(function () {
            allPhotos.push(newItem);
            window.BlogData.save('gallery', allPhotos);
            renderFilter();
            renderGrid();
          });
        } else {
          window.BlogData.update('gallery', photo.id, {
            title: formData.title,
            location: formData.location,
            category: formData.category,
            thumb: formData.thumb,
            full: formData.full,
            description: formData.description
          }).then(function () {
            allPhotos = allPhotos.map(function (p) {
              if (p.id === photo.id) {
                return { id: p.id, title: formData.title, location: formData.location, category: formData.category, thumb: formData.thumb, full: formData.full, description: formData.description };
              }
              return p;
            });
            window.BlogData.save('gallery', allPhotos);
            renderFilter();
            renderGrid();
          });
        }
      }
    );
  }

  if (grid) {
    grid.addEventListener('click', function (e) {
      var actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        e.stopPropagation();
        var action = actionBtn.getAttribute('data-action');
        var id = actionBtn.getAttribute('data-id');

        if (action === 'edit') {
          var photo = allPhotos.find(function (p) { return p.id === id; });
          if (photo) openEditor(photo);
        } else if (action === 'delete') {
          if (confirm('确定删除这张照片？')) {
            window.BlogData.remove('gallery', id).then(function () {
              allPhotos = allPhotos.filter(function (p) { return p.id !== id; });
              window.BlogData.save('gallery', allPhotos);
              renderFilter();
              renderGrid();
            });
          }
        }
        return;
      }

      var item = e.target.closest('.masonry-item');
      if (item) {
        openLightbox(parseInt(item.getAttribute('data-index'), 10));
      }
    });
  }

  if (filterWrap) {
    filterWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      activeCategory = btn.getAttribute('data-cat') || null;
      renderFilter();
      renderGrid();
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', function () { openEditor(null); });
  }

  window.BlogData.load('gallery', 'data/gallery.json', function (data) {
    allPhotos = data;
    renderFilter();
    renderGrid();
  });

})();
