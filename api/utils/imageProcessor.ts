const sharp = require('sharp');

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);

let fileTypeModulePromise = null;
const importModule = new Function('specifier', 'return import(specifier)');

async function detectFileTypeFromBuffer(buffer) {
  if (!fileTypeModulePromise) {
    fileTypeModulePromise = importModule('file-type');
  }
  const fileType = await fileTypeModulePromise;
  const detector = fileType.fileTypeFromBuffer || fileType.fromBuffer;
  if (typeof detector !== 'function') {
    throw new Error('Image validation is not available on this server');
  }
  return detector(buffer);
}

async function validateImage(buffer, options = {}) {
  const type = await detectFileTypeFromBuffer(buffer);
  if (!type || !ALLOWED_IMAGE_TYPES.has(type.mime)) {
    throw new Error('Invalid image format. Allowed: JPG, PNG, WebP');
  }
  if (!ALLOWED_IMAGE_EXTS.has(type.ext)) {
    throw new Error('Invalid image extension');
  }

  const metadata = await sharp(buffer).metadata();
  if (metadata.width && metadata.height) {
    // reject obviously malformed images
    if (metadata.width < 10 || metadata.height < 10) {
      throw new Error('Image dimensions too small');
    }
  }

  return { mime: type.mime, ext: type.ext };
}

async function processAvatar(buffer) {
  const info = await validateImage(buffer);
  const processed = await sharp(buffer)
    .resize(400, 400, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toBuffer();
  return { buffer: processed, contentType: 'image/webp', ext: 'webp' };
}

async function processCover(buffer) {
  const info = await validateImage(buffer);
  const processed = await sharp(buffer)
    .resize(1920, 1080, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toBuffer();
  return { buffer: processed, contentType: 'image/webp', ext: 'webp' };
}

async function processEventImage(buffer) {
  const info = await validateImage(buffer);
  const processed = await sharp(buffer)
    .resize(1200, 800, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toBuffer();
  return { buffer: processed, contentType: 'image/webp', ext: 'webp' };
}

module.exports = { validateImage, processAvatar, processCover, processEventImage };
