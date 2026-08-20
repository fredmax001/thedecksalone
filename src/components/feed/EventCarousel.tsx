import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import type { CarouselApi } from '@/components/ui/carousel';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import SectionHeader from '@/components/home/SectionHeader';
import EventCard from './EventCard';
import type { FeedEvent } from './types';

interface EventCarouselProps {
  title?: string;
  subtitle?: string;
  events: FeedEvent[];
  action?: { label: string; to: string };
}

export default function EventCarousel({
  title = 'Upcoming Events',
  subtitle = 'Get tickets to the hottest shows',
  events,
  action = { label: 'See all', to: '/events' },
}: EventCarouselProps) {
  const apiRef = useRef<CarouselApi | null>(null);

  if (!events || events.length === 0) {
    return (
      <section className="space-y-1">
        <SectionHeader title={title} subtitle={subtitle} action={action} icon={<Calendar className="w-4 h-4" />} />
        <div className="rounded-2xl border border-dark-gray bg-black-surface p-8 text-center text-text-secondary text-sm">
          No events available yet.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <SectionHeader title={title} subtitle={subtitle} action={action} icon={<Calendar className="w-4 h-4" />} />
        <div className="hidden sm:flex items-center gap-1.5 mb-4 sm:mb-5">
          <button
            type="button"
            onClick={() => apiRef.current?.scrollPrev()}
            className="w-8 h-8 rounded-full border border-dark-gray bg-black-surface text-text-secondary hover:text-gold hover:border-gold/50 flex items-center justify-center transition-colors"
            aria-label="Previous events"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => apiRef.current?.scrollNext()}
            className="w-8 h-8 rounded-full border border-dark-gray bg-black-surface text-text-secondary hover:text-gold hover:border-gold/50 flex items-center justify-center transition-colors"
            aria-label="Next events"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Carousel
        setApi={(api) => (apiRef.current = api)}
        opts={{ align: 'start', loop: events.length > 2, dragFree: true }}
        className="w-full"
      >
        <CarouselContent className="-ml-3 sm:-ml-4">
          {events.map((event, i) => (
            <CarouselItem key={event.id} className="pl-3 sm:pl-4 basis-[85%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
              <EventCard event={event} index={i} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
