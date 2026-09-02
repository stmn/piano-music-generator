// Rule-based composer: form, harmony, melody, accompaniment.
// Pure ES module with no dependencies; runs in node and in the browser.
// Every random decision comes from one seeded RNG, so a seed fully determines a piece.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const ROOTS = NOTE_NAMES;

const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const QUALITY = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], dom7: [0, 4, 7, 10], min7: [0, 3, 7, 10] };

// Blues: every chord is a seventh, the melody draws on the blues scale.
const BLUES_CHORDS = {
  major: { I7: [0, 'dom7'], IV7: [5, 'dom7'], V7: [7, 'dom7'] },
  minor: { i7: [0, 'min7'], iv7: [5, 'min7'], V7: [7, 'dom7'] },
};
const BLUES_SCALE = { major: [0, 2, 3, 4, 7, 9, 10], minor: [0, 3, 5, 6, 7, 10] };
// Twelve-bar choruses (bars 1-12); the last bar is a turnaround except in the final chorus.
const BLUES_FORMS = {
  major: [['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'], ['I7', 'IV7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'], ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'V7', 'I7', 'V7']],
  minor: [['i7', 'i7', 'i7', 'i7', 'iv7', 'iv7', 'i7', 'i7', 'V7', 'iv7', 'i7', 'V7'], ['i7', 'iv7', 'i7', 'i7', 'iv7', 'iv7', 'i7', 'i7', 'V7', 'iv7', 'i7', 'V7']],
};

// Chords: semitone offset from the tonic + quality. Secondary dominants included.
const CHORDS = {
  major: {
    I: [0, 'maj'], ii: [2, 'min'], iii: [4, 'min'], IV: [5, 'maj'], V: [7, 'maj'], V7: [7, 'dom7'], vi: [9, 'min'],
    'V/V': [2, 'dom7'], 'V/vi': [4, 'dom7'], 'V/IV': [0, 'dom7'], 'V/ii': [9, 'dom7'],
  },
  minor: {
    i: [0, 'min'], iio: [2, 'dim'], III: [3, 'maj'], iv: [5, 'min'], V: [7, 'maj'], V7: [7, 'dom7'], VI: [8, 'maj'], VII: [10, 'maj'],
    'V/iv': [0, 'dom7'], 'V/VI': [3, 'dom7'], 'V/III': [10, 'dom7'],
  },
};

// Four-bar phrase templates. A space inside a bar means two chords in that bar.
const PROGRESSIONS = {
  major: {
    antecedent: [
      ['I', 'vi', 'IV', 'V'], ['I', 'IV', 'I6', 'V'], ['I', 'V', 'vi', 'V'], ['I', 'iii', 'IV', 'V'], ['I', 'V/V', 'V', 'V'],
      ['I', 'V/vi', 'vi', 'V'], ['I', 'V/IV', 'IV', 'V'], ['I', 'vi', 'ii6', 'V'], ['I', 'IV', 'ii6 V', 'V'], ['I V', 'I', 'IV', 'V'], ['I', 'I', 'IV', 'V'],
      ['I', 'V43 I6', 'IV', 'V'], ['I I6', 'IV', 'ii6', 'V'], ['I', 'vi', 'IV', 'I64 V'], ['I', 'IV', 'V65 I', 'V'],
    ],
    consequent: [
      ['I', 'IV', 'V7', 'I'], ['vi', 'IV', 'V7', 'I'], ['I', 'ii6', 'V7', 'I'], ['IV', 'I6', 'V7', 'I'], ['I', 'V/ii', 'ii V7', 'I'],
      ['I', 'V/IV', 'IV V7', 'I'], ['vi', 'ii6', 'V7', 'I'], ['I', 'IV', 'ii6 V7', 'I'], ['I vi', 'IV', 'V7', 'I'],
      ['I', 'IV', 'I64 V7', 'I'], ['vi', 'ii6', 'I64 V7', 'I'], ['I6', 'IV', 'I64 V7', 'I'], ['I', 'V43 I6', 'ii6 V7', 'I'],
    ],
    bAntecedent: [['vi', 'IV', 'I6', 'V'], ['IV', 'V', 'vi', 'iii'], ['ii6', 'V', 'I', 'vi'], ['IV', 'V/V', 'V', 'V'], ['vi', 'V/vi', 'vi', 'V'], ['IV', 'I6', 'ii6', 'V']],
    bConsequent: [['IV', 'ii6', 'V', 'V7'], ['IV', 'I6', 'V', 'V7'], ['vi', 'ii6', 'V', 'V7'], ['ii', 'V/V', 'V', 'V7'], ['vi', 'IV', 'ii6', 'V7']],
    // After a section in the relative key the return needs its own pivot, or it lands on ii.
    bConsequentPivot: [['vi', 'ii6', 'V', 'V7'], ['vi', 'IV', 'ii6', 'V7'], ['IV', 'ii6', 'I64', 'V7'], ['vi', 'V/V', 'V', 'V7']],
    // A closing consequent for a piece that ends in its contrast section.
    bClosing: [['IV', 'ii6', 'I64 V7', 'I'], ['vi', 'IV', 'V7', 'I'], ['IV', 'I6', 'ii6 V7', 'I']],
    intro: [['I'], ['I'], ['I', 'V7'], ['I', 'I']], // short: the melody should enter quickly
    coda2: [['I', 'I']],
    coda4: [['IV', 'I V7', 'I', 'I'], ['IV', 'V7', 'I', 'I']],
  },
  minor: {
    antecedent: [
      ['i', 'VI', 'iv', 'V'], ['i', 'iv', 'i6', 'V'], ['i', 'VII', 'VI', 'V'], ['i', 'III', 'iv', 'V'], ['i', 'V/iv', 'iv', 'V'],
      ['i', 'V/VI', 'VI', 'V'], ['i', 'iv', 'iio6', 'V'], ['i V', 'i', 'iv', 'V'], ['i', 'VI', 'iio6 V', 'V'],
      ['i', 'V43 i6', 'iv', 'V'], ['i i6', 'iv', 'iio6', 'V'], ['i', 'VI', 'iv', 'i64 V'],
    ],
    consequent: [
      ['i', 'iv', 'V7', 'i'], ['VI', 'iv', 'V7', 'i'], ['i', 'iio6', 'V7', 'i'], ['iv', 'i6', 'V7', 'i'], ['i', 'V/iv', 'iv V7', 'i'],
      ['VI', 'iio6', 'V7', 'i'], ['i', 'VII', 'VI V7', 'i'], ['i VI', 'iv', 'V7', 'i'],
      ['i', 'iv', 'i64 V7', 'i'], ['VI', 'iio6', 'i64 V7', 'i'], ['i6', 'iv', 'i64 V7', 'i'],
    ],
    bAntecedent: [['III', 'VII', 'VI', 'V'], ['iv', 'i6', 'iio6', 'V'], ['VI', 'III', 'iv', 'V'], ['III', 'V/III', 'III', 'V'], ['VI', 'V/VI', 'VI', 'V']],
    bConsequent: [['iv', 'iio6', 'V', 'V7'], ['VI', 'iv', 'V', 'V7'], ['iv', 'i6', 'V', 'V7'], ['VI', 'iio6', 'V', 'V7']],
    bConsequentPivot: [['VI', 'iio6', 'V', 'V7'], ['VI', 'iv', 'i64', 'V7'], ['iv', 'iio6', 'V', 'V7']],
    bClosing: [['iv', 'iio6', 'i64 V7', 'i'], ['VI', 'iv', 'V7', 'i'], ['iv', 'i6', 'iio6 V7', 'i']],
    intro: [['i'], ['i'], ['i', 'V7'], ['i', 'i']],
    coda2: [['i', 'i']],
    coda4: [['iv', 'i V7', 'i', 'i'], ['iv', 'V7', 'i', 'i']],
  },
};

const FORMS = [
  { name: 'AABA', parts: ['A', "A'", 'B', 'A'] },
  { name: 'ABAB', parts: ['A', 'B', "A'", "B'"] },
  { name: 'ABA', parts: ['A', 'B', 'A'] },
  { name: 'AABA', parts: ['A', "A'", 'B', "A'"] },
  { name: 'ABACA', parts: ['A', 'B', 'A', 'C', 'A'] },
];

// Styles set meter, tempo, accompaniment preferences and a bias on the melodic character.
// `beats` is the number of pulses per bar; in compound meter (6/8) a pulse is a dotted quarter.
// `beatUnit` is the pulse length in quarter notes (used for MIDI timing).
export const STYLES = {
  nocturne: { label: 'Nocturne', beats: 4, tempo: 72, rubato: 1.0, pickup: 0.3, dynamic: [0.55, 0.22], kinds: { broken: 4, block: 0.8, bassChord: 1, octaves: 0.2, rhythmic: 0.2, pedalPoint: 1 }, shapes: { alberti: 0.4, updown: 2, rising: 1.5, walk: 1, pedal: 1, sweep: 2 }, character: { density: [0.3, 0.8] } },
  prelude: { label: 'Prelude', beats: 4, tempo: 96, rubato: 0.8, pickup: 0.3, dynamic: [0.62, 0.25], kinds: { broken: 6, block: 0.4, bassChord: 0.4, octaves: 0.3, rhythmic: 0.2, pedalPoint: 0.8 }, shapes: { alberti: 1, updown: 2, rising: 2, walk: 1.5, pedal: 1, sweep: 2 }, character: { density: [0.2, 0.6], grace: 0.2 } },
  ballade: { label: 'Ballade', beats: 4, tempo: 84, rubato: 1.0, pickup: 0.3, dynamic: [0.66, 0.30], kinds: { broken: 4.5, block: 0.8, bassChord: 0.5, octaves: 0.8, rhythmic: 0.3, pedalPoint: 0.8 }, shapes: { alberti: 0.3, updown: 1, rising: 1, walk: 1, pedal: 1, sweep: 3 }, character: { range: [8, 12], leapiness: [0.9, 1.6], octaves: 0.6 } },
  sonatina: { label: 'Sonatina', beats: 4, tempo: 112, rubato: 0.25, pickup: 0.5, dynamic: [0.62, 0.25], kinds: { broken: 4, block: 1, bassChord: 1.2, octaves: 0.8, rhythmic: 0.4, pedalPoint: 0.3 }, shapes: { alberti: 4, updown: 1, rising: 0.5, walk: 0.5, pedal: 0.5, sweep: 0.2 }, character: { grace: 0.2, trill: 0.5 } },
  march: { label: 'March', beats: 4, tempo: 108, rubato: 0.2, pickup: 0.5, dynamic: [0.72, 0.28], kinds: { broken: 0.6, block: 2, bassChord: 2.5, octaves: 2, rhythmic: 3, pedalPoint: 0.2 }, shapes: { alberti: 1, updown: 1, rising: 0.5, walk: 0.5, pedal: 0.5, sweep: 0.1 }, character: { dotted: [0.4, 0.9], syncopation: 0.1, triplets: 0.1, density: [0.3, 0.7] } },
  chorale: { label: 'Chorale', beats: 4, tempo: 64, rubato: 0.8, pickup: 0.15, dynamic: [0.48, 0.18], kinds: { broken: 0.8, block: 5, bassChord: 0.5, octaves: 0.1, rhythmic: 0.1, pedalPoint: 0.8 }, shapes: { alberti: 1, updown: 1, rising: 1, walk: 1, pedal: 1, sweep: 0.5 }, character: { density: [0.1, 0.4], syncopation: 0, triplets: 0.05, grace: 0.05, leapiness: [0.4, 0.9] } },
  elegy: { label: 'Elegy', beats: 4, tempo: 58, rubato: 1.0, pickup: 0.15, dynamic: [0.48, 0.18], kinds: { broken: 3, block: 1.2, bassChord: 0.3, octaves: 0.1, rhythmic: 0.1, pedalPoint: 2 }, shapes: { alberti: 0.3, updown: 2, rising: 1, walk: 1, pedal: 1.5, sweep: 1.5 }, character: { density: [0.15, 0.5], syncopation: 0.1, grace: 0.5, leapiness: [0.4, 1] } },
  etude: { label: 'Etude', beats: 4, tempo: 126, rubato: 0.25, pickup: 0.35, dynamic: [0.72, 0.28], kinds: { broken: 6, block: 0.3, bassChord: 0.5, octaves: 0.8, rhythmic: 0.3, pedalPoint: 0.3 }, shapes: { alberti: 3, updown: 2, rising: 1.5, walk: 1.5, pedal: 1, sweep: 1 }, character: { density: [0.4, 0.9], grace: 0.1 } },
  waltz: { label: 'Waltz', beats: 3, tempo: 150, rubato: 0.5, pickup: 0.5, dynamic: [0.62, 0.25], kinds: { broken: 1.2, block: 0.5, bassChord: 5, octaves: 0.3, rhythmic: 0.6, pedalPoint: 0.3 }, shapes: { alberti: 0.5, updown: 1.5, rising: 1.5, walk: 0.5, pedal: 1, sweep: 0.5 }, character: { syncopation: 0.15 } },
  minuet: { label: 'Minuet', beats: 3, tempo: 118, rubato: 0.5, pickup: 0.5, dynamic: [0.62, 0.25], kinds: { broken: 2, block: 1.5, bassChord: 3, octaves: 0.4, rhythmic: 0.8, pedalPoint: 0.3 }, shapes: { alberti: 2.5, updown: 1, rising: 1, walk: 0.5, pedal: 0.5, sweep: 0.2 }, character: { density: [0.25, 0.65], syncopation: 0.1, triplets: 0.1, trill: 0.5, grace: 0.5 } },
  mazurka: { label: 'Mazurka', beats: 3, tempo: 132, accentBeat: 1, rubato: 0.5, pickup: 0.5, dynamic: [0.68, 0.26], kinds: { broken: 0.6, block: 1, bassChord: 3, octaves: 0.3, rhythmic: 3, pedalPoint: 0.3 }, shapes: { alberti: 0.5, updown: 1, rising: 1, walk: 0.5, pedal: 1, sweep: 0.2 }, character: { dotted: [0.4, 0.9], triplets: 0.3, grace: 0.5 } },
  polonaise: { label: 'Polonaise', beats: 3, tempo: 100, rubato: 0.3, pickup: 0.45, dynamic: [0.72, 0.28], kinds: { broken: 0.6, block: 1, bassChord: 1.5, octaves: 1, rhythmic: 4, pedalPoint: 0.3 }, shapes: { alberti: 0.5, updown: 1, rising: 1, walk: 0.5, pedal: 1, sweep: 0.5 }, character: { dotted: [0.4, 0.9], density: [0.4, 0.85], octaves: 0.5 } },
  barcarolle: { label: 'Barcarolle', beats: 2, beatUnit: 1.5, tempo: 60, rubato: 1.0, pickup: 0.3, dynamic: [0.55, 0.22], kinds: { broken: 4, block: 0.5, bassChord: 2.5, octaves: 0.2, rhythmic: 0.6, pedalPoint: 1 }, shapes: { alberti: 1, updown: 3, rising: 1.5, walk: 1, pedal: 1.5, sweep: 1.5 }, character: { density: [0.3, 0.75] } },
  lullaby: { label: 'Lullaby', beats: 2, beatUnit: 1.5, tempo: 52, rubato: 1.0, pickup: 0.15, dynamic: [0.48, 0.18], kinds: { broken: 4, block: 0.6, bassChord: 1.5, octaves: 0.1, rhythmic: 0.3, pedalPoint: 2 }, shapes: { alberti: 1, updown: 3, rising: 1.5, walk: 1, pedal: 2, sweep: 1 }, character: { density: [0.15, 0.55], leapiness: [0.4, 0.9], syncopation: 0.05, grace: 0.3, octaves: 0.05 } },
  blues: { label: 'Blues', beats: 4, tempo: 96, blues: true, rubato: 0.15, pickup: 0.4, dynamic: [0.66, 0.26], swing: true, backbeat: true, kinds: { boogie: 4, walking: 2, block: 1.5, bassChord: 0.6 }, shapes: { alberti: 1, updown: 1, rising: 1, walk: 1, pedal: 1, sweep: 0.5 }, character: { density: [0.3, 0.7], syncopation: 0.8, triplets: 1, dotted: [0, 0.1], grace: 0.75, register: [65, 76], trill: 0.05, octaves: 0.2 } },
  tarantella: { label: 'Tarantella', beats: 2, beatUnit: 1.5, tempo: 112, rubato: 0.25, pickup: 0.3, dynamic: [0.72, 0.28], kinds: { broken: 1.5, block: 1, bassChord: 4, octaves: 1, rhythmic: 2.5, pedalPoint: 0.2 }, shapes: { alberti: 1, updown: 1.5, rising: 1, walk: 0.5, pedal: 1, sweep: 0.3 }, character: { density: [0.5, 0.95], leapiness: [0.8, 1.6], grace: 0.15, octaves: 0.5 } },
};

