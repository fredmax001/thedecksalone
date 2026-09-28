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

// Derive a safe file extension from the (multer-validated) mimetype instead of
// the attacker-controlled originalname. Throws on unsupported mimetypes.
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/webm': 'webm',
};

function extFromMime(mimetype) {
  const ext = mimetype && MIME_TO_EXT[mimetype.toLowerCase()];
  if (!ext) {
    throw new Error(`Unsupported file type: ${mimetype}`);
  }
  return ext;
}

// UPL-12: fileFilter rejections are safe, user-facing text. Mark them with
// statusCode 400 so the global error handler maps them to a 400 (not a 500).
function uploadRejectionError(message) {
  const err: any = new Error(message);
  err.statusCode = 400;
  return err;
}

// UPL-12: central MulterError/fileFilter-error mapping used by the global
// error handler in server.ts. Returns { status, message } or null when the
// error is not upload-related (caller keeps its existing handling).
function getUploadErrorResponse(err) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return { status: 413, message: 'File too large. Please upload a smaller file.' };
    }
    return { status: 400, message: err.message || 'Invalid upload' };
  }
  if (err && err.statusCode === 400 && typeof err.message === 'string' && err.message.length > 0) {
    return { status: 400, message: err.message };
  }
  return null;
}

// File filter for general files
function fileFilter(allowedMimes) {
  return (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(uploadRejectionError(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`), false);
    }
  };
}

// Strict image file filter for uploaded images.
// SVG is rejected because it can contain executable scripts.
// Downstream image processors should still validate file magic bytes.
const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

function imageFileFilter(req, file, cb) {
  const mime = (file.mimetype || '').toLowerCase();
  if (ALLOWED_IMAGE_MIMES.includes(mime)) {
    cb(null, true);
  } else {
    cb(uploadRejectionError(`Invalid image format. Allowed: ${ALLOWED_IMAGE_MIMES.map((m) => m.replace('image/', '')).join(', ')}`), false);
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

const uploadHallOfFameImage = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_UPLOAD_MB * MB },
});

const uploadDocument = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    if (['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(uploadRejectionError('Invalid document format. Allowed: PDF, JPG, PNG, WebP'), false);
    }
  },
  limits: { fileSize: MAX_DOCUMENT_UPLOAD_MB * MB },
});

// Generic admin media upload (image or video)
const uploadAdminMedia = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/')
    ) {
      cb(null, true);
    } else {
      cb(uploadRejectionError('Invalid media format. Allowed: images and videos'), false);
    }
  },
  limits: { fileSize: MAX_IMAGE_UPLOAD_MB * MB },
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
    if (file.fieldname === 'coverImage' || file.fieldname === 'cover' || file.fieldname === 'coverFile') {
      return imageFileFilter(req, file, cb);
    }
    cb(uploadRejectionError(`Unexpected field: ${file.fieldname}`), false);
  },
  limits: { fileSize: MAX_AUDIO_UPLOAD_MB * MB },
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
  { name: 'coverFile', maxCount: 1 },
]);

// UPL-1 / UPL-2 — the public static mount is deliberately narrowed:
//  - mixes/ is NEVER served here; local mix audio only flows through
//    GET /api/mixes/:id/audio (authorized, range-capable).
//  - documents/, subscription-proofs/, tickets/ hold KYC / payment proof
//    material and require a staff JWT (ADMIN / SUPER_ADMIN / FINANCE_ADMIN /
//    VERIFICATION_ADMIN). tickets/ additionally allows the event organizer
//    (the event's DJ) and the buyer so manual payment approval keeps working.
//  - avatars/, covers/, events/, photos/ stay public exactly as before.
const { verifyToken } = require('./jwt');
const { prisma } = require('./prisma');

const STAFF_UPLOAD_ROLES = ['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN'];
const GATED_UPLOAD_PREFIXES = ['/documents/', '/subscription-proofs/', '/tickets/'];

function extractUploadToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.split(' ')[1];
  // <img>/<a>-based admin review UIs cannot send headers; accept ?token=.
  if (typeof req.query?.token === 'string' && req.query.token) return req.query.token;
  return null;
}

async function resolveUploadUser(req) {
  const token = extractUploadToken(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  const userId = decoded && typeof decoded === 'object' ? decoded.id || decoded.userId : null;
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true, tokenVersion: true },
  });
  if (!user || user.status !== 'ACTIVE') return null;
  // AUTH-1 residual: gated uploads must honor tokenVersion — a revoked session's
  // JWT (?token= or Bearer) must not unlock KYC / payment-proof documents.
  const payloadTokenVersion = typeof decoded.tokenVersion === 'number' ? decoded.tokenVersion : 0;
  const userTokenVersion = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0;
  if (userTokenVersion !== payloadTokenVersion) return null;
  return user;
}

async function gatedUploadsAuth(req, res, next) {
  try {
    const rawPath = req.path || '';

    // UPL-1/UPL-2 hardening: express.static/send decodes and normalizes the
    // path before resolving, so the gate must do the same or attackers bypass
    // it with encodings like `/uploads/./mixes/x.mp3` or
    // `/uploads/mixes%2f..%2fdocuments/x.pdf`. Decode, then strictly reject
    // any `..` segment in the decoded path (400) before normalizing.
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid path' });
    }
    if (decodedPath.split('/').includes('..')) {
      return res.status(400).json({ success: false, error: 'Invalid path' });
    }
    const normalized = path.posix.normalize(decodedPath.replace(/\\/g, '/'));
    const reqPath = normalized.startsWith('/') ? normalized : `/${normalized}`;

    // UPL-1 core: mix bytes only stream via the authorized /api/mixes/:id/audio.
    if (reqPath.startsWith('/mixes/')) {
      return res.status(404).end();
    }

    const isGated = GATED_UPLOAD_PREFIXES.some((p) => reqPath.startsWith(p));
    if (!isGated) return next(); // public folders unchanged

    // D3 (3b): gated KYC / payment-proof bytes must never be cached — set
    // no-store as soon as the gate decides the prefix is gated.
    res.setHeader('Cache-Control', 'no-store');

    const user = await resolveUploadUser(req);
    if (user && STAFF_UPLOAD_ROLES.includes(user.role)) return next();

    // tickets/: the buyer or the event organizer may view their own payment
    // screenshot (manual payment approval depends on the organizer seeing it).
    if (user && reqPath.startsWith('/tickets/')) {
      const basename = reqPath.slice('/tickets/'.length).split('/').pop();
      const ticket = await prisma.eventTicket.findFirst({
        where: { paymentScreenshot: { endsWith: `/${basename}` } },
        select: { userId: true, event: { select: { dj: { select: { userId: true } } } } },
      });
      if (ticket && (ticket.userId === user.id || ticket.event?.dj?.userId === user.id)) {
        return next();
      }
    }

    return res.status(user ? 403 : 401).json({ success: false, error: user ? 'Forbidden' : 'Unauthorized' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Serve uploads statically (local fallback)
function serveUploads(app) {
  const express = require('express');
  app.use(
    '/uploads',
    gatedUploadsAuth,
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
  uploadHallOfFameImage,
  uploadDjProfileImages,
  uploadDocument,
  uploadAdminMedia,
  serveUploads,
  gatedUploadsAuth,
  extFromMime,
  getUploadErrorResponse,
};
