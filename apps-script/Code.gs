/**
 * Web Alat Berat - Apps Script Web App
 * "Buku pusat" data alat berat, sparepart per-unit, berbasis Google Sheet.
 *
 * Cara pakai singkat (lihat SETUP.md):
 * 1. Buat Google Sheet baru.
 * 2. Extensions > Apps Script, tempel file ini.
 * 3. Jalankan fungsi setupSheets() sekali untuk membuat header.
 * 4. Deploy > New deployment > Web app:
 *      Execute as: Me
 *      Who has access: Anyone
 * 5. Salin URL /exec ke API_BASE di js/api.js.
 */

/* ====== PENGATURAN ====== */
var OPERATOR_PIN = '28101928';   // PIN operator (diverifikasi di sini, tidak di frontend)
var ADMIN_KEY = 'AdminGanteng';  // Kunci tulis untuk editor admin

var EQUIPMENT_SHEET = 'equipment';
var SPAREPARTS_SHEET = 'spareparts';

var EQUIPMENT_HEADERS = [
  'id_unit', 'nama_unit', 'kategori', 'merek', 'model', 'nomor_seri', 'tahun',
  'lokasi', 'jam_operasi', 'berat_operasi', 'status', 'kondisi', 'jumlah',
  'nilai_perolehan', 'surat_pajak', 'nota', 'gambar', 'keterangan', 'partisipan',
  'fokus_x', 'fokus_y', 'fokus_zoom', 'fokus_rotate'
];

var SPAREPARTS_HEADERS = [
  'id_unit', 'id_part', 'nama_part', 'part_number', 'kategori', 'merek_part',
  'harga_estimasi', 'stok', 'satuan', 'gambar', 'interval_service',
  'terakhir_ganti', 'hm_terakhir', 'catatan',
  'fokus_x', 'fokus_y', 'fokus_zoom', 'fokus_rotate'
];

var NUM_FIELDS = ['tahun', 'jam_operasi', 'berat_operasi', 'nilai_perolehan', 'harga_estimasi', 'stok', 'hm_terakhir'];
var FOCUS_FIELDS = ['fokus_x', 'fokus_y', 'fokus_zoom', 'fokus_rotate'];

/* Field yang boleh diubah operator (di luar admin). Divalidasi di server. */
var OPERATOR_UNIT_FIELDS = ['lokasi', 'jam_operasi', 'status', 'kondisi'];
var OPERATOR_PART_FIELDS = ['stok', 'satuan', 'terakhir_ganti', 'hm_terakhir', 'catatan', 'interval_service'];

/* ====== SETUP ====== */
function setupSheets() {
  ensureSheet(EQUIPMENT_SHEET, EQUIPMENT_HEADERS);
  ensureSheet(SPAREPARTS_SHEET, SPAREPARTS_HEADERS);
  SpreadsheetApp.getActiveSpreadsheet().toast('Header siap: ' + EQUIPMENT_SHEET + ', ' + SPAREPARTS_SHEET);
}

function ensureSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var first = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  var needs = false;
  for (var i = 0; i < headers.length; i++) { if (first[i] !== headers[i]) { needs = true; break; } }
  if (needs) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
}

/* ====== HTTP ====== */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'data';
  if (action === 'data') {
    return json({ ok: true, equipment: getAllEquipment() });
  }
  return json({ ok: false, error: 'Aksi tidak dikenal: ' + action });
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json({ ok: false, error: 'Body bukan JSON valid.' }); }

  var action = body.action;
  if (action === 'verify') {
    return json(body.pin === OPERATOR_PIN ? { ok: true } : { ok: false, error: 'PIN salah.' });
  }
  if (action === 'saveUnit') {
    if (body.pin !== OPERATOR_PIN) return json({ ok: false, error: 'PIN salah.' });
    return json(saveUnit(body.unit));
  }
  if (action === 'savePart') {
    if (body.pin !== OPERATOR_PIN) return json({ ok: false, error: 'PIN salah.' });
    return json(savePart(body.id_unit, body.part));
  }
  if (action === 'deletePart') {
    if (body.pin !== OPERATOR_PIN) return json({ ok: false, error: 'PIN salah.' });
    return json(deletePart(body.id_unit, body.id_part));
  }
  if (action === 'saveUnitAdmin') {
    if (body.key !== ADMIN_KEY) return json({ ok: false, error: 'Kunci admin salah.' });
    return json(saveUnit(body.unit));
  }
  if (action === 'deleteUnit') {
    if (body.key !== ADMIN_KEY) return json({ ok: false, error: 'Kunci admin salah.' });
    return json(deleteUnit(body.id_unit));
  }
  if (action === 'updateUnitFields') {
    if (body.pin !== OPERATOR_PIN) return json({ ok: false, error: 'PIN salah.' });
    return json(updateUnitFields(body.id_unit, body.fields));
  }
  if (action === 'updatePart') {
    if (body.pin !== OPERATOR_PIN) return json({ ok: false, error: 'PIN salah.' });
    return json(updatePart(body.id_unit, body.id_part, body.fields));
  }
  return json({ ok: false, error: 'Aksi tidak dikenal: ' + action });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ====== READ ====== */
