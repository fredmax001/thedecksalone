import { prisma } from '../utils/prisma';

/**
 * Smart Playlist generator.
 *
 * Rule-based playlists: moderators configure genre/mood/energy filters and a
 * sort order; the matching public mixes are resolved dynamically at read time
 * (nothing is persisted per-track).
 *
 * Mood values: relaxed | party | romantic | uplifting | soulful | intense | nostalgic
 * Energy values: low | medium | high
 */

const MIX_LIST_SELECT = {
  id: true,
  title: true,
  coverImage: true,
  audioUrl: true,
  duration: true,
  genre: true,
  category: true,
  tags: true,
  mood: true,
  energy: true,
  plays: true,
  likes: true,
  discoveryScore: true,
  createdAt: true,
  dj: { select: { id: true, stageName: true, avatar: true, verified: true } },
} as const;

function buildWhere(playlist: {
  genres: string[];
  moods: string[];
  energies: string[];
}) {
  const where: any = { isPublic: true };
  if (playlist.genres?.length) where.genre = { in: playlist.genres };
  if (playlist.moods?.length) where.mood = { in: playlist.moods };
  if (playlist.energies?.length) where.energy = { in: playlist.energies };
  return where;
}

function buildOrderBy(sortBy: string) {
  switch (sortBy) {
    case 'newest':
      return [{ createdAt: 'desc' as const }, { plays: 'desc' as const }];
    case 'most_liked':
      return [{ likes: 'desc' as const }, { plays: 'desc' as const }];
    case 'trending':
    default:
      return [
        { plays: 'desc' as const },
        { discoveryScore: 'desc' as const },
        { createdAt: 'desc' as const },
      ];
  }
}

/**
 * Resolve the mixes that match a smart playlist's rules.
 * @param preview  when true, ignores isPublished and returns total count info
 */
export async function generateSmartPlaylistItems(
  playlist: { genres: string[]; moods: string[]; energies: string[]; sortBy: string; trackLimit: number },
  { preview = false }: { preview?: boolean } = {},
) {
  const where = buildWhere(playlist);
  const orderBy = buildOrderBy(playlist.sortBy);
  const take = preview ? 5 : Math.min(Math.max(playlist.trackLimit || 20, 1), 100);

  const [items, total] = await Promise.all([
    prisma.mix.findMany({ where, orderBy, take, select: MIX_LIST_SELECT }),
    prisma.mix.count({ where }),
  ]);

  return { items, total };
}
