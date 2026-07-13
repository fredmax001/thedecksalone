const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { requirePro, canApplyForOpportunity, canAccessPremiumOpportunities } = require('../middleware/permissions');

const router = express.Router();

const opportunitySchema = z.object({
    title: z.string().min(5),
    description: z.string().min(20),
    eventType: z.string(), // 'wedding', 'club', 'festival', 'corporate'
    eventDate: z.string().datetime(),
    eventLocation: z.string(),
    budget: z.number().min(0),
    budgetCurrency: z.string().default('SLE'),
    genres: z.array(z.string()).optional(),
    musicStyle: z.string().optional(),
    hours: z.number().optional(),
    equipmentNeeded: z.array(z.string()).optional(),
    requirements: z.string().optional(),
    isFeatured: z.boolean().default(false),
    requiredTier: z.enum(['pro', 'legend']).default('pro'),
});

const applicationSchema = z.object({
    message: z.string().max(500).optional(),
});

// GET /api/opportunities - List opportunities (with tier filtering)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { djProfile: { select: { id: true, subscriptionTier: true, city: true } } },
        });
        if (!user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const isAdmin = user.role === 'ADMIN' || user.role === 'FINANCE_ADMIN';
        const tier = user.djProfile?.subscriptionTier || 'free';

        // Admin: can see all
        // Free users: can't see opportunities (or can see but not apply)
        // Pro users: can see pro+ opportunities
        // Legend users: can see all opportunities
        const whereClause: any = {};

        if (!isAdmin) {
            if (tier === 'free') {
                whereClause['status'] = 'open';
            } else if (tier === 'pro') {
                whereClause['status'] = 'open';
                whereClause['requiredTier'] = { in: ['pro', 'legend'] };
            } else if (tier === 'legend') {
                whereClause['status'] = 'open';
            }
        }



        const opportunities = await prisma.opportunity.findMany({
            where: whereClause,
            orderBy: [{ isFeatured: 'desc' }, { eventDate: 'asc' }],
            include: {
                applicants: isAdmin ? {
                    include: { dj: true }
                } : {
                    where: { djId: user.djProfile?.id || 'none' },
                    select: { id: true, status: true },
                },
            },
        });

        // Map to include canApply status
        const city = user.djProfile?.city?.toLowerCase();
        const mapped = opportunities
            .map((opp) => {
                const nearYou = !!city && opp.eventLocation?.toLowerCase().includes(city);
                return {
                    ...opp,
                    nearYou,
                    userHasApplied: isAdmin ? false : opp.applicants.length > 0,
                    userApplication: isAdmin ? null : (opp.applicants[0] || null),
                    canApply: isAdmin ? false : (tier !== 'free' && opp.requiredTier !== 'legend' ? true : tier === 'legend'),
                    applicants: isAdmin ? opp.applicants : undefined, // Remove for non-admins
                };
            })
            .sort((a, b) => Number(b.nearYou) - Number(a.nearYou));

        return res.json({ success: true, data: mapped });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/opportunities/:id - Get single opportunity details
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'FINANCE_ADMIN';
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { djProfile: { select: { id: true, subscriptionTier: true } } },
        });

        const opportunity = await prisma.opportunity.findUnique({
            where: { id: req.params.id },
            include: {
                applicants: isAdmin
                    ? { select: { id: true, djId: true, message: true, status: true, appliedAt: true } }
                    : {
                        where: { djId: user?.djProfile?.id || 'none' },
                        select: { id: true, status: true, appliedAt: true },
                    },
            },
        });

        if (!opportunity) {
            return res.status(404).json({ success: false, error: 'Opportunity not found' });
        }

        const tier = user?.djProfile?.subscriptionTier || 'free';
        return res.json({
            success: true,
            data: {
                ...opportunity,
                userHasApplied: isAdmin ? false : opportunity.applicants.length > 0,
                userApplication: isAdmin ? null : (opportunity.applicants[0] || null),
                canApply: isAdmin ? false : (tier !== 'free' && opportunity.requiredTier !== 'legend' ? true : tier === 'legend'),
                applicants: isAdmin ? opportunity.applicants : undefined,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/opportunities - Admin: Create opportunity
router.post('/', requireRole(['ADMIN', 'FINANCE_ADMIN']), async (req, res) => {
    try {
        const parsed = opportunitySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: 'Invalid input', issues: parsed.error.issues });
        }

        const opp = await prisma.opportunity.create({
            data: {
                ...parsed.data,
                organizerId: req.user.id,
                eventDate: new Date(parsed.data.eventDate),
            },
        });

        return res.status(201).json({ success: true, data: opp });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/opportunities/:id/apply - DJ: Apply for opportunity
router.post('/:id/apply', authMiddleware, async (req, res) => {
    try {
        const parsed = applicationSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: 'Invalid input' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { djProfile: { select: { id: true, subscriptionTier: true } } },
        });

        if (!user?.djProfile) {
            return res.status(404).json({ success: false, error: 'DJ profile not found' });
        }

        // Check if user has Pro subscription
        if (user.djProfile.subscriptionTier === 'free') {
            return res.status(403).json({
                success: false,
                error: 'Upgrade to Pro to apply for opportunities',
                requiredTier: 'pro',
            });
        }

        const opp = await prisma.opportunity.findUnique({
            where: { id: req.params.id },
        });

        if (!opp) {
            return res.status(404).json({ success: false, error: 'Opportunity not found' });
        }
        if (opp.status !== 'open') {
            return res.status(400).json({ success: false, error: 'This opportunity is no longer open' });
        }

        // Check if Legend-exclusive and user isn't Legend
        if (opp.requiredTier === 'legend' && user.djProfile.subscriptionTier !== 'legend') {
            return res.status(403).json({
                success: false,
                error: 'This is an exclusive opportunity for Legend members',
                requiredTier: 'legend',
            });
        }

        // Check if already applied
        const existing = await prisma.oppApplications.findUnique({
            where: { opportunityId_djId: { opportunityId: opp.id, djId: user.djProfile.id } },
        });

        if (existing) {
            return res.status(409).json({ success: false, error: 'You have already applied for this opportunity' });
        }

        const app = await prisma.oppApplications.create({
            data: {
                opportunityId: opp.id,
                djId: user.djProfile.id,
                message: parsed.data.message || null,
            },
        });

        return res.status(201).json({ success: true, data: app });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/opportunities/:id/applications/:appId/accept - Admin: Accept application
router.post('/:id/applications/:appId/accept', requireRole(['ADMIN']), async (req, res) => {
    try {
        const app = await prisma.oppApplications.update({
            where: { id: req.params.appId },
            data: { status: 'accepted', respondedAt: new Date() },
        });

        return res.json({ success: true, data: app });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/opportunities/:id/applications/:appId/reject - Admin: Reject application
router.post('/:id/applications/:appId/reject', requireRole(['ADMIN']), async (req, res) => {
    try {
        const app = await prisma.oppApplications.update({
            where: { id: req.params.appId },
            data: { status: 'rejected', respondedAt: new Date() },
        });

        return res.json({ success: true, data: app });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
