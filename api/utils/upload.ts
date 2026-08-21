const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MB = 1024 * 1024;
const MAX_IMAGE_UPLOAD_MB = Number(process.env.MAX_IMAGE_UPLOAD_MB || 10);
const MAX_DOCUMENT_UPLOAD_MB = Number(process.env.MAX_DOCUMENT_UPLOAD_MB || 10);
const MAX_AUDIO_UPLOAD_MB = Number(process.env.MAX_AUDIO_UPLOAD_MB || 300);

const getUploadsDir = () => process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

// Ensure upload directories exist (used for local fallback)
const uploadDirs = {
  avatars: path.join(getUploadsDir(), 'avatars'),
  covers: path.join(getUploadsDir(), 'covers'),
  mixes: path.join(getUploadsDir(), 'mixes'),
  events: path.join(getUploadsDir(), 'events'),
  documents: path.join(getUploadsDir(), 'documents'),
};

Object.values(uploadDirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Use memory storage so files can be processed (resize, validate, upload to S3) before persisting
const memoryStorage = multer.memoryStorage();

// File filter for general files
function fileFilter(allowedMimes) {
  return (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`), false);
    }
  };
}

// Strict image file filter for uploaded images.
// SVG is rejected because it can contain executable scripts.
// Downstream image processors should still validate file magic bytes.
const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

function imageFileFilter(req, file, cb) {
  if (file.mimetype && ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid image format. Allowed: ${ALLOWED_IMAGE_MIMES.map((m) => m.replace('image/', '')).join(', ')}`), false);
  }
}

// Upload configs
const uploadAvatar = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_UPLOAD_MB * MB },
});

const uploadCover = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_UPLOAD_MB * MB },
});

const uploadMixAudio = multer({
  storage: memoryStorage,
  fileFilter: fileFilter(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/aac']),
  limits: { fileSize: MAX_AUDIO_UPLOAD_MB * MB },
});

const uploadMixCover = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_UPLOAD_MB * MB },
});

const uploadEventImage = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_UPLOAD_MB * MB },
});

const uploadDocument = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid document format. Allowed: PDF or Images'), false);
    }
  },
  limits: { fileSize: MAX_DOCUMENT_UPLOAD_MB * MB },
});

// Combined upload for DJ profile update (avatar + cover)
const uploadDjProfileImages = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_UPLOAD_MB * MB },
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'coverBanner', maxCount: 1 },
]);

// Combined upload for mixes (audio + cover image)
const uploadMix = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      return fileFilter(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/aac'])(req, file, cb);
    }
    if (file.fieldname === 'coverImage') {
      return fileFilter(['image/jpeg', 'image/png', 'image/webp'])(req, file, cb);
    }
    cb(new Error('Unexpected field'), false);
  },
  limits: { fileSize: MAX_AUDIO_UPLOAD_MB * MB },
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

// Serve uploads statically (local fallback)
function serveUploads(app) {
  const express = require('express');
  app.use(
    '/uploads',
    (req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(getUploadsDir(), {
      setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    })
  );
}

module.exports = {
  uploadAvatar,
  uploadCover,
  uploadMixAudio,
  uploadMixCover,
  uploadMix,
  uploadEventImage,
  uploadDjProfileImages,
  uploadDocument,
  serveUploads,
};
