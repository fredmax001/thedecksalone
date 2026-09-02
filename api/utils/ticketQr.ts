import crypto from 'crypto';

const QR_SECRET = process.env.TICKET_QR_SECRET || '';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

interface QrPayload {
  ticketId: string;
  eventId: string;
  userId: string;
  typeId?: string | null;
  nonce: string;
  exp?: number;
}

function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha256');
}

function ensureSecret(): string {
  if (QR_SECRET) return QR_SECRET;
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  return 'deck-salone-ticket-qr-signature-secret-v2-32chars';
}

export function generateTicketNumber(): string {
  const prefix = 'DS';
  const segment1 = crypto.randomBytes(3).toString('hex').toUpperCase();
  const segment2 = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${segment1}-${segment2}`;
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function encryptQrPayload(payload: QrPayload): string {
  const secret = ensureSecret();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(secret, salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64url');
}

export function decryptQrPayload(encryptedPayload: string): QrPayload | null {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') return null;
  // If already a JSON object or stringified JSON
  try {
    const trimmed = encryptedPayload.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      if (parsed.ticketId && parsed.eventId) return parsed;
    }
  } catch {}

  try {
    const secret = ensureSecret();
    const combined = Buffer.from(encryptedPayload, 'base64url');
    if (combined.length < SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH) return null;
    let offset = 0;
    const salt = combined.subarray(offset, offset + SALT_LENGTH);
    offset += SALT_LENGTH;
    const iv = combined.subarray(offset, offset + IV_LENGTH);
    offset += IV_LENGTH;
    const authTag = combined.subarray(offset, offset + AUTH_TAG_LENGTH);
    offset += AUTH_TAG_LENGTH;
    const encrypted = combined.subarray(offset);
    const key = deriveKey(secret, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const payload = JSON.parse(decrypted.toString('utf8')) as QrPayload;

    return payload;
  } catch (err) {
    return null;
  }
}

export function generateTicketQrPayload(
  ticketId: string,
  eventId: string,
  userId: string,
  typeId?: string | null,
  expiresInHours = 72
): { payload: string; nonce: string } {
  const nonce = generateNonce();
  const exp = Date.now() + expiresInHours * 60 * 60 * 1000;
  const payload = encryptQrPayload({ ticketId, eventId, userId, typeId: typeId || null, nonce, exp });
  return { payload, nonce };
}

export function reissueQrPayload(
  ticketId: string,
  eventId: string,
  userId: string,
  typeId?: string | null,
  expiresInHours = 72
): { payload: string; nonce: string } {
  return generateTicketQrPayload(ticketId, eventId, userId, typeId, expiresInHours);
}

export function buildLegacyTicketQr(ticketId: string, ticketNumber: string): string {
  return `DS-TICKET:${ticketId}:${ticketNumber}`;
}
