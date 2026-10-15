(function (global) {
  'use strict';

  var U = window.Utils;
  var C = window.Core;

  var UNLOCK_KEY = 'operator-unlock';

  var current = { unit: null, parts: [], editingPart: null, error: null, busy: false, status: '' };
  var unlockedPin = '';

  /* ---------- unlock state ---------- */

  function unlockedFor(id) {
    try { return sessionStorage.getItem(UNLOCK_KEY) === id; } catch (e) { return false; }
  }
  function markUnlocked(id) {
    try { sessionStorage.setItem(UNLOCK_KEY, id); } catch (e) { /* ignore */ }
  }
  function clearUnlocked() {
    unlockedPin = '';
    try { sessionStorage.removeItem(UNLOCK_KEY); } catch (e) { /* ignore */ }
  }

  /* ---------- rendering ---------- */

  function mount(unit) {
    current.unit = unit;
    current.parts = (unit && unit.spareparts ? JSON.parse(JSON.stringify(unit.spareparts)) : []) || [];
    current.editingPart = null;
    current.error = null;
    current.status = '';
    renderArea();
  }

  function closePinDialog() {
    var d = document.querySelector('[data-op-dialog]');
    if (!d) return;
    d.remove();
    document.removeEventListener('keydown', onPinKey);
  }

  function onPinKey(e) {
    if (e.key === 'Escape') closePinDialog();
    if (e.key === 'Enter') doUnlock();
  }

  function openPinDialog() {
    var prev = document.querySelector('[data-op-dialog]');
    if (prev) prev.remove();
    var html = (
      '<div class="ui-modal" data-op-dialog>' +
      '<div class="ui-modal-box">' +
      '<h2 class="op-login-title">Masuk Mode Operator</h2>' +
      '<p class="hint">Masukkan PIN untuk memperbarui jam operasi, kondisi, lokasi, dan data servis sparepart. PIN diminta lagi setiap ganti unit.</p>' +
      '<div id="op-pin-error"></div>' +
      '<div class="op-login-field">' +
      '<input type="password" id="op-pin" inputmode="numeric" placeholder="PIN" autocomplete="off">' +
      '</div>' +
      '<div class="ui-modal-actions">' +
      '<button type="button" class="btn btn-ghost" data-op-cancel>Batal</button>' +
      '<button type="button" class="btn btn-primary" data-op-unlock>Masuk</button>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var dlg = tmp.firstElementChild;
    document.body.appendChild(dlg);
    setTimeout(function () { dlg.classList.add('is-in'); }, 10);
    document.addEventListener('keydown', onPinKey);
    var inp = dlg.querySelector('#op-pin');
    if (inp) { inp.focus(); inp.select(); }
  }

  function renderPinError() {
    var errEl = document.getElementById('op-pin-error');
    if (errEl) errEl.innerHTML = current.error ? '<p class="banner warn">' + C.esc(current.error) + '</p>' : '';
  }

  function renderArea() {
    var area = document.getElementById('operator-area');
    if (!area) return;
    if (!current.unit) { area.innerHTML = ''; return; }

    if (!window.Api.configured()) {
      area.innerHTML =
        '<section class="card operator-card">' +
        '<div class="operator-head"><h2 class="section-title">Mode Operator</h2></div>' +
        '<p class="hint">Fitur operator belum aktif: <span class="mono">API belum dikonfigurasi</span>. Isi API_BASE pada <span class="mono">js/api.js</span> setelah Google Sheet siap.</p>' +
        '</section>';
      return;
    }

    if (unlockedFor(current.unit.id_unit) && unlockedPin) {
      area.innerHTML = editorHtml();
    } else {
      area.innerHTML = fabHtml();
    }
  }

  function fabHtml() {
    var icon = (
      '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M2.5 16.5h19"/>' +
      '<path d="M6 16.5a6 6 0 0 1 12 0"/>' +
      '<path d="M12 6.5v3"/>' +
      '</svg>'
    );
    return (
      '<button type="button" class="op-fab" data-op-open aria-label="Mode Operator" title="Mode Operator">' +
      icon +
      '</button>'
    );
  }

  function unitFormHtml(u) {
    return (
      '<form id="operator-form" class="form">' +
      '<h3>Kondisi Unit</h3>' +
      '<div class="form-grid">' +
      C.field('Jam Operasi (HM)', C.numberInput('jam_operasi', u.jam_operasi)) +
      C.field('Lokasi', C.input('lokasi', u.lokasi)) +
      C.field('Status', C.select('status', C.STATUS_UNIT, u.status)) +
      C.field('Kondisi', C.input('kondisi', u.kondisi)) +
      '</div>' +
      '<div class="form-actions"><button type="submit" class="btn-sm primary">Simpan Kondisi</button></div>' +
      '</form>'
    );
  }

  function serviceSummary(p) {
    var last = p.terakhir_ganti ? U.formatDate(p.terakhir_ganti) : 'Belum ada catatan';
    if (p.hm_terakhir != null && p.hm_terakhir !== '') last += ' (' + U.formatNumber(p.hm_terakhir) + ' HM)';
    return (
      '<span class="mono">' + C.esc(p.part_number || '-') + '</span> &middot; ' +
      'Stok ' + C.esc(C.stokText(p)) + ' &middot; Interval ' + C.esc(p.interval_service || '-') +
      ' &middot; Ganti ' + C.esc(last)
    );
  }

  function partRow(p, i) {
    return (
      '<div class="row-item">' +
      '<div class="row-main"><div class="row-title">' + C.esc(p.nama_part || p.id_part) + '</div>' +
      '<div class="row-sub">' + serviceSummary(p) + '</div></div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn-sm" data-op-part-edit data-idx="' + i + '">Update Servis</button>' +
      '</div></div>'
    );
  }

  function serviceFormHtml(p) {
    p = p || {};
    return (
      '<div class="operator-subform">' +
      '<h4>Update Servis &mdash; ' + C.esc(p.nama_part || p.id_part) + '</h4>' +
      '<div class="form-grid">' +
      C.field('Stok', C.numberInput('stok', p.stok)) +
      C.field('Satuan', C.select('satuan', C.SATUAN, p.satuan)) +
      C.field('Interval Servis', C.input('interval_service', p.interval_service)) +
      C.field('Terakhir Ganti', C.dateInput('terakhir_ganti', p.terakhir_ganti)) +
      C.field('HM Terakhir', C.numberInput('hm_terakhir', p.hm_terakhir)) +
      C.field('Catatan', C.textarea('catatan', p.catatan)) +
      '</div>' +
      '<div class="form-actions">' +
      '<button type="submit" class="btn-sm primary">Simpan Servis</button>' +
      '<button type="button" class="btn-sm" data-op-part-cancel>Batal</button>' +
      '</div>' +
      '</div>'
    );
  }

  function partsInner() {
    var sub = '';
    if (current.editingPart !== null) {
      sub = '<form id="operator-part-form" class="form">' + serviceFormHtml(current.parts[current.editingPart]) + '</form>';
    }
    var rows = current.parts.length
      ? current.parts.map(partRow).join('')
      : '<p class="empty">Belum ada sparepart untuk unit ini.</p>';
    return (
      '<div class="panel-head"><h3>Data Servis Sparepart (' + current.parts.length + ')</h3>' +
      '<div class="row-actions">' +
      (current.status ? '<span class="save-status">' + C.esc(current.status) + '</span>' : '') +
      '</div></div>' +
      sub +
      '<div class="rows">' + rows + '</div>'
    );
  }

  function editorHtml() {
    var u = current.unit;
    return (
      '<section class="card operator-card">' +
      '<div class="operator-head">' +
      '<h2 class="section-title">Mode Operator &mdash; ' + C.esc(u.id_unit) + '</h2>' +
      '<button type="button" class="btn-sm" data-op-exit>Keluar</button>' +
      '</div>' +
      '<div id="operator-error"></div>' +
      unitFormHtml(u) +
      '<div id="operator-parts-area" class="operator-parts">' + partsInner() + '</div>' +
      '</section>'
    );
  }

  function renderEditor() {
    var area = document.getElementById('operator-area');
    if (area) area.innerHTML = editorHtml();
    renderError();
  }

  function renderError() {
    var el = document.getElementById('operator-error');
    if (el) el.innerHTML = current.error ? '<p class="banner warn">' + C.esc(current.error) + '</p>' : '';
  }

  function renderParts() {
    var el = document.getElementById('operator-parts-area');
    if (el) el.innerHTML = partsInner();
  }

  function renderPartsArea() {
    renderError();
    renderParts();
  }

  /* ---------- actions ---------- */

  function doUnlock() {
    if (current.busy) return;
    var el = document.getElementById('op-pin');
    var pin = el ? el.value.trim() : '';
    if (!pin) { current.error = 'PIN kosong.'; renderPinError(); return; }
    current.busy = true; current.error = null;
    renderPinError();
    var sub = document.querySelector('[data-op-unlock]');
    if (sub) { sub.disabled = true; sub.textContent = 'Memeriksa...'; }
    window.Api.verifyPin(pin).then(function () {
      current.busy = false;
      unlockedPin = pin;
      markUnlocked(current.unit.id_unit);
      closePinDialog();
      renderEditor();
    }).catch(function (err) {
      current.busy = false;
      current.error = (err && err.message) || 'PIN salah.';
      renderPinError();
      if (sub) { sub.disabled = false; sub.textContent = 'Masuk'; }
      if (el) { el.value = ''; el.focus(); el.select(); }
    });
  }

  function saveUnit(form) {
    var fields = C.pick(C.readForm(form), C.OPERATOR_UNIT_FIELDS);
    current.busy = true; current.error = null; current.status = '';
    renderError();
    window.Api.operatorUpdateUnit(unlockedPin, current.unit.id_unit, fields).then(function () {
      current.busy = false;
      current.unit.jam_operasi = fields.jam_operasi;
      current.unit.lokasi = fields.lokasi;
      current.unit.status = fields.status;
      current.unit.kondisi = fields.kondisi;
      renderEditor();
      window.Ui.toast('Kondisi unit tersimpan.', 'ok');
    }).catch(function (err) {
      current.busy = false;
      current.error = (err && err.message) || 'Gagal menyimpan.';
      renderError();
    });
  }

  function saveService(form) {
    var idx = current.editingPart;
    var p = current.parts[idx];
    if (!p) return;
    var fields = C.pick(C.readForm(form), C.OPERATOR_PART_FIELDS);
    current.error = null;
    current.status = 'Menyimpan\u2026';
    renderPartsArea();
    window.Api.operatorUpdatePart(unlockedPin, current.unit.id_unit, p.id_part, fields).then(function () {
      Object.keys(fields).forEach(function (k) { p[k] = fields[k]; });
      current.editingPart = null;
      current.unit.spareparts = current.parts;
      current.status = 'Tersimpan otomatis.';
      renderPartsArea();
      window.Ui.toast('Data servis tersimpan.', 'ok');
    }).catch(function (err) {
      current.status = '';
      current.error = (err && err.message) || 'Gagal menyimpan servis.';
      renderPartsArea();
    });
  }

  /* ---------- events ---------- */

  function onClick(e) {
    var t = e.target.closest('[data-op-open],[data-op-unlock],[data-op-cancel],[data-op-exit],[data-op-part-edit],[data-op-part-cancel]');
    if (!t) return;
    if (t.hasAttribute('data-op-open')) openPinDialog();
    else if (t.hasAttribute('data-op-unlock')) doUnlock();
    else if (t.hasAttribute('data-op-cancel')) closePinDialog();
    else if (t.hasAttribute('data-op-exit')) { clearUnlocked(); current.error = null; current.status = ''; current.editingPart = null; closePinDialog(); renderArea(); }
    else if (t.hasAttribute('data-op-part-edit')) { current.editingPart = Number(t.getAttribute('data-idx')); renderParts(); }
    else if (t.hasAttribute('data-op-part-cancel')) { current.editingPart = null; renderParts(); }
  }

  function onSubmit(e) {
    if (e.target && e.target.id === 'operator-form') { e.preventDefault(); saveUnit(e.target); }
    else if (e.target && e.target.id === 'operator-part-form') { e.preventDefault(); saveService(e.target); }
  }

  function init() {
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
  }

  document.addEventListener('DOMContentLoaded', init);

  global.Operator = { mount: mount };
})(window);
