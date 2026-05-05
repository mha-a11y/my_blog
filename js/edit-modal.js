/* ============================================================
   Edit Modal — Reusable modal for CRUD operations
   ============================================================ */
(function () {
  'use strict';

  var overlay     = document.getElementById('modal-overlay');
  var modalTitle  = document.getElementById('modal-title');
  var modalBody   = document.getElementById('modal-body');
  var btnSave     = document.getElementById('modal-save');
  var btnCancel   = document.getElementById('modal-cancel');
  var btnClose    = document.getElementById('modal-close');

  var currentCallback = null;

  function close() {
    overlay.classList.remove('active');
    modalBody.innerHTML = '';
    currentCallback = null;
  }

  btnCancel.addEventListener('click', close);
  btnClose.addEventListener('click', close);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  btnSave.addEventListener('click', function () {
    if (!currentCallback) return;

    /* Collect form data */
    var fields = modalBody.querySelectorAll('[data-field]');
    var data = {};
    fields.forEach(function (field) {
      var key = field.getAttribute('data-field');
      if (field.tagName === 'TEXTAREA') {
        data[key] = field.value;
      } else {
        data[key] = field.value.trim();
      }
    });

    currentCallback(data);
    close();
  });

  /**
   * Open the edit modal.
   * @param {string} title - Modal title
   * @param {Array} fields - Array of { name, label, type, value, options }
   * @param {Function} onSave - Callback receiving { fieldName: value }
   */
  window.openModal = function (title, fields, onSave) {
    modalTitle.textContent = title;
    currentCallback = onSave;

    var html = '';
    fields.forEach(function (f) {
      var val = window.escHtml(f.value || '');
      html += '<div class="form-group">';
      html += '<label>' + window.escHtml(f.label) + '</label>';

      if (f.type === 'textarea') {
        html += '<textarea class="form-textarea" data-field="' + f.name + '" rows="5">' + val + '</textarea>';
      } else if (f.type === 'select' && f.options) {
        html += '<select class="form-input" data-field="' + f.name + '">';
        f.options.forEach(function (opt) {
          var selected = opt === f.value ? ' selected' : '';
          html += '<option value="' + window.escHtml(opt) + '"' + selected + '>' + window.escHtml(opt) + '</option>';
        });
        html += '</select>';
      } else {
        html += '<input type="' + (f.type || 'text') + '" class="form-input" data-field="' + f.name + '" value="' + val + '">';
      }

      html += '</div>';
    });

    modalBody.innerHTML = html;
    overlay.classList.add('active');

    /* Focus first input */
    setTimeout(function () {
      var first = modalBody.querySelector('input, textarea, select');
      if (first) first.focus();
    }, 100);
  };

})();
