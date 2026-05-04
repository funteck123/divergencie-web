/* ============================================================
   DivergenCIE Coaching — Main JS
   divergencie.co.uk
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Nav scroll state ── */
  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  /* ── Mobile hamburger ── */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
    // Close on nav link click
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
  }

  /* ── Lucide icons ── */
  if (typeof lucide !== 'undefined') lucide.createIcons();

  /* ── Intersection Observer for scroll animations ── */
  const animEls = document.querySelectorAll('[data-anim]');
  if (animEls.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('anim-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    animEls.forEach(el => observer.observe(el));
  }

  /* ── Counter animation (used in stats section) ── */
  window.animateCounter = function(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.floor(eased * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString() + (el.dataset.suffix || '');
    }
    requestAnimationFrame(tick);
  };

  /* ── FAQ accordion (used in FAQ section) ── */
  window.initFaq = function() {
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });
  };

});

/* ── Section 4: Trigger counters when stats scroll into view ── */
(function initCounters() {
  const counters = document.querySelectorAll('.stat-num[data-target]');
  if (!counters.length || !('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        window.animateCounter(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  counters.forEach(el => obs.observe(el));
})();
