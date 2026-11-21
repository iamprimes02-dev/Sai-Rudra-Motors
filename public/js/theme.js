// Sai Rudra Motors - Theme Engine
// Instant light/dark mode switching with zero-FOUC persistence and resilient event binding.

(function () {
  'use strict';

  var currentTheme = 'light';
  try {
    var stored = localStorage.getItem('srm-theme');
    if (stored === 'dark' || stored === 'light') {
      currentTheme = stored;
    }
  } catch (e) {}

  document.documentElement.setAttribute('data-theme', currentTheme);

  function updateToggleButtons(theme) {
    var isDark = theme === 'dark';
    var label = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    var buttons = document.querySelectorAll('.srm-theme-toggle-btn, #themeToggleBtn');
    buttons.forEach(function (btn) {
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
  }

  function toggleTheme() {
    var active = document.documentElement.getAttribute('data-theme') || 'light';
    var next = active === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('srm-theme', next);
    } catch (e) {}
    updateToggleButtons(next);
  }

  function init() {
    var active = document.documentElement.getAttribute('data-theme') || 'light';
    updateToggleButtons(active);

    // Direct event listeners on all toggle buttons
    document.querySelectorAll('.srm-theme-toggle-btn, #themeToggleBtn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleTheme();
      });
    });

    // Delegated fallback for dynamically inserted elements
    document.addEventListener('click', function (e) {
      var target = e.target;
      while (target && target !== document) {
        if (target.classList && target.classList.contains('srm-theme-toggle-btn')) {
          e.preventDefault();
          toggleTheme();
          return;
        }
        target = target.parentNode;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.srmToggleTheme = toggleTheme;
})();
