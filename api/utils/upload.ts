const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist (used for local fallback)
const uploadDirs = {
  avatars: path.join(process.cwd(), 'uploads', 'avatars'),
  covers: path.join(process.cwd(), 'uploads', 'covers'),
  mixes: path.join(process.cwd(), 'uploads', 'mixes'),
  events: path.join(process.cwd(), 'uploads', 'events'),
};

Object.values(uploadDirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Use memory storage so files can be processed (resize, validate, upload to S3) before persisting
const memoryStorage = multer.memoryStorage();

// File filter
function fileFilter(allowedMimes) {
  return (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`), false);
    }
  };
}

// Upload configs
const uploadAvatar = multer({
  storage: memoryStorage,
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp']),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadCover = multer({
  storage: memoryStorage,
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp']),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadMixAudio = multer({
  storage: memoryStorage,
  fileFilter: fileFilter(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/aac']),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

const uploadMixCover = multer({
  storage: memoryStorage,
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp']),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadEventImage = multer({
  storage: memoryStorage,
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp']),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Combined upload for mix creation/update (audio + coverImage)
// Uses fields() so both audio and coverImage can be parsed from one multipart request.
// Memory storage means req.files['audio'][0].buffer is available (no .filename).
const uploadMixFiles = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const audioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/aac'];
    if (imageTypes.includes(file.mimetype) || audioTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

// Combined upload for DJ profile update (avatar + cover)
const uploadDjProfileImages = multer({
  storage: memoryStorage,
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp']),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max for any image
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'coverBanner', maxCount: 1 },
]);

// Serve uploads statically (local fallback)
function serveUploads(app) {
  app.use('/uploads', require('express').static(path.join(process.cwd(), 'uploads')));
}

module.exports = {
  uploadAvatar,
  uploadCover,
  uploadMixAudio,
  uploadMixCover,
  uploadEventImage,
  uploadMixFiles,
  uploadDjProfileImages,
  serveUploads,
};
