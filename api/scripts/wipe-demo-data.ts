require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '.env' });

const { prisma } = require('../utils/prisma');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@soundit.sl';

async function wipe() {
  console.log(`[Wipe] Keeping admin: ${ADMIN_EMAIL}`);
  console.log('[Wipe] Deleting all demo data...');

  // Delete dependent/child records first, then parent records
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.battleVote.deleteMany(),
    prisma.battleEntry.deleteMany(),
    prisma.battle.deleteMany(),
    prisma.adCampaign.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.review.deleteMany(),
    prisma.message.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.mixLike.deleteMany(),
    prisma.mix.deleteMany(),
    prisma.event.deleteMany(),
    prisma.djPhoto.deleteMany(),
    prisma.oppApplications.deleteMany(),
    prisma.opportunity.deleteMany(),
    prisma.gigApplication.deleteMany(),
    prisma.gig.deleteMany(),
    prisma.proSubscriptionRequest.deleteMany(),
    prisma.rankingHistory.deleteMany(),
    prisma.djProfile.deleteMany(),
    // Keep only the admin user
    prisma.user.deleteMany({ where: { email: { not: ADMIN_EMAIL } } }),
  ]);

  console.log('[Wipe] Done. Only the admin account remains.');
  await prisma.$disconnect();
}

wipe().catch((err) => {
  console.error('[Wipe] Failed:', err);
  process.exit(1);
});
