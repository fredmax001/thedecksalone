import { prisma } from '../utils/prisma';
import logger from '../utils/logger';

/**
 * Smart Playlist generator & auto-curator.
 *
 * Self-curating rule-based playlists:
 * 1. Strict genre matching ensures no cross-genre leakage (e.g. Reggae never appears in Amapiano).
 * 2. Dynamically extracts the #1 DJ's avatar / artwork for playlist cover branding.
 * 3. Guarantees 7 clean, attractive curated playlists across Afrobeats, Amapiano,
 *    Dancehall & Reggae, Salone Heritage, Trending, Fresh Drops, and Party Bangers.
 */

export const DEFAULT_SMART_PLAYLISTS = [
  {
    slug: 'trending-mixes',
    title: 'Trending Mixes',
    description: 'The hottest DJ mixtapes dominating dancefloors and airwaves across Sierra Leone right now.',
    genres: [] as string[],
    moods: [] as string[],
    energies: [] as string[],
    sortBy: 'trending',
    trackLimit: 30,
    isFeatured: true,
    badge: 'TRENDING',
    accentColor: '#f4e059',
  },
  {
    slug: 'fresh-drops',
    title: 'Fresh Drops',
    description: 'Brand-new DJ mixtape releases straight from the decks. The latest weekly heat uploaded by top DJs.',
    genres: [] as string[],
    moods: [] as string[],
    energies: [] as string[],
    sortBy: 'newest',
    trackLimit: 30,
    isFeatured: true,
    badge: 'FRESH DROPS',
    accentColor: '#38bdf8',
  },
  {
    slug: 'amapiano-groove',
    title: 'Amapiano Groove',
    description: 'Deep log drums, 3-step rhythms, and soulful private school piano sets from top selectors.',
    genres: ['Amapiano', 'Afro-House / Deep House', '3-Step', 'House'],
    moods: [] as string[],
    energies: [] as string[],
    sortBy: 'trending',
    trackLimit: 30,
    isFeatured: true,
    badge: 'AMAPIANO',
    accentColor: '#a855f7',
  },
  {
    slug: 'afrobeats-wave',
    title: 'Afrobeats Wave',
    description: 'High-energy Afrobeats, Afro-fusion, and Afro-pop sets mixed by premier DJs.',
    genres: ['Afrobeats', 'Afro-Fusion', 'Afro-Pop', 'Highlife', 'Krio Fusion'],
    moods: [] as string[],
    energies: [] as string[],
    sortBy: 'trending',
    trackLimit: 30,
    isFeatured: true,
    badge: 'AFROBEATS',
    accentColor: '#f97316',
  },
  {
    slug: 'dancehall-reggae-vibez',
    title: 'Dancehall & Reggae Vibez',
    description: 'Heavy bashment anthems, dubplates, roots reggae, and island energy.',
    genres: ['Dancehall', 'Reggae', 'Soca / Calypso', 'Soca'],
    moods: [] as string[],
    energies: [] as string[],
    sortBy: 'trending',
    trackLimit: 30,
    isFeatured: false,
    badge: 'DANCEHALL & REGGAE',
    accentColor: '#22c55e',
  },
  {
    slug: 'salone-heat-heritage',
    title: 'Salone Heat & Heritage',
    description: 'Authentic Sierra Leonean cultural rhythms, Salone mixes, and golden throwbacks.',
    genres: ['Salone Mix', 'Palm Wine / Cultural', 'Old Skool / Throwbacks', 'Throwbacks', 'Salone'],
    moods: [] as string[],
    energies: [] as string[],
    sortBy: 'trending',
    trackLimit: 30,
    isFeatured: false,
    badge: 'SALONE HEAT',
    accentColor: '#eab308',
  },
  {
    slug: 'club-party-bangers',
    title: 'Club & Party Bangers',
    description: 'Peak-time energy, high-octane transitions, and weekend celebration heat.',
    genres: ['Club & Party Mixes', 'Club Mixes', 'Club', 'Party'],
    moods: ['party'],
    energies: ['high'],
    sortBy: 'trending',
    trackLimit: 30,
    isFeatured: false,
    badge: 'PARTY BANGERS',
    accentColor: '#ef4444',
  },
];

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
  dj: {
    select: {
      id: true,
      stageName: true,
      avatar: true,
      verified: true,
      city: true,
      subscriptionTier: true,
    },
  },
} as const;

function buildWhere(playlist: {
  slug?: string;
  genres?: string[];
  moods?: string[];
  energies?: string[];
}) {
  const where: any = { isPublic: true };

  // 1. Strict genre matching when genres are configured
  if (playlist.genres && playlist.genres.length > 0) {
    const genreConditions: any[] = [];
    for (const g of playlist.genres) {
      genreConditions.push({ genre: { equals: g, mode: 'insensitive' } });
      genreConditions.push({ genre: { contains: g, mode: 'insensitive' } });
    }
    where.OR = genreConditions;
    return where;
  }

  // 2. Pure mood/energy playlists (e.g. Club & Party Bangers with no genre constraint)
  const conditions: any[] = [];
  if (playlist.moods && playlist.moods.length > 0) {
    conditions.push({ mood: { in: playlist.moods } });
  }
  if (playlist.energies && playlist.energies.length > 0) {
    conditions.push({ energy: { in: playlist.energies } });
  }

  if (conditions.length === 1) {
    Object.assign(where, conditions[0]);
  } else if (conditions.length > 1) {
    where.AND = conditions;
  }

  return where;
}

