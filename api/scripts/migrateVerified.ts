require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '.env' });
const { prisma } = require('../utils/prisma');

(async () => {
  const updated = await prisma.djProfile.updateMany({
    where: { verified: true, verificationStatus: 'unverified' },
    data: { verificationStatus: 'approved', isPublic: true },
  });
  console.log('Migrated verified DJs:', updated.count);
  await prisma.$disconnect();
})();
