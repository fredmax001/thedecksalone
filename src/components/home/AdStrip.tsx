import { useEffect, useState } from 'react';
import { Megaphone, ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMediaUrl } from '@/lib/api';
import type { CarouselApi } from '@/components/ui/carousel';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import SectionHeader from './SectionHeader';
import type { HomeAd } from './types';
import { cn } from '@/lib/utils';

interface AdStripProps {
  paidAds: HomeAd[];
}

export default function AdStrip({ paidAds }: AdStripProps) {
  const [api, setApi] = useState<CarouselApi | undefined>(undefined);
  const [current, setCurrent] = useState(0);
  const [expandedAdId, setExpandedAdId] = useState<string | null>(null);
  const count = api ? api.scrollSnapList().length : 0;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  // Auto scroll only if no ad is currently expanded
  useEffect(() => {
    if (paidAds.length <= 1 || expandedAdId !== null) return;
    const timer = setInterval(() => api?.scrollNext(), 6000);
    return () => clearInterval(timer);
  }, [api, paidAds.length, expandedAdId]);

  if (!paidAds || paidAds.length === 0) {
    return (
      <section className="space-y-1">
        <SectionHeader title="Sponsored" subtitle="Partner campaigns" icon={<Megaphone className="w-4 h-4" />} />
        <div className="rounded-2xl border border-dark-gray bg-black-surface p-8 text-center text-text-secondary text-sm">
          No sponsored campaigns right now.
        </div>
      </section>
    );
  }

  const toggleExpand = (adId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedAdId((prev) => (prev === adId ? null : adId));
  };

  return (
    <section className="space-y-3">
      <SectionHeader title="Sponsored" subtitle="Partner campaigns & events" icon={<Megaphone className="w-4 h-4 text-gold" />} />

      <Carousel
        setApi={setApi}
        opts={{ align: 'start', loop: paidAds.length > 1 }}
        className="w-full"
      >
        <CarouselContent className="-ml-3 sm:-ml-4 items-start">
          {paidAds.map((ad) => {
            const isExpanded = expandedAdId === String(ad.id);
            const rawImage = ad.creativeImageUrl || ad.bannerImage || ad.imageUrl || ad.advertiser?.avatar;
            const image = rawImage ? getMediaUrl(rawImage) : '/og-banner.png';
            const title = ad.name || ad.title || ad.campaignName || 'Featured Campaign';
            const description = ad.description || ad.subtitle || ad.tagline || 'Special promotion on Deck Salone.';
            const sponsorLink = ad.ctaUrl || ad.ctaLink || ad.linkUrl;

            return (
              <CarouselItem
                key={ad.id}
                className="pl-3 sm:pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
              >
                <div className="flex flex-col rounded-2xl overflow-hidden border border-dark-gray hover:border-gold/40 transition-all bg-[#121110] shadow-card">
                  {/* Main Compact Card */}
                  <div
                    onClick={(e) => toggleExpand(String(ad.id), e)}
                    className="relative h-44 sm:h-48 w-full overflow-hidden cursor-pointer group"
                  >
                    <img
                      src={image}
                      alt={title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/og-banner.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />

                    <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                      {/* Badge */}
                      <span className="self-start text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gold text-black shadow-md">
                        {ad.badge || 'Sponsored'}
                      </span>

                      {/* Title & Explore Button */}
                      <div className="space-y-2">
                        <h3 className="font-display font-black text-sm sm:text-base text-white uppercase tracking-tight line-clamp-1 group-hover:text-gold transition-colors">
                          {title}
                        </h3>

                        {/* Always fully visible, accessible Explore trigger button */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(String(ad.id), e)}
                            className={cn(
                              'btn-press inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95',
                              isExpanded
                                ? 'bg-gold text-black'
                                : 'bg-black/70 hover:bg-gold text-white hover:text-black border border-white/20 hover:border-gold'
                            )}
                          >
                            <span>{ad.ctaText || 'Explore'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ─── INLINE DROPDOWN FOR FULL AD DETAILS (NO PAGE REDIRECTION) ─── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="border-t border-gold/30 bg-[#181614] p-4 sm:p-5 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-gold uppercase tracking-wider">
                              Campaign Details
                            </span>
                            <h4 className="font-display font-bold text-sm sm:text-base text-white uppercase leading-snug">
                              {title}
                            </h4>
                          </div>
                          <button
                            onClick={(e) => toggleExpand(String(ad.id), e)}
                            className="p-1 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-colors shrink-0"
                            title="Close ad details"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                          {description}
                        </p>

                        {/* Optional External Sponsor Link (opens in new tab only if provided) */}
                        {sponsorLink && (
                          <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
                            <a
                              href={sponsorLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-gold hover:underline"
                            >
                              <span>Visit Sponsor Page</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={(e) => toggleExpand(String(ad.id), e)}
                              className="text-[11px] font-semibold text-text-muted hover:text-white"
                            >
                              Hide details ▴
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {count > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => api?.scrollTo(i)}
              className={`rounded-full transition-all ${
                i === current
                  ? 'w-5 h-1.5 bg-gold'
                  : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to ad ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
