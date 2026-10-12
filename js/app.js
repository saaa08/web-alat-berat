(function () {
  'use strict';

  var U = window.Utils;

  var state = {
    equipment: [],
    spareparts: [],
    relations: [],
    loaded: false,
    error: null
  };

  var appEl;

  function loadData() {
    return Promise.all([
      fetch('data/equipment.json').then(function (r) {
        if (!r.ok) throw new Error('equipment.json');
        return r.json();
      }),
      fetch('data/spareparts.json').then(function (r) {
        if (!r.ok) throw new Error('spareparts.json');
        return r.json();
      }),
      fetch('data/equipment_parts.json').then(function (r) {
        if (!r.ok) throw new Error('equipment_parts.json');
        return r.json();
      })
    ])
      .then(function (res) {
        state.equipment = res[0];
        state.spareparts = res[1];
        state.relations = res[2];
        state.loaded = true;
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

  function findPart(id) {
    return state.spareparts.filter(function (p) {
      return p.id_part === id;
    })[0];
  }

  function relationsForUnit(id) {
    return state.relations.filter(function (r) {
      return r.id_unit === id;
    });
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

  function imageSrc(item) {
    return item && item.gambar ? item.gambar : 'images/placeholder.svg';
  }

  function imageTag(item, className, alt) {
    var src = imageSrc(item);
    var label =
      alt || (item && (item.nama_unit || item.nama_part)) || 'Gambar';
    return (
      '<img class="' +
      className +
      '" src="' +
      U.escapeHtml(src) +
      '" alt="' +
      U.escapeHtml(label) +
      '" loading="lazy" onerror="this.onerror=null;this.src=\'images/placeholder.svg\';" />'
    );
  }

  function unitCard(unit) {
    return (
      '<a class="card unit-card" href="#/unit/' +
      encodeURIComponent(unit.id_unit) +
      '">' +
      imageTag(unit, 'unit-thumb', unit.nama_unit) +
      '<div class="unit-card-body">' +
      '<div class="unit-card-top">' +
      '<span class="badge">' +
      U.escapeHtml(unit.kategori) +
      '</span>' +
      '<span class="status status--' +
      (unit.status === 'Aktif' ? 'aktif' : 'lain') +
      '">' +
      U.escapeHtml(unit.status) +
      '</span>' +
      '</div>' +
      '<h3 class="unit-card-title">' +
      U.escapeHtml(unit.nama_unit) +
      '</h3>' +
      '<div class="unit-card-meta">' +
      '<span class="mono">' +
      U.escapeHtml(unit.id_unit) +
      '</span>' +
      '<span>' +
      U.escapeHtml(unit.lokasi) +
      '</span>' +
      '</div>' +
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
      '<span class="info-label">' +
      U.escapeHtml(label) +
      '</span>' +
      '<span class="info-value">' +
      U.escapeHtml(value) +
      '</span>' +
      '</div>'
    );
  }

  function stokText(part) {
    if (part.stok == null || part.stok === '') return '-';
    return U.formatNumber(part.stok) + (part.satuan ? ' ' + part.satuan : '');
  }

  function partCard(unit, rel) {
    var part = findPart(rel.id_part);
    if (!part) return '';
    var lastGanti = rel.terakhir_ganti
      ? U.formatDate(rel.terakhir_ganti) +
        (rel.hm_terakhir ? ' (' + U.formatNumber(rel.hm_terakhir) + ' HM)' : '')
      : 'Belum ada catatan';

    return (
      '<article class="card part-card">' +
      '<div class="part-head">' +
      imageTag(part, 'part-thumb', part.nama_part) +
      '<div class="part-head-text">' +
      '<h3 class="part-name">' +
      U.escapeHtml(part.nama_part) +
      '</h3>' +
      '<span class="badge badge--soft">' +
      U.escapeHtml(part.kategori) +
      '</span>' +
      '</div>' +
      '</div>' +
      '<div class="part-grid">' +
      '<div><span class="info-label">Part Number</span><span class="info-value mono part-number">' +
      U.escapeHtml(part.part_number) +
      '</span></div>' +
      '<div><span class="info-label">Merek</span><span class="info-value">' +
      U.escapeHtml(part.merek_part) +
      '</span></div>' +
      '<div><span class="info-label">Estimasi Harga</span><span class="info-value">' +
      U.formatRupiah(part.harga_estimasi) +
      '</span></div>' +
      '<div><span class="info-label">Stok</span><span class="info-value">' +
      U.escapeHtml(stokText(part)) +
      '</span></div>' +
      '</div>' +
      '<div class="part-service">' +
      '<div><span class="info-label">Interval Servis</span><span class="info-value">' +
      U.escapeHtml(rel.interval_service || '-') +
      '</span></div>' +
      '<div><span class="info-label">Terakhir Ganti</span><span class="info-value">' +
      U.escapeHtml(lastGanti) +
      '</span></div>' +
      (rel.catatan
        ? '<div><span class="info-label">Catatan</span><span class="info-value">' +
          U.escapeHtml(rel.catatan) +
          '</span></div>'
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

    var rels = relationsForUnit(unit.id_unit);
    var partsHtml = rels.length
      ? rels.map(function (r) {
          return partCard(unit, r);
        }).join('')
      : '<p class="empty">Belum ada data sparepart untuk unit ini.</p>';

    var html = '';
    html += '<a class="back" href="#/">&#8592; Kembali</a>';
    html += '<section class="unit-header card">';
    html += imageTag(unit, 'unit-photo', unit.nama_unit);
    html += '<div class="unit-header-body">';
    html += '<span class="badge">' + U.escapeHtml(unit.kategori) + '</span>';
    html += '<h1 class="unit-title">' + U.escapeHtml(unit.nama_unit) + '</h1>';
    html += '<p class="unit-id mono">' + U.escapeHtml(unit.id_unit) + '</p>';
    html += '<div class="info-list">';
    html += infoRow('Merek / Model', unit.merek + ' ' + unit.model);
    html += infoRow('Nomor Seri', unit.nomor_seri);
    html += infoRow('Tahun', unit.tahun);
    html += infoRow('Lokasi', unit.lokasi);
    html += infoRow('Jam Operasi', U.formatNumber(unit.jam_operasi) + ' HM');
    html += infoRow('Berat Operasi', U.formatNumber(unit.berat_operasi) + ' kg');
    html += infoRow('Status', unit.status);
    html += '</div>';
    html += '</div>';
    html += '</section>';

    html += '<h2 class="section-title">Sparepart Kompatibel (' + rels.length + ')</h2>';
    html += '<div class="list">' + partsHtml + '</div>';

    appEl.innerHTML = html;
  }

  function renderNotFound(id) {
    appEl.innerHTML =
      '<section class="card empty-state">' +
      '<h1>Unit tidak ditemukan</h1>' +
      '<p class="muted">ID <span class="mono">' +
      U.escapeHtml(id || '-') +
      '</span> tidak terdaftar pada sistem.</p>' +
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

  function init() {
    appEl = document.getElementById('app');
    appEl.innerHTML = '<p class="empty loading">Memuat data...</p>';
    window.addEventListener('hashchange', route);
    loadData().then(route);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