// Note budget: the shortest allowed rhythmic value (in pulses) follows the tempo.
const MELODY_NOTES_PER_SEC = 6;
const LEFT_NOTES_PER_SEC = 6.5;
const minMelodyDur = (tempo) => tempo / (60 * MELODY_NOTES_PER_SEC);

// How long the last chord rings, and how many bars that takes, so it neither drones nor cuts off.
const ringPulsesFor = (tempo) => (tempo <= 80 ? 3.6 : tempo <= 110 ? 3.1 : 2.7) * tempo / (60 * 1.35);
const finalBarsFor = (tempo, beats) => Math.max(1, Math.min(2, Math.round(ringPulsesFor(tempo) / beats)));

const MELODY_LOW = 60; // C4
const MELODY_HIGH = 88; // E6

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const rand = (rng, a, b) => a + rng() * (b - a);
const chance = (rng, p) => rng() < p;
const near = (t) => Math.round(t * 24) / 24; // grid positions without float drift
const isInt = (t) => Math.abs(t - Math.round(t)) < 1e-6;
const weighted = (rng, entries) => {
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = rng() * total;
  for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
  return entries[entries.length - 1][0];
};

// Figured-bass suffixes: [which chord tone goes in the bass, does the name imply a seventh].
const FIGURES = { 64: [2, false], 65: [1, true], 43: [2, true], 42: [3, true], 6: [1, false] };

function chordInfo(mode, rootPc, name) {
  let base = name, bassRole;
  for (const fig of ['64', '65', '43', '42', '6']) {
    if (name.length <= fig.length || !name.endsWith(fig)) continue;
    const [role, seventh] = FIGURES[fig];
    const target = name.slice(0, -fig.length) + (seventh ? '7' : '');
    if (CHORDS[mode][target] || BLUES_CHORDS[mode][target]) { base = target; bassRole = role; }
    break;
  }
  const [offset, quality] = (CHORDS[mode][base] ?? BLUES_CHORDS[mode][base]);
  const root = (rootPc + offset) % 12;
  const pcs = QUALITY[quality].map((i) => (root + i) % 12);
  return { name, quality, root, pcs, bassRole: bassRole !== undefined && bassRole < pcs.length ? bassRole : undefined };
}

// The scale to sing over a chord: the home scale with every chord tone that lies outside it
// replacing the diatonic note a semitone away. Over V in minor this yields harmonic minor, over a
// secondary dominant the applied scale, so the melody never sounds a semitone against the harmony.
function localScale(chord, scale) {
  if (chord.local) return chord.local;
  const out = scale.slice();
  for (const pc of chord.pcs) {
    if (out.includes(pc)) continue;
    const below = (pc + 11) % 12, above = (pc + 1) % 12;
    let i = out.indexOf(below);
    if (i < 0 || chord.pcs.includes(below)) i = out.indexOf(above);
    if (i < 0 || chord.pcs.includes(out[i])) out.push(pc); else out[i] = pc;
  }
  chord.local = out;
  return out;
}

// "ii V7" -> segments with start time and length (in pulses) inside the bar.
function parseBar(str, mode, rootPc, beats) {
  const names = str.split(' ');
  if (names.length === 1) return [{ ...chordInfo(mode, rootPc, names[0]), start: 0, len: beats }];
  const first = beats === 3 ? 2 : beats / 2;
  return [
    { ...chordInfo(mode, rootPc, names[0]), start: 0, len: first },
    { ...chordInfo(mode, rootPc, names[1]), start: first, len: beats - first },
  ];
}
const parsePhrase = (bars, mode, rootPc, beats) => bars.map((b) => parseBar(b, mode, rootPc, beats));
const chordAt = (segments, t) => segments.find((s) => t >= s.start - 1e-6 && t < s.start + s.len - 1e-6) ?? segments[segments.length - 1];

function isStrong(t, beats) {
  if (!isInt(t)) return false;
  const b = Math.round(t);
  if (beats === 4) return b === 0 || b === 2;
  if (beats === 2) return true; // 6/8: both pulses are strong
  return b === 0;
}