function getAllEquipment() {
  var units = readTable(EQUIPMENT_SHEET, EQUIPMENT_HEADERS);
  var parts = readTable(SPAREPARTS_SHEET, SPAREPARTS_HEADERS);
  var byUnit = {};
  parts.forEach(function (p) {
    var id = String(p.id_unit);
    if (!byUnit[id]) byUnit[id] = [];
    byUnit[id].push(sparepartFromRow(p));
  });
  return units.map(function (u) {
    var unit = equipmentFromRow(u);
    unit.spareparts = byUnit[String(unit.id_unit)] || [];
    return unit;
  });
}

function equipmentFromRow(row) {
  var o = {};
  EQUIPMENT_HEADERS.forEach(function (h) {
    if (FOCUS_FIELDS.indexOf(h) !== -1) return;
    o[h] = coerce(h, row[h]);
  });
  o.fokus_gambar = focusFromRow(row);
  return o;
}

function sparepartFromRow(row) {
  var o = {};
  SPAREPARTS_HEADERS.forEach(function (h) {
    if (h === 'id_unit' || FOCUS_FIELDS.indexOf(h) !== -1) return;
    o[h] = coerce(h, row[h]);
  });
  o.fokus_gambar = focusFromRow(row);
  return o;
}

function focusFromRow(row) {
  function n(v, d) { v = Number(v); return isNaN(v) ? d : v; }
  return { x: n(row.fokus_x, 50), y: n(row.fokus_y, 50), zoom: n(row.fokus_zoom, 1), rotate: n(row.fokus_rotate, 0) };
}

function coerce(h, v) {
  if (NUM_FIELDS.indexOf(h) !== -1) {
    if (v === '' || v === null || v === undefined) return null;
    var n = Number(v);
    return isNaN(n) ? null : n;
  }
  return v === null || v === undefined ? '' : String(v);
}

/* ====== WRITE ====== */
function saveUnit(unit) {
  if (!unit || !unit.id_unit) return { ok: false, error: 'Unit tanpa id_unit.' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    upsertEquipment(unit);
    replaceUnitParts(unit.id_unit, unit.spareparts || []);
    SpreadsheetApp.flush();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    lock.releaseLock();
  }
}

function upsertEquipment(unit) {
  var sh = getSheet(EQUIPMENT_SHEET, EQUIPMENT_HEADERS);
  var row = equipmentToRow(unit);
  var idCol = EQUIPMENT_HEADERS.indexOf('id_unit') + 1;
  var last = sh.getLastRow();
  var id = String(unit.id_unit);
  for (var r = 2; r <= last; r++) {
    if (String(sh.getRange(r, idCol).getValue()) === id) {
      sh.getRange(r, 1, 1, row.length).setValues([row]);
      return;
    }
  }
  sh.appendRow(row);
}

function replaceUnitParts(id_unit, parts) {
  var sh = getSheet(SPAREPARTS_SHEET, SPAREPARTS_HEADERS);
  var idCol = SPAREPARTS_HEADERS.indexOf('id_unit') + 1;
  var values = sh.getDataRange().getValues();
  for (var r = values.length - 1; r >= 1; r--) {
    if (String(values[r][idCol - 1]) === String(id_unit)) sh.deleteRow(r + 1);
  }
  parts.forEach(function (p) {
    sh.appendRow(sparepartToRow(id_unit, p));
  });
}

function savePart(id_unit, part) {
  if (!id_unit || !part || !part.id_part) return { ok: false, error: 'Data part tidak lengkap.' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet(SPAREPARTS_SHEET, SPAREPARTS_HEADERS);
    var idUnitCol = SPAREPARTS_HEADERS.indexOf('id_unit') + 1;
    var idPartCol = SPAREPARTS_HEADERS.indexOf('id_part') + 1;
    var values = sh.getDataRange().getValues();
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][idUnitCol - 1]) === String(id_unit) && String(values[r][idPartCol - 1]) === String(part.id_part)) {
        sh.getRange(r + 1, 1, 1, SPAREPARTS_HEADERS.length).setValues([sparepartToRow(id_unit, part)]);
        SpreadsheetApp.flush();
        return { ok: true };
      }
    }
    sh.appendRow(sparepartToRow(id_unit, part));
    SpreadsheetApp.flush();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    lock.releaseLock();
  }
}

function deletePart(id_unit, id_part) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet(SPAREPARTS_SHEET, SPAREPARTS_HEADERS);
    var idUnitCol = SPAREPARTS_HEADERS.indexOf('id_unit') + 1;
    var idPartCol = SPAREPARTS_HEADERS.indexOf('id_part') + 1;
    var values = sh.getDataRange().getValues();
    for (var r = values.length - 1; r >= 1; r--) {
      if (String(values[r][idUnitCol - 1]) === String(id_unit) && String(values[r][idPartCol - 1]) === String(id_part)) {
        sh.deleteRow(r + 1);
      }
    }
    SpreadsheetApp.flush();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    lock.releaseLock();
  }
}

