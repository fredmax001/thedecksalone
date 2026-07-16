import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Loader2,
  Radio,
  MapPin,
} from 'lucide-react';
import { useHomeData } from '@/hooks/useHomeData';
import { useTrendingMixes } from '@/hooks/useMixes';

export function VerifiedBadge({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="8" cy="8" r="8" fill="#22C55E" />
      <path
        d="M5 8L7 10L11 6"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const quickFilters = ['All', 'Afrobeats', 'Amapiano', 'Dancehall', 'Hip Hop', 'Gospel', 'Salone Mix'];

const genreImages: Record<string, string> = {
  'salone-mix': '/images/genres/salone-mix.jpg',
  afrobeats: '/images/genres/afrobeats.jpg',
  amapiano: '/images/genres/amapiano.jpg',
  dancehall: '/images/genres/dancehall.jpg',
  throwbacks: '/images/genres/throwbacks.jpg',
  'club-mixes': '/images/genres/club-mixes.jpg',
  'wedding-mixes': '/images/genres/wedding-mixes.jpg',
  gospel: '/images/genres/gospel.jpg',
};

function formatEventDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function PromoBanner({ featuredDJs, events }: { featuredDJs: any[]; events: any[] }) {
  const { data: trending = [] } = useTrendingMixes(1);
  const topMix = trending[0];
  const topDj = featuredDJs[0];
  const topEvent = events[0];

  const slides = [
    topMix && {
      key: 'mix',
      label: 'Top Mix',
      image: topMix.coverImage || '/mix-placeholder.jpg',
      title: topMix.title,
      subtitle: topMix.dj?.stageName ? `By ${topMix.dj.stageName}` : '',
      link: `/mix/${topMix.id}`,
      cta: 'Listen Now',
    },
    topDj && {
      key: 'dj',
      label: 'Top Ranking DJ',
      image: topDj.avatar || topDj.coverBanner || '/default-avatar.jpg',
      title: topDj.stageName,
      subtitle: topDj.city ? `${topDj.city}, Sierra Leone` : 'Sierra Leone',
      link: `/dj/${topDj.username || topDj.id}`,
      cta: 'View Profile',
    },
    topEvent && {
      key: 'event',
      label: 'Top Event',
      image: topEvent.image || '/cover-placeholder.jpg',
      title: topEvent.title,
      subtitle: `${formatEventDate(topEvent.date)} • ${topEvent.city || topEvent.location || 'Sierra Leone'}`,
      link: `/events/${topEvent.id}`,
      cta: 'View Event',
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    image: string;
    title: string;
    subtitle: string;
    link: string;
    cta: string;
  }>;

  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (slides.length ? (i + 1) % slides.length : 0));
  }, [slides.length]);

  const prev = () => {
    setIndex((i) => (slides.length ? (i - 1 + slides.length) % slides.length : 0));
  };

  useEffect(() => {
    if (!slides.length) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [slides.length, next]);

  if (!slides.length) {
    return (
      <section className="overflow-hidden border border-white/10 bg-black-elevated">
        <div className="grid min-h-[160px] grid-cols-1 md:grid-cols-[0.85fr_1.4fr]">
          <div className="relative hidden overflow-hidden md:block">
            <img src="/images/dj-promo/promo-1.jpg" alt="Deck Salone by Sound It DJs" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-black" />
          </div>
          <div className="flex items-center justify-between gap-6 px-6 py-8 sm:px-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gold">Deck Salone by Sound It</p>
              <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold uppercase tracking-tight text-text-primary sm:text-4xl">
                Sierra Leone&apos;s Premier DJ Network
              </h1>
              <p className="mt-2 text-sm text-text-secondary max-w-xl leading-relaxed">
                Discover the best local DJs, stream exclusive legendary mixes, and book top talent for your events. The ultimate platform to celebrate and preserve Sierra Leone's vibrant DJ culture.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const slide = slides[index];

  return (
    <section className="relative overflow-hidden border border-white/10 bg-black-elevated">
      <div className="grid min-h-[180px] grid-cols-1 md:grid-cols-[0.85fr_1.4fr]">
        <div className="relative hidden overflow-hidden md:block">
          <img
            key={slide.key + '-img'}
            src={slide.image}
            alt={slide.title}
            className="h-full w-full object-cover transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black" />
        </div>
        <div className="relative flex flex-col justify-center px-6 py-5 sm:px-10">
          <div className="mb-4 hidden sm:block">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gold">Deck Salone by Sound It</h2>
            <p className="mt-1 text-[11px] text-text-muted leading-relaxed max-w-sm">
              Discover local DJs, stream exclusive mixes, and book top talent for your events.
            </p>
          </div>
          <div key={slide.key + '-text'} className="transition-opacity duration-500">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold/80">{slide.label}</p>
            <h1 className="mt-1 max-w-2xl font-display text-2xl font-bold uppercase tracking-tight text-text-primary sm:text-3xl">
              {slide.title}
            </h1>
            <p className="mt-1.5 text-sm text-text-muted">{slide.subtitle}</p>
            <Link
              to={slide.link}
              className="mt-4 inline-flex shrink-0 rounded-full bg-gold px-5 py-2.5 text-sm font-bold uppercase text-black transition-transform hover:scale-[1.02]"
            >
              {slide.cta}
            </Link>
          </div>

          {slides.length > 1 && (
            <>
              <div className="absolute bottom-4 left-6 flex items-center gap-2 sm:left-10">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === index ? 'w-6 bg-gold' : 'w-2 bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
              <div className="absolute right-4 top-1/2 flex -translate-y-1/2 gap-1 md:right-6">
                <button
                  onClick={prev}
                  className="rounded-full border border-white/10 bg-black/40 p-2 text-text-primary backdrop-blur-sm transition-colors hover:border-gold hover:text-gold"
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={next}
                  className="rounded-full border border-white/10 bg-black/40 p-2 text-text-primary backdrop-blur-sm transition-colors hover:border-gold hover:text-gold"
                  aria-label="Next slide"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function FilterChips() {
  const navigate = useNavigate();

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {quickFilters.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => {
            if (filter === 'All') navigate('/mixes');
            else navigate(`/mixes?genre=${encodeURIComponent(filter)}`);
          }}
          className={`shrink-0 rounded-full px-5 py-3 text-sm font-bold transition-colors ${
            filter === 'All'
              ? 'bg-gold text-black'
              : 'border border-white/15 bg-transparent text-text-secondary hover:border-gold/50 hover:text-text-primary'
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}

function DjRail({ djs }: { djs: any[] }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headphones className="h-6 w-6 text-gold" />
          <h2 className="font-display text-xl font-bold uppercase text-text-primary">DJs for You</h2>
        </div>
        <Link to="/discover" className="text-xs font-bold uppercase text-text-muted hover:text-gold">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {djs.slice(0, 4).map((dj) => (
          <Link key={dj.id} to={`/dj/${dj.username || dj.id}`} className="group">
            <article className="overflow-hidden rounded-xl bg-black-surface">
              <div className="aspect-square overflow-hidden bg-white/5">
                <img
                  src={dj.avatar || '/placeholder.jpg'}
                  alt={dj.stageName}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-base font-bold text-text-primary">{dj.stageName}</h3>
                  {dj.verified && <VerifiedBadge className="shrink-0" />}
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                  <MapPin className="h-3 w-3" />
                  {dj.city || 'Sierra Leone'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(dj.genres || []).slice(0, 2).map((genre: string) => (
                    <span
                      key={genre}
                      className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase text-text-secondary"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MixRail({ categories }: { categories: any[] }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="h-6 w-6 text-gold" />
          <h2 className="font-display text-xl font-bold uppercase text-text-primary">Mix Hub</h2>
        </div>
        <Link to="/mixes" className="text-xs font-bold uppercase text-text-muted hover:text-gold">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.slice(0, 4).map((category) => (
          <Link key={category.id} to={`/mixes?category=${category.id}`} className="group">
            <article className="overflow-hidden rounded-xl bg-black-surface">
              <div className="aspect-square overflow-hidden">
                <img
                  src={genreImages[category.id] || '/mix-placeholder.jpg'}
                  alt={category.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <h3 className="truncate text-sm font-bold text-text-primary">{category.name}</h3>
                <p className="mt-1 text-xs text-gold">{category.count || 0} mixes</p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EventRail({ events }: { events: any[] }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-gold" />
          <h2 className="font-display text-xl font-bold uppercase text-text-primary">Events</h2>
        </div>
        <Link to="/events" className="text-xs font-bold uppercase text-text-muted hover:text-gold">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {events.slice(0, 3).map((event) => (
          <Link key={event.id} to={`/events/${event.id}`} className="group">
            <article className="flex items-center gap-4 rounded-xl bg-black-surface p-3">
              <img
                src={event.image || '/cover-placeholder.jpg'}
                alt={event.title}
                className="h-20 w-20 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-text-primary">{event.title}</h3>
                <p className="mt-1 truncate text-xs text-text-muted">{event.city || event.location}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase text-gold">
                  Open
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { featuredDJs, mixCategories, events, isLoading } = useHomeData();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <main className="px-5 py-8 lg:px-12">
      <div className="mx-auto max-w-[1240px] space-y-10">
        <PromoBanner featuredDJs={featuredDJs.data || []} events={events.data || []} />
        <FilterChips />
        <DjRail djs={featuredDJs.data || []} />
        <MixRail categories={mixCategories.data || []} />
        <EventRail events={events.data || []} />
      </div>
    </main>
  );
}
