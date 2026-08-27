#!/bin/bash
set -e

cd "$(dirname "$0")"

export VITE_API_URL=https://app.decksalone.com/api

echo "==> Building web app with VITE_API_URL=$VITE_API_URL"
npm run build

echo "==> Syncing Capacitor Android project"
npx cap sync android

echo "==> Building debug APK"
cd android
./gradlew assembleDebug

echo "==> Copying debug APK to project root"
cp app/build/outputs/apk/debug/app-debug.apk ../deck-salone-debug.apk

echo "==> Debug APK ready at:"
ls -lh ../deck-salone-debug.apk
