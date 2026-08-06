import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SEOHead from '@/components/SEOHead';
import {
  ArrowUpRight,
  Calendar,
  Headphones,
  Loader2,
  Radio,
  MapPin,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Users,
  Smartphone,
  Ticket,
  Play,
  Trophy,
} from 'lucide-react';
import { useHomeData } from '@/hooks/useHomeData';
import { useAuthStore } from '@/stores/authStore';
import { VerifiedBadge } from '@/components/VerifiedBadge';

const quickFilters = ['All', 'Afrobeats', 'Amapiano', 'Dancehall', 'Hip Hop', 'Gospel', 'Salone Mix'];

/* ─── Public Guest Landing Hero ─── */
function GuestLandingHero({ statsData }: { statsData?: { totalDjs: number; verifiedDjs: number; totalMixes: number; totalEvents: number; citiesCount: number } }) {
  const djs = statsData ? (statsData.verifiedDjs > 0 ? statsData.verifiedDjs : statsData.totalDjs) : 0;
  const mixes = statsData?.totalMixes ?? 0;
  const events = statsData?.totalEvents ?? 0;
  const cities = statsData?.citiesCount ?? 0;

  const stats = [
    { label: 'Verified DJs', value: djs > 0 ? `${djs}` : '0' },
    { label: 'Mixes Uploaded', value: mixes > 0 ? `${mixes}` : '0' },
    { label: 'Events Hosted', value: events > 0 ? `${events}` : '0' },
    { label: 'Cities Covered', value: cities > 0 ? `${cities}` : '0' },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-gold/20 bg-black-surface shadow-2xl">
      {/* Background Image with Ambient Glow */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/hero-bg.jpg"
          alt="Deck Salone DJ Platform"
          className="h-full w-full object-cover object-center opacity-20 scale-105 filter blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-black/85 to-black/70" />
        {/* Gold ambient orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Desktop: two-column layout | Mobile: single column */}
      <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14 lg:py-16 lg:px-16">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">

          {/* Left: Text & CTAs */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-[11px] font-extrabold uppercase tracking-widest mb-5">
              <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse" />
              <span>Sierra Leone&apos;s Official DJ Network &amp; Event Hub</span>
            </div>

            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-black uppercase tracking-tight text-text-primary leading-[1.05]">
              Get Booked.{' '}
              <span className="bg-gradient-to-r from-gold via-amber-300 to-gold bg-clip-text text-transparent">
                Build Your Brand.
              </span>{' '}
              Stream Salone.
            </h1>

            <p className="mt-5 text-sm sm:text-base text-text-secondary max-w-xl leading-relaxed">
              The ultimate platform connecting Sierra Leone DJs, event promoters, and music lovers. Upload mixes, book verified DJs, buy event tickets, and rank top talent.
            </p>

            {/* CTAs */}
            <div className="mt-8 w-full flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 max-w-lg lg:max-w-none">
              <Link
                to="/register"
                className="w-full sm:w-auto px-7 py-4 bg-gold-gradient text-black font-extrabold text-sm uppercase tracking-wider rounded-full hover:scale-[1.03] active:scale-[0.97] shadow-[0_0_30px_rgba(212,162,74,0.4)] transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                <Headphones className="w-4 h-4" />
                Join as DJ
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/register"
                className="w-full sm:w-auto px-7 py-4 border border-white/20 hover:border-gold/50 bg-black/60 backdrop-blur-md text-text-primary hover:text-gold font-bold text-sm uppercase tracking-wider rounded-full hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4 text-gold" />
                Join as Fan / Promoter
              </Link>
            </div>

            {/* Install pill */}
            <div className="mt-5">
              <Link
                to="/install"
                className="inline-flex items-center gap-2 text-xs font-semibold text-gold/80 hover:text-gold underline tracking-wide transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5" /> Install Mobile App (iOS &amp; Android)
              </Link>
            </div>
          </div>

          {/* Right: Platform Stats Grid — desktop only */}
          <div className="hidden lg:grid grid-cols-2 gap-4 shrink-0 w-72 xl:w-80 mt-10 lg:mt-0">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-black/60 border border-gold/20 backdrop-blur-xl p-5 flex flex-col items-center justify-center text-center hover:border-gold/40 hover:shadow-[0_0_20px_rgba(212,162,74,0.1)] transition-all"
              >
                <span className="font-display text-3xl font-black text-gold leading-none">{stat.value}</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted mt-1.5">{stat.label}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Mobile stats — horizontal strip */}
        <div className="lg:hidden mt-8 grid grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-black/50 border border-gold/15 p-3 text-center">
              <span className="font-display text-xl font-black text-gold">{stat.value}</span>
              <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted mt-0.5 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { usePlayerStore } from '@/stores/playerStore';

/* ─── Continue Listening Section ─── */
function ContinueListeningCard() {
  const lastSession = usePlayerStore((s) => s.lastSession);
  const play = usePlayerStore((s) => s.play);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated || !user || !lastSession || !lastSession.track) return null;


  const { track, currentTime, duration } = lastSession;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <section className="bg-black-surface border border-gold/40 hover:border-gold rounded-2xl p-4 shadow-xl transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-gold/30">
            <img src={track.cover || '/mix-placeholder.jpg'} alt={track.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Play className="w-4 h-4 text-gold fill-gold" />
            </div>
          </div>
          <div className="min-w-0">
            <span className="text-gold text-[9px] font-black uppercase tracking-widest block">CONTINUE LISTENING</span>
            <h4 className="font-display font-bold text-xs uppercase text-text-primary truncate">{track.title}</h4>
            <p className="text-[10px] text-text-muted mt-0.5 truncate">
              {track.dj} • Resuming at {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>
        </div>

        <button
          onClick={() => play(track, currentTime)}
          className="bg-gold-gradient text-black font-extrabold text-xs uppercase tracking-wider px-4 py-2 rounded-full shrink-0 flex items-center gap-1 hover:scale-105 transition-transform"
        >
          <Play className="w-3.5 h-3.5 fill-black" /> Resume
        </button>
      </div>
    </section>
  );
}

/* ─── Experience Matrix: Show the Difference ─── */
function ExperienceMatrix() {
  return (
    <section className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-text-primary">
          One Platform. <span className="text-gold">Two Tailored Experiences.</span>
        </h2>
        <p className="text-xs sm:text-sm text-text-muted max-w-lg mx-auto">
          Whether you create the sound or host the party, Deck Salone provides dedicated tools for your role.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DJ Experience Card */}
        <div className="p-6 rounded-2xl bg-black-surface border border-gold/30 hover:border-gold transition-all space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gold/15 flex items-center justify-center text-gold">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold uppercase text-text-primary">For DJs</h3>
              <p className="text-xs text-text-muted">Grow your brand & get hired</p>
            </div>
          </div>
          <ul className="space-y-2.5 text-xs text-text-secondary">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
              <span>Create an official verified DJ profile</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
              <span>Upload mixes, live sets & track analytics</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
              <span>Receive direct event booking requests & payments</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
              <span>Compete in Sierra Leone DJ Battles & Rankings</span>
            </li>
          </ul>
          <Link
            to="/register"
            className="block w-full text-center py-3 rounded-xl bg-gold-gradient text-black font-extrabold text-xs uppercase tracking-wider hover:brightness-110 transition-all"
          >
            Create DJ Account
          </Link>
        </div>

        {/* Fan / Promoter Experience Card */}
        <div className="p-6 rounded-2xl bg-black-surface border border-white/10 hover:border-gold/50 transition-all space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gold/15 flex items-center justify-center text-gold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold uppercase text-text-primary">For Fans & Promoters</h3>
              <p className="text-xs text-text-muted">Explore, stream & book top talent</p>
            </div>
          </div>
          <ul className="space-y-2.5 text-xs text-text-secondary">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
              <span>Discover & hire DJs for weddings, clubs & events</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
              <span>Stream non-stop Sierra Leone mixes & genre sets</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
              <span>Buy event tickets & check in with instant QR codes</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
              <span>Simple sign up — no DJ details required</span>
            </li>
          </ul>
          <Link
            to="/register"
            className="block w-full text-center py-3 rounded-xl bg-black-elevated border border-gold/40 text-gold font-bold text-xs uppercase tracking-wider hover:bg-gold/10 transition-all"
          >
            Join as Fan or Promoter
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Home Ad Board Carousel (replaces Welcome Back header) ─── */
interface AdBoardData {
  paidAds: any[];
  events: any[];
  djRankings: any[];
  mixes: any[];
}

function HomeAdBoard({ data }: { data: AdBoardData }) {
  const { paidAds, events, djRankings, mixes } = data;

  // Build slides: paid ads first, then top event, top DJ, top mix
  const slides = [
    ...paidAds.slice(0, 3).map((ad: any) => ({ type: 'ad' as const, data: ad })),
    ...events.slice(0, 3).map((ev: any) => ({ type: 'event' as const, data: ev })),
    ...djRankings.slice(0, 3).map((dj: any) => ({ type: 'dj' as const, data: dj })),
    ...mixes.slice(0, 3).map((mix: any) => ({ type: 'mix' as const, data: mix })),
  ];

  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % Math.max(slides.length, 1));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next, slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[current];
  const { type, data: item } = slide;

  const typeLabel = type === 'ad' ? '✦ Sponsored' : type === 'event' ? '📅 Upcoming Event' : type === 'dj' ? '🏆 Top Ranked DJ' : '🎵 Trending Mix';
  const typeLabelColor = type === 'ad' ? 'text-amber-300' : type === 'event' ? 'text-blue-300' : type === 'dj' ? 'text-gold' : 'text-purple-300';

  const coverImage =
    type === 'ad' ? item.creativeImageUrl :
    type === 'event' ? item.image :
    type === 'dj' ? item.avatar :
    item.coverImage;

  const title =
    type === 'ad' ? item.name :
    type === 'event' ? item.title :
    type === 'dj' ? item.stageName :
    item.title;

  const subtitle =
    type === 'ad' ? (item.description || (item.advertiser?.stageName ? `By ${item.advertiser.stageName}` : 'Deck Salone Sponsored')) :
    type === 'event' ? (item.city || item.venue || 'Sierra Leone') :
    type === 'dj' ? `Rank #${item.rankingPosition} · ${item.city || 'SL'}` :
    `${item.dj?.stageName || ''} · ${item.plays?.toLocaleString() || 0} plays`;

  const linkTo =
    type === 'ad' ? (item.ctaUrl || '/discover') :
    type === 'event' ? `/events/${item.id}` :
    type === 'dj' ? `/dj/${item.user?.username || item.id}` :
    `/mixes/${item.id}`;

  const ctaText =
    type === 'ad' ? 'Learn More' :
    type === 'event' ? 'Get Tickets' :
    type === 'dj' ? 'View Profile' :
    'Listen Now';

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gold/20 bg-black-surface shadow-2xl" style={{ minHeight: 200 }}>
      {/* Background image blur */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${current}`}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 z-0"
        >
          {coverImage && (
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover opacity-30 blur-[2px] scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/80 to-black/60" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/8 rounded-full blur-3xl pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Slide content */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 p-4 sm:p-7">
        {/* Cover image */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`img-${current}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="shrink-0"
          >
            {coverImage ? (
              <img
                src={coverImage}
                alt={title}
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-gold/30 shadow-[0_0_20px_rgba(212,162,74,0.2)]"
              />
            ) : (
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-gold/10 border-2 border-gold/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-gold/40" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`text-${current}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="flex-1 min-w-0 w-full text-center sm:text-left"
          >
            <span className={`inline-block text-[10px] font-extrabold uppercase tracking-widest ${typeLabelColor}`}>{typeLabel}</span>
            <h2 className="font-display text-base sm:text-xl md:text-2xl font-black uppercase text-text-primary leading-snug mt-1 break-words line-clamp-2">{title}</h2>
            <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-3 sm:line-clamp-2">{subtitle}</p>

            <div className="mt-4 flex items-center justify-between sm:justify-start gap-3 w-full">
              {type === 'ad' && item.ctaUrl && (item.ctaUrl.startsWith('http://') || item.ctaUrl.startsWith('https://')) ? (
                <a
                  href={item.ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 sm:px-5 rounded-full bg-gold-gradient text-black font-extrabold text-xs uppercase tracking-wider hover:scale-[1.03] transition-all shadow-[0_0_15px_rgba(212,162,74,0.3)] flex items-center gap-1.5 shrink-0"
                >
                  {ctaText} <ArrowRight className="w-3.5 h-3.5" />
                </a>
              ) : (
                <Link
                  to={linkTo}
                  className="px-4 py-2 sm:px-5 rounded-full bg-gold-gradient text-black font-extrabold text-xs uppercase tracking-wider hover:scale-[1.03] transition-all shadow-[0_0_15px_rgba(212,162,74,0.3)] flex items-center gap-1.5 shrink-0"
                >
                  {ctaText} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}

              {/* Dot indicators */}
              <div className="flex items-center gap-1.5 shrink-0 sm:ml-auto">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`rounded-full transition-all ${
                      i === current
                        ? 'w-5 h-2 bg-gold shadow-[0_0_6px_rgba(212,162,74,0.8)]'
                        : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function FilterChips() {
  const navigate = useNavigate();

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
      {quickFilters.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => {
            if (filter === 'All') navigate('/mixes');
            else navigate(`/mixes?genre=${encodeURIComponent(filter)}`);
          }}
          className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
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

function DjStoryBar({ djs }: { djs: any[] }) {
  if (!djs || djs.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-gold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse" />
          Featured DJs & Performers
        </span>
        <Link to="/discover" className="text-[11px] font-bold uppercase text-text-muted hover:text-gold">
          All DJs →
        </Link>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-2 pt-1 hide-scrollbar">
        {djs.map((dj) => (
          <Link
            key={dj.id}
            to={`/dj/${dj.username || dj.id}`}
            className="flex flex-col items-center gap-1.5 shrink-0 group w-16 sm:w-20"
          >
            <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-gold via-amber-300 to-gold group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(212,162,74,0.3)]">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-black bg-black-surface">
                <img
                  src={dj.avatar || '/default-avatar.jpg'}
                  alt={dj.stageName}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-gold border-2 border-black shadow-[0_0_8px_rgba(212,162,74,0.6)]" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-text-primary group-hover:text-gold truncate w-full text-center">
              {dj.stageName}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function QuickAccessGrid() {
  const navigate = useNavigate();

  const cards = [
    { title: 'Top DJs', subtitle: 'Official Rankings', icon: Trophy, path: '/rankings', color: 'from-amber-500/20 via-gold/10 to-transparent' },
    { title: 'Mix Hub', subtitle: 'Afrobeats & Sets', icon: Radio, path: '/mixes', color: 'from-purple/20 via-gold/10 to-transparent' },
    { title: 'DJ Battles', subtitle: 'Vote Live', icon: Sparkles, path: '/battles', color: 'from-red/20 via-gold/10 to-transparent' },
    { title: 'Events', subtitle: 'Get Tickets', icon: Ticket, path: '/events', color: 'from-blue/20 via-gold/10 to-transparent' },
  ];

  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.title}
          onClick={() => navigate(card.path)}
          className={`cursor-pointer rounded-2xl p-3.5 border border-white/10 bg-gradient-to-br ${card.color} backdrop-blur-xl hover:border-gold/50 active:scale-98 transition-all shadow-lg flex items-center justify-between group`}
        >
          <div className="min-w-0">
            <h3 className="font-display font-extrabold text-xs sm:text-sm uppercase text-text-primary group-hover:text-gold truncate">
              {card.title}
            </h3>
            <p className="text-[10px] text-text-muted mt-0.5 truncate">{card.subtitle}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0 ml-2 group-hover:scale-110 transition-transform">
            <card.icon className="w-4 h-4" />
          </div>
        </div>
      ))}
    </section>
  );
}

function DjRail({ djs }: { djs: any[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Headphones className="h-5 w-5 text-gold" />
          <h2 className="font-display text-xl font-bold uppercase text-text-primary">Featured Salone DJs</h2>
        </div>
        <Link to="/discover" className="text-xs font-bold uppercase text-text-muted hover:text-gold flex items-center gap-1">
          View All <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {djs.slice(0, 4).map((dj) => (
          <Link key={dj.id} to={`/dj/${dj.username || dj.id}`} className="group">
            <article className="overflow-hidden rounded-2xl bg-black-surface border border-dark-gray hover:border-gold/40 transition-all duration-200">
              <div className="aspect-square overflow-hidden bg-white/5 relative">
                <img
                  src={dj.avatar || '/placeholder.jpg'}
                  alt={dj.stageName}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-base font-bold text-text-primary">{dj.stageName}</h3>
                  {dj.verified && <VerifiedBadge dj={dj} className="shrink-0" />}
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                  <MapPin className="h-3 w-3 text-gold" />
                  {dj.city || 'Sierra Leone'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(dj.genres || []).slice(0, 2).map((genre: string) => (
                    <span
                      key={genre}
                      className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-text-secondary"
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

import GenreCategoryCard from '@/components/GenreCategoryCard';

function MixRail({ categories }: { categories: any[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="h-5 w-5 text-gold" />
          <h2 className="font-display text-xl font-bold uppercase text-text-primary">Mix Hub Categories</h2>
        </div>
        <Link to="/mixes" className="text-xs font-bold uppercase text-text-muted hover:text-gold flex items-center gap-1">
          View All <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.slice(0, 4).map((category) => (
          <GenreCategoryCard key={category.id || category.name} category={category} />
        ))}
      </div>
    </section>
  );
}

function EventRail({ events }: { events: any[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-gold" />
          <h2 className="font-display text-xl font-bold uppercase text-text-primary">Upcoming Events</h2>
        </div>
        <Link to="/events" className="text-xs font-bold uppercase text-text-muted hover:text-gold flex items-center gap-1">
          View All <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {events.slice(0, 3).map((event) => (
          <Link key={event.id} to={`/events/${event.id}`} className="group">
            <article className="flex items-center gap-4 rounded-2xl bg-black-surface border border-dark-gray hover:border-gold/40 p-3.5 transition-all">
              <img
                src={event.image || '/cover-placeholder.jpg'}
                alt={event.title}
                className="h-20 w-20 rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-text-primary">{event.title}</h3>
                <p className="mt-1 truncate text-xs text-text-muted">{event.city || event.location}</p>
                <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold uppercase text-gold">
                  Explore Event <ArrowUpRight className="h-3.5 w-3.5" />
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
  const { user, isAuthenticated } = useAuthStore();
  const { featuredDJs, mixCategories, events, homeAdBoard, platformStats, isLoading } = useHomeData();

  const isAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'MODERATOR' ||
    user?.role === 'FINANCE_ADMIN' ||
    user?.role === 'VERIFICATION_ADMIN';

  if (isAuthenticated && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <main className="px-4 py-6 sm:px-8 lg:px-12">
      <SEOHead
        title="Deck Salone — Sierra Leone's Official DJ Platform"
        description="Discover top DJs, listen to exclusive Sierra Leonean mixes, book DJs for events, and experience live DJ battles on Deck Salone."
      />
      <div className="mx-auto max-w-[1240px] space-y-10">
        {/* Ad Board Carousel — shown to all users (replaces Welcome Back header) */}
        <HomeAdBoard data={homeAdBoard.data || { paidAds: [], events: [], djRankings: [], mixes: [] }} />

        {/* For guests only: show full landing hero below ad board with real live stats */}
        {!isAuthenticated && <GuestLandingHero statsData={platformStats.data} />}

        {/* Top DJ Story Bar */}
        <DjStoryBar djs={featuredDJs.data || []} />

        {/* Quick Access Glass Grid */}
        <QuickAccessGrid />

        {/* Continue Listening (Resumes last played track position) */}
        <ContinueListeningCard />

        {/* Show Difference matrix on public landing */}
        {!isAuthenticated && <ExperienceMatrix />}

        {/* Content rails */}
        <FilterChips />
        <DjRail djs={featuredDJs.data || []} />
        <MixRail categories={mixCategories.data || []} />
        <EventRail events={events.data || []} />

        {/* Footer App Install Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-black-surface via-black-elevated to-black-surface border border-gold/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center text-gold shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-text-primary text-sm uppercase">Get Deck Salone on Your Mobile</h4>
              <p className="text-xs text-text-muted">Install PWA on iOS or Android for push notifications & instant access</p>
            </div>
          </div>
          <Link
            to="/install"
            className="px-5 py-2.5 rounded-full bg-gold-gradient text-black font-extrabold text-xs uppercase tracking-wider shrink-0 hover:scale-102 transition-all"
          >
            PWA Setup Guide
          </Link>
        </div>
      </div>
    </main>
  );
}
