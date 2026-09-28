import winston from 'winston';
const axios = require('axios');

const { combine, timestamp, printf, colorize, json } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message} `;
  if (Object.keys(metadata).length > 0) {
    msg += JSON.stringify(metadata);
  }
  return msg;
});

// Automated error alerting dispatcher (Webhook: Discord / Slack / Ops channel)
export async function sendErrorAlert(errorData: {
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  metadata?: any;
}) {
  const webhookUrl = process.env.ERROR_ALERT_WEBHOOK_URL || process.env.DISCORD_ERROR_WEBHOOK;
  if (!webhookUrl) return;

  try {
    const payload = {
      content: `🚨 **[Deck Salone Alert] Critical Server Error**\n**Status:** \`${errorData.statusCode || 500}\` | **Method:** \`${errorData.method || 'N/A'}\` | **Path:** \`${errorData.path || 'N/A'}\`\n**Message:** ${errorData.message}\n\`\`\`\n${(errorData.stack || '').slice(0, 1000)}\n\`\`\``,
    };
    await axios.post(webhookUrl, payload, { timeout: 3000 }).catch(() => {});
  } catch (e) {}
}

// Redact JWT `token` query params from URLs before they reach any log line.
// Phase 2 puts ?token= JWTs in gated media URLs, so raw URLs must never be
// logged (D2 / 3b structured-logging hardening). Handles `?token=` and
// `&token=` separators on the serialized query string.
export function redactUrlToken(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return '';
  return url.replace(/([?&]token=)[^&]*/gi, '$1[redacted]');
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV === 'production' ? json() : logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV !== 'production' 
        ? combine(colorize(), logFormat) 
        : json()
    })
  ],
});

export default logger;

