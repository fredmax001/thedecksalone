require('dotenv').config({ path: '../.env' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function wipeAllExceptAdmin() {
  try {
    console.log('Finding admin user...');
    const admin = await prisma.user.findFirst({
      where: { email: 'admin@soundit.sl' }
    });

    if (!admin) {
      console.error('Admin user not found!');
      process.exit(1);
    }

    console.log('Admin found:', admin.id);

    // Delete in order to respect foreign keys (children first)
    console.log('Deleting battle votes...');
    await prisma.battleVote.deleteMany({});

    console.log('Deleting battle entries...');
    await prisma.battleEntry.deleteMany({});

    console.log('Deleting battles...');
    await prisma.battle.deleteMany({});

    console.log('Deleting ranking history...');
    await prisma.rankingHistory.deleteMany({});

    console.log('Deleting reviews...');
    await prisma.review.deleteMany({});

    console.log('Deleting bookings...');
    await prisma.booking.deleteMany({});

    console.log('Deleting events...');
    await prisma.event.deleteMany({});

    console.log('Deleting mixes...');
    await prisma.mix.deleteMany({});

    console.log('Deleting streaming platforms...');
    await prisma.streamingPlatform.deleteMany({});

    console.log('Deleting follows...');
    await prisma.follow.deleteMany({});

    console.log('Deleting DJ profiles...');
    await prisma.djProfile.deleteMany({});

    console.log('Deleting non-admin users...');
    const deletedUsers = await prisma.user.deleteMany({
      where: { id: { not: admin.id } }
    });
    console.log(`Deleted ${deletedUsers.count} non-admin users`);

    console.log('Deleting payments...');
    await prisma.payment.deleteMany({});

    // Reset admin user profile data
    console.log('Resetting admin user...');
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        avatar: null,
        bio: null,
        phone: null,
        location: null,
        socialLinks: null,
        name: null,
        favoriteGenres: [],
        lastLoginAt: null,
      }
    });
    console.log('Resetting admin user...');
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        avatar: null,
        bio: null,
        phone: null,
        location: null,
        socialLinks: null,
      }
    });

    console.log('');
    console.log('✅ WIPE COMPLETE');
    console.log('Only admin user remains:', admin.email);
    console.log('Platform is clean and ready for real users.');

  } catch (error) {
    console.error('Wipe failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

wipeAllExceptAdmin();
