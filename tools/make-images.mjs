// Builds every image the project needs: the README screenshot and the itch.io promotional set.
// Needs a browser: run it with puppeteer resolvable, and with the app served somewhere.
//   PUPPETEER=/path/to/node_modules/puppeteer APP=http://localhost:8765 node tools/make-images.mjs
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePiece, makeTimeMap, performNotes } from '../composer.js';

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER ?? 'puppeteer');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = process.env.APP ?? 'http://localhost:8765';
const PROMO = join(ROOT, 'dist', 'promo');
mkdirSync(PROMO, { recursive: true });

const NAME = 'Piano Music Generator';
const SUB = 'classical piano, written in your browser';
const C = { bg: '#0d1013', panel: '#16181d', line: '#2a2e34', text: '#e5e8ec', muted: '#9a9fa6', accent: '#edb345', right: '#80bdfb', left: '#71d6a3' };
const F = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
const piece = generatePiece({ seed: 65255, style: 'nocturne', mode: 'major', root: 'D' });

// The mark: four bars of a piano roll, the shape the whole tool draws.
const mark = (x, y, s) => {
  const c = [C.right, C.left, C.right, C.left];
  return [[0, 0.72], [0.22, 0.78], [0, 0.5], [0.3, 0.62]].map(([dx, w], i) =>
    `<rect x="${x + s * dx}" y="${y + s * 0.26 * i}" width="${s * w}" height="${s * 0.15}" rx="${s * 0.075}" fill="${c[i]}"/>`).join('');
};

// A band of the real piece as a piano roll. `thick` picks the few-bars, few-rows version a cover
// needs; the wide art uses the whole texture.
function roll({ x0, y0, w, h, from, bars, low, high, rowH, opacity = 1, gap = 2 }) {
  const to = from + piece.beats * bars;
  const span = Math.max(1, high - low);
  const rh = rowH ?? Math.max(2.4, h / (span + 1));
  const px = (t) => x0 + ((t - from) / (to - from)) * w;
  const py = (p) => y0 + (h - rh) - (p - low) * ((h - rh) / span);
  const notes = piece.notes.filter((n) => n.time >= from && n.time < to && n.pitch >= low && n.pitch <= high).map((n) => {
    const x = px(n.time), ww = Math.max(rh * 1.6, px(n.time + Math.min(n.duration, to - n.time)) - x - gap);
    return `<rect x="${x.toFixed(1)}" y="${py(n.pitch).toFixed(1)}" width="${ww.toFixed(1)}" height="${(rh - gap).toFixed(1)}" rx="${((rh - gap) / 2).toFixed(1)}" fill="${n.hand === 'right' ? C.right : C.left}" opacity="${(0.45 + n.velocity * 0.55).toFixed(2)}"/>`;
  }).join('');
  const bl = [];
  for (let b = Math.ceil(from / piece.beats); b * piece.beats <= to; b++) bl.push(`<line x1="${px(b * piece.beats).toFixed(1)}" y1="${y0}" x2="${px(b * piece.beats).toFixed(1)}" y2="${y0 + h}" stroke="${C.line}" stroke-width="1.5"/>`);
  return `<g opacity="${opacity}">${bl.join('')}${notes}</g>`;
}

// A cover is shown at half size or less: pick a three-bar window, twenty semitones wide, where both
// hands play, so the lines stay thick enough to read.
function coverWindow(BARS = 3, SPAN = 20) {
  let best = null;
  for (let bar = 1; bar + BARS < piece.totalBars - 2; bar++) {
    const from = bar * piece.beats, to = from + BARS * piece.beats;
    const win = piece.notes.filter((n) => n.time >= from && n.time < to && !n.ornament);
    if (win.length < 20) continue;
    const lo = Math.min(...win.map((n) => n.pitch)), hi = Math.max(...win.map((n) => n.pitch));
    for (let base = lo; base + SPAN <= hi + 1; base++) {
      const ns = win.filter((n) => n.pitch >= base && n.pitch <= base + SPAN);
      const right = ns.filter((n) => n.hand === 'right').length, left = ns.length - right;
      if (right < 4 || left < 4) continue;
      const score = ns.length * (0.35 + Math.min(right, left) / ns.length);
      if (!best || score > best.score) best = { score, from, bars: BARS, lo: base, hi: base + SPAN };
    }
  }
  return best;
}

