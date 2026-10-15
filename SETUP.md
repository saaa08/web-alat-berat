# Setup "Buku Pusat" (Google Sheet + Apps Script)

Panduan sekali saja untuk mengaktifkan penyimpanan bersama. Tanpa ini, web tetap
bisa dibaca (memakai snapshot `data/equipment.json`), tapi edit dari HP tidak tersimpan.

## 1. Buat Google Sheet
1. Buka https://sheets.new
2. Beri nama misalnya `Buku Alat Berat`.

## 2. Pasang Apps Script
1. Di Sheet, menu **Extensions → Apps Script**.
2. Hapus isi `Code.gs` bawaan, tempel seluruh isi `apps-script/Code.gs` dari repo ini.
3. Simpan (Ctrl+S).

## 3. Buat header tabel
1. Di editor Apps Script, pilih fungsi **setupSheets** di dropdown, klik **Run**.
2. Izinkan akses saat diminta (Review permissions → pilih akun → Advanced → Go to … → Allow).
3. Kembali ke Sheet: akan muncul dua tab:
   - `equipment` (1 baris per unit)
   - `spareparts` (1 baris per sparepart, kolom `id_unit` menautkan ke unitnya)

## 4. (Opsional) Isi data awal
- Salin isi `data/equipment.json` ke tab `equipment` (kolom sesuai header) dan
  sparepart ke tab `spareparts`. Kolom `fokus_*` diisi angka (default x=50, y=50, zoom=1, rotate=0).
- Atau biarkan kosong dan isi lewat editor admin. Setelah data masuk, segarkan
  snapshot offline dengan menjalankan `node tools/snapshot.js` (menggantikan tombol
  Export lama) agar `data/equipment.json` sama dengan isi Sheet.

## 5. Deploy jadi Web App
1. Klik **Deploy → New deployment**.
2. Pilih tipe **Web app**.
3. **Execute as**: `Me`.
4. **Who has access**: `Anyone`.
5. Klik **Deploy**, salin **Web app URL** (berakhiran `/exec`).

## 6. Tempel URL ke web
1. Buka `js/api.js`, bagian **KONFIGURASI** di paling atas.
2. Isi:
   ```js
   var API_BASE = 'https://script.google.com/macros/s/XXXXXXXX/exec';
   ```
3. Simpan. Selesai — buka web, refresh.

> Setiap kali mengubah `Code.gs`, lakukan **Deploy → Manage deployments → Edit (pensil) → Version: New version → Deploy** agar perubahan aktif.

## Keamanan (seadanya)
- `OPERATOR_PIN` (`28101928`) dan `ADMIN_KEY` ada **di dalam Apps Script**, bukan di frontend.
- PIN hanya penjaga "anti iseng", bukan keamanan sungguhan. Siapa pun yang tahu PIN bisa mengedit.
- Ganti PIN/ADMIN_KEY kapan saja di `Code.gs` lalu deploy versi baru.

## Peran pengguna
- **Publik**: melihat daftar unit, sparepart, dan QR (tanpa PIN).
- **Operator** (PIN): hanya memperbarui jam operasi, kondisi, lokasi unit, dan data
  servis sparepart (stok, satuan, interval, terakhir ganti, HM, catatan). Tidak bisa
  menambah/menghapus unit atau sparepart. Divalidasi di server.
- **Admin** (ID + password): CRUD penuh unit & sparepart, hapus unit, dan cetak QR massal.

## Troubleshooting
- **Edit tidak tersimpan**: pastikan `API_BASE` benar, Web App di-deploy "Anyone", dan deploy versi terbaru.
- **Data lama tidak muncul di HP lain**: pastikan sudah melunasi langkah 4 (isi Sheet) — web mengambil dari Sheet, bukan dari `data/equipment.json` saat `API_BASE` terisi.
- **CORS error**: pastikan `js/api.js` mengirim POST sebagai `text/plain` (sudah default).