function nearestPc(pitch, pc, low = MELODY_LOW, high = MELODY_HIGH) {
  let best = null;
  for (let p = low; p <= high; p++) {
    if (p % 12 !== pc) continue;
    if (best === null || Math.abs(p - pitch) < Math.abs(best - pitch)) best = p;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Melodic character: a parameter set drawn once per piece, biased by the style.

const SHAPES = ['arch', 'wave', 'descend', 'ascend', 'plateau', 'lateArch'];

function drawCharacter(rng, bias = {}) {
  const num = (key, a, b) => (bias[key] ? rand(rng, bias[key][0], bias[key][1]) : rand(rng, a, b));
  const bool = (key, p) => chance(rng, bias[key] !== undefined ? bias[key] : p);
  return {
    density: num('density', 0.2, 0.95), // how often pulses are subdivided
    leapiness: num('leapiness', 0.4, 1.6), // appetite for leaps
    range: Math.round(num('range', 5, 12)), // span of the phrase contour
    syncopation: bool('syncopation', 0.45) ? rand(rng, 0.15, 0.5) : 0,
    triplets: bool('triplets', 0.3),
    dotted: num('dotted', 0, 0.5),
    chordToneBias: rand(rng, 0.35, 0.8),
    shapes: [pick(rng, SHAPES), pick(rng, SHAPES)],
    motifRepeat: rand(rng, 0.3, 0.9), // chance that bar 2 reuses the rhythm of bar 1
    grace: bool('grace', 0.4) ? rand(rng, 0.2, 0.6) : 0,
    trill: bool('trill', 0.3),
    octaves: bool('octaves', 0.35),
    register: Math.round(num('register', 67, 79)),
    endLowBias: chance(rng, 0.5),
  };
}

// Bar rhythm built from one- and two-pulse cells weighted by the character.
function makeBarRhythm(rng, beats, ch, cadence, minDur = 0, compound = false, swing = false) {
  if (cadence) {
    const opts = swing ? [[4], [1, 3], [2 / 3, 1 / 3, 3], [2, 2], [1, 1, 2]] : compound ? [[2], [1, 1], [2 / 3, 1 / 3, 1], [1 / 3, 1 / 3, 1 / 3, 1]]
      : beats === 4 ? [[4], [1, 3], [0.5, 0.5, 3], [2, 2], [1, 1, 2]] : [[3], [1, 2], [0.5, 0.5, 2], [2, 1]];
    return pick(rng, opts);
  }
  const out = [];
  let b = 0;
  while (b < beats - 1e-6) {
    const twoLeft = beats - b >= 2 - 1e-6;
    const cells = [];
    const add = (cell, w) => { if (w > 0 && Math.min(...cell) >= minDur - 1e-6) cells.push([cell, w]); };
    if (swing) {
      // Shuffle: the offbeat sits on the last third of the pulse.
      add([1], 1.2);
      add([2 / 3, 1 / 3], 1.2 + ch.density * 1.5);
      add([1 / 3, 1 / 3, 1 / 3], ch.density * 0.8);
      add([1 / 3, 2 / 3], ch.syncopation + 0.3);
      if (twoLeft) { add([2], (1 - ch.density) * 1.4); add([1, 2 / 3, 1 / 3], 0.6); add([2 / 3, 1 / 3, 1], 0.6); add([5 / 3, 1 / 3], ch.syncopation); add([2 / 3, 4 / 3], ch.syncopation); }
    } else if (compound) {
      add([1], 1.2);
      add([1 / 3, 1 / 3, 1 / 3], 0.6 + ch.density * 1.8);
      add([2 / 3, 1 / 3], 0.8 + ch.dotted);
      add([1 / 3, 2 / 3], ch.syncopation + 0.2);
      add([1 / 6, 1 / 6, 1 / 3, 1 / 3], Math.max(0, ch.density - 0.6));
      add([1 / 3, 1 / 6, 1 / 6, 1 / 3], Math.max(0, ch.density - 0.5) * 0.8);
      add([1 / 3, 1 / 3, 1 / 6, 1 / 6], Math.max(0, ch.density - 0.5) * 0.8);
      add([0.5, 0.5], ch.syncopation * 1.5); // duplet against the triple pulse
      if (twoLeft) { add([2], (1 - ch.density) * 1.4); add([1, 2 / 3, 1 / 3], 0.5); add([4 / 3, 2 / 3], ch.dotted); }
    } else {
      add([1], 1.2);
      add([0.5, 0.5], 0.6 + ch.density * 1.6);
      add([0.75, 0.25], ch.dotted * 0.8);
      add([0.25, 0.75], ch.dotted * ch.syncopation);
      add([0.25, 0.25, 0.5], ch.density * ch.density * 0.8);
      add([0.5, 0.25, 0.25], ch.density * ch.density * 0.8);
      add([0.25, 0.25, 0.25, 0.25], Math.max(0, ch.density - 0.6) * 1.5);
      if (ch.triplets) add([1 / 3, 1 / 3, 1 / 3], 0.5 + ch.density * 0.5);
      if (twoLeft) {
        add([2], (1 - ch.density) * 1.4);
        add([1.5, 0.5], ch.dotted * 1.2);
        add([0.5, 1.5], ch.syncopation * 1.5);
        add([0.5, 1, 0.5], ch.syncopation * 2);
        add([1, 0.5, 0.5], 0.4);
        if (ch.triplets) add([2 / 3, 2 / 3, 2 / 3], 0.4);
      }
    }
    if (!cells.length) cells.push([[1], 1]);
    const chosen = weighted(rng, cells);
    out.push(...chosen);
    b = near(b + chosen.reduce((s, x) => s + x, 0)); // rounded: thirds must add up exactly
  }
  return out;
}

function contour(shape, bar, rng) {
  const x = bar / 3;
  switch (shape) {
    case 'arch': return Math.sin(Math.PI * Math.min(1, x * 1.15));
    case 'lateArch': return x < 0.7 ? x / 0.7 : 1 - (x - 0.7) / 0.3 * 0.8;
    case 'wave': return [0.3, 1, 0.2, 0.8][bar];
    case 'descend': return 1 - x;
    case 'ascend': return x;
    default: return 0.5 + (rng() - 0.5) * 0.2; // plateau
  }
}

// Pitch choice for one melody note: candidates from the scale (or the chord),
// weighted by distance from the previous note, the contour target and the character.
function choosePitch(rng, prev, allowedPcs, target, lastLeap, ch, pull = 6, window = null, strictWindow = false) {
  const cands = [];
  for (let p = MELODY_LOW; p <= MELODY_HIGH; p++) {
    if (!allowedPcs.includes(p % 12)) continue;
    const dist = Math.abs(p - prev);
    if (dist > 12) continue;
    let w;
    if (dist === 0) w = 0.5;
    else if (dist <= 2) w = 3;
    else if (dist <= 4) w = 1.4 * ch.leapiness;
    else if (dist <= 7) w = 0.6 * ch.leapiness;
    else w = 0.12 * ch.leapiness * ch.leapiness;
    if (lastLeap !== 0 && dist <= 2 && Math.sign(p - prev) === -Math.sign(lastLeap)) w *= 2.2;
    if (lastLeap !== 0 && dist > 4) w *= 0.3;
    w *= 1 / (1 + Math.abs(p - target) / pull);
    if (window && (p < window[0] || p > window[1])) w *= 0.03; // outside the phrase register
    cands.push([p, w]);
  }
  if (!cands.length) return prev;
  // Hard cap: never wander more than a fourth beyond the phrase register when something inside exists
  // (no margin at all in a cadence bar, where the window is centred on the next phrase start).
  const margin = strictWindow ? 0 : 5;
  const inside = window ? cands.filter(([p]) => p >= window[0] - margin && p <= window[1] + margin) : cands;
  return weighted(rng, inside.length ? inside : cands);
}

// Phrase-ending note: the goal pitch class in the octave closest to both the
// previous note and the start of the next phrase (never more than an octave away).
function endPitchFor(prev, nearPitch, goalPc, nextStart) {
  const all = [];
  for (let p = MELODY_LOW; p <= MELODY_HIGH; p++) if (p % 12 === goalPc) all.push(p);
  const ok = all.filter((p) => Math.abs(p - prev) <= 12 && (nextStart === undefined || Math.abs(p - nextStart) <= 12));
  let best = null, bestCost = Infinity;
  for (const p of (ok.length ? ok : all)) {
    const a = Math.abs(p - prev), b = Math.abs(p - nearPitch);
    const cost = Math.max(a, b) * 2 + a + b;
    if (cost < bestCost) { bestCost = cost; best = p; }
  }
  return best;
}

// Pitch class to end a phrase on: a chord tone that steps into the next phrase's first note.
// The leading tone is kept for the cases where it actually resolves upward.
function endPcFor(rng, chord, nextPc, leadingPc, tonicPc) {
  const cands = chord.pcs.map((pc) => {
    const d = Math.min((pc - nextPc + 12) % 12, (nextPc - pc + 12) % 12);
    let w = d === 1 || d === 2 ? 3.5 : d === 0 ? 1.6 : 0.6;
    if (pc === leadingPc && nextPc !== tonicPc) w *= 0.25;
    return [pc, w];
  });
  return weighted(rng, cands);
}

function snapToChord(pitch, chord, prevOut) {
  if (chord.pcs.includes(pitch % 12)) return pitch;
  const cands = [];
  for (let p = MELODY_LOW; p <= MELODY_HIGH; p++) if (chord.pcs.includes(p % 12)) cands.push(p);
  const ok = cands.filter((p) => Math.abs(p - prevOut) <= 12);
  return (ok.length ? ok : cands).reduce((a, b) => (Math.abs(b - pitch) < Math.abs(a - pitch) ? b : a));
}

function nearestScaleStep(scale, pitch, dir) {
  for (let p = pitch + dir; p > MELODY_LOW - 3 && p < MELODY_HIGH + 3; p += dir) if (scale.includes(((p % 12) + 12) % 12)) return p;
  return pitch + dir * 2;
}

// The note that steps into a phrase's goal note: 2-1, 7-1, 5-1, 3-1 are how cadences are sung.
function penultimateFor(rng, goal, chord, prev) {
  const cands = [[goal + 2, 4], [goal - 1, 3], [goal + 1, 1], [goal - 5, 1.5], [goal + 7, 1.2], [goal - 3, 1], [goal - 4, 1]]
    .filter(([p]) => p >= MELODY_LOW && p <= MELODY_HIGH && chord.pcs.includes(p % 12) && Math.abs(p - prev) <= 12);
  return cands.length ? weighted(rng, cands) : null;
}

const sameRhythm = (a, b) => !!a && !!b && a.length === b.length && a.every((d, i) => Math.abs(d - b[i]) < 1e-6);

// A rhythmic plan drawn once per piece: a motif bar, a variant of it and a contrasting bar.
// Phrases are laid out [a, a or a', b, cadence], so the ear hears one idea instead of four.
function drawRhythmPlan(rng, ctx) {
  const { beats, ch, minDur, compound, swing } = ctx;
  const a = makeBarRhythm(rng, beats, ch, false, minDur, compound, swing);
  return { a, a2: varyRhythm(rng, a, minDur), b: makeBarRhythm(rng, beats, ch, false, minDur, compound, swing) };
}
function varyRhythm(rng, cells, minDur) {
  const out = [...cells];
  const splittable = out.map((d, i) => [d, i]).filter(([d]) => d / 2 >= minDur - 1e-6 && d >= 0.5);
  if (splittable.length && chance(rng, 0.7)) {
    const [d, i] = pick(rng, splittable);
    out.splice(i, 1, d / 2, d / 2);
    return out;
  }
  for (let i = 0; i + 1 < out.length; i++) if (Math.abs(out[i] - out[i + 1]) < 1e-6) { out.splice(i, 2, out[i] * 2); return out; }
  return out;
}

// An upbeat into a phrase: a step or two leading into the downbeat.
function drawPickup(rng, ctx, chance0) {
  if (!chance(rng, chance0)) return null;
  const opts = ctx.compound ? [[1 / 3], [1 / 6, 1 / 6], [1 / 3, 1 / 3]] : [[1], [0.5, 0.5], [0.5], [0.25, 0.25, 0.5]];
  const usable = opts.filter((c) => Math.min(...c) >= ctx.minDur - 1e-6);
  return usable.length ? pick(rng, usable) : null;
}

// Melody for a four-bar phrase (times relative to the phrase start).
function generatePhrase(rng, ctx, bars, opts) {
  const { beats, scale, ch, compound } = ctx;
  const notes = [];
  const rhythms = [];
  let prev = opts.startPitch;
  let lastLeap = 0;
  let prevNct = false;
  const anchor = opts.anchor ?? opts.startPitch;
  const base = anchor - Math.round(ch.range * 0.3);
  const window = [anchor - 7, anchor + ch.range + 4];
  const shape = opts.shape ?? ch.shapes[0];
  const fromBar = opts.fromBar ?? 0;
  const peak = opts.peak, peakBar = opts.peakBar ?? -1;
  let motif = opts.motif ?? null;

  for (let bar = fromBar; bar < 4; bar++) {
    const segments = bars[bar];
    const cadence = bar === 3;
    let rhythm;
    if (opts.rhythms && opts.rhythms[bar]) rhythm = opts.rhythms[bar];
    else if (bar === 1 && rhythms[0] && chance(rng, ch.motifRepeat)) rhythm = rhythms[0];
    else if (bar === 2 && rhythms[0] && chance(rng, ch.motifRepeat * 0.5)) rhythm = rhythms[0];
    else rhythm = makeBarRhythm(rng, beats, ch, cadence, ctx.minDur, compound, ctx.swing);
    rhythms[bar] = rhythm;

    // One high note per period: every other bar stays a third below it, so the climax is a climax.
    const hi = peak === undefined ? window[1] : bar === peakBar ? peak : Math.min(window[1], peak - 3);
    const barWindow = [window[0], Math.max(window[0] + 5, hi)];
    let target = base + Math.round(contour(shape, bar, rng) * ch.range) - (opts.endLow && bar === 3 ? 2 : 0);
    if (bar === peakBar) target = peak;
    if (cadence && opts.endNear !== undefined) target = opts.endNear;
    target = Math.max(barWindow[0], Math.min(target, barWindow[1]));

    // A cadence is planned backwards: the goal note first, then the note that steps into it.
    const goalPc = opts.endPc !== undefined ? opts.endPc : chordAt(segments, beats - 1e-3).pcs[0];
    let goal = null, penult = null;
    if (cadence) {
      goal = endPitchFor(prev, opts.endNear ?? prev, goalPc, opts.nextStart);
      if (rhythm.length > 1) penult = penultimateFor(rng, goal, chordAt(segments, beats - 1e-3), prev);
    }

    // When the motif's rhythm comes back, its shape comes with it: a sequence, not a new bar.
    const seq = !cadence && motif && sameRhythm(rhythm, motif.rhythm) && motif.pitches.length === rhythm.length && chance(rng, 0.8) ? motif : null;
    const shift = seq ? [-5, -4, -3, -2, 2, 3, 4, 5].reduce((a, b) => (Math.abs(seq.pitches[0] + b - target) < Math.abs(seq.pitches[0] + a - target) ? b : a)) : 0;

    let t = 0;
    rhythm.forEach((dur, i) => {
      const chord = chordAt(segments, t);
      const strong = isStrong(t, beats) || (segments.length > 1 && Math.abs(t - segments[1].start) < 1e-6);
      const isFirst = bar === fromBar && i === 0 && opts.fixedStart;
      const isLast = cadence && i === rhythm.length - 1;
      const isPenult = cadence && penult !== null && i === rhythm.length - 2;
      let pitch;
      if (isFirst) pitch = snapToChord(prev, chord, prev);
      else if (isLast) pitch = Math.abs(goal - prev) <= 12 ? goal : endPitchFor(prev, opts.endNear ?? prev, goalPc, opts.nextStart);
      else if (isPenult && Math.abs(penult - prev) <= 12) pitch = penult;
      else if (seq) {
        // A sequence is transposed inside the key, not chromatically.
        let p = seq.pitches[i] + shift;
        const sc = ctx.blues ? scale : localScale(chord, scale);
        if (strong) p = snapToChord(p, chord, prev);
        else if (!sc.includes(((p % 12) + 12) % 12)) {
          const up = nearestScaleStep(sc, p, +1), dn = nearestScaleStep(sc, p, -1);
          p = up - p <= p - dn ? up : dn;
        }
        while (p - prev > 12) p -= 12;
        while (prev - p > 12) p += 12;
        pitch = Math.max(MELODY_LOW, Math.min(MELODY_HIGH, p));
      } else {
        // A note outside the chord is reached by step and resolves by step; that is what makes it
        // a passing or neighbour note instead of a wrong note.
        const wantChordTone = strong || prevNct || chance(rng, ch.chordToneBias);
        const allowed = wantChordTone ? chord.pcs : (ctx.blues ? scale : localScale(chord, scale));
        const stepwise = prevNct || !wantChordTone;
        const win = cadence && opts.nextStart !== undefined ? [opts.nextStart - 10, opts.nextStart + 10]
          : stepwise ? [prev - 2, Math.min(prev + 2, barWindow[1])] : barWindow;
        const tgt = cadence && penult !== null ? penult : target;
        pitch = choosePitch(rng, prev, allowed, tgt, lastLeap, ch, cadence && opts.endNear !== undefined ? 2 : 6, win, stepwise || (cadence && opts.nextStart !== undefined));
      }
      prevNct = !chord.pcs.includes(((pitch % 12) + 12) % 12);
      lastLeap = Math.abs(pitch - prev) > 4 ? pitch - prev : 0;
      notes.push({ time: near(bar * beats + t), duration: dur, pitch, strong, bar });
      prev = pitch;
      t = near(t + dur);
    });
    if (bar === fromBar && !motif) motif = { rhythm, pitches: notes.filter((n) => n.bar === bar).map((n) => n.pitch) };
  }

  // A cadential trill runs at the speed of a trill (about ten notes a second), starts on the upper
  // auxiliary and closes with a turn. Too slow for that and it becomes a turn instead.
  if (opts.trill) {
    const last = notes[notes.length - 1];
    if (last.duration >= 2) {
      const seg = chordAt(bars[3], last.time - 3 * beats);
      const sc = ctx.blues ? scale : localScale(seg, scale);
      const upper = nearestScaleStep(sc, last.pitch, +1);
      const lower = nearestScaleStep(sc, last.pitch, -1);
      const step = Math.max(compound ? 1 / 12 : 1 / 8, near(0.085 * ctx.tempo / 60));
      // The resolution is a real note, not the tail of the shake: it needs its own length.
      const res = Math.max(2 * step, Math.min(1, last.duration * 0.3));
      const lowStart = near(last.duration - res - step);
      const body = [];
      let t = 0;
      for (let k = 0; ; k++) {
        const d = k < 2 ? near(step * 1.4) : step;
        if (t + d > lowStart + 1e-6) break;
        body.push([t, d, k % 2 ? last.pitch : upper]);
        t = near(t + d);
      }
      notes.pop();
      const orn = (time, duration, pitch, factor = 0.72) => notes.push({ time: near(last.time + time), duration, pitch, strong: false, bar: last.bar, ornament: true, ornFactor: factor });
      if (body.length >= 4 && step <= 0.34) {
        body.forEach(([bt, bd, bp], k) => orn(bt, k === body.length - 1 ? near(lowStart - bt) : bd, bp, 0.74 - 0.14 * (k / body.length)));
        orn(lowStart, step, lower);
        notes.push({ time: near(last.time + lowStart + step), duration: res, pitch: last.pitch, strong: true, bar: last.bar });
      } else {
        // Too slow for a trill: a turn instead, with the note held before and after it.
        const d = Math.max(compound ? 1 / 6 : 0.25, near(0.1 * ctx.tempo / 60));
        const tail = Math.max(2 * d, Math.min(1, last.duration * 0.3));
        const start = near(last.duration - 3 * d - tail);
        if (start >= d) {
          notes.push({ time: last.time, duration: start, pitch: last.pitch, strong: true, bar: last.bar });
          orn(start, d, upper); orn(near(start + d), d, last.pitch); orn(near(start + 2 * d), d, lower);
          notes.push({ time: near(last.time + start + 3 * d), duration: tail, pitch: last.pitch, strong: false, bar: last.bar });
        } else {
          notes.push({ ...last });
        }
      }
    }
  }
  return { notes, rhythms, endPitch: prev, startPitch: opts.startPitch, motif };
}

// Decorate a phrase that comes back: a passing tone inside a third, a turn on a long note.
// Strong-beat pitches and the cadence stay put so the theme is still the theme.
function varyPhrase(rng, ctx, phrase, amount = 2) {
  const { scale, minDur } = ctx;
  const src = phrase.notes;
  const out = [];
  let changed = 0;
  for (let i = 0; i < src.length; i++) {
    const n = src[i], nx = src[i + 1];
    const last = i >= src.length - 2;
    const gap = nx ? nx.pitch - n.pitch : 0;
    if (!n.ornament && !last && changed < amount && nx && Math.abs(gap) >= 3 && Math.abs(gap) <= 4
      && n.duration / 2 >= minDur - 1e-6 && chance(rng, 0.55)) {
      // Fill the third with the scale tone between the two notes.
      const mid = nearestScaleStep(scale, n.pitch, Math.sign(gap));
      if (Math.abs(mid - n.pitch) <= 2 && mid !== nx.pitch) {
        out.push({ ...n, duration: n.duration / 2 });
        out.push({ ...n, time: near(n.time + n.duration / 2), duration: n.duration / 2, pitch: mid, strong: false });
        changed++;
        continue;
      }
    }
    if (!n.ornament && !last && changed < amount && n.duration >= 1.5 && n.duration / 3 >= minDur - 1e-6 && chance(rng, 0.45)) {
      // A turn on a long note: the note, its upper neighbour, the note again.
      const d = n.duration / 3;
      out.push({ ...n, duration: d });
      out.push({ ...n, time: near(n.time + d), duration: d, pitch: nearestScaleStep(scale, n.pitch, +1), strong: false, ornament: true });
      out.push({ ...n, time: near(n.time + 2 * d), duration: d, strong: false });
      changed++;
      continue;
    }
    out.push({ ...n });
  }
  return { ...phrase, notes: out };
}

// Parallel consequent: bars 1-2 copy the antecedent (snapped to the new harmony),
// bars 3-4 are new and lead to the requested ending.
function parallelConsequent(rng, ctx, bars, antecedent, opts = {}) {
  let prevOut = antecedent.endPitch;
  const src = antecedent.notes.filter((n) => n.bar < 2);
  const copied = src.map((n, i) => {
    const chord = chordAt(bars[n.bar], n.time - n.bar * ctx.beats);
    let pitch = n.pitch;
    if (n.strong) pitch = snapToChord(pitch, chord, prevOut);
    else if (!chord.pcs.includes(pitch % 12) && !n.ornament) {
      // A weak note only survives under the new harmony when it is a real passing or neighbour
      // tone; otherwise it is pulled to the nearest chord tone.
      const nextPitch = src[i + 1]?.pitch;
      const passing = Math.abs(pitch - prevOut) <= 2 && (nextPitch === undefined || Math.abs(nextPitch - pitch) <= 2);
      if (!passing) pitch = snapToChord(pitch, chord, prevOut);
    }
    // Snapping to a new harmony must not open a leap beyond an octave.
    if (Math.abs(pitch - prevOut) > 12) {
      const shifted = pitch + (pitch > prevOut ? -12 : 12);
      if (shifted >= MELODY_LOW && shifted <= MELODY_HIGH) pitch = shifted;
    }
    prevOut = pitch;
    return { ...n, pitch };
  });
  const startPitch = copied[copied.length - 1].pitch;
  const tail = generatePhrase(rng, ctx, bars, {
    startPitch, anchor: antecedent.startPitch, endLow: ctx.ch.endLowBias, fromBar: 2, shape: ctx.ch.shapes[1],
    motif: antecedent.motif, ...opts, nextStart: opts.nextStart ?? antecedent.startPitch,
  });
  return { notes: [...copied, ...tail.notes], endPitch: tail.endPitch, startPitch: antecedent.startPitch, motif: antecedent.motif };
}

// ---------------------------------------------------------------------------
// Accompaniment: a figuration drawn once per section.

const SUBDIV_NAMES = { 1: 'quarters', 2: 'eighths', 3: 'triplets', 4: 'sixteenths', 6: 'sixteenths' };
const COMPOUND_SUBDIV_NAMES = { 1: 'dotted quarters', 3: 'eighths', 6: 'sixteenths' };
const SHAPE_NAMES = { alberti: 'Alberti bass', updown: 'up and down', rising: 'rising', walk: 'wandering', pedal: 'bass pedal', sweep: 'two-octave sweep' };

// Rhythmic chord patterns (strike positions in pulses) per meter.
const RHYTHMIC = {
  4: [[[0, 0.5, 0.75, 1, 2, 2.5, 2.75, 3], 'dotted'], [[0, 1, 1.5, 2, 3, 3.5], 'snapped'], [[0, 0.75, 1, 1.5, 2, 2.75, 3, 3.5], 'march'], [[0, 1.5, 2, 3.5], 'syncopated'], [[0, 0.5, 1, 1.5, 2, 3], 'driving'], [[0, 1, 1.5, 2.5, 3], 'habanera']],
  3: [[[0, 0.5, 0.75, 1, 1.5, 2, 2.5], 'polonaise'], [[0, 1, 1.5, 2], 'mazurka'], [[0, 0.5, 1, 2], 'snapped'], [[0, 1, 2, 2.5], 'pushed'], [[0, 0.5, 1, 1.5, 2, 2.5], 'driving']],
  2: [[[0, 2 / 3, 1, 5 / 3], 'tarantella'], [[0, 1 / 3, 1, 4 / 3], 'lilting'], [[0, 1 / 3, 2 / 3, 1, 5 / 3], 'galloping'], [[0, 1], 'rocking']],
};
// Boogie patterns: chord-tone roles over eight shuffled steps (r = root, 3, 5, 6, b7, r8 = octave).
const BOOGIE = [
  [['r', '3', '5', '6', 'b7', '6', '5', '3'], 'classic'],
  [['r', '5', '6', '5', 'r', '5', '6', '5'], 'rocking'],
  [['r', '3', '5', '6', 'r8', '6', '5', '3'], 'climbing'],
  [['r', 'r8', 'b7', 'r8', '6', 'r8', '5', 'r8'], 'pedal-octave'],
  [['r', '5', 'b7', '5', '6', '5', '3', '5'], 'swaying'],
];
// Walking bass: four quarter notes per bar, the last one may approach the next chord.
const WALKING = [
  [['r', '3', '5', '6'], 'diatonic'],
  [['r', '5', '6', 'b7'], 'rising'],
  [['r', '3', '5', 'approach'], 'chromatic'],
  [['r', 'r8', 'b7', '5'], 'falling'],
];
const BLOCK = {
  swing: [[[0, 1, 2, 3], 'on every beat'], [[0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3], 'shuffled'], [[2 / 3, 5 / 3, 8 / 3, 11 / 3], 'on the offbeat'], [[0, 2], 'sparse']],
  4: [[[0, 1, 2, 3], 'on every pulse'], [[0, 2], 'sparse'], [[0, 1.5, 3], 'syncopated'], [[0, 0.5, 2, 2.5], 'with a bounce'], [[0, 1, 2, 2.5, 3], 'with a push'], [[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], 'repeated eighths']],
  3: [[[0, 1, 2], 'on every pulse'], [[0, 2], 'sparse'], [[0, 1.5], 'syncopated'], [[0, 1, 1.5, 2], 'with a push'], [[0, 0.5, 1, 1.5, 2, 2.5], 'repeated eighths']],
  2: [[[0, 1], 'on every pulse'], [[0], 'sparse'], [[0, 2 / 3, 1, 5 / 3], 'lilting'], [[0, 1 / 3, 2 / 3, 1, 4 / 3, 5 / 3], 'flowing']],
};

function drawFiguration(rng, style, tempo) {
  const beats = style.beats;
  const compound = beats === 2;
  const subdivs = compound ? [1, 3, 6] : [1, 2, 3, 4];
  const allowedSub = subdivs.filter((s) => (tempo / 60) * s <= LEFT_NOTES_PER_SEC);
  const kind = weighted(rng, Object.entries(style.kinds));
  const fig = {
    kind, compound, held: chance(rng, 0.55), wide: chance(rng, 0.4),
    lowBass: chance(rng, 0.35), // bass an octave lower than usual
    accentBeat: style.accentBeat ?? 0,
    backbeat: !!style.backbeat,
    cadenceFill: weighted(rng, [['none', 3], ['block', 1], ['rest', 0.6], ['octave', 0.8]]), // what happens in the 4th bar of a phrase
    fill: chance(rng, 0.6), // answer long melody notes with a short run
    swell: chance(rng, 0.3), // crescendo inside every bar
  };
  const subdivName = (s) => (compound ? COMPOUND_SUBDIV_NAMES[s] : SUBDIV_NAMES[s]);
  if (kind === 'broken') {
    const subWeights = allowedSub.map((s) => [s, compound ? (s === 3 ? 4 : s === 6 ? 1 : 0.4) : (s === 1 ? 0.5 : s === 2 ? 3 : s === 3 ? 1.2 : 1.6)]);
    fig.subdiv = weighted(rng, subWeights);
    fig.shape = weighted(rng, Object.entries(style.shapes));
    const steps = beats * fig.subdiv;
    const minLen = 3; // a figure of two tones is an alternation, not a figure
    const lens = [3, 4, 6, 8].filter((l) => l >= minLen && l <= steps && (l === steps || steps % l === 0 || fig.shape === 'walk'));
    // A sweep only sweeps when it has the whole bar to climb.
    fig.cycleLen = fig.shape === 'sweep' ? Math.max(steps, minLen) : pick(rng, lens.length ? lens : [Math.max(steps, minLen)]);
    fig.cycle = makeCycle(rng, fig.shape, fig.cycleLen, minLen);
    fig.alternate = chance(rng, 0.35) ? makeCycle(rng, fig.shape, fig.cycleLen, minLen) : null; // second cycle on even bars
    fig.reverseEven = chance(rng, 0.25); // even bars run the cycle backwards
    fig.label = `broken chords in ${subdivName(fig.subdiv)} (${SHAPE_NAMES[fig.shape]}${fig.alternate ? ', alternating' : ''}${fig.reverseEven ? ', mirrored' : ''})`;
  } else if (kind === 'block') {
    const [strikes, name] = pick(rng, style.swing ? BLOCK.swing : BLOCK[beats]);
    fig.strikes = strikes;
    fig.bassEvery = chance(rng, 0.4);
    fig.rolled = chance(rng, (style.rubato ?? 0.5) >= 0.8 ? 0.6 : 0.25); // chords spread from the bottom
    fig.fourNote = chance(rng, 0.35);
    fig.label = `block chords ${name}${fig.rolled ? ', rolled' : ''}`;
  } else if (kind === 'bassChord') {
    fig.offbeat = !compound && chance(rng, 0.35);
    fig.march = beats === 4 && chance(rng, 0.5);
    fig.doublePulse = compound && chance(rng, 0.5); // bass on both pulses of a 6/8 bar
    fig.chordShort = chance(rng, 0.6);
    fig.altBass = chance(rng, 0.45); // alternate root and fifth in the bass
    fig.skipChord = chance(rng, 0.25) ? pick(rng, [1, 2]) : 0; // leave one chord beat silent
    fig.label = `bass and chord${fig.offbeat ? ' on the offbeat' : ''}${fig.march ? ', march-like' : ''}${fig.altBass ? ', alternating bass' : ''}${fig.skipChord ? ', with rests' : ''}`;
  } else if (kind === 'octaves') {
    fig.subdiv = compound ? (allowedSub.includes(3) && chance(rng, 0.5) ? 3 : 1) : (allowedSub.includes(2) && chance(rng, 0.6) ? 2 : 1);
    fig.withChord = chance(rng, 0.6);
    fig.broken = chance(rng, 0.4); // alternate low and high octave instead of striking both
    fig.lineOffset = Math.floor(rng() * 5);
    fig.label = `${fig.broken ? 'broken octaves' : 'octaves'} in the bass in ${subdivName(fig.subdiv)}${fig.withChord ? ' with a chord' : ''}`;
  } else if (kind === 'boogie') {
    fig.pattern = Math.floor(rng() * BOOGIE.length);
    fig.octaves = chance(rng, 0.45);
    fig.label = `${BOOGIE[fig.pattern][1]} boogie bass${fig.octaves ? ' in octaves' : ''}`;
  } else if (kind === 'walking') {
    fig.pattern = Math.floor(rng() * WALKING.length);
    fig.withChord = chance(rng, 0.6);
    fig.label = `walking bass (${WALKING[fig.pattern][1]})${fig.withChord ? ' with offbeat chords' : ''}`;
  } else if (kind === 'rhythmic') {
    const [strikes, name] = pick(rng, RHYTHMIC[beats]);
    fig.strikes = strikes.filter((s) => s < beats);
    fig.bassOnFirst = chance(rng, 0.7);
    fig.staccato = chance(rng, 0.5);
    fig.altBass = chance(rng, 0.5);
    fig.label = `${name} chord rhythm${fig.staccato ? ', staccato' : ''}`;
  } else {
    // pedalPoint: the bass holds through the bar while chords pulse above it.
    fig.pulse = compound ? pick(rng, [[1], [2 / 3, 4 / 3], [1 / 3, 2 / 3, 1, 4 / 3, 5 / 3]]) : beats === 4 ? pick(rng, [[1, 2, 3], [2], [1.5, 2.5, 3.5], [0.5, 1, 1.5, 2, 2.5, 3, 3.5]]) : pick(rng, [[1, 2], [1.5], [1, 1.5, 2, 2.5]]);
    fig.fifthAbove = chance(rng, 0.4); // pedal on root and fifth
    fig.label = `sustained bass${fig.fifthAbove ? ' with fifth' : ''} under pulsing chords`;
  }
  if (fig.held && (kind === 'broken' || kind === 'bassChord')) fig.label += ', pedal';
  if (fig.lowBass) fig.label += ', deep bass';
  if (fig.cadenceFill !== 'none') fig.label += `, ${{ block: 'block chord', rest: 'breath', octave: 'octave run' }[fig.cadenceFill]} at phrase ends`;
  fig.signature = JSON.stringify(fig);
  return fig;
}

// A variation of a figuration for a repeated section: same kind, one parameter changed.
function varyFiguration(rng, fig, style) {
  const copy = { ...fig };
  if (fig.kind === 'broken') {
    const roll = rng();
    if (roll < 0.4 && fig.cycleLen) { copy.shape = weighted(rng, Object.entries(style.shapes)); copy.cycle = makeCycle(rng, copy.shape, fig.cycleLen, 3); }
    else if (roll < 0.7) copy.held = !fig.held;
    else copy.wide = !fig.wide;
  } else if (fig.kind === 'block') { const [strikes] = pick(rng, BLOCK[style.beats]); copy.strikes = strikes; copy.rolled = chance(rng, 0.4); }
  else if (fig.kind === 'bassChord') copy.altBass = !fig.altBass;
  else if (fig.kind === 'rhythmic') { const [strikes] = pick(rng, RHYTHMIC[style.beats]); copy.strikes = strikes.filter((s) => s < style.beats); copy.altBass = !fig.altBass; }
  else if (fig.kind === 'octaves') { copy.lineOffset = ((fig.lineOffset ?? 0) + 2) % 5; copy.broken = !fig.broken; }
  else copy.held = !fig.held;
  copy.label = fig.label + ' (varied)';
  copy.signature = JSON.stringify(copy);
  return copy;
}

// Cycle of chord-tone indices (-1 = bass) for a broken figuration.
function makeCycle(rng, shape, len, minDistinct = 3) {
  let cyc = [];
  if (shape === 'alberti') { const top = chance(rng, 0.5) ? 2 : 3; for (let i = 0; i < len; i++) cyc.push([0, top, 1, top][i % 4]); cyc[0] = -1; }
  else if (shape === 'updown') { const seq = [-1, 0, 1, 2, 3, 2, 1, 0]; for (let i = 0; i < len; i++) cyc.push(seq[i % seq.length]); }
  else if (shape === 'rising') { for (let i = 0; i < len; i++) cyc.push(i === 0 ? -1 : (i - 1) % 4); }
  else if (shape === 'pedal') { for (let i = 0; i < len; i++) cyc.push(i % 2 === 0 ? -1 : Math.floor(rng() * 3)); }
  else if (shape === 'sweep') { const seq = [-1, 0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0]; for (let i = 0; i < len; i++) cyc.push(seq[Math.floor(i * seq.length / Math.max(len, 1)) % seq.length]); }
  else { let idx = -1; for (let i = 0; i < len; i++) { cyc.push(idx); const step = pick(rng, [1, 1, 2, -1, -1, 0]); idx = Math.max(0, Math.min(3, idx + step)); } }
  // Too few different tones (e.g. bass and one chord tone alternating): fall back to an up-and-down sweep.
  if (new Set(cyc).size < Math.min(minDistinct, len)) { const seq = [-1, 0, 1, 2, 1]; cyc = []; for (let i = 0; i < len; i++) cyc.push(seq[i % seq.length]); }
  return cyc;
}

// Bass note for a chord. The root unless the chord name carries a figure (I64, ii6, V65...):
// an inversion chosen merely because it lies nearer the previous bass is a harmonic accident,
// and a fifth in the bass is a 6/4 chord, which only belongs where it is written.
function bassFor(chord, prevBass, forceRoot, low = 36) {
  const roles = forceRoot ? [[chord.pcs[0], 0]]
    : chord.bassRole !== undefined ? [[chord.pcs[chord.bassRole], 0]]
      : [[chord.pcs[0], 0], [chord.pcs[1], 5], [chord.pcs[2], 12]];
  const anchor = prevBass ?? low + 7;
  const lo = Math.max(24, low - 3), hi = low + 11; // a bass that creeps upward ends up inside the chord
  let best = null, bestCost = Infinity;
  for (const [pc, roleCost] of roles) {
    for (let p = lo; p <= hi; p++) {
      if (p % 12 !== pc) continue;
      let cost = Math.abs(p - anchor) + roleCost;
      if (p < low) cost += 2 * (low - p);
      if (p < 31) cost += 6; // never drift into the mud
      if (cost < bestCost) { bestCost = cost; best = p; }
    }
  }
  return best ?? nearestPc(anchor, roles[0][0], low, low + 11);
}

// Chord tones above the bass. The floor is C3 whatever the bass does: thirds below C3 are mud on
// a real piano, so a deep bass gets a wider gap rather than a lower chord.
const CHORD_FLOOR = 48;
function midVoicing(chord, bass, span, bassLow = 36) {
  const from = Math.max(bass + 4, CHORD_FLOOR);
  const out = [];
  for (let p = from; p <= from + span; p++) if (chord.pcs.includes(p % 12)) out.push(p);
  return out;
}

// Accompaniment for one chord segment. `barInPhrase` is 0..3, `barIndex` counts bars globally.
function accompanySegment(fig, chord, segStart, segLen, beats, rng, state, barInPhrase, barIndex) {
  const notes = [];
  const push = (t, dur, pitch, vel) => { const n0 = { time: near(segStart + t), duration: Math.max(0.1, dur), pitch, velocity: Math.min(1, Math.max(0.05, vel)), hand: 'left' }; notes.push(n0); return n0; };
  const bassLow = fig.lowBass ? 31 : 36;
  const bass = bassFor(chord, state.prevBass, state.forceRoot, bassLow);
  state.prevBass = bass;
  // Register reaction: keep the chord below the melody's lowest note in this bar.
  const ceiling = state.melodyLow != null ? state.melodyLow - 3 : 99;
  state.ceiling = Math.max(ceiling, CHORD_FLOOR + 7); // the guards must not be boxed in by a low melody
  const span = fig.shape === 'sweep' ? 24 : fig.wide ? 19 : 12;
  let mid = midVoicing(chord, bass, span, bassLow).filter((p) => p <= ceiling);
  if (mid.length < 3) mid = midVoicing(chord, bass, Math.max(span, 19), bassLow).filter((p) => p <= ceiling);
  if (mid.length < 3) {
    // Under a low melody the voicing gets squeezed; reach down to the chord floor rather than
    // shrink to two tones, which would turn any figure into an alternation.
    const low2 = [];
    for (let p = CHORD_FLOOR; p <= ceiling; p++) if (chord.pcs.includes(p % 12) && p > bass) low2.push(p);
    if (low2.length >= 3) mid = low2;
  }
  if (mid.length < 3) {
    // Nothing fits under the melody at the usual height: reach further down, and at worst up to the
    // melody's own lowest note. Crossing above it is always worse than a low or close voicing.
    const cap = ceiling + 2; // never in unison with the melody
    for (const floorAt of [bass + 3, bass + 1, 40]) {
      const v = [];
      for (let p = Math.max(floorAt, 36); p <= cap; p++) if (chord.pcs.includes(p % 12)) v.push(p);
      if (v.length >= 3) { mid = v; break; }
      if (v.length > mid.length) mid = v;
    }
  }
  if (!mid.length) mid = midVoicing(chord, bass, 19, bassLow);
  const chordNotes = mid.slice(0, fig.fourNote ? 4 : 3);
  // Complementary density: thin out under a busy melody, add motion under a sparse one.
  const busy = (state.melodyOnsets ?? 0) >= beats * 2;
  const sparse = (state.melodyOnsets ?? 0) > 0 && state.melodyOnsets <= 2 && barInPhrase !== 3;
  const onPulse = (s) => isInt(s) || (fig.compound && isInt(s * 3));
  const fifthBass = nearestPc(bass, chord.pcs[2], bassLow, bassLow + 11);
  const tone = (idx) => (idx < 0 ? bass : mid[idx % mid.length]);
  const accent = (t) => {
    let a = isInt(t) && Math.round(t) === 0 ? 1.15 : isInt(t) ? 1 : 0.88;
    if (fig.accentBeat && isInt(t) && Math.round(t) === fig.accentBeat) a = 1.3;
    if (fig.backbeat && isInt(t) && Math.round(t) % 2 === 1) a *= 1.2;
    if (fig.swell) a *= 0.85 + 0.3 * (t / segLen);
    return a;
  };
  const even = barIndex % 2 === 1;

  // Phrase-end fills replace the normal pattern in the last bar of a phrase.
  if (barInPhrase === 3 && fig.cadenceFill !== 'none' && segStart % beats === 0) {
    if (fig.cadenceFill === 'block') {
      push(0, segLen, bass, 0.55); chordNotes.forEach((p) => push(0, segLen, p, 0.4));
      return limitRepeats(notes, chord, state, bassLow);
    }
    if (fig.cadenceFill === 'rest') {
      push(0, Math.min(1, segLen), bass, 0.5); chordNotes.forEach((p) => push(0, Math.min(1, segLen), p, 0.35));
      return limitRepeats(notes, chord, state, bassLow);
    }
    if (fig.cadenceFill === 'octave') {
      // An upward chord-tone run into the next chord: distinct pitches, not two notes alternating.
      const unit = fig.compound ? 1 / 3 : 0.5;
      const steps = Math.round(segLen / unit);
      const tones = [bass, ...midVoicing(chord, bass, 22, bassLow)].filter((p, i, a) => a.indexOf(p) === i && p <= ceiling);
      for (let i = 0; i < steps; i++) {
        let p = tones[Math.min(i, tones.length - 1)];
        if (i === steps - 1 && state.nextBass != null && tones.length > 1) {
          const goal = state.nextBass + 12;
          p = tones.reduce((a, b) => (Math.abs(b - goal) < Math.abs(a - goal) ? b : a));
        }
        push(i * unit, unit * 0.9, p, 0.42 + 0.02 * i);
      }
      return limitRepeats(notes, chord, state, bassLow);
    }
  }

  if (fig.kind === 'broken' && mid.length < 3) {
    // Squeezed under a low melody: a running figure would hammer two tones, so the texture thins
    // to a held chord for this bar instead.
    push(0, segLen, bass, 0.5 * accent(0));
    mid.forEach((p) => push(0, segLen, p, 0.34 * accent(0)));
  } else if (fig.kind === 'broken') {
    let subdiv = fig.subdiv;
    let cycle = fig.alternate && even ? fig.alternate : fig.cycle;
    if (fig.reverseEven && even) cycle = [cycle[0], ...cycle.slice(1).reverse()];
    if (busy && subdiv >= 2) { subdiv = subdiv === 3 ? 1 : subdiv / 2; cycle = cycle.filter((_, i) => i % 2 === 0); }
    const step = 1 / subdiv;
    const steps = Math.round(segLen * subdiv);
    for (let i = 0; i < steps; i++) {
      const t = i * step;
      const idx = cycle[i % cycle.length];
      const dur = fig.held ? segLen - t : step * 0.95;
      push(t, dur, tone(idx), (idx < 0 ? 0.5 : 0.36) * accent(t) + rng() * 0.04);
    }
  } else if (fig.kind === 'block') {
    const strikes = thinned(fig.strikes, segLen, busy, onPulse);
    // Chords struck many times in a bar travel through inversions instead of standing still.
    const travel = strikes.length >= 5 ? [0, 0, 1, 1, 2, 2, 1, 1] : strikes.length >= 3 ? [0, 1, 2, 1] : [0];
    strikes.forEach((s, i) => {
      const nextT = strikes[i + 1] ?? segLen;
      const dur = fig.held ? nextT - s : Math.min(0.9, nextT - s);
      if (i === 0 || fig.bassEvery) push(s, dur, fig.bassEvery && i % 2 === 1 ? fifthBass : bass, 0.5 * accent(s));
      const voicing = invert(chordNotes, travel[(i + (even ? 2 : 0)) % travel.length], ceiling);
      const wide = voicing[voicing.length - 1] - bass > 16;
      voicing.forEach((p) => { const n0 = push(s, dur, p, 0.36 * accent(s) + rng() * 0.04); if (fig.rolled || wide) n0.spread = true; });
      if ((fig.rolled || wide) && (i === 0 || fig.bassEvery)) notes.filter((x) => Math.abs(x.time - (segStart + s)) < 1e-6).forEach((x) => { x.spread = true; });
    });
  } else if (fig.kind === 'bassChord') {
    const unit = fig.compound ? 1 / 3 : 1;
    const bassBeats = fig.compound ? (fig.doublePulse && segLen >= 2 ? [0, 1] : [0]) : fig.march && segLen >= 4 ? [0, 2] : [0];
    if (busy) fig = { ...fig, offbeat: false, chordShort: true };
    const chordBeats = [];
    for (let b = 0; b < segLen - 1e-6; b = near(b + unit)) {
      if (bassBeats.some((x) => Math.abs(x - b) < 1e-6)) { if (fig.offbeat && b + 0.5 < segLen) chordBeats.push(b + 0.5); }
      else chordBeats.push(fig.offbeat && b + 0.5 < segLen ? b + 0.5 : b);
    }
    bassBeats.forEach((b, i) => push(b, fig.held ? segLen - b : 1.2 * unit, fig.altBass && (i % 2 === 1 || (bassBeats.length === 1 && even)) ? fifthBass : bass, 0.55 * accent(b)));
    chordBeats.forEach((b, i) => { if (fig.skipChord && (i + 1) % (fig.skipChord + 1) === 0) return; chordNotes.forEach((p) => push(b, fig.chordShort ? 0.45 * unit : 0.9 * unit, p, 0.33 * accent(b) + rng() * 0.04)); });
  } else if (fig.kind === 'octaves') {
    // Octaves follow a bass line (root, fifth, third, octave) instead of hammering one pitch;
    // the last step approaches the next chord's bass from the nearest chord tone.
    const step = 1 / fig.subdiv;
    const steps = Math.round(segLen * fig.subdiv);
    const low = bass - 12 >= 24 ? bass - 12 : bass;
    const lo = Math.max(24, low - 6);
    const third = nearestPc(low, chord.pcs[1], lo, lo + 11);
    const fifth = nearestPc(low, chord.pcs[2], lo, lo + 11);
    const lines = [[low, low, fifth, low], [low, fifth, low + 12, fifth], [low, third, fifth, low + 12], [low, low + 12, fifth, low], [low, fifth, third, low]];
    const line = lines[(barIndex + (fig.lineOffset ?? 0)) % lines.length];
    for (let i = 0; i < steps; i++) {
      const t = i * step;
      let p = line[i % line.length];
      if (i === steps - 1 && state.nextBass !== null && state.nextBass !== undefined && steps > 1) {
        const cands = [low, third, fifth, low + 12].filter((c) => c !== p);
        p = cands.reduce((a, b) => (Math.abs(b - state.nextBass) < Math.abs(a - state.nextBass) ? b : a));
      }
      if (fig.broken) push(t, step * 0.9, i % 2 ? p + 12 : p, 0.46 * accent(t));
      else { push(t, step * 0.9, p, 0.48 * accent(t)); push(t, step * 0.9, p + 12, 0.42 * accent(t)); }
    }
    if (fig.withChord) chordNotes.forEach((p) => push(0, fig.held ? segLen : 1, p, 0.3));
  } else if (fig.kind === 'boogie' || fig.kind === 'walking') {
    const root = nearestPc(bass, chord.pcs[0], bassLow, bassLow + 11);
    const isMinor = chord.quality === 'min7' || chord.quality === 'min';
    const roleMap = { r: root, 3: root + (isMinor ? 3 : 4), 5: root + 7, 6: root + 9, b7: root + 10, r8: root + 12 };
    if (fig.kind === 'boogie') {
      const roles = BOOGIE[fig.pattern][0];
      const times = [0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3].filter((t) => t < segLen);
      times.forEach((t, i) => {
        const p = roleMap[roles[i % roles.length]];
        const vel = (isInt(t) ? 0.5 : 0.4) * accent(t);
        push(t, isInt(t) ? 0.6 : 0.3, p, vel);
        if (fig.octaves) push(t, isInt(t) ? 0.6 : 0.3, p + 12, vel * 0.85);
      });
    } else {
      const roles = WALKING[fig.pattern][0];
      for (let b = 0; b < segLen; b++) {
        let p = roleMap[roles[b % roles.length]];
        if (roles[b % roles.length] === 'approach' || (b === segLen - 1 && state.nextBass != null && chance(rng, 0.5))) {
          const target = state.nextBass ?? root;
          p = target === root ? root + 7 : target + (target > root ? -1 : 1);
        }
        push(b, 0.95, p, 0.5 * accent(b));
        if (fig.withChord && b + 2 / 3 < segLen) chordNotes.forEach((c) => push(b + 2 / 3, 0.3, c, 0.28 * accent(b)));
      }
    }
  } else if (fig.kind === 'rhythmic') {
    const strikes = thinned(fig.strikes, segLen, busy, onPulse);
    const base = barIndex % 3; // the inversion changes every bar
    strikes.forEach((s, i) => {
      const nextT = strikes[i + 1] ?? segLen;
      const dur = fig.staccato ? Math.min(0.3, nextT - s) : nextT - s;
      if (i === 0 && fig.bassOnFirst) push(s, fig.held ? segLen : dur, even && fig.altBass ? fifthBass : bass, 0.55 * accent(s));
      const voicing = invert(chordNotes, strikes.length >= 5 ? (base + [0, 0, 1, 1, 2, 1, 0, 1][i % 8]) % 3 : base, ceiling);
      voicing.forEach((p) => push(s, dur, p, 0.36 * accent(s) + rng() * 0.04));
    });
  } else {
    // pedalPoint
    push(0, segLen, bass, 0.52);
    if (fig.fifthAbove) push(0, segLen, fifthBass > bass ? fifthBass : fifthBass + 12, 0.4);
    const voicings = [chordNotes, invert(chordNotes, 1, ceiling), invert(chordNotes, 2, ceiling), invert(chordNotes, 1, ceiling)];
    thinned(fig.pulse, segLen, busy, onPulse).forEach((s, i) => voicings[(i + barIndex) % voicings.length].forEach((p) => push(s, fig.held ? segLen - s : 0.6, p, 0.3 * accent(s) + rng() * 0.03)));
  }
  // Under a sparse melody a static texture answers with a short run of chord tones on the last pulse.
  if (sparse && fig.fill && ['block', 'bassChord', 'rhythmic', 'pedalPoint'].includes(fig.kind) && segLen >= 2) {
    const unit = fig.compound ? 1 / 3 : 0.5;
    const tones = even ? [...mid].reverse() : mid;
    for (let k = 0; k < 2; k++) push(segLen - 1 + k * unit, unit * 0.9, tones[k % tones.length], 0.34 + 0.03 * k);
  }
  return limitRepeats(notes, chord, state, bassLow);
}

// Strike positions inside a segment, reduced to the pulses under a busy melody (never empty).
function thinned(strikes, segLen, busy, onPulse) {
  const inSeg = strikes.filter((s) => s < segLen);
  if (!busy) return inSeg;
  const kept = inSeg.filter(onPulse);
  return kept.length ? kept : inSeg.slice(0, 1);
}

// Chord voicing with the lowest note moved up an octave `n` times.
function invert(voicing, n, ceiling = 999) {
  let v = [...voicing].sort((a, b) => a - b);
  for (let i = 0; i < n; i++) v = [...v.slice(1), v[0] + 12].sort((a, b) => a - b);
  v = [...new Set(v)]; // a wide voicing can land on an existing pitch: never double it
  // An inversion that climbs over the melody is voice crossing, not a variation: the whole voicing
  // comes down as a block, so no tone is lost and the figure keeps its shape.
  while (v[v.length - 1] > ceiling && v[0] - 12 >= 40) v = v.map((p) => p - 12);
  return v;
}

// Repeat guards for the left hand, applied strike by strike (a strike = notes within an eighth of
// a pulse, so rolled chords count once):
//  1. the identical set of pitches is never struck more than twice in a row, and two strikes never
//     alternate (A B A B) for more than two cycles: the offender gets a variation (inversion, fifth or
//     third in the bass, octave shift);
//  2. no single pitch is struck more than HAMMER_MAX times in a row at eighth-note spacing or faster,
//     whatever else sounds around it (common tones survive inversions, bass pedals recur every other
//     step): the next two recurrences are replaced by another chord tone, or the voice rests.
// Repeated strikes also get a little softer so that repetition breathes.
const HAMMER_MAX = 4;

function limitRepeats(notes, chord, state, bassLow) {
  const sorted = [...notes].sort((a, b) => a.time - b.time);
  const onsets = [];
  for (const n of sorted) {
    const g = onsets[onsets.length - 1];
    // Rolled chords: each note follows the previous one closely, so chain them.
    if (g && n.time - g[g.length - 1].time < 0.1) g.push(n); else onsets.push([n]);
  }
  state.history = state.history ?? [];
  state.hammer = state.hammer ?? {}; // pitch -> { last, count }
  const live = (g) => g.filter((n) => !n.drop);
  const keyOf = (g) => live(g).map((n) => n.pitch).sort((a, b) => a - b).join(',');
  const h = state.history;

  for (const g of onsets) {
    const t = g[0].time;
    // The same pitch twice inside one strike (a fill or a bass landing on a chord tone): keep the first.
    const seen = new Set();
    for (const n of g) { if (seen.has(n.pitch)) n.drop = true; else seen.add(n.pitch); }
    const updates = {}; // hammer decisions taken inside this strike, applied to the state at the end
    const recOf = (p) => updates[p] ?? state.hammer[p];
    const hot = (p) => { const r = recOf(p); return r && t - r.last <= 0.5 + 1e-6 ? Math.max(0, r.count) : 0; };
    const cooling = (p) => { const r = recOf(p); return !!r && t - r.last <= 0.5 + 1e-6 && r.count <= 0; };
    const wouldHammer = (grp) => live(grp).some((n) => hot(n.pitch) + 1 > HAMMER_MAX || cooling(n.pitch));

    // 1. Strike-level repetition.
    let key = keyOf(g);
    const repeats = key === state.lastKey ? state.run + 1 : 1;
    const alternating = (k) => h.length >= 4 && k === h[h.length - 2] && h[h.length - 1] === h[h.length - 3] && h[h.length - 2] === h[h.length - 4];
    if (repeats >= 2) g.forEach((n) => { n.velocity *= Math.pow(0.93, Math.min(repeats, 4) - 1); });
    if (repeats >= 3 || alternating(key)) {
      const forbidden = new Set([key, h[h.length - 1], h[h.length - 2]]);
      const bassNotes = g.filter((n) => n.pitch < 48);
      const upper = g.filter((n) => n.pitch >= 48).sort((a, b) => a.pitch - b.pitch);
      const fifth = nearestPc(bassLow + 5, chord.pcs[2], bassLow, bassLow + 11);
      const third = nearestPc(bassLow + 5, chord.pcs[1], bassLow, bassLow + 11);
      // Downward variants first: moving the accompaniment up crosses the melody.
      const variants = [
        () => { if (upper.length > 1 && upper[upper.length - 1].pitch - 12 > (bassNotes[0]?.pitch ?? 0) + 2) upper[upper.length - 1].pitch -= 12; },
        () => { if (bassNotes.length) { const d = third - bassNotes[0].pitch; bassNotes.forEach((n) => { n.pitch += d; }); } },
        () => { if (bassNotes.length) { const d = fifth - bassNotes[0].pitch; bassNotes.forEach((n) => { n.pitch += d; }); } },
        () => { if (upper.length) upper[0].pitch += 12; }, // first inversion up
        () => { bassNotes.forEach((n) => { n.pitch += n.pitch + 12 <= 55 ? 12 : -12; }); },
        () => { g.forEach((n) => { n.pitch += n.pitch + 12 <= 72 ? 12 : -12; }); },
      ];
      const ceil = state.ceiling ?? 999;
      const startAt = state.variantSeed++ % variants.length;
      const original = g.map((n) => n.pitch);
      let accepted = false;
      for (let k = 0; k < variants.length && !accepted; k++) {
        g.forEach((n, i) => { n.pitch = original[i]; });
        variants[(startAt + k) % variants.length]();
        g.forEach((n) => { n.pitch = Math.max(21, Math.min(84, n.pitch)); });
        accepted = !forbidden.has(keyOf(g)) && !wouldHammer(g) && live(g).every((n) => n.pitch <= ceil);
      }
      if (!accepted) {
        // Accept any change of key that still stays under the melody; then any change at all.
        for (const strict of [true, false]) {
          for (let k = 0; k < variants.length; k++) {
            g.forEach((n, i) => { n.pitch = original[i]; });
            variants[(startAt + k) % variants.length]();
            g.forEach((n) => { n.pitch = Math.max(21, Math.min(84, n.pitch)); });
            if (!forbidden.has(keyOf(g)) && (!strict || live(g).every((n) => n.pitch <= ceil))) { accepted = true; break; }
          }
          if (accepted) break;
        }
        // Last resort: thin the strike, or drop it an octave. Anything but the same chord again.
        if (forbidden.has(keyOf(g))) {
          const alive = live(g).sort((a, b) => a.pitch - b.pitch);
          if (alive.length > 1) alive[alive.length - 1].drop = true;
          else if (alive[0].pitch - 12 >= 33) alive[0].pitch -= 12;
        }
      }
      key = keyOf(g);
    }

    // 2. Per-pitch hammering (decisions recorded, state applied at the end).
    const done = new Set();
    for (const n of g) {
      if (n.drop || done.has(n.pitch)) continue;
      const rec = state.hammer[n.pitch] ?? { last: -99, count: 0 };
      const fast = t - rec.last <= 0.5 + 1e-6;
      // A pitch that has just been substituted away comes back on probation, not with a clean slate.
      const count = fast ? (rec.count === 0 ? 3 : rec.count + 1) : 1;
      if (count > HAMMER_MAX || count <= 0) {
        const old = n.pitch;
        const present = new Set(live(g).map((x) => x.pitch));
        const ceil2 = state.ceiling ?? 72;
        const pool = [];
        for (let p = Math.max(24, old - 12); p <= Math.min(Math.min(72, ceil2), old + 12); p++) {
          if (p === old || present.has(p) || !chord.pcs.includes(p % 12)) continue;
          if ((old < 48) !== (p < 48)) continue;
          pool.push(p);
        }
        // A substitute that would not itself be hammered, is not simply the octave, and sits a
        // third or a fourth away: the figure keeps its shape instead of wobbling.
        const prevPitches = new Set((h[h.length - 1] ?? '').split(',').map(Number));
        const cands = pool.filter((p) => !updates[p] && !cooling(p) && hot(p) + 1 <= HAMMER_MAX)
          .map((p) => {
            const d = Math.abs(p - old);
            let cost = hot(p) * 10 + d;
            if (d === 12) cost += 20;
            if (d >= 3 && d <= 5) cost -= 3;
            if (prevPitches.has(p)) cost += 6;
            return [p, cost];
          }).sort((a, b) => a[1] - b[1]);
        // A substitution must not itself create the repetition the other guard just prevented.
        const wouldRepeat = (p) => live(g).length === 1 && h[h.length - 1] === String(p);
        const safe = cands.filter(([p]) => !wouldRepeat(p));
        const usable = safe.length ? safe : cands;
        if (usable.length) {
          const target = usable[0][0];
          g.forEach((x) => { if (x.pitch === old) x.pitch = target; });
          updates[target] = { last: t, count: hot(target) + 1 };
          done.add(target);
        } else {
          // No substitute that would not itself be hammered: the voice rests instead of hammering
          // on, even when it is the only note in the strike.
          g.forEach((x) => { if (x.pitch === old) x.drop = true; });
        }
        updates[old] = { last: t, count: count > HAMMER_MAX ? -1 : 0 }; // two substitutions, then it may return
        done.add(old);
        continue;
      }
      updates[n.pitch] = { last: t, count };
      done.add(n.pitch);
    }
    Object.assign(state.hammer, updates);

    // Safety net: whatever the substitutions did, three identical strikes never leave this function.
    if (keyOf(g) && keyOf(g) === h[h.length - 1] && keyOf(g) === h[h.length - 2]) {
      const alive = live(g).sort((a, b) => a.pitch - b.pitch);
      const down = alive[0].pitch - 12;
      if (alive.length > 1) alive[alive.length - 1].drop = true;
      else if (down >= 33 && hot(down) + 1 <= HAMMER_MAX && !cooling(down)) { alive[0].pitch = down; state.hammer[down] = { last: t, count: hot(down) + 1 }; }
      else alive[0].drop = true;
    }
    key = keyOf(g);
    // A strike that fell silent is not a repetition; the history only remembers what was heard.
    if (key) {
      state.run = key === state.lastKey ? state.run + 1 : 1;
      state.lastKey = key;
      h.push(key);
      if (h.length > 8) h.shift();
    }
  }
  return notes.filter((n) => !n.drop);
}

// ---------------------------------------------------------------------------

// Shared assembly of a piece: places melody phrases and accompaniment bars on the timeline.
function createAssembler({ rngMelody, rngLeft, beats, ch, scale, tempo, style, sectionDynamics, pickup }) {
  const melody = [];
  const accomp = [];
  const chordsTimeline = [];
  const sections = [];
  const accState = { prevBass: null, forceRoot: false, nextBass: null, lastKey: null, run: 0, variantSeed: 0 };
  const STATIC_KINDS = ['rhythmic', 'block', 'octaves', 'pedalPoint'];
  const secondHalf = new Map(); // figuration -> its variant used in the second phrase of a section
  let cursor = 0; // in bars
  let prevMelodyPitch = null;

  const addAccomp = (bars, fig, { forceRootFirst = true, phraseBars = true, phraseIndex = 0, alwaysRoot = false, dyn = 1 } = {}) => {
    // Static textures never run through a whole section unchanged: the second phrase gets a variant.
    if (phraseIndex === 1 && STATIC_KINDS.includes(fig.kind)) {
      if (!secondHalf.has(fig)) secondHalf.set(fig, varyFiguration(rngLeft, fig, style));
      fig = secondHalf.get(fig);
    }
    const flat = bars.flatMap((segments, i) => segments.map((seg, j) => ({ seg, i, j, segments })));
    flat.forEach(({ seg, i, j, segments }, idx) => {
      chordsTimeline.push({ bar: cursor + i, start: seg.start, chord: seg.name, pcs: seg.pcs });
      // What the melody does in this bar: how many notes, how low it goes.
      const b0 = (cursor + i) * beats, b1 = b0 + beats;
      const inBar = melody.filter((n) => !n.ornament && n.time >= b0 - 1e-6 && n.time < b1 - 1e-6);
      accState.melodyOnsets = new Set(inBar.map((n) => n.time.toFixed(3))).size;
      accState.melodyLow = inBar.length ? Math.min(...inBar.map((n) => n.pitch)) : null;
      accState.forceRoot = alwaysRoot || (i === 0 && j === 0 && forceRootFirst) || (i === 3 && j === segments.length - 1);
      const next = flat[idx + 1]?.seg;
      accState.nextBass = next ? nearestPc(accState.prevBass ?? 43, next.pcs[0], fig.lowBass ? 31 : 36, (fig.lowBass ? 31 : 36) + 11) : null;
      // Staccato textures stay dry; everything else may be held by the pedal at playback.
      const dry = !!(fig.staccato || fig.chordShort || fig.kind === 'rhythmic' || fig.kind === 'walking');
      accomp.push(...accompanySegment(fig, seg, (cursor + i) * beats + seg.start, seg.len, beats, rngLeft, accState, phraseBars ? i : -1, cursor + i).map((n) => ({ ...n, dyn, pedal: !dry })));
    });
  };

  // An upbeat into the phrase: scale steps leading into its first note, taken out of the
  // previous note's length so the two never overlap.
  const addPickup = (firstPitch, dyn) => {
    if (!pickup || cursor === 0) return;
    const len = pickup.reduce((s, d) => s + d, 0);
    const start = near(cursor * beats - len);
    if (start < 0) return;
    const seg = [...chordsTimeline].reverse().find((c) => c.bar * beats + c.start <= start + 1e-6);
    if (!seg) return;
    const pitches = [];
    let p = firstPitch;
    for (let k = 0; k < pickup.length; k++) { p = nearestScaleStep(scale, p, -1); pitches.unshift(p); }
    if (pitches[0] < MELODY_LOW - 4) return;
    if (prevMelodyPitch !== null && Math.abs(pitches[0] - prevMelodyPitch) > 12) return;
    if (pickup.length > 1 && !seg.pcs.includes(((pitches[0] % 12) + 12) % 12)) return;
    // The upbeat takes the previous note's tail; it never sounds on top of a note still to come.
    const lastNote = melody.length ? melody.reduce((a, b) => (b.time > a.time ? b : a)) : null;
    if (lastNote && lastNote.time > start - tempo / (60 * MELODY_NOTES_PER_SEC) + 1e-6) return;
    for (const n of melody) if (n.time < start && n.time + n.duration > start) n.duration = Math.max(0.05, start - n.time);
    let t = start;
    pitches.forEach((pitch, k) => {
      melody.push({ time: near(t), duration: pickup[k], pitch, hand: 'right', strong: false, bar: cursor - 1, dyn: dyn * 0.85, pickup: true });
      t = near(t + pickup[k]);
    });
    prevMelodyPitch = pitches[pitches.length - 1];
  };

  const addMelody = (phrase, sectionName, opts = {}) => {
    const dyn = opts.dyn ?? sectionDynamics[sectionName] ?? 1;
    const graceStep = Math.max(1 / 24, near(0.08 * tempo / 60));
    if (opts.pickup && phrase.notes.length) addPickup(phrase.notes[0].pitch, dyn);
    phrase.notes.forEach((n, i) => {
      let { time, duration } = n;
      const absTime = cursor * beats + time;
      const wantGrace = ch.grace > 0 && !n.ornament && ((i === 0 && chance(rngMelody, ch.grace)) || (n.strong && duration >= 1.5 && chance(rngMelody, ch.grace * 0.5)));
      // A grace note steals time from the main note; keep the main note inside the note budget.
      if (wantGrace && (duration - graceStep) * (60 / tempo) >= 1 / MELODY_NOTES_PER_SEC && duration >= 0.75) {
        // Grace note on the side of the previous note, so it never widens a leap.
        const dir = prevMelodyPitch === null ? -1 : prevMelodyPitch < n.pitch ? -1 : +1;
        const gp = nearestScaleStep(scale, n.pitch, dir);
        melody.push({ time: near(absTime), duration: graceStep * 0.8, pitch: gp, hand: 'right', strong: false, bar: cursor + n.bar, dyn, ornament: true, ornFactor: 0.68 });
        time = near(time + graceStep); duration -= graceStep;
      }
      melody.push({ time: near(cursor * beats + time), duration, pitch: n.pitch, hand: 'right', strong: n.strong, bar: cursor + n.bar, dyn, ornament: !!n.ornament, ornFactor: n.ornFactor });
      prevMelodyPitch = n.pitch;
      if (opts.octaves && duration >= 1 && n.pitch - 12 >= 55) melody.push({ time: near(cursor * beats + time), duration, pitch: n.pitch - 12, hand: 'right', strong: n.strong, bar: cursor + n.bar, dyn: dyn * 0.8 });
    });
  };

  const ringPulses = ringPulsesFor(tempo);
  // The last chord is struck once and rolled from the bottom, the way a pianist ends a piece.
  // Striking it again in the second bar lands in the middle of the ritardando as a bump.
  const finalChord = (pitch, bars, fig) => {
    const len = beats * bars.length;
    const t0 = cursor * beats;
    const chord = bars[0][0];
    const bassLow = fig.lowBass ? 31 : 36;
    const bass = bassFor(chord, accState.prevBass, true, bassLow);
    const stack = [...new Set([bass - 12 >= 26 ? bass - 12 : bass, bass, ...midVoicing(chord, bass, 16, bassLow).slice(0, 3)])].sort((a, b) => a - b);
    const off = (k) => near(k * 0.04);
    const ring = Math.min(len, Math.max(1.5, ringPulses));
    stack.forEach((p, k) => accomp.push({ time: near(t0 + off(k)), duration: ring - off(k), pitch: p, velocity: k === 0 ? 0.52 : 0.4, hand: 'left', dyn: 1, roll: true }));
    const n = stack.length;
    melody.push({ time: near(t0 + off(n)), duration: ring - off(n), pitch, hand: 'right', strong: true, bar: cursor, dyn: 0.95, roll: true });
    if (pitch - 12 >= 55) melody.push({ time: near(t0 + off(n - 1)), duration: ring - off(n - 1), pitch: pitch - 12, hand: 'right', strong: true, bar: cursor, dyn: 0.8, roll: true });
    bars.forEach((segments, i) => segments.forEach((seg) => chordsTimeline.push({ bar: cursor + i, start: seg.start, chord: seg.name, pcs: seg.pcs })));
    cursor += bars.length;
  };

  return {
    melody, accomp, chordsTimeline, sections, addAccomp, addMelody, finalChord,
    section: (name) => sections.push({ name, bar: cursor }),
    advance: (n) => { cursor += n; },
    get cursor() { return cursor; },
  };
}

function finishPiece(asm, { rngMelody, beats, introLength, style, seed, melodySeed, leftSeed, mode, styleKey, rootPc, tempo, beatUnit, meter, features, description, finalBars }) {
  const finalOnsetBars = finalBars ?? 2;
  const { melody, accomp } = asm;
  const totalBars = asm.cursor;
  const totalBeats = totalBars * beats;
  const secToPulse = tempo / 60; // seconds -> pulses
  const [level, range] = style.dynamic ?? [0.62, 0.24];
  const periodBeats = 8 * beats;
  const t0 = introLength * beats;

  // Where the melody peaks inside each eight-bar period, and how high it sits on average:
  // the phrase swell is built around that, not around a fixed staircase.
  const period = (t) => Math.floor(Math.max(0, t - t0) / periodBeats);
  const relPos = (t) => (Math.max(0, t - t0) % periodBeats) / periodBeats;
  const stat = new Map();
  for (const n of melody) {
    const k = period(n.time);
    const s0 = stat.get(k) ?? { peak: -1, peakPos: 0.55, sum: 0, count: 0 };
    if (n.pitch > s0.peak) { s0.peak = n.pitch; s0.peakPos = Math.max(0.3, Math.min(0.8, relPos(n.time))); }
    s0.sum += n.pitch; s0.count++;
    stat.set(k, s0);
  }
  const archAt = (t) => {
    const s0 = stat.get(period(t));
    const pp = s0 ? s0.peakPos : 0.55;
    const pos = relPos(t);
    const x = pos <= pp ? 0.5 * pos / Math.max(0.05, pp) : 0.5 + 0.5 * (pos - pp) / Math.max(0.05, 1 - pp);
    return Math.pow(Math.sin(Math.PI * Math.max(0, Math.min(1, x))), 0.8);
  };
  // A slow seeded drift reads as intention; white noise per note reads as dice.
  const drift = [];
  for (let i = 0; i <= Math.ceil(totalBeats / 2) + 1; i++) drift.push((rngMelody() - 0.5) * 0.05);
  const driftAt = (t) => {
    const x = Math.max(0, t) / 2, i = Math.floor(x), f = x - i;
    return drift[i] * (1 - f) + drift[Math.min(i + 1, drift.length - 1)] * f;
  };
  const accentAt = (n) => {
    const posInBar = n.time - Math.floor(n.time / beats + 1e-6) * beats;
    let a = n.strong ? (beats === 4 && Math.round(posInBar) === 2 ? 1.02 : 1.08) : 0.94;
    if (style.accentBeat && isInt(posInBar) && Math.round(posInBar) === style.accentBeat) a *= 1.14;
    if (style.backbeat && isInt(posInBar) && Math.round(posInBar) % 2 === 1) a *= 1.08;
    return a;
  };

  melody.forEach((n) => {
    const s0 = stat.get(period(n.time));
    const mean = s0 && s0.count ? s0.sum / s0.count : n.pitch;
    const contour = Math.max(-0.15, Math.min(0.15, 0.014 * (n.pitch - mean)));
    const tail = relPos(n.time) > 0.9 ? 0.92 : 1; // the phrase ends by tapering, not by stopping
    let v = level * (1 - range / 2 + range * archAt(n.time)) * (1 + contour) * accentAt(n) * (n.dyn ?? 1) * tail;
    if (s0 && n.pitch === s0.peak) v *= 1.06;
    v *= n.ornFactor ?? 1;
    n.velocity = Math.max(0.15, Math.min(1, v + driftAt(n.time) + (rngMelody() - 0.5) * 0.02));
  });

  // Articulation: legato inside a step, a breath after a leap, a real gap at phrase ends.
  const legato = 0.03 * secToPulse, lift = 0.06 * secToPulse, breath = 0.12 * secToPulse, phraseEnd = 0.25 * secToPulse;
  const staccatoStyle = ['march', 'polonaise', 'tarantella', 'mazurka'].includes(styleKey);
  const plain = melody.filter((n) => !n.ornament && !n.roll).sort((a, b) => a.time - b.time || b.pitch - a.pitch);
  const groups = [];
  for (const n of plain) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(g.time - n.time) < 1e-6) g.notes.push(n); else groups.push({ time: n.time, notes: [n] });
  }
  groups.forEach((g, i) => {
    const nx = groups[i + 1];
    if (!nx) return;
    const ioi = nx.time - g.time;
    if (ioi <= 0) return;
    const top = g.notes[0], nextTop = nx.notes[0];
    const interval = Math.abs(nextTop.pitch - top.pitch);
    const barsApart = Math.floor((nx.time - t0) / periodBeats) !== Math.floor((g.time - t0) / periodBeats);
    let dur;
    if (barsApart) dur = Math.min(top.duration, ioi - phraseEnd);
    else if (interval === 0) dur = ioi - lift;
    else if (staccatoStyle && top.strong && top.duration <= 0.5) dur = 0.55 * ioi;
    else if (interval <= 2) dur = ioi + legato;
    else if (interval >= 5) dur = Math.max(0.6 * ioi, ioi - breath);
    else dur = ioi - 0.4 * lift;
    if (top.duration >= 1.5 && !barsApart) dur = Math.max(dur, top.duration * 0.95);
    dur = Math.max(Math.min(0.08, ioi * 0.5), Math.min(dur, ioi + legato));
    g.notes.forEach((n) => { n.duration = dur; });
  });

  // Nothing closer than a fourth sounds below C3: on a piano that interval is mud, wherever it
  // came from (a guard substitution, a wide voicing, a deep bass).
  const lowGroups = new Map();
  for (const n of accomp) {
    if (n.pitch >= CHORD_FLOOR) continue;
    const k = n.time.toFixed(3);
    if (!lowGroups.has(k)) lowGroups.set(k, []);
    lowGroups.get(k).push(n);
  }
  for (const ns of lowGroups.values()) {
    ns.sort((a, b) => a.pitch - b.pitch);
    for (let i = 1; i < ns.length; i++) {
      const d = ns[i].pitch - ns[i - 1].pitch;
      if (d === 0 || d >= 5) continue;
      ns[i].muddy = true; // dropped, not moved: moving it could recreate a repetition
    }
  }

  // The left hand breathes with the phrase too, and sits under the melody.
  accomp.forEach((n) => {
    const d = Math.pow(n.dyn ?? 1, 0.7);
    n.velocity = Math.max(0.05, Math.min(1, n.velocity * d * (0.9 + 0.12 * archAt(n.time)) + driftAt(n.time) * 0.5));
    if (n.time >= (totalBars - 2) * beats) n.velocity *= 0.8;
  });

  const notes = [...melody, ...accomp].filter((n) => !n.muddy).map((n) => ({
    time: n.time, duration: Math.max(0.02, n.duration), pitch: n.pitch, velocity: n.velocity, hand: n.hand,
    ornament: !!n.ornament, pickup: !!n.pickup, roll: !!n.roll, spread: !!n.spread, pedal: n.pedal !== false,
  })).sort((a, b) => a.time - b.time || a.pitch - b.pitch);
  return {
    seed, melodySeed, leftSeed, mode, root: NOTE_NAMES[rootPc], style: styleKey, tempo, beats, beatUnit, meter,
    totalBars, totalBeats, sections: asm.sections, chords: asm.chordsTimeline, notes, features, description,
    rubato: style.rubato ?? 0.5, swing: !!style.swing,
    // The slowing belongs to the last moving music, not to the chord that is already ringing.
    ritardando: { start: Math.max(0, totalBeats - finalOnsetBars * beats - 1.6 * beats), end: totalBeats - finalOnsetBars * beats },
  };
}

