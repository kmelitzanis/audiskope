/* Audiskope landing page.
 *
 * The moving parts are driven by a real analysis: the background strips are
 * Audiskope's own output for a five-minute track, and the analyser bars read
 * their heights straight out of those pixels, so the page shows the product's
 * actual spectrum rather than an invented one.
 */
(() => {
'use strict';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lib = window.anime || null;
const animate = (lib && (lib.animate || lib.default?.animate)) || null;
const stagger = (lib && (lib.stagger || lib.default?.stagger)) || (() => 0);

let palette = '3band';
const SOURCES = {
  '3band': 'assets/bg-triband.jpg',
  ice: 'assets/bg-ice.jpg',
  fire: 'assets/bg-fire.jpg',
};

/* ----------------------------------------------- read the real spectrum */
/* One decode per palette, then plain array indexing per frame. */
const sampled = {};
function sample(name) {
  if (sampled[name]) return Promise.resolve(sampled[name]);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = Math.min(900, img.naturalWidth);
      const h = Math.min(300, img.naturalHeight);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0, w, h);
      let data;
      try { data = cx.getImageData(0, 0, w, h).data; }
      catch { resolve(null); return; }
      sampled[name] = { w, h, data };
      resolve(sampled[name]);
    };
    img.onerror = () => resolve(null);
    img.src = SOURCES[name];
  });
}
/* Perceived brightness of the pixel at (x, y). */
function level(s, x, y) {
  const i = ((y | 0) * s.w + (x | 0)) * 4;
  return (0.299 * s.data[i] + 0.587 * s.data[i+1] + 0.114 * s.data[i+2]) / 255;
}

/* ------------------------------------------------------------ the clock */
const tickers = [];
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!document.hidden) for (const fn of tickers) fn(dt, now / 1000);
  requestAnimationFrame(frame);
}

/* -------------------------------------------------- drifting backdrops */
/* anime.js pans each strip back and forth; the images are not seamless, so
 * alternating beats tiling, which would show a hard edge every cycle. */
function drift(img, { distance, duration, delay = 0 }) {
  if (!img) return;
  if (REDUCED || !animate) return;
  animate(img, {
    translateX: [0, -distance],
    duration, delay,
    loop: true, alternate: true, ease: 'inOutSine',
  });
}

const heroLayer = document.getElementById('hero-spectro');
if (heroLayer) {
  for (const img of heroLayer.querySelectorAll('img')) {
    img.style.opacity = img.dataset.p === palette ? '1' : '0';
    drift(img, { distance: 260, duration: 42000 });
  }
}
drift(document.querySelector('#rule1 img'), { distance: 300, duration: 30000 });
drift(document.querySelector('#rule2 img'), { distance: 300, duration: 36000, delay: 2000 });

/* ------------------------------------------------ live analyser strip */
const strip = document.getElementById('analyser');
if (strip) {
  const BARS = Math.min(64, Math.max(26, Math.floor(innerWidth / 26)));
  const bars = [];
  for (let i = 0; i < BARS; i++) {
    const el = document.createElement('i');
    strip.appendChild(el);
    bars.push(el);
  }
  const held = new Float32Array(BARS);
  let src = null;
  const load = (name) => sample(name).then(s => { if (s) src = s; });

  const paint = (scanX) => {
    if (!src) return;
    for (let i = 0; i < BARS; i++) {
      // Bars run low to high frequency; the image has 0 Hz at the bottom.
      const y = (src.h - 1) * (1 - i / (BARS - 1));
      const v = Math.pow(level(src, scanX, y), 0.85);
      held[i] = REDUCED || v > held[i] ? v : held[i] + (v - held[i]) * 0.14;
      bars[i].style.height = (4 + held[i] * 50).toFixed(1) + 'px';
    }
  };

  if (REDUCED) {
    sample(palette).then(s => { if (s) { src = s; paint(s.w * 0.4); } });
  } else {
    load(palette);
    tickers.push((dt, t) => { if (src) paint((t * 34) % src.w); });
  }
  strip._reload = load;
}

