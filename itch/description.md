# Piano Song Creator

A piano song generator that writes a whole classical piano piece in front of you, in your browser,
from a single number. Pick a style, pick a key, press Play. The same number always writes the same
piece, so anything you like can be found again. Download the generated music as MIDI, WAV or MP3 and
use it for anything: it is royalty free, because nobody else's music went into it.

Made for people who need background piano music, a starting point for a track, or raw MIDI to take
into a DAW. It generates classical piano in sixteen styles: nocturnes, waltzes, preludes, marches,
blues and more.

Nothing here is trained on other people's music and nothing is sampled from it. The harmony, the form
and the shape of a phrase come from written rules; everything else comes from the seed. That is the
point and it is also the limit, so read the honest part below before you decide what this is for.

## What it does

- **Sixteen styles.** Nocturne, Prelude, Ballade, Sonatina, March, Chorale, Elegy, Etude in 4/4;
  Waltz, Minuet, Mazurka, Polonaise in 3/4; Barcarolle, Lullaby, Tarantella in 6/8; and Blues, which
  gets its own twelve-bar form, shuffle and boogie or walking bass.
- **A whole piece, not a loop.** Intro, an eight-bar period repeated and varied, a contrasting
  section, a decorated reprise, a coda that echoes the cadence and a final chord that is rolled and
  allowed to ring. Twenty-four to fifty bars, one to three minutes.
- **Two hands you can re-roll separately.** New left hand keeps the melody note for note. New melody
  keeps the accompaniment. Both keep the harmony.
- **Nine piano sounds,** from a warm sampled grand to honky-tonk, electric piano and harpsichord.
- **It is played, not sequenced.** Phrases lean forward and broaden into their cadences, the melody
  speaks a moment before the bass, chords are spread, the pedal holds the accompaniment until the
  harmony changes, and each style has its own dynamic range.
- **Export.** MIDI with the tempo curve, or WAV and MP3 rendered in the browser.

## What it does badly

This is a rule-based generator, not a composer. Where that shows:

- **Nothing here is memorable.** A piece is coherent, it goes somewhere and it ends properly, but it
  has no idea worth humming. Real composition is the part that rules cannot do.
- **The harmony is a textbook.** Diatonic chords, a few secondary dominants, one modulation at most
  and only to the relative key. Nothing surprising ever happens harmonically.
- **Phrases are always four bars.** Every piece breathes in the same regular squares. There is no
  irregular phrase, no elision, no interruption.
- **Style names describe a surface, not an idiom.** A Chorale here is a slow melody over block
  chords, not four-part Bach harmony. A Mazurka is an accent on the second beat and dotted rhythms,
  not a real mazurka. Blues is the one style whose defining features are actually implemented.
- **Some seeds are dull.** It is a lottery with good odds, not a guarantee. Press Random until
  something catches you, then write the seed down.
- **One velocity layer.** Soft and loud notes differ in level but not in timbre, because the piano is
  a sampler, not a physical model.
- **The pedal is simulated per chord change,** not decided by ear. In busy passages it can blur.
- **It needs the internet on the first load** to fetch the piano samples, and a few seconds more when
  you switch to another piano.

If you want background music you can generate forever, or raw material to take into a DAW, it does
that well. If you want a piece that sounds composed by a person, it does not.

## Controls

Everything regenerates as soon as you change a setting. Space plays and stops. Click the piano roll
to move the playhead. The two volume sliders balance the hands; Left articulation makes the
accompaniment shorter and drier or longer and more pedalled. Inside the itch.io frame the download
buttons open the file in a new tab, where your browser saves it.

## Technical

One HTML file, three JavaScript modules, no build step and no server. Audio is Tone.js with the
Salamander grand and General MIDI soundfonts; MP3 encoding is lamejs. Everything runs on your
machine, nothing is uploaded anywhere.

Also known as: piano music generator, classical music generator, procedural music generator, random
piano song maker, MIDI generator, royalty free piano music.
