# THEWINNER — Website verifikasi Discord

Website bertema luar angkasa hitam. Member login dengan Discord → dicek → tercatat di **file Excel di laptop** lewat layanan kecil yang dilindungi kunci rahasia.

Ada **2 program** dalam 1 repo:

- **Website** = File #4 `server.js` → dijalankan dengan `npm start`
- **Layanan Excel** = File #5 `excel-service.js` → dijalankan di laptop dengan `npm run excel`

> Yang **harus kamu isi sendiri**: **Bagian 5** (nilai di `.env`). Selebihnya tinggal ikuti langkahnya berurutan.

## Peta cepat — cari berdasarkan nomor

| Bagian | Isinya | File |
|---|---|---|
| 1 | Yang harus disiapkan | – |
| 2 | Memasukkan kode ke GitHub + install | #1, #3 |
| 3 | Membuat aplikasi di Discord Developer Portal | – |
| 4 | Pengaturan OAuth2 (redirect) | – |
| **5** | **Mengisi nilai `.env` (kamu isi sendiri)** | **#2** |
| 6 | Menghubungkan bot kamu | – |
| 7 | Memasang layanan Excel di laptop | #5 |
| 8 | Pengaturan laptop (internet, nyala terus, whitelist) | – |
| 9 | Menjalankan di komputer sendiri | #4, #5 |
| 10 | Online (production) | #4 |
| 11 | Troubleshooting | – |
| 12 | Perawatan (backup, hapus data, ganti kunci) | – |
| 13 | Daftar tes manual | – |
| 14 | Laporan implementasi | – |

## Daftar file bernomor

| # | File | Fungsi |
|---|---|---|
| 1 | `package.json` | daftar library + perintah `npm start` / `npm run excel` |
| 2 | `.env.example` | contoh pengaturan (disalin jadi `.env`) |
| 3 | `.gitignore` | mencegah `.env`, file Excel, `node_modules` ikut ke GitHub |
| 4 | `server.js` | backend website: login Discord, sesi, API verifikasi, halaman |
| 5 | `excel-service.js` | layanan di laptop yang membaca/menulis Excel |
| 6 | `pages/*.html` | isi 7 halaman: home, login, verify, info, privacy, terms, support |
| 7 | `public/style.css` | tampilan + animasi |
| 8 | `public/site.js` | bintang, menu, animasi, logika halaman login & verify |
| 9 | `README.md` | panduan ini |

---

## 1. Yang harus disiapkan

- Akun GitHub dan repo `https://github.com/AishuT3nkai/thewinner`.
- **Node.js 22 LTS** (minimal 20.12) di komputer yang menjalankan website **dan** di laptop Excel. Unduh dari https://nodejs.org. Cek dengan `node -v`.
- Akun Discord dengan hak **Manage Server** di server kamu.
- Hosting yang bisa menjalankan Node.js dengan **HTTPS** (mis. Render, Railway, Fly.io, atau VPS). Untuk uji coba di komputer sendiri tidak perlu.
- Laptop (milik teman) yang menyimpan file Excel: selalu menyala, online, dan ada Excel untuk mengedit whitelist.
- Akun Tailscale gratis untuk membuka layanan Excel ke internet dengan aman (Bagian 8).

## 2. Memasukkan kode ke GitHub + install

1. Unduh `thewinner.zip` dari chat lalu **ekstrak**.
2. Buka repo di GitHub (di komputer). Kalau repo sudah ada isinya, **jangan hapus apa pun**; bandingkan dulu bila ada nama file yang sama.
3. Klik **Add file → Upload files**, seret semua isi folder hasil ekstrak (termasuk folder `pages` dan `public`), lalu **Commit changes** ke branch `main`.
   ⚠️ **Jangan upload** `.env` atau folder `data`.
   Kalau kamu pakai git:
   ```
   git clone https://github.com/AishuT3nkai/thewinner.git
   (salin isi zip ke folder thewinner)
   git add .
   git commit -m "Tambah website verifikasi"
   git push
   ```
4. Buka Terminal / PowerShell di folder project, jalankan `npm install`. File `package-lock.json` yang muncul ikut di-commit.
5. Salin pengaturan: Windows `copy .env.example .env` — Mac/Linux `cp .env.example .env`. Isinya diisi di Bagian 5.

## 3. Discord Developer Portal

1. Buka https://discord.com/developers/applications → login → **New Application** → nama `THEWINNER` → **Create**.
2. Menu kiri **OAuth2**. Salin **Client ID** → ini `DISCORD_CLIENT_ID`.
3. Klik **Reset Secret** → konfirmasi → salin **Client Secret** (hanya tampil sekali!) → ini `DISCORD_CLIENT_SECRET`.
4. ID server: di aplikasi Discord buka **User Settings → Advanced → Developer Mode (ON)**, klik kanan ikon server → **Copy Server ID** → ini `DISCORD_GUILD_ID`.
5. **Token bot TIDAK dibutuhkan** website ini. Jangan tempel token bot di project ini.

