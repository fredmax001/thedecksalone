const nodemailer = require('nodemailer');
const { getFrontendUrl } = require('./url');
import logger from './logger';

/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: any = null;
let hasLoggedMissingSmtpConfig = false;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  const missing: string[] = [];
  if (!host) missing.push('SMTP_HOST');
  if (!user) missing.push('SMTP_USER');
  if (!pass) missing.push('SMTP_PASS');
  if (!from) missing.push('EMAIL_FROM');

  if (missing.length > 0) {
    if (!hasLoggedMissingSmtpConfig) {
      logger.warn(`[Email] SMTP configuration incomplete. Missing variables: ${missing.join(', ')}. Outgoing emails will be simulated in logs.`);
      hasLoggedMissingSmtpConfig = true;
    }
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return transporter;
  } catch (err: any) {
    logger.error(`[Email] Failed to create nodemailer transport:`, err);
    return null;
  }
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const from = process.env.EMAIL_FROM;
  const transport = getTransporter();

  if (!transport || !from) {
    const message = `Email not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM. Simulated dispatch to ${options.to}: "${options.subject}"`;
    logger.warn(`[Email] ${message}`);
    return { success: false, error: message };
  }

  try {
    await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    logger.info(`[Email] Successfully sent email to ${options.to}: "${options.subject}"`);
    return { success: true };
  } catch (error: any) {
    logger.error(`[Email] Failed to send email to ${options.to}:`, error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}


export async function sendWelcomeEmail(options: { to: string; username: string; role?: string }): Promise<{ success: boolean; error?: string }> {
  const frontendUrl = getFrontendUrl();
  const logoUrl = `${frontendUrl}/logo-icon.png`;
  const subject = 'Welcome to Deck Salone!';
  const roleLabel = options.role === 'DJ' ? 'DJ' : 'music lover';
  
  const text = `Hi ${options.username},

Welcome to Deck Salone — the premier platform for DJs and music lovers in Sierra Leone!

Your account has been created successfully. As a ${roleLabel}, you can now:
${options.role === 'DJ' ? '- Upload your mixes and reach new fans\n- Get booked for events\n- Join battles and climb the rankings' : '- Discover amazing DJ mixes\n- Follow your favorite DJs\n- Book DJs for your events'}

Get started: ${frontendUrl}

If you have any questions, contact us at support@decksalone.com or WhatsApp +232 72 011 156.

— The Deck Salone Team`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Deck Salone</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111;border-radius:16px;overflow:hidden;border:1px solid #333;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);padding:40px 30px;text-align:center;border-bottom:1px solid #333;">
              <img src="${logoUrl}" alt="Deck Salone" width="80" height="80" style="border-radius:50%;border:2px solid #d4af37;display:block;margin:0 auto 20px;" />
              <h1 style="color:#d4af37;margin:0;font-size:28px;font-weight:700;letter-spacing:1px;">DECK SALONE</h1>
              <p style="color:#888;margin:8px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Sierra Leone's DJ Network</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="color:#fff;margin:0 0 16px;font-size:22px;font-weight:600;">Welcome, ${options.username}!</h2>
              <p style="color:#aaa;margin:0 0 24px;font-size:15px;line-height:1.6;">
                We're excited to have you on Deck Salone — the premier platform for DJs and music lovers in Sierra Leone.
              </p>
              
              <div style="background-color:#1a1a1a;border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid #333;">
                <h3 style="color:#d4af37;margin:0 0 12px;font-size:16px;font-weight:600;">What you can do:</h3>
                <ul style="color:#aaa;margin:0;padding-left:20px;font-size:14px;line-height:1.8;">
                  ${options.role === 'DJ' ? `
                  <li>Upload your mixes and reach new fans</li>
                  <li>Get booked for events</li>
                  <li>Join battles and climb the rankings</li>
                  <li>Access your DJ dashboard</li>
                  ` : `
                  <li>Discover amazing DJ mixes</li>
                  <li>Follow your favorite DJs</li>
                  <li>Book DJs for your events</li>
                  <li>Join the community</li>
                  `}
                </ul>
              </div>
              
              <div style="text-align:center;margin:32px 0;">
                <a href="${frontendUrl}" style="display:inline-block;padding:14px 32px;background:#d4af37;color:#000;text-decoration:none;border-radius:50px;font-weight:700;font-size:15px;letter-spacing:0.5px;">Get Started</a>
              </div>
              
              <p style="color:#666;margin:24px 0 0;font-size:13px;line-height:1.6;text-align:center;">
                Need help? Contact us at <a href="mailto:support@decksalone.com" style="color:#d4af37;text-decoration:none;">support@decksalone.com</a><br>
                or WhatsApp <a href="https://wa.me/23272011156" style="color:#d4af37;text-decoration:none;">+232 72 011 156</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#0a0a0a;padding:24px 30px;text-align:center;border-top:1px solid #333;">
              <p style="color:#555;margin:0;font-size:12px;">
                &copy; ${new Date().getFullYear()} Deck Salone. All rights reserved.<br>
                Freetown, Sierra Leone
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: options.to, subject, text, html });
}

