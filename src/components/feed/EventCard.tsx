import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import { getMediaUrl } from '@/lib/api';
import type { FeedEvent } from './types';

interface EventCardProps {
  event: FeedEvent;
  index?: number;
}

export default function EventCard({ event, index = 0 }: EventCardProps) {
  const flyer = event.flyerImage || event.coverImage ? getMediaUrl(event.flyerImage || event.coverImage) : null;
  const eventDate = event.date ? new Date(event.date) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link to={`/events/${event.id}`} className="block group h-full">
        <div className="h-full rounded-2xl bg-black-surface hover:bg-[#181818] border border-dark-gray hover:border-gold/40 p-4 transition-all flex flex-col">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
            {flyer ? (
              <img src={flyer} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gold/15 to-black">
                <Calendar className="w-10 h-10 text-gold mb-1" />
                <span className="text-[10px] text-gold font-bold uppercase">Event</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <span className="absolute bottom-2 left-2 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gold text-black">
              {eventDate ? eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Upcoming'}
            </span>
          </div>

          <div className="mt-3 flex-1 flex flex-col">
            <h3 className="font-display text-sm font-bold text-white group-hover:text-gold transition-colors truncate">
              {event.title}
            </h3>
            <p className="text-xs text-text-secondary flex items-center gap-1 mt-1 truncate">
              <MapPin className="w-3 h-3 text-gold shrink-0" />
              {event.venue || event.city || 'Sierra Leone'}
            </p>
            <div className="pt-3 mt-auto border-t border-white/[0.04] flex items-center justify-between">
              <span className="text-[10px] font-bold text-gold uppercase flex items-center gap-1">
                <Ticket className="w-3 h-3" /> Get Tickets
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
