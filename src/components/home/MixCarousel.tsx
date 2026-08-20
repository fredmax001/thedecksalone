import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import type { CarouselApi } from '@/components/ui/carousel';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import SectionHeader from './SectionHeader';
import MixCard from './MixCard';
import type { HomeMix } from './types';

interface MixCarouselProps {
  title?: string;
  subtitle?: string;
  mixes: HomeMix[];
  action?: { label: string; to: string };
}

export default function MixCarousel({
  title = 'Trending Mixes',
  subtitle = 'Hottest DJ sets right now',
  mixes,
  action = { label: 'See all', to: '/mixes' },
}: MixCarouselProps) {
  const apiRef = useRef<CarouselApi | null>(null);

  const scrollPrev = () => apiRef.current?.scrollPrev();
  const scrollNext = () => apiRef.current?.scrollNext();

  if (!mixes || mixes.length === 0) {
    return (
      <section className="space-y-1">
        <SectionHeader title={title} subtitle={subtitle} action={action} icon={<Flame className="w-4 h-4" />} />
        <div className="rounded-2xl border border-dark-gray bg-black-surface p-8 text-center text-text-secondary text-sm">
          No mixes available yet.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <SectionHeader title={title} subtitle={subtitle} action={action} icon={<Flame className="w-4 h-4" />} />
        <div className="hidden sm:flex items-center gap-1.5 mb-4 sm:mb-5">
          <button
            type="button"
            onClick={scrollPrev}
            className="w-8 h-8 rounded-full border border-dark-gray bg-black-surface text-text-secondary hover:text-gold hover:border-gold/50 flex items-center justify-center transition-colors"
            aria-label="Previous mixes"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className="w-8 h-8 rounded-full border border-dark-gray bg-black-surface text-text-secondary hover:text-gold hover:border-gold/50 flex items-center justify-center transition-colors"
            aria-label="Next mixes"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Carousel
        setApi={(api) => (apiRef.current = api)}
        opts={{ align: 'start', loop: mixes.length > 3, dragFree: true }}
        className="w-full"
      >
        <CarouselContent className="-ml-3 sm:-ml-4">
          {mixes.map((mix, i) => (
            <CarouselItem key={mix.id} className="pl-3 sm:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
              <MixCard mix={mix} index={i} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
