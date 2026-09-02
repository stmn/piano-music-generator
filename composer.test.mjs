import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePiece, makeTimeMap, performNotes, STYLES, ROOTS } from './composer.js';
import { pieceToMidi } from './midi.js';

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SEEDS = [1, 7, 42, 1234, 99999, 3, 8, 21, 55, 77, 101, 202, 303, 404, 505, 606, 707, 808, 909, 31337];
const cases = [];
for (const style of Object.keys(STYLES)) for (const mode of ['major', 'minor']) for (const seed of SEEDS) cases.push({ style, mode, seed, root: ROOTS[seed % 12] });

// Top line of the melody: simultaneous notes (octaves, final chord) count as one.
function topLine(piece) {
  const melody = piece.notes.filter((n) => n.hand === 'right').sort((a, b) => a.time - b.time || a.pitch - b.pitch);
  const top = [];
  for (const n of melody) {
    if (top.length && Math.abs(top[top.length - 1].time - n.time) < 1e-6) top[top.length - 1] = n.pitch > top[top.length - 1].pitch ? n : top[top.length - 1];
    else top.push(n);
  }
  return top;
}

test('the same seed gives the same piece', () => {
  assert.deepEqual(generatePiece({ seed: 5 }).notes, generatePiece({ seed: 5 }).notes);
});

test('different seeds give different pieces', () => {
  assert.notDeepEqual(generatePiece({ seed: 5 }).notes, generatePiece({ seed: 6 }).notes);
});

for (const c of cases) {
  test(`invariants ${c.style}/${c.mode}/${c.root}/seed=${c.seed}`, () => {
    const p = generatePiece(c);
    const beats = STYLES[c.style].beats;
    assert.ok(p.totalBars >= 24 && p.totalBars <= 52, `length ${p.totalBars}`);
    assert.equal(p.totalBeats, p.totalBars * beats);
    assert.ok(p.notes.length > 80);
    for (const n of p.notes) {
      assert.ok(n.pitch >= 21 && n.pitch <= 108, `pitch off the keyboard: ${n.pitch}`);
      assert.ok(n.velocity > 0 && n.velocity <= 1, `velocity ${n.velocity}`);
      assert.ok(n.duration > 0);
      assert.ok(n.time >= 0 && n.time + n.duration <= p.totalBeats + 1e-6, `note outside the piece: ${n.time}+${n.duration}`);
    }
    const top = topLine(p);
    assert.equal(top[top.length - 1].pitch % 12, NAMES.indexOf(c.root), 'last melody note is the tonic');
    for (let i = 1; i < top.length; i++) {
      const leap = Math.abs(top[i].pitch - top[i - 1].pitch);
      assert.ok(leap <= 12, `melody leap of ${leap} semitones at t=${top[i].time}`);
    }
    // Melody in every bar after the intro, accompaniment in every bar.
    const melody = p.notes.filter((n) => n.hand === 'right');
    const intro = p.sections[1].bar;
    for (let b = intro; b < p.totalBars; b++) {
      assert.ok(melody.some((n) => n.time < (b + 1) * beats - 1e-6 && n.time + n.duration > b * beats + 1e-6), `no melody in bar ${b}`);
    }
    // The accompaniment sounds in every bar (a held final chord counts, like the melody check).
    const left = p.notes.filter((n) => n.hand === 'left');
    for (let b = 0; b < p.totalBars; b++) {
      assert.ok(left.some((n) => n.time < (b + 1) * beats - 1e-6 && n.time + n.duration > b * beats + 1e-6), `no accompaniment in bar ${b}`);
    }
    // Note budget: nothing faster than the tempo allows.
    const secPerPulse = 60 / p.tempo;
    const onsets = [...new Set(melody.filter((n) => !n.ornament && !n.roll).map((n) => n.time))].sort((a, b) => a - b);
    let shortest = Infinity;
    for (let i = 1; i < onsets.length; i++) shortest = Math.min(shortest, onsets[i] - onsets[i - 1]);
    assert.ok(shortest * secPerPulse >= 1 / 6.5 - 1e-6, `melody too fast: ${(shortest * secPerPulse).toFixed(3)} s between notes`);
    assert.equal(new Set(p.chords.map((x) => x.bar)).size, p.totalBars);
    // Repeat guard: the left hand never strikes the identical set of pitches more than twice in a row.
    const strikes = [];
    for (const n of left.sort((a, b) => a.time - b.time || a.pitch - b.pitch)) {
      const last = strikes[strikes.length - 1];
      if (last && Math.abs(last.time - n.time) < 1e-6) last.p.push(n.pitch); else strikes.push({ time: n.time, p: [n.pitch] });
    }
    // Rolled chords: notes within an eighth of a pulse are one strike.
    const merged = [];
    let prevTime = -99;
    for (const s of strikes) {
      const last = merged[merged.length - 1];
      if (last && s.time - prevTime < 0.1) last.p.push(...s.p); else merged.push({ time: s.time, p: [...s.p] });
      prevTime = s.time;
    }
    const keys = merged.map((s) => s.p.sort((a, b) => a - b).join(','));
    let run = 1;
    for (let i = 1; i < keys.length; i++) {
      run = keys[i] === keys[i - 1] ? run + 1 : 1;
      assert.ok(run <= 2, `left hand repeats the same strike ${run} times at t=${merged[i].time}`);
      // Two strikes alternating for more than two cycles.
      if (i >= 4 && keys[i] === keys[i - 2] && keys[i - 1] === keys[i - 3] && keys[i - 2] === keys[i - 4]) {
        assert.fail(`left hand alternates two strikes for too long at t=${merged[i].time}`);
      }
    }
    // No single pitch hammered more than 4 times in a row at eighth-note spacing or faster.
    const lastHit = {}, hits = {};
    for (const n of left) {
      if (n.roll) continue; // a rolled chord is one strike, not a repetition
      const gap = lastHit[n.pitch] === undefined ? 99 : n.time - lastHit[n.pitch];
      if (gap < 1e-6) continue;
      hits[n.pitch] = gap <= 0.5 + 1e-6 ? (hits[n.pitch] || 1) + 1 : 1;
      lastHit[n.pitch] = n.time;
      assert.ok(hits[n.pitch] <= 4, `pitch ${n.pitch} hammered ${hits[n.pitch]} times in a row at t=${n.time}`);
    }
    assert.ok(p.description.length > 20);
    assert.ok(!/[ąćęłńóśźż]/.test(p.description));
  });
}

