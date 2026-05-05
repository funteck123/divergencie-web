/* ============================================================
   DivergenCIE Coaching — Portal JS
   Sidebar · Tabs · Modals · Theme toggle · Role simulation
   Include AFTER theme.js in every portal page <head>
   ============================================================ */

(function () {
  'use strict';

  /* ── SIDEBAR TOGGLE (mobile) ── */
  function initSidebar() {
    const sidebar  = document.getElementById('portal-sidebar');
    const overlay  = document.getElementById('portal-sidebar-overlay');
    const hamburger = document.getElementById('portal-hamburger');
    if (!sidebar) return;

    function openSidebar() {
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    if (hamburger) hamburger.addEventListener('click', openSidebar);
    if (overlay)   overlay.addEventListener('click', closeSidebar);

    // Close on nav item click (mobile)
    sidebar.querySelectorAll('.sidebar-nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        if (window.innerWidth <= 900) closeSidebar();
      });
    });
  }

  /* ── ACTIVE NAV ITEM ── */
  function initActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.sidebar-nav-item[href]').forEach(function (link) {
      if (link.getAttribute('href') === path ||
          (path.endsWith('/') && link.getAttribute('href') === path.slice(0, -1))) {
        link.classList.add('active');
      }
    });
  }

  /* ── TABS ── */
  // Auto-wire any .portal-tabs container.
  // Tab buttons need data-tab="id"; panels need id="tab-panel-{id}" + class portal-tab-panel.
  function initTabs() {
    document.querySelectorAll('.portal-tabs').forEach(function (tabBar) {
      var tabs   = tabBar.querySelectorAll('.portal-tab[data-tab]');
      var panels = document.querySelectorAll('.portal-tab-panel');
      if (!tabs.length) return;

      function activate(tabEl) {
        var target = tabEl.getAttribute('data-tab');
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tabEl.classList.add('active');
        panels.forEach(function (p) {
          p.style.display = p.id === 'tab-panel-' + target ? '' : 'none';
        });
        // Persist tab per page in sessionStorage
        try { sessionStorage.setItem('dc-tab-' + window.location.pathname, target); } catch (e) {}
      }

      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () { activate(tab); });
      });

      // Restore last tab or activate first
      var stored;
      try { stored = sessionStorage.getItem('dc-tab-' + window.location.pathname); } catch (e) {}
      var initial = stored
        ? (tabBar.querySelector('[data-tab="' + stored + '"]') || tabs[0])
        : tabs[0];
      activate(initial);
    });
  }

  /* ── MODALS ── */
  // Open:  data-modal-open="modal-id" on any button
  // Close: data-modal-close on any element inside overlay or modal
  function initModals() {
    document.addEventListener('click', function (e) {
      // Open
      var opener = e.target.closest('[data-modal-open]');
      if (opener) {
        var id = opener.getAttribute('data-modal-open');
        var modal = document.getElementById(id);
        if (modal) {
          modal.style.display = 'flex';
          document.body.style.overflow = 'hidden';
        }
        return;
      }
      // Close via close button
      var closer = e.target.closest('[data-modal-close]');
      if (closer) {
        var overlay = closer.closest('.portal-modal-overlay');
        if (overlay) {
          overlay.style.display = 'none';
          document.body.style.overflow = '';
        }
        return;
      }
      // Close by clicking overlay backdrop (not modal itself)
      if (e.target.classList.contains('portal-modal-overlay')) {
        e.target.style.display = 'none';
        document.body.style.overflow = '';
      }
    });

    // Esc key closes any open modal
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.portal-modal-overlay').forEach(function (o) {
          if (o.style.display === 'flex') {
            o.style.display = 'none';
            document.body.style.overflow = '';
          }
        });
      }
    });
  }

  /* ── THEME TOGGLE (portal pages) ── */
  // theme.js handles persistence; this wires the portal topbar toggle if present.
  function initThemeToggle() {
    var btn = document.getElementById('portal-theme-toggle');
    if (!btn) return;
    function syncIcons() {
      var isDark = document.documentElement.classList.contains('dark');
      var sun  = btn.querySelector('.theme-icon-sun');
      var moon = btn.querySelector('.theme-icon-moon');
      if (sun)  sun.style.display  = isDark ? 'block' : 'none';
      if (moon) moon.style.display = isDark ? 'none'  : 'block';
    }
    btn.addEventListener('click', function () {
      var isDark = document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('dark', !isDark);
      try { localStorage.setItem('dc-theme', isDark ? 'light' : 'dark'); } catch (e) {}
      syncIcons();
    });
    syncIcons();
  }

  /* ── ROLE SIMULATION ── */
  // Reads ?role=student|parent|staff|admin from URL or localStorage key dc-role.
  // Sets data-role on <body> and updates .sidebar-role badge if present.
  var ROLES = {
    student : { label: 'Student',  cls: 'role-badge--student' },
    parent  : { label: 'Parent',   cls: 'role-badge--parent'  },
    staff   : { label: 'Staff',    cls: 'role-badge--staff'   },
    admin   : { label: 'Admin',    cls: 'role-badge--admin'   },
  };

  function initRole() {
    var params = new URLSearchParams(window.location.search);
    var role   = params.get('role');
    if (!role) { try { role = localStorage.getItem('dc-role'); } catch (e) {} }
    if (!role || !ROLES[role]) role = 'student';

    try { localStorage.setItem('dc-role', role); } catch (e) {}
    document.body.setAttribute('data-role', role);

    // Update badge
    var badge = document.querySelector('.role-badge');
    if (badge) {
      Object.values(ROLES).forEach(function (r) { badge.classList.remove(r.cls); });
      badge.classList.add(ROLES[role].cls);
      var dot  = badge.querySelector('.role-dot');
      var text = badge.querySelector('.role-label');
      if (text) text.textContent = ROLES[role].label;
    }

    // Show/hide role-specific elements: data-show-role="student,admin"
    document.querySelectorAll('[data-show-role]').forEach(function (el) {
      var allowed = el.getAttribute('data-show-role').split(',').map(function (s) { return s.trim(); });
      el.style.display = allowed.includes(role) ? '' : 'none';
    });
  }

  /* ── NOTIFICATION BELL (stub) ── */
  function initBell() {
    var bell = document.getElementById('topbar-bell');
    if (!bell) return;
    bell.addEventListener('click', function () {
      // Placeholder — replace with real notification drawer in future phase
      var dot = bell.querySelector('.topbar-bell-dot');
      if (dot) dot.style.display = 'none';
    });
  }

  /* ── PORTAL ALERTS — auto-dismiss ── */
  function initAlerts() {
    document.querySelectorAll('.portal-alert[data-dismiss]').forEach(function (alert) {
      var delay = parseInt(alert.getAttribute('data-dismiss'), 10) || 4000;
      setTimeout(function () {
        alert.style.transition = 'opacity 0.4s';
        alert.style.opacity = '0';
        setTimeout(function () { alert.remove(); }, 400);
      }, delay);
    });
  }

  /* ── CONFIRM BUTTONS ── */
  // data-confirm="Are you sure?" on any button shows native confirm before proceeding
  function initConfirm() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-confirm]');
      if (!btn) return;
      var msg = btn.getAttribute('data-confirm') || 'Are you sure?';
      if (!window.confirm(msg)) e.stopImmediatePropagation();
    }, true);
  }

  /* ── INIT ── */
  document.addEventListener('DOMContentLoaded', function () {
    initSidebar();
    initActiveNav();
    initTabs();
    initModals();
    initThemeToggle();
    initRole();
    initBell();
    initAlerts();
    initConfirm();
  });

  // Expose helpers for page-level scripts
  window.DC = window.DC || {};
  window.DC.portal = {
    openModal: function (id) {
      var el = document.getElementById(id);
      if (el) { el.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
    },
    closeModal: function (id) {
      var el = document.getElementById(id);
      if (el) { el.style.display = 'none'; document.body.style.overflow = ''; }
    },
    getRole: function () { return document.body.getAttribute('data-role') || 'student'; },
    setRole: function (role) {
      if (!ROLES[role]) return;
      try { localStorage.setItem('dc-role', role); } catch (e) {}
      window.location.reload();
    }
  };

})();
