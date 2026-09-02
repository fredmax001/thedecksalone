const sharp = require('sharp');

async function validateImage(buffer: Buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Image file is empty or corrupted');
  }

  try {
    const metadata = await sharp(buffer).rotate().metadata();
    if (!metadata || !metadata.format) {
      throw new Error('Invalid image file');
    }
    if (metadata.width && metadata.height && (metadata.width < 10 || metadata.height < 10)) {
      throw new Error('Image dimensions too small (minimum 10x10px)');
    }
    return { mime: `image/${metadata.format}`, ext: metadata.format };
  } catch (err: any) {
    throw new Error('Invalid or unsupported image format. Allowed: JPG, PNG, WebP, HEIC, GIF, AVIF');
  }
}

async function processAvatar(buffer: Buffer) {
  await validateImage(buffer);
  const processed = await sharp(buffer)
    .rotate()
    .resize(400, 400, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toBuffer();
  return { buffer: processed, contentType: 'image/webp', ext: 'webp' };
}

async function processCover(buffer: Buffer) {
  await validateImage(buffer);
  const processed = await sharp(buffer)
    .rotate()
    .resize(1920, 1080, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toBuffer();
  return { buffer: processed, contentType: 'image/webp', ext: 'webp' };
}

async function processMixCover(buffer: Buffer) {
  await validateImage(buffer);
  const processed = await sharp(buffer)
    .rotate()
    .resize(1200, 1200, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toBuffer();
  return { buffer: processed, contentType: 'image/webp', ext: 'webp' };
}

async function processEventImage(buffer: Buffer) {
  await validateImage(buffer);
  const processed = await sharp(buffer)
    .rotate()
    .resize(1200, 800, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toBuffer();
  return { buffer: processed, contentType: 'image/webp', ext: 'webp' };
}

async function processHallOfFameImage(buffer: Buffer) {
  await validateImage(buffer);
  const processed = await sharp(buffer)
    .rotate()
    .resize(800, 1000, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toBuffer();
  return { buffer: processed, contentType: 'image/webp', ext: 'webp' };
}

module.exports = { validateImage, processAvatar, processCover, processMixCover, processEventImage, processHallOfFameImage };
