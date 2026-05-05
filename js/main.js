/* ============================================================
   Main.js — Shared logic: sidebar, scroll reveal, active nav, data layer
   ============================================================ */
(function () {
  'use strict';

  var hamburger = document.getElementById('hamburger');
  var sidebar   = document.getElementById('sidebar');
  var backdrop  = document.getElementById('sidebar-backdrop');
  var navLinks  = document.querySelectorAll('.sidebar-nav a');
  var sections  = document.querySelectorAll('.section');
  var revealEls = document.querySelectorAll('.reveal');

  /* --- Mobile sidebar --- */
  function openSidebar() {
    sidebar.classList.add('open');
    hamburger.classList.add('active');
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    hamburger.classList.remove('active');
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (hamburger) {
    hamburger.addEventListener('click', function () {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
  }
  if (backdrop) {
    backdrop.addEventListener('click', closeSidebar);
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  /* --- Scroll reveal --- */
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* --- Active nav on scroll --- */
  if ('IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute('id');
          navLinks.forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { threshold: 0.2, rootMargin: '-15% 0px -60% 0px' });

    sections.forEach(function (s) { navObserver.observe(s); });
  }

  /* --- Smooth scroll fallback --- */
  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href && href.charAt(0) === '#') {
        var target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  /* --- Scroll progress bar --- */
  var progressBar = document.getElementById('scroll-progress-bar');
  if (progressBar) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          var scrollTop = window.scrollY || document.documentElement.scrollTop;
          var docHeight = document.documentElement.scrollHeight - window.innerHeight;
          var scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
          progressBar.style.width = scrollPercent + '%';
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* --- Theme toggle (moon ↔ sun) --- */
  var themeToggle = document.getElementById('theme-toggle');
  var THEME_KEY = 'blog-theme';

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  try {
    var savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') applyTheme('dark');
  } catch (e) { /* ignore */ }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem(THEME_KEY, 'light'); } catch (e) {}
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        try { localStorage.setItem(THEME_KEY, 'dark'); } catch (e) {}
      }
    });
  }

  /* ============================================================
     Data Layer — API-based CRUD
     ============================================================ */
  window.BlogData = {
    _cache: {},

    load: function (key, fallbackPath, callback) {
      var self = this;
      fetch('/api/' + key)
        .then(function (r) {
          if (!r.ok) throw new Error('API error');
          return r.json();
        })
        .then(function (data) {
          self._cache[key] = data;
          callback(data);
        })
        .catch(function () {
          /* fallback to static JSON file */
          fetch(fallbackPath)
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (data) {
              self._cache[key] = data;
              callback(data);
            })
            .catch(function () { callback([]); });
        });
    },

    save: function (key, data) {
      this._cache[key] = data;
    },

    create: function (key, item) {
      return fetch('/api/' + key, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      }).then(function (r) { return r.json(); });
    },

    update: function (key, id, data) {
      return fetch('/api/' + key + '/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    },

    remove: function (key, id) {
      return fetch('/api/' + key + '/' + id, {
        method: 'DELETE'
      }).then(function (r) { return r.json(); });
    },

    get: function (key) {
      return this._cache[key] || [];
    }
  };

  /* --- Utility: format date --- */
  window.formatDate = function (dateStr) {
    var d = new Date(dateStr);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '.' + m + '.' + day;
  };

  window.formatDateTime = function (dateStr) {
    var d = new Date(dateStr);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var h = String(d.getHours()).padStart(2, '0');
    var min = String(d.getMinutes()).padStart(2, '0');
    return y + '.' + m + '.' + day + ' ' + h + ':' + min;
  };

  /* --- Utility: generate simple ID --- */
  window.genId = function () {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
  };

  /* --- Utility: local time ISO string (no Z suffix) --- */
  window.toLocalISOString = function (date) {
    var d = date || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var h = String(d.getHours()).padStart(2, '0');
    var min = String(d.getMinutes()).padStart(2, '0');
    var s = String(d.getSeconds()).padStart(2, '0');
    var ms = String(d.getMilliseconds()).padStart(3, '0');
    return y + '-' + m + '-' + day + 'T' + h + ':' + min + ':' + s + '.' + ms;
  };

  /* --- Utility: local date string (YYYY-MM-DD) --- */
  window.toLocalDateString = function (date) {
    var d = date || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  };

  /* --- Utility: escape HTML --- */
  window.escHtml = function (str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  /* --- Utility: group items by year-month --- */
  window.groupByMonth = function (items, dateField) {
    var groups = {};
    items.forEach(function (item) {
      var d = new Date(item[dateField]);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    /* Sort keys descending */
    var sorted = Object.keys(groups).sort().reverse();
    var result = [];
    sorted.forEach(function (k) {
      result.push({ label: k, items: groups[k] });
    });
    return result;
  };

  /* --- Utility: Chinese month label --- */
  window.monthLabel = function (ym) {
    var parts = ym.split('-');
    return parts[0] + ' 年 ' + parseInt(parts[1], 10) + ' 月';
  };

  /* ============================================================
     Global Admin System
     ============================================================ */
  var ADMIN_PWD = 'luna2026';
  window.isAdmin = sessionStorage.getItem('blog-admin') === 'true';

  window.requireAdmin = function () {
    if (window.isAdmin) return true;
    var pwd = prompt('请输入管理员密码：');
    if (pwd === ADMIN_PWD) {
      window.isAdmin = true;
      sessionStorage.setItem('blog-admin', 'true');
      updateAdminUI();
      return true;
    }
    if (pwd !== null) alert('密码错误');
    return false;
  };

  window.logoutAdmin = function () {
    window.isAdmin = false;
    sessionStorage.removeItem('blog-admin');
    updateAdminUI();
  };

  function updateAdminUI() {
    var btn = document.getElementById('admin-toggle');
    if (btn) {
      btn.textContent = window.isAdmin ? '🔓' : '🔑';
      btn.title = window.isAdmin ? '管理员已登录（点击退出）' : '管理员登录';
    }
    document.body.classList.toggle('is-admin', window.isAdmin);
  }

  /* Inject admin toggle into sidebar */
  var sidebarSocial = document.querySelector('.sidebar-social');
  if (sidebarSocial) {
    var adminBtn = document.createElement('button');
    adminBtn.id = 'admin-toggle';
    adminBtn.className = 'admin-toggle-btn';
    adminBtn.title = '管理员登录';
    adminBtn.textContent = window.isAdmin ? '🔓' : '🔑';
    adminBtn.addEventListener('click', function () {
      if (window.isAdmin) {
        window.logoutAdmin();
      } else {
        window.requireAdmin();
      }
    });
    sidebarSocial.insertBefore(adminBtn, sidebarSocial.firstChild);
  }

  updateAdminUI();

})();