export async function sendOtpEmail(options: { to: string; code: string; username?: string }): Promise<{ success: boolean; error?: string }> {
  const frontendUrl = getFrontendUrl();
  const logoUrl = `${frontendUrl}/logo-icon.png`;
  const subject = 'Your Deck Salone Verification Code';
  const safeUsername = escapeHtml(options.username || 'there');
  const safeCode = escapeHtml(options.code);

  const text = `Hi ${options.username || 'there'},

Your verification code is: ${options.code}

This code will expire in 10 minutes.

If you did not request this code, please ignore this email.

— The Deck Salone Team`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111;border-radius:16px;overflow:hidden;border:1px solid #333;">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);padding:40px 30px;text-align:center;border-bottom:1px solid #333;">
              <img src="${logoUrl}" alt="Deck Salone" width="80" height="80" style="border-radius:50%;border:2px solid #d4af37;display:block;margin:0 auto 20px;" />
              <h1 style="color:#d4af37;margin:0;font-size:24px;font-weight:700;">Verification Code</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;text-align:center;">
              <p style="color:#aaa;margin:0 0 24px;font-size:15px;">Hi ${safeUsername},</p>
              <p style="color:#aaa;margin:0 0 32px;font-size:15px;">Your verification code is:</p>

              <div style="background-color:#1a1a1a;border-radius:12px;padding:24px 32px;display:inline-block;border:1px solid #d4af37;margin-bottom:32px;">
                <span style="color:#d4af37;font-size:32px;font-weight:700;letter-spacing:8px;font-family:monospace;">${safeCode}</span>
              </div>

              <p style="color:#666;margin:0;font-size:13px;">This code will expire in 10 minutes.</p>
              <p style="color:#666;margin:16px 0 0;font-size:13px;">If you did not request this code, please ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0a0a0a;padding:24px 30px;text-align:center;border-top:1px solid #333;">
              <p style="color:#555;margin:0;font-size:12px;">&copy; ${new Date().getFullYear()} Deck Salone. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: options.to, subject, text, html });
}

export async function sendPasswordResetEmail(options: { to: string; username: string; resetUrl: string }): Promise<{ success: boolean; error?: string }> {
  const frontendUrl = getFrontendUrl();
  const logoUrl = `${frontendUrl}/logo-icon.png`;
  const subject = 'Reset your Deck Salone password';
  const safeUsername = escapeHtml(options.username);
  const safeUrl = escapeHtml(options.resetUrl);

  const text = `Hi ${options.username},

We received a request to reset your Deck Salone password. Click the link below to set a new password:

${options.resetUrl}

This link will expire in 15 minutes. If you did not request a password reset, please ignore this email.

— The Deck Salone Team`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your Deck Salone password</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111;border-radius:16px;overflow:hidden;border:1px solid #333;">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);padding:40px 30px;text-align:center;border-bottom:1px solid #333;">
              <img src="${logoUrl}" alt="Deck Salone" width="80" height="80" style="border-radius:50%;border:2px solid #d4af37;display:block;margin:0 auto 20px;" />
              <h1 style="color:#d4af37;margin:0;font-size:24px;font-weight:700;">Password Reset</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;text-align:center;">
              <p style="color:#aaa;margin:0 0 24px;font-size:15px;">Hi ${safeUsername},</p>
              <p style="color:#aaa;margin:0 0 32px;font-size:15px;">We received a request to reset your Deck Salone password. Click the button below to set a new password:</p>

              <div style="text-align:center;margin:32px 0;">
                <a href="${safeUrl}" style="display:inline-block;padding:14px 32px;background:#d4af37;color:#000;text-decoration:none;border-radius:50px;font-weight:700;font-size:15px;letter-spacing:0.5px;">Reset Password</a>
              </div>

              <p style="color:#666;margin:0;font-size:13px;">Or copy and paste this link into your browser:</p>
              <p style="color:#888;margin:8px 0 0;font-size:13px;word-break:break-all;">${safeUrl}</p>
              <p style="color:#666;margin:24px 0 0;font-size:13px;">This link will expire in 15 minutes.</p>
              <p style="color:#666;margin:16px 0 0;font-size:13px;">If you did not request a password reset, please ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0a0a0a;padding:24px 30px;text-align:center;border-top:1px solid #333;">
              <p style="color:#555;margin:0;font-size:12px;">&copy; ${new Date().getFullYear()} Deck Salone. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: options.to, subject, text, html });
}