/* ------------------------------------------------------------ logo mark */
const mark = document.getElementById('mark');
if (mark) {
  const ctx = mark.getContext('2d');
  const H = [0.28, 0.56, 0.86, 0.62, 0.34], BW = 0.088, GAP = 0.048;
  const paint = (scale) => {
    const S = mark.width;
    ctx.fillStyle = '#17191d';
    ctx.fillRect(0, 0, S, S);
    const w = BW*S, g = GAP*S;
    let x = (S - (H.length*w + (H.length-1)*g)) / 2;
    ctx.fillStyle = '#28c1f5';
    for (let i = 0; i < H.length; i++) {
      const hh = H[i] * S * (scale[i] ?? 1);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, (S-hh)/2, w, hh, w/2);
      else ctx.rect(x, (S-hh)/2, w, hh);
      ctx.fill();
      x += w + g;
    }
  };
  paint([1,1,1,1,1]);
  if (!REDUCED) {
    const s = [1,1,1,1,1];
    tickers.push((dt, t) => {
      for (let i = 0; i < 5; i++) s[i] = 0.84 + 0.28*Math.abs(Math.sin(t*1.6 + i*0.8));
      paint(s);
    });
  }
}

if (tickers.length) requestAnimationFrame(frame);

/* --------------------------------------------------------- anime intro */
const headline = document.getElementById('headline');
if (headline) {
  headline.textContent = '';
  const chars = [];
  // Split per character for the stagger, but keep each word in a non-breaking
  // wrapper: inline-block letters would otherwise wrap mid-word.
  const words = headline.dataset.line1.split(' ');
  words.forEach((word, wi) => {
    const w = document.createElement('span');
    w.style.whiteSpace = 'nowrap';
    for (const ch of word) {
      const c = document.createElement('span');
      c.className = 'ch';
      c.textContent = ch;
      w.appendChild(c);
      chars.push(c);
    }
    headline.appendChild(w);
    if (wi < words.length - 1) headline.appendChild(document.createTextNode(' '));
  });
  headline.appendChild(document.createElement('br'));
  // The second line carries a clipped background gradient, which stops
  // clipping to inline-block children, so it animates as one element.
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
      duration: 900, delay: 120 + 20*chars.length + 60, ease: 'out(4)',
    });
  }
}

/* --------------------------------------------------- scroll reveals */
const revealables = [...document.querySelectorAll('[data-rev]')];
if (REDUCED || !animate) {
  revealables.forEach(el => { el.style.opacity = 1; });
} else {
  const io = new IntersectionObserver((entries) => {
    const show = entries.filter(e => e.isIntersecting).map(e => e.target);
    if (!show.length) return;
    show.forEach(el => io.unobserve(el));
    animate(show, {
      opacity: [0, 1], translateY: [22, 0],
      duration: 680, delay: stagger(55), ease: 'out(3)',
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  revealables.forEach(el => io.observe(el));
}

/* ------------------------------------------------- counting numbers */
const counters = [...document.querySelectorAll('[data-count]')];
if (counters.length) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const el = e.target, target = +el.dataset.count;
      const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
      if (REDUCED) { el.textContent = pre + target + suf; continue; }
      const t0 = performance.now(), dur = 1400;
      const run = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        el.textContent = pre + Math.round(target * (1 - Math.pow(1-k, 4))) + suf;
        if (k < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    }
  }, { threshold: 0.5 });
  counters.forEach(el => io.observe(el));
}

/* ------------------------------------------------- palette switching */
const sw = document.getElementById('switch');
const stack = document.getElementById('stack');
const frameLabel = document.getElementById('frame-label');
if (sw && stack) {
  const shots = [...stack.querySelectorAll('img')];
  const heroes = heroLayer ? [...heroLayer.querySelectorAll('img')] : [];
  const names = { '3band': 'Tri-band', ice: 'Ice', fire: 'Fire' };
  sw.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-p]');
    if (!btn || btn.dataset.p === palette) return;
    palette = btn.dataset.p;
    for (const b of sw.querySelectorAll('button'))
      b.setAttribute('aria-pressed', String(b === btn));
    if (frameLabel) frameLabel.textContent = 'Audiskope · ' + names[palette];
    const fade = (img) => {
      const on = img.dataset.p === palette;
      if (REDUCED || !animate) { img.style.opacity = on ? 1 : 0; return; }
      animate(img, { opacity: on ? 1 : 0, duration: 420, ease: 'inOut(2)' });
    };
    shots.forEach(fade);
    heroes.forEach(fade);
    if (strip && strip._reload) strip._reload(palette);
  });
}

/* -------------------------------------------------- release metadata */
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
