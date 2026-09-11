const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const { prisma } = require('../utils/prisma');
const { fail } = require('../utils/response');

const PLAY_STORE_BASE_URL = 'https://play.google.com/store/apps/details?id=decksalone.com';

// Latest release info. Override via env vars when shipping a new release —
// keep APP_LATEST_VERSION_CODE in sync with versionCode in android/app/build.gradle.
const DEFAULTS = {
  latestVersion: '1.1.0',
  latestVersionCode: 11,
  releaseNotes: 'Bug fixes and performance improvements.',
  playStoreUrl: PLAY_STORE_BASE_URL,
  apkUrl: '/api/app/download',
};

function latestVersion() {
  return process.env.APP_LATEST_VERSION || DEFAULTS.latestVersion;
}

// The APK lives in the persistent uploads volume: <UPLOADS_DIR>/apk/<filename>
function apkFilePath() {
  const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');
  const filename = process.env.APP_APK_FILENAME || 'DeckSalone-1.1.0.apk';
  return path.join(uploadsDir, 'apk', filename);
}

router.get('/version', (req, res) => {
  const latestVersionCode = parseInt(process.env.APP_LATEST_VERSION_CODE || '', 10);
  res.json({
    success: true,
    data: {
      latestVersion: latestVersion(),
      latestVersionCode: Number.isFinite(latestVersionCode)
        ? latestVersionCode
        : DEFAULTS.latestVersionCode,
      releaseNotes: process.env.APP_RELEASE_NOTES || DEFAULTS.releaseNotes,
      playStoreUrl: process.env.APP_PLAY_STORE_URL || DEFAULTS.playStoreUrl,
      apkUrl: process.env.APP_APK_URL || DEFAULTS.apkUrl,
    },
  });
});

// GET /api/app/download — streams the Android APK and records the download.
// Deliberately public (no auth) so anyone can grab the app; the counter
// powers the "APK Downloads" stat in the admin dashboard.
router.get('/download', async (req, res) => {
  const filePath = apkFilePath();
  if (!fs.existsSync(filePath)) {
    return fail(res, 404, 'APK not available yet — please try again soon');
  }

  const filename = path.basename(filePath);
  const version = latestVersion();

  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', String(fs.statSync(filePath).size));

  // Count only completed (200) downloads, not aborted/failed attempts
  res.on('finish', () => {
    if (res.statusCode === 200) {
      prisma.appDownload
        .create({ data: { platform: 'android', appVersion: version } })
        .catch(() => {});
    }
  });

  return fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
