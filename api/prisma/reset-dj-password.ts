require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPassword() {
  const user = await prisma.user.findUnique({
    where: { id: 'cmr8qx8zn0000o3b3vr1271js' }
  });
  console.log('User:', user.email, user.username, user.role);
  
  const newPassword = await bcrypt.hash('fredmax123', 10);
  await prisma.user.update({
    where: { id: 'cmr8qx8zn0000o3b3vr1271js' },
    data: { password: newPassword }
  });
  console.log('Password reset to: fredmax123');
  await prisma.$disconnect();
}

resetPassword();