export async function sendAdminEmail(options: { to: string; subject: string; message: string; fromName?: string }): Promise<{ success: boolean; error?: string }> {
  const frontendUrl = getFrontendUrl();
  const logoUrl = `${frontendUrl}/logo-icon.png`;
  const fromName = options.fromName || 'Deck Salone Admin';
  const safeSubject = escapeHtml(options.subject);
  const safeMessage = escapeHtml(options.message).replace(/\n/g, '<br>');
  const safeFromName = escapeHtml(fromName);

  const text = `${options.message}

— ${fromName}
Deck Salone Team
support@decksalone.com | +232 72 011 156`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#111;border-radius:16px;overflow:hidden;border:1px solid #333;">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#0a0a0a 100%);padding:30px;text-align:center;border-bottom:1px solid #333;">
              <img src="${logoUrl}" alt="Deck Salone" width="60" height="60" style="border-radius:50%;border:2px solid #d4af37;display:block;margin:0 auto 16px;" />
              <h1 style="color:#d4af37;margin:0;font-size:20px;font-weight:700;">DECK SALONE</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 30px;">
              <h2 style="color:#fff;margin:0 0 16px;font-size:18px;font-weight:600;">${safeSubject}</h2>
              <div style="color:#aaa;font-size:14px;line-height:1.7;">${safeMessage}</div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0a0a0a;padding:20px 30px;text-align:center;border-top:1px solid #333;">
              <p style="color:#555;margin:0;font-size:12px;">— ${safeFromName}<br>Deck Salone Team</p>
              <p style="color:#444;margin:8px 0 0;font-size:11px;">support@decksalone.com | +232 72 011 156</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: options.to, subject: options.subject, text, html });
}

export function isEmailConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.EMAIL_FROM
  );
}


