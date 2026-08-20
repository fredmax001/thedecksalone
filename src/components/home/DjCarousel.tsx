import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Headphones } from 'lucide-react';
import type { CarouselApi } from '@/components/ui/carousel';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import SectionHeader from './SectionHeader';
import DjCard from './DjCard';
import type { HomeDJ } from './types';

interface DjCarouselProps {
  title?: string;
  subtitle?: string;
  djs: HomeDJ[];
  action?: { label: string; to: string };
}

export default function DjCarousel({
  title = 'Featured DJs',
  subtitle = 'Top talent from Sierra Leone',
  djs,
  action = { label: 'See all', to: '/discover' },
}: DjCarouselProps) {
  const apiRef = useRef<CarouselApi | null>(null);

  const scrollPrev = () => apiRef.current?.scrollPrev();
  const scrollNext = () => apiRef.current?.scrollNext();

  if (!djs || djs.length === 0) {
    return (
      <section className="space-y-1">
        <SectionHeader title={title} subtitle={subtitle} action={action} icon={<Headphones className="w-4 h-4" />} />
        <div className="rounded-2xl border border-dark-gray bg-black-surface p-8 text-center text-text-secondary text-sm">
          No DJs available yet.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <SectionHeader title={title} subtitle={subtitle} action={action} icon={<Headphones className="w-4 h-4" />} />
        <div className="hidden sm:flex items-center gap-1.5 mb-4 sm:mb-5">
          <button
            type="button"
            onClick={scrollPrev}
            className="w-8 h-8 rounded-full border border-dark-gray bg-black-surface text-text-secondary hover:text-gold hover:border-gold/50 flex items-center justify-center transition-colors"
            aria-label="Previous DJs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            className="w-8 h-8 rounded-full border border-dark-gray bg-black-surface text-text-secondary hover:text-gold hover:border-gold/50 flex items-center justify-center transition-colors"
            aria-label="Next DJs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Carousel
        setApi={(api) => (apiRef.current = api)}
        opts={{ align: 'start', loop: djs.length > 4, dragFree: true }}
        className="w-full"
      >
        <CarouselContent className="-ml-3 sm:-ml-4">
          {djs.map((dj, i) => (
            <CarouselItem key={dj.id} className="pl-3 sm:pl-4 basis-[42%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
              <DjCard dj={dj} variant="portrait" index={i} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
