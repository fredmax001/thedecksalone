/**
 * Helper to ensure a single, valid, clean primary Frontend URL is returned.
 * Prevents comma-separated multi-origin lists (e.g. "https://decksalone.com,https://www.decksalone.com")
 * from corrupting email links or redirects.
 */
export function getFrontendUrl(): string {
  const envUrl = process.env.FRONTEND_URL || 'https://decksalone.com';
  const primary = envUrl.split(',')[0].trim();
  const clean = primary || 'https://decksalone.com';
  return clean.endsWith('/') ? clean.slice(0, -1) : clean;
}
