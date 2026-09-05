import { prisma } from '../utils/prisma';
import { generateUniqueMixSlug } from '../utils/slug';

export async function backfillMixSlugs() {
  console.log('[Backfill] Checking for mixes without slugs...');
  const mixesWithoutSlug = await prisma.mix.findMany({
    where: {
      OR: [
        { slug: null },
        { slug: '' },
      ],
    },
    select: {
      id: true,
      djId: true,
      title: true,
      originalUrl: true,
    },
  });

  console.log(`[Backfill] Found ${mixesWithoutSlug.length} mixes needing slugs.`);

  for (const mix of mixesWithoutSlug) {
    let slug = '';
    // If imported from hearthis, try extracting original slug from URL
    if (mix.originalUrl && mix.originalUrl.includes('hearthis.at/')) {
      const match = mix.originalUrl.match(/hearthis\.at\/[^/]+\/([^/]+)/);
      if (match && match[1]) {
        slug = decodeURIComponent(match[1]).toLowerCase().replace(/[^\w-]/g, '-');
      }
    }

    if (!slug) {
      slug = await generateUniqueMixSlug(prisma, mix.djId, mix.title, mix.id);
    }

    await prisma.mix.update({
      where: { id: mix.id },
      data: { slug },
    });
    console.log(`[Backfill] Mix "${mix.title}" (${mix.id}) -> slug: "${slug}"`);
  }

  console.log('[Backfill] Mix slugs backfill completed successfully.');
}

if (require.main === module) {
  backfillMixSlugs()
    .catch((err) => {
      console.error('[Backfill Error]:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
