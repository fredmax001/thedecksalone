const { prisma } = require('./utils/prisma');
(async () => {
  console.log('Starting...');
  try {
    const userId = 'cmr7y3swp0000kx30iu32ir0d';
    const djId = 'cmqu0a0xm000ah04p49283w89';
    const result = await prisma.follow.upsert({
      where: { userId_djId: { userId, djId } },
      create: { userId, djId },
      update: {},
    });
    console.log('Upsert result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
  const follows = await prisma.follow.findMany({ where: { userId: 'cmr7y3swp0000kx30iu32ir0d' } });
  console.log('Follows after:', JSON.stringify(follows, null, 2));
  await prisma.$disconnect();
  console.log('Done');
})();