test('diversity: left hand, form and description differ across seeds', () => {
  const N = 300;
  for (const style of ['sonatina', 'waltz', 'barcarolle']) {
    const left = new Set(), desc = new Set(), forms = new Set(), rhythms = new Set();
    const beats = STYLES[style].beats;
    for (let s = 1; s <= N; s++) {
      const p = generatePiece({ seed: s, style });
      left.add(p.features.leftSignature);
      desc.add(p.description);
      forms.add(p.features.form + p.features.introBars + p.features.codaBars);
      const m = p.notes.filter((n) => n.hand === 'right' && n.time >= p.sections[1].bar * beats && n.time < (p.sections[1].bar + 1) * beats);
      rhythms.add(m.map((n) => n.duration.toFixed(2)).join(','));
    }
    assert.ok(left.size >= N * 0.8, `${style}: left-hand figurations ${left.size}/${N}`);
    assert.ok(desc.size >= N * 0.95, `${style}: descriptions ${desc.size}/${N}`);
    assert.ok(forms.size >= 10, `${style}: forms ${forms.size}`);
    assert.ok(rhythms.size >= N * 0.08, `${style}: first-bar rhythms ${rhythms.size}/${N}`);
  }
});

test('the time map is monotonic and slows down at the end', () => {
  const p = generatePiece({ seed: 3, style: 'waltz' });
  const tm = makeTimeMap(p);
  let prev = -1;
  for (let b = 0; b <= p.totalBeats; b += 0.25) { const s = tm.toSeconds(b); assert.ok(s > prev); prev = s; }
  const normal = tm.toSeconds(10) - tm.toSeconds(9);
  const end = tm.toSeconds(p.totalBeats) - tm.toSeconds(p.totalBeats - 1);
  assert.ok(end > normal * 1.3);
});

test('midi has valid headers, also in 6/8', () => {
  for (const style of ['sonatina', 'barcarolle']) {
    const p = generatePiece({ seed: 11, style, mode: 'minor', root: 'A' });
    const bytes = pieceToMidi(p);
    assert.equal(String.fromCharCode(...bytes.slice(0, 4)), 'MThd');
    assert.equal(String.fromCharCode(...bytes.slice(14, 18)), 'MTrk');
    const len = (bytes[18] << 24) | (bytes[19] << 16) | (bytes[20] << 8) | bytes[21];
    assert.equal(bytes.length, 22 + len);
    assert.deepEqual([...bytes.slice(-4)], [0x00, 0xff, 0x2f, 0x00]);
    // Time signature meta event: 4/4 or 6/8.
    const idx = [...bytes].findIndex((b, i) => b === 0xff && bytes[i + 1] === 0x58);
    assert.deepEqual([bytes[idx + 3], bytes[idx + 4]], style === 'barcarolle' ? [6, 3] : [4, 2]);
  }
});

