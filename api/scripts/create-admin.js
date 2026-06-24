require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '.env' });
const bcrypt = require('bcryptjs');
const { prisma } = require('../utils/prisma');

async function main() {
  const email = process.argv[2] || 'admin@deck.salone';
  const password = process.argv[3] || 'AdminPass123!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'ADMIN' },
    });
    console.log('Existing user promoted to ADMIN:', existing.id);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: 'ADMIN',
    },
    select: { id: true, email: true, role: true },
  });
  console.log('Admin created:', user);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
