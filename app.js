import { generatePiece, makeTimeMap, performNotes, STYLES, ROOTS } from './composer.js';
import { pieceToMidi } from './midi.js';

const $ = (id) => document.getElementById(id);
const els = {
  style: $('style'), root: $('root'), mode: $('mode'), tempo: $('tempo'), tempoVal: $('tempoVal'),
  seed: $('seed'), randomSeed: $('randomSeed'), newLeft: $('newLeft'), newMelody: $('newMelody'), play: $('play'),
  midi: $('midi'), wav: $('wav'), mp3: $('mp3'), status: $('status'), title: $('title'), desc: $('desc'), roll: $('roll'), piano: $('piano'),
  volRight: $('volRight'), volRightVal: $('volRightVal'), volLeft: $('volLeft'), volLeftVal: $('volLeftVal'),
  art: $('art'), artVal: $('artVal'),
  details: $('details'), detailsModal: $('detailsModal'), detailsClose: $('detailsClose'),
};

for (const [key, s] of Object.entries(STYLES)) els.style.add(new Option(s.label, key));
for (const r of ROOTS) els.root.add(new Option(r, r));
els.root.value = 'D';

let piece = null;
let timeMap = null;
let part = null;
let playing = false;
let samplerReady = false;
let rendering = false;
let beatTable = []; // [pulse, seconds] every quarter pulse, for the playhead
let seekSeconds = 0; // playhead position while stopped
// Per-hand seeds: they follow the main seed until one hand is re-rolled on its own.
let melodySeed = null;
let leftSeed = null;

// Piano sounds. Salamander is hosted by Tone.js; the others come from the midi-js-soundfonts
// collection (General MIDI soundfonts rendered to one mp3 per key), loaded every third semitone.
const SALAMANDER = {
  urls: {
    A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', A1: 'A1.mp3',
    C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', A2: 'A2.mp3',
    C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', A3: 'A3.mp3',
    C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', A4: 'A4.mp3',
    C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', A5: 'A5.mp3',
    C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', A6: 'A6.mp3',
    C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3', A7: 'A7.mp3', C8: 'C8.mp3',
  },
  release: 1.2,
  baseUrl: 'https://tonejs.github.io/audio/salamander/',
};
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
function soundfont(path, release = 1) {
  const urls = {};
  for (let midi = 21; midi <= 108; midi += 3) {
    const name = FLAT_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
    urls[name] = name + '.mp3';
  }
  return { urls, release, baseUrl: `https://gleitz.github.io/midi-js-soundfonts/${path}-mp3/` };
}
// `gain` levels the sounds to a similar loudness (measured as RMS on the same piece).
const PIANOS = {
  salamander: { label: 'Salamander grand', config: SALAMANDER, gain: 1 },
  concert: { label: 'Concert grand', config: soundfont('MusyngKite/acoustic_grand_piano'), gain: 4.6 },
  bright: { label: 'Bright grand', config: soundfont('MusyngKite/bright_acoustic_piano'), gain: 3.7 },
  warm: { label: 'Warm grand', config: soundfont('FluidR3_GM/acoustic_grand_piano'), gain: 3.3 },
  soft: { label: 'Soft grand', config: soundfont('FatBoy/acoustic_grand_piano'), gain: 4.2 },
  electricGrand: { label: 'Electric grand', config: soundfont('MusyngKite/electric_grand_piano'), gain: 3.6 },
  honkytonk: { label: 'Honky-tonk', config: soundfont('MusyngKite/honkytonk_piano'), gain: 3.3 },
  rhodes: { label: 'Electric piano', config: soundfont('MusyngKite/electric_piano_1'), gain: 1.9 },
  harpsichord: { label: 'Harpsichord', config: soundfont('MusyngKite/harpsichord', 0.3), gain: 4 },
};
for (const [key, p] of Object.entries(PIANOS)) els.piano.add(new Option(p.label, key));
let pianoKey = 'salamander';
const samplers = new Map(); // piano key -> loaded Tone.Sampler

// ---------------------------------------------------------------------------
// Controls

