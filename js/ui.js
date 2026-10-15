(function (global) {
  'use strict';

  var doc = global.document;

  function toastWrap() {
    var el = doc.querySelector('.ui-toast-wrap');
    if (!el) {
      el = doc.createElement('div');
      el.className = 'ui-toast-wrap';
      doc.body.appendChild(el);
    }
    return el;
  }

  function toast(message, type) {
    var wrap = toastWrap();
    var el = doc.createElement('div');
    el.className = 'ui-toast' + (type ? ' ui-toast--' + type : '');
    el.setAttribute('role', 'status');
    el.textContent = String(message == null ? '' : message);
    wrap.appendChild(el);
    setTimeout(function () { el.classList.add('is-in'); }, 10);
    setTimeout(function () {
      el.classList.remove('is-in');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 250);
    }, 3200);
  }

  function modal(message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var overlay = doc.createElement('div');
      overlay.className = 'ui-modal';
      var box = doc.createElement('div');
      box.className = 'ui-modal-box';
      var msg = doc.createElement('p');
      msg.className = 'ui-modal-msg';
      msg.textContent = String(message == null ? '' : message);
      box.appendChild(msg);

      var actions = doc.createElement('div');
      actions.className = 'ui-modal-actions';
      var okBtn = doc.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'btn btn-primary';
      okBtn.setAttribute('data-ui-ok', '');
      okBtn.textContent = opts.okText || 'Ya';
      actions.appendChild(okBtn);

      var cancelBtn = null;
      if (opts.confirm) {
        cancelBtn = doc.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-ghost';
        cancelBtn.setAttribute('data-ui-cancel', '');
        cancelBtn.textContent = opts.cancelText || 'Batal';
        actions.appendChild(cancelBtn);
      }
      box.appendChild(actions);
      overlay.appendChild(box);
      doc.body.appendChild(overlay);
      setTimeout(function () { overlay.classList.add('is-in'); }, 10);

      function close(result) {
        overlay.classList.remove('is-in');
        doc.removeEventListener('keydown', onKey);
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 200);
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') close(false);
        else if (e.key === 'Enter') close(true);
      }

      okBtn.addEventListener('click', function () { close(true); });
      if (cancelBtn) cancelBtn.addEventListener('click', function () { close(false); });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close(false); });
      doc.addEventListener('keydown', onKey);
      okBtn.focus();
    });
  }

  function confirm(message, opts) {
    opts = opts || {};
    opts.confirm = true;
    return modal(message, opts);
  }

  function alert(message, opts) {
    return modal(message, opts).then(function () {});
  }

  global.Ui = {
    toast: toast,
    confirm: confirm,
    alert: alert
  };
})(window);
