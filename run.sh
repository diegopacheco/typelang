#!/usr/bin/env bash
set -euo pipefail
npm install --cache .npm-cache
npm run build
if [ "$#" -eq 0 ]; then
  node dist/main.js programs/main.tl
else
  node dist/main.js "$@"
fi