function setTempoFromStyle() {
  els.tempo.value = STYLES[els.style.value].tempo;
  els.tempoVal.textContent = els.tempo.value + ' bpm';
}
const regenerate = () => { melodySeed = null; leftSeed = null; generate(); };
els.style.addEventListener('change', () => { setTempoFromStyle(); regenerate(); });
els.tempo.addEventListener('input', () => { els.tempoVal.textContent = els.tempo.value + ' bpm'; });
els.tempo.addEventListener('change', regenerate);
els.root.addEventListener('change', regenerate);
els.mode.addEventListener('change', regenerate);
els.seed.addEventListener('change', regenerate);
els.newLeft.addEventListener('click', () => { leftSeed = 1 + Math.floor(Math.random() * 999999); generate(); });
els.newMelody.addEventListener('click', () => { melodySeed = 1 + Math.floor(Math.random() * 999999); generate(); });
setTempoFromStyle();

const gain = { right: 1, left: 0.8 };
function bindVolume(input, label, hand) {
  const update = () => { gain[hand] = Number(input.value) / 100; label.textContent = input.value + '%'; };
  input.addEventListener('input', update);
  update();
}
bindVolume(els.volRight, els.volRightVal, 'right');
bindVolume(els.volLeft, els.volLeftVal, 'left');

// Articulation of the left hand: scales note lengths (staccato below 100%, more pedal above).
// Applies to playback and to every export; while playing, playback restarts from the current spot.
let articulation = 1;
const updateArticulation = () => { articulation = Number(els.art.value) / 100; els.artVal.textContent = els.art.value + '%'; };
els.art.addEventListener('input', updateArticulation);
els.art.addEventListener('change', () => { if (playing) { const pos = Tone.Transport.seconds; stop(); seekSeconds = pos; play(); } });
updateArticulation();
// The piece as it should sound: generated (or edited) notes with the articulation applied.
function articulated() {
  return piece.notes.map((n) => (n.hand === 'left' && !n.roll ? { ...n, duration: Math.max(0.1, n.duration * articulation) } : n));
}