test('blues: twelve-bar choruses, seventh chords, blues-scale melody', () => {
  for (const mode of ['major', 'minor']) for (const seed of [1, 2, 3, 4, 5]) {
    const p = generatePiece({ seed, style: 'blues', mode, root: 'G' });
    assert.equal(p.sections.map((s) => s.name).join(','), 'Intro,Chorus 1,Chorus 2,Chorus 3,Coda');
    const c1 = p.sections[1].bar, c2 = p.sections[2].bar;
    assert.equal(c2 - c1, 12);
    assert.ok(p.chords.every((c) => /7$/.test(c.chord)), 'every chord is a seventh');
    const root = 7; // G
    const chordPcs = new Set([root, (root + 4) % 12, (root + 7) % 12, (root + 10) % 12, (root + 5) % 12, (root + 9) % 12, (root + 3) % 12, (root + 2) % 12, (root + 11) % 12, (root + 8) % 12]);
    const blues = new Set((mode === 'major' ? [0, 2, 3, 4, 7, 9, 10] : [0, 3, 5, 6, 7, 10]).map((i) => (root + i) % 12));
    for (const n of p.notes.filter((n) => n.hand === 'right' && !n.ornament)) {
      assert.ok(blues.has(n.pitch % 12) || chordPcs.has(n.pitch % 12), `pitch class ${n.pitch % 12} outside blues vocabulary`);
    }
  }
});

test('hands can be re-rolled independently', () => {
  for (const style of ['nocturne', 'waltz', 'blues']) {
    const base = generatePiece({ seed: 9, style });
    const newLeft = generatePiece({ seed: 9, style, leftSeed: 77 });
    const newMelody = generatePiece({ seed: 9, style, melodySeed: 77 });
    const right = (p) => p.notes.filter((n) => n.hand === 'right').map((n) => [n.time, n.pitch, n.duration]);
    // New left hand: the melody is identical note for note, the figuration differs.
    assert.deepEqual(right(newLeft), right(base));
    assert.notEqual(newLeft.features.leftSignature, base.features.leftSignature);
    // New melody: the melody differs, the left-hand figuration is the same.
    assert.notDeepEqual(right(newMelody), right(base));
    assert.equal(newMelody.features.leftSignature, base.features.leftSignature);
    assert.deepEqual(newMelody.chords, base.chords);
  }
});

test('harmony: no unprepared six-four, no chord tones below C3, no voice crossing', () => {
  const NAMES2 = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (const style of ['nocturne', 'waltz', 'march', 'barcarolle']) for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const p = generatePiece({ seed, style, mode: seed % 2 ? 'major' : 'minor', root: 'D' });
    const left = p.notes.filter((n) => n.hand === 'left');
    // Chord tones (anything above the bass register) never sound below C3.
    const byTime = new Map();
    for (const n of left) { const k = n.time.toFixed(3); byTime.set(k, [...(byTime.get(k) ?? []), n.pitch]); }
    for (const [, ps] of byTime) {
      const low = ps.filter((x) => x < 48).sort((a, b) => a - b);
      for (let i = 1; i < low.length; i++) {
        assert.ok(low[i] - low[i - 1] >= 5 || low[i] - low[i - 1] === 0, `muddy interval ${low[i] - low[i - 1]} below C3`);
      }
    }
    // The accompaniment stays under the melody's top voice. It may fill between a melody note and
    // its octave doubling; a rare crossing survives where the anti-repetition guards need the room,
    // so this is a strong bound rather than an absolute one.
    const melody = p.notes.filter((n) => n.hand === 'right' && !n.ornament);
    let crossing = 0, counted = 0;
    for (const n of left) {
      if (n.roll) continue;
      const over = melody.filter((m) => m.time <= n.time + 1e-6 && m.time + m.duration > n.time + 1e-6);
      if (!over.length) continue;
      counted++;
      if (n.pitch >= Math.max(...over.map((m) => m.pitch))) crossing++;
    }
    assert.ok(crossing / Math.max(1, counted) < 0.04, `${style}/${seed}: ${crossing}/${counted} accompaniment notes cross the melody`);
  }
});