const melodyFeatures = (ch) => ({
  density: ch.density < 0.45 ? 'calm' : ch.density < 0.7 ? 'moderately busy' : 'busy',
  leaps: ch.leapiness < 0.8 ? 'stepwise' : ch.leapiness < 1.2 ? 'moderately leaping' : 'leaping',
  shape: { arch: 'arch', lateArch: 'late peak', wave: 'wave', descend: 'descending', ascend: 'ascending', plateau: 'plateau' }[ch.shapes[0]],
  syncopation: ch.syncopation > 0, triplets: ch.triplets, grace: ch.grace > 0, trill: ch.trill, octaves: ch.octaves,
});
const melodyText = (f, lastLabel) => {
  const orn = [f.syncopation && 'syncopation', f.triplets && 'triplets', f.grace && 'grace notes', f.trill && 'trill at the cadence', f.octaves && `octaves in the ${lastLabel}`].filter(Boolean);
  return `Melody: ${f.density}, ${f.leaps}, ${f.shape} contour${orn.length ? ', ' + orn.join(', ') : ''}.`;
};

export function generatePiece(options = {}) {
  const seed = options.seed ?? 1;
  const mode = options.mode ?? 'major';
  const styleKey = options.style ?? 'nocturne';
  const style = STYLES[styleKey];
  const rootPc = NOTE_NAMES.indexOf(options.root ?? 'C');
  const beats = style.beats;
  const beatUnit = style.beatUnit ?? 1;
  const compound = beats === 2;
  const meter = compound ? '6/8' : `${beats}/4`;
  const tempo = options.tempo ?? style.tempo;
  // Three independent streams: the piece (form, harmony), the melody and the left hand.
  // Re-rolling one hand therefore leaves the other one untouched.
  const styleOffset = 7919 * Object.keys(STYLES).indexOf(styleKey);
  const melodySeed = options.melodySeed ?? seed;
  const leftSeed = options.leftSeed ?? seed;
  const rng = mulberry32(seed + styleOffset);
  const rngMelody = mulberry32(melodySeed * 3 + 104729 + styleOffset);
  const rngLeft = mulberry32(leftSeed * 5 + 1299709 + styleOffset);
  const ch = drawCharacter(rngMelody, style.character);
  const scale = (style.blues ? BLUES_SCALE[mode] : SCALES[mode]).map((i) => (rootPc + i) % 12);
  const ctx = { beats, mode, rootPc, scale, ch, compound, tempo, blues: !!style.blues, swing: !!style.swing, minDur: minMelodyDur(tempo), leadingPc: (rootPc + 11) % 12 };
  const parse = (bars, m = mode, r = rootPc) => parsePhrase(bars, m, r, beats);
  const common = { rng, rngMelody, rngLeft, beats, ch, scale, tempo, style, seed, melodySeed, leftSeed, mode, styleKey, rootPc, beatUnit, compound, meter };
  if (style.blues) return generateBlues(ctx, parse, common);

  const prog = PROGRESSIONS[mode];
  const relMode = mode === 'major' ? 'minor' : 'major';
  const relRoot = (rootPc + (mode === 'major' ? 9 : 3)) % 12;
  const bInRelative = chance(rng, 0.5);

  const form = pick(rng, FORMS);
  const introBars = pick(rng, prog.intro);
  const codaBars = chance(rng, 0.5) ? pick(rng, prog.coda4) : pick(rng, prog.coda2);
  const figA = drawFiguration(rngLeft, style, tempo);
  const figA2 = chance(rngLeft, 0.5) ? varyFiguration(rngLeft, figA, style) : figA;
  const figB = chance(rngLeft, 0.7) ? drawFiguration(rngLeft, style, tempo) : figA;
  const figC = drawFiguration(rngLeft, style, tempo);
  const figCoda = { kind: 'block', strikes: [0], held: true, bassEvery: true, wide: false, lowBass: figA.lowBass, cadenceFill: 'none', accentBeat: 0, label: 'sustained chords', signature: 'coda' };
  // Dynamics as a plan rather than noise: the contrast section really contrasts and the reprise lifts.
  const bLevel = chance(rng, 0.5) ? rand(rng, 0.78, 0.9) : rand(rng, 1.06, 1.18);
  const sectionDynamics = { A: 1, "A'": 0.96, B: bLevel, "B'": bLevel * 0.98, C: bLevel > 1 ? 0.9 : 1.08, coda: 0.7 };
  const plan = drawRhythmPlan(rngMelody, ctx);
  const pickup = drawPickup(rngMelody, ctx, style.pickup ?? 0.3);
  const asm = createAssembler({ rngMelody, rngLeft, beats, ch, scale, tempo, style, sectionDynamics, pickup });

  // Intro.
  asm.section('Intro');
  const intro = parse(introBars);
  asm.addAccomp(intro, figA, { phraseBars: false });
  asm.advance(intro.length);

  // A material: one antecedent, two consequents (A and A').
  const antChords = parse(pick(rng, prog.antecedent));
  const consChords = parse(pick(rng, prog.consequent));
  const consChords2 = parse(pick(rng, prog.consequent));
  const startPitch = nearestPc(ch.register, antChords[0][0].pcs[chance(rngMelody, 0.5) ? 1 : 2]);
  // One climax per eight-bar period: in the consequent's third bar, or the antecedent's.
  const peak = Math.min(MELODY_HIGH - 1, startPitch + ch.range);
  const peakInAntecedent = chance(rngMelody, 0.3);
  const antecedent = generatePhrase(rngMelody, ctx, antChords, {
    startPitch, fixedStart: true, peak, peakBar: peakInAntecedent ? 2 : -1,
    rhythms: [plan.a, chance(rngMelody, 0.5) ? plan.a : plan.a2, plan.b, null],
    endPc: endPcFor(rngMelody, antChords[3][antChords[3].length - 1], startPitch % 12, ctx.leadingPc, rootPc),
    endNear: startPitch - 3, nextStart: startPitch, trill: ch.trill, shape: ch.shapes[0],
  });
  const consOpts = { endPc: rootPc, endNear: startPitch - 5, peak, peakBar: peakInAntecedent ? -1 : 2 };
  const consequent = parallelConsequent(rngMelody, ctx, consChords, antecedent, { ...consOpts, rhythms: [null, null, chance(rngMelody, 0.6) ? plan.a : plan.a2, null] });
  const consequent2 = parallelConsequent(rngMelody, ctx, consChords2, antecedent, { ...consOpts, rhythms: [null, null, plan.a2, null] });

  // B material: contrast, ends on the home dominant (retransition).
  const makeB = (name, prevEnd, closing = false) => {
    // C is a third idea, not a second B: it takes the key B did not and the opposite contour.
    const isC = name === 'C';
    const inRelative = isC ? !bInRelative : bInRelative;
    const bAntBars = inRelative
      ? parse(pick(rng, PROGRESSIONS[relMode].antecedent), relMode, relRoot)
      : parse(pick(rng, prog.bAntecedent));
    const bConsBars = closing ? parse(pick(rng, prog.bClosing))
      : parse(pick(rng, inRelative ? prog.bConsequentPivot : prog.bConsequent));
    const wanted = Math.max(prevEnd - 6, Math.min(prevEnd + 6, Math.min(startPitch + 5, MELODY_HIGH - 6)));
    const bStartPitch = nearestPc(wanted, bAntBars[0][0].pcs[1]);
    const bPlan = drawRhythmPlan(rngMelody, ctx);
    const bPeak = Math.min(MELODY_HIGH - 1, bStartPitch + ch.range);
    const shape1 = isC ? pick(rngMelody, ['descend', 'wave', 'plateau']) : pick(rngMelody, SHAPES);
    const p1 = generatePhrase(rngMelody, ctx, bAntBars, { startPitch: bStartPitch, fixedStart: true, rhythms: [bPlan.a, bPlan.a, bPlan.b, null], peak: bPeak, peakBar: -1, endPc: endPcFor(rngMelody, bAntBars[3][bAntBars[3].length - 1], bStartPitch % 12, ctx.leadingPc, rootPc), endNear: bStartPitch, shape: shape1 });
    const p2 = generatePhrase(rngMelody, ctx, bConsBars, {
      startPitch: p1.endPitch, anchor: startPitch - 2, rhythms: [bPlan.a, bPlan.a2, bPlan.b, null], motif: p1.motif, peak: bPeak, peakBar: 1,
      endPc: closing ? rootPc : endPcFor(rngMelody, bConsBars[3][bConsBars[3].length - 1], startPitch % 12, ctx.leadingPc, rootPc),
      endLow: true, endNear: startPitch - 2, nextStart: closing ? undefined : startPitch, shape: ch.shapes[1],
    });
    return { name, bars: [bAntBars, bConsBars], phrases: [p1, p2] };
  };
  const bMaterial = {};
  const getB = (name, prevEnd, closing) => { if (!bMaterial[name]) bMaterial[name] = makeB(name, prevEnd, closing); return bMaterial[name]; };
  const endPitchOf = (part) => (part === 'A' ? consequent : part === "A'" ? consequent2 : bMaterial[part].phrases[1]).endPitch;

  // The reprise is decorated rather than replayed, and it is the loudest thing in the piece.
  const antecedentVaried = varyPhrase(rngMelody, ctx, antecedent, 2);
  const figLast = varyFiguration(rngLeft, figA, style);
  let lastSection = null, lastConsBars = null;
  form.parts.forEach((part, idx) => {
    const isLast = idx === form.parts.length - 1;
    const isLastA = isLast && part.startsWith('A');
    asm.section(part);
    if (part === 'A' || part === "A'") {
      const cons = isLastA && part === 'A' ? consequent2 : part === 'A' ? consequent : consequent2;
      const consBars = isLastA && part === 'A' ? consChords2 : part === 'A' ? consChords : consChords2;
      const fig = isLastA ? figLast : part === 'A' ? figA : figA2;
      const dyn = isLastA ? 1.06 + (ch.octaves ? 0.04 : 0) : undefined;
      const ant = isLastA ? antecedentVaried : antecedent;
      asm.addMelody(ant, part, { octaves: ch.octaves && isLastA, pickup: true, dyn }); asm.addAccomp(antChords, fig, { phraseIndex: 0, dyn: dyn ?? sectionDynamics[part] ?? 1 }); asm.advance(4);
      asm.addMelody(cons, part, { octaves: ch.octaves && isLastA, pickup: true, dyn }); asm.addAccomp(consBars, fig, { phraseIndex: 1, dyn: dyn ?? sectionDynamics[part] ?? 1 }); asm.advance(4);
      lastConsBars = consBars;
    } else {
      const b = getB(part, lastSection ? endPitchOf(lastSection) : startPitch, isLast);
      const fig = part === 'C' ? figC : figB;
      const dyn = sectionDynamics[part] ?? 1;
      asm.addMelody(b.phrases[0], part, { pickup: true }); asm.addAccomp(b.bars[0], fig, { phraseIndex: 0, dyn }); asm.advance(4);
      asm.addMelody(b.phrases[1], part, { pickup: true }); asm.addAccomp(b.bars[1], fig, { phraseIndex: 1, dyn }); asm.advance(4);
      lastConsBars = b.bars[1];
    }
    lastSection = part;
  });

  // Coda: an echo of the last phrase ending (4-bar coda) and the final tonic.
  asm.section('Coda');
  const codaStart = asm.cursor;
  const finalBars = finalBarsFor(tempo, beats);
  // The echo repeats the cadence it just sang, so it sits on the chords it was composed over.
  const tonicBars = parse(mode === 'major' ? ['I', 'I'] : ['i', 'i']);
  const coda = codaBars.length === 4 ? [...lastConsBars.slice(2, 4), ...tonicBars] : tonicBars;
  const lastCons = lastSection === 'A' && form.parts[form.parts.length - 1] === 'A' ? consequent2
    : lastSection === 'A' ? consequent : lastSection === "A'" ? consequent2 : bMaterial[lastSection].phrases[1];
  const finalPitch = nearestPc(lastCons.endPitch, rootPc);
  if (coda.length === 4) {
    const src = lastCons.notes.filter((n) => n.bar >= 2 && !n.ornament);
    // Echo shifted by an octave (preferably down) so the leap from the phrase end stays within an octave.
    const lo = Math.min(...src.map((n) => n.pitch)), hi = Math.max(...src.map((n) => n.pitch));
    const shifts = [-12, 0, 12].filter((s) => lo + s >= MELODY_LOW && hi + s <= MELODY_HIGH && Math.abs(src[0].pitch + s - lastCons.endPitch) <= 12);
    let echo = [];
    if (src.length && shifts.length) {
      const shift = shifts[0];
      echo = src.map((n) => ({ ...n, bar: n.bar - 2, time: near(n.time - 2 * beats), pitch: n.pitch + shift }));
    } else {
      echo = [{ time: 0, duration: beats * 2, pitch: finalPitch, strong: true, bar: 0 }];
    }
    if (echo.length) {
      const prevP = echo.length > 1 ? echo[echo.length - 2].pitch : echo[0].pitch;
      let last = nearestPc(echo[echo.length - 1].pitch, rootPc);
      while (last - prevP > 12 && last - 12 >= MELODY_LOW) last -= 12;
      while (prevP - last > 12 && last + 12 <= MELODY_HIGH) last += 12;
      echo[echo.length - 1].pitch = last;
    }
    asm.addMelody({ notes: echo }, 'coda');
    asm.addAccomp(coda.slice(0, 2), figA, { forceRootFirst: false, phraseBars: false, dyn: 0.7 });
    asm.advance(2);
    asm.finalChord(nearestPc(echo.length ? echo[echo.length - 1].pitch : finalPitch, rootPc), coda.slice(2, 2 + finalBars), figCoda);
  } else {
    asm.finalChord(finalPitch, coda.slice(0, finalBars), figCoda);
  }

  const features = {
    form: form.name, parts: form.parts.join(' '), introBars: intro.length, codaBars: coda.length, bInRelative,
    left: figA.label, leftA2: figA2 === figA ? null : figA2.label, leftB: figB === figA ? null : figB.label, leftC: form.parts.includes('C') ? figC.label : null,
    leftSignature: figA.signature, leftBSignature: figB.signature, ...melodyFeatures(ch),
  };
  const leftParts = [`A: ${features.left}`];
  if (features.leftA2) leftParts.push(`A': ${features.leftA2}`);
  if (features.leftB) leftParts.push(`B: ${features.leftB}`);
  if (features.leftC) leftParts.push(`C: ${features.leftC}`);
  const description = `${meter}, form ${features.form} (${features.parts}), ${intro.length}-bar intro, ${asm.cursor - codaStart}-bar coda${bInRelative ? ', B in the relative key' : ''}. `
    + `Left hand ${leftParts.join('; ')}. ` + melodyText(features, 'last A');
  return finishPiece(asm, { ...common, introLength: intro.length, features, description, finalBars });
}

