// Sai Rudra Motors - Apple Theme Engine
// Provides instantaneous light/dark mode switching with zero-FOUC state persistence.

(function () {
  'use strict';

  // 1. Resolve and apply stored theme immediately (default: 'light')
  var currentTheme = 'light';
  try {
    var stored = localStorage.getItem('srm-theme');
    if (stored === 'dark' || stored === 'light') {
      currentTheme = stored;
    }
  } catch (e) {}

  document.documentElement.setAttribute('data-theme', currentTheme);

  // 2. Synchronize button state and accessibility labels
  function updateToggleButtons(theme) {
    var isDark = theme === 'dark';
    var label = isDark ? 'Switch to Apple Light Mode' : 'Switch to Dark Mode';
    var buttons = document.querySelectorAll('.srm-theme-toggle-btn');
    buttons.forEach(function (btn) {
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
  }

  // 3. Global toggle handler
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

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.srm-theme-toggle-btn');
      if (btn) {
        e.preventDefault();
        toggleTheme();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose toggle function globally for programmatic triggers
  window.srmToggleTheme = toggleTheme;
})();
