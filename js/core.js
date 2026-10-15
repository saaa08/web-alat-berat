(function (global) {
  'use strict';

  var U = global.Utils;

  /* ================= ENUM ================= */

  var KATEGORI_UNIT = ['ALAT ANGKUT BERAT', 'ALAT GALI', 'ALAT ANGKAT', 'ALAT MUAT', 'ATTACHMENT ALAT BERAT', 'CONCRETE PUMP', 'PLATFORM KERJA', 'KENDARAAN ANGKUT', 'Lainnya'];
  var STATUS_UNIT = ['Baik', 'Baru → Baik', 'Bekas → Baik', 'Aktif', 'Perawatan', 'Standby', 'Rusak'];
  var KATEGORI_PART = ['Filter', 'Oli & Pelumas', 'Belt', 'Elektrikal', 'Hidrolik', 'Fastener', 'Lainnya'];
  var SATUAN = ['pcs', 'liter', 'set', 'unit', 'meter', 'roll', 'box', 'lainnya'];
  var NUMERIC = ['tahun', 'jam_operasi', 'berat_operasi', 'nilai_perolehan', 'harga_estimasi', 'stok', 'hm_terakhir'];

  /* Field yang boleh diubah operator (selain admin). Dipakai form & backend. */
  var OPERATOR_UNIT_FIELDS = ['status', 'kondisi', 'lokasi', 'jam_operasi'];
  var OPERATOR_PART_FIELDS = ['stok', 'satuan', 'terakhir_ganti', 'hm_terakhir', 'catatan', 'interval_service'];

  /* ================= HELPERS ================= */

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

  function input(name, value, opts) {
    opts = opts || {};
    return '<input type="text" name="' + name + '" value="' + esc(value == null ? '' : value) +
      '" autocomplete="off"' + (opts.readonly ? ' readonly' : '') + '>';
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

  function select(name, list, selected) {
    return '<select name="' + name + '">' + options(list, selected) + '</select>';
  }

  /* ================= FOCUS / IMAGE ================= */

  function focusOf(item) {
    var f = (item && item.fokus_gambar) || {};
    return {
      x: clampNum(f.x, 0, 100, 50),
      y: clampNum(f.y, 0, 100, 50),
      zoom: clampNum(f.zoom, 1, 2, 1)
    };
  }

  function clampNum(v, min, max, dflt) {
    var n = Number(v);
    if (isNaN(n)) return dflt;
    return Math.max(min, Math.min(max, n));
  }

  function imageSrc(item) {
    return (item && item.gambar) ? item.gambar : 'images/placeholder.jpg';
  }

  function gambarStyle(item) {
    var f = focusOf(item);
    var pos = f.x + '% ' + f.y + '%';
    var style = 'object-position:' + pos + ';';
    if (f.zoom !== 1) {
      style += 'transform:scale(' + f.zoom + ');transform-origin:' + pos + ';';
    }
    return style;
  }

  function imageTag(item, className, alt) {
    var src = imageSrc(item);
    var label = alt || (item && (item.nama_unit || item.nama_part)) || 'Gambar';
    return (
      '<span class="img-box ' + className + '-box">' +
      '<img class="' + className + '" src="' + esc(src) + '" style="' + esc(gambarStyle(item)) +
      '" alt="' + esc(label) + '" loading="lazy" ' +
      'onerror="this.onerror=null;this.src=\'images/placeholder.jpg\';" />' +
      '</span>'
    );
  }

  var PRESETS = [
    ['50,50', 'Tengah'],
    ['50,15', 'Atas'],
    ['50,85', 'Bawah'],
    ['15,50', 'Kiri'],
    ['85,50', 'Kanan']
  ];

  function focusControl(item) {
    var f = focusOf(item);
    var src = imageSrc(item);
    var presets = PRESETS.map(function (p) {
      return '<button type="button" class="focus-preset" data-focus-preset="' + p[0] + '">' + p[1] + '</button>';
    }).join('');
    return (
      '<div class="focus-control">' +
      '<div class="focus-preview" data-focus-stage>' +
      '<img class="focus-preview-img" src="' + esc(src) + '" alt="Pratinjau fokus" draggable="false" ' +
      'style="object-position:' + f.x + '% ' + f.y + '%;transform:scale(' + f.zoom + ');transform-origin:' + f.x + '% ' + f.y + '%;" ' +
      'onerror="this.onerror=null;this.src=\'images/placeholder.jpg\';" />' +
      '<span class="focus-badge">Pratinjau</span>' +
      '</div>' +
      '<div class="focus-panel">' +
      '<div class="focus-presets">' + presets + '</div>' +
      '<label class="focus-row"><span>Zoom</span>' +
      '<input type="range" min="1" max="2" step="0.05" name="fokus_zoom" value="' + f.zoom + '" data-focus="zoom">' +
      '<span class="focus-val" data-focus-val="zoom">' + Math.round(f.zoom * 100) + '%</span></label>' +
      '<input type="hidden" name="fokus_x" value="' + f.x + '" data-focus="x">' +
      '<input type="hidden" name="fokus_y" value="' + f.y + '" data-focus="y">' +
      '<span class="hint">Pilih titik fokus &amp; zoom agar bagian penting foto tidak terpotong.</span>' +
      '</div>' +
      '</div>'
    );
  }

  function focusFormOf(el) {
    return el && el.closest ? el.closest('form') : null;
  }

  function syncFocus(form) {
    if (!form) return;
    var img = form.querySelector('.focus-preview-img');
    if (!img) return;
    var xEl = form.querySelector('[name="fokus_x"]');
    var yEl = form.querySelector('[name="fokus_y"]');
    var zEl = form.querySelector('[name="fokus_zoom"]');
    var x = xEl ? Number(xEl.value) : 50;
    var y = yEl ? Number(yEl.value) : 50;
    var z = zEl ? Number(zEl.value) : 1;
    var pos = x + '% ' + y + '%';
    img.style.objectPosition = pos;
    img.style.transformOrigin = pos;
    img.style.transform = 'scale(' + z + ')';
    var val = form.querySelector('[data-focus-val="zoom"]');
    if (val) val.textContent = Math.round(z * 100) + '%';
  }

  function setFocusPreset(btn) {
    var form = focusFormOf(btn);
    if (!form) return;
    var pair = (btn.getAttribute('data-focus-preset') || '50,50').split(',');
    var xEl = form.querySelector('[name="fokus_x"]');
    var yEl = form.querySelector('[name="fokus_y"]');
    if (xEl) xEl.value = pair[0];
    if (yEl) yEl.value = pair[1];
    syncFocus(form);
  }

  function previewFromGambar(inputEl) {
    var form = focusFormOf(inputEl);
    if (!form) return;
    var img = form.querySelector('.focus-preview-img');
    if (img) img.src = inputEl.value.trim() || 'images/placeholder.jpg';
  }

  /* ================= FORM READ ================= */

  function readForm(form) {
    var fd = new FormData(form);
    var o = {};
    fd.forEach(function (v, k) {
      o[k] = typeof v === 'string' ? v.trim() : v;
    });
    NUMERIC.forEach(function (key) {
      if (key in o) o[key] = o[key] === '' ? null : Number(o[key]);
    });
    if ('fokus_x' in o || 'fokus_y' in o) {
      var fx = Number(o.fokus_x);
      var fy = Number(o.fokus_y);
      var fz = Number(o.fokus_zoom);
      o.fokus_gambar = {
        x: Math.max(0, Math.min(100, isNaN(fx) ? 50 : fx)),
        y: Math.max(0, Math.min(100, isNaN(fy) ? 50 : fy)),
        zoom: Math.max(1, Math.min(2, isNaN(fz) || !fz ? 1 : fz)),
        rotate: 0
      };
      delete o.fokus_x;
      delete o.fokus_y;
      delete o.fokus_zoom;
    }
    return o;
  }

  function pick(obj, keys) {
    var out = {};
    keys.forEach(function (k) { if (k in obj) out[k] = obj[k]; });
    return out;
  }

  /* ================= DISPLAY ================= */

  function stokText(part) {
    if (part.stok == null || part.stok === '') return '-';
    return U.formatNumber(part.stok) + (part.satuan ? ' ' + part.satuan : '');
  }

  function makeQrDataUrl(url, cell, margin) {
    cell = cell || 6;
    margin = margin == null ? 2 : margin;
    var qr = global.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
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

  global.Core = {
    KATEGORI_UNIT: KATEGORI_UNIT,
    STATUS_UNIT: STATUS_UNIT,
    KATEGORI_PART: KATEGORI_PART,
    SATUAN: SATUAN,
    NUMERIC: NUMERIC,
    OPERATOR_UNIT_FIELDS: OPERATOR_UNIT_FIELDS,
    OPERATOR_PART_FIELDS: OPERATOR_PART_FIELDS,

    esc: esc,
    field: field,
    input: input,
    numberInput: numberInput,
    dateInput: dateInput,
    textarea: textarea,
    options: options,
    select: select,

    focusOf: focusOf,
    imageSrc: imageSrc,
    gambarStyle: gambarStyle,
    imageTag: imageTag,
    focusControl: focusControl,
    syncFocus: syncFocus,
    setFocusPreset: setFocusPreset,
    previewFromGambar: previewFromGambar,

    readForm: readForm,
    pick: pick,
    stokText: stokText,
    makeQrDataUrl: makeQrDataUrl
  };
})(window);