test('melody: notes outside the chord are approached and left by step', () => {
  let total = 0, byLeap = 0;
  for (const style of ['nocturne', 'sonatina', 'minuet', 'lullaby']) for (const seed of [1, 2, 3, 4, 5, 6]) {
    const p = generatePiece({ seed, style, mode: seed % 2 ? 'major' : 'minor', root: 'G' });
    const chordAtTime = (t) => {
      let cur = null;
      for (const c of p.chords) { const ct = c.bar * p.beats + (c.start ?? 0); if (ct <= t + 1e-6) cur = c; }
      return cur;
    };
    const mel = p.notes.filter((n) => n.hand === 'right' && !n.ornament && !n.roll).sort((a, b) => a.time - b.time || b.pitch - a.pitch);
    const line = [];
    for (const n of mel) if (!line.length || Math.abs(line[line.length - 1].time - n.time) > 1e-6) line.push(n);
    for (let i = 1; i < line.length - 1; i++) {
      const c = chordAtTime(line[i].time);
      if (!c || !c.pcs || c.pcs.includes(line[i].pitch % 12)) continue;
      total++;
      if (Math.abs(line[i + 1].pitch - line[i].pitch) > 2) byLeap++;
    }
  }
  assert.ok(total > 50, `too few non-chord tones to judge: ${total}`);
  assert.ok(byLeap / total < 0.2, `${Math.round(100 * byLeap / total)}% of non-chord tones are left by leap`);
});

test('dynamics: the melody covers a real range and the styles differ', () => {
  const levels = [];
  for (const style of ['lullaby', 'nocturne', 'sonatina', 'march']) {
    const vs = [];
    for (const seed of [1, 2, 3, 4]) {
      const p = generatePiece({ seed, style, root: 'C' });
      for (const n of p.notes) if (n.hand === 'right' && !n.ornament) vs.push(n.velocity);
    }
    vs.sort((a, b) => a - b);
    const lo = vs[Math.floor(vs.length * 0.05)], hi = vs[Math.floor(vs.length * 0.95)];
    levels.push(vs.reduce((s, v) => s + v, 0) / vs.length);
    assert.ok(20 * Math.log10(hi / lo) > 3.5, `${style}: only ${(20 * Math.log10(hi / lo)).toFixed(1)} dB of melody range`);
  }
  assert.ok(Math.max(...levels) - Math.min(...levels) > 0.1, 'every style sits at the same level');
});

test('performance layer: bounded, deterministic, and it moves the hands apart', () => {
  const p = generatePiece({ seed: 12, style: 'nocturne' });
  const a = performNotes(p), b = performNotes(p);
  assert.deepEqual(a, b);
  assert.equal(a.length, p.notes.length);
  for (const off of a) assert.ok(Math.abs(off) <= 0.061, `offset ${off} out of range`);
  // On a shared onset the melody speaks before the bass.
  let shared = 0, leads = 0;
  p.notes.forEach((n, i) => {
    if (n.hand !== 'right' || n.ornament || n.roll) return;
    const partner = p.notes.findIndex((m) => m.hand === 'left' && Math.abs(m.time - n.time) < 1e-6);
    if (partner < 0) return;
    shared++;
    if (a[i] < a[partner]) leads++;
  });
  assert.ok(shared > 10 && leads / shared > 0.8, `melody leads on ${leads}/${shared} shared onsets`);
});

test('the time map breathes and the last chord does not drone', () => {
  for (const style of ['nocturne', 'waltz', 'march']) {
    const p = generatePiece({ seed: 4, style });
    const tm = makeTimeMap(p);
    let prev = -1;
    for (let b = 0; b <= p.totalBeats; b += 0.25) { const s = tm.toSeconds(b); assert.ok(s > prev); prev = s; }
    // The slowing lands on the last moving music, before the final chord.
    assert.ok(tm.factorAt(p.ritardando.end - 0.25) > 1.25, `${style}: no ritardando before the final chord`);
    assert.ok(tm.factorAt(p.ritardando.start - p.beats) < 1.15, `${style}: the piece is slow long before the end`);
    // The final chord rings for a few seconds, not for two stretched bars.
    const last = p.notes.filter((n) => n.roll).sort((a, b) => b.time - a.time)[0];
    const ring = tm.toSeconds(last.time + last.duration) - tm.toSeconds(last.time);
    assert.ok(ring > 1.5 && ring < 6, `${style}: final chord rings ${ring.toFixed(1)} s`);
  }
});
