const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION || 'auto';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const CDN_URL = (process.env.CDN_URL || process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');

const isS3Enabled = S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY;

let s3Client;
if (isS3Enabled) {
  s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: !!process.env.S3_FORCE_PATH_STYLE,
  });
}

function getUploadsDir() {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
}

function localPath(key) {
  return path.join(getUploadsDir(), key);
}

function ensureLocalDir(key) {
  const dir = path.dirname(localPath(key));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function uploadsRoot() {
  return path.resolve(getUploadsDir());
}

// UPL-3: normalize a storage key and reject anything that escapes the uploads root.
function sanitizeKey(raw) {
  if (!raw) return null;
  const normalized = path.posix.normalize(String(raw).replace(/\\/g, '/').replace(/^\/+/, ''));
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) return null;
  if (normalized.split('/').some((seg) => seg === '..')) return null;
  return normalized;
}

function keyFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // /uploads/avatars/uuid.webp -> avatars/uuid.webp
    const match = parsed.pathname.match(/^\/uploads\/(.*)$/);
    if (match) return sanitizeKey(match[1]);
    // S3: https://bucket.endpoint/key
    if (isS3Enabled && parsed.hostname.includes(S3_BUCKET)) {
      return sanitizeKey(parsed.pathname.slice(1));
    }
  } catch {
    // relative path
    const match = url.match(/^\/uploads\/(.*)$/);
    if (match) return sanitizeKey(match[1]);
  }
  return null;
}

// UPL-3: avatar/URL validation. Accepts absolute https URLs only for this app's
// own hosts (decksalone.com + subdomains, plus the configured CDN/S3 host when
// present) — arbitrary external https URLs are rejected — or contained local
// /uploads/... paths.
function isOwnHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (h === 'decksalone.com' || h.endsWith('.decksalone.com')) return true;
  for (const envUrl of [process.env.CDN_URL, process.env.API_URL, process.env.S3_ENDPOINT]) {
    if (!envUrl) continue;
    try {
      if (new URL(envUrl).hostname.toLowerCase() === h) return true;
    } catch {
      // ignore malformed env values
    }
  }
  return false;
}

function isSafeUploadUrl(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (/^https:\/\//i.test(value)) {
    try {
      return isOwnHost(new URL(value).hostname);
    } catch {
      return false;
    }
  }
  if (value.startsWith('/uploads/')) {
    const key = sanitizeKey(value.slice('/uploads/'.length));
    if (!key) return false;
    return path.resolve(localPath(key)).startsWith(uploadsRoot() + path.sep);
  }
  return false;
}

async function uploadBuffer(
  buffer: Buffer,
  folder: string,
  options: { ext?: string; contentType?: string } = {}
) {
  const ext = options.ext || 'webp';
  const key = `${folder}/${randomUUID()}.${ext}`;

  if (isS3Enabled) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: options.contentType || 'application/octet-stream',
        ACL: 'public-read',
      })
    );
    return `${CDN_URL}/${key}`;
  }

  ensureLocalDir(key);
  const dest = localPath(key);
  await fs.promises.writeFile(dest, buffer);
  return `/uploads/${key}`;
}

async function deleteFile(url) {
  const key = keyFromUrl(url);
  if (!key) return;

  if (isS3Enabled) {
    // UPL-3 (defense in depth): never delete S3 keys containing traversal segments.
    if (key.split('/').some((seg) => seg === '..')) {
      console.warn(`deleteFile: refusing unsafe storage key: ${key}`);
      return;
    }
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
    return;
  }

  const dest = localPath(key);
  // UPL-3 (defense in depth): verify the resolved path stays inside the uploads root.
  if (!path.resolve(dest).startsWith(uploadsRoot() + path.sep)) {
    console.warn(`deleteFile: refusing to delete path outside uploads dir: ${dest}`);
    return;
  }
  try {
    await fs.promises.unlink(dest);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

module.exports = { uploadBuffer, deleteFile, keyFromUrl, isSafeUploadUrl, isS3Enabled };
