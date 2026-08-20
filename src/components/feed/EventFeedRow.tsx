import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import { getMediaUrl } from '@/lib/api';
import type { FeedEvent } from './types';

interface EventFeedRowProps {
  event: FeedEvent;
  index?: number;
}

export default function EventFeedRow({ event, index = 0 }: EventFeedRowProps) {
  const flyer = event.flyerImage || event.coverImage ? getMediaUrl(event.flyerImage || event.coverImage) : null;
  const eventDate = event.date ? new Date(event.date) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link to={`/events/${event.id}`} className="block group">
        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-black-surface hover:bg-[#181818] border border-dark-gray hover:border-gold/40 transition-all">
          <div className="relative w-20 h-14 sm:w-28 sm:h-18 rounded-xl overflow-hidden shrink-0 bg-black border border-white/10">
            {flyer ? (
              <img src={flyer} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gold/15 to-black">
                <Calendar className="w-6 h-6 text-gold" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-display text-sm sm:text-base font-bold text-white group-hover:text-gold transition-colors truncate">
              {event.title}
            </h3>
            <p className="text-xs text-text-secondary flex items-center gap-1 mt-1 truncate">
              <MapPin className="w-3 h-3 text-gold shrink-0" />
              {event.venue || event.city || 'Sierra Leone'}
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            <span className="text-xs font-mono text-gold">
              {eventDate ? eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Upcoming'}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gold/10 text-gold border border-gold/30 text-[10px] font-bold uppercase">
              <Ticket className="w-3 h-3" /> Tickets
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