function buildOrderBy(sortBy?: string) {
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
        { likes: 'desc' as const },
        { createdAt: 'desc' as const },
      ];
  }
}

function getBadgeAndAccentForPlaylist(slug?: string, title?: string) {
  const matched = DEFAULT_SMART_PLAYLISTS.find(
    (p) => p.slug === slug || p.title.toLowerCase() === title?.toLowerCase()
  );
  if (matched) {
    return { badge: matched.badge, accentColor: matched.accentColor };
  }
  return {
    badge: (title || 'CURATED').toUpperCase(),
    accentColor: '#f4e059',
  };
}

/**
 * Ensure the default set of automated smart playlists exists in the database
 * and cleanly remove obsolete / duplicate legacy manual official playlists.
 */
export async function ensureDefaultSmartPlaylists() {
  try {
    // 1. Remove obsolete or empty legacy playlist entries like 'new-rising-djs' from smart_playlists
    await prisma.smartPlaylist.deleteMany({
      where: {
        OR: [
          { slug: { contains: 'new-rising' } },
          { title: { contains: 'New Rising' } },
          { title: { contains: 'New & Rising' } },
        ],
      },
    }).catch(() => {});

    // 2. Remove obsolete / duplicate manual official playlists from official_playlists
    await prisma.officialPlaylist.deleteMany({
      where: {
        OR: [
          { slug: { contains: 'new-rising' } },
          { title: { contains: 'New Rising' } },
          { title: { contains: 'New & Rising' } },
          { slug: { contains: 'trending-mixes' } },
          { title: 'Trending Mixes' },
        ],
      },
    }).catch(() => {});

    // 3. Ensure each standard smart playlist exists and is active
    for (const def of DEFAULT_SMART_PLAYLISTS) {
      const existing = await prisma.smartPlaylist.findFirst({
        where: {
          OR: [{ slug: def.slug }, { title: def.title }],
        },
      });

      if (!existing) {
        await prisma.smartPlaylist.create({
          data: {
            slug: def.slug,
            title: def.title,
            description: def.description,
            genres: def.genres,
            moods: def.moods,
            energies: def.energies,
            sortBy: def.sortBy,
            trackLimit: def.trackLimit,
            isFeatured: def.isFeatured,
            isPublished: true,
          },
        });
        logger.info(`Auto-created smart playlist: ${def.title} (${def.slug})`);
      } else {
        // Keep config and genre arrays in sync
        await prisma.smartPlaylist.update({
          where: { id: existing.id },
          data: {
            slug: def.slug,
            title: def.title,
            description: def.description,
            genres: def.genres,
            moods: def.moods,
            energies: def.energies,
            sortBy: def.sortBy,
            trackLimit: def.trackLimit,
            isFeatured: def.isFeatured,
            isPublished: true,
          },
        });
      }
    }
  } catch (error: any) {
    logger.error('Error ensuring default smart playlists:', error.message);
  }
}

/**
 * Resolve the mixes that match a smart playlist's rules.
 * Strictly queries the matching genre/rules with NO cross-genre leakage.
 */
export async function generateSmartPlaylistItems(
  playlist: {
    slug?: string;
    title?: string;
    coverImage?: string | null;
    genres?: string[];
    moods?: string[];
    energies?: string[];
    sortBy?: string;
    trackLimit?: number;
  },
  { preview = false }: { preview?: boolean } = {},
) {
  const where = buildWhere(playlist);
  const orderBy = buildOrderBy(playlist.sortBy);
  const take = preview ? 5 : Math.min(Math.max(playlist.trackLimit || 30, 1), 100);

  const [items, total] = await Promise.all([
    prisma.mix.findMany({ where, orderBy, take, select: MIX_LIST_SELECT }),
    prisma.mix.count({ where }),
  ]);

  // Extract top DJ and dynamic cover artwork metadata
  const topMix = items[0] || null;
  const topDj = topMix?.dj || null;
  const topDjAvatar = topDj?.avatar || null;
  const topDjName = topDj?.stageName || null;
  const topMixCover = topMix?.coverImage || null;

  // Prioritize DJ avatar (as requested by user) or mix cover image
  const dynamicCover =
    playlist.coverImage ||
    topDjAvatar ||
    topMixCover ||
    '/images/genres/salone-mix.jpg';

  const { badge, accentColor } = getBadgeAndAccentForPlaylist(
    playlist.slug,
    playlist.title
  );

  return {
    items,
    total,
    topDj,
    topMix,
    topDjAvatar,
    topDjName,
    dynamicCover,
    badge,
    accentColor,
  };
}

