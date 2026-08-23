#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# One-time setup.
#
# Generates the Expo scaffolding (package.json, entry point, babel
# config, assets) with versions pinned by Expo itself, then wires in
# this repo's source. Run once after cloning.
#
#   bash scripts/bootstrap.sh
#
# Safe to re-run: it refuses to clobber an existing package.json.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -f package.json ]; then
  echo "package.json already exists — bootstrap has run before."
  echo "To re-run from scratch: rm -rf package.json package-lock.json node_modules .expo assets babel.config.js"
  exit 1
fi

echo "==> Generating Expo scaffolding"
TMP=".expo-scaffold"
rm -rf "$TMP"
npx --yes create-expo-app@latest "$TMP" --template blank --no-install

echo "==> Adopting scaffold config (versions pinned by Expo)"
# package.json is the source of truth for the SDK version and entry point.
mv "$TMP/package.json" package.json
# Keep our app.json if we ship one; otherwise take the scaffold's.
[ -f app.json ] || mv "$TMP/app.json" app.json
[ -f babel.config.js ] || { [ -f "$TMP/babel.config.js" ] && mv "$TMP/babel.config.js" babel.config.js; } || true
# The scaffold's package.json "main" often points at index.js, which lives in
# the scaffold. Keep it, or Metro reports "Cannot resolve entry file".
[ -f index.js ] || { [ -f "$TMP/index.js" ] && mv "$TMP/index.js" index.js; } || true
# Assets referenced by app.json (icon, splash) must exist.
[ -d assets ] || { [ -d "$TMP/assets" ] && mv "$TMP/assets" assets; } || true
# The scaffold's App.js is a placeholder; ours is already in place.
rm -rf "$TMP"

echo "==> Naming the project"
npm pkg set name="structura" version="0.1.0" private=true

echo "==> Adding scripts"
npm pkg set scripts.start="expo start"
npm pkg set scripts.tunnel="expo start --tunnel"
npm pkg set scripts.android="expo start --android"
npm pkg set scripts.ios="expo start --ios"
npm pkg set scripts.web="expo start --web"
npm pkg set scripts.export:web="expo export --platform web"
npm pkg set scripts.test="node scripts/run-tests.mjs"
npm pkg set scripts.test:engine="node src/engine/test.mjs"

echo "==> Installing dependencies"
npm install
npx expo install \
  react-native-svg \
  @react-native-async-storage/async-storage \
  react-native-safe-area-context \
  expo-haptics \
  expo-speech \
  react-dom \
  react-native-web \
  @expo/metro-runtime
npm install --save-dev esbuild

echo "==> Verifying"
npm test

cat <<'DONE'

Bootstrap complete.

  npm run tunnel     start Metro with a tunnel (required from a Codespace)
  npm test           run every suite
  npm run test:engine  run only the vendored engine suite (699 tests)

Commit the generated package.json, package-lock.json, app.json and assets/.
DONE
