const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION || 'auto';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const CDN_URL = (process.env.CDN_URL || process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');

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

function localPath(key) {
  return path.join(process.cwd(), 'uploads', key);
}

function ensureLocalDir(key) {
  const dir = path.dirname(localPath(key));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function keyFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // /uploads/avatars/uuid.webp -> avatars/uuid.webp
    const match = parsed.pathname.match(/^\/uploads\/(.*)$/);
    if (match) return match[1];
    // S3: https://bucket.endpoint/key
    if (isS3Enabled && parsed.hostname.includes(S3_BUCKET)) {
      return parsed.pathname.slice(1);
    }
  } catch {
    // relative path
    const match = url.match(/^\/uploads\/(.*)$/);
    if (match) return match[1];
  }
  return null;
}

async function uploadBuffer(buffer, folder, options = {}) {
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
  return `${CDN_URL}/uploads/${key}`;
}

async function deleteFile(url) {
  const key = keyFromUrl(url);
  if (!key) return;

  if (isS3Enabled) {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
    return;
  }

  const dest = localPath(key);
  try {
    await fs.promises.unlink(dest);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

module.exports = { uploadBuffer, deleteFile, isS3Enabled };
