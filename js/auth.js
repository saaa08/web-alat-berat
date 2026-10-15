(function (global) {
  'use strict';

  var KEY = 'alatberat-auth';
  var USER = 'Admin';
  var PASS = 'AdminGanteng';

  function isLoggedIn() {
    try {
      return sessionStorage.getItem(KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function login(user, pass) {
    if (user === USER && pass === PASS) {
      try {
        sessionStorage.setItem(KEY, '1');
      } catch (e) { /* ignore */ }
      applyNav();
      return true;
    }
    return false;
  }

  function logout() {
    try {
      sessionStorage.removeItem(KEY);
    } catch (e) { /* ignore */ }
    applyNav();
  }

  function applyNav() {
    var els = document.querySelectorAll('[data-auth]');
    for (var i = 0; i < els.length; i++) {
      els[i].style.display = isLoggedIn() ? '' : 'none';
    }
  }

  // Kunci tulis admin hanya didefinisikan di sini (satu sumber), dipakai editor.
  function adminKey() {
    return PASS;
  }

  document.addEventListener('DOMContentLoaded', applyNav);

  global.Auth = {
    isLoggedIn: isLoggedIn,
    login: login,
    logout: logout,
    applyNav: applyNav,
    adminKey: adminKey
  };
})(window);