// Twelve-bar blues: intro, three choruses (call, call, response), final chord.
function generateBlues(ctx, parse, common) {
  const { rng, rngMelody, rngLeft, beats, ch, scale, tempo, style, mode, rootPc } = common;
  const tonic = mode === 'major' ? 'I7' : 'i7';
  const chorusChords = pick(rng, BLUES_FORMS[mode]);
  const introBars = pick(rng, [[tonic], [tonic, tonic], ['V7']]);
  const intro = parse(introBars);
  const figA = drawFiguration(rngLeft, style, tempo);
  const figB = chance(rngLeft, 0.75) ? drawFiguration(rngLeft, style, tempo) : varyFiguration(rngLeft, figA, style);
  for (const f of [figA, figB]) if (f.kind === 'boogie' || f.kind === 'walking') f.cadenceFill = 'none';
  const figCoda = { kind: 'block', strikes: [0], held: true, bassEvery: true, wide: false, lowBass: figA.lowBass, cadenceFill: 'none', accentBeat: 0, label: 'sustained chord', signature: 'coda' };
  const sectionDynamics = { 'Chorus 1': 0.95, 'Chorus 2': rand(rng, 0.85, 1.05), 'Chorus 3': 1.05, coda: 0.8 };
  const rplan = drawRhythmPlan(rngMelody, ctx);
  const pickup = drawPickup(rngMelody, ctx, style.pickup ?? 0.4);
  const asm = createAssembler({ rngMelody, rngLeft, beats, ch, scale, tempo, style, sectionDynamics, pickup });

  asm.section('Intro');
  asm.addAccomp(intro, figA, { phraseBars: false, alwaysRoot: true });
  asm.advance(intro.length);

  // The melody hears the turnaround bar as tonic; only the left hand plays V7 there.
  const accBars = [parse(chorusChords.slice(0, 4)), parse(chorusChords.slice(4, 8)), parse(chorusChords.slice(8, 12))];
  const melBars = [accBars[0], accBars[1], parse([...chorusChords.slice(8, 11), tonic])];
  const lastAcc = [accBars[0], accBars[1], parse([...chorusChords.slice(8, 11), tonic])];
  const startPitch = nearestPc(ch.register, accBars[0][0][0].pcs[chance(rngMelody, 0.5) ? 1 : 2]);
  const peak = Math.min(MELODY_HIGH - 1, startPitch + ch.range);
  const makeChorus = () => {
    const call = generatePhrase(rngMelody, ctx, melBars[0], { startPitch, fixedStart: true, rhythms: [rplan.a, rplan.a, rplan.b, null], peak, peakBar: -1, endPc: pick(rngMelody, [melBars[0][3][0].pcs[0], melBars[0][3][0].pcs[2]]), endNear: startPitch - 2, nextStart: startPitch, shape: ch.shapes[0] });
    const responseStart = nearestPc(Math.min(startPitch + 4, MELODY_HIGH - 6), melBars[2][0][0].pcs[1]);
    const call2 = parallelConsequent(rngMelody, ctx, melBars[1], call, { endPc: melBars[1][3][0].pcs[chance(rngMelody, 0.5) ? 0 : 2], endNear: responseStart - 3, nextStart: responseStart, peak, peakBar: 2, rhythms: [null, null, rplan.a2, null] });
    const response = generatePhrase(rngMelody, ctx, melBars[2], { startPitch: responseStart, fixedStart: true, anchor: startPitch, rhythms: [rplan.a, rplan.b, rplan.a2, null], motif: call.motif, peak, peakBar: 0, endPc: rootPc, endLow: true, endNear: startPitch - 4, nextStart: startPitch, shape: ch.shapes[1] });
    return [call, call2, response];
  };
  const chorus1 = makeChorus();
  const chorus2 = makeChorus();
  const plan = [['Chorus 1', chorus1, figA], ['Chorus 2', chorus2, figB], ['Chorus 3', chorus1, figA]];
  plan.forEach(([name, phrases, fig], idx) => {
    const last = idx === plan.length - 1;
    asm.section(name);
    phrases.forEach((phrase, i) => {
      asm.addMelody(phrase, name, { octaves: ch.octaves && last, pickup: i !== 2 });
      asm.addAccomp(last && i === 2 ? lastAcc[i] : accBars[i], fig, { phraseIndex: i === 1 ? 1 : 0, alwaysRoot: true });
      asm.advance(4);
    });
  });

  asm.section('Coda');
  asm.finalChord(nearestPc(chorus1[2].endPitch, rootPc), parse(finalBarsFor(tempo, beats) === 2 ? [tonic, tonic] : [tonic]), figCoda);

  const features = {
    form: '12-bar blues', parts: 'intro, 3 choruses, coda', introBars: intro.length, codaBars: 2, bInRelative: false,
    left: figA.label, leftB: figB.label, leftSignature: figA.signature, leftBSignature: figB.signature, ...melodyFeatures(ch),
  };
  const description = `${common.meter} shuffle, 12-bar blues, three choruses (call, call, response), ${intro.length}-bar intro, 2-bar coda. `
    + `Left hand choruses 1 and 3: ${figA.label}; chorus 2: ${figB.label}. ` + melodyText(features, 'last chorus');
  return finishPiece(asm, { ...common, introLength: intro.length, features, description, finalBars: finalBarsFor(tempo, beats) });
}

