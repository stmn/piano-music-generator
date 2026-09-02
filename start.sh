#!/bin/sh
# Serves the folder (ES modules do not load from file://) and opens the browser.
cd "$(dirname "$0")"
PORT=${1:-8765}
(sleep 1; open "http://localhost:$PORT/") &
python3 -m http.server "$PORT"
