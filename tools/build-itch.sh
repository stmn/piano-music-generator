#!/bin/sh
# Packs the four runtime files into the zip itch.io expects (index.html at the archive root).
set -e
cd "$(dirname "$0")/.."
out="dist/piano-song-creator.zip"
rm -rf dist
mkdir -p dist/build
cp index.html app.js composer.js midi.js dist/build/
(cd dist/build && zip -q -r "../../$out" index.html app.js composer.js midi.js)
rm -rf dist/build
echo "$out"