export async function sendWeeklyTop3RankingEmail(options: {
  to: string;
  stageName: string;
  avatar?: string;
  position: number;
  score: number;
  digitalScore?: number;
  industryScore?: number;
  communityScore?: number;
}): Promise<{ success: boolean; error?: string }> {
  const frontendUrl = getFrontendUrl();
  const logoUrl = `${frontendUrl}/logo-web.png?v=4`;
  const defaultAvatar = `${frontendUrl}/assets/logo.png`;
  const avatarUrl = options.avatar || defaultAvatar;
  const safeStageName = escapeHtml(options.stageName);
  const safeAvatarUrl = escapeHtml(avatarUrl);

  const positionTitles: Record<number, { title: string; badgeColor: string; badgeBorder: string; medalEmoji: string }> = {
    1: { title: '#1 DJ of the Week', badgeColor: '#f4e059', badgeBorder: '#f4e059', medalEmoji: '🥇' },
    2: { title: '#2 DJ of the Week', badgeColor: '#C0C0C0', badgeBorder: '#C0C0C0', medalEmoji: '🥈' },
    3: { title: '#3 DJ of the Week', badgeColor: '#CD7F32', badgeBorder: '#CD7F32', medalEmoji: '🥉' },
  };

  const posInfo = positionTitles[options.position] || {
    title: `Top 3 DJ of the Week (#${options.position})`,
    badgeColor: '#f4e059',
    badgeBorder: '#f4e059',
    medalEmoji: '🏆',
  };

  const subject = `${posInfo.medalEmoji} Congratulations ${options.stageName}! You are the ${posInfo.title} on Deck Salone!`;
  const safeSubject = escapeHtml(subject);

  const text = `Congratulations ${options.stageName}!

You have achieved Rank #${options.position} on Deck Salone's Weekly Official DJ Rankings!

Current Ranking Score: ${options.score.toFixed(1)} PTS
- Digital Score: ${(options.digitalScore || 0).toFixed(1)} PTS
- Industry Score: ${(options.industryScore || 0).toFixed(1)} PTS
- Community Score: ${(options.communityScore || 0).toFixed(1)} PTS

Keep rocking the decks!
View Live Rankings: ${frontendUrl}/rankings

— Deck Salone Team`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background-color:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#080808;padding:40px 10px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#121212;border-radius:20px;overflow:hidden;border:1px solid #222;box-shadow:0 10px 40px rgba(0,0,0,0.8);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(180deg, #1f1a0e 0%, #121212 100%);padding:36px 30px 24px;text-align:center;border-bottom:1px solid #222;">
              <img src="${logoUrl}" alt="Deck Salone" style="height:48px;width:auto;display:block;margin:0 auto 16px;" />
              <div style="display:inline-block;padding:6px 16px;background-color:rgba(244, 224, 89,0.15);border:1px solid ${posInfo.badgeBorder};border-radius:30px;color:${posInfo.badgeColor};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                ${posInfo.medalEmoji} ${posInfo.title}
              </div>
            </td>
          </tr>

          <!-- DJ Profile Box -->
          <tr>
            <td style="padding:36px 30px;text-align:center;">
              <div style="position:relative;display:inline-block;margin-bottom:20px;">
                <img src="${safeAvatarUrl}" alt="${safeStageName}" style="width:110px;height:110px;border-radius:50%;object-fit:cover;border:4px solid ${posInfo.badgeColor};box-shadow:0 0 25px rgba(244, 224, 89,0.3);display:block;margin:0 auto;" />
              </div>

              <h1 style="color:#ffffff;margin:0 0 6px;font-size:26px;font-weight:800;letter-spacing:-0.5px;">${safeStageName}</h1>
              <p style="color:#f4e059;margin:0 0 24px;font-size:15px;font-weight:600;">
                Official Rank #${options.position} DJ of the Week
              </p>

              <!-- Score Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#181818;border-radius:14px;border:1px solid #282828;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px;text-align:center;border-bottom:1px solid #242424;">
                    <span style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;font-weight:600;display:block;margin-bottom:4px;">OVERALL RANKING SCORE</span>
                    <span style="font-size:36px;font-weight:800;color:#f4e059;font-family:monospace;">${options.score.toFixed(1)} <span style="font-size:16px;">PTS</span></span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="33%" style="text-align:center;">
                          <span style="font-size:10px;color:#999;display:block;text-transform:uppercase;margin-bottom:2px;">Digital</span>
                          <span style="font-size:16px;font-weight:700;color:#f4e059;font-family:monospace;">${(options.digitalScore || 0).toFixed(1)}</span>
                        </td>
                        <td width="34%" style="text-align:center;border-left:1px solid #282828;border-right:1px solid #282828;">
                          <span style="font-size:10px;color:#999;display:block;text-transform:uppercase;margin-bottom:2px;">Industry</span>
                          <span style="font-size:16px;font-weight:700;color:#A78BFA;font-family:monospace;">${(options.industryScore || 0).toFixed(1)}</span>
                        </td>
                        <td width="33%" style="text-align:center;">
                          <span style="font-size:10px;color:#999;display:block;text-transform:uppercase;margin-bottom:2px;">Community</span>
                          <span style="font-size:16px;font-weight:700;color:#34D399;font-family:monospace;">${(options.communityScore || 0).toFixed(1)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#bbbbbb;font-size:14px;line-height:1.6;margin:0 0 28px;">
                Congratulations on your outstanding performance! Your mix engagement, stream counts, bookings, and community reviews have placed you in the Top 3 DJs in Sierra Leone this week.
              </p>

              <!-- CTA Button -->
              <a href="${frontendUrl}/rankings" style="display:inline-block;background:linear-gradient(135deg,#f4e059 0%,#f4e059 50%,#f4e059 100%);color:#000000;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:1px;padding:14px 32px;border-radius:30px;text-decoration:none;box-shadow:0 4px 15px rgba(244, 224, 89,0.4);">
                View Full Rankings Board &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0a0a0a;padding:24px 30px;text-align:center;border-top:1px solid #222;">
              <p style="color:#777777;margin:0 0 6px;font-size:12px;font-weight:600;">Deck Salone — Sierra Leone's #1 DJ Platform</p>
              <p style="color:#555555;margin:0;font-size:11px;">Freetown, Sierra Leone | support@decksalone.com</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: options.to, subject, text, html });
}

