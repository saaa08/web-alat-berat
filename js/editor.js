(function () {
  'use strict';

  var U = window.Utils;
  var DRAFT_KEY = 'sparepart-editor-draft-v1';
  var BASE_KEY = 'alatberat-qr-base-url';

  var KATEGORI_UNIT = ['Excavator', 'Bulldozer', 'Forklift', 'Dump Truck', 'Wheel Loader', 'Motor Grader', 'Crane', 'Lainnya'];
  var STATUS_UNIT = ['Aktif', 'Perawatan', 'Standby', 'Rusak'];
  var KATEGORI_PART = ['Filter', 'Oli & Pelumas', 'Belt', 'Elektrikal', 'Hidrolik', 'Fastener', 'Lainnya'];
  var SATUAN = ['pcs', 'liter', 'set', 'unit', 'meter', 'roll', 'box', 'lainnya'];

  var state = {
    equipment: [],
    spareparts: [],
    relations: [],
    active: 'equipment',
    editing: { type: null, index: null },
    usingDraft: false,
    error: null
  };

  var rootEl;

  /* ---------- helpers ---------- */

  function esc(v) {
    return U.escapeHtml(v);
  }

  function field(label, control, hint) {
    return (
      '<div class="field">' +
      '<label>' + esc(label) + '</label>' +
      control +
      (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') +
      '</div>'
    );
  }

  function input(name, value) {
    return '<input type="text" name="' + name + '" value="' + esc(value == null ? '' : value) + '" autocomplete="off">';
  }

  function numberInput(name, value) {
    return '<input type="number" name="' + name + '" value="' + esc(value == null ? '' : value) + '" inputmode="numeric">';
  }

  function dateInput(name, value) {
    return '<input type="date" name="' + name + '" value="' + esc(value == null ? '' : value) + '">';
  }

  function textarea(name, value) {
    return '<textarea name="' + name + '" rows="2">' + esc(value == null ? '' : value) + '</textarea>';
  }

  function options(list, selected) {
    return list.map(function (o) {
      return '<option value="' + esc(o) + '"' + (o === selected ? ' selected' : '') + '>' + esc(o) + '</option>';
    }).join('');
  }

  function selectInput(name, list, selected) {
    return '<select name="' + name + '">' + options(list, selected) + '</select>';
  }

  function selectObjects(name, list, selected) {
    return '<select name="' + name + '">' + list.map(function (o) {
      return '<option value="' + esc(o.v) + '"' + (o.v === selected ? ' selected' : '') + '>' + esc(o.t) + '</option>';
    }).join('') + '</select>';
  }

  function formActions() {
    return (
      '<div class="form-actions">' +
      '<button type="submit" class="btn-sm primary">Simpan</button>' +
      '<button type="button" class="btn-sm" data-cancel>Batal</button>' +
      '</div>'
    );
  }

  function unitById(id) {
    return state.equipment.filter(function (u) { return u.id_unit === id; })[0];
  }

  function partById(id) {
    return state.spareparts.filter(function (p) { return p.id_part === id; })[0];
  }

  /* ---------- persistence ---------- */

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        equipment: state.equipment,
        spareparts: state.spareparts,
        relations: state.relations
      }));
    } catch (e) { /* ignore */ }
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function loadFromFile() {
    function get(url) {
      return fetch(url).then(function (r) {
        if (!r.ok) throw new Error(url);
        return r.json();
      });
    }
    return Promise.all([
      get('data/equipment.json'),
      get('data/spareparts.json'),
      get('data/equipment_parts.json')
    ]).then(function (res) {
      state.equipment = res[0];
      state.spareparts = res[1];
      state.relations = res[2];
    });
  }

  function resetDraft() {
    if (!window.confirm('Buang draft lokal dan muat ulang dari file data?')) return;
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
    state.usingDraft = false;
    loadFromFile().then(render).catch(function () { render(); });
  }

  /* ---------- forms ---------- */

  function equipmentForm(u) {
    u = u || {};
    return (
      '<form id="edit-form" class="form">' +
      '<h3>' + (state.editing.index == null ? 'Tambah' : 'Edit') + ' Alat Berat</h3>' +
      '<div class="form-grid">' +
      field('ID Unit *', input('id_unit', u.id_unit), 'Contoh: EXV-001') +
      field('Nama Unit *', input('nama_unit', u.nama_unit), 'Contoh: Excavator Komatsu PC200') +
      field('Kategori', selectInput('kategori', KATEGORI_UNIT, u.kategori)) +
      field('Status', selectInput('status', STATUS_UNIT, u.status)) +
      field('Merek', input('merek', u.merek)) +
      field('Model', input('model', u.model)) +
      field('Nomor Seri', input('nomor_seri', u.nomor_seri)) +
      field('Tahun', numberInput('tahun', u.tahun)) +
      field('Lokasi', input('lokasi', u.lokasi)) +
      field('Jam Operasi (HM)', numberInput('jam_operasi', u.jam_operasi)) +
      field('Berat Operasi (kg)', numberInput('berat_operasi', u.berat_operasi)) +
      field(
        'Gambar',
        '<div class="input-with-btn">' + input('gambar', u.gambar) +
        '<button type="button" class="btn-sm" data-fill="gambar" data-from="id_unit">Otomatis</button></div>',
        'Kosongkan untuk placeholder. Foto ditaruh di folder images/.'
      ) +
      '</div>' +
      formActions() +
      '</form>'
    );
  }

  function sparepartForm(p) {
    p = p || {};
    return (
      '<form id="edit-form" class="form">' +
      '<h3>' + (state.editing.index == null ? 'Tambah' : 'Edit') + ' Sparepart</h3>' +
      '<div class="form-grid">' +
      field('ID Part *', input('id_part', p.id_part), 'Contoh: P-001') +
      field('Nama Part *', input('nama_part', p.nama_part)) +
      field('Part Number *', input('part_number', p.part_number), 'Kode unik agar tidak salah beli') +
      field('Kategori', selectInput('kategori', KATEGORI_PART, p.kategori)) +
      field('Merek Part', input('merek_part', p.merek_part)) +
      field('Estimasi Harga (Rp)', numberInput('harga_estimasi', p.harga_estimasi)) +
      field('Stok', numberInput('stok', p.stok)) +
      field('Satuan', selectInput('satuan', SATUAN, p.satuan)) +
      field(
        'Gambar',
        '<div class="input-with-btn">' + input('gambar', p.gambar) +
        '<button type="button" class="btn-sm" data-fill="gambar" data-from="part_number">Otomatis</button></div>',
        'Kosongkan untuk placeholder.'
      ) +
      '</div>' +
      formActions() +
      '</form>'
    );
  }

  function relationForm(rel) {
    rel = rel || {};
    var unitOpts = state.equipment.map(function (u) {
      return { v: u.id_unit, t: u.id_unit + ' - ' + u.nama_unit };
    });
    var partOpts = state.spareparts.map(function (p) {
      return { v: p.id_part, t: p.nama_part + ' (' + p.part_number + ')' };
    });
    var hasData = unitOpts.length && partOpts.length;
    return (
      '<form id="edit-form" class="form">' +
      '<h3>' + (state.editing.index == null ? 'Tambah' : 'Edit') + ' Relasi Part</h3>' +
      (hasData ? '' : '<p class="hint">Tambahkan minimal 1 alat berat dan 1 sparepart dulu.</p>') +
      '<div class="form-grid">' +
      field('Unit *', selectObjects('id_unit', unitOpts, rel.id_unit)) +
      field('Sparepart *', selectObjects('id_part', partOpts, rel.id_part)) +
      field('Interval Servis', input('interval_service', rel.interval_service), 'Contoh: Setiap 250 jam operasi') +
      field('Terakhir Ganti', dateInput('terakhir_ganti', rel.terakhir_ganti)) +
      field('HM Terakhir', numberInput('hm_terakhir', rel.hm_terakhir)) +
      field('Catatan', textarea('catatan', rel.catatan)) +
      '</div>' +
      (hasData ? formActions() : '<div class="form-actions"><button type="button" class="btn-sm" data-cancel>Tutup</button></div>') +
      '</form>'
    );
  }

  /* ---------- lists ---------- */

  function rowItem(title, sub, index, type, danger) {
    return (
      '<div class="row-item">' +
      '<div class="row-main"><div class="row-title">' + title + '</div><div class="row-sub">' + sub + '</div></div>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn-sm" data-edit="' + type + '" data-index="' + index + '">Edit</button>' +
      '<button type="button" class="btn-sm danger" data-del="' + type + '" data-index="' + index + '">Hapus</button>' +
      '</div>' +
      '</div>'
    );
  }

  function equipmentPanel() {
    var rows = state.equipment.length
      ? state.equipment.map(function (u, i) {
          var sub = '<span class="mono">' + esc(u.id_unit) + '</span> &middot; ' +
            esc(u.kategori || '-') + ' &middot; ' + esc(u.lokasi || '-');
          return rowItem(esc(u.nama_unit), sub, i, 'equipment');
        }).join('')
      : '<p class="empty">Belum ada data unit.</p>';
    var form = state.editing.type === 'equipment'
      ? equipmentForm(state.editing.index == null ? null : state.equipment[state.editing.index])
      : '';
    return (
      '<div class="panel-head"><h2>Alat Berat (' + state.equipment.length + ')</h2>' +
      '<button type="button" class="btn-sm primary" data-add="equipment">+ Tambah Unit</button></div>' +
      form + '<div class="rows">' + rows + '</div>'
    );
  }

  function sparepartsPanel() {
    var rows = state.spareparts.length
      ? state.spareparts.map(function (p, i) {
          var sub = '<span class="mono">' + esc(p.part_number) + '</span> &middot; ' +
            esc(p.kategori || '-') + ' &middot; ' + esc(U.formatRupiah(p.harga_estimasi)) +
            ' &middot; stok ' + esc(p.stok == null ? '-' : p.stok + ' ' + (p.satuan || ''));
          return rowItem(esc(p.nama_part), sub, i, 'spareparts');
        }).join('')
      : '<p class="empty">Belum ada data sparepart.</p>';
    var form = state.editing.type === 'spareparts'
      ? sparepartForm(state.editing.index == null ? null : state.spareparts[state.editing.index])
      : '';
    return (
      '<div class="panel-head"><h2>Sparepart (' + state.spareparts.length + ')</h2>' +
      '<button type="button" class="btn-sm primary" data-add="spareparts">+ Tambah Part</button></div>' +
      form + '<div class="rows">' + rows + '</div>'
    );
  }

  function relationsPanel() {
    var rows = state.relations.length
      ? state.relations.map(function (r, i) {
          var part = partById(r.id_part);
          var unit = unitById(r.id_unit);
          var title = esc(part ? part.nama_part : r.id_part);
          var sub = '<span class="mono">' + esc(r.id_unit) + '</span> &middot; ' +
            esc(unit ? unit.nama_unit : '-') +
            (part ? ' &middot; PN ' + esc(part.part_number) : '') +
            (r.interval_service ? ' &middot; ' + esc(r.interval_service) : '');
          return rowItem(title, sub, i, 'relations');
        }).join('')
      : '<p class="empty">Belum ada relasi unit-part.</p>';
    var form = state.editing.type === 'relations'
      ? relationForm(state.editing.index == null ? null : state.relations[state.editing.index])
      : '';
    return (
      '<div class="panel-head"><h2>Relasi Part (' + state.relations.length + ')</h2>' +
      '<button type="button" class="btn-sm primary" data-add="relations">+ Tambah Relasi</button></div>' +
      form + '<div class="rows">' + rows + '</div>'
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
      pill('relations', 'Relasi Part') +
      pill('qr', 'QR Unit') +
      '</div>'
    );
  }

  function actionsSection() {
    return (
      '<section class="editor-actions">' +
      '<h3>Export ke file JSON</h3>' +
      '<p class="hint">Unduh file, lalu timpa file dengan nama sama di folder <span class="mono">data/</span> pada repo GitHub.</p>' +
      '<div class="form-actions">' +
      '<button type="button" class="btn-sm primary" data-export="equipment">equipment.json</button>' +
      '<button type="button" class="btn-sm primary" data-export="spareparts">spareparts.json</button>' +
      '<button type="button" class="btn-sm primary" data-export="equipment_parts">equipment_parts.json</button>' +
      '</div>' +
      '<p class="hint">Draft kerjamu tersimpan otomatis di browser ini. ' +
      '<button type="button" class="link-btn" data-reset>Buang draft &amp; muat ulang dari file</button></p>' +
      '<label class="import-label">Pulihkan dari file JSON:' +
      '<input type="file" id="import-file" accept="application/json,.json" multiple>' +
      '</label>' +
      '<p class="hint">Selesai? <button type="button" class="link-btn" data-logout>Keluar</button></p>' +
      '</section>'
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
    try {
      localStorage.setItem(BASE_KEY, value);
    } catch (e) { /* ignore */ }
  }

  function makeQrObj(url) {
    var qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    return qr;
  }

  function qrPngDataURL(qr, cell, margin) {
    var count = qr.getModuleCount();
    var size = count * cell + margin * 2;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(c * cell + margin, r * cell + margin, cell, cell);
        }
      }
    }
    return canvas.toDataURL('image/png');
  }

  function qrPanel() {
    var base = getBaseUrl();
    var items = state.equipment.length
      ? state.equipment.map(function (u) {
          var url = base + '#/unit/' + encodeURIComponent(u.id_unit);
          var png = qrPngDataURL(makeQrObj(url), 10, 2);
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
      '<div class="panel-head"><h2>QR Code Unit (' + state.equipment.length + ')</h2></div>' +
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

  /* ---------- render ---------- */

  function render() {
    if (!state.loaded) {
      rootEl.innerHTML = '<p class="empty loading">Memuat data...</p>';
      return;
    }
    var html = '';
    if (state.usingDraft) {
      html += '<div class="banner">Draft lokal dimuat (belum di-export). <button type="button" class="link-btn" data-reset>Muat ulang dari file</button></div>';
    }
    if (state.error) {
      html += '<div class="banner warn">' + esc(state.error) + '</div>';
    }
    html += toolbar();
    if (state.active === 'equipment') html += equipmentPanel();
    else if (state.active === 'spareparts') html += sparepartsPanel();
    else if (state.active === 'qr') html += qrPanel();
    else html += relationsPanel();
    html += actionsSection();
    rootEl.innerHTML = html;
  }

  function renderWithFormFocus() {
    render();
    var form = rootEl.querySelector('#edit-form');
    if (form && form.scrollIntoView) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- form data ---------- */

  function readForm(form) {
    var fd = new FormData(form);
    var o = {};
    fd.forEach(function (v, k) {
      o[k] = typeof v === 'string' ? v.trim() : v;
    });
    ['tahun', 'jam_operasi', 'berat_operasi', 'harga_estimasi', 'stok', 'hm_terakhir'].forEach(function (key) {
      if (key in o) o[key] = o[key] === '' ? null : Number(o[key]);
    });
    return o;
  }

  function duplicate(list, key, value, skipIndex) {
    return list.some(function (item, i) {
      return i !== skipIndex && String(item[key]).toLowerCase() === String(value).toLowerCase();
    });
  }

  function validate(type, o, index) {
    if (type === 'equipment') {
      if (!o.id_unit) return 'ID Unit wajib diisi.';
      if (!o.nama_unit) return 'Nama Unit wajib diisi.';
      if (duplicate(state.equipment, 'id_unit', o.id_unit, index)) return 'ID Unit sudah dipakai.';
    } else if (type === 'spareparts') {
      if (!o.id_part) return 'ID Part wajib diisi.';
      if (!o.nama_part) return 'Nama Part wajib diisi.';
      if (!o.part_number) return 'Part Number wajib diisi.';
      if (duplicate(state.spareparts, 'id_part', o.id_part, index)) return 'ID Part sudah dipakai.';
    } else {
      if (!o.id_unit || !o.id_part) return 'Unit dan Sparepart wajib dipilih.';
      var clash = state.relations.some(function (r, i) {
        return i !== index && r.id_unit === o.id_unit && r.id_part === o.id_part;
      });
      if (clash) return 'Relasi unit-part ini sudah ada.';
    }
    return null;
  }

  /* ---------- actions ---------- */

  function startAdd(type) {
    state.editing = { type: type, index: null };
    renderWithFormFocus();
  }

  function startEdit(type, index) {
    state.editing = { type: type, index: index };
    renderWithFormFocus();
  }

  function remove(type, index) {
    var item = state[type][index];
    var label = item ? (item.nama_unit || item.nama_part || (item.id_unit + ' - ' + item.id_part)) : 'item';
    if (!window.confirm('Hapus "' + label + '"?')) return;
    state[type].splice(index, 1);
    if (state.editing.type === type) state.editing = { type: null, index: null };
    saveDraft();
    render();
  }

  function exportData(type) {
    var filename = type === 'relations' ? 'equipment_parts.json' : type + '.json';
    var blob = new Blob([JSON.stringify(state[type], null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    state.usingDraft = false;
    saveDraft();
    render();
  }

  function fillConvention(target, from) {
    var form = rootEl.querySelector('#edit-form');
    if (!form) return;
    var src = form.querySelector('[name="' + from + '"]');
    var dst = form.querySelector('[name="' + target + '"]');
    if (!src || !dst) return;
    var v = (src.value || '').trim();
    if (!v) { window.alert('Isi field ' + from + ' dulu.'); return; }
    dst.value = 'images/' + v + '.jpg';
  }

  function applyBaseUrl() {
    var el = rootEl.querySelector('#qr-base');
    if (!el) return;
    saveBaseUrl(el.value.trim());
    render();
  }

  function detectType(data) {
    if (!Array.isArray(data) || !data.length) return null;
    var a = data[0];
    if ('id_part' in a && 'nama_part' in a) return 'spareparts';
    if ('id_unit' in a && 'nama_unit' in a) return 'equipment';
    if ('id_unit' in a && 'id_part' in a) return 'relations';
    return null;
  }

  function importFiles(files) {
    var arr = Array.prototype.slice.call(files || []);
    if (!arr.length) return;
    Promise.all(arr.map(function (f) {
      return f.text().then(function (txt) { return { name: f.name, txt: txt }; });
    })).then(function (list) {
      var done = [];
      list.forEach(function (item) {
        try {
          var data = JSON.parse(item.txt);
          var type = detectType(data);
          if (type) {
            state[type] = data;
            done.push(item.name + ' -> ' + type);
          }
        } catch (e) { /* skip */ }
      });
      if (done.length) {
        state.usingDraft = true;
        saveDraft();
        render();
        window.alert('Berhasil impor:\n' + done.join('\n'));
      } else {
        window.alert('File JSON tidak dikenali.');
      }
    });
  }

  /* ---------- events ---------- */

  function onClick(e) {
    var t = e.target.closest('[data-add],[data-tab],[data-edit],[data-del],[data-export],[data-fill],[data-reset],[data-cancel],[data-logout],[data-qr-apply],[data-qr-open]');
    if (!t) return;
    if (t.hasAttribute('data-add')) startAdd(t.getAttribute('data-add'));
    else if (t.hasAttribute('data-tab')) { state.active = t.getAttribute('data-tab'); state.editing = { type: null, index: null }; render(); }
    else if (t.hasAttribute('data-edit')) startEdit(t.getAttribute('data-edit'), Number(t.getAttribute('data-index')));
    else if (t.hasAttribute('data-del')) remove(t.getAttribute('data-del'), Number(t.getAttribute('data-index')));
    else if (t.hasAttribute('data-export')) exportData(t.getAttribute('data-export'));
    else if (t.hasAttribute('data-fill')) fillConvention(t.getAttribute('data-fill'), t.getAttribute('data-from'));
    else if (t.hasAttribute('data-qr-apply')) applyBaseUrl();
    else if (t.hasAttribute('data-qr-open')) window.open(t.getAttribute('data-qr-open'), '_blank');
    else if (t.hasAttribute('data-reset')) resetDraft();
    else if (t.hasAttribute('data-logout')) { window.Auth.logout(); renderLogin(); }
    else if (t.hasAttribute('data-cancel')) { state.editing = { type: null, index: null }; render(); }
  }

  function onSubmit(e) {
    var loginForm = e.target.closest('#login-form');
    if (loginForm) { e.preventDefault(); doLogin(loginForm); return; }
    var form = e.target.closest('#edit-form');
    if (!form) return;
    e.preventDefault();
    var type = state.editing.type;
    var index = state.editing.index;
    var data = readForm(form);
    var err = validate(type, data, index);
    if (err) { window.alert(err); return; }
    if (index == null) state[type].push(data);
    else state[type][index] = data;
    state.editing = { type: null, index: null };
    state.usingDraft = true;
    saveDraft();
    render();
  }

  function onChange(e) {
    if (e.target && e.target.id === 'import-file') {
      importFiles(e.target.files);
      e.target.value = '';
    }
  }

  function init() {
    rootEl = document.getElementById('editor');
    rootEl.addEventListener('click', onClick);
    rootEl.addEventListener('submit', onSubmit);
    rootEl.addEventListener('change', onChange);

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
      window.alert('ID atau Password salah.');
    }
  }

  function startEditor() {
    state.loaded = false;
    render();
    loadFromFile()
      .catch(function () {
        state.error = 'Data file tidak termuat (pastikan dibuka lewat web server). Kamu tetap bisa mengisi manual lalu export.';
      })
      .then(function () {
        var draft = loadDraft();
        if (draft) {
          state.equipment = draft.equipment || [];
          state.spareparts = draft.spareparts || [];
          state.relations = draft.relations || [];
          state.usingDraft = true;
        }
        state.loaded = true;
        render();
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
