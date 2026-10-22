/* Audiskope landing page.
 *
 * Everything visual here is synthesised from the same toy spectrum model, so
 * the page animates the product's own subject matter rather than generic
 * decoration. No audio is loaded and nothing is sent anywhere.
 */
(() => {
'use strict';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const anime = window.anime || null;
const animate = anime && (anime.animate || anime.default?.animate) || null;
const stagger = anime && (anime.stagger || anime.default?.stagger) || (() => 0);

/* ---------------------------------------------------------------- palettes */
/* Mirrors the fragment shader in src/renderer/utils/webglRenderer.ts. */
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const mix = (a, b, t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
const smooth = (e0, e1, v) => { const t = clamp01((v-e0)/(e1-e0)); return t*t*(3-2*t); };

const PALETTES = {
  '3band': v => v < 0.55 ? mix([0.005,0.012,0.025],[0.10,0.43,0.88], Math.pow(v/0.55,1.8))
             : v < 0.84 ? mix([0.10,0.43,0.88],[1,0.56,0.07], smooth(0.55,0.84,v))
             :            mix([1,0.56,0.07],[1,0.97,0.90], smooth(0.84,1,v)),
  ice:   v => v < 0.33 ? [0,0,v*1.5]
            : v < 0.66 ? [0,(v-0.33)*2.4,0.5+(v-0.33)*1.5]
            :            [(v-0.66)*3, 0.8+(v-0.66)*0.6, 1],
  fire:  v => v < 0.25 ? [v*1.6,0,0]
            : v < 0.5  ? [0.4+(v-0.25)*2.4,(v-0.25)*1.2,0]
            : v < 0.75 ? [1,0.3+(v-0.5)*2.8,0]
            :            [1,1,(v-0.75)*4],
};
let palette = '3band';

/* Precomputed 256-entry lookup tables; recomputed only when the user switches. */
const LUTS = {};
for (const name of Object.keys(PALETTES)) {
  const lut = new Uint8Array(256*3);
  for (let i = 0; i < 256; i++) {
    const c = PALETTES[name](i/255);
    lut[i*3]   = clamp01(c[0])*255;
    lut[i*3+1] = clamp01(c[1])*255;
    lut[i*3+2] = clamp01(c[2])*255;
  }
  LUTS[name] = lut;
}

/* ------------------------------------------------------------ the "signal" */
/* One periodic scene so the loop seams are invisible. */
const LOOP = 14;
const peak = (f, centre, width) => Math.exp(-Math.pow((f-centre)/width, 2));

function column(out, t) {
  const p = (t % LOOP) / LOOP;            // 0..1 through the scene
  const bins = out.length;
  // Sweeps, drawn as travelling gaussian ridges.
  const up   = 0.03 + 0.52*p*p;
  const down = 0.88 - 0.70*p;
  const vib  = 0.40 + 0.055*Math.sin(p*Math.PI*2*5);
  // Broadband transients on a steady pulse.
  const beat = (t % 1.75) / 1.75;
  const hit  = beat < 0.05 ? Math.exp(-beat*48) : 0;

  for (let b = 0; b < bins; b++) {
    const f = b / bins;
    let v = 0.035 + 0.035*Math.random();        // floor
    // Harmonic comb, thinning with height.
    for (let k = 1; k <= 13; k++) {
      const c = 0.0295*k;
      if (c > 1) break;
      v += (0.60/k) * peak(f, c, 0.0050);
    }
    v += 0.92*peak(f, up, 0.0090);
    v += 0.74*peak(f, down, 0.0090);
    v += 0.66*peak(f, vib, 0.0072);
    v += hit * (0.62 - 0.26*f) * (0.75 + 0.5*Math.random());
    out[b] = clamp01(v);
  }
}

/* -------------------------------------------------------- scrolling canvas */
class Spectro {
  constructor(canvas, { bins = 150, step = 2, speed = 54 } = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.bins = bins; this.step = step; this.speed = speed;
    this.col = new Float32Array(bins);
    this.acc = 0; this.t = 0; this.visible = true;
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    new IntersectionObserver(e => { this.visible = e[0].isIntersecting; })
      .observe(canvas);
  }
  resize() {
    const r = this.cv.getBoundingClientRect();
    // Fixed internal resolution: this is a soft background, not a readout.
    const w = Math.max(420, Math.min(1280, Math.round(r.width * 0.72))) | 0;
    const h = Math.max(120, Math.min(420, Math.round(r.height * 0.75))) | 0;
    if (w === this.cv.width && h === this.cv.height) return;
    this.cv.width = w; this.cv.height = h;
    this.ctx.fillStyle = '#07080a';
    this.ctx.fillRect(0, 0, w, h);
    this.prime = true;
  }
  drawColumn(x) {
    const { ctx, bins, col, cv } = this;
    const lut = LUTS[palette];
    const h = cv.height, bh = h / bins;
    for (let b = 0; b < bins; b++) {
      const i = (col[b] * 255) | 0;
      ctx.fillStyle = `rgb(${lut[i*3]},${lut[i*3+1]},${lut[i*3+2]})`;
      ctx.fillRect(x, h - (b+1)*bh, this.step, bh + 1);
    }
  }
  tick(dt) {
    if (!this.visible) return;
    const { ctx, cv, step } = this;
    // Fill the whole canvas on first paint so it never starts blank.
    if (this.prime) {
      this.prime = false;
      for (let x = 0; x < cv.width; x += step) {
        this.t += step / this.speed;
        column(this.col, this.t);
        this.drawColumn(x);
      }
      return;
    }
    this.acc += dt * this.speed;
    let moved = 0;
    while (this.acc >= step && moved < cv.width) { this.acc -= step; moved += step; }
    if (!moved) return;
    ctx.drawImage(cv, -moved, 0);
    for (let x = cv.width - moved; x < cv.width; x += step) {
      this.t += step / this.speed;
      column(this.col, this.t);
      this.drawColumn(x);
    }
  }
}

/* ------------------------------------------------------------- the clock */
const tickers = [];
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!document.hidden) for (const fn of tickers) fn(dt, now / 1000);
  requestAnimationFrame(frame);
}

/* --------------------------------------------------------------- hero art */
const hero = document.getElementById('hero-spectro');
if (hero) {
  const s = new Spectro(hero, { bins: 160, step: 2, speed: 58 });
  if (REDUCED) { s.tick(0); }
  else tickers.push(dt => s.tick(dt));
}
for (const id of ['rule1', 'rule2']) {
  const cv = document.getElementById(id);
  if (!cv) continue;
  const s = new Spectro(cv, { bins: 72, step: 3, speed: id === 'rule1' ? 34 : 26 });
  if (REDUCED) s.tick(0); else tickers.push(dt => s.tick(dt));
}

/* ---------------------------------------------------- live analyser strip */
const strip = document.getElementById('analyser');
if (strip) {
  const BARS = Math.min(64, Math.max(28, Math.floor(innerWidth / 26)));
  const bars = [];
  for (let i = 0; i < BARS; i++) { const el = document.createElement('i'); strip.appendChild(el); bars.push(el); }
  const buf = new Float32Array(BARS);
  const held = new Float32Array(BARS);
  if (REDUCED) {
    column(buf, 3);
    bars.forEach((el, i) => el.style.height = (6 + buf[i] * 46) + 'px');
  } else {
    tickers.push((dt, t) => {
      column(buf, t * 0.9);
      for (let i = 0; i < BARS; i++) {
        // Asymmetric smoothing: snap up, fall back slowly, like a real meter.
        const v = Math.pow(buf[i], 0.8);
        held[i] = v > held[i] ? v : held[i] + (v - held[i]) * Math.min(1, dt * 7);
        bars[i].style.height = (5 + held[i] * 48).toFixed(1) + 'px';
      }
    });
  }
}

/* -------------------------------------------------------------- logo mark */
const mark = document.getElementById('mark');
if (mark) {
  const ctx = mark.getContext('2d');
  const H = [0.28, 0.56, 0.86, 0.62, 0.34], BW = 0.088, GAP = 0.048;
  const paint = (t) => {
    const S = mark.width;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#17191d';
    ctx.fillRect(0, 0, S, S);
    const w = BW*S, g = GAP*S;
    let x = (S - (H.length*w + (H.length-1)*g)) / 2;
    ctx.fillStyle = '#28c1f5';
    for (let i = 0; i < H.length; i++) {
      const wob = REDUCED ? 1 : 0.82 + 0.3*Math.abs(Math.sin(t*1.7 + i*0.9));
      const hh = H[i]*S*wob;
      const r = w/2, y = (S-hh)/2;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, w, hh, r) : ctx.rect(x, y, w, hh);
      ctx.fill();
      x += w + g;
    }
  };
  paint(0);
  if (!REDUCED) tickers.push((dt, t) => paint(t));
}

