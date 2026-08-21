require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPassword() {
  const password = process.env.RESET_PASSWORD;
  if (!password) {
    console.error('Error: RESET_PASSWORD environment variable is required');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { id: 'cmr8qx8zn0000o3b3vr1271js' }
  });
  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  console.log('User:', user.email, user.username, user.role);

  const newPassword = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: newPassword }
  });
  console.log('Password reset successfully');
  await prisma.$disconnect();
}

resetPassword();
