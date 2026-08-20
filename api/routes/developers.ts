const express = require('express');
const router = express.Router();
const { z } = require('zod');
const crypto = require('crypto');
const { prisma } = require('../utils/prisma');
const { softAuthMiddleware } = require('../middleware/auth');
const { sendDeveloperApplicationEmails } = require('../utils/email');
const logger = require('../utils/logger').default || require('../utils/logger');

const developerApplicationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid developer contact email'),
  company: z.string().max(100).optional().or(z.literal('')),
  website: z.string().max(255).optional().or(z.literal('')),
  projectName: z.string().min(2, 'Project name is required').max(100),
  projectType: z.enum([
    'web',
    'mobile',
    'radio',
    'analytics',
    'events',
    'research',
    'bot',
    'other',
  ]),
  expectedVolume: z.enum([
    'under_10k',
    '10k_100k',
    '100k_1m',
    'over_1m',
  ]),
  useCase: z.string().min(20, 'Please provide a detailed description (at least 20 characters) explaining your use case and integration plan').max(2000),
  agreedToTerms: z.boolean().refine((val: boolean) => val === true, {
    message: 'You must agree to the Developer Terms of Service and API Usage Policy',
  }),
});

// POST /api/developers/apply — Submit Developer API access request
router.post('/apply', softAuthMiddleware, async (req: any, res: any) => {
  try {
    const parsed = developerApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid application data',
        details: parsed.error.flatten(),
      });
    }

    const {
      name,
      email,
      company,
      website,
      projectName,
      projectType,
      expectedVolume,
      useCase,
    } = parsed.data;

    const referenceId = `DS-DEV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const applicantUserId = req.user?.id || null;

    // Log the application in database audit logs or system records
    try {
      if (applicantUserId) {
        await prisma.auditLog.create({
          data: {
            actorId: applicantUserId,
            action: 'DEVELOPER_API_APPLIED',
            entity: 'DeveloperApplication',
            entityId: referenceId,
            details: {
              referenceId,
              name,
              email,
              company,
              projectName,
              projectType,
              expectedVolume,
              website,
              useCase,
            },
          },
        });
      }

      // Notify super admins about new developer API application
      const admins = await prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
        select: { id: true },
        take: 5,
      });

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'SYSTEM',
            title: 'New Developer API Application',
            body: `${name} (${projectName}) requested API access. Ref: ${referenceId}`,
            actionUrl: '/admin',
            metadata: { referenceId, email, projectName, projectType, expectedVolume },
          },
        }).catch(() => {});
      }
    } catch (dbErr) {
      logger.warn('Failed to record developer application in DB notifications/audit', { dbErr });
    }

    // Send emails in background
    sendDeveloperApplicationEmails({
      referenceId,
      name,
      email,
      company: company || undefined,
      projectName,
      projectType,
      expectedVolume,
      website: website || undefined,
      useCase,
    }).catch((emailErr: any) => {
      logger.warn('Error sending developer application emails', { emailErr });
    });

    logger.info('Developer API Application received', {
      referenceId,
      email,
      projectName,
      projectType,
    });

    return res.status(201).json({
      success: true,
      referenceId,
      message: 'Developer API application received successfully! Our team will review your application and contact you within 24–48 business hours with your API credentials.',
    });
  } catch (error: any) {
    logger.error('Error submitting developer API application', { error });
    return res.status(500).json({
      success: false,
      error: 'Failed to submit developer API application. Please try again or contact contact@decksalone.com.',
    });
  }
});

// GET /api/developers/status — Check status of API platform and public API spec summary
router.get('/status', (req: any, res: any) => {
  res.json({
    success: true,
    platform: 'Deck Salone REST API v1',
    status: 'operational',
    version: '1.4.0',
    documentationUrl: 'https://decksalone.com/developers',
    rateLimits: {
      sandbox: '100 requests / minute',
      production: '1,000 requests / minute',
      partner: 'Custom unlimited quota',
    },
    supportedProtocols: ['REST / JSON', 'HTTPS TLS 1.3', 'Webhooks'],
  });
});

module.exports = router;
