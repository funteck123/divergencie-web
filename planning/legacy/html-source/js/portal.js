/* ============================================================
   DivergenCIE Coaching — Portal JS
   Sidebar · Tabs · Modals · Theme toggle · Role simulation
   Include AFTER theme.js in every portal page <head>
   ============================================================ */

(function () {
  'use strict';
  
  /* ── TIMEZONE DISPLAY ── */
  function initTimezone() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const displayStr = tz.replace(/_/g, ' ');
      
      // Update both potential ID targets (different portals use different IDs)
      const targets = ['tz-name', 'tz-display'];
      targets.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = displayStr;
      });
    } catch (e) {
      console.warn('Timezone detection failed:', e);
    }
  }

  /* ── SIDEBAR TOGGLE (mobile) ── */
  function initSidebar() {
    const sidebar  = document.getElementById('sidebar') || document.getElementById('portal-sidebar');
    let overlay  = document.getElementById('sidebar-overlay') || document.getElementById('portal-sidebar-overlay');
    const hamburger = document.getElementById('sidebar-toggle') || document.getElementById('portal-hamburger');
    if (!sidebar) return;

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'portal-sidebar-overlay';
      overlay.id = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

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

  /* ── GLOBAL FEEDBACK WIDGET ── */
  function initGlobalFeedback() {
    if (document.getElementById('dc-feedback-widget')) return;

    // Inject Floating Button
    var btn = document.createElement('button');
    btn.id = 'dc-feedback-widget';
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> <span>Feedback</span>';
    btn.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--gold);color:#0a0a0a;border:none;border-radius:30px;padding:12px 20px;font-family:"Satoshi",sans-serif;font-weight:800;font-size:0.9rem;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);cursor:pointer;z-index:9999;transition:transform 0.2s;';
    btn.onmouseover = function(){ btn.style.transform = 'scale(1.05)'; };
    btn.onmouseout = function(){ btn.style.transform = 'scale(1)'; };
    document.body.appendChild(btn);

    // Inject Modal
    var modalHTML = `
    <div class="portal-modal-overlay" id="feedback-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
      <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:16px;width:90%;max-width:440px;padding:1.5rem;position:relative;box-shadow:0 10px 30px rgba(0,0,0,0.2);">
        <button data-modal-close style="position:absolute;top:1rem;right:1rem;background:none;border:none;font-size:1.2rem;color:var(--text-muted);cursor:pointer;">✕</button>
        <h3 style="font-family:'Satoshi',sans-serif;font-weight:800;font-size:1.1rem;color:var(--text-primary);margin-bottom:0.5rem;margin-top:0;">Provide Feedback</h3>
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1.25rem;">Help us improve your experience by sharing feedback on classes, assignments, or exams.</p>
        
        <form id="feedback-form">
          <div style="margin-bottom:1rem;">
            <label style="display:block;font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.4rem;">What is this regarding?</label>
            <select required style="width:100%;padding:0.65rem 0.9rem;border-radius:8px;border:1.5px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:0.88rem;outline:none;">
              <option value="" disabled selected>Select category...</option>
              <option value="Class">Class / Lesson</option>
              <option value="Assignment">Assignment</option>
              <option value="Exam">Exam / Mock Test</option>
              <option value="Notes">Study Notes / Curriculum</option>
              <option value="Ticket">Support Ticket</option>
              <option value="General">General Improvement</option>
            </select>
          </div>
          
          <div style="margin-bottom:1rem;">
            <label style="display:block;font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.4rem;">Specific Item (Optional)</label>
            <input type="text" placeholder="e.g. IGCSE Maths, Week 3 Assignment..." style="width:100%;padding:0.65rem 0.9rem;border-radius:8px;border:1.5px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:0.88rem;outline:none;" />
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block;font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.4rem;">Rating</label>
            <div style="display:flex;gap:0.5rem;font-size:1.5rem;cursor:pointer;color:var(--text-muted);" id="feedback-stars">
              <span data-val="1">★</span><span data-val="2">★</span><span data-val="3">★</span><span data-val="4">★</span><span data-val="5">★</span>
            </div>
            <input type="hidden" id="feedback-rating" required />
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block;font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:0.4rem;">Your Feedback</label>
            <textarea required placeholder="What went well? What could be improved?" style="width:100%;padding:0.65rem 0.9rem;border-radius:8px;border:1.5px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:0.88rem;outline:none;min-height:80px;resize:vertical;"></textarea>
          </div>

          <button type="submit" id="feedback-submit-btn" style="width:100%;background:var(--gold);color:#0a0a0a;border:none;border-radius:8px;padding:0.85rem;font-family:'Satoshi',sans-serif;font-weight:800;font-size:0.9rem;text-transform:uppercase;cursor:pointer;transition:opacity 0.2s;">Submit Feedback</button>
        </form>
      </div>
    </div>
    `;
    var modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);

    var modal = document.getElementById('feedback-modal');
    
    // Wire open/close
    btn.addEventListener('click', function(){ 
      modal.style.display = 'flex'; 
      document.body.style.overflow = 'hidden';
    });

    // Star rating logic
    var stars = modal.querySelectorAll('#feedback-stars span');
    var ratingInput = document.getElementById('feedback-rating');
    stars.forEach(function(s){
      s.addEventListener('click', function(){
        var val = parseInt(s.getAttribute('data-val'));
        ratingInput.value = val;
        stars.forEach(function(st, idx){
          st.style.color = idx < val ? 'var(--gold)' : 'var(--text-muted)';
        });
      });
    });

    // Form submission
    document.getElementById('feedback-form').addEventListener('submit', function(e){
      e.preventDefault();
      
      // Collect data
      const category = e.target.querySelector('select').value;
      const item = e.target.querySelector('input[type="text"]').value;
      const rating = document.getElementById('feedback-rating').value;
      const comment = e.target.querySelector('textarea').value;
      const timestamp = new Date().toISOString();

      const feedbackData = { category, item, rating, comment, timestamp };
      
      // Save to localStorage
      let feedbacks = JSON.parse(localStorage.getItem('dc_global_feedbacks') || '[]');
      feedbacks.push(feedbackData);
      localStorage.setItem('dc_global_feedbacks', JSON.stringify(feedbacks));

      var submitBtn = document.getElementById('feedback-submit-btn');
      var originalText = submitBtn.textContent;
      submitBtn.textContent = 'Feedback Sent! ✓';
      submitBtn.style.background = '#22c55e';
      submitBtn.style.color = '#fff';
      submitBtn.disabled = true;

      setTimeout(function(){
        modal.style.display = 'none';
        document.body.style.overflow = '';
        submitBtn.textContent = originalText;
        submitBtn.style.background = 'var(--gold)';
        submitBtn.style.color = '#0a0a0a';
        submitBtn.disabled = false;
        e.target.reset();
        stars.forEach(function(st){ st.style.color = 'var(--text-muted)'; });
        ratingInput.value = '';
      }, 1500);
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
    initGlobalFeedback();
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
