#!/bin/sh
# Runs the full backend integration test (HTTP + multipart + sockets) against the real Express app,
# using an in-memory SQLite database instead of MySQL. Needs Node 22+. No MySQL server required.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
T="$(mktemp -d)"
cp -r "$HERE/../src" "$T/src"
cp -r "$HERE/../scripts" "$T/scripts"
cp -r "$HERE/../assets" "$T/assets"
cp "$HERE/../package.json" "$T/package.json"
ln -s "$HERE/../node_modules" "$T/node_modules"
cp "$HERE/sqlite-db.js" "$T/src/config/db.js"      # the ONLY file swapped out: MySQL driver -> SQLite
cp "$HERE/integration.mjs" "$T/test.mjs"
cd "$T"
TZ=UTC node --no-warnings test.mjs