// Time map: pulses -> seconds. A pianist does not play to a metronome: a phrase leans forward and
// broadens into its cadence, a new section settles as it begins, and the last bars slow down. The
// tempo factor is a product of bounded terms; the map integrates it once and looks it up.
export function makeTimeMap(piece) {
  const { tempo, beats, totalBeats, sections, rubato = 0.5, ritardando } = piece;
  const secPerBeat = 60 / tempo;
  const rit = ritardando ?? { start: totalBeats - 2 * beats, end: totalBeats };
  const introBeats = (sections?.[1]?.bar ?? 0) * beats;
  const periodBeats = 8 * beats;
  const sectionStarts = (sections ?? []).slice(1).map((s) => s.bar * beats);

  const factorAt = (b) => {
    let f = 1;
    if (rubato > 0 && b >= introBeats) {
      const x = (b - introBeats) % periodBeats;
      const pos = x / periodBeats;
      f *= 1 + rubato * (pos < 0.65 ? -0.025 * Math.sin(Math.PI * pos / 0.65) : 0.05 * (pos - 0.65) / 0.35);
      const toBoundary = periodBeats - x;
      if (toBoundary <= 1) f *= 1 + 0.08 * rubato; // a breath before the cadence
      else if (Math.abs(toBoundary - periodBeats / 2) < 1) f *= 1 + 0.03 * rubato;
    }
    for (const s of sectionStarts) if (b >= s && b < s + 1) { f *= 1 + 0.04 * rubato; break; }
    if (b < 1) f *= 1.05;
    f = Math.max(0.95, Math.min(1.12, f));
    if (b >= rit.start) f *= 1 + 0.4 * Math.min(1, (b - rit.start) / Math.max(1e-6, rit.end - rit.start));
    return f;
  };

  // Integrate on a 1/24 grid once, then look up with linear interpolation.
  const step = 1 / 24;
  const n = Math.ceil(totalBeats / step) + 2;
  const table = new Float64Array(n);
  for (let i = 1; i < n; i++) table[i] = table[i - 1] + secPerBeat * step * factorAt((i - 0.5) * step);
  const toSeconds = (beat) => {
    const x = Math.max(0, beat) / step, i = Math.min(n - 2, Math.floor(x)), f = x - i;
    return table[i] + (table[i + 1] - table[i]) * f;
  };
  let lastEnd = 0;
  for (const nn of piece.notes) lastEnd = Math.max(lastEnd, toSeconds(nn.time + nn.duration));
  return { toSeconds, factorAt, totalSeconds: Math.max(lastEnd, toSeconds(totalBeats)) + 1.2 };
}

