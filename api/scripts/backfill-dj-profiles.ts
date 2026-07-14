import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from the api root so DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

const prisma = new PrismaClient();

async function main() {
  const djUsers = await prisma.user.findMany({
    where: { role: 'DJ' },
    select: { id: true, email: true, username: true, name: true },
  });

  let created = 0;
  for (const user of djUsers) {
    const existing = await prisma.djProfile.findUnique({
      where: { userId: user.id },
    });
    if (!existing) {
      await prisma.djProfile.create({
        data: {
          userId: user.id,
          stageName: user.username || user.email.split('@')[0],
          fullName: user.name || user.username || '',
          isPublic: true,
        },
      });
      created++;
      console.log(`Created DJ profile for ${user.email}`);
    }
  }

  console.log(`Backfill complete. Created ${created} missing DJ profile(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
