(function () {
  'use strict';

  var U = window.Utils;
  var C = window.Core;

  var state = {
    equipment: [],
    loaded: false,
    source: 'local',
    error: null
  };

  var appEl;

  function loadData() {
    return window.Api.getData()
      .then(function (res) {
        state.equipment = res.equipment || [];
        state.source = res.source || 'local';
        state.loaded = true;
        state.error = null;
      })
      .catch(function (err) {
        state.error = err;
      });
  }

  function findUnit(id) {
    return state.equipment.filter(function (u) {
      return u.id_unit === id;
    })[0];
  }

  function parseRoute() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash || hash === '/' || hash === '') {
      return { name: 'home' };
    }
    var parts = hash.split('/').filter(Boolean);
    if (parts[0] === 'unit' && parts[1]) {
      return { name: 'unit', id: decodeURIComponent(parts[1]) };
    }
    return { name: 'notfound' };
  }

  function qrBaseUrl() {
    return (localStorage.getItem('alatberat-qr-base-url') || window.location.origin + window.location.pathname)
      .replace(/index\.html$/, '');
  }

  function unitCard(unit) {
    var nParts = (unit.spareparts || []).length;
    return (
      '<a class="card unit-card" href="#/unit/' +
      encodeURIComponent(unit.id_unit) +
      '">' +
      C.imageTag(unit, 'unit-thumb', unit.nama_unit) +
      '<div class="unit-card-body">' +
      '<div class="unit-card-top">' +
      '<span class="badge">' + U.escapeHtml(unit.kategori) + '</span>' +
      '<span class="status status--' +
      (unit.status === 'Aktif' || /Baik/.test(unit.status || '') ? 'aktif' : 'lain') +
      '">' + U.escapeHtml(unit.status) + '</span>' +
      '</div>' +
      '<h3 class="unit-card-title">' + U.escapeHtml(unit.nama_unit) + '</h3>' +
      '<div class="unit-card-meta">' +
      '<span class="mono">' + U.escapeHtml(unit.id_unit) + '</span>' +
      '<span>' + U.escapeHtml(unit.lokasi) + '</span>' +
      '</div>' +
      '<div class="unit-card-meta"><span class="mono">' + nParts + ' sparepart</span></div>' +
      '</div>' +
      '</a>'
    );
  }

  function renderHome() {
    var html = '';
    html += '<section class="hero">';
    html += '<h1>Daftar Alat Berat</h1>';
    html += '<p class="muted">Cari unit atau scan QR di bodi alat untuk melihat sparepart.</p>';
    html += '<input id="search" class="search" type="search" inputmode="search" placeholder="Cari ID unit / nama / lokasi..." autocomplete="off">';
    html += '</section>';
    html += '<div id="unit-list" class="list"></div>';
    appEl.innerHTML = html;

    var listEl = document.getElementById('unit-list');
    var searchEl = document.getElementById('search');

    function paint(filter) {
      var q = (filter || '').trim().toLowerCase();
      var items = state.equipment.filter(function (u) {
        if (!q) return true;
        return (
          u.id_unit.toLowerCase().indexOf(q) !== -1 ||
          u.nama_unit.toLowerCase().indexOf(q) !== -1 ||
          (u.lokasi || '').toLowerCase().indexOf(q) !== -1
        );
      });
      if (!items.length) {
        listEl.innerHTML = '<p class="empty">Tidak ada unit yang cocok.</p>';
        return;
      }
      listEl.innerHTML = items.map(unitCard).join('');
    }

    searchEl.addEventListener('input', function () {
      paint(searchEl.value);
    });

    paint('');
  }

  function infoRow(label, value) {
    return (
      '<div class="info-row">' +
      '<span class="info-label">' + U.escapeHtml(label) + '</span>' +
      '<span class="info-value">' + U.escapeHtml(value) + '</span>' +
      '</div>'
    );
  }

  function partCard(part) {
    var lastGanti = part.terakhir_ganti
      ? U.formatDate(part.terakhir_ganti) +
        (part.hm_terakhir ? ' (' + U.formatNumber(part.hm_terakhir) + ' HM)' : '')
      : 'Belum ada catatan';

    return (
      '<article class="card part-card">' +
      '<div class="part-head">' +
      C.imageTag(part, 'part-thumb', part.nama_part) +
      '<div class="part-head-text">' +
      '<h3 class="part-name">' + U.escapeHtml(part.nama_part) + '</h3>' +
      '<span class="badge badge--soft">' + U.escapeHtml(part.kategori) + '</span>' +
      '</div>' +
      '</div>' +
      '<div class="part-grid">' +
      '<div><span class="info-label">Part Number</span><span class="info-value mono part-number">' + U.escapeHtml(part.part_number) + '</span></div>' +
      '<div><span class="info-label">Merek</span><span class="info-value">' + U.escapeHtml(part.merek_part) + '</span></div>' +
      '<div><span class="info-label">Estimasi Harga</span><span class="info-value">' + U.formatRupiah(part.harga_estimasi) + '</span></div>' +
      '<div><span class="info-label">Stok</span><span class="info-value">' + U.escapeHtml(C.stokText(part)) + '</span></div>' +
      '</div>' +
      '<div class="part-service">' +
      '<div><span class="info-label">Interval Servis</span><span class="info-value">' + U.escapeHtml(part.interval_service || '-') + '</span></div>' +
      '<div><span class="info-label">Terakhir Ganti</span><span class="info-value">' + U.escapeHtml(lastGanti) + '</span></div>' +
      (part.catatan
        ? '<div><span class="info-label">Catatan</span><span class="info-value">' + U.escapeHtml(part.catatan) + '</span></div>'
        : '') +
      '</div>' +
      '</article>'
    );
  }

  function renderUnit(id) {
    var unit = findUnit(id);
    if (!unit) {
      renderNotFound(id);
      return;
    }

    var parts = unit.spareparts || [];
    var partsHtml = parts.length
      ? parts.map(partCard).join('')
      : '<p class="empty">Belum ada data sparepart untuk unit ini.</p>';

    var info = '';
    var merekModel = [unit.merek, unit.model].filter(Boolean).join(' ');
    if (merekModel) info += infoRow('Merek / Model', merekModel);
    if (unit.nomor_seri) info += infoRow('Nomor Seri', unit.nomor_seri);
    if (unit.tahun) info += infoRow('Tahun', unit.tahun);
    if (unit.lokasi) info += infoRow('Lokasi', unit.lokasi);
    if (unit.jumlah) info += infoRow('Jumlah', unit.jumlah);
    if (unit.kondisi) info += infoRow('Kondisi', unit.kondisi);
    if (unit.status) info += infoRow('Status', unit.status);
    if (unit.nilai_perolehan != null) info += infoRow('Nilai Perolehan', U.formatRupiah(unit.nilai_perolehan));
    if (unit.surat_pajak) info += infoRow('Surat / Pajak', unit.surat_pajak);
    if (unit.nota) info += infoRow('Nota', unit.nota);
    if (unit.catatan) info += infoRow('Catatan', unit.catatan);
    info += infoRow('Partisipan', unit.partisipan ? unit.partisipan : '-');

    var html = '';
    html += '<a class="back" href="#/">&#8592; Kembali</a>';
    html += '<section class="unit-header card">';
    html += C.imageTag(unit, 'unit-photo', unit.nama_unit);
    html += '<div class="unit-header-body">';
    html += '<span class="badge">' + U.escapeHtml(unit.kategori) + '</span>';
    html += '<h1 class="unit-title">' + U.escapeHtml(unit.nama_unit) + '</h1>';
    html += '<p class="unit-id mono">' + U.escapeHtml(unit.id_unit) + '</p>';
    html += '<div class="info-list">' + info + '</div>';
    html += '</div>';
    html += '</section>';

    html += '<h2 class="section-title">Sparepart Kompatibel (' + parts.length + ')</h2>';
    html += '<div class="list">' + partsHtml + '</div>';

    var qrUrl = qrBaseUrl() + '#/unit/' + encodeURIComponent(unit.id_unit);
    try {
      var qrData = C.makeQrDataUrl(qrUrl);
      html += '<section class="card qr-unit">';
      html += '  <div class="qr-unit-head"><h2 class="section-title">Kode Barkode (QR)</h2><span class="muted mono">' + U.escapeHtml(unit.id_unit) + '</span></div>';
      html += '  <div class="qr-unit-body">';
      html += '    <img class="qr-img" src="' + qrData + '" alt="QR ' + U.escapeHtml(unit.id_unit) + '">';
      html += '    <div class="qr-unit-info">';
      html += '      <div class="muted">Link:</div>';
      html += '      <div class="mono qr-url">' + U.escapeHtml(qrUrl) + '</div>';
      html += '      <a class="btn-sm" href="' + qrData + '" download="QR-' + U.escapeHtml(unit.id_unit) + '.png">Unduh PNG</a>';
      html += '    </div>';
      html += '  </div>';
      html += '</section>';
    } catch (e) {}

    html += '<div id="operator-area"></div>';

    appEl.innerHTML = html;
    window.scrollTo(0, 0);

    if (window.Operator && window.Operator.mount) {
      window.Operator.mount(unit);
    }
  }

  function renderNotFound(id) {
    appEl.innerHTML =
      '<section class="card empty-state">' +
      '<h1>Unit tidak ditemukan</h1>' +
      '<p class="muted">ID <span class="mono">' + U.escapeHtml(id || '-') + '</span> tidak terdaftar pada sistem.</p>' +
      '<a class="btn" href="#/">Kembali ke Daftar</a>' +
      '</section>';
  }

  function renderError() {
    appEl.innerHTML =
      '<section class="card empty-state">' +
      '<h1>Gagal memuat data</h1>' +
      '<p class="muted">Data tidak bisa dibaca. Pastikan halaman diakses melalui web server (GitHub Pages), bukan dibuka langsung sebagai file.</p>' +
      '<a class="btn" href="">Muat Ulang</a>' +
      '</section>';
  }

  function route() {
    if (state.error) {
      renderError();
      return;
    }
    var r = parseRoute();
    if (r.name === 'unit') {
      renderUnit(r.id);
    } else if (r.name === 'notfound') {
      renderNotFound('?');
    } else {
      renderHome();
    }
    window.scrollTo(0, 0);
  }

  function reload() {
    return loadData().then(route);
  }

  function init() {
    appEl = document.getElementById('app');
    appEl.innerHTML = '<p class="empty loading">Memuat data...</p>';
    window.addEventListener('hashchange', route);
    loadData().then(route);
  }

  window.UnitApp = {
    reload: reload,
    findUnit: findUnit,
    getState: function () { return state; }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
