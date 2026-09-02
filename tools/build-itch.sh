#!/bin/sh
# Packs the four runtime files into the zip itch.io expects (index.html at the archive root).
set -e
cd "$(dirname "$0")/.."
out="itch/piano-song-creator.zip"
rm -rf itch/build "$out"
mkdir -p itch/build
cp index.html app.js composer.js midi.js itch/build/
(cd itch/build && zip -q -r "../../$out" index.html app.js composer.js midi.js)
rm -rf itch/build
echo "$out"
