#!/usr/bin/env node
/*
 * snapshot.js — Segarkan snapshot offline data/equipment.json dari server.
 *
 * Menggantikan tombol "Export equipment.json" yang dulu ada di editor.
 * Ambil data langsung dari Apps Script (?action=data), lalu tulis ke
 * data/equipment.json dengan format stabil:
 *   - UTF-8 tanpa BOM
 *   - akhir baris LF
 *   - diakhiri satu newline
 *   - JSON.stringify(data, null, 2)
 *
 * Pakai:
 *   node tools/snapshot.js
 *   node tools/snapshot.js "https://script.google.com/macros/s/AKfy.../exec"
 *   node tools/snapshot.js "AKfy...deploymentId..."
 *
 * Bila argumen kosong, base URL dibaca dari js/api.js (var API_BASE).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'equipment.json');
const API_JS = path.join(ROOT, 'js', 'api.js');

function normalizeBase(value) {
  const v = String(value == null ? '' : value).trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[A-Za-z0-9_-]{20,}$/.test(v)) {
    return 'https://script.google.com/macros/s/' + v + '/exec';
  }
  return v;
}

function readBaseFromApiJs() {
  const src = fs.readFileSync(API_JS, 'utf8');
  const m = src.match(/var\s+API_BASE\s*=\s*'([^']*)'/);
  return m ? normalizeBase(m[1]) : '';
}

async function main() {
  const arg = process.argv[2];
  const base = normalizeBase(arg) || readBaseFromApiJs();
  if (!/^https?:\/\//i.test(base)) {
    console.error('Base URL API tidak ditemukan. Beri argumen URL /exec.');
    process.exit(1);
  }

  const url = base + '?action=data';
  console.log('Mengambil data dari: ' + url);

  const res = await fetch(url);
  if (!res.ok) {
    console.error('HTTP ' + res.status + ' ' + url);
    process.exit(1);
  }
  const json = await res.json();
  if (!json || !Array.isArray(json.equipment)) {
    console.error('Format data tidak dikenal (butuh { equipment: [...] }).');
    process.exit(1);
  }

  const text = JSON.stringify(json.equipment, null, 2) + '\n';
  fs.writeFileSync(OUT, text, { encoding: 'utf8' });

  const units = json.equipment.length;
  const parts = json.equipment.reduce((n, u) => n + ((u.spareparts || []).length), 0);
  console.log('Tersimpan: ' + OUT);
  console.log('Ringkasan: ' + units + ' unit, ' + parts + ' sparepart.');
}

main().catch((err) => {
  console.error('Gagal: ' + ((err && err.message) || err));
  process.exit(1);
});