els.randomSeed.addEventListener('click', () => { els.seed.value = 1 + Math.floor(Math.random() * 999999); regenerate(); });
els.play.addEventListener('click', () => (playing ? stop() : play()));
els.midi.addEventListener('click', downloadMidi);
els.wav.addEventListener('click', () => downloadAudio('wav'));
els.mp3.addEventListener('click', () => downloadAudio('mp3'));
window.addEventListener('resize', () => draw(playing ? Tone.Transport.seconds : seekSeconds));
window.addEventListener('keydown', (e) => {
  if (els.detailsModal.open) return;
  if (e.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON'].includes(document.activeElement.tagName)) { e.preventDefault(); if (!els.play.disabled) (playing ? stop() : play()); }
});
// The details panel: opened from one link, closed by Escape, the close link or a click outside.
els.details.addEventListener('click', () => els.detailsModal.showModal());
els.detailsClose.addEventListener('click', () => els.detailsModal.close());
els.detailsModal.addEventListener('click', (e) => { if (e.target === els.detailsModal) els.detailsModal.close(); });

// Clicking the piano roll moves the playhead.
els.roll.addEventListener('click', (e) => {
  if (!piece) return;
  const rect = els.roll.getBoundingClientRect();
  const beat = Math.max(0, Math.min(piece.totalBeats, (e.clientX - rect.left - 8) / ((els.roll.clientWidth - 16) / piece.totalBeats)));
  const sec = timeMap.toSeconds(beat);
  if (playing) Tone.Transport.seconds = sec; else { seekSeconds = sec; draw(sec); }
});

const reverb = new Tone.Reverb({ decay: 2.4, wet: 0.16 }).toDestination();
let sampler = null;

function loadSampler(key) {
  if (samplers.has(key)) return Promise.resolve(samplers.get(key));
  return new Promise((resolve, reject) => {
    const s = new Tone.Sampler({
      ...PIANOS[key].config,
      onload: () => { samplers.set(key, s); resolve(s); },
      onerror: (e) => reject(e),
    });
    s.volume.value = Tone.gainToDb(PIANOS[key].gain);
    s.connect(reverb);
  });
}

// Switching the piano never interrupts playback: the new sound loads in the background and
// takes over from the next note on; notes already sounding finish on the old one.
async function selectPiano(key) {
  pianoKey = key;
  if (!sampler) { samplerReady = false; setBusy(false); }
  setStatus(samplers.has(key) ? '' : `Loading ${PIANOS[key].label}...`);
  try {
    const s = await loadSampler(key);
    if (pianoKey !== key) return; // the user moved on to another piano meanwhile
    sampler = s;
    samplerReady = true;
    setStatus('');
    if (!piece) generate(); else if (!rendering) setBusy(false);
  } catch (e) {
    setStatus(`Could not load ${PIANOS[key].label}: ${e}`);
  }
}
els.piano.addEventListener('change', () => selectPiano(els.piano.value));
selectPiano(pianoKey);

function setStatus(text) { els.status.textContent = text; els.status.hidden = !text; }
function setBusy(busy) {
  rendering = busy;
  for (const b of [els.wav, els.mp3, els.midi]) b.disabled = busy || !piece;
  els.play.disabled = busy || !piece || !samplerReady;
}

// ---------------------------------------------------------------------------
// Generation

function generate() {
  stop();
  piece = generatePiece({
    seed: Number(els.seed.value) || 1, style: els.style.value, root: els.root.value,
    mode: els.mode.value, tempo: Number(els.tempo.value),
    melodySeed: melodySeed ?? undefined, leftSeed: leftSeed ?? undefined,
  });
  timeMap = makeTimeMap(piece);
  beatTable = [];
  for (let b = 0; b <= piece.totalBeats; b += 0.25) beatTable.push([b, timeMap.toSeconds(b)]);
  seekSeconds = 0;
  updateTitle();
  els.desc.textContent = piece.description;
  setBusy(false);
  draw();
}

function updateTitle() {
  const len = Math.round(timeMap.totalSeconds);
  const mm = Math.floor(len / 60), ss = String(len % 60).padStart(2, '0');
  const seeds = [`seed ${piece.seed}`, melodySeed !== null && `melody ${piece.melodySeed}`, leftSeed !== null && `left hand ${piece.leftSeed}`].filter(Boolean).join(' · ');
  els.title.innerHTML = `<strong>${STYLES[piece.style].label} in ${piece.root} ${piece.mode}</strong> <span class="meta">${seeds} · ${piece.totalBars} bars · ${piece.notes.length} notes · ${mm}:${ss}</span>`;
}

// Note events with absolute seconds, for both live playback and offline rendering. Three things
// happen here and nowhere else, so the written notes and the editor stay on the grid:
// the performance offsets (melody lead, micro-timing, swing), the sustain pedal, and the
// perceptual velocity curve.
function noteEvents() {
  const offsets = performNotes(piece);
  const spans = piece.chords
    .map((c) => ({ t: c.bar * piece.beats + (c.start ?? 0), pcs: c.pcs ?? [] }))
    .sort((a, b) => a.t - b.t);
  const spanIndexAt = (t) => {
    let i = 0;
    while (i + 1 < spans.length && spans[i + 1].t <= t + 1e-6) i++;
    return i;
  };
  const notes = articulated();
  return notes.map((n, i) => {
    const t = Math.max(0, timeMap.toSeconds(n.time) + (offsets[i] ?? 0));
    let endPulse = n.time + n.duration;
    // The pedal holds the accompaniment until the harmony changes, which is what stops broken
    // chords sounding like a music box. It lifts just before the new chord so nothing smears.
    if (n.hand === 'left' && n.pedal !== false && spans.length) {
      const k = spanIndexAt(n.time);
      if (spans[k].pcs.includes(((n.pitch % 12) + 12) % 12)) {
        const boundary = spans[k + 1] ? spans[k + 1].t - 0.05 : piece.totalBeats;
        endPulse = Math.max(endPulse, boundary);
      }
    }
    const held = endPulse > n.time + n.duration + 1e-6;
    return { time: t, dur: Math.max(0.05, timeMap.toSeconds(endPulse) - t), pitch: n.pitch, vel: n.velocity, hand: n.hand, held, pedal: n.pedal !== false };
  });
}

// Velocity maps to gain through a curve: the same spread of velocities then covers a real dynamic
// range instead of a few decibels, and the accompaniment sits under the melody by itself.
function gainFor(e) { return Math.min(1, Math.pow(e.vel, 1.6) * 1.55 * gain[e.hand]); }
// A short release is a finger lifting, a long one is the pedal still down.
function releaseFor(e) {
  const base = e.hand === 'right' ? 0.35 : !e.pedal ? (e.dur < 0.3 ? 0.08 : 0.2) : e.held ? 0.7 : 0.4;
  return base * Math.max(0.4, articulation);
}

// ---------------------------------------------------------------------------
// Playback

async function play() {
  if (!piece || !samplerReady || rendering) return;
  await Tone.start();
  part = new Tone.Part((time, e) => {
    const vel = gainFor(e);
    if (vel > 0.01) { sampler.release = releaseFor(e); sampler.triggerAttackRelease(Tone.Frequency(e.pitch, 'midi'), e.dur, time, vel); }
  }, noteEvents()).start(0);
  Tone.Transport.stop();
  Tone.Transport.seconds = seekSeconds;
  Tone.Transport.start();
  playing = true;
  els.play.textContent = 'Stop';
  els.play.classList.add('active');
  requestAnimationFrame(tick);
  Tone.Transport.scheduleOnce(() => stop(), timeMap.totalSeconds);
}

function stop() {
  if (playing) seekSeconds = Math.min(Tone.Transport.seconds, timeMap.totalSeconds - 1.5);
  if (timeMap && seekSeconds >= timeMap.totalSeconds - 1.6) seekSeconds = 0; // end of piece: restart
  if (part) { part.dispose(); part = null; }
  Tone.Transport.stop();
  Tone.Transport.cancel();
  playing = false;
  els.play.textContent = 'Play';
  els.play.classList.remove('active');
  if (piece) draw(seekSeconds);
}

function tick() {
  if (!playing) return;
  draw(Tone.Transport.seconds);
  requestAnimationFrame(tick);
}

function secondsToBeat(sec) {
  let lo = 0, hi = beatTable.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (beatTable[mid][1] <= sec) lo = mid; else hi = mid - 1;
  }
  const [b0, s0] = beatTable[lo];
  const next = beatTable[lo + 1];
  if (!next) return b0;
  return b0 + (sec - s0) / (next[1] - s0) * (next[0] - b0);
}