/* ====== OPERATOR & DELETE (whitelist) ====== */
function findRow(sh, col, value) {
  var last = sh.getLastRow();
  for (var r = 2; r <= last; r++) {
    if (String(sh.getRange(r, col).getValue()) === String(value)) return r;
  }
  return -1;
}

function normalizeField(h, v) {
  if (NUM_FIELDS.indexOf(h) !== -1) {
    if (v === '' || v === null || v === undefined) return '';
    var n = Number(v);
    return isNaN(n) ? '' : n;
  }
  return v === null || v === undefined ? '' : String(v);
}

// Operator: ubah hanya field operasional unit.
function updateUnitFields(id_unit, fields) {
  if (!id_unit) return { ok: false, error: 'Unit tanpa id_unit.' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet(EQUIPMENT_SHEET, EQUIPMENT_HEADERS);
    var idCol = EQUIPMENT_HEADERS.indexOf('id_unit') + 1;
    var r = findRow(sh, idCol, id_unit);
    if (r < 0) return { ok: false, error: 'Unit tidak ditemukan.' };
    fields = fields || {};
    OPERATOR_UNIT_FIELDS.forEach(function (h) {
      if (!(h in fields)) return;
      var c = EQUIPMENT_HEADERS.indexOf(h) + 1;
      if (c < 1) return;
      sh.getRange(r, c).setValue(normalizeField(h, fields[h]));
    });
    SpreadsheetApp.flush();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    lock.releaseLock();
  }
}

// Operator: ubah hanya field servis satu sparepart.
function updatePart(id_unit, id_part, fields) {
  if (!id_unit || !id_part) return { ok: false, error: 'Data part tidak lengkap.' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet(SPAREPARTS_SHEET, SPAREPARTS_HEADERS);
    var idUnitCol = SPAREPARTS_HEADERS.indexOf('id_unit') + 1;
    var idPartCol = SPAREPARTS_HEADERS.indexOf('id_part') + 1;
    var values = sh.getDataRange().getValues();
    var found = -1;
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][idUnitCol - 1]) === String(id_unit) && String(values[r][idPartCol - 1]) === String(id_part)) {
        found = r + 1;
        break;
      }
    }
    if (found < 0) return { ok: false, error: 'Sparepart tidak ditemukan.' };
    fields = fields || {};
    OPERATOR_PART_FIELDS.forEach(function (h) {
      if (!(h in fields)) return;
      var c = SPAREPARTS_HEADERS.indexOf(h) + 1;
      if (c < 1) return;
      sh.getRange(found, c).setValue(normalizeField(h, fields[h]));
    });
    SpreadsheetApp.flush();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    lock.releaseLock();
  }
}

// Admin: hapus unit beserta seluruh sparepart-nya.
function deleteUnit(id_unit) {
  if (!id_unit) return { ok: false, error: 'Unit tanpa id_unit.' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet(EQUIPMENT_SHEET, EQUIPMENT_HEADERS);
    var idCol = EQUIPMENT_HEADERS.indexOf('id_unit') + 1;
    var r = findRow(sh, idCol, id_unit);
    if (r < 0) return { ok: false, error: 'Unit tidak ditemukan.' };
    sh.deleteRow(r);
    replaceUnitParts(id_unit, []);
    SpreadsheetApp.flush();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    lock.releaseLock();
  }
}

/* ====== ROW MAPPING ====== */
function equipmentToRow(unit) {
  var f = unit.fokus_gambar || {};
  var flat = {
    fokus_x: f.x == null ? 50 : f.x,
    fokus_y: f.y == null ? 50 : f.y,
    fokus_zoom: f.zoom == null ? 1 : f.zoom,
    fokus_rotate: f.rotate == null ? 0 : f.rotate
  };
  return EQUIPMENT_HEADERS.map(function (h) {
    return flat[h] !== undefined ? flat[h] : (unit[h] == null ? '' : unit[h]);
  });
}

function sparepartToRow(id_unit, part) {
  var f = part.fokus_gambar || {};
  var flat = {
    fokus_x: f.x == null ? 50 : f.x,
    fokus_y: f.y == null ? 50 : f.y,
    fokus_zoom: f.zoom == null ? 1 : f.zoom,
    fokus_rotate: f.rotate == null ? 0 : f.rotate
  };
  return SPAREPARTS_HEADERS.map(function (h) {
    if (h === 'id_unit') return id_unit;
    return flat[h] !== undefined ? flat[h] : (part[h] == null ? '' : part[h]);
  });
}

/* ====== SHEET HELPERS ====== */
function getSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readTable(name, headers) {
  var sh = getSheet(name, headers);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var head = values[0];
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var obj = {};
    var empty = true;
    for (var c = 0; c < head.length; c++) {
      var h = String(head[c]).trim();
      if (!h) continue;
      obj[h] = values[r][c];
      if (values[r][c] !== '' && values[r][c] !== null) empty = false;
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}