## 4. OAuth2

1. Masih di menu **OAuth2**, bagian **Redirects** → **Add Redirect**.
2. Isi **persis** (huruf besar/kecil, tanpa spasi): `https://ALAMAT-WEBSITE-KAMU/auth/callback`
   Untuk uji lokal tambahkan juga: `http://localhost:3000/auth/callback`
3. **Save Changes**.
4. Scope tidak perlu dicentang di portal. Website sendiri meminta scope minimal: `identify` dan `guilds.members.read` (untuk cek kamu member server ini).
5. Alurnya: tombol login → Discord → `/auth/callback` (state dicek) → cookie sesi HttpOnly → `/verify`.

## 5. Mengisi nilai `.env` (File #2) — kamu isi sendiri

| Nama | Dapat dari mana | Isi di mana |
|---|---|---|
| `SITE_URL` | alamat website, mis. `https://thewinner.example.com` (lokal: `http://localhost:3000`), tanpa `/` di akhir | Website |
| `SESSION_SECRET` | buat sendiri (lihat bawah) | Website |
| `DISCORD_CLIENT_ID` | Bagian 3 langkah 2 | Website |
| `DISCORD_CLIENT_SECRET` | Bagian 3 langkah 3 | Website |
| `DISCORD_GUILD_ID` | Bagian 3 langkah 4 | Website |
| `EXCEL_SERVICE_URL` | alamat dari Bagian 8 (lokal: `http://127.0.0.1:4000`) | Website |
| `EXCEL_SERVICE_SECRET` | buat sendiri (lihat bawah) | Website **dan** laptop (nilai **sama**) |
| `OPERATOR_NAME` | nama kamu/tim, tampil di Privacy & Terms | Website |
| `SUPPORT_CONTACT` | email / akun Discord untuk support | Website |
| `PORT` | opsional, default 3000 | Website |
| `EXCEL_FILE`, `EXCEL_PORT` | opsional | Laptop |

Membuat rahasia acak (jalankan dua kali; hasilnya harus berbeda untuk `SESSION_SECRET` dan `EXCEL_SERVICE_SECRET`):

```
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Di production, isi nilai ini di dashboard hosting (Environment Variables), **bukan** di GitHub.

## 6. Menghubungkan bot

- Website **tidak** butuh token bot dan **tidak** menambah command atau role verifikasi ke bot moderasi kamu.
- Bot kamu cukup **membaca**: tanya layanan Excel apakah sebuah ID sudah terverifikasi.

```js
const r = await fetch(`${process.env.EXCEL_SERVICE_URL}/members/${discordId}`, {
  headers: { authorization: `Bearer ${process.env.EXCEL_SERVICE_SECRET}` },
});
const { verified, verifiedAt, whitelisted, whitelistRequired } = await r.json();
```

- Setelah verifikasi, tombol **Return to Discord** membuka `https://discord.com/channels/<ID server>`.
- Anggap `EXCEL_SERVICE_SECRET` sangat rahasia: pemegangnya bisa membaca dan menulis catatan.

## 7. Layanan Excel di laptop (File #5)

1. Install Node.js (LTS) dari nodejs.org.
2. Ambil kode: GitHub → **Code → Download ZIP** lalu ekstrak (atau `git clone`).
3. Buka PowerShell di folder itu → `npm install`.
4. Buat file `.env` di folder itu berisi satu baris: `EXCEL_SERVICE_SECRET=` diikuti rahasia dari Bagian 5.
5. Jalankan `npm run excel`. Harus muncul "Layanan Excel siap di http://127.0.0.1:4000" dan file `data/thewinner.xlsx` terbentuk otomatis.
6. Tes (PowerShell, pakai `curl.exe`):
   ```
   curl.exe -H "Authorization: Bearer RAHASIA_KAMU" http://127.0.0.1:4000/members/123456789012345678
   ```
   Harus keluar `{"verified":false,...}`. Tanpa header harus `{"error":"unauthorized"}` (itu benar).

Isi file Excel (3 sheet):

- **Verified**: `discord_id`, `username`, `verified_at` (diisi otomatis oleh layanan).
- **Whitelist**: `discord_id`, `note`, `added_at` (kamu isi sendiri).
- **Config**: baris `whitelist_required` = `FALSE`. Ubah ke `TRUE` untuk mewajibkan whitelist.

Aturan penting:

