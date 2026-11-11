// FILE #8 — Bintang, menu, animasi scroll, dan logika halaman login/verify. Tanpa library.
const $ = (s) => document.querySelector(s);
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const css = (el, o) => { for (const k in o) el.style.setProperty(k, o[k]); };

// Animasi bintang tetap berlanjut mulus saat pindah halaman
let t0 = Date.now();
try { t0 = +sessionStorage.t0 || t0; sessionStorage.t0 = t0; } catch { /* storage diblokir: tidak masalah */ }
css(document.documentElement, { '--t': `-${((Date.now() - t0) / 1000).toFixed(1)}s` });

// Bintang berkelip: seed tetap, jadi posisinya sama di semua halaman
const seeded = (a) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = seeded(2026);
const sky = $('.sky');
for (let i = 0, n = innerWidth < 700 ? 40 : 80; i < n; i++) {
  const star = document.createElement('i');
  css(star, { left: `${rnd() * 100}%`, top: `${rnd() * 100}%`, '--z': `${(1 + rnd() * 1.8).toFixed(1)}px`, '--d': `${(3 + rnd() * 5).toFixed(1)}s`, '--o': `-${(rnd() * 8).toFixed(1)}s` });
  sky.append(star);
}

if (!still) {
  // Bintang jatuh: CSS yang menganimasikan, JS hanya memindahkan posisi setiap putaran selesai
  for (let i = 0; i < 3; i++) {
    const b = document.createElement('b');
    b.className = 'shoot';
    const place = () => css(b, { left: `${Math.random() * 60}%`, top: `${Math.random() * 45}%` });
    css(b, { '--d': `${12 + i * 6}s`, '--o': `-${i * 5}s` });
    place();
    b.addEventListener('animationiteration', place);
    sky.append(b);
  }
  // Parallax halus (scroll + pointer), dibatasi 1 update per frame
  const layers = [...document.querySelectorAll('.l')];
  let mx = 0, my = 0, queued = false;
  const move = () => { queued = false; layers.forEach((l, i) => l.style.setProperty('translate', `${-mx * 14 * (i + 1)}px ${-my * 14 * (i + 1) - Math.min(scrollY, 800) * 0.02 * (i + 1)}px`)); };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(move); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; queue(); }, { passive: true });
}

// Muncul saat di-scroll (hanya untuk elemen di bawah layar; sisanya tampil langsung)
const io = new IntersectionObserver((list) => list.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
document.querySelectorAll('[data-rv]').forEach((el) => { if (still || el.getBoundingClientRect().top < innerHeight) return; el.classList.add('rv'); io.observe(el); });

// Menu mobile
const burger = $('.burger'), nav = $('nav');
burger.addEventListener('click', () => { const open = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : ''; });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) burger.click(); });

// ---- Halaman login ----
const page = document.body.dataset.page;
if (page === 'login') {
  const msg = { denied: 'You cancelled the Discord approval.', state: 'The login link expired or did not match. Please try again.', notmember: 'Your Discord account is not in the server yet. Join the server, then log in again.', error: 'Discord login failed. Please try again in a minute.' }[new URLSearchParams(location.search).get('e')];
  if (msg) { const b = $('#err'); b.textContent = msg; b.hidden = false; }
  $('#go').addEventListener('click', (e) => e.currentTarget.classList.add('busy'));
}

// ---- Halaman verifikasi ----
const REASONS = {
  not_whitelisted: 'Your account is not on the whitelist for this server. Contact support if you think this is a mistake.',
  csrf: 'Your session expired. Please log in again.',
  unavailable: 'The verification service could not confirm this right now. Nothing was saved. Please try again later.',
};
if (page === 'verify') verify();

async function verify() {
  const stage = $('#stage');
  const show = (name, p) => {
    stage.replaceChildren($(`#t-${name}`).content.cloneNode(true));
    stage.classList.remove('rise'); void stage.offsetWidth; stage.classList.add('rise');
    $('#bar').style.setProperty('--p', `${p}%`);
  };
  const fail = (msg, retry = true) => { show('failed', 40); $('#why').textContent = msg; $('#retry').hidden = !retry; $('#retry').onclick = () => location.reload(); };
  let me;
  try {
    const r = await fetch('/api/me');
    if (r.status === 401) return location.replace('/login');
    me = await r.json();
  } catch { return fail('Could not reach the site. Check your connection and reload.'); }

  $('#avatar').src = me.avatar; $('#avatar').hidden = false;
  $('#name').textContent = me.name; $('#handle').textContent = `@${me.username}`;
  const out = $('#out'); out.hidden = false;
  out.onclick = async () => { await fetch('/api/logout', { method: 'POST', headers: { 'x-csrf-token': me.csrf } }).catch(() => {}); location.href = '/'; };

  const done = (when) => { show('verified', 100); $('#when').textContent = new Date(when).toLocaleString(); $('#back').href = `https://discord.com/channels/${me.guild}`; };
  if (me.status === 'verified') return done(me.verifiedAt);
  if (me.status === 'not_whitelisted') return fail(REASONS.not_whitelisted, false);
  if (me.status === 'unavailable') return fail('The verification service is offline right now. Nothing was saved. Please try again later.');

  show('pending', 66);
  const ok = $('#ok'), go = $('#go');
  ok.onchange = () => { go.disabled = !ok.checked; };
  go.onclick = async () => {
    go.disabled = true; go.classList.add('busy');
    try {
      const r = await fetch('/api/verify', { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': me.csrf }, body: JSON.stringify({ accept: true }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.status === 'verified') return done(d.verifiedAt);
      fail(REASONS[d.error] || REASONS.unavailable, d.error !== 'not_whitelisted');
    } catch { fail(REASONS.unavailable); }
  };
}
