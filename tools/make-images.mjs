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

{ // How a piece is built: the whole form first, then four real bars of it, layer by layer.
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

  // Drawn to sit on the itch.io page: its background is the ground, so there are no panels and
  // nothing is inset. Every row says something the row above it does not.
  const W = 1240, LEFT = 250, gapY = 44, top = 118;
  const heights = [126, 176, 176, 176];
  const pxIn = (a, b) => (t) => LEFT + ((t - a) / (b - a)) * (W - LEFT);
  const px = pxIn(from, to);
  const ZOOM = piece.beats / 2; // the last row magnifies half a bar

  const chordsIn = piece.chords.filter((c) => { const t = c.bar * piece.beats + (c.start ?? 0); return t >= from - 1e-6 && t < to; });
  const chordAt = (t) => { let cur = chordsIn[0]; for (const c of chordsIn) if (c.bar * piece.beats + (c.start ?? 0) <= t + 1e-6) cur = c; return cur; };
  const notesIn = piece.notes.filter((n) => n.time >= from && n.time < to);
  const melody = notesIn.filter((n) => n.hand === 'right');
  const offsets = performNotes(piece);
  const offsetOf = new Map(piece.notes.map((n, i) => [n, offsets[i]]));
  const secToPulse = piece.tempo / 60;

  // The performance figures are measured, not asserted.
  const byOnset = new Map();
  piece.notes.forEach((n, i) => {
    const k = n.time.toFixed(3);
    if (!byOnset.has(k)) byOnset.set(k, []);
    byOnset.get(k).push([n, offsets[i]]);
  });
  const leads = [];
  for (const v of byOnset.values()) {
    const r = v.filter(([n]) => n.hand === 'right'), l = v.filter(([n]) => n.hand === 'left');
    if (r.length && l.length) leads.push((l.reduce((a, [, o]) => a + o, 0) / l.length - r.reduce((a, [, o]) => a + o, 0) / r.length) * 1000);
  }
  const lead = Math.round(leads.reduce((a, b) => a + b, 0) / Math.max(1, leads.length));
  const maxShift = Math.round(Math.max(...offsets.map(Math.abs)) * 1000);

  const range = (ns, pad = 1) => [Math.min(...ns.map((n) => n.pitch)) - pad, Math.max(...ns.map((n) => n.pitch)) + pad];
  const scale = (y0, [lo, hi], h, inset = 6) => (p) => y0 + h - inset - ((p - lo) / (hi - lo)) * (h - inset * 2);

  const stripes = (y0, h, step) => {
    const out = [];
    for (let t = from, i = 0; t < to - 1e-6; t += step, i++) {
      if (i % 2) continue;
      out.push(`<rect x="${px(t).toFixed(1)}" y="${y0}" width="${(px(t + step) - px(t)).toFixed(1)}" height="${h}" fill="#ffffff" opacity="0.02"/>`);
    }
    return out.join('');
  };

  const bars = (ns, py, h = 7) => ns.map((n) => {
    const x = px(n.time), w = Math.max(h, px(n.time + Math.min(n.duration, to - n.time)) - x - 2);
    return `<rect x="${x.toFixed(1)}" y="${(py(n.pitch) - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="${h / 2}" fill="${n.hand === 'right' ? C.right : C.left}" opacity="${(0.45 + n.velocity * 0.55).toFixed(2)}"/>`;
  }).join('');

  const rows = [
    ['Form', 'A whole piece first: sections, a varied reprise, a coda. Gold marks the four bars the rest of this picture zooms into.', (y, h) => {
      const fx = (b) => LEFT + (b / piece.totalBars) * (W - LEFT);
      const [lo, hi] = range(piece.notes, 1);
      const rollTop = y + 20, rollH = h - 52;
      const py = scale(rollTop, [lo, hi], rollH, 2);
      const out = [];
      (piece.sections ?? []).forEach((s, i) => {
        const end = piece.sections[i + 1]?.bar ?? piece.totalBars;
        if (i % 2 === 0) out.push(`<rect x="${fx(s.bar).toFixed(1)}" y="${rollTop}" width="${(fx(end) - fx(s.bar)).toFixed(1)}" height="${rollH}" fill="#ffffff" opacity="0.022"/>`);
        const lx = Math.min(fx(s.bar) + 5, W - s.name.length * 8 - 2);
        out.push(`<text x="${lx.toFixed(1)}" y="${y + 12}" font-family="${F}" font-size="13" font-weight="600" fill="${C.text}">${s.name}</text>`);
      });
      for (const n of piece.notes) {
        const x = fx(n.time / piece.beats), w = Math.max(1.6, fx((n.time + n.duration) / piece.beats) - x - 0.4);
        out.push(`<rect x="${x.toFixed(1)}" y="${(py(n.pitch) - 1.1).toFixed(1)}" width="${w.toFixed(1)}" height="2.2" rx="1.1" fill="${n.hand === 'right' ? C.right : C.left}" opacity="0.75"/>`);
      }
      const wx = fx(from / piece.beats), wx1 = fx(to / piece.beats);
      out.push(`<rect x="${wx.toFixed(1)}" y="${rollTop}" width="${(wx1 - wx).toFixed(1)}" height="${rollH}" fill="${C.accent}" opacity="0.1"/>`);
      out.push(`<rect x="${wx.toFixed(1)}" y="${(rollTop + rollH + 7).toFixed(1)}" width="${(wx1 - wx).toFixed(1)}" height="3" rx="1.5" fill="${C.accent}"/>`);
      out.push(`<text x="${Math.min(wx, W - 190).toFixed(1)}" y="${(rollTop + rollH + 27).toFixed(1)}" font-family="${F}" font-size="13" fill="${C.accent}">bars ${win.bar + 1}-${win.bar + BARS}, below</text>`);
      return out.join('');
    }],
    ['Harmony', 'Rules choose the chords bar by bar, and where the phrase has to land. The brighter gold is the root of each chord.', (y, h) => {
      const [lo, hi] = range(melody, 2);
      const py = scale(y, [lo - 12, hi], h);
      const out = [];
      chordsIn.forEach((c, i) => {
        const t0 = c.bar * piece.beats + (c.start ?? 0);
        const next = chordsIn[i + 1];
        const t1 = next ? next.bar * piece.beats + (next.start ?? 0) : to;
        const root = (c.pcs ?? [])[0];
        for (let p = Math.ceil(lo - 12); p <= hi; p++) {
          const pc = ((p % 12) + 12) % 12;
          if (!(c.pcs ?? []).includes(pc)) continue;
          out.push(`<rect x="${(px(t0) + 4).toFixed(1)}" y="${(py(p) - 2.5).toFixed(1)}" width="${(px(t1) - px(t0) - 10).toFixed(1)}" height="5" rx="2.5" fill="${C.accent}" opacity="${pc === root ? 0.72 : 0.3}"/>`);
        }
      });
      return out.join('');
    }],
    ['Both hands, one chord', 'There is no second idea underneath: the melody takes a chord tone on every strong beat (gold rings) and steps between them, the left hand spreads the same notes below it.', (y, h) => {
      const py = scale(y, range(notesIn, 1), h);
      const rings = melody.filter((n) => n.strong !== false && !n.ornament && (chordAt(n.time).pcs ?? []).includes(n.pitch % 12))
        .map((n) => `<circle cx="${px(n.time).toFixed(1)}" cy="${py(n.pitch).toFixed(1)}" r="6.5" fill="none" stroke="${C.accent}" stroke-width="1.6" opacity="0.85"/>`).join('');
      return rings + bars(notesIn, py);
    }],
    ['Performance', `Nothing is quantised: the melody arrives about ${lead} ms ahead of the left hand, single notes move up to ${maxShift} ms, and the last two bars slow by up to 40%.`, (y, h) => {
      const b0 = from, b1 = from + ZOOM;
      const zx = pxIn(b0, b1);
      const bar = notesIn.filter((n) => n.time >= b0 && n.time < b1);
      const py = scale(y, range(bar, 1), h);
      const out = [];
      for (const n of bar) {
        const x0 = zx(n.time), x1 = zx(n.time + (offsetOf.get(n) ?? 0) * secToPulse), cy = py(n.pitch);
        if (Math.abs(x1 - x0) > 1.5) out.push(`<line x1="${x0.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${C.muted}" stroke-width="1" opacity="0.4"/>`);
        out.push(`<circle cx="${x0.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.5" fill="none" stroke="${C.muted}" stroke-width="1.3" opacity="0.55"/>`);
        out.push(`<circle cx="${x1.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.5" fill="${n.hand === 'right' ? C.right : C.left}" opacity="${(0.5 + n.velocity * 0.5).toFixed(2)}"/>`);
      }
      out.push(`<text x="${W - 310}" y="${y + 16}" font-family="${F}" font-size="13" fill="${C.muted}">half a bar, magnified</text>`);
      out.push(`<circle cx="${W - 186}" cy="${y + 11}" r="4.5" fill="none" stroke="${C.muted}" stroke-width="1.3" opacity="0.6"/><text x="${W - 174}" y="${y + 16}" font-family="${F}" font-size="13" fill="${C.muted}">written</text>`);
      out.push(`<circle cx="${W - 100}" cy="${y + 11}" r="4.5" fill="${C.right}"/><text x="${W - 88}" y="${y + 16}" font-family="${F}" font-size="13" fill="${C.muted}">played</text>`);
      return out.join('');
    }],
  ];

  const rowY = [];
  let cursor = top;
  for (const h of heights) { rowY.push(cursor); cursor += h + gapY; }
  const H = cursor - gapY + 40;

  const body = rows.map(([title, note, render], i) => {
    const y = rowY[i], h = heights[i];
    const back = i === 0 ? '' : stripes(y, h, i === rows.length - 1 ? (to - from) / ZOOM : piece.beats);
    return `${back}${render(y, h)}
<text x="0" y="${y + 24}" font-family="${F}" font-size="21" font-weight="600" fill="${C.text}"><tspan fill="${C.accent}">${i + 1}</tspan><tspan dx="13">${title}</tspan></text>
${wrap(note, 30).map((line, k) => `<text x="0" y="${y + 55 + k * 22}" font-family="${F}" font-size="14.5" fill="${C.muted}">${line}</text>`).join('')}`;
  }).join('');

  svgs.process = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${C.panel}"/>
<text x="0" y="30" font-family="${F}" font-size="32" font-weight="600" fill="${C.accent}">How a piece is built</text>
<text x="0" y="62" font-family="${F}" font-size="16" fill="${C.muted}">One real piece, drawn from its own output. No trained model: every layer is a rule plus the seed.</text>
${chordsIn.map((c) => `<text x="${(px(c.bar * piece.beats + (c.start ?? 0)) + 6).toFixed(1)}" y="${rowY[1] - 12}" font-family="${F}" font-size="17" font-weight="600" fill="${C.accent}">${c.chord}</text>`).join('')}
<text x="0" y="${H - 8}" font-family="${F}" font-size="14" fill="${C.muted}">gold: the chords &#183; blue: right hand &#183; green: left hand &#183; Nocturne in ${piece.root} ${piece.mode}, seed ${piece.seed}</text>
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
  await page.setContent(`<style>html,body{margin:0;background:${transparent ? 'transparent' : name === 'process' ? C.panel : C.bg}}</style>${svg}`);
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
