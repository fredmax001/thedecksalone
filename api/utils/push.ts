const { prisma } = require('../utils/prisma');

/**
 * Server-side push notifications via Firebase Cloud Messaging (HTTP v1).
 *
 * Uses a service-account JSON key (FCM_SERVICE_ACCOUNT_PATH) to mint OAuth2
 * access tokens with the built-in crypto module — no extra dependencies.
 * When the service account is not configured, every function is a graceful
 * no-op so the rest of the app keeps working.
 */

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function isConfigured(): boolean {
  return Boolean(process.env.FCM_SERVICE_ACCOUNT_PATH);
}

function loadServiceAccount(): any | null {
  const path = process.env.FCM_SERVICE_ACCOUNT_PATH;
  if (!path) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (err: any) {
    console.warn('[Push] Could not read FCM service account:', err?.message);
    return null;
  }
}

function getProjectId(): string | null {
  return process.env.FCM_PROJECT_ID || loadServiceAccount()?.project_id || null;
}

/** Mint a short-lived OAuth2 access token from the service account (RSA-SHA256 JWT). */
async function getAccessToken(): Promise<string | null> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const sa = loadServiceAccount();
  if (!sa?.client_email || !sa?.private_key) return null;

  const crypto = require('crypto');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  ).toString('base64url');

  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), sa.private_key).toString('base64url');
  const jwt = `${header}.${payload}.${signature}`;

  const axios = require('axios');
  try {
    const res = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10_000 }
    );
    cachedAccessToken = {
      token: res.data.access_token,
      expiresAt: Date.now() + (res.data.expires_in || 3600) * 1000,
    };
    return cachedAccessToken.token;
  } catch (err: any) {
    console.warn('[Push] Failed to mint FCM access token:', err?.response?.data || err?.message);
    return null;
  }
}

/** Remove tokens FCM reports as invalid/unregistered. */
async function cleanupInvalidTokens(tokens: string[], invalidTokens: string[]) {
  if (invalidTokens.length === 0) return;
  try {
    await prisma.pushToken.deleteMany({ where: { token: { in: invalidTokens } } });
  } catch (err) {
    console.warn('[Push] Failed to clean up invalid tokens:', err);
  }
}

/**
 * Send a push notification to every device registered by a user.
 * Fails silently — push is best-effort and must never break the caller.
 */
async function sendPushToUser(userId: string, title: string, body: string, data: Record<string, string> = {}): Promise<void> {
  try {
    if (!isConfigured()) return;

    const projectId = getProjectId();
    if (!projectId) return;

    const accessToken = await getAccessToken();
    if (!accessToken) return;

    const tokens = await prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
    if (tokens.length === 0) return;

    const axios = require('axios');
    const stringifiedData = Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)]));

    const res = await axios.post(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        message: {
          token: tokens[0].token,
          notification: { title, body },
          data: stringifiedData,
          android: { priority: 'HIGH' },
        },
      },
      { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10_000 }
    );

    // Send to remaining tokens (FCM v1 sends one message per call)
    const invalidTokens: string[] = [];
    for (const { token } of tokens.slice(1)) {
      try {
        await axios.post(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            message: {
              token,
              notification: { title, body },
              data: stringifiedData,
              android: { priority: 'HIGH' },
            },
          },
          { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10_000 }
        );
      } catch (err: any) {
        if (err?.response?.status === 404 || err?.response?.status === 400) invalidTokens.push(token);
      }
    }

    if (res.status >= 400) {
      console.warn('[Push] FCM send failed:', res.status, res.data);
    }
    await cleanupInvalidTokens(tokens.map((t) => t.token), invalidTokens);
  } catch (err) {
    console.warn('[Push] sendPushToUser failed:', err);
  }
}

module.exports = { sendPushToUser };
