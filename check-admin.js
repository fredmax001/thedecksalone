require('dotenv').config({ path: './api/.env' });
const { PrismaClient } = require('./node_modules/.prisma/client/index.js');
const bcrypt = require('./node_modules/bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@soundit.sl' } });
  if (!user) {
    console.log('USER NOT FOUND');
    const all = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    console.log('All ADMIN users:', all.map(u => ({ id: u.id, email: u.email, hasPassword: !!u.password, role: u.role })));
  } else {
    console.log('Found user:', { id: user.id, email: user.email, hasPassword: !!u.password, role: user.role });
    const valid = await bcrypt.compare('admin123', user.password || '');
    console.log('Password valid:', valid);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
