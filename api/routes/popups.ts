const express = require('express');
const { prisma } = require('../utils/prisma');
const { ok, fail } = require('../utils/response');

const router = express.Router();

/**
 * Admin-Managed Popups, Alerts & Sheets
 * =====================================
 * Admins create popups from the admin dashboard (see routes/admin.ts).
 * This public endpoint serves the popups that are currently active and
 * within their scheduled window. The frontend PopupManager renders them
 * as a centered modal, a top alert banner, or a bottom sheet.
 */

// GET /api/popups/active - Popups currently visible to users/visitors
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const popups = await prisma.popup.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true, message: true, type: true },
    });

    return ok(res, popups);
  } catch (error) {
    console.error('Failed to fetch active popups:', error);
    return fail(res, 500, 'Failed to fetch popups');
  }
});

module.exports = router;
