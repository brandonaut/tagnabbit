#!/usr/bin/env bash
# Usage: bun run release [major|minor|patch]  (default: patch)
set -euo pipefail

BUMP=${1:-patch}

if [[ ! "$BUMP" =~ ^(major|minor|patch)$ ]]; then
  echo "Usage: $0 [major|minor|patch]" >&2
  exit 1
fi

# Read current version from package.json
CURRENT=$(node -p "require('./package.json').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

VERSION="$MAJOR.$MINOR.$PATCH"
TODAY=$(date -u +%Y-%m-%d)

echo "Bumping $CURRENT → $VERSION (released $TODAY)"

# Update package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '$VERSION';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update APP_VERSION and RELEASE_DATE in SettingsDrawer.tsx
sed -i \
  -e "s/const APP_VERSION = \"[^\"]*\"/const APP_VERSION = \"$VERSION\"/" \
  -e "s/const RELEASE_DATE = \"[^\"]*\"/const RELEASE_DATE = \"$TODAY\"/" \
  src/SettingsDrawer.tsx

git add package.json src/SettingsDrawer.tsx
git commit -m "Release v$VERSION"
git tag "v$VERSION"

echo ""
echo "Tagged v$VERSION. To deploy:"
echo "  git push origin main v$VERSION"