// ---------------------------------------------------------------------------
// Piano roll

function draw(sec) {
  const c = els.roll;
  const dpr = window.devicePixelRatio || 1;
  const W = c.clientWidth, H = c.clientHeight;
  if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (!piece) return;

  const padL = 8, padR = 8, padT = 26, padB = 24;
  const low = 24, high = 90; // C1..F#6
  const pxBeat = (W - padL - padR) / piece.totalBeats;
  const pxNote = (H - padT - padB) / (high - low + 1);
  const x = (beat) => padL + beat * pxBeat;
  const y = (pitch) => padT + (high - pitch) * pxNote;
  const css = getComputedStyle(document.documentElement);
  const color = (name) => css.getPropertyValue(name).trim();

  // Bar lines and section shading.
  ctx.strokeStyle = color('--line');
  ctx.lineWidth = 1;
  for (let b = 0; b <= piece.totalBars; b++) {
    ctx.beginPath(); ctx.moveTo(x(b * piece.beats), padT); ctx.lineTo(x(b * piece.beats), H - padB); ctx.stroke();
  }
  ctx.font = '12px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  piece.sections.forEach((s, i) => {
    const endBar = piece.sections[i + 1]?.bar ?? piece.totalBars;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(x(s.bar * piece.beats), padT, (endBar - s.bar) * piece.beats * pxBeat, H - padT - padB);
    ctx.fillStyle = color('--text');
    ctx.fillText(s.name, x(s.bar * piece.beats) + 4, 6);
  });
  // Chord names.
  ctx.fillStyle = color('--muted');
  ctx.font = '10px system-ui, sans-serif';
  for (const ch of piece.chords) {
    // Second chord of a bar only when there is room for it.
    if ((ch.start ?? 0) > 0 && pxBeat * (piece.beats - ch.start) < 22) continue;
    ctx.fillText(ch.chord, x(ch.bar * piece.beats + (ch.start ?? 0)) + 3, H - padB + 6);
  }

  // Notes.
  const cRight = color('--right'), cLeft = color('--left');
  for (const n of piece.notes) {
    ctx.fillStyle = n.hand === 'right' ? cRight : cLeft;
    ctx.globalAlpha = 0.45 + n.velocity * 0.55;
    const w = Math.max(2, n.duration * pxBeat - 1);
    ctx.fillRect(x(n.time), y(n.pitch), w, Math.max(2, pxNote - 1));
  }
  ctx.globalAlpha = 1;

  // Playhead.
  if (sec !== undefined && sec > 0) {
    const beat = secondsToBeat(sec);
    ctx.strokeStyle = color('--accent');
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x(beat), padT - 4); ctx.lineTo(x(beat), H - padB + 4); ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Export

