require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '.env' });
const { prisma } = require('./utils/prisma');

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@soundit.sl' } });
  if (!user) {
    console.log('USER NOT FOUND');
    const all = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    console.log('All ADMIN users count:', all.length);
  } else {
    console.log('Found user:', { id: user.id, email: user.email, hasPassword: !!user.password, role: user.role });
  }
  await prisma.$disconnect();
}

main().catch((e: any) => { console.error(e); process.exit(1); });
