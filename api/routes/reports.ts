const express = require('express');
const { ok, fail } = require('../utils/response');
const router = express.Router();
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { softAuthMiddleware } = require('../middleware/auth');
const { sendAdminViolationAlertEmail } = require('../utils/email');

const createReportSchema = z.object({
  targetUserId: z.string().optional(),
  mixId: z.string().optional(),
  eventId: z.string().optional(),
  commentId: z.string().optional(),
  reason: z.enum([
    'copyright_infringement',
    'hate_speech',
    'harassment',
    'fraud',
    'illegal_content',
    'terms_violation',
    'privacy_violation',
    'other',
  ]),
  details: z.string().min(10, 'Please provide at least 10 characters explaining the violation'),
});

// POST /api/v1/reports - Submit a Terms / Privacy violation report
router.post('/', softAuthMiddleware, async (req: any, res: any) => {
  try {
    const parsed = createReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid report data', { details: parsed.error.flatten() });
    }

    const { targetUserId, mixId, eventId, commentId, reason, details } = parsed.data;
    const reporterId = req.user?.id || null;

    // Create the violation report in database
    const report = await prisma.violationReport.create({
      data: {
        reporterId,
        targetUserId: targetUserId || null,
        mixId: mixId || null,
        eventId: eventId || null,
        commentId: commentId || null,
        reason,
        details,
        status: 'PENDING',
      },
      include: {
        reporter: { select: { id: true, email: true, name: true, username: true } },
        targetUser: { select: { id: true, email: true, name: true, username: true } },
        mix: { select: { id: true, title: true } },
        event: { select: { id: true, title: true } },
      },
    });

    // Notify all ADMIN users in-app
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true, email: true },
    });

    if (adminUsers.length > 0) {
      const notifications = adminUsers.map((admin: any) => ({
        userId: admin.id,
        type: 'SYSTEM',
        title: `⚠️ Violation Reported (${reason})`,
        body: `Report #${report.id.slice(-6)}: ${details.slice(0, 100)}...`,
        actionUrl: `/admin?tab=violations&reportId=${report.id}`,
        entityId: report.id,
        entityType: 'VIOLATION_REPORT',
      }));

      await prisma.notification.createMany({ data: notifications }).catch(() => {});
    }

    // Trigger instant email alert to Admin
    sendAdminViolationAlertEmail({
      reportId: report.id,
      reason,
      details,
      reporterEmail: report.reporter?.email || 'Anonymous',
      targetUserEmail: report.targetUser?.email,
      targetUserName: report.targetUser?.name || report.targetUser?.username,
      contentType: mixId ? 'Mix' : eventId ? 'Event' : commentId ? 'Comment' : 'User Profile / Behavior',
      contentId: mixId || eventId || commentId || targetUserId,
    }).catch((err: any) => console.error('[Report] Admin email alert failed:', err));

    return res.status(201).json({
      success: true,
      message: 'Violation report submitted successfully. Our compliance team has been alerted.',
      data: { reportId: report.id },
    });
  } catch (error: any) {
    console.error('[Reports] Error creating report:', error);
    return fail(res, 500, 'Failed to submit report');
  }
});

module.exports = router;
