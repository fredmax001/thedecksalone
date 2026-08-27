#!/bin/bash
set -e

cd "$(dirname "$0")"

export VITE_API_URL=https://app.decksalone.com/api

echo "==> Building web app with VITE_API_URL=$VITE_API_URL"
npm run build

echo "==> Syncing Capacitor Android project"
npx cap sync android

echo "==> Building Android App Bundle (AAB)"
cd android
./gradlew bundleRelease

echo "==> AAB built at:"
find app/build/outputs/bundle -name '*.aab' -print
