/* Audiskope landing page.
 *
 * Visibility is CSS-only on purpose. anime.js parks its engine while the
 * document is hidden and does not always restart, so a page opened in a
 * background tab would stay blank if reveals depended on it. It is used here
 * for optional polish only; every element is readable without it.
 */
(() => {
'use strict';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------ the clock */
const tickers = [];
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!document.hidden) for (const fn of tickers) fn(dt, now / 1000);
  requestAnimationFrame(frame);
}

/* ------------------------------------- read the spectrum off the capture */
/* The showcase image is a real analysis, so the analyser bars can take their
 * heights from it instead of from invented numbers. These fractions bound the
 * plot area inside the window chrome. */
const PLOT = { x0: 0.070, x1: 0.920, y0: 0.294, y1: 0.786 };
const sampled = {};
function sample(src) {
  if (sampled[src]) return Promise.resolve(sampled[src]);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = 900, h = 260;
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      const sx = img.naturalWidth * PLOT.x0, sy = img.naturalHeight * PLOT.y0;
      const sw = img.naturalWidth * (PLOT.x1 - PLOT.x0);
      const sh = img.naturalHeight * (PLOT.y1 - PLOT.y0);
      cx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      try { sampled[src] = { w, h, data: cx.getImageData(0, 0, w, h).data }; }
      catch { resolve(null); return; }
      resolve(sampled[src]);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
const level = (s, x, y) => {
  const i = ((y | 0) * s.w + (x | 0)) * 4;
  return (0.299 * s.data[i] + 0.587 * s.data[i+1] + 0.114 * s.data[i+2]) / 255;
};

/* ------------------------------------------------ live analyser strip */
const strip = document.getElementById('analyser');
if (strip) {
  const BARS = Math.min(68, Math.max(26, Math.floor(innerWidth / 25)));
  const bars = [];
  for (let i = 0; i < BARS; i++) {
    const el = document.createElement('i');
    strip.appendChild(el);
    bars.push(el);
  }
  const held = new Float32Array(BARS);
  let src = null;
  const load = (url) => sample(url).then(s => { if (s) src = s; });

  const paint = (scanX) => {
    for (let i = 0; i < BARS; i++) {
      // Bars run low to high frequency; the plot has 0 Hz at the bottom.
      const y = (src.h - 1) * (1 - i / (BARS - 1));
      const v = Math.pow(level(src, scanX, y), 0.8);
      held[i] = REDUCED || v > held[i] ? v : held[i] + (v - held[i]) * 0.14;
      bars[i].style.height = (4 + held[i] * 50).toFixed(1) + 'px';
    }
  };

  const first = document.getElementById('sample-src');
  const url = first ? first.getAttribute('src') : null;
  if (url) {
    if (REDUCED) sample(url).then(s => { if (s) { src = s; paint(s.w * 0.45); } });
    else {
      load(url);
      tickers.push((dt, t) => { if (src) paint((t * 36) % src.w); });
    }
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
    const w = BW * S, g = GAP * S;
    let x = (S - (H.length * w + (H.length - 1) * g)) / 2;
    ctx.fillStyle = '#28c1f5';
    for (let i = 0; i < H.length; i++) {
      const hh = H[i] * S * (scale[i] ?? 1);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, (S - hh) / 2, w, hh, w / 2);
      else ctx.rect(x, (S - hh) / 2, w, hh);
      ctx.fill();
      x += w + g;
    }
  };
  paint([1, 1, 1, 1, 1]);
  if (!REDUCED) {
    const s = [1, 1, 1, 1, 1];
    tickers.push((dt, t) => {
      for (let i = 0; i < 5; i++) s[i] = 0.84 + 0.28 * Math.abs(Math.sin(t * 1.6 + i * 0.8));
      paint(s);
    });
  }
}

if (tickers.length) requestAnimationFrame(frame);

/* ------------------------------------------------------------- headline */
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
  // The gradient line is clipped to its own text, which stops working once it
  // has inline-block children, so it animates as a single element.
  const grad = document.createElement('span');
  grad.className = 'grad';
  grad.textContent = headline.dataset.line2;
  headline.appendChild(grad);

  requestAnimationFrame(() => {
    chars.forEach((c, i) => {
      c.style.transitionDelay = REDUCED ? '0ms' : (110 + i * 19) + 'ms';
      c.classList.add('in');
    });
    grad.style.transitionDelay = REDUCED ? '0ms' : (150 + chars.length * 19) + 'ms';
    grad.classList.add('in');
  });
}

/* --------------------------------------------------------- scroll reveals */
const revealables = [...document.querySelectorAll('[data-rev]')];
const reveal = (el, delay = 0) => {
  el.style.transitionDelay = REDUCED ? '0ms' : delay + 'ms';
  el.classList.add('in');
};
if (REDUCED) {
  revealables.forEach(el => reveal(el));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.filter(e => e.isIntersecting).forEach((e, i) => {
      io.unobserve(e.target);
      reveal(e.target, i * 55);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  revealables.forEach(el => io.observe(el));
  // Last resort: nothing stays invisible, whatever the observer did.
  setTimeout(() => revealables.forEach(el => {
    if (!el.classList.contains('in')) reveal(el);
  }), 4000);
}

/* ------------------------------------------------------ counting numbers */
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
        el.textContent = pre + Math.round(target * (1 - Math.pow(1 - k, 4))) + suf;
        if (k < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    }
  }, { threshold: 0.5 });
  counters.forEach(el => io.observe(el));
}

/* -------------------------------------------------------- palette switch */
const sw = document.getElementById('switch');
const stack = document.getElementById('stack');
if (sw && stack) {
  const shots = [...stack.querySelectorAll('img')];
  let palette = '3band';
  sw.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-p]');
    if (!btn || btn.dataset.p === palette) return;
    palette = btn.dataset.p;
    for (const b of sw.querySelectorAll('button'))
      b.setAttribute('aria-pressed', String(b === btn));
    let chosen = null;
    for (const img of shots) {
      const on = img.dataset.p === palette;
      img.style.opacity = on ? '1' : '0';
      if (on) chosen = img;
    }
    // Keep the analyser reading whichever capture is on screen.
    if (chosen && strip && strip._reload) strip._reload(chosen.getAttribute('src'));
  });
}

/* ------------------------------------------------------ release metadata */
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
