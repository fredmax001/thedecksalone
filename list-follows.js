require('./api/dist/utils/prisma');
const { prisma } = require('./api/dist/utils/prisma');
(async () => {
  const all = await prisma.follow.findMany({ take: 10 });
  console.log('Total follows:', all.length);
  console.log(JSON.stringify(all, null, 2));
  await prisma.$disconnect();
})();
