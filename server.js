// FILE #4 — Backend website: login Discord (OAuth2), sesi, API verifikasi, halaman.
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

try { process.loadEnvFile(); } catch { /* tidak ada .env: pakai environment variable asli */ }
const E = process.env;
const set = (k) => E[k] && !E[k].startsWith('YOUR_');
const missing = ['SITE_URL', 'SESSION_SECRET', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_GUILD_ID', 'EXCEL_SERVICE_URL', 'EXCEL_SERVICE_SECRET'].filter((k) => !set(k));
if (missing.length) { console.error('Isi dulu di .env:', missing.join(', ')); process.exit(1); }
if (E.SESSION_SECRET.length < 32 || E.EXCEL_SERVICE_SECRET.length < 32) { console.error('SESSION_SECRET dan EXCEL_SERVICE_SECRET minimal 32 karakter.'); process.exit(1); }
if (!/^\d{17,20}$/.test(E.DISCORD_GUILD_ID)) { console.error('DISCORD_GUILD_ID harus angka (ID server).'); process.exit(1); }

const SITE = E.SITE_URL.replace(/\/+$/, '');
const EXCEL = E.EXCEL_SERVICE_URL.replace(/\/+$/, '');
const PROD = SITE.startsWith('https://');
const REDIRECT = `${SITE}/auth/callback`;
const SESSION_MS = 2 * 3600 * 1000;
const here = path.dirname(fileURLToPath(import.meta.url));

// ---- helper kecil: cookie bertanda tangan, perbandingan constant-time, escape HTML ----
const sign = (s) => crypto.createHmac('sha256', E.SESSION_SECRET).update(s).digest('base64url');
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const seal = (o) => { const p = Buffer.from(JSON.stringify(o)).toString('base64url'); return `${p}.${sign(p)}`; };
const unseal = (t) => {
  const [p, s] = String(t || '').split('.');
  if (!p || !s || !eq(s, sign(p))) return null;
  try { const o = JSON.parse(Buffer.from(p, 'base64url').toString()); return o.exp > Date.now() ? o : null; } catch { return null; }
};
const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split(/=(.*)/s).slice(0, 2)).filter(([k]) => k));
const setCookie = (res, k, v, sec) => res.append('Set-Cookie', `${k}=${v}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sec}${PROD ? '; Secure' : ''}`);
const session = (req) => unseal(cookies(req).tw_session);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const limit = (n) => rateLimit({ windowMs: 60_000, limit: n, standardHeaders: true, legacyHeaders: false });
const json = (r) => r.json().catch(() => ({}));
const avatar = (s) => (s.avatar ? `https://cdn.discordapp.com/avatars/${s.id}/${s.avatar}.png?size=96` : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(s.id) >> 22n) % 6n)}.png`);

// ---- klien layanan Excel (laptop). Sukses hanya dilaporkan kalau layanan benar-benar mengonfirmasi ----
async function excel(p, opts = {}) {
  let r;
  try {
    r = await fetch(EXCEL + p, { ...opts, headers: { authorization: `Bearer ${E.EXCEL_SERVICE_SECRET}`, 'content-type': 'application/json' }, signal: AbortSignal.timeout(8000) });
  } catch { throw Object.assign(new Error('unavailable'), { status: 503 }); }
  const data = await json(r);
  if (!r.ok) {
    console.error('Layanan Excel menjawab', r.status, data.error);
    const code = typeof data.error === 'string' && /^[a-z_]{1,32}$/.test(data.error) && r.status !== 401 ? data.error : 'unavailable';
    throw Object.assign(new Error(code), { status: code === 'not_whitelisted' ? 403 : 503 });
  }
  return data;
}

// ---- halaman: 1 layout bersama + 7 file isi kecil di /pages ----
const PAGES = { '/': ['home', 'Home'], '/login': ['login', 'Log in'], '/verify': ['verify', 'Verification'], '/info': ['info', 'Information'], '/privacy': ['privacy', 'Privacy Policy'], '/terms': ['terms', 'Terms & Conditions'], '/support': ['support', 'Support'] };
const NAV = [['/', 'Home'], ['/info', 'Info'], ['/support', 'Support']];
const VARS = {
  OPERATOR_NAME: esc(set('OPERATOR_NAME') ? E.OPERATOR_NAME : '[OPERATOR NAME: isi OPERATOR_NAME di .env]'),
  SUPPORT_CONTACT: esc(set('SUPPORT_CONTACT') ? E.SUPPORT_CONTACT : '[SUPPORT CONTACT: isi SUPPORT_CONTACT di .env]'),
};
const read = (f) => fs.readFileSync(path.join(here, 'pages', `${f}.html`), 'utf8').replace(/\{\{(\w+)\}\}/g, (_, k) => VARS[k] ?? '');
const layout = (url, file, title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#000000"><meta name="description" content="Discord member verification for our server."><title>${esc(title)} · THEWINNER</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='28' fill='%23ffc857'%3E✦%3C/text%3E%3C/svg%3E"><link rel="stylesheet" href="/style.css"></head><body data-page="${file}"><a class="skip" href="#main">Skip to content</a><div class="sky" aria-hidden="true"><div class="l l1"></div><div class="l l2"></div><div class="l l3"></div></div><header><a class="brand" href="/">✦ THEWINNER</a><button class="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span></button><nav>${NAV.map(([h, t]) => `<a href="${h}"${h === url ? ' aria-current="page"' : ''}>${t}</a>`).join('')}<a class="btn sm" href="/verify">Verify</a></nav></header><main id="main">${body}</main><footer><span>© THEWINNER</span><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/support">Support</a></footer><script src="/site.js" defer></script></body></html>`;
const html = Object.fromEntries(Object.entries(PAGES).map(([u, [f, t]]) => [u, layout(u, f, t, read(f))]));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', PROD ? 1 : false);
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'https://cdn.discordapp.com'],
  objectSrc: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"], frameAncestors: ["'none'"],
  'upgrade-insecure-requests': PROD ? [] : null,
} } }));
app.use(limit(300));
app.use(express.json({ limit: '2kb' }));
app.use(express.static(path.join(here, 'public'), { index: false, maxAge: '1h' }));
for (const u of Object.keys(html)) app.get(u, (req, res) => res.type('html').send(html[u]));

