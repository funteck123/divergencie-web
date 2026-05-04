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

// Section 8 — result bar animations
const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.result-bar').forEach(bar => bar.classList.add('animated'));
      barObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });
document.querySelectorAll('.results-rows').forEach(el => barObserver.observe(el));

/* ── SECTION 11 — TESTIMONIALS CAROUSEL ── */
(function () {
  const track = document.getElementById('tcarouselTrack');
  const prevBtn = document.getElementById('tPrev');
  const nextBtn = document.getElementById('tNext');
  const dotsContainer = document.getElementById('tDots');
  if (!track) return;

  const cards = Array.from(track.children);
  let current = 0;

  // Determine visible count by breakpoint
  function visibleCount() {
    return window.innerWidth <= 600 ? 1 : window.innerWidth <= 900 ? 2 : 3;
  }

  function totalSlides() {
    return Math.ceil(cards.length / visibleCount());
  }

  // Build dots
  function buildDots() {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides(); i++) {
      const d = document.createElement('button');
      d.className = 'tcarousel-dot' + (i === current ? ' active' : '');
      d.setAttribute('aria-label', 'Slide ' + (i + 1));
      d.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(d);
    }
  }

  function goTo(idx) {
    const max = totalSlides() - 1;
    current = Math.max(0, Math.min(idx, max));
    const cardW = cards[0].getBoundingClientRect().width;
    const gap = 24; // 1.5rem
    const vc = visibleCount();
    const offset = current * (cardW * vc + gap * vc);
    track.style.transform = `translateX(-${offset}px)`;
    dotsContainer.querySelectorAll('.tcarousel-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  // Auto-advance every 5s
  let timer = setInterval(() => goTo((current + 1) % totalSlides()), 5000);
  track.closest('.tcarousel-wrapper').addEventListener('mouseenter', () => clearInterval(timer));
  track.closest('.tcarousel-wrapper').addEventListener('mouseleave', () => {
    timer = setInterval(() => goTo((current + 1) % totalSlides()), 5000);
  });

  // Touch swipe
  let startX = 0;
  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
  });

  window.addEventListener('resize', () => { buildDots(); goTo(0); });

  buildDots();
  goTo(0);
})();

/* ── Section 13 — FAQ Accordion ── */
(function () {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', function () {
      const isOpen = this.getAttribute('aria-expanded') === 'true';
      // Close all
      document.querySelectorAll('.faq-q').forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        b.nextElementSibling.classList.remove('open');
      });
      // Open clicked if it was closed
      if (!isOpen) {
        this.setAttribute('aria-expanded', 'true');
        this.nextElementSibling.classList.add('open');
      }
    });
  });
})();