// Inside an iframe (itch.io embeds the page in one) a sandboxed download can be refused, so the
// link also opens in a new tab, where the browser saves or plays the file instead.
const framed = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  if (framed) { a.target = '_blank'; a.rel = 'noopener'; }
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function fileBase() { const extra = (melodySeed !== null ? `-m${piece.melodySeed}` : '') + (leftSeed !== null ? `-l${piece.leftSeed}` : ''); return `${piece.style}-${piece.root}-${piece.mode}-seed${piece.seed}${extra}-${pianoKey}`; }

function downloadMidi() {
  if (!piece) return;
  saveBlob(new Blob([pieceToMidi({ ...piece, notes: articulated() })], { type: 'audio/midi' }), fileBase() + '.mid');
}

// Renders the piece offline with the same sampler and reverb as live playback.
async function renderAudio() {
  const events = noteEvents();
  const buffer = await Tone.Offline(async ({ transport }) => {
    const s = new Tone.Sampler(PIANOS[pianoKey].config);
    s.volume.value = Tone.gainToDb(PIANOS[pianoKey].gain);
    const rev = new Tone.Reverb({ decay: 2.4, wet: 0.16 }).toDestination();
    s.connect(rev);
    await Tone.loaded();
    await rev.ready;
    new Tone.Part((time, e) => {
      const vel = gainFor(e);
      if (vel > 0.01) { s.release = releaseFor(e); s.triggerAttackRelease(Tone.Frequency(e.pitch, 'midi'), e.dur, time, vel); }
    }, events).start(0);
    transport.start(0);
  }, timeMap.totalSeconds + 1.5, 2, 44100);
  return buffer.get(); // native AudioBuffer
}

function toPcm16(buffer) {
  const channels = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const f = buffer.getChannelData(c);
    const out = new Int16Array(f.length);
    for (let i = 0; i < f.length; i++) { const v = Math.max(-1, Math.min(1, f[i])); out[i] = v < 0 ? v * 0x8000 : v * 0x7fff; }
    channels.push(out);
  }
  return channels;
}

function encodeWav(buffer) {
  const channels = toPcm16(buffer);
  const n = channels[0].length, ch = channels.length, rate = buffer.sampleRate;
  const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
  data.setUint32(24, rate, true); data.setUint32(28, rate * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true);
  str(36, 'data'); data.setUint32(40, n * ch * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { data.setInt16(o, channels[c][i], true); o += 2; }
  return new Blob([data], { type: 'audio/wav' });
}

function encodeMp3(buffer) {
  const [left, right] = toPcm16(buffer);
  const encoder = new lamejs.Mp3Encoder(2, buffer.sampleRate, 192);
  const chunks = [];
  const block = 1152;
  for (let i = 0; i < left.length; i += block) {
    const out = encoder.encodeBuffer(left.subarray(i, i + block), (right ?? left).subarray(i, i + block));
    if (out.length) chunks.push(out);
  }
  const end = encoder.flush();
  if (end.length) chunks.push(end);
  return new Blob(chunks, { type: 'audio/mpeg' });
}

async function downloadAudio(format) {
  if (!piece || !samplerReady || rendering) return;
  stop();
  setBusy(true);
  setStatus(`Rendering ${format.toUpperCase()}...`);
  try {
    const buffer = await renderAudio();
    const blob = format === 'wav' ? encodeWav(buffer) : encodeMp3(buffer);
    saveBlob(blob, `${fileBase()}.${format}`);
    setStatus('');
  } catch (e) {
    setStatus(`Rendering failed: ${e.message || e}`);
  } finally {
    setBusy(false);
  }
}

// Test hook for headless checks (not used by the page itself).
window.__pianoTest = { renderAudio, encodeWav, encodeMp3, selectPiano, get piece() { return piece; }, get ready() { return samplerReady; } };
