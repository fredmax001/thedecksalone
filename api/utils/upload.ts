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
  serveUploads,
};