if (tickers.length) requestAnimationFrame(frame);

/* -------------------------------------------------------- anime.js intro */
const headline = document.getElementById('headline');
if (headline) {
  headline.textContent = '';
  const chars = [];
  // Line one is split per character. Line two carries a clipped background
  // gradient, which stops clipping to inline-block children, so it animates
  // as a single element instead.
  for (const ch of headline.dataset.line1) {
    const c = document.createElement('span');
    c.className = 'ch';
    c.textContent = ch === ' ' ? '\u00a0' : ch;
    headline.appendChild(c);
    chars.push(c);
  }
  headline.appendChild(document.createElement('br'));
  const grad = document.createElement('span');
  grad.className = 'grad';
  grad.textContent = headline.dataset.line2;
  headline.appendChild(grad);

  if (REDUCED || !animate) {
    chars.forEach(c => { c.style.opacity = 1; });
  } else {
    chars.forEach(c => { c.style.opacity = 0; });
    grad.style.opacity = 0;
    animate(chars, {
      opacity: [0, 1], translateY: [26, 0], filter: ['blur(8px)', 'blur(0px)'],
      duration: 760, delay: stagger(20, { start: 120 }), ease: 'out(3)',
    });
    animate(grad, {
      opacity: [0, 1], translateY: [30, 0], scale: [0.94, 1],
      duration: 900, delay: 120 + 20 * chars.length + 60, ease: 'out(4)',
    });
  }
}