const svgs = {};
{ // cover 630x500
  const w = coverWindow();
  const W = 630, H = 500, bandY = 210;
  svgs.cover = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${C.bg}"/><rect x="0" y="${bandY}" width="${W}" height="${H - bandY}" fill="${C.panel}"/>
${roll({ x0: 34, y0: bandY + 14, w: W - 68, h: H - bandY - 28, from: w.from, bars: w.bars, low: w.lo, high: w.hi, rowH: 13 })}
<text x="${W / 2}" y="104" font-family="${F}" font-size="50" font-weight="600" fill="${C.text}" text-anchor="middle" letter-spacing="-1">${NAME}</text>
<text x="${W / 2}" y="150" font-family="${F}" font-size="25" fill="${C.muted}" text-anchor="middle">${SUB}</text>
<rect x="${W / 2 - 80}" y="${bandY - 30}" width="160" height="3" fill="${C.accent}"/></svg>`;
}
{ // social 1200x630
  svgs.social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${C.bg}"/><rect x="0" y="330" width="1200" height="220" fill="${C.panel}"/>
${roll({ x0: 40, y0: 348, w: 1120, h: 184, from: 8, bars: 14, low: 30, high: 88, gap: 1 })}
${mark(72, 92, 92)}
<text x="196" y="150" font-family="${F}" font-size="58" font-weight="600" fill="${C.text}" letter-spacing="-1">${NAME}</text>
<text x="196" y="196" font-family="${F}" font-size="24" fill="${C.muted}">${SUB}</text>
<rect x="72" y="574" width="150" height="3" fill="${C.accent}"/>
<text x="72" y="608" font-family="${F}" font-size="20" fill="${C.muted}">16 styles &#183; rules, not a trained model &#183; MIDI, WAV, MP3</text></svg>`;
}
{ // favicon 256, wide cover 2100x900 (art only: itch lays the logo over it), logo (transparent)
  svgs.favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<rect width="256" height="256" rx="52" fill="${C.panel}"/>${mark(52, 46, 152)}</svg>`;
  svgs['wide-cover'] = `<svg xmlns="http://www.w3.org/2000/svg" width="2100" height="900" viewBox="0 0 2100 900">
<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${C.bg}" stop-opacity="0.9"/><stop offset="30%" stop-color="${C.bg}" stop-opacity="0.06"/>
<stop offset="70%" stop-color="${C.bg}" stop-opacity="0.06"/><stop offset="100%" stop-color="${C.bg}" stop-opacity="0.9"/></linearGradient>
<radialGradient id="glow" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#1b2027"/><stop offset="100%" stop-color="${C.bg}"/></radialGradient></defs>
<rect width="2100" height="900" fill="url(#glow)"/>
${roll({ x0: -60, y0: 30, w: 2220, h: 840, from: 4, bars: 24, low: 34, high: 86, gap: 1 })}
<rect width="2100" height="900" fill="url(#fade)"/></svg>`;
  svgs.logo = `<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="260" viewBox="0 0 1180 260">
<defs><filter id="halo" x="-20%" y="-40%" width="140%" height="180%">
<feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="#000" flood-opacity="0.75"/>
<feDropShadow dx="0" dy="2" stdDeviation="18" flood-color="#000" flood-opacity="0.5"/></filter></defs>
<g filter="url(#halo)">${mark(40, 68, 118)}
<text x="200" y="172" font-family="${F}" font-size="80" font-weight="600" fill="#ffffff" letter-spacing="-1.5">Piano Music <tspan fill="${C.accent}">Generator</tspan></text></g></svg>`;
}

{ // How a piece is built, one layer at a time, on four real bars of the real piece.
  const BARS = 4;
  let win = null;
  for (let bar = 1; bar + BARS < piece.totalBars - 3; bar++) {
    const from = bar * piece.beats, to = from + BARS * piece.beats;
    const ns = piece.notes.filter((n) => n.time >= from && n.time < to);
    const right = ns.filter((n) => n.hand === 'right').length;
    const score = Math.min(right, ns.length - right) + ns.length * 0.1;
    if (!win || score > win.score) win = { score, from, to, bar };
  }
  const { from, to } = win;
  const LOW = 36, HIGH = 84;
  const W = 1240, LEFT = 268, RIGHT = 40, rowH = 132, gapY = 30, top = 158;
  const pxIn = (a, b) => (t) => LEFT + ((t - a) / (b - a)) * (W - LEFT - RIGHT);
  const px = pxIn(from, to);
  const rowPy = (y0) => (p) => y0 + rowH - 6 - ((p - LOW) / (HIGH - LOW)) * (rowH - 12);

  const chordsIn = piece.chords.filter((c) => { const t = c.bar * piece.beats + (c.start ?? 0); return t >= from - 1e-6 && t < to; });
  const chordAt = (t) => { let cur = chordsIn[0]; for (const c of chordsIn) if (c.bar * piece.beats + (c.start ?? 0) <= t + 1e-6) cur = c; return cur; };
  const notesIn = piece.notes.filter((n) => n.time >= from && n.time < to && n.pitch >= LOW && n.pitch <= HIGH);
  const offsets = performNotes(piece);
  const offsetOf = new Map(piece.notes.map((n, i) => [n, offsets[i]]));
  const secToPulse = piece.tempo / 60;

  const grid = (y0, alpha) => {
    const py = rowPy(y0);
    const out = [];
    chordsIn.forEach((c, i) => {
      const t0 = c.bar * piece.beats + (c.start ?? 0);
      const next = chordsIn[i + 1];
      const t1 = next ? next.bar * piece.beats + (next.start ?? 0) : to;
      for (let p = LOW; p <= HIGH; p++) {
        if (!(c.pcs ?? []).includes(((p % 12) + 12) % 12)) continue;
        out.push(`<rect x="${px(t0).toFixed(1)}" y="${py(p).toFixed(1)}" width="${(px(t1) - px(t0) - 3).toFixed(1)}" height="2" fill="${C.accent}" opacity="${alpha}"/>`);
      }
    });
    return out.join('');
  };
  const barLines = (y0) => {
    const out = [];
    for (let b = Math.ceil(from / piece.beats); b * piece.beats <= to; b++) out.push(`<line x1="${px(b * piece.beats).toFixed(1)}" y1="${y0}" x2="${px(b * piece.beats).toFixed(1)}" y2="${y0 + rowH}" stroke="${C.line}" stroke-width="1"/>`);
    return out.join('');
  };
  const draw = (y0, ns, { perform = false, dim = 1 } = {}) => {
    const py = rowPy(y0);
    return ns.map((n) => {
      const shift = perform ? (offsetOf.get(n) ?? 0) * secToPulse : 0;
      const x = px(n.time + shift);
      const w = Math.max(3, px(n.time + shift + Math.min(n.duration, to - n.time)) - x - 1.5);
      const op = perform ? (0.3 + n.velocity * 0.7) : 0.85;
      return `<rect x="${x.toFixed(1)}" y="${py(n.pitch).toFixed(1)}" width="${w.toFixed(1)}" height="4" rx="2" fill="${n.hand === 'right' ? C.right : C.left}" opacity="${(op * dim).toFixed(2)}"/>`;
    }).join('');
  };

  const rows = [
    ['Harmony and form', 'The rules lay out the chords: which notes exist in each bar, and where the phrase must cadence.',
      (y) => grid(y, 0.5) + chordsIn.map((c) => `<text x="${px(c.bar * piece.beats + (c.start ?? 0)) + 5}" y="${y - 7}" font-family="${F}" font-size="13" fill="${C.accent}">${c.chord}</text>`).join('')],
    ['The melody skeleton', 'On every strong beat the melody takes a note of the chord under it. This is the frame it is sung on.',
      (y) => grid(y, 0.18) + draw(y, notesIn.filter((n) => n.hand === 'right' && n.strong !== false && !n.ornament && piece.notes.indexOf(n) >= 0 && (chordAt(n.time).pcs ?? []).includes(n.pitch % 12)))],
    ['The melody', 'Between those notes come passing and neighbour notes, a returning motif, one climax, an upbeat, a trill at the cadence.',
      (y) => grid(y, 0.1) + draw(y, notesIn.filter((n) => n.hand === 'right'))],
    ['The left hand', 'A figuration drawn per section fills the same chords: broken, block, bass and chord, octaves. It thins out where the melody is busy.',
      (y) => draw(y, notesIn)],
    ['The performance', 'The first bar magnified. Pale outlines are the written notes, solid bars where they are played.',
      (y) => {
        const b0 = from, b1 = from + piece.beats;
        const zx = pxIn(b0, b1);
        const py = rowPy(y);
        const bar = notesIn.filter((n) => n.time >= b0 && n.time < b1);
        const lines = [];
        for (let k = 0; k <= piece.beats; k++) lines.push(`<line x1="${zx(b0 + k).toFixed(1)}" y1="${y}" x2="${zx(b0 + k).toFixed(1)}" y2="${y + rowH}" stroke="${C.line}" stroke-width="1"/>`);
        const written = bar.map((n) => {
          const x = zx(n.time), w = Math.max(4, zx(n.time + Math.min(n.duration, b1 - n.time)) - x - 2);
          return `<rect x="${x.toFixed(1)}" y="${py(n.pitch).toFixed(1)}" width="${w.toFixed(1)}" height="5" rx="2.5" fill="none" stroke="${C.muted}" stroke-width="1" opacity="0.5"/>`;
        }).join('');
        const played = bar.map((n) => {
          const shift = (offsetOf.get(n) ?? 0) * secToPulse;
          const x = zx(n.time + shift), w = Math.max(4, zx(n.time + shift + Math.min(n.duration, b1 - n.time)) - x - 2);
          return `<rect x="${x.toFixed(1)}" y="${py(n.pitch).toFixed(1)}" width="${w.toFixed(1)}" height="5" rx="2.5" fill="${n.hand === 'right' ? C.right : C.left}" opacity="${(0.3 + n.velocity * 0.7).toFixed(2)}"/>`;
        }).join('');
        return lines.join('') + written + played;
      }],
  ];

  const H = top + rows.length * (rowH + gapY) + 44;
  const body = rows.map(([title, note, render], i) => {
    const y = top + i * (rowH + gapY);
    return `<rect x="${LEFT - 12}" y="${y}" width="${W - LEFT - RIGHT + 24}" height="${rowH}" rx="10" fill="${C.panel}"/>
${barLines(y)}${render(y)}
<circle cx="44" cy="${y + 26}" r="13" fill="${C.accent}"/>
<text x="44" y="${y + 31}" font-family="${F}" font-size="15" font-weight="600" fill="#271700" text-anchor="middle">${i + 1}</text>
<text x="70" y="${y + 31}" font-family="${F}" font-size="19" font-weight="600" fill="${C.text}">${title}</text>
${wrap(note, 30).map((line, k) => `<text x="44" y="${y + 58 + k * 19}" font-family="${F}" font-size="13.5" fill="${C.muted}">${line}</text>`).join('')}`;
  }).join('');

  svgs.process = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${C.bg}"/>
<text x="44" y="58" font-family="${F}" font-size="30" font-weight="600" fill="${C.text}">How a piece is built</text>
<text x="44" y="92" font-family="${F}" font-size="17" fill="${C.muted}">Four real bars of one piece, layer by layer. No trained model: every layer is a rule plus the seed.</text>
<text x="44" y="${H - 16}" font-family="${F}" font-size="13" fill="${C.muted}">gold: the chord tones available &#183; blue: right hand &#183; green: left hand &#183; every layer is drawn from one real piece</text>
${body}</svg>`;
}