export async function sendAdminViolationAlertEmail(options: {
  reportId: string;
  reason: string;
  details: string;
  reporterEmail?: string;
  targetUserEmail?: string;
  targetUserName?: string;
  contentType?: string;
  contentId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || 'support@decksalone.com';
  const subject = `⚠️ [URGENT VIOLATION ALERT] Terms & Privacy Report #${options.reportId.slice(-6)}`;
  const frontendUrl = getFrontendUrl();
  const safeReportId = escapeHtml(options.reportId);
  const safeReason = escapeHtml(options.reason);
  const safeDetails = escapeHtml(options.details);
  const safeReporterEmail = escapeHtml(options.reporterEmail || 'Anonymous / Guest');
  const safeTargetUserName = escapeHtml(options.targetUserName || 'N/A');
  const safeTargetUserEmail = escapeHtml(options.targetUserEmail || 'N/A');
  const safeContentType = escapeHtml(options.contentType || 'General Account / Behavior');

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0f0f0f; color: #ffffff; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: #1a1a1a; border: 1px solid #ff4444; border-radius: 12px; padding: 24px;">
        <h2 style="color: #ff4444; margin-top: 0;">⚠️ Terms & Policy Violation Reported</h2>
        <p>A new violation report has been submitted on <strong>Deck Salone</strong> and requires administrator review.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; color: #ddd; font-size: 14px;">
          <tr><td style="padding: 6px; font-weight: bold; width: 140px; border-bottom: 1px solid #333;">Report ID:</td><td style="padding: 6px; border-bottom: 1px solid #333;">${safeReportId}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold; border-bottom: 1px solid #333;">Violation Category:</td><td style="padding: 6px; border-bottom: 1px solid #333; color: #ffbb33; font-weight: bold;">${safeReason.toUpperCase()}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold; border-bottom: 1px solid #333;">Reporter:</td><td style="padding: 6px; border-bottom: 1px solid #333;">${safeReporterEmail}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold; border-bottom: 1px solid #333;">Reported User:</td><td style="padding: 6px; border-bottom: 1px solid #333;">${safeTargetUserName} (${safeTargetUserEmail})</td></tr>
          <tr><td style="padding: 6px; font-weight: bold; border-bottom: 1px solid #333;">Content Type:</td><td style="padding: 6px; border-bottom: 1px solid #333;">${safeContentType}</td></tr>
        </table>

        <div style="background: #252525; border-left: 4px solid #ff4444; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <strong>Report Details:</strong>
          <p style="margin: 6px 0 0; color: #ccc;">${safeDetails}</p>
        </div>

        <a href="${frontendUrl}/admin" style="display: inline-block; background: #ff4444; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 12px;">Review in Admin Dashboard &rarr;</a>
      </div>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject,
    text: `Violation Report #${options.reportId}: ${safeReason} - ${options.details}`,
    html,
  });
}

export async function sendAccountSuspensionEmail(options: {
  to: string;
  name?: string;
  status: 'SUSPENDED' | 'BANNED';
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const subject = `[Deck Salone] Notice of Account ${options.status === 'BANNED' ? 'Permanent Banning' : 'Suspension'}`;
  const actionText = options.status === 'BANNED' ? 'permanently banned' : 'temporarily suspended';
  const safeName = escapeHtml(options.name || 'User');
  const safeReason = escapeHtml(options.reason || 'Terms violation');

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0f0f0f; color: #ffffff; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 24px;">
        <h2 style="color: #ff4444; margin-top: 0;">Account ${options.status === 'BANNED' ? 'Banned' : 'Suspended'}</h2>
        <p>Dear ${safeName},</p>
        <p>Your Deck Salone account has been <strong>${actionText}</strong> due to a violation of our Terms of Service, Privacy Policy, or applicable laws of Sierra Leone.</p>
        
        ${options.reason ? `<div style="background: #2b1d1d; border-left: 4px solid #ff4444; padding: 12px; margin: 16px 0; border-radius: 4px; color: #ffcccc;">
          <strong>Reason for Action:</strong>
          <p style="margin: 6px 0 0;">${escapeHtml(options.reason)}</p>
        </div>` : ''}

        <p style="color: #aaa; font-size: 14px;">Under the Terms of Service and Sierra Leone Cyber Security & Crimes Act 2021, accounts engaging in prohibited conduct, copyright infringement, fraud, or harassment are subject to administrative suspension or permanent termination.</p>

        <p style="color: #aaa; font-size: 14px; margin-top: 20px;">If you believe this action was taken in error, you may file an appeal by contacting our compliance team at <a href="mailto:support@decksalone.com" style="color: #f4e059;">support@decksalone.com</a>.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: options.to,
    subject,
    text: `Your Deck Salone account has been ${actionText}. Reason: ${safeReason}`,
    html,
  });
}

