import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from the api root or project root so DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const prisma = new PrismaClient();

async function main() {
  const mixes = await prisma.mix.findMany({
    where: {
      OR: [{ coverImage: null }, { coverImage: '' }],
    },
    select: {
      id: true,
      title: true,
      dj: {
        select: {
          avatar: true,
          user: {
            select: { avatar: true },
          },
        },
      },
    },
  });

  console.log(`Found ${mixes.length} mix(es) without cover art.`);

  let updated = 0;
  let skipped = 0;

  for (const mix of mixes) {
    const coverImage = mix.dj?.avatar || mix.dj?.user?.avatar || null;
    if (!coverImage) {
      skipped++;
      console.log(`Skipping mix ${mix.id} — no artist avatar available`);
      continue;
    }

    await prisma.mix.update({
      where: { id: mix.id },
      data: { coverImage },
    });
    updated++;
    console.log(`Updated mix ${mix.id} (${mix.title}) with artist avatar`);
  }

  console.log(`Backfill complete. Updated ${updated} mix(es), skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
