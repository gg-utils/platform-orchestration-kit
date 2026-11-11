#!/bin/sh
set -eu
rm -rf dist
npm run build
git diff --exit-code -- dist
test -z "$(git ls-files --others --exclude-standard -- dist)"
