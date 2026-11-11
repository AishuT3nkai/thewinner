// FILE #5 — Layanan Excel. Jalan di LAPTOP. Hanya program ini yang menyentuh file .xlsx.
import express from 'express';
import rateLimit from 'express-rate-limit';
import ExcelJS from 'exceljs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

try { process.loadEnvFile(); } catch { /* tidak ada .env */ }
const { EXCEL_SERVICE_SECRET: SECRET = '', EXCEL_FILE = './data/thewinner.xlsx', EXCEL_PORT = '4000', EXCEL_HOST = '127.0.0.1' } = process.env;
if (SECRET.length < 32 || SECRET.startsWith('YOUR_')) { console.error('Isi EXCEL_SERVICE_SECRET (32+ karakter) di .env'); process.exit(1); }

const FILE = path.resolve(EXCEL_FILE);
const ID = /^\d{17,20}$/;
const SHEETS = { Verified: ['discord_id', 'username', 'verified_at'], Whitelist: ['discord_id', 'note', 'added_at'], Config: ['key', 'value'] };
const digest = (s) => crypto.createHash('sha256').update(s).digest();
const text = (c) => String(c.value?.text ?? c.value ?? '').trim();

// Satu pekerjaan dalam satu waktu: dua permintaan tidak akan pernah menulis file bersamaan.
let queue = Promise.resolve();
const serial = (job) => { const run = queue.then(job); queue = run.catch(() => {}); return run; };

async function open() {
  const wb = new ExcelJS.Workbook();
  if (fs.existsSync(FILE)) await wb.xlsx.readFile(FILE);
  for (const [name, head] of Object.entries(SHEETS)) {
    if (wb.getWorksheet(name)) continue;
    const ws = wb.addWorksheet(name);
    ws.addRow(head).font = { bold: true };
    head.forEach((_, i) => { ws.getColumn(i + 1).width = 26; });
    ws.getColumn(1).numFmt = '@'; // kolom ID = teks (angka Excel hanya akurat 15 digit, ID Discord lebih panjang)
    if (name === 'Config') ws.addRow(['whitelist_required', 'FALSE']);
  }
  return wb;
}
const save = async (wb) => { const tmp = `${FILE}.tmp`; await wb.xlsx.writeFile(tmp); fs.renameSync(tmp, FILE); }; // tulis lalu ganti nama = file tidak setengah rusak
const find = (ws, id) => { let hit; ws.eachRow((r, n) => { if (n > 1 && text(r.getCell(1)) === id) hit = r; }); return hit; };
const required = (wb) => { let on = false; wb.getWorksheet('Config').eachRow((r) => { if (text(r.getCell(1)) === 'whitelist_required') on = /^(true|yes|1)$/i.test(text(r.getCell(2))); }); return on; };
const fail = (res, e) => { console.error('Error workbook:', e.code || e.message); res.status(503).json({ error: 'storage_busy' }); };

const app = express();
app.disable('x-powered-by');
app.use(rateLimit({ windowMs: 60_000, limit: 300 }));
app.use((req, res, next) => (crypto.timingSafeEqual(digest(req.get('authorization') || ''), digest(`Bearer ${SECRET}`)) ? next() : res.status(401).json({ error: 'unauthorized' })));
app.use(express.json({ limit: '2kb' }));

app.get('/members/:id', async (req, res) => {
  const { id } = req.params;
  if (!ID.test(id)) return res.status(400).json({ error: 'invalid' });
  try {
    res.json(await serial(async () => {
      const wb = await open();
      const hit = find(wb.getWorksheet('Verified'), id);
      return { verified: !!hit, verifiedAt: hit ? text(hit.getCell(3)) : null, whitelisted: !!find(wb.getWorksheet('Whitelist'), id), whitelistRequired: required(wb) };
    }));
  } catch (e) { fail(res, e); }
});

app.post('/verifications', async (req, res) => {
  const { id, username } = req.body ?? {};
  if (typeof id !== 'string' || !ID.test(id) || typeof username !== 'string' || !username) return res.status(400).json({ error: 'invalid' });
  try {
    const [code, body] = await serial(async () => {
      const wb = await open();
      const ws = wb.getWorksheet('Verified');
      const old = find(ws, id);
      if (old) return [200, { verifiedAt: text(old.getCell(3)) }]; // sudah terverifikasi: aman diulang
      if (required(wb) && !find(wb.getWorksheet('Whitelist'), id)) return [403, { error: 'not_whitelisted' }];
      const verifiedAt = new Date().toISOString();
      ws.addRow([id, username.slice(0, 32), verifiedAt]);
      await save(wb); // balasan sukses hanya dikirim SETELAH file tersimpan
      return [201, { verifiedAt }];
    });
    res.status(code).json(body);
  } catch (e) { fail(res, e); }
});

app.use((err, req, res, next) => res.status(400).json({ error: 'invalid' }));

fs.mkdirSync(path.dirname(FILE), { recursive: true });
await serial(async () => save(await open())).catch((e) => { console.error('Tidak bisa membuat/menulis file Excel. Apakah file sedang terbuka di Excel? Tutup lalu coba lagi.', e.code || e.message); process.exit(1); });
app.listen(Number(EXCEL_PORT), EXCEL_HOST, () => console.log(`Layanan Excel siap di http://${EXCEL_HOST}:${EXCEL_PORT} (file: ${FILE})`));
