import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting total wipe of demo data...');

  try {
    // 1. Deepest dependencies first
    console.log('Deleting votes and likes...');
    await prisma.battleVote.deleteMany();
    await prisma.mixLike.deleteMany();
    await prisma.follow.deleteMany();
    
    console.log('Deleting applications and entries...');
    await prisma.battleEntry.deleteMany();
    await prisma.gigApplication.deleteMany();
    await prisma.oppApplications.deleteMany();
    
    console.log('Deleting interactions and history...');
    await prisma.message.deleteMany();
    await prisma.review.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.rankingHistory.deleteMany();
    await prisma.proSubscriptionRequest.deleteMany();

    // 2. Core entities
    console.log('Deleting core entities...');
    await prisma.battle.deleteMany();
    await prisma.mix.deleteMany();
    await prisma.event.deleteMany();
    await prisma.adCampaign.deleteMany();
    await prisma.gig.deleteMany();
    await prisma.opportunity.deleteMany();
    
    console.log('Deleting DJ attributes...');
    await prisma.djPhoto.deleteMany();
    await prisma.streamingPlatform.deleteMany();
    await prisma.djProfile.deleteMany();

    // 3. Finally, users except admin
    console.log('Deleting all users except admin...');
    const result = await prisma.user.deleteMany({
      where: {
        email: {
          not: 'admin@soundit.sl'
        }
      }
    });

    console.log(`Successfully deleted ${result.count} users.`);
    console.log('Wipe complete. Fresh database ready.');
  } catch (error) {
    console.error('Error wiping data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