// The performance layer: what separates a pianist from a sequencer. One offset in seconds per note
// (same order as piece.notes), deterministic from the seed, applied to audio and MIDI only so the
// piano roll and the editor keep working on the written grid.
export function performNotes(piece) {
  const rng = mulberry32((piece.seed * 11 + 7) >>> 0);
  const scale = piece.rubato >= 0.8 ? 1 : piece.rubato >= 0.45 ? 0.8 : 0.6;
  const secPerBeat = 60 / piece.tempo;
  const swingRatio = piece.swing ? rng() * 0.5 + 1.8 : 0; // 1.8..2.3 : 1 instead of an exact triplet
  const byOnset = new Map();
  for (const n of piece.notes) {
    const k = n.hand + ':' + n.time.toFixed(4);
    if (!byOnset.has(k)) byOnset.set(k, (rng() - 0.5) * (n.hand === 'right' ? 0.014 : 0.018) * scale);
  }
  // Wide or rolled left-hand chords are spread from the bottom, a little slower in slow music.
  const rollStep = piece.tempo <= 70 ? 0.03 : piece.tempo >= 118 ? 0.016 : 0.022;
  const strikes = new Map();
  piece.notes.forEach((n, i) => {
    if (!n.spread) return;
    const k = n.time.toFixed(4);
    if (!strikes.has(k)) strikes.set(k, []);
    strikes.get(k).push(i);
  });
  const rollOffset = new Map();
  for (const idxs of strikes.values()) {
    const sorted = [...idxs].sort((x, y) => piece.notes[x].pitch - piece.notes[y].pitch);
    sorted.forEach((idx, k) => rollOffset.set(idx, (k - (sorted.length - 1) / 2) * rollStep));
  }
  return piece.notes.map((n, i) => {
    if (n.roll) return 0; // a roll is already spread out in the written time
    let off = (byOnset.get(n.hand + ':' + n.time.toFixed(4)) ?? 0) + (rollOffset.get(i) ?? 0);
    if (n.hand === 'right' && !n.ornament) off -= 0.021 * scale; // the melody leads the bass
    if (n.pickup) off -= 0.012 * scale; // an upbeat pushes into the downbeat
    const frac = n.time - Math.floor(n.time);
    if (frac < 1e-6 && n.hand === 'left' && off < 0) off = 0; // a downbeat bass is never early
    if (swingRatio) {
      const third = Math.abs(frac - 2 / 3) < 1e-6;
      if (third) off += (swingRatio / (swingRatio + 1) - 2 / 3) * secPerBeat;
      if (third && n.hand === 'right') off += 0.014; // laid back
    }
    return Math.max(-0.06, Math.min(0.06, off));
  });
}
