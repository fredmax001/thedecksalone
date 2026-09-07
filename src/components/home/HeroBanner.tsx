import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Sparkles, Play, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, ExternalLink } from 'lucide-react';
import { getMediaUrl } from '@/lib/api';
import { formatDate } from '@/lib/dateTime';
import { usePlayerStore } from '@/stores/playerStore';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { getMixUrl } from '@/lib/slug';
import type { HomeDJ, HomeEvent, HomeMix, HomeAd } from './types';

interface HeroBannerProps {
  djs: HomeDJ[];
  events: HomeEvent[];
  mixes: HomeMix[];
  paidAds: HomeAd[];
}

export default function HeroBanner({ djs, events, mixes, paidAds }: HeroBannerProps) {
  const navigate = useNavigate();
  const play = usePlayerStore((s) => s.play);
  const [showAdDropdown, setShowAdDropdown] = useState(false);

  const slides = useMemo(() => {
    const list: {
      id: string;
      badge: string;
      badgeIcon: string;
      title: string;
      subtitle: string;
      description?: string;
      image: string;
      cta: string;
      link: string;
      type: 'ad' | 'mix' | 'dj' | 'event';
      raw: HomeAd | HomeMix | HomeDJ | HomeEvent;
    }[] = [];

    if (paidAds && paidAds.length > 0) {
      paidAds.forEach((ad) => {
        list.push({
          id: `ad-${ad.id}`,
          badge: ad.badge || 'Sponsored',
          badgeIcon: 'megaphone',
          title: ad.name || ad.title || ad.campaignName || 'Special Promotion',
          subtitle: ad.subtitle || ad.tagline || ad.description || 'Featured partner campaign on Deck Salone',
          description: ad.description || ad.subtitle || ad.tagline || 'Explore exclusive offers and highlights from our sponsor.',
          image: ad.creativeImageUrl || ad.bannerImage || ad.imageUrl || ad.advertiser?.avatar || '/og-banner.png',
          cta: ad.ctaText || 'Explore',
          link: ad.ctaUrl || ad.ctaLink || ad.linkUrl || '/discover',
          type: 'ad',
          raw: ad,
        });
      });
    }

    const topMix = mixes?.[0];
    if (topMix) {
      const mix = topMix;
      list.push({
        id: `mix-${mix.id}`,
        badge: 'Trending Mix',
        badgeIcon: 'sparkles',
        title: mix.title,
        subtitle: `${mix.dj?.stageName || 'Deck Salone'} • ${mix.plays || 0} plays`,
        image: mix.coverImage || mix.dj?.avatar || '/mix-placeholder.jpg',
        cta: 'Listen Now',
        link: getMixUrl(mix as any),
        type: 'mix',
        raw: mix,
      });
    }

    const topDj = djs?.[0];
    if (topDj) {
      const dj = topDj;
      list.push({
        id: `dj-${dj.id}`,
        badge: 'Top Ranked DJ',
        badgeIcon: 'sparkles',
        title: dj.stageName,
        subtitle: `${dj.city || 'Freetown'} • ${dj.genres?.slice(0, 2).join(', ') || 'Afrobeats'}`,
        image: dj.avatar || '/default-avatar.jpg',
        cta: 'View Profile',
        link: `/dj/${dj.username || dj.id}`,
        type: 'dj',
        raw: dj,
      });
    }

    const topEvent = events?.[0];
    if (topEvent) {
      const event = topEvent;
      list.push({
        id: `event-${event.id}`,
        badge: 'Upcoming Event',
        badgeIcon: 'sparkles',
        title: event.title,
        subtitle: `${event.city || 'Freetown'} • ${event.date ? formatDate(event.date) : 'Live'}`,
        image: event.coverImage || event.flyerImage || '/og-banner.png',
        cta: 'Get Tickets',
        link: `/events/${event.id}`,
        type: 'event',
        raw: event,
      });
    }

    if (list.length === 0) {
      list.push({
        id: 'deck-salone-default',
        badge: 'Welcome',
        badgeIcon: 'sparkles',
        title: 'Deck Salone',
        subtitle: "Sierra Leone's official DJ platform — discover, stream, and book the hottest DJs.",
        image: '/og-banner.png',
        cta: 'Discover DJs',
        link: '/discover',
        type: 'dj',
        raw: {} as HomeDJ,
      });
    }

    return list.slice(0, 6);
  }, [paidAds, mixes, djs, events]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nextSlide = useCallback(() => {
    setShowAdDropdown(false);
    setCurrentIndex((prev) => (slides.length ? (prev + 1) % slides.length : 0));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setShowAdDropdown(false);
    setCurrentIndex((prev) => (slides.length ? (prev - 1 + slides.length) % slides.length : 0));
  }, [slides.length]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (slides.length > 1 && !showAdDropdown) {
      timerRef.current = setInterval(nextSlide, 7000);
    }
  }, [nextSlide, slides.length, showAdDropdown]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  const currentSlide = slides[currentIndex];
  if (!currentSlide) return null;

  const handleCta = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If it's an ad, toggle the details dropdown without redirecting away
    if (currentSlide.type === 'ad') {
      setShowAdDropdown((prev) => !prev);
      return;
    }

    if (currentSlide.type === 'mix') {
      const mix = currentSlide.raw as HomeMix;
      if (mix.audioUrl) {
        play(
          {
            id: mix.id,
            title: mix.title,
            dj: mix.dj?.stageName || 'Deck Salone',
            audioUrl: mix.audioUrl,
            cover: mix.coverImage || '/mix-placeholder.jpg',
            genre: mix.genre || 'Afrobeats',
            duration: mix.duration || 1800,
          },
          0
        );
        return;
      }
    }
    navigate(currentSlide.link);
  };

  return (
    <section className="relative w-full bg-black overflow-hidden">
      <div className="relative min-h-[380px] sm:min-h-[440px] md:min-h-[480px] lg:min-h-[520px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0"
          >
            <OptimizedImage
              src={currentSlide.image ? getMediaUrl(currentSlide.image) : '/og-banner.png'}
              alt={currentSlide.title}
              width={1360}
              height={520}
              objectFit="cover"
              loading="eager"
              fetchpriority="high"
              fallbackSrc="/og-banner.png"
              containerClassName="absolute inset-0"
              className="absolute inset-0"
              placeholder="none"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
          <div className="max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-gold px-2.5 py-0.5 rounded-full bg-gold/10 border border-gold/30">
                  {currentSlide.badgeIcon === 'megaphone' ? (
                    <Megaphone className="w-3.5 h-3.5" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {currentSlide.badge}
                </span>

                <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl text-white uppercase tracking-tight leading-[0.95]">
                  {currentSlide.title}
                </h1>

                {/* Compact Teaser Text */}
                <p className="text-sm sm:text-base text-text-secondary max-w-lg line-clamp-2">
                  {currentSlide.subtitle}
                </p>

                {/* Main Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCta}
                    className="btn-press inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-gold hover:brightness-110 active:scale-95 text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-[0_0_24px_rgba(244,224,89,0.35)]"
                  >
                    {currentSlide.type === 'mix' ? (
                      <Play className="w-4 h-4 fill-black" />
                    ) : currentSlide.type === 'ad' ? (
                      showAdDropdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    <span>{currentSlide.cta}</span>
                  </button>
                </div>

                {/* ─── INLINE AD DROPDOWN CONTAINER (EXPANDS FULL DETAILS ON CLICK) ─── */}
                <AnimatePresence>
                  {showAdDropdown && currentSlide.type === 'ad' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      className="mt-4 p-5 rounded-2xl bg-black/90 border border-gold/40 backdrop-blur-xl shadow-2xl space-y-3 max-w-xl"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-gold">
                            Sponsored Campaign Overview
                          </span>
                          <h3 className="font-display font-bold text-base text-white uppercase">
                            {currentSlide.title}
                          </h3>
                        </div>
                        <button
                          onClick={() => setShowAdDropdown(false)}
                          className="p-1 rounded-full text-text-muted hover:text-white hover:bg-white/10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                        {currentSlide.description || currentSlide.subtitle}
                      </p>

                      {currentSlide.link && (
                        <div className="pt-2 flex items-center justify-between border-t border-white/10">
                          <a
                            href={currentSlide.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-gold hover:underline"
                          >
                            <span>Visit Sponsor Website</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setShowAdDropdown(false)}
                            className="text-xs text-text-muted hover:text-white"
                          >
                            Hide details ▴
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => {
                prevSlide();
                resetTimer();
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/10 bg-black/40 backdrop-blur text-white hover:text-gold hover:border-gold/50 flex items-center justify-center transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                nextSlide();
                resetTimer();
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/10 bg-black/40 backdrop-blur text-white hover:text-gold hover:border-gold/50 flex items-center justify-center transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setShowAdDropdown(false);
                setCurrentIndex(i);
                resetTimer();
              }}
              className={`rounded-full transition-all ${
                i === currentIndex
                  ? 'w-7 sm:w-8 h-1.5 sm:h-2 bg-gold shadow-[0_0_8px_rgba(244,224,89,0.8)]'
                  : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/25 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
