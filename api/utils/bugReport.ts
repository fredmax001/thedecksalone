import { prisma } from './prisma';
import { sendEmail } from './email';


/**
 * Log system error to database
 */
export async function logSystemError(data: {
  level?: 'ERROR' | 'WARN' | 'CRITICAL';
  source: string;
  message: string;
  stackTrace?: string;
  path?: string;
  method?: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  metadata?: any;
}) {
  try {
    return await prisma.systemErrorLog.create({
      data: {
        level: data.level || 'ERROR',
        source: data.source,
        message: data.message.slice(0, 2000),
        stackTrace: data.stackTrace ? data.stackTrace.slice(0, 5000) : null,
        path: data.path || null,
        method: data.method || null,
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        ipAddress: data.ipAddress || null,
        metadata: data.metadata || undefined,
      },
    });
  } catch (err) {
    console.error('Failed to log system error to DB:', err);
    return null;
  }
}

/**
 * Aggregates unreported system errors from past 24h,
 * sends email to support@decksalone.com, and creates admin notifications.
 */
export async function checkAndSendDailyBugReport() {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Auto-mark stale errors older than 24h as reported to prevent repeated legacy alerts
    await prisma.systemErrorLog.updateMany({
      where: {
        reported: false,
        createdAt: { lt: oneDayAgo },
      },
      data: { reported: true },
    }).catch(() => {});

    const unreportErrors = await prisma.systemErrorLog.findMany({
      where: {
        reported: false,
        createdAt: { gte: oneDayAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (unreportErrors.length === 0) {
      return { success: true, count: 0, message: 'No new system errors captured' };
    }

    const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@decksalone.com';
    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'https://decksalone.com';

    // Build HTML error list
    const errorRowsHtml = unreportErrors.map((err, i) => `
      <tr style="background:${i % 2 === 0 ? '#141414' : '#1a1a1a'};">
        <td style="padding:10px; border-bottom:1px solid #2a2a2a; color:#ef4444; font-weight:700; font-size:11px;">
          ${err.level}
        </td>
        <td style="padding:10px; border-bottom:1px solid #2a2a2a; color:#fff; font-size:12px; font-weight:600;">
          ${err.method ? `${err.method} ` : ''}${err.path || err.source}
        </td>
        <td style="padding:10px; border-bottom:1px solid #2a2a2a; color:#ccc; font-size:12px;">
          <div style="font-family:monospace; word-break:break-all;">${err.message}</div>
          ${err.userEmail ? `<div style="color:#f4e059; font-size:10px; margin-top:4px;">User: ${err.userEmail}</div>` : ''}
        </td>
        <td style="padding:10px; border-bottom:1px solid #2a2a2a; color:#888; font-size:11px;">
          ${new Date(err.createdAt).toLocaleTimeString()}
        </td>
      </tr>
    `).join('');

    // Send email to support@decksalone.com
    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `🚨 Deck Salone Daily Bug Alert: ${unreportErrors.length} Error(s) Captured`,
      text: `Daily Bug Report: ${unreportErrors.length} system error(s) were captured in the last 24 hours. Log in to Admin Dashboard to inspect: ${frontendUrl}/admin`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Daily Bug Report</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;padding:30px 15px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#111;border-radius:16px;overflow:hidden;border:1px solid #333;">
        <tr><td style="background:linear-gradient(135deg,#2a0a0a,#0a0a0a);padding:30px;text-align:center;border-bottom:1px solid #ef444444;">
          <h1 style="color:#ef4444;margin:0;font-size:22px;font-weight:800;letter-spacing:1px;">🚨 DECK SALONE SYSTEM BUG REPORT</h1>
          <p style="color:#aaa;margin:6px 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Daily Automated Diagnostics</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
            <p style="color:#ef4444;font-size:24px;font-weight:800;margin:0;">${unreportErrors.length}</p>
            <p style="color:#ccc;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px;">New Error(s) Captured in Last 24 Hours</p>
          </div>

          <h3 style="color:#fff;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">Captured Errors Summary</h3>
          <div style="overflow-x:auto;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;text-align:left;">
              <thead>
                <tr style="background:#222;color:#888;font-size:11px;text-transform:uppercase;">
                  <th style="padding:10px;">Level</th>
                  <th style="padding:10px;">Path / Source</th>
                  <th style="padding:10px;">Message</th>
                  <th style="padding:10px;">Time</th>
                </tr>
              </thead>
              <tbody>
                ${errorRowsHtml}
              </tbody>
            </table>
          </div>

          <div style="text-align:center;margin-top:28px;">
            <a href="${frontendUrl}/admin" style="display:inline-block;background:#f4e059;color:#000;font-weight:800;font-size:13px;padding:12px 28px;border-radius:24px;text-decoration:none;">
              Inspect Bug Logs in Admin Dashboard →
            </a>
          </div>
        </td></tr>
        <tr><td style="background:#0a0a0a;padding:20px;text-align:center;border-top:1px solid #222;">
          <p style="color:#444;margin:0;font-size:11px;">Deck Salone Automated System Monitor — support@decksalone.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    // Notify ONLY full admin users (ADMIN, SUPER_ADMIN) via Bell Icon notification
    const adminUsers = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true },
    });

    if (adminUsers.length > 0) {
      await prisma.notification.createMany({
        data: adminUsers.map(admin => ({
          userId: admin.id,
          type: 'SYSTEM',
          title: '🚨 Daily System Bug Report',
          body: `${unreportErrors.length} error(s) were captured in the last 24 hours. Check System Errors in Admin Dashboard.`,
          actionUrl: '/admin',
        })),
      }).catch(() => {});
    }

    // Mark errors as reported
    const errorIds = unreportErrors.map(e => e.id);
    await prisma.systemErrorLog.updateMany({
      where: { id: { in: errorIds } },
      data: { reported: true },
    });

    return { success: true, count: unreportErrors.length, message: `Reported ${unreportErrors.length} errors` };
  } catch (err: any) {
    console.error('Failed to run daily bug report:', err);
    return { success: false, error: err.message };
  }
}
