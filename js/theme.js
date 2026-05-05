/* ============================================================
   DivergenCIE Coaching — Theme Engine
   divergencie.co.uk
   ============================================================ */

(function () {
  // Apply saved theme before paint to prevent flash
  var saved = localStorage.getItem('dc-theme');
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  }
})();

document.addEventListener('DOMContentLoaded', function () {
  var toggleBtns = document.querySelectorAll('.theme-toggle');
  var html = document.documentElement;

  function isDark() {
    return html.classList.contains('dark');
  }

  function applyTheme(dark) {
    if (dark) {
      html.classList.add('dark');
      localStorage.setItem('dc-theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('dc-theme', 'light');
    }
    updateIcons();
  }

  function updateIcons() {
    toggleBtns.forEach(function (btn) {
      var sunIcon = btn.querySelector('.theme-icon-sun');
      var moonIcon = btn.querySelector('.theme-icon-moon');
      if (sunIcon && moonIcon) {
        if (isDark()) {
          sunIcon.style.display = 'block';
          moonIcon.style.display = 'none';
        } else {
          sunIcon.style.display = 'none';
          moonIcon.style.display = 'block';
        }
      }
    });
  }

  toggleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(!isDark());
    });
  });

  updateIcons();
});
