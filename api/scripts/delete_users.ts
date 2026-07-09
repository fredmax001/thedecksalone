import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KEEP_EMAILS = [
  'admin@soundit.sl',
  'djfredmax221@outlook.com',
  'maxrick221@gmail.com'
];

async function main() {
  console.log('Starting user cleanup...');
  
  // Find users to delete
  const usersToDelete = await prisma.user.findMany({
    where: {
      email: {
        notIn: KEEP_EMAILS
      }
    },
    select: { id: true, email: true, username: true }
  });

  console.log(`Found ${usersToDelete.length} users to delete.`);

  // Prisma does not automatically cascade deletes unless configured in the schema.
  // We'll delete related records manually if needed, or rely on Prisma's cascade if it's there.
  // Wait, the schema has relations like battleVotes, etc.
  for (const user of usersToDelete) {
    console.log(`Deleting user: ${user.email} (${user.username})`);
    
    // We can just use delete, if it fails due to foreign keys, we delete those first.
    try {
      // In Prisma, we must delete relations first if not cascading.
      await prisma.battleVote.deleteMany({ where: { userId: user.id } });
      await prisma.mixLike.deleteMany({ where: { userId: user.id } });
      await prisma.follow.deleteMany({ where: { userId: user.id } });
      // Following isn't a thing, it's just user follows dj
      await prisma.message.deleteMany({ where: { senderId: user.id } });
      await prisma.message.deleteMany({ where: { receiverId: user.id } });
      await prisma.review.deleteMany({ where: { userId: user.id } });
      await prisma.booking.deleteMany({ where: { clientId: user.id } });
      await prisma.booking.deleteMany({ where: { djId: user.id } });
      await prisma.payment.deleteMany({ where: { clientId: user.id } });
      await prisma.payment.deleteMany({ where: { djId: user.id } });
      await prisma.auditLog.deleteMany({ where: { actorId: user.id } });
      
      const djProfile = await prisma.djProfile.findUnique({ where: { userId: user.id } });
      if (djProfile) {
        await prisma.mix.deleteMany({ where: { djId: djProfile.id } });
        await prisma.event.deleteMany({ where: { djId: djProfile.id } });
        await prisma.battleEntry.deleteMany({ where: { djId: djProfile.id } });
        await prisma.djPhoto.deleteMany({ where: { djId: djProfile.id } });
        await prisma.djProfile.delete({ where: { id: djProfile.id } });
      }

      await prisma.user.delete({ where: { id: user.id } });
      console.log(`Successfully deleted ${user.email}`);
    } catch (err: any) {
      console.error(`Failed to delete ${user.email}:`, err.message);
    }
  }

  console.log('Cleanup complete!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