/* ------------------------------------------------- scroll-driven reveals */
const revealables = [...document.querySelectorAll('[data-rev]')];
if (REDUCED || !animate) {
  revealables.forEach(el => { el.style.opacity = 1; });
} else {
  const io = new IntersectionObserver((entries) => {
    const show = entries.filter(e => e.isIntersecting).map(e => e.target);
    if (!show.length) return;
    show.forEach(el => io.unobserve(el));
    animate(show, {
      opacity: [0, 1],
      translateY: [22, 0],
      duration: 680,
      delay: stagger(55),
      ease: 'out(3)',
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  revealables.forEach(el => io.observe(el));
}

/* ------------------------------------------------------- counting numbers */
const counters = [...document.querySelectorAll('[data-count]')];
if (counters.length) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const el = e.target;
      const target = +el.dataset.count;
      const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
      if (REDUCED) { el.textContent = pre + target + suf; continue; }
      const start = performance.now(), dur = 1400;
      const run = (now) => {
        const k = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - k, 4);
        el.textContent = pre + Math.round(target * eased) + suf;
        if (k < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    }
  }, { threshold: 0.5 });
  counters.forEach(el => io.observe(el));
}

/* ----------------------------------------------------- palette switching */
const sw = document.getElementById('switch');
const stack = document.getElementById('stack');
const frameLabel = document.getElementById('frame-label');
if (sw && stack) {
  const shots = [...stack.querySelectorAll('img')];
  const names = { '3band': 'Tri-band', ice: 'Ice', fire: 'Fire' };
  sw.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-p]');
    if (!btn) return;
    const want = btn.dataset.p;
    if (want === palette) return;
    palette = want;                      // the live canvases pick this up
    for (const b of sw.querySelectorAll('button'))
      b.setAttribute('aria-pressed', String(b === btn));
    if (frameLabel) frameLabel.textContent = 'Audiskope · ' + names[want];
    shots.forEach(img => {
      const on = img.dataset.p === want;
      if (REDUCED || !animate) { img.style.opacity = on ? 1 : 0; return; }
      animate(img, { opacity: on ? 1 : 0, duration: 420, ease: 'inOut(2)' });
    });
  });
}

/* ------------------------------------------------------- release metadata */
(async () => {
  try {
    const res = await fetch('https://api.github.com/repos/kmelitzanis/audiskope/releases/latest');
    if (!res.ok) return;
    const rel = await res.json();
    const assets = rel.assets || [];
    const mb = n => (n / 1048576).toFixed(1) + ' MB';

    for (const card of document.querySelectorAll('.dl[data-match]')) {
      const a = assets.find(x => x.name.endsWith(card.dataset.match));
      if (!a) continue;
      card.href = a.browser_download_url;
      card.querySelector('.meta').textContent =
        card.dataset.match.slice(card.dataset.match.lastIndexOf('.')) + ' · ' + mb(a.size);
    }

    const note = document.getElementById('version-note');
    if (note && rel.tag_name)
      note.textContent = `${rel.tag_name} · GPL-3.0 · no account · no telemetry · no network access`;

    const ua = navigator.userAgent;
    const mac = /Mac/.test(ua), win = /Win/.test(ua);
    const wanted = mac ? 'mac-arm64.dmg' : win ? 'win-x64.exe' : 'x86_64.AppImage';
    const match = assets.find(x => x.name.endsWith(wanted));
    const btn = document.getElementById('primary-dl');
    if (match && btn) {
      btn.href = match.browser_download_url;
      btn.querySelector('span').textContent =
        'Download for ' + (mac ? 'macOS' : win ? 'Windows' : 'Linux');
    }
  } catch { /* the static links already point at the releases page */ }
})();

})();
