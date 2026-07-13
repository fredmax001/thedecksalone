const nodemailer = require('nodemailer');

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: any = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host || !user || !pass || !from) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const from = process.env.EMAIL_FROM;
  const transport = getTransporter();

  if (!transport || !from) {
    const message = `Email not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM. Would have sent to ${options.to}: ${options.subject}`;
    console.warn('[Email]', message);
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
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Failed to send email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function sendWelcomeEmail(options: { to: string; username: string; role?: string }): Promise<{ success: boolean; error?: string }> {
  const frontendUrl = process.env.FRONTEND_URL || 'https://decksalone.com';
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
  const frontendUrl = process.env.FRONTEND_URL || 'https://decksalone.com';
  const logoUrl = `${frontendUrl}/logo-icon.png`;
  const subject = 'Your Deck Salone Verification Code';
  
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
              <p style="color:#aaa;margin:0 0 24px;font-size:15px;">Hi ${options.username || 'there'},</p>
              <p style="color:#aaa;margin:0 0 32px;font-size:15px;">Your verification code is:</p>
              
              <div style="background-color:#1a1a1a;border-radius:12px;padding:24px 32px;display:inline-block;border:1px solid #d4af37;margin-bottom:32px;">
                <span style="color:#d4af37;font-size:32px;font-weight:700;letter-spacing:8px;font-family:monospace;">${options.code}</span>
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

export async function sendAdminEmail(options: { to: string; subject: string; message: string; fromName?: string }): Promise<{ success: boolean; error?: string }> {
  const frontendUrl = process.env.FRONTEND_URL || 'https://decksalone.com';
  const logoUrl = `${frontendUrl}/logo-icon.png`;
  const fromName = options.fromName || 'Deck Salone Admin';
  
  const text = `${options.message}

— ${fromName}
Deck Salone Team
support@decksalone.com | +232 72 011 156`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.subject}</title>
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
              <h2 style="color:#fff;margin:0 0 16px;font-size:18px;font-weight:600;">${options.subject}</h2>
              <div style="color:#aaa;font-size:14px;line-height:1.7;">${options.message.replace(/\n/g, '<br>')}</div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0a0a0a;padding:20px 30px;text-align:center;border-top:1px solid #333;">
              <p style="color:#555;margin:0;font-size:12px;">— ${fromName}<br>Deck Salone Team</p>
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