// ---- login Discord (OAuth2 di server: state + cookie HttpOnly, scope minimal) ----
app.get('/auth/login', limit(20), (req, res) => {
  const state = crypto.randomBytes(24).toString('base64url');
  setCookie(res, 'tw_state', state, 600);
  res.redirect('https://discord.com/oauth2/authorize?' + new URLSearchParams({
    response_type: 'code', client_id: E.DISCORD_CLIENT_ID, scope: 'identify guilds.members.read', redirect_uri: REDIRECT, state, prompt: 'none',
  }));
});

app.get('/auth/callback', limit(20), async (req, res) => {
  const { code, state, error } = req.query;
  const saved = cookies(req).tw_state;
  setCookie(res, 'tw_state', '', 0);
  if (error) return res.redirect('/login?e=denied');
  if (typeof code !== 'string' || typeof state !== 'string' || !saved || !eq(state, saved)) return res.redirect('/login?e=state');
  try {
    const t = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({ client_id: E.DISCORD_CLIENT_ID, client_secret: E.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: REDIRECT }),
    });
    const { access_token } = await json(t);
    if (!t.ok || !access_token) throw new Error(`token exchange ${t.status}`);
    const headers = { authorization: `Bearer ${access_token}` }; // dipakai sekali, TIDAK disimpan
    const [u, m] = await Promise.all([
      fetch('https://discord.com/api/users/@me', { headers, signal: AbortSignal.timeout(8000) }),
      fetch(`https://discord.com/api/users/@me/guilds/${E.DISCORD_GUILD_ID}/member`, { headers, signal: AbortSignal.timeout(8000) }),
    ]);
    const user = await json(u);
    if (!u.ok || !/^\d{17,20}$/.test(user.id)) throw new Error(`user lookup ${u.status}`);
    if (m.status === 404) return res.redirect('/login?e=notmember');
    if (!m.ok) throw new Error(`member lookup ${m.status}`);
    setCookie(res, 'tw_session', seal({
      id: user.id, username: String(user.username).slice(0, 32), name: String(user.global_name || user.username).slice(0, 64),
      avatar: /^(a_)?[a-f0-9]{32}$/.test(user.avatar) ? user.avatar : null, csrf: crypto.randomBytes(16).toString('hex'), exp: Date.now() + SESSION_MS,
    }), SESSION_MS / 1000);
    res.redirect('/verify');
  } catch (e) { console.error('Login Discord gagal:', e.message); res.redirect('/login?e=error'); }
});

// ---- API (hanya same-origin, tanpa CORS). POST wajib sesi + token CSRF ----
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method === 'GET') return next();
  const s = session(req), t = req.get('x-csrf-token');
  if (!s || !t || !eq(t, s.csrf)) return res.status(403).json({ error: 'csrf' });
  next();
});

app.get('/api/me', limit(60), async (req, res) => {
  const s = session(req);
  if (!s) return res.status(401).json({ error: 'login' });
  let status = 'unavailable', verifiedAt = null;
  try {
    const m = await excel(`/members/${s.id}`);
    status = m.verified ? 'verified' : m.whitelistRequired && !m.whitelisted ? 'not_whitelisted' : 'pending';
    verifiedAt = m.verifiedAt;
  } catch { /* layanan Excel mati: status tetap 'unavailable' */ }
  res.json({ name: s.name, username: s.username, avatar: avatar(s), csrf: s.csrf, status, verifiedAt, guild: E.DISCORD_GUILD_ID });
});

// Keputusan verifikasi HANYA di sini. ID diambil dari sesi (hasil Discord), bukan dari input pengguna.
app.post('/api/verify', limit(10), async (req, res) => {
  const s = session(req);
  if (req.body?.accept !== true) return res.status(400).json({ error: 'accept_required' });
  try {
    const r = await excel('/verifications', { method: 'POST', body: JSON.stringify({ id: s.id, username: s.username }) });
    res.json({ status: 'verified', verifiedAt: r.verifiedAt });
  } catch (e) { console.error('Verifikasi gagal:', e.message); res.status(e.status || 503).json({ error: e.message }); }
});

app.post('/api/logout', (req, res) => { setCookie(res, 'tw_session', '', 0); res.status(204).end(); });

app.use((req, res) => res.status(404).type('html').send(layout('', '404', 'Not found', '<h1>Not found</h1><p><a href="/">Back to home</a></p>')));
app.use((err, req, res, next) => { console.error('Error:', err.type || err.message); res.status(err.status === 400 ? 400 : 500).json({ error: 'bad_request' }); });

app.listen(Number(E.PORT) || 3000, () => console.log(`THEWINNER berjalan di ${SITE} (port ${Number(E.PORT) || 3000})`));
