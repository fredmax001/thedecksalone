import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();
const { generateSmartPlaylistItems } = require('../services/smartPlaylist.service');

async function main() {
  // Create a scratch DJ + mixes with varied mood/energy/genre
  const user = await prisma.user.create({
    data: {
      email: `smart-test-${Date.now()}@test.local`,
      username: `smarttest${Date.now()}`,
      password: 'test-hash',
      role: 'DJ',
    },
  });
  const dj = await prisma.djProfile.create({
    data: { user: { connect: { id: user.id } }, stageName: 'SmartTest DJ', fullName: 'Smart Test', isPublic: true },
  });

  const mk = (title: string, genre: string, mood: string, energy: string, plays: number) =>
    prisma.mix.create({
      data: {
        djId: dj.id,
        title,
        genre,
        category: genre,
        mood,
        energy,
        plays,
        isPublic: true,
      },
    });

  const [m1, m2, m3, m4] = await Promise.all([
    mk('Test Afro Party 1', 'Afrobeats', 'party', 'high', 500),
    mk('Test Afro Party 2', 'Afrobeats', 'party', 'high', 300),
    mk('Test Chill Reggae', 'Reggae', 'relaxed', 'low', 900),
    mk('Test Untagged', 'Reggae', null as any, null as any, 1000),
  ]);

  try {
    // Rule: party + high energy, any genre → expect 2 mixes, ordered by plays desc
    const r1 = await generateSmartPlaylistItems({ genres: [], moods: ['party'], energies: ['high'], sortBy: 'trending', trackLimit: 20 });
    console.log('party+high:', r1.total, r1.items.map((i: any) => i.title));

    // Rule: Reggae genre only → expect 2 (chill + untagged reggae)
    const r2 = await generateSmartPlaylistItems({ genres: ['Reggae'], moods: [], energies: [], sortBy: 'trending', trackLimit: 20 });
    console.log('reggae:', r2.total, r2.items.map((i: any) => i.title));

    // Rule: relaxed + low + limit 1
    const r3 = await generateSmartPlaylistItems({ genres: [], moods: ['relaxed'], energies: ['low'], sortBy: 'newest', trackLimit: 1 });
    console.log('relaxed+low limit1:', r3.total, r3.items.map((i: any) => i.title));

    // Empty rules → all public mixes
    const r4 = await generateSmartPlaylistItems({ genres: [], moods: [], energies: [], sortBy: 'trending', trackLimit: 100 });
    console.log('all:', r4.total);

    const ok = r1.total === 2 && r2.total === 2 && r3.total === 1 && r4.total >= 4;
    console.log(ok ? '✅ GENERATOR OK' : '❌ GENERATOR FAILED');
  } finally {
    await prisma.mix.deleteMany({ where: { djId: dj.id } });
    await prisma.djProfile.delete({ where: { id: dj.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('cleaned up');
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
