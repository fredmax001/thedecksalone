require('dotenv').config({ path: './.env' });
const { PrismaClient } = require('./node_modules/.prisma/client/index.js');
const bcrypt = require('./node_modules/bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || 'admin@soundit.sl';
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD or SEED_ADMIN_PASSWORD must be set');
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!user) {
    console.log('USER NOT FOUND');
    const all = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    console.log('All ADMIN users:', all.map(u => ({ id: u.id, email: u.email, hasPassword: !!u.password, role: u.role })));
  } else {
    console.log('Found user:', { id: user.id, email: user.email, hasPassword: !!u.password, role: user.role });
    const valid = await bcrypt.compare(adminPassword, user.password || '');
    console.log('Password valid:', valid);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
