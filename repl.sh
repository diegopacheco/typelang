#!/usr/bin/env bash
set -euo pipefail
npm install --cache .npm-cache
npm run build
node dist/main.js --repl
