#!/usr/bin/env bash
set -e

REMOTE=$(git remote get-url origin)

echo "Building..."
bun run build

echo "Deploying to gh-pages..."
cd dist
git init -b gh-pages
git add -A
git commit -m "Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -f "$REMOTE" gh-pages
cd ..
rm -rf dist/.git

echo "Done! https://brandonaut.github.io/tagnabbit/"
