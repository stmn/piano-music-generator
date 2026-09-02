# Uploading to itch.io

## The upload

1. Create a new project, set **Kind of project** to *HTML*.
2. Upload `piano-song-creator.zip` and tick **This file will be played in the browser**.
3. **Embed options**: manually set size **1280 x 820**, tick *Fullscreen button* and
   *Mobile friendly* (the layout is responsive; on a phone the panel wraps to more rows).
4. Leave *Automatically start on page load* off. The browser blocks audio before a click anyway, and
   loading the piano samples takes a moment.

## Images

| File | Where it goes |
|---|---|
| `cover.png` (630 x 500) | Cover image |
| `screenshot.png` | Screenshot |
| `how-it-works.png` | Screenshot, or inside the description |
| `styles.png` | Screenshot, or inside the description |

## Page colours

These are the exact colours the tool itself uses, so the page and the frame look like one thing.

| itch.io field | Value |
|---|---|
| Background | `#0d1013` |
| Text | `#e5e8ec` |
| Link | `#edb345` |
| Secondary background (blocks) | `#16181d` |
| Secondary text | `#9a9fa6` |
| Button background | `#edb345` |
| Button text | `#271700` |
| Border | `#2a2e34` |

Two accents appear inside the tool and are worth keeping if you add anything to the page:
`#80bdfb` for the melody and `#71d6a3` for the accompaniment.

## Suggested tags

`music`, `generator`, `music-generator`, `procedural-generation`, `piano`, `classical`, `midi`,
`music-production`, `royalty-free`, `no-ai`, `html5`, `tool`

itch.io allows ten tags. The short description field (shown in search results and picked up by
assistants) is worth writing as a plain sentence with the words people type, for example:
*A piano song generator that writes whole classical piano pieces in your browser and exports them as
MIDI, WAV or MP3. Royalty free, rule-based, no trained model.*

## Notes

- Downloads inside the itch frame open in a new tab, because a sandboxed frame may refuse a direct
  save. That is handled in the code; no itch setting is needed.
- The samples come from `tonejs.github.io` and `gleitz.github.io` over https, so they load fine
  inside the frame. The tool does not work offline on first load.
- To change the name shown in the browser tab, edit the `<title>` in `index.html` and rebuild the
  zip.
