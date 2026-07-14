import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx ts-node scripts/delete-user-by-email.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`No user found with email ${email}`);
    return;
  }

  console.log(`Deleting user: ${user.email} (${user.username})`);

  await prisma.battleVote.deleteMany({ where: { userId: user.id } });
  await prisma.mixLike.deleteMany({ where: { userId: user.id } });
  await prisma.follow.deleteMany({ where: { userId: user.id } });
  await prisma.message.deleteMany({ where: { senderId: user.id } });
  await prisma.message.deleteMany({ where: { receiverId: user.id } });
  await prisma.review.deleteMany({ where: { userId: user.id } });
  await prisma.booking.deleteMany({ where: { clientId: user.id } });
  await prisma.booking.deleteMany({ where: { djId: user.id } });
  await prisma.payment.deleteMany({ where: { clientId: user.id } });
  await prisma.payment.deleteMany({ where: { djId: user.id } });
  await prisma.auditLog.deleteMany({ where: { actorId: user.id } });
  await prisma.auditLog.deleteMany({ where: { targetId: user.id } });

  const djProfile = await prisma.djProfile.findUnique({ where: { userId: user.id } });
  if (djProfile) {
    await prisma.mix.deleteMany({ where: { djId: djProfile.id } });
    await prisma.event.deleteMany({ where: { djId: djProfile.id } });
    await prisma.battleEntry.deleteMany({ where: { djId: djProfile.id } });
    await prisma.djPhoto.deleteMany({ where: { djId: djProfile.id } });
    await prisma.djProfile.delete({ where: { id: djProfile.id } });
  }

  await prisma.user.delete({ where: { id: user.id } });
  console.log(`Deleted ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
