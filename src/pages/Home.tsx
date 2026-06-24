import { useRef, useEffect, useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Search,
  ChevronDown,
  MapPin,
  ArrowRight,
  UserPlus,
  Upload,
  TrendingUp,
  CalendarCheck,
  TrendingDown,
  Vote,
  Loader2,
} from 'lucide-react';
import FadeIn from '@/components/FadeIn';
import { useHomeData } from '@/hooks/useHomeData';
import { usePublicStats } from '@/hooks/usePublicStats';

/* ──────────────────────── Animated Waveform (Hero) ──────────────────────── */
const WaveformBar = memo(function WaveformBar({ delay }: { delay: number }) {
  return (
    <motion.div
      className="w-[2px] bg-gold/10 rounded-full"
      animate={{
        height: [20, 40 + Math.random() * 40, 20],
      }}
      transition={{
        duration: 2 + Math.random() * 1,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
});

const AnimatedWaveform = memo(function AnimatedWaveform() {
  const bars = Array.from({ length: 60 }, (_, i) => i);
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-[3px] overflow-hidden pointer-events-none z-0">
      {bars.map((i) => (
        <WaveformBar key={i} delay={i * 0.05} />
      ))}
    </div>
  );
});

/* ──────────────────────── Counter Component ──────────────────────── */
function Counter({
  target,
  suffix = '',
  inView,
}: {
  target: number;
  suffix?: string;
  inView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1500;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span className="font-mono-data text-4xl sm:text-5xl lg:text-6xl font-bold text-gold tabular-nums">
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ──────────────────────── Verified Badge SVG ──────────────────────── */
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

/* ──────────────────────── Crown Icon SVG ──────────────────────── */
function CrownIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M2 12L3 5L6 7L8 3L10 7L13 5L14 12H2Z"
        fill="#D4A24A"
        stroke="#D4A24A"
        strokeWidth="0.5"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*                                HOME PAGE                                */
/* ═══════════════════════════════════════════════════════════════════════ */

const quickFilters = ['Afrobeats', 'Amapiano', 'Dancehall', 'Hip Hop', 'Gospel'];

const howItWorksSteps = [
  {
    num: '01',
    icon: UserPlus,
    title: 'CREATE PROFILE',
    desc: 'Sign up, verify your identity, and build your professional DJ profile with bio, genres, equipment, and social links.',
    img: '/placeholder.jpg',
  },
  {
    num: '02',
    icon: Upload,
    title: 'UPLOAD MIXES',
    desc: 'Upload your mixes, connect streaming platforms, and let fans discover your sound across all genres.',
    img: '/placeholder.jpg',
  },
  {
    num: '03',
    icon: TrendingUp,
    title: 'GET DISCOVERED',
    desc: 'Our ranking algorithm tracks your streams, bookings, and engagement. Climb the leaderboard and get noticed.',
    img: '/placeholder.jpg',
  },
  {
    num: '04',
    icon: CalendarCheck,
    title: 'GET BOOKED',
    desc: 'Receive booking requests from promoters and fans. Negotiate fees, manage your calendar, and grow your career.',
    img: '/placeholder.jpg',
  },
];

/* ──────────────────────── SECTION 1: HERO ──────────────────────── */
function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]">
        <div className="absolute inset-0 bg-hero-overlay" />
      </div>

      {/* Animated Waveform Background */}
      <AnimatedWaveform />

      {/* Content */}
      <div className="relative z-10 container-main text-center pt-20">
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="section-label mb-6"
        >
          Sierra Leone's Official DJ Ecosystem
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[80px] font-bold uppercase leading-[1] tracking-tight text-text-primary"
        >
          Discover the
        </motion.h1>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[80px] font-bold uppercase leading-[1] tracking-tight text-gold mt-1"
          style={{ textShadow: '0 0 60px rgba(212,162,74,0.3)' }}
        >
          Best DJs
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-6 text-text-secondary text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
        >
          The first digital platform connecting DJs, promoters, and fans across
          Sierra Leone. Upload mixes, get booked, track rankings, and be part of
          the movement.
        </motion.p>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.1 }}
          className="mt-10 max-w-xl mx-auto"
        >
          <div className="flex items-center bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-full px-4 sm:px-6 py-3 gap-3">
            <Search className="w-5 h-5 text-gold shrink-0" />
            <input
              type="text"
              placeholder="Search DJs, genres, or cities..."
              className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted text-sm sm:text-base outline-none min-w-0"
            />
            <button className="shrink-0 px-5 py-2 bg-gold-gradient text-black text-sm font-semibold rounded-full hover:scale-[1.02] transition-transform">
              Search
            </button>
          </div>
        </motion.div>

        {/* Quick Filters */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.3 }}
          className="mt-4 flex flex-wrap justify-center gap-2"
        >
          {quickFilters.map((filter, i) => (
            <motion.button
              key={filter}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 1.3 + i * 0.05 }}
              className="px-4 py-1.5 border border-white/20 rounded-full text-xs font-medium uppercase tracking-wide text-text-secondary hover:border-gold/50 hover:text-gold transition-all duration-200"
            >
              {filter}
            </motion.button>
          ))}
        </motion.div>

        {/* CTA Row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.5 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/discover"
            className="px-8 py-3 bg-gold-gradient text-black font-semibold uppercase tracking-wide rounded-full text-sm hover:scale-[1.02] hover:brightness-110 transition-all duration-200"
          >
            Explore DJs
          </Link>
          <Link
            to="/login"
            className="px-8 py-3 border border-white/30 text-text-primary font-semibold uppercase tracking-wide rounded-full text-sm hover:border-gold/50 hover:text-gold transition-all duration-200"
          >
            Join as DJ
          </Link>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted">
            Scroll to explore
          </span>
          <ChevronDown className="w-5 h-5 text-text-muted animate-chevron-pulse" />
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────── SECTION 2: STATS BAR ──────────────────────── */
function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-100px' });
  const { totalDjs, totalMixes, totalEvents, cityCount, isLoading } = usePublicStats();

  const stats = [
    { value: totalDjs, suffix: '+', label: 'VERIFIED DJS' },
    { value: totalMixes, suffix: '+', label: 'MIXES UPLOADED' },
    { value: cityCount, suffix: '', label: 'CITIES COVERED' },
    { value: totalEvents, suffix: '+', label: 'EVENTS THIS YEAR' },
  ];

  return (
    <section
      ref={ref}
      className="bg-black-elevated border-y border-white/5 py-10 sm:py-12"
    >
      <div className="container-main">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : (
            stats.map((stat, i) => (
              <FadeIn key={stat.label} delay={i * 0.2} className="text-center">
                <Counter
                  target={stat.value}
                  suffix={stat.suffix}
                  inView={isInView}
                />
                <p className="mt-2 text-xs uppercase tracking-[0.15em] text-text-muted">
                  {stat.label}
                </p>
              </FadeIn>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── SECTION 3: FEATURED DJs ──────────────────────── */
function FeaturedDJsSection({ djs }: { djs: any[] }) {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-black">
      <div className="container-main">
        {/* Section Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <div>
              <p className="section-label mb-3">Featured</p>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold uppercase tracking-tight text-text-primary">
                Top DJs to Watch
              </h2>
              <p className="mt-3 text-text-secondary max-w-md">
                Handpicked by our editorial team based on performance,
                consistency, and community impact.
              </p>
            </div>
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 text-gold text-sm font-medium hover:gap-3 transition-all shrink-0"
            >
              View All DJs <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </FadeIn>

        {/* DJ Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {djs.map((dj, i) => (
            <FadeIn key={dj.id} delay={0.3 + i * 0.1}>
              <Link to={`/dj/${dj.id}`} className="group block">
                <div className="bg-black-elevated border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-card">
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={dj.avatar || '/placeholder.jpg'}
                      alt={dj.stageName}
                      className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

                    {/* Rank Badge */}
                    <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-gold border-2 border-gold flex items-center justify-center">
                      <span className="font-mono-data text-sm font-bold text-black">
                        #{dj.rankingPosition || i + 1}
                      </span>
                    </div>

                    {/* Crown for top 3 */}
                    {(dj.rankingPosition || i + 1) <= 3 && (
                      <div className="absolute top-3 right-3">
                        <CrownIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-base font-semibold uppercase text-text-primary">
                        {dj.stageName}
                      </h3>
                      {dj.verified && <VerifiedBadge />}
                    </div>

                    <div className="flex items-center gap-1 text-text-muted text-xs mb-3">
                      <MapPin className="w-3 h-3" />
                      {dj.city}, {dj.country}
                    </div>

                    {/* Genre Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(dj.genres || []).slice(0, 3).map((g: string) => (
                        <span
                          key={g}
                          className="px-2 py-0.5 border border-white/10 rounded-full text-[10px] uppercase tracking-wide text-text-secondary"
                        >
                          {g}
                        </span>
                      ))}
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                      <div className="text-center">
                        <p className="font-mono-data text-xs text-text-primary">
                          {(dj.totalFollowers || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-text-muted uppercase">
                          Followers
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="font-mono-data text-xs text-text-primary">
                          {dj.totalMixes || dj._count?.mixes || 0}
                        </p>
                        <p className="text-[10px] text-text-muted uppercase">
                          Mixes
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="font-mono-data text-xs text-text-primary">
                          {dj.averageRating?.toFixed(1) || '0.0'}
                        </p>
                        <p className="text-[10px] text-text-muted uppercase">
                          Rating
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-gold text-xs uppercase tracking-wide font-medium">
                      View Profile
                    </p>
                  </div>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}


/* ──────────────────────── SECTION 4: RANKINGS ──────────────────────── */
function RankingsSection({ rankings }: { rankings: any[] }) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-gold';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-600';
    return 'text-text-muted';
  };

  const getRankBorder = (rank: number) => {
    if (rank <= 3) return 'border-gold';
    return 'border-dark-gray';
  };

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-black">
      <div className="container-main">
        {/* Section Header */}
        <FadeIn className="text-center mb-12">
          <p className="section-label mb-3">Live Rankings</p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold uppercase tracking-tight text-text-primary">
            Top 10 DJs in Sierra Leone
          </h2>
          <p className="mt-3 text-text-secondary max-w-lg mx-auto">
            Updated weekly based on streaming data, bookings, and community
            votes.
          </p>
          <Link
            to="/rankings"
            className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 border border-gold/50 text-gold text-sm font-medium rounded-full hover:bg-gold/10 transition-all"
          >
            View Full Rankings <ArrowRight className="w-4 h-4" />
          </Link>
        </FadeIn>

        {/* Rankings Table */}
        <div className="space-y-2">
          {rankings.map((dj, i) => (
            <FadeIn key={dj.id} delay={0.05 * i} direction="left">
              <Link to={`/dj/${dj.id}`}>
                <div
                  className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-6 py-4 rounded-xl transition-all duration-200 cursor-pointer ${
                    dj.rankingPosition <= 3
                      ? 'bg-rank-gradient-top border border-gold/10 hover:bg-medium-gray/50'
                      : 'bg-black-elevated/50 hover:bg-medium-gray/50 border border-transparent'
                  }`}
                >
                  {/* Rank */}
                  <span
                    className={`font-mono-data text-lg sm:text-2xl font-bold w-8 sm:w-12 text-center shrink-0 ${getRankColor(
                      dj.rankingPosition
                    )}`}
                  >
                    {dj.rankingPosition}
                  </span>

                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 overflow-hidden shrink-0 ${getRankBorder(
                      dj.rankingPosition
                    )}`}
                  >
                    <img
                      src={dj.avatar || '/placeholder.jpg'}
                      alt={dj.stageName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-sm sm:text-base font-semibold uppercase text-text-primary truncate">
                        {dj.stageName}
                      </h4>
                      {dj.rankingPosition <= 3 && (
                        <CrownIcon className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] sm:text-xs text-text-muted">
                        {(dj.genres || []).slice(0, 2).join(', ')}
                      </span>
                      <span className="text-text-muted">|</span>
                      <span className="text-[10px] sm:text-xs text-text-muted flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {dj.city}
                      </span>
                    </div>
                  </div>

                  {/* Score Bar (desktop) */}
                  <div className="hidden sm:flex items-center gap-3 w-48 shrink-0">
                    <div className="flex-1 h-2 bg-dark-gray rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.min(dj.rankingScore, 100)}%` }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.05 }}
                        viewport={{ once: true }}
                        className="h-full bg-gold-gradient rounded-full"
                      />
                    </div>
                  </div>

                  {/* Score */}
                  <span className="font-mono-data text-sm sm:text-base font-semibold text-gold shrink-0 w-14 text-right">
                    {dj.rankingScore?.toFixed(1)}
                  </span>

                  {/* Trend */}
                  <div
                    className={`flex items-center gap-1 shrink-0 ${
                      (dj.trend || 0) > 0 ? 'text-green' : dj.trend < 0 ? 'text-red' : 'text-text-muted'
                    }`}
                  >
                    {(dj.trend || 0) > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (dj.trend || 0) < 0 ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : null}
                    <span className="font-mono-data text-xs">
                      {(dj.trend || 0) > 0 ? '+' : ''}
                      {dj.trend || 0}%
                    </span>
                  </div>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── SECTION 5: MIX CATEGORIES ──────────────────────── */
function MixCategoriesSection({ categories }: { categories: any[] }) {
  // Map categories to placeholder images
  const imageMap: Record<string, string> = {
    'salone-mix': '/placeholder.jpg',
    'afrobeats': '/placeholder.jpg',
    'amapiano': '/placeholder.jpg',
    'dancehall': '/placeholder.jpg',
    'throwbacks': '/placeholder.jpg',
    'club-mixes': '/placeholder.jpg',
    'wedding-mixes': '/placeholder.jpg',
    'gospel': '/placeholder.jpg',
  };

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-black-elevated">
      <div className="container-main">
        {/* Section Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <div>
              <p className="section-label mb-3">Mix Hub</p>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold uppercase tracking-tight text-text-primary">
                Explore Mixes by Genre
              </h2>
              <p className="mt-3 text-text-secondary max-w-md">
                From Salone classics to the latest Amapiano — find your sound.
              </p>
            </div>
            <Link
              to="/mixes"
              className="inline-flex items-center gap-2 text-gold text-sm font-medium hover:gap-3 transition-all shrink-0"
            >
              Browse All Mixes <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </FadeIn>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((cat, i) => (
            <FadeIn key={cat.id} delay={i * 0.08}>
              <Link to={`/mixes?category=${cat.id}`} className="group block">
                <div className="relative aspect-[16/9] rounded-2xl overflow-hidden transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-gold">
                  <img
                    src={imageMap[cat.id] || '/placeholder.jpg'}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
                    <h3 className="font-display text-sm sm:text-lg font-semibold uppercase text-text-primary">
                      {cat.name}
                    </h3>
                    <p className="font-mono-data text-xs text-gold mt-0.5">
                      {cat.count || 0} mixes
                    </p>
                  </div>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── SECTION 6: HOW IT WORKS ──────────────────────── */
function HowItWorksSection() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-black-elevated">
      <div className="container-main">
        <FadeIn className="text-center mb-12">
          <p className="section-label mb-3">Get Started</p>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold uppercase tracking-tight text-text-primary">
            How It Works
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {howItWorksSteps.map((step, i) => (
            <FadeIn key={step.title} delay={0.3 + i * 0.3}>
              <div className="relative text-center">
                {/* Step Number */}
                <span className="font-mono-data text-2xl text-text-muted block mb-3">
                  {step.num}
                </span>

                {/* Icon Circle */}
                <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8 text-gold" />
                </div>

                {/* Title */}
                <h4 className="font-display text-base font-semibold text-text-primary mb-2">
                  {step.title}
                </h4>

                {/* Description */}
                <p className="text-text-secondary text-sm leading-relaxed mb-4">
                  {step.desc}
                </p>

                {/* Image */}
                <div className="rounded-lg overflow-hidden h-40 sm:h-44">
                  <img
                    src={step.img}
                    alt={step.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Connecting Line (desktop) */}
                {i < howItWorksSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-[calc(50%+40px)] w-[calc(100%-80px)] h-0.5 bg-dark-gray">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '100%' }}
                      transition={{ duration: 0.6, delay: 0.6 + i * 0.3 }}
                      viewport={{ once: true }}
                      className="h-full bg-gold"
                    />
                  </div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── SECTION 7: EVENTS ──────────────────────── */
function EventsSection({ events }: { events: any[] }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
      day: date.getDate().toString().padStart(2, '0'),
    };
  };

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-black">
      <div className="container-main">
        {/* Section Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <div>
              <p className="section-label mb-3">Upcoming</p>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold uppercase tracking-tight text-text-primary">
                Events & Open Slots
              </h2>
            </div>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 text-gold text-sm font-medium hover:gap-3 transition-all shrink-0"
            >
              View All Events <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </FadeIn>

        {/* Event Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, i) => {
            const date = formatDate(event.date);
            const openSlots = event.isOpenSlot
              ? event.slots - (event.filledSlots || 0)
              : 0;
            return (
              <FadeIn key={event.id} delay={0.12 * i}>
                <div className="bg-black-elevated border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-card">
                  {/* Image */}
                  <div className="relative aspect-[2/1] overflow-hidden">
                    <img
                      src={event.image || '/placeholder.jpg'}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Date Badge */}
                    <div className="absolute top-3 right-3 bg-gold text-black px-3 py-1.5 rounded-lg text-center">
                      <p className="text-xs font-bold uppercase">{date.month}</p>
                      <p className="text-lg font-bold leading-none">{date.day}</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h4 className="font-display text-base font-semibold uppercase text-text-primary">
                      {event.title}
                    </h4>
                    <div className="flex items-center gap-1 text-text-muted text-sm mt-1 mb-4">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.location}
                    </div>

                    {/* DJ Slots */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map((a) => (
                            <div
                              key={a}
                              className="w-7 h-7 rounded-full border-2 border-black-elevated overflow-hidden"
                            >
                              <img
                                src="/placeholder.jpg"
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                        <span className="text-gold text-xs font-medium">
                          +{openSlots} slots open
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link
                        to={`/events/${event.id}`}
                        className="px-4 py-2 border border-white/20 rounded-full text-xs font-medium uppercase text-text-secondary hover:border-gold/50 hover:text-gold transition-all"
                      >
                        Apply to DJ
                      </Link>
                      <button className="px-4 py-2 bg-gold-gradient text-black text-xs font-medium uppercase rounded-full hover:scale-[1.02] transition-transform">
                        Get Tickets
                      </button>
                    </div>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── SECTION 8: BATTLE ARENA ──────────────────────── */
function BattleArenaSection({ battle }: { battle: any }) {
  const entries = battle?.entries?.slice(0, 2) || [];
  const totalVotes = entries.reduce(
    (sum: number, e: any) => sum + (e.voteCount || 0),
    0
  );
  const left = entries[0];
  const right = entries[1];
  const leftPct = totalVotes ? ((left?.voteCount || 0) / totalVotes) * 100 : 50;
  const rightPct = totalVotes ? ((right?.voteCount || 0) / totalVotes) * 100 : 50;

  return (
    <section className="bg-black-elevated">
      <div className="container-main">
        <div className="flex flex-col lg:flex-row items-stretch gap-0 rounded-3xl overflow-hidden">
          {/* Left: Image */}
          <FadeIn direction="right" className="lg:w-1/2">
            <div className="relative h-64 sm:h-80 lg:h-full min-h-[400px]">
              <img
                src="/placeholder.jpg"
                alt="Battle Arena"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black-elevated hidden lg:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-black-elevated via-transparent to-transparent lg:hidden" />
            </div>
          </FadeIn>

          {/* Right: Content */}
          <div className="lg:w-1/2 py-12 px-6 sm:px-10 lg:px-12 flex flex-col justify-center">
            <FadeIn delay={0.2}>
              <p className="section-label mb-3">Battle Arena</p>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold uppercase tracking-tight text-text-primary">
                Weekly DJ Battles
              </h2>
              <p className="mt-4 text-text-secondary leading-relaxed">
                Go head-to-head with other DJs. Upload your best mix, let the
                community vote, and climb the battle leaderboard. New battle
                every week.
              </p>
            </FadeIn>

            {/* Current Battle Card */}
            <FadeIn delay={0.4}>
              <div className="mt-8 bg-black-surface rounded-xl p-5">
                <p className="text-xs uppercase tracking-[0.15em] text-gold mb-3">
                  This Week's Battle
                </p>
                <h3 className="font-display text-lg font-semibold uppercase text-text-primary mb-5">
                  {battle?.theme || 'Afrobeats vs Amapiano'}
                </h3>

                {entries.length >= 2 ? (
                  <>
                    {/* VS Row */}
                    <div className="flex items-center justify-between gap-4 mb-5">
                      <div className="text-center flex-1">
                        <div className="w-14 h-14 rounded-full border-2 border-gold overflow-hidden mx-auto mb-2">
                          <img
                            src={left?.dj?.avatar || '/placeholder.jpg'}
                            alt={left?.dj?.stageName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="font-display text-xs font-semibold uppercase text-text-primary">
                          {left?.dj?.stageName}
                        </p>
                        <p className="font-mono-data text-xs text-gold">
                          {left?.voteCount || 0} votes
                        </p>
                      </div>

                      <div className="shrink-0">
                        <span className="font-mono-data text-3xl sm:text-4xl font-bold text-gold animate-pulse-glow">
                          VS
                        </span>
                      </div>

                      <div className="text-center flex-1">
                        <div className="w-14 h-14 rounded-full border-2 border-purple overflow-hidden mx-auto mb-2">
                          <img
                            src={right?.dj?.avatar || '/placeholder.jpg'}
                            alt={right?.dj?.stageName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="font-display text-xs font-semibold uppercase text-text-primary">
                          {right?.dj?.stageName}
                        </p>
                        <p className="font-mono-data text-xs text-purple">
                          {right?.voteCount || 0} votes
                        </p>
                      </div>
                    </div>

                    {/* Vote Bar */}
                    <div className="h-3 bg-dark-gray rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-gold-gradient rounded-l-full"
                        style={{ width: `${leftPct}%` }}
                      />
                      <div
                        className="h-full bg-purple rounded-r-full"
                        style={{ width: `${rightPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-text-muted">
                        {Math.round(leftPct)}%
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {Math.round(rightPct)}%
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-text-secondary text-sm">
                    No entries yet. Be the first to enter this week's battle!
                  </p>
                )}

                <Link
                  to="/battles"
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gold-gradient text-black font-semibold uppercase tracking-wide rounded-full text-sm hover:scale-[1.02] transition-transform animate-[pulse_2s_ease-in-out_infinite]"
                >
                  <Vote className="w-4 h-4" />
                  Vote Now
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.6}>
              <Link
                to="/battles"
                className="mt-4 inline-flex items-center gap-2 text-gold text-sm font-medium hover:gap-3 transition-all"
              >
                View All Battles <ArrowRight className="w-4 h-4" />
              </Link>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── SECTION 9: CTA BANNER ──────────────────────── */
function CTABanner() {
  return (
    <section className="relative py-20 sm:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gold-gradient animate-[shimmer_8s_linear_infinite] bg-[length:200%_100%]" />
      <div className="relative z-10 container-main text-center">
        <FadeIn>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-black">
            Ready to Amplify Your Sound?
          </h2>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mt-4 text-black/70 text-base sm:text-lg max-w-xl mx-auto">
            Join verified DJs on Sierra Leone's premier platform. Create your
            profile, upload mixes, and start getting booked today.
          </p>
        </FadeIn>
        <FadeIn delay={0.4}>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="px-10 py-3.5 bg-black text-gold font-semibold uppercase tracking-wide rounded-full text-base hover:scale-[1.02] transition-transform"
            >
              Join as DJ — It's Free
            </Link>
          </div>
          <Link
            to="/login"
            className="mt-4 inline-block text-black text-sm hover:underline"
          >
            Already a member? Log in
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

/* ═══════════════════════════ HOME PAGE EXPORT ═══════════════════════════ */

export default function Home() {
  const {
    featuredDJs,
    rankings,
    mixCategories,
    events,
    currentBattle,
    isLoading,
  } = useHomeData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <>
      <HeroSection />
      <StatsBar />
      <FeaturedDJsSection djs={featuredDJs.data || []} />
      <RankingsSection rankings={rankings.data || []} />
      <MixCategoriesSection categories={mixCategories.data || []} />
      <HowItWorksSection />
      <EventsSection events={events.data || []} />
      <BattleArenaSection battle={currentBattle.data} />
      <CTABanner />
    </>
  );
}