export async function sendBirthdayEmail(options: {
  to: string;
  name: string;
  isDj?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const frontendUrl = getFrontendUrl();
  const logoUrl = `${frontendUrl}/logo-web.png`;
  const subject = `🎂 Happy Birthday ${options.name}! Best Wishes from Deck Salone 🎉`;
  const safeName = escapeHtml(options.name);
  const safeSubject = escapeHtml(subject);
  
  const text = `Happy Birthday ${options.name}!

Wishing you an incredible day filled with music, joy, and celebration! 

Thank you for being a valued part of the Deck Salone family — Sierra Leone's #1 DJ Platform.

Keep shining and dropping the best vibes!

— The Deck Salone Team
${frontendUrl}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${safeSubject}</title></head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#080808;padding:40px 10px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#121212;border-radius:20px;overflow:hidden;border:1px solid #282828;box-shadow:0 12px 50px rgba(0,0,0,0.85);">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(180deg, #2a1f0a 0%, #121212 100%);padding:40px 30px 24px;text-align:center;border-bottom:1px solid #222;">
            <img src="${logoUrl}" alt="Deck Salone" style="height:48px;width:auto;display:block;margin:0 auto 16px;" />
            <div style="display:inline-block;padding:6px 18px;background:rgba(244, 224, 89,0.15);border:1px solid #f4e059;border-radius:30px;color:#f4e059;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">
              🎂 Birthday Celebration
            </div>
          </td>
        </tr>

        <!-- Main Body -->
        <tr>
          <td style="padding:40px 32px;text-align:center;">
            <div style="font-size:64px;line-height:1;margin-bottom:20px;">🎉</div>
            <h1 style="color:#ffffff;margin:0 0 10px;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Happy Birthday, ${safeName}!</h1>
            <p style="color:#f4e059;margin:0 0 24px;font-size:16px;font-weight:600;">
              Wishing you an incredible day filled with music, joy, and celebration! 🎵
            </p>

            <div style="background-color:#181818;border-radius:14px;border:1px solid #282828;padding:24px;margin-bottom:28px;text-align:left;">
              <p style="color:#cccccc;font-size:14px;line-height:1.7;margin:0;">
                Today we celebrate <strong>YOU</strong>! Thank you for bringing your energy, talent, and passion to <strong>Deck Salone</strong>. Whether on the decks or on the dancefloor, you help make Sierra Leone's music community vibrant and unstoppable.
              </p>
              ${options.isDj ? `
              <div style="margin-top:16px;padding-top:16px;border-top:1px solid #282828;color:#f4e059;font-size:13px;font-weight:700;">
                🎧 Keep dropping the hottest mixes & climbing the weekly rankings!
              </div>` : ''}
            </div>

            <!-- CTA Button -->
            <a href="${frontendUrl}" style="display:inline-block;background:linear-gradient(135deg,#f4e059 0%,#f4e059 50%,#f4e059 100%);color:#000000;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:1px;padding:14px 36px;border-radius:30px;text-decoration:none;box-shadow:0 4px 20px rgba(244, 224, 89,0.4);">
              Visit Deck Salone &rarr;
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#0a0a0a;padding:24px 30px;text-align:center;border-top:1px solid #222;">
            <p style="color:#777777;margin:0 0 6px;font-size:12px;font-weight:600;">Deck Salone — Sierra Leone's #1 DJ Platform</p>
            <p style="color:#555555;margin:0;font-size:11px;">Freetown, Sierra Leone | support@decksalone.com</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({ to: options.to, subject, text, html });
}

export async function sendDeveloperApplicationEmails(options: {
  referenceId: string;
  name: string;
  email: string;
  company?: string;
  projectName: string;
  projectType: string;
  expectedVolume: string;
  website?: string;
  useCase: string;
}): Promise<void> {
  const frontendUrl = getFrontendUrl();
  const logoUrl = `${frontendUrl}/logo-web.png`;
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || 'contact@decksalone.com';

  const safeName = escapeHtml(options.name);
  const safeEmail = escapeHtml(options.email);
  const safeCompany = escapeHtml(options.company || 'Individual / Independent');
  const safeProject = escapeHtml(options.projectName);
  const safeType = escapeHtml(options.projectType);
  const safeVolume = escapeHtml(options.expectedVolume);
  const safeWebsite = escapeHtml(options.website || 'N/A');
  const safeUseCase = escapeHtml(options.useCase);
  const safeRef = escapeHtml(options.referenceId);

  // 1. Send Acknowledgment to the Applicant
  const userSubject = `[Deck Salone API] Application Received (${safeRef})`;
  const userText = `Hello ${options.name},

Thank you for applying for Deck Salone Developer API Access.

Application Reference: ${options.referenceId}
Project: ${options.projectName} (${options.projectType})
Expected Monthly Volume: ${options.expectedVolume}

Our developer relations team is reviewing your use case and technical requirements. We typically process developer access requests within 24 to 48 business hours. Once approved, you will receive your API credentials and sandbox access instructions.

Best regards,
The Deck Salone Developer Team
https://decksalone.com/developers`;

  const userHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${userSubject}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;padding:40px 10px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#141414;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">
        <tr>
          <td style="padding:32px 24px;background:linear-gradient(180deg,#201808 0%,#141414 100%);text-align:center;border-bottom:1px solid #222;">
            <img src="${logoUrl}" alt="Deck Salone" style="height:42px;margin-bottom:12px;" />
            <div style="display:inline-block;padding:4px 14px;background:rgba(244,224,89,0.15);border:1px solid #f4e059;border-radius:20px;color:#f4e059;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">
              ⚡ Developer Platform
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px;">
            <h2 style="margin:0 0 12px;font-size:22px;color:#ffffff;">Application Received</h2>
            <p style="color:#aaaaaa;font-size:14px;line-height:1.6;margin:0 0 20px;">
              Hello <strong>${safeName}</strong>, thank you for applying for Deck Salone REST API access. We are excited to support your integration.
            </p>
            <div style="background:#0d0d0d;border:1px solid #262626;border-radius:12px;padding:18px;margin-bottom:24px;">
              <p style="margin:0 0 8px;font-size:13px;color:#888888;">Application Reference ID:</p>
              <p style="margin:0 0 16px;font-size:18px;font-family:monospace;font-weight:bold;color:#f4e059;">${safeRef}</p>
              <table width="100%" style="font-size:13px;color:#cccccc;border-collapse:collapse;">
                <tr><td style="padding:4px 0;color:#777;">Project:</td><td style="font-weight:600;color:#fff;">${safeProject} (${safeType})</td></tr>
                <tr><td style="padding:4px 0;color:#777;">Organization:</td><td>${safeCompany}</td></tr>
                <tr><td style="padding:4px 0;color:#777;">Expected Volume:</td><td>${safeVolume}</td></tr>
                <tr><td style="padding:4px 0;color:#777;">Status:</td><td style="color:#f4e059;font-weight:700;">Under Review ⏳</td></tr>
              </table>
            </div>
            <p style="color:#999999;font-size:13px;line-height:1.6;margin:0;">
              Our developer relations team is reviewing your use case. You will receive an email within <strong>24–48 business hours</strong> with your API keys and quickstart instructions.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px;text-align:center;background:#0a0a0a;border-top:1px solid #1f1f1f;font-size:12px;color:#555;">
            Deck Salone Developer Platform | Freetown, Sierra Leone | support@decksalone.com
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendEmail({ to: options.email, subject: userSubject, text: userText, html: userHtml }).catch((err) => {
    logger.warn('Failed to send applicant developer acknowledgment email', { err });
  });

  // 2. Send Alert to Admin
  const adminSubject = `🚨 New Developer API Application: ${options.projectName} (${options.name})`;
  const adminText = `A new Developer API Application has been submitted on Deck Salone:

Reference: ${options.referenceId}
Name: ${options.name}
Email: ${options.email}
Company: ${options.company || 'N/A'}
Project: ${options.projectName} (${options.projectType})
Website/Repo: ${options.website || 'N/A'}
Expected Volume: ${options.expectedVolume}
Use Case:
${options.useCase}`;

  await sendEmail({ to: adminEmail, subject: adminSubject, text: adminText }).catch((err) => {
    logger.warn('Failed to send admin developer application notification email', { err });
  });
}
