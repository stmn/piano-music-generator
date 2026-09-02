import { makeTimeMap, performNotes } from './composer.js';

// Minimal Standard MIDI File writer (format 0), no dependencies.
// Piece times are in pulses; `beatUnit` is the pulse length in quarter notes (1.5 for 6/8).

const TPQ = 480;

function vlq(n) {
  const bytes = [n & 0x7f];
  while ((n >>= 7) > 0) bytes.unshift((n & 0x7f) | 0x80);
  return bytes;
}

function u32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
function u16(n) { return [(n >>> 8) & 255, n & 255]; }

function tempoEvent(quarterBpm) {
  const us = Math.round(60000000 / quarterBpm);
  return [0xff, 0x51, 0x03, (us >>> 16) & 255, (us >>> 8) & 255, us & 255];
}

export function pieceToMidi(piece) {
  const unit = piece.beatUnit ?? 1;
  const tick = (pulses) => Math.round(pulses * unit * TPQ);
  const quarterBpm = piece.tempo * unit;
  const events = [];
  const add = (t, bytes) => events.push({ tick: t, bytes });
  const compound = piece.beats === 2 && unit === 1.5;
  add(0, [0xff, 0x58, 0x04, compound ? 6 : piece.beats, compound ? 0x03 : 0x02, 0x18, 0x08]); // time signature
  add(0, [0xc0, 0x00]); // acoustic grand piano
  add(0, tempoEvent(quarterBpm));

  // One tempo curve for the whole piece (rubato, phrase breaths and the closing ritardando),
  // sampled from the same time map the playback uses.
  const { factorAt } = makeTimeMap(piece);
  let lastFactor = null;
  for (let b = 0; b <= piece.totalBeats; b += 0.25) {
    const f = factorAt(b);
    if (lastFactor === null || Math.abs(f - lastFactor) > 0.004) { add(tick(b), tempoEvent(quarterBpm / f)); lastFactor = f; }
  }

  // The performance offsets are in seconds; at this point in the piece a pulse is secPerBeat long.
  const offsets = performNotes(piece);
  const toPulses = piece.tempo / 60;
  piece.notes.forEach((n, i) => {
    const vel = Math.max(1, Math.min(127, Math.round(n.velocity * 127)));
    const shift = (offsets[i] ?? 0) * toPulses;
    const on = tick(Math.max(0, n.time + shift));
    add(on, [0x90, n.pitch, vel]);
    add(Math.max(on + 1, tick(n.time + shift + n.duration)), [0x80, n.pitch, 0]);
  });
  // Note-off before note-on at the same tick, so repeated notes are not swallowed.
  events.sort((a, b) => a.tick - b.tick || (a.bytes[0] & 0xf0) - (b.bytes[0] & 0xf0));

  const track = [];
  let last = 0;
  for (const e of events) {
    track.push(...vlq(e.tick - last), ...e.bytes);
    last = e.tick;
  }
  track.push(0x00, 0xff, 0x2f, 0x00);

  const header = [...'MThd'].map((c) => c.charCodeAt(0)).concat(u32(6), u16(0), u16(1), u16(TPQ));
  const trackHdr = [...'MTrk'].map((c) => c.charCodeAt(0)).concat(u32(track.length));
  return new Uint8Array([...header, ...trackHdr, ...track]);
}
