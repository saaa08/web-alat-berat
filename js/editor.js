(function () {
  'use strict';

  var U = window.Utils;
  var C = window.Core;
  var Ui = window.Ui;

  var BASE_KEY = 'alatberat-qr-base-url';

  var state = {
    equipment: [],
    active: 'equipment',
    loaded: false,
    editingIndex: null,   // null = tidak menyunting, -1 = unit baru, >=0 = indeks unit
    parts: [],
    editingPart: null,
    saveStatus: '',
    unitFilter: '',
    unitSort: 'name',
    partFilter: '',
    source: 'local',
    error: null
  };

  var rootEl;

  function adminKey() {
    return (window.Auth && window.Auth.adminKey) ? window.Auth.adminKey() : '';
  }

  function esc(v) { return C.esc(v); }

  /* ---------- data ---------- */

  function loadData() {
    return window.Api.getData().then(function (res) {
      state.equipment = res.equipment || [];
      state.source = res.source || 'local';
      state.error = null;
    }).catch(function (err) {
      state.error = 'Data file tidak termuat (pastikan dibuka lewat web server). ' + ((err && err.message) || '');
    });
  }

  /* ---------- forms ---------- */

  function equipmentForm(u) {
    u = u || {};
    return (
      '<form id="edit-form" class="form">' +
      '<h3>' + (state.editingIndex == null || state.editingIndex === -1 ? 'Tambah' : 'Edit') + ' Alat Berat</h3>' +
      '<div class="form-grid">' +
      C.field('ID Unit *', C.input('id_unit', u.id_unit), 'Contoh: ABR-003') +
      C.field('Nama Unit *', C.input('nama_unit', u.nama_unit)) +
      C.field('Kategori', C.select('kategori', C.KATEGORI_UNIT, u.kategori)) +
      C.field('Status', C.select('status', C.STATUS_UNIT, u.status)) +
      C.field('Kondisi', C.input('kondisi', u.kondisi), 'Contoh: Baru → Baik') +
      C.field('Merek', C.input('merek', u.merek)) +
      C.field('Model', C.input('model', u.model)) +
      C.field('Nomor Seri', C.input('nomor_seri', u.nomor_seri)) +
      C.field('Tahun', C.numberInput('tahun', u.tahun)) +
      C.field('Lokasi', C.input('lokasi', u.lokasi)) +
      C.field('Jumlah', C.input('jumlah', u.jumlah), 'Contoh: 1 unit') +
      C.field('Jam Operasi (HM)', C.numberInput('jam_operasi', u.jam_operasi)) +
      C.field('Berat Operasi (kg)', C.numberInput('berat_operasi', u.berat_operasi)) +
      C.field('Nilai Perolehan (Rp)', C.numberInput('nilai_perolehan', u.nilai_perolehan)) +
      C.field('Surat / Pajak', C.input('surat_pajak', u.surat_pajak)) +
      C.field('Nota', C.input('nota', u.nota)) +
      C.field(
        'Gambar',
        '<div class="input-with-btn">' + C.input('gambar', u.gambar) +
        '<button type="button" class="btn-sm" data-fill="gambar" data-from="id_unit">Otomatis</button></div>',
        'Kosongkan untuk placeholder. Foto ditaruh di folder images/.'
      ) +
      C.field('Fokus Gambar', C.focusControl(u), 'Pilih titik fokus & zoom agar bagian penting foto tidak terpotong.') +
      C.field('Keterangan', C.textarea('keterangan', u.keterangan)) +
      C.field('Partisipan', C.textarea('partisipan', u.partisipan), 'Kosongkan bila tidak ada (tampil "-").') +
      '</div>' +
      '<div class="form-actions"><button type="submit" class="btn-sm primary">Simpan Unit</button>' +
      '<button type="button" class="btn-sm" data-cancel>Batal</button></div>' +
      '</form>'
    );
  }

  function partRow(p, i) {
    var sub = '<span class="mono">' + esc(p.part_number || '-') + '</span> &middot; ' +
      esc(p.kategori || '-') + ' &middot; ' + esc(U.formatRupiah(p.harga_estimasi)) +
      ' &middot; stok ' + esc(C.stokText(p));
    return (
      '<div class="row-item">' +
      '<div class="row-main"><div class="row-title">' + esc(p.nama_part || p.id_part) + '</div>' +
      '<div class="row-sub">' + sub + '</div></div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn-sm" data-part-edit data-idx="' + i + '">Edit</button>' +
      '<button type="button" class="btn-sm danger" data-part-del data-idx="' + i + '">Hapus</button>' +
      '</div></div>'
    );
  }

  function partFormHtml(p) {
    p = p || {};
    return (
      '<form id="part-form" class="form">' +
      '<h4>' + (state.editingPart === -1 ? 'Tambah' : 'Edit') + ' Sparepart</h4>' +
      '<div class="form-grid">' +
      C.field('ID Part', C.input('id_part', p.id_part), 'Contoh: P-001') +
      C.field('Nama Part *', C.input('nama_part', p.nama_part)) +
      C.field('Part Number *', C.input('part_number', p.part_number)) +
      C.field('Kategori', C.select('kategori', C.KATEGORI_PART, p.kategori)) +
      C.field('Merek Part', C.input('merek_part', p.merek_part)) +
      C.field('Estimasi Harga (Rp)', C.numberInput('harga_estimasi', p.harga_estimasi)) +
      C.field('Stok', C.numberInput('stok', p.stok)) +
      C.field('Satuan', C.select('satuan', C.SATUAN, p.satuan)) +
      C.field('Gambar', C.input('gambar', p.gambar), 'Contoh: images/filter-oli.jpg') +
      C.field('Fokus Gambar', C.focusControl(p), 'Atur bila foto part terpotong.') +
      C.field('Interval Servis', C.input('interval_service', p.interval_service), 'Contoh: Setiap 250 jam operasi') +
      C.field('Terakhir Ganti', C.dateInput('terakhir_ganti', p.terakhir_ganti)) +
      C.field('HM Terakhir', C.numberInput('hm_terakhir', p.hm_terakhir)) +
      C.field('Catatan', C.textarea('catatan', p.catatan)) +
      '</div>' +
      '<div class="form-actions"><button type="submit" class="btn-sm primary">Simpan Part</button>' +
      '<button type="button" class="btn-sm" data-part-cancel>Batal</button></div>' +
      '</form>'
    );
  }

  function partsEditorInner() {
    var sub = '';
    if (state.editingPart !== null) {
      var p = state.editingPart === -1 ? null : state.parts[state.editingPart];
      sub = '<div class="operator-subform">' + partFormHtml(p) + '</div>';
    }
    var rows = state.parts.length
      ? state.parts.map(partRow).join('')
      : '<p class="empty">Belum ada sparepart untuk unit ini.</p>';
    return (
      '<div class="panel-head"><h3>Sparepart (' + state.parts.length + ')</h3>' +
      '<div class="row-actions">' +
      (state.saveStatus ? '<span class="save-status">' + esc(state.saveStatus) + '</span>' : '') +
      '<button type="button" class="btn-sm primary" data-part-add>+ Tambah Sparepart</button>' +
      '</div></div>' +
      sub + '<div class="rows">' + rows + '</div>'
    );
  }

  function renderParts() {
    var el = rootEl.querySelector('#parts-editor');
    if (el) el.innerHTML = partsEditorInner();
  }

  function currentUnitFromForm() {
    var form = rootEl.querySelector('#edit-form');
    var data = form ? C.readForm(form) : {};
    var base = state.editingIndex != null && state.editingIndex >= 0 ? state.equipment[state.editingIndex] : {};
    data.id_unit = data.id_unit || base.id_unit || '';
    data.fokus_gambar = data.fokus_gambar || base.fokus_gambar || { x: 50, y: 50, zoom: 1, rotate: 0 };
    data.spareparts = state.parts;
    return data;
  }

  // Simpan otomatis ke server setiap ada tambah/ubah/hapus sparepart.
  function persistParts() {
    if (!window.Api || !window.Api.configured()) {
      state.saveStatus = 'Mode lokal: perubahan tersimpan saat Simpan Unit.';
      renderParts();
      return;
    }
    if (state.editingIndex == null || state.editingIndex === -1) {
      state.saveStatus = 'Part ditambahkan. Tekan "Simpan Unit" untuk menyimpan.';
      renderParts();
      return;
    }
    var unit = currentUnitFromForm();
    if (!unit.id_unit || !unit.nama_unit) {
      state.saveStatus = 'Lengkapi ID & Nama Unit untuk menyimpan part.';
      renderParts();
      return;
    }
    state.saveStatus = 'Menyimpan\u2026';
    renderParts();
    window.Api.saveUnitAdmin(adminKey(), unit).then(function () {
      state.equipment[state.editingIndex] = unit;
      state.saveStatus = 'Tersimpan otomatis.';
      renderParts();
    }).catch(function (err) {
      state.saveStatus = 'Gagal simpan: ' + ((err && err.message) || err);
      renderParts();
    });
  }

  /* ---------- lists ---------- */

  function unitEntries() {
    var q = state.unitFilter.trim().toLowerCase();
    var items = state.equipment.map(function (u, i) { return { u: u, i: i }; }).filter(function (it) {
      if (!q) return true;
      var u = it.u;
      return (u.id_unit || '').toLowerCase().indexOf(q) !== -1 ||
        (u.nama_unit || '').toLowerCase().indexOf(q) !== -1 ||
        (u.kategori || '').toLowerCase().indexOf(q) !== -1 ||
        (u.lokasi || '').toLowerCase().indexOf(q) !== -1;
    });
    var key = state.unitSort;
    items.sort(function (a, b) {
      if (key === 'id') return String(a.u.id_unit || '').localeCompare(String(b.u.id_unit || ''));
      if (key === 'kategori') return String(a.u.kategori || '').localeCompare(String(b.u.kategori || '')) || String(a.u.nama_unit || '').localeCompare(String(b.u.nama_unit || ''));
      if (key === 'parts') return (b.u.spareparts || []).length - (a.u.spareparts || []).length;
      return String(a.u.nama_unit || '').localeCompare(String(b.u.nama_unit || ''));
    });
    return items;
  }

  function unitRowsHtml() {
    var items = unitEntries();
    if (!items.length) return '<p class="empty">Tidak ada unit yang cocok.</p>';
    return items.map(function (it) {
      var u = it.u;
      var n = (u.spareparts || []).length;
      var sub = '<span class="mono">' + esc(u.id_unit) + '</span> &middot; ' +
        esc(u.kategori || '-') + ' &middot; ' + esc(u.lokasi || '-') + ' &middot; ' + n + ' part';
      return (
        '<div class="row-item">' +
        '<div class="row-main"><div class="row-title">' + esc(u.nama_unit) + '</div><div class="row-sub">' + sub + '</div></div>' +
        '<div class="row-actions">' +
        '<button type="button" class="btn-sm" data-edit="equipment" data-index="' + it.i + '">Edit</button>' +
        '<button type="button" class="btn-sm danger" data-del="equipment" data-index="' + it.i + '">Hapus</button>' +
        '</div></div>'
      );
    }).join('');
  }

  function equipmentPanel() {
    var form = state.editingIndex !== null
      ? equipmentForm(state.editingIndex >= 0 ? state.equipment[state.editingIndex] : null) +
        '<div id="parts-editor" class="operator-parts">' + partsEditorInner() + '</div>'
      : '';
    var sortOpts =
      '<option value="name"' + (state.unitSort === 'name' ? ' selected' : '') + '>Nama</option>' +
      '<option value="id"' + (state.unitSort === 'id' ? ' selected' : '') + '>ID Unit</option>' +
      '<option value="parts"' + (state.unitSort === 'parts' ? ' selected' : '') + '>Jumlah Sparepart</option>' +
      '<option value="kategori"' + (state.unitSort === 'kategori' ? ' selected' : '') + '>Kategori</option>';
    return (
      '<div class="panel-head"><h2>Alat Berat (' + state.equipment.length + ')</h2>' +
      '<button type="button" class="btn-sm primary" data-add="equipment">+ Tambah Unit</button></div>' +
      '<div class="card filter-bar">' +
      '<div class="field"><label>Cari unit</label>' +
      '<input type="search" id="unit-search" value="' + esc(state.unitFilter) + '" placeholder="ID / nama / kategori / lokasi" autocomplete="off"></div>' +
      '<div class="field"><label>Urutkan</label><select id="unit-sort">' + sortOpts + '</select></div>' +
      '</div>' +
      form +
      '<div class="rows" id="unit-list">' + unitRowsHtml() + '</div>'
    );
  }

  function allParts() {
    var out = [];
    state.equipment.forEach(function (u, i) {
      (u.spareparts || []).forEach(function (p) {
        out.push({ unit: u, index: i, part: p });
      });
    });
    return out;
  }

  function partListHtml(filter) {
    var q = (filter || '').trim().toLowerCase();
    var items = allParts().filter(function (it) {
      if (!q) return true;
      var p = it.part;
      var u = it.unit;
      return (
        (p.nama_part || '').toLowerCase().indexOf(q) !== -1 ||
        (p.part_number || '').toLowerCase().indexOf(q) !== -1 ||
        (p.kategori || '').toLowerCase().indexOf(q) !== -1 ||
        (u.id_unit || '').toLowerCase().indexOf(q) !== -1 ||
        (u.nama_unit || '').toLowerCase().indexOf(q) !== -1
      );
    });
    if (!items.length) return '<p class="empty">Tidak ada sparepart yang cocok.</p>';
    return items.map(function (it) {
      var p = it.part;
      var u = it.unit;
      var sub = '<span class="mono">' + esc(u.id_unit) + '</span> &middot; ' +
        esc(p.part_number || '-') + ' &middot; ' + esc(p.kategori || '-') +
        ' &middot; stok ' + esc(C.stokText(p)) +
        ' &middot; ' + esc(U.formatRupiah(p.harga_estimasi));
      return (
        '<div class="row-item">' +
        '<div class="row-main"><div class="row-title">' + esc(p.nama_part || p.id_part) + '</div>' +
        '<div class="row-sub">' + sub + '</div></div>' +
        '<div class="row-actions">' +
        '<button type="button" class="btn-sm" data-edit="equipment" data-index="' + it.index + '">Edit unit</button>' +
        '</div></div>'
      );
    }).join('');
  }

  function sparepartsPanel() {
    var total = allParts().length;
    var withParts = state.equipment.filter(function (u) { return (u.spareparts || []).length; }).length;
    return (
      '<div class="panel-head"><h2>Semua Sparepart (' + total + ')</h2>' +
      '<span class="hint">' + withParts + ' unit memiliki sparepart</span></div>' +
      '<div class="card part-search-card">' +
      '<div class="field"><label>Cari sparepart</label>' +
      '<input type="search" id="part-search" value="' + esc(state.partFilter) + '" placeholder="Nama / part number / kategori / unit" autocomplete="off"></div>' +
      '</div>' +
      '<div class="rows" id="part-list">' + partListHtml(state.partFilter) + '</div>'
    );
  }

  function toolbar() {
    function pill(type, label) {
      return '<button type="button" class="pill' + (state.active === type ? ' is-active' : '') +
        '" data-tab="' + type + '">' + label + '</button>';
    }
    return (
      '<div class="editor-toolbar">' +
      pill('equipment', 'Alat Berat') +
      pill('spareparts', 'Sparepart') +
      pill('qr', 'QR Unit') +
      '<button type="button" class="btn-sm editor-logout" data-logout>Keluar</button>' +
      '</div>'
    );
  }

  /* ---------- QR ---------- */

  function getBaseUrl() {
    try {
      var saved = localStorage.getItem(BASE_KEY);
      if (saved) return saved;
    } catch (e) { /* ignore */ }
    return window.location.href.split('#')[0].replace(/admin\.html$/i, '');
  }

  function saveBaseUrl(value) {
    try { localStorage.setItem(BASE_KEY, value); } catch (e) { /* ignore */ }
  }

  function qrPanel() {
    var base = getBaseUrl();
    var items = state.equipment.length
      ? state.equipment.map(function (u) {
          var url = base + '#/unit/' + encodeURIComponent(u.id_unit);
          var png = C.makeQrDataUrl(url, 10, 2);
          return (
            '<div class="qr-item card">' +
            '<img class="qr-img" src="' + png + '" alt="QR ' + esc(u.id_unit) + '">' +
            '<div class="qr-info">' +
            '<div class="row-title">' + esc(u.nama_unit) + '</div>' +
            '<div class="row-sub mono">' + esc(u.id_unit) + '</div>' +
            '<div class="row-sub qr-url">' + esc(url) + '</div>' +
            '<div class="form-actions">' +
            '<a class="btn-sm primary" href="' + png + '" download="QR-' + esc(u.id_unit) + '.png">Unduh PNG</a>' +
            '<button type="button" class="btn-sm" data-qr-open="' + esc(url) + '">Buka link</button>' +
            '</div>' +
            '</div>' +
            '</div>'
          );
        }).join('')
      : '<p class="empty">Belum ada unit.</p>';
    return (
      '<div class="panel-head"><h2>QR Code Unit (' + state.equipment.length + ')</h2>' +
      '<button type="button" class="btn-sm" data-qr-print>Cetak Semua</button></div>' +
      '<div class="card qr-base">' +
      '<div class="field">' +
      '<label>Base URL web</label>' +
      '<div class="input-with-btn">' +
      '<input type="url" id="qr-base" value="' + esc(base) + '" autocomplete="off">' +
      '<button type="button" class="btn-sm primary" data-qr-apply>Terapkan</button>' +
      '</div>' +
      '<span class="hint">QR berisi: base URL + #/unit/ID. Sesuaikan bila domain deploy berubah.</span>' +
      '</div>' +
      '</div>' +
      '<div class="qr-grid">' + items + '</div>'
    );
  }

  function printAllQr() {
    var base = getBaseUrl();
    var cards = state.equipment.map(function (u) {
      var url = base + '#/unit/' + encodeURIComponent(u.id_unit);
      var png = C.makeQrDataUrl(url, 10, 2);
      return '<div class="print-qr"><img src="' + png + '" alt="QR ' + esc(u.id_unit) + '">' +
        '<div class="print-qr-name">' + esc(u.nama_unit) + '</div>' +
        '<div class="print-qr-id">' + esc(u.id_unit) + '</div></div>';
    }).join('');
    var w = window.open('', '_blank');
    if (!w) { Ui.alert('Popup diblokir. Izinkan popup untuk mencetak QR.'); return; }
    w.document.write(
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR Unit</title>' +
      '<style>body{font-family:sans-serif;margin:16px}.print-qr{display:inline-block;width:200px;margin:8px;text-align:center;page-break-inside:avoid}' +
      '.print-qr img{width:180px;height:180px}.print-qr-name{font-weight:600;font-size:13px}.print-qr-id{font-size:12px;color:#555}</style>' +
      '</head><body>' + cards + '</body></html>'
    );
    w.document.close();
    w.focus();
    w.print();
  }

  /* ---------- render ---------- */

  function render() {
    if (!state.loaded) {
      rootEl.innerHTML = '<p class="empty loading">Memuat data...</p>';
      return;
    }
    var html = '';
    if (state.source === 'local' && window.Api && !window.Api.configured()) {
      html += '<div class="banner">Mode offline: server (Google Sheet) belum dikonfigurasi. Perubahan tidak tersimpan ke pusat.</div>';
    }
    if (state.error) {
      html += '<div class="banner warn">' + esc(state.error) + '</div>';
    }
    html += toolbar();
    if (state.active === 'qr') html += qrPanel();
    else if (state.active === 'spareparts') html += sparepartsPanel();
    else html += equipmentPanel();
    rootEl.innerHTML = html;
  }

  function renderWithFormFocus() {
    render();
    var form = rootEl.querySelector('#edit-form');
    if (form && form.scrollIntoView) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- validation ---------- */

  function duplicate(list, key, value, skipIndex) {
    return list.some(function (item, i) {
      return i !== skipIndex && String(item[key]).toLowerCase() === String(value).toLowerCase();
    });
  }

  function validateUnit(o, index) {
    if (!o.id_unit) return 'ID Unit wajib diisi.';
    if (!o.nama_unit) return 'Nama Unit wajib diisi.';
    if (index != null && index >= 0) {
      if (duplicate(state.equipment, 'id_unit', o.id_unit, index)) return 'ID Unit sudah dipakai.';
    } else if (duplicate(state.equipment, 'id_unit', o.id_unit, -1)) {
      return 'ID Unit sudah dipakai.';
    }
    return null;
  }

  /* ---------- actions ---------- */

  function startAdd() {
    state.active = 'equipment';
    state.editingIndex = -1;
    state.parts = [];
    state.editingPart = null;
    state.saveStatus = '';
    renderWithFormFocus();
  }

  function startEdit(index) {
    var u = state.equipment[index] || {};
    state.active = 'equipment';
    state.editingIndex = index;
    state.parts = JSON.parse(JSON.stringify(u.spareparts || []));
    state.editingPart = null;
    state.saveStatus = '';
    renderWithFormFocus();
  }

  function cancelEdit() {
    state.editingIndex = null;
    state.editingPart = null;
    state.parts = [];
    state.saveStatus = '';
    render();
  }

  function removeUnit(index) {
    var item = state.equipment[index];
    if (!item) return;
    var label = item.nama_unit || 'unit';
    Ui.confirm('Hapus "' + label + '" beserta seluruh sparepart-nya?').then(function (ok) {
      if (!ok) return;
      if (!window.Api || !window.Api.configured()) {
        state.equipment.splice(index, 1);
        cancelEdit();
        Ui.toast('Unit dihapus (mode lokal).', 'ok');
        return;
      }
      Ui.toast('Menghapus\u2026');
      window.Api.adminDeleteUnit(adminKey(), item.id_unit).then(function () {
        state.equipment.splice(index, 1);
        cancelEdit();
        Ui.toast('Unit dihapus.', 'ok');
      }).catch(function (err) {
        Ui.toast('Gagal menghapus: ' + ((err && err.message) || err), 'err');
      });
    });
  }

  function persist(unit) {
    if (window.Api && window.Api.configured()) {
      return window.Api.saveUnitAdmin(adminKey(), unit).catch(function (err) {
        Ui.toast('Gagal simpan ke server: ' + ((err && err.message) || err), 'err');
      });
    }
    return Promise.resolve();
  }

  function saveUnit(form) {
    var index = state.editingIndex;
    var data = C.readForm(form);
    data.spareparts = state.parts;
    var err = validateUnit(data, index);
    if (err) { Ui.alert(err); return; }
    if (index == null || index === -1) state.equipment.push(data);
    else state.equipment[index] = data;
    state.editingIndex = null;
    state.editingPart = null;
    state.parts = [];
    persist(data).then(function () {
      Ui.toast('Unit tersimpan.', 'ok');
    });
    render();
  }

  function savePart(form) {
    var p = C.readForm(form);
    if (!p.nama_part || !p.part_number) { Ui.alert('Nama Part & Part Number wajib diisi.'); return; }
    if (!p.id_part) p.id_part = 'P-' + Date.now().toString().slice(-6);
    if (state.editingPart === -1) state.parts.push(p);
    else state.parts[state.editingPart] = p;
    state.editingPart = null;
    persistParts();
  }

  function fillConvention(target, from) {
    var form = rootEl.querySelector('#edit-form');
    if (!form) return;
    var src = form.querySelector('[name="' + from + '"]');
    var dst = form.querySelector('[name="' + target + '"]');
    if (!src || !dst) return;
    var v = (src.value || '').trim();
    if (!v) { Ui.alert('Isi field ' + from + ' dulu.'); return; }
    dst.value = 'images/' + v + '.jpg';
    C.previewFromGambar(dst);
  }

  function applyBaseUrl() {
    var el = rootEl.querySelector('#qr-base');
    if (!el) return;
    saveBaseUrl(el.value.trim());
    render();
  }

  function updateUnitList() {
    var el = rootEl.querySelector('#unit-list');
    if (el) el.innerHTML = unitRowsHtml();
  }

  /* ---------- events ---------- */

  function onClick(e) {
    var t = e.target.closest('[data-add],[data-tab],[data-edit],[data-del],[data-fill],[data-cancel],[data-logout],[data-qr-apply],[data-qr-open],[data-qr-print],[data-focus-preset],[data-part-add],[data-part-edit],[data-part-del],[data-part-cancel]');
    if (!t) return;
    if (t.hasAttribute('data-add')) startAdd();
    else if (t.hasAttribute('data-tab')) { state.active = t.getAttribute('data-tab'); cancelEdit(); render(); }
    else if (t.hasAttribute('data-edit')) startEdit(Number(t.getAttribute('data-index')));
    else if (t.hasAttribute('data-del')) removeUnit(Number(t.getAttribute('data-index')));
    else if (t.hasAttribute('data-fill')) fillConvention(t.getAttribute('data-fill'), t.getAttribute('data-from'));
    else if (t.hasAttribute('data-qr-apply')) applyBaseUrl();
    else if (t.hasAttribute('data-qr-open')) window.open(t.getAttribute('data-qr-open'), '_blank');
    else if (t.hasAttribute('data-qr-print')) printAllQr();
    else if (t.hasAttribute('data-focus-preset')) C.setFocusPreset(t);
    else if (t.hasAttribute('data-part-add')) { state.editingPart = -1; renderParts(); }
    else if (t.hasAttribute('data-part-edit')) { state.editingPart = Number(t.getAttribute('data-idx')); renderParts(); }
    else if (t.hasAttribute('data-part-del')) {
      var i = Number(t.getAttribute('data-idx'));
      var p = state.parts[i];
      Ui.confirm('Hapus sparepart "' + ((p && p.nama_part) ? p.nama_part : '') + '"?').then(function (ok) {
        if (!ok) return;
        state.parts.splice(i, 1);
        state.editingPart = null;
        persistParts();
      });
    } else if (t.hasAttribute('data-part-cancel')) { state.editingPart = null; renderParts(); }
    else if (t.hasAttribute('data-logout')) { window.Auth.logout(); renderLogin(); }
    else if (t.hasAttribute('data-cancel')) cancelEdit();
  }

  function onSubmit(e) {
    var loginForm = e.target.closest('#login-form');
    if (loginForm) { e.preventDefault(); doLogin(loginForm); return; }
    if (e.target && e.target.id === 'edit-form') { e.preventDefault(); saveUnit(e.target); return; }
    if (e.target && e.target.id === 'part-form') { e.preventDefault(); savePart(e.target); return; }
  }

  function onInput(e) {
    var el = e.target;
    if (!el) return;
    if (el.id === 'unit-search') {
      state.unitFilter = el.value;
      updateUnitList();
      return;
    }
    if (el.id === 'part-search') {
      state.partFilter = el.value;
      var list = rootEl.querySelector('#part-list');
      if (list) list.innerHTML = partListHtml(el.value);
      return;
    }
    if (el.getAttribute && el.getAttribute('data-focus')) {
      var form = el.closest('form');
      if (form) C.syncFocus(form);
      return;
    }
    if (el.name === 'gambar') C.previewFromGambar(el);
  }

  function onChange(e) {
    if (e.target && e.target.id === 'unit-sort') {
      state.unitSort = e.target.value;
      updateUnitList();
    }
  }

  function init() {
    rootEl = document.getElementById('editor');
    rootEl.addEventListener('click', onClick);
    rootEl.addEventListener('submit', onSubmit);
    rootEl.addEventListener('change', onChange);
    rootEl.addEventListener('input', onInput);

    if (!window.Auth.isLoggedIn()) {
      renderLogin();
    } else {
      startEditor();
    }
  }

  function renderLogin() {
    rootEl.innerHTML =
      '<section class="card empty-state login-card">' +
      '<div class="logo login-logo">AB</div>' +
      '<h1>Editor Data</h1>' +
      '<p class="muted">Masuk untuk mengelola data alat berat.</p>' +
      '<form id="login-form" class="login-form">' +
      '<div class="field"><label>ID</label><input type="text" name="user" autocomplete="username"></div>' +
      '<div class="field"><label>Password</label><input type="password" name="pass" autocomplete="current-password"></div>' +
      '<div class="form-actions"><button type="submit" class="btn">Masuk</button></div>' +
      '</form>' +
      '</section>';
    window.Auth.applyNav();
  }

  function doLogin(form) {
    var fd = new FormData(form);
    if (window.Auth.login(fd.get('user'), fd.get('pass'))) {
      startEditor();
    } else {
      Ui.alert('ID atau Password salah.');
    }
  }

  function startEditor() {
    state.loaded = false;
    render();
    loadData().then(function () {
      state.loaded = true;
      render();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
