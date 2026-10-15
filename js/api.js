(function (global) {
  'use strict';

  /*
   * ====== KONFIGURASI ======
   * Tempel URL Web App Google Apps Script di bawah ini.
   * Contoh: 'https://script.google.com/macros/s/AKfycb..../exec'
   *
   * Boleh juga hanya tempel ID deployment-nya (mis. 'AKfycb....'); prefix
   * 'https://script.google.com/macros/s/' + suffix '/exec' akan ditambahkan
   * otomatis. Selama dikosongkan (''), aplikasi berjalan mode statis:
   * hanya membaca data/equipment.json (tanpa bisa menyimpan ke pusat).
   */
  var API_BASE = 'AKfycbxnotcu6P9-ebsoWIwouZUNAAvWJ1qz9FjfIr6S6b5czpfq6bJNPLiKg15yELPcnTp8OQ';

  // Terima URL lengkap maupun hanya ID deployment.
  function normalizeBase(value) {
    var v = String(value == null ? '' : value).trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    if (/^[A-Za-z0-9_-]{20,}$/.test(v)) {
      return 'https://script.google.com/macros/s/' + v + '/exec';
    }
    return v;
  }

  API_BASE = normalizeBase(API_BASE);

  if (global.APP_CONFIG && global.APP_CONFIG.apiBase) {
    API_BASE = normalizeBase(global.APP_CONFIG.apiBase);
  }

  function configured() {
    return /^https?:\/\//i.test(API_BASE);
  }

  function readJson(url, options) {
    return fetch(url, options).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
      return r.json();
    });
  }

  // Baca data dari pusat. Gagal / belum dikonfigurasi -> fallback file lokal.
  function getData() {
    var fallback = function () {
      return readJson('data/equipment.json').then(function (arr) {
        return { equipment: arr, source: 'local' };
      });
    };
    if (!configured()) return fallback();
    return readJson(API_BASE + '?action=data').then(function (res) {
      if (!res || !Array.isArray(res.equipment)) throw new Error('format data tidak dikenal');
      return { equipment: res.equipment, source: 'server' };
    }).catch(function () {
      return fallback();
    });
  }

  // POST ke Apps Script. Content-Type text/plain agar tidak memicu preflight CORS.
  function post(payload) {
    if (!configured()) {
      return Promise.reject(new Error('API belum dikonfigurasi (mode lokal).'));
    }
    return fetch(API_BASE, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json();
    }).then(function (res) {
      if (res && res.ok) return res;
      throw new Error((res && res.error) || 'Gagal menyimpan ke server.');
    });
  }

  /* ---- Operator (PIN) ---- */

  // Validasi PIN operator.
  function verifyPin(pin) {
    return post({ action: 'verify', pin: pin });
  }

  // Operator: ubah field operasional unit (whitelist di server).
  function operatorUpdateUnit(pin, id_unit, fields) {
    return post({ action: 'updateUnitFields', pin: pin, id_unit: id_unit, fields: fields });
  }

  // Operator: ubah field servis satu sparepart (whitelist di server).
  function operatorUpdatePart(pin, id_unit, id_part, fields) {
    return post({ action: 'updatePart', pin: pin, id_unit: id_unit, id_part: id_part, fields: fields });
  }

  /* ---- Admin (key) ---- */

  // Admin: simpan penuh unit (termasuk seluruh sparepart).
  function saveUnitAdmin(key, unit) {
    return post({ action: 'saveUnitAdmin', key: key, unit: unit });
  }

  // Admin: hapus unit beserta seluruh sparepart-nya.
  function adminDeleteUnit(key, id_unit) {
    return post({ action: 'deleteUnit', key: key, id_unit: id_unit });
  }

  global.Api = {
    configured: configured,
    getData: getData,
    post: post,
    verifyPin: verifyPin,
    operatorUpdateUnit: operatorUpdateUnit,
    operatorUpdatePart: operatorUpdatePart,
    saveUnitAdmin: saveUnitAdmin,
    adminDeleteUnit: adminDeleteUnit
  };
})(window);
