import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';

interface GenreTheme {
  gradient: string;
  subtitle: string;
  accentColor: string;
}

const GENRE_THEMES: Record<string, GenreTheme> = {
  'salone-mix': {
    gradient: 'from-emerald-700 via-teal-950 to-blue-700',
    subtitle: 'Sierra Leone Vibes',
    accentColor: '#10b981',
  },
  afrobeats: {
    gradient: 'from-amber-600 via-orange-950 to-yellow-600',
    subtitle: 'West African Heat',
    accentColor: '#f97316',
  },
  amapiano: {
    gradient: 'from-purple-900 via-indigo-950 to-teal-700',
    subtitle: 'SA Piano House',
    accentColor: '#a855f7',
  },
  reggae: {
    gradient: 'from-emerald-800 via-red-950 to-amber-600',
    subtitle: 'Roots & Culture',
    accentColor: '#eab308',
  },
  dancehall: {
    gradient: 'from-yellow-600 via-amber-950 to-red-600',
    subtitle: 'Jamaican Bashment',
    accentColor: '#eab308',
  },
  'palm-wine-cultural': {
    gradient: 'from-amber-800 via-stone-950 to-emerald-800',
    subtitle: 'Traditional Heritage',
    accentColor: '#d97706',
  },
  'hip-hop-rap': {
    gradient: 'from-slate-800 via-zinc-950 to-amber-600',
    subtitle: 'Bars & Heavy Beats',
    accentColor: '#f59e0b',
  },
  'r-b-soul': {
    gradient: 'from-rose-900 via-purple-950 to-indigo-900',
    subtitle: 'Smooth & Soulful',
    accentColor: '#ec4899',
  },
  'gospel-praise': {
    gradient: 'from-blue-700 via-indigo-950 to-amber-500',
    subtitle: 'Praise & Worship',
    accentColor: '#3b82f6',
  },
  'highlife-coupe-decale': {
    gradient: 'from-amber-700 via-yellow-950 to-orange-700',
    subtitle: 'African Rhythms',
    accentColor: '#f59e0b',
  },
  'soukous-makossa': {
    gradient: 'from-teal-800 via-emerald-950 to-yellow-600',
    subtitle: 'Central African Groove',
    accentColor: '#14b8a6',
  },
  'soca-calypso': {
    gradient: 'from-rose-800 via-orange-950 to-yellow-500',
    subtitle: 'Carnival Rhythms',
    accentColor: '#f43f5e',
  },
  'club-party-mixes': {
    gradient: 'from-fuchsia-900 via-purple-950 to-cyan-600',
    subtitle: 'Floor Fillers',
    accentColor: '#d946ef',
  },
  'wedding-event-essentials': {
    gradient: 'from-amber-600 via-yellow-950 to-gold',
    subtitle: 'Celebration Hits',
    accentColor: '#d4a24a',
  },
  'old-skool-throwbacks': {
    gradient: 'from-pink-900 via-rose-950 to-amber-600',
    subtitle: 'Classic Nostalgia',
    accentColor: '#f43f5e',
  },
  'house-electronic-edm': {
    gradient: 'from-blue-900 via-indigo-950 to-cyan-500',
    subtitle: 'Electronic Waves',
    accentColor: '#06b6d4',
  },
  'afro-house-deep-house': {
    gradient: 'from-purple-950 via-slate-950 to-emerald-800',
    subtitle: 'Deep Tribal Groove',
    accentColor: '#8b5cf6',
  },
  'trap-drill': {
    gradient: 'from-zinc-900 via-stone-950 to-red-900',
    subtitle: 'Heavy Bass & 808s',
    accentColor: '#ef4444',
  },
  'afro-fusion-afro-pop': {
    gradient: 'from-orange-800 via-amber-950 to-rose-700',
    subtitle: 'Modern Afro Sound',
    accentColor: '#f97316',
  },
  default: {
    gradient: 'from-amber-900 via-black to-yellow-900',
    subtitle: 'Featured Mixes',
    accentColor: '#d4af37',
  },
};

export function getGenreTheme(genreName: string): GenreTheme {
  const slug = genreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return GENRE_THEMES[slug] || GENRE_THEMES[slug.replace(/-mix$/, '')] || {
    gradient: 'from-amber-950 via-zinc-950 to-yellow-900',
    subtitle: `${genreName} Selection`,
    accentColor: '#d4af37',
  };
}

export default function GenreCategoryCard({
  category,
}: {
  category: { id?: string; name: string; count?: number };
}) {
  const theme = getGenreTheme(category.name);
  const targetGenre = category.name;

  return (
    <Link to={`/mixes?genre=${encodeURIComponent(targetGenre)}`} className="group block">
      <div className="overflow-hidden rounded-2xl bg-black-surface border border-dark-gray hover:border-gold/60 transition-all duration-300 shadow-xl hover:-translate-y-1">
        {/* Cover Aspect Square */}
        <div className={`aspect-square relative p-3 sm:p-5 flex flex-col justify-between bg-gradient-to-br ${theme.gradient} overflow-hidden`}>
          {/* Subtle noise/glow overlays */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full bg-black/60 blur-xl pointer-events-none" />

          {/* Top Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center text-gold shadow-lg">
              <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
          </div>

          {/* Center Title - Responsive Mobile Sizing */}
          <div className="relative z-10 text-center my-auto px-1">
            <h3 className="font-extrabold sm:font-black text-base sm:text-2xl uppercase tracking-tight sm:tracking-wider text-white drop-shadow-[0_4px_16px_rgba(0,0,0,1)] leading-tight break-words">
              {category.name}
            </h3>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gold drop-shadow-[0_2px_8px_rgba(0,0,0,1)] mt-1 opacity-90">
              {theme.subtitle}
            </p>
          </div>
        </div>

        {/* Bottom Footer Info */}
        <div className="p-2 sm:p-3.5 bg-black-surface flex items-center justify-between gap-1 border-t border-dark-gray/60">
          <span className="text-[10px] sm:text-xs font-bold uppercase text-text-primary group-hover:text-gold transition-colors truncate min-w-0">
            {category.name}
          </span>
          <span className="text-[9px] sm:text-xs font-semibold text-gold bg-gold/10 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-gold/30 shrink-0">
            {category.count || 0} mixes
          </span>
        </div>
      </div>
    </Link>
  );
}
