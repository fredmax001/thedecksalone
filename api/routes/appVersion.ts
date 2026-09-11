const express = require('express');
const router = express.Router();

const PLAY_STORE_BASE_URL = 'https://play.google.com/store/apps/details?id=decksalone.com';

// Latest release info. Override via env vars when shipping a new release —
// keep APP_LATEST_VERSION_CODE in sync with versionCode in android/app/build.gradle.
const DEFAULTS = {
  latestVersion: '1.1.0',
  latestVersionCode: 11,
  releaseNotes: 'Bug fixes and performance improvements.',
  playStoreUrl: PLAY_STORE_BASE_URL,
  apkUrl: '',
};

router.get('/version', (req, res) => {
  const latestVersionCode = parseInt(process.env.APP_LATEST_VERSION_CODE || '', 10);
  res.json({
    success: true,
    data: {
      latestVersion: process.env.APP_LATEST_VERSION || DEFAULTS.latestVersion,
      latestVersionCode: Number.isFinite(latestVersionCode)
        ? latestVersionCode
        : DEFAULTS.latestVersionCode,
      releaseNotes: process.env.APP_RELEASE_NOTES || DEFAULTS.releaseNotes,
      playStoreUrl: process.env.APP_PLAY_STORE_URL || DEFAULTS.playStoreUrl,
      apkUrl: process.env.APP_APK_URL || DEFAULTS.apkUrl,
    },
  });
});

module.exports = router;