- Jalankan **hanya 1** layanan Excel (antrian tulis ada di dalam program ini).
- Jangan biarkan file **terbuka di Excel** saat ada yang verifikasi. Windows mengunci file, sehingga website akan menjawab gagal. Edit → Save → **tutup Excel**.
- Kolom ID berformat Teks. Jangan ketik ID sebagai angka (Excel membulatkan setelah 15 digit).
- Layanan hanya mendengarkan di `127.0.0.1`, jadi hanya bisa diakses lewat tunnel (Bagian 8).
- Jangan commit atau bagikan folder `data`.

## 8. Pengaturan laptop

**Membuka ke internet (Tailscale Funnel):**

1. Install Tailscale di laptop (https://tailscale.com/download), lalu login.
2. Di admin console Tailscale → menu **DNS**: pastikan **MagicDNS** dan **HTTPS Certificates** aktif.
3. PowerShell: `tailscale funnel --bg 4000`. Kalau muncul link untuk mengaktifkan Funnel, buka dan setujui, lalu ulangi perintahnya. Kalau `--bg` tidak dikenali, update Tailscale.
4. Perintah menampilkan alamat `https://nama-laptop.xxxx.ts.net` → itu `EXCEL_SERVICE_URL` (tanpa `/` di akhir).
5. Tes dari HP: buka `ALAMAT/members/123456789012345678`. Harus `unauthorized` (artinya terlindungi).

Alternatif: Cloudflare Tunnel (butuh domain di Cloudflare), arahkan ke `http://localhost:4000`. Nama menu di Tailscale/Discord bisa sedikit beda karena sering diperbarui.

**Laptop tetap nyala:** Windows **Settings → System → Power → Screen and sleep** → "Never" saat dicolok. Jangan shutdown.

**Jalan otomatis saat login:** **Task Scheduler → Create Basic Task** → Trigger "When I log on" → Action "Start a program" → Program `node`, Arguments `excel-service.js`, Start in = folder project.

**Mengisi whitelist:** hentikan layanan atau pastikan Excel akan ditutup setelah Save → sheet **Whitelist** kolom A = ID Discord (teks), B = catatan, C = tanggal → Save → tutup Excel.

## 9. Menjalankan di komputer sendiri

1. `npm install`. Di `.env`: `SITE_URL=http://localhost:3000` dan `EXCEL_SERVICE_URL=http://127.0.0.1:4000`. Redirect lokal sudah ditambahkan (Bagian 4).
2. Terminal A: `npm run excel`. Terminal B: `npm start`.
3. Buka http://localhost:3000.

## 10. Online (production)

1. Buat Web Service dari repo GitHub di hosting pilihanmu. Build command `npm install`, start command `npm start`.
2. Isi environment variables (Bagian 5) di dashboard. `SITE_URL` harus alamat `https://` final.
3. Tambahkan redirect `https://ALAMAT/auth/callback` di Discord Portal (Bagian 4).
4. Pastikan laptop menyala, layanan Excel jalan, dan Funnel aktif.
5. Jalankan semua tes di Bagian 13 sebelum diumumkan.
6. Tinjau halaman Privacy & Terms (Bagian 14).

Cookie `Secure` aktif otomatis kalau `SITE_URL` berawalan `https://`.

## 11. Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| Server berhenti: "Isi dulu di .env: ..." | nilai itu masih kosong atau masih `YOUR_...` |
| Discord: "Invalid OAuth2 redirect_uri" | redirect di portal tidak persis `SITE_URL` + `/auth/callback` |
| Kembali ke `/login?e=state` | cookie diblokir, link login lebih dari 10 menit, atau `SITE_URL` beda dengan alamat yang kamu buka |
| `/login?e=notmember` | akun belum jadi member server, atau `DISCORD_GUILD_ID` salah |
| `/login?e=error` | Client ID/Secret salah; lihat log server |
| Verify: "verification service is offline" | laptop mati/tidur, layanan Excel tidak jalan, Funnel mati, `EXCEL_SERVICE_URL` salah, atau secret beda (log website menulis "Layanan Excel menjawab 401") |
| Verify gagal, "Nothing was saved" | file sedang terbuka di Excel atau folder `data` tidak bisa ditulis; tutup Excel, lihat log "Error workbook" |
| "not on the whitelist" | ID belum ada di sheet Whitelist dan `whitelist_required` = TRUE |
| `EADDRINUSE` | port dipakai program lain; ganti `PORT` / `EXCEL_PORT` |
| Login tidak tersimpan di production | `SITE_URL` bukan `https://` |

## 12. Perawatan

- **Backup**: salin `data/thewinner.xlsx` berkala (mis. mingguan) ke tempat lain.
- **Permintaan hapus data**: (1) pastikan orangnya benar lewat Discord, (2) hentikan layanan Excel (Ctrl+C), (3) buka file, hapus baris orang itu di **Verified** dan **Whitelist**, (4) Save dan **tutup Excel**, (5) `npm run excel` lagi.
- **Ganti rahasia** (kalau bocor): buat baru. `EXCEL_SERVICE_SECRET` diganti di website **dan** laptop lalu restart keduanya. `SESSION_SECRET` baru membuat semua orang login ulang. Client Secret: Portal → OAuth2 → Reset Secret.
- **Ubah halaman hukum**: perbarui tanggal "Last updated" di `pages/privacy.html` dan `pages/terms.html`.
- **Fitur baru**: kembali ke tahap Planning (tulis tujuan dan batasannya dulu).

## 13. Daftar tes manual

1. `npm run excel` jalan, file Excel terbentuk; tanpa header → `unauthorized`.
2. `npm start` dengan `.env` belum terisi → pesan jelas, server berhenti.
3. Home → Log in → Discord → kembali ke `/verify` dengan nama dan avatarmu.
4. Akun yang belum join server → pesan "not in the server".
5. Centang aturan → **Verify me** → layar sukses; baris baru muncul di sheet Verified.
6. Muat ulang `/verify` → langsung "verified"; tidak ada baris dobel.
7. Matikan layanan Excel → muat ulang `/verify` → pesan offline; tidak pernah muncul "verified".
8. `whitelist_required` = TRUE: akun tanpa whitelist ditolak, yang ada di whitelist lolos.
9. Menu HP (buka/tutup), semua halaman di layar kecil; aktifkan "Reduce motion" di sistem → animasi mati.
10. Buka `/api/me` tanpa login → 401. Kirim POST `/api/verify` tanpa token CSRF → 403.

## 14. Laporan implementasi

**Arsitektur.** Browser → website (Express, File #4) → layanan Excel di laptop (File #5, lewat Tailscale Funnel + kunci rahasia) → `thewinner.xlsx`. Sesi = cookie bertanda tangan (tidak ada database lain). Excel hanya untuk catatan verifikasi, member terverifikasi, whitelist, dan konfigurasi whitelist.

**Fitur.** 7 halaman (Home, Login, Verification, Information, Privacy, Terms, Support). Login Discord OAuth2 di sisi server (state, scope minimal, tanpa menyimpan token Discord). Cek keanggotaan server. Aturan whitelist dari Excel. Keputusan verifikasi hanya di backend; ID selalu dari sesi hasil Discord, bukan input pengguna. Tulis Excel lewat antrian dan atomik (tulis file sementara lalu ganti nama). Laptop mati → pesan jelas, sukses tidak pernah dilaporkan sebelum file tersimpan. Rate limiting, token CSRF, CSP (tanpa script/style inline), cookie HttpOnly + SameSite=Lax (+ Secure di HTTPS), tanpa CORS. Starfield CSS berlapis (berkelip, melayang, bintang jatuh, parallax), animasi kartu/tombol/halaman, status sukses/gagal, `prefers-reduced-motion` dihormati.

**Dependency.** `express` (server), `helmet` (header keamanan/CSP), `express-rate-limit` (rate limit), `exceljs` (baca/tulis .xlsx). Tidak ada library animasi atau frontend.

**File.** Semua file di tabel "Daftar file bernomor" adalah baru. Tidak ada file lama yang diubah: isi repo kamu tidak bisa saya lihat.

**Tes yang benar-benar dijalankan.** Hanya `node --check` (cek sintaks) untuk `server.js`, `excel-service.js`, `public/site.js` — lolos; kurung kurawal CSS seimbang. **Belum dijalankan:** `npm install`, server, login Discord, layanan Excel, tampilan di browser (lingkungan saya tanpa internet). Semua fitur lain **belum diuji**; pakai Bagian 13.

**Yang perlu kamu tinjau/isi.**
- Nilai `.env` (Bagian 5).
- Halaman Privacy & Terms adalah **draf** dengan nilai bawaan (retensi: selama jadi member atau sampai diminta hapus; hukum: Indonesia; penghapusan data manual). Minta ahli hukum meninjau dan sesuaikan dengan praktik sebenarnya sebelum publik. Tidak ada klaim sertifikasi.
- Teks "Why verification is necessary" di halaman Info bersifat umum; sesuaikan dengan tujuan server kamu.

**Sisa pekerjaan.** Tes end-to-end; cek isi repo yang sudah ada agar tidak bentrok; TypeScript tidak dipakai (JS biasa tanpa build supaya mudah dipasang); tes otomatis belum ada; inspeksi visual belum dilakukan; penghapusan data masih manual.
