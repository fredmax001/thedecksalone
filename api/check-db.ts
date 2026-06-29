require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '.env' });
const { prisma } = require('./utils/prisma');
const bcrypt = require('bcryptjs');

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@soundit.sl' } });
  if (!user) {
    console.log('USER NOT FOUND');
    const all = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    console.log('All ADMIN users:', all.map((u: any) => ({ id: u.id, email: u.email, hasPassword: !!u.password, role: u.role })));
  } else {
    console.log('Found user:', { id: user.id, email: user.email, hasPassword: !!user.password, role: user.role });
    const valid = await bcrypt.compare('admin123', user.password || '');
    console.log('Password valid:', valid);
  }
  await prisma.$disconnect();
}

main().catch((e: any) => { console.error(e); process.exit(1); });
