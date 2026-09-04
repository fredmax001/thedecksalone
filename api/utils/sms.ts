/**
 * Sent.dm SMS Service
 * Integration with Sent.dm v3 Messages API
 */

const axios = require('axios');
const { randomUUID: uuidv4 } = require('crypto');

const SENTDM_API_KEY = process.env.SENTDM_API_KEY || process.env.SENT_DM_API_KEY || process.env.SENT_API_KEY || '';
const SENTDM_API_URL = process.env.SENTDM_API_URL || 'https://api.sent.dm/v3/messages';
const DEFAULT_TEMPLATE_ID = process.env.SENTDM_TEMPLATE_ID || '2a9edde1-e8dd-41c2-b17c-99d273737daf';

/**
 * Format phone number to E.164 format.
 * Automatically handles Sierra Leone prefixes (07X, 08X, 09X, 03X, 232X)
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Handle Sierra Leone numbers (e.g. 072011156 -> +23272011156)
  if (cleaned.startsWith('0') && cleaned.length === 9) {
    return `+232${cleaned.substring(1)}`;
  }

  // If starts with 232 without plus
  if (cleaned.startsWith('232')) {
    return `+${cleaned}`;
  }

  // If 8 digits (e.g. 72011156), assume Sierra Leone
  if (cleaned.length === 8) {
    return `+232${cleaned}`;
  }

  return `+${cleaned}`;
}

export interface SendSmsOptions {
  to: string | string[];
  templateId?: string;
  parameters?: Record<string, string>;
  channel?: string[];
  idempotencyKey?: string;
}

/**
 * Send SMS message via Sent.dm API
 */
export async function sendSentDmSms(options: SendSmsOptions): Promise<{ success: boolean; data?: any; error?: string }> {
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const formattedRecipients = recipients.map(formatPhoneNumber).filter(Boolean);

  if (formattedRecipients.length === 0) {
    return { success: false, error: 'No valid recipient phone numbers provided' };
  }

  const templateId = options.templateId || DEFAULT_TEMPLATE_ID;
  const parameters = options.parameters || {};
  const channel = options.channel || ['sent'];
  const idempotencyKey = options.idempotencyKey || `req_${Date.now()}_${uuidv4().substring(0, 8)}`;

  // If no API key configured, log in dev mode
  if (!SENTDM_API_KEY) {
    console.warn('[Sent.dm] SENTDM_API_KEY is not configured in environment variables.');
    console.log(`[Sent.dm DEV MOCK] Would send to ${formattedRecipients.join(', ')} with template ${templateId}:`, parameters);
    return {
      success: true,
      data: { mock: true, recipients: formattedRecipients, parameters, templateId },
    };
  }

  try {
    const payload = {
      to: formattedRecipients,
      channel,
      template: {
        id: templateId,
        parameters,
      },
    };

    const response = await axios.post(SENTDM_API_URL, payload, {
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': SENTDM_API_KEY,
        'Idempotency-Key': idempotencyKey,
      },
      timeout: 10000,
    });

    console.log(`[Sent.dm] SMS successfully dispatched to ${formattedRecipients.join(', ')}:`, response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    const errorDetails = error.response?.data || error.message;
    console.error('[Sent.dm] Failed to send SMS:', errorDetails);
    return {
      success: false,
      error: typeof errorDetails === 'object' ? JSON.stringify(errorDetails) : String(errorDetails),
    };
  }
}

module.exports = {
  formatPhoneNumber,
  sendSentDmSms,
};
