#!/usr/bin/env bash
set -euo pipefail
npm install --cache .npm-cache
npm run build
npm test
npm pack --cache .npm-cache