function wrap(text, max) {
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max) { lines.push(line.trim()); line = w; } else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

const browser = await puppeteer.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
for (const [name, svg] of Object.entries(svgs)) {
  const [, w, h] = svg.match(/width="(\d+)" height="(\d+)"/);
  const page = await browser.newPage();
  await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
  const transparent = name === 'logo';
  await page.setContent(`<style>html,body{margin:0;background:${transparent ? 'transparent' : C.bg}}</style>${svg}`);
  // The process diagram is a README asset; the rest is the store set.
  const dir = name === 'process' ? join(ROOT, 'docs') : PROMO;
  await page.screenshot({ path: join(dir, `${name}.png`), omitBackground: transparent });
  await page.close();
  console.log(`${name === 'process' ? 'docs' : 'dist/promo'}/${name}.png  ${w}x${h}`);
}

// The README screenshot: the running app inside a window frame.
{
  const app = await browser.newPage();
  await app.setViewport({ width: 1280, height: 760, deviceScaleFactor: 2 });
  await app.goto(APP, { waitUntil: 'networkidle0', timeout: 60000 });
  await app.waitForFunction(() => window.__pianoTest && window.__pianoTest.ready, { timeout: 60000 });
  await app.click('#play');
  await new Promise((r) => setTimeout(r, 4000));
  await app.click('#play');
  await new Promise((r) => setTimeout(r, 300));
  const h = await app.evaluate(() => Math.ceil(document.querySelector('main').getBoundingClientRect().height) + 8);
  const shot = await app.screenshot({ clip: { x: 0, y: 0, width: 1280, height: h }, encoding: 'base64' });
  const pad = 56, barH = 38, W = 1280 + pad * 2, H = h + barH + pad * 2;
  const frame = await browser.newPage();
  await frame.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  await frame.setContent(`<style>
    html,body{margin:0;background:#08090b;font:13px ${F}}
    .stage{width:${W}px;height:${H}px;display:grid;place-items:center;background:radial-gradient(120% 90% at 50% 0%, #14171c 0%, #08090b 70%)}
    .win{width:1280px;border-radius:12px;overflow:hidden;background:${C.bg};box-shadow:0 34px 90px rgba(0,0,0,.75), 0 2px 0 rgba(255,255,255,.05) inset}
    .bar{height:${barH}px;display:flex;align-items:center;gap:8px;padding:0 14px;background:${C.panel}}
    .dot{width:11px;height:11px;border-radius:50%}
    .t{margin-left:auto;margin-right:auto;color:${C.muted};font-size:12px;transform:translateX(-24px)}
  </style><div class="stage"><div class="win"><div class="bar">
    <span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span>
    <span class="dot" style="background:#28c840"></span><span class="t">${NAME}</span>
  </div><img src="data:image/png;base64,${shot}" width="1280" style="display:block"></div></div>`, { waitUntil: 'load' });
  await frame.screenshot({ path: join(ROOT, 'docs', 'screenshot.png') });
  console.log(`docs/screenshot.png  ${W}x${H} @2x`);
}
await browser.close();
