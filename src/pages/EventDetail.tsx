import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Ticket,
  Music,
  Loader2,
} from 'lucide-react';
import { useEvent } from '@/hooks/useEvents';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEvent(id);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-red-400 font-medium">Event not found</p>
          <button
            onClick={() => navigate('/events')}
            className="mt-4 px-4 py-2 bg-gold-gradient text-black text-xs font-bold uppercase rounded-full hover:scale-[1.02] transition-transform"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const date = new Date(event.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="min-h-[100dvh] bg-black">
      {/* Back button */}
      <div className="max-w-container mx-auto px-6 pt-6">
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-text-muted hover:text-gold transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Back to Events
        </button>
      </div>

      {/* Hero Image */}
      <section className="max-w-container mx-auto px-6 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden border border-white/5"
          style={{ aspectRatio: '21/9' }}
        >
          <img
            src={event.image || '/placeholder.jpg'}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
            <span className="inline-block px-3 py-1 bg-gold text-black text-[10px] font-bold uppercase rounded-full mb-3">
              {event.type}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary uppercase tracking-tight">
              {event.title}
            </h1>
          </div>
        </motion.div>
      </section>

      {/* Details */}
      <section className="max-w-container mx-auto px-6 pt-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-text-secondary">
                <Calendar size={18} className="text-gold" />
                <span className="text-sm">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <MapPin size={18} className="text-gold" />
                <span className="text-sm">
                  {event.venue || event.location}
                  {event.city ? `, ${event.city}` : ''}
                </span>
              </div>
              {event.endTime && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Clock size={18} className="text-gold" />
                  <span className="text-sm">Ends at {event.endTime}</span>
                </div>
              )}
            </div>

            {event.description && (
              <div className="bg-black-elevated rounded-xl p-5 border border-white/5">
                <h3 className="font-display text-sm font-semibold text-text-primary uppercase mb-3">
                  About This Event
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            {event.dj && (
              <div className="bg-black-elevated rounded-xl p-5 border border-white/5">
                <h3 className="font-display text-sm font-semibold text-text-primary uppercase mb-3">
                  Featured DJ
                </h3>
                <button
                  onClick={() => navigate(`/dj/${event.dj.id}`)}
                  className="flex items-center gap-3 group"
                >
                  <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-lg border border-gold/30 overflow-hidden">
                    {event.dj.avatar ? (
                      <img src={event.dj.avatar} alt={event.dj.stageName} className="w-full h-full object-cover" />
                    ) : (
                      event.dj.stageName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-text-primary group-hover:text-gold transition-colors">
                      {event.dj.stageName}
                    </p>
                    <p className="text-xs text-text-muted">View Profile</p>
                  </div>
                </button>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="bg-black-elevated rounded-xl p-5 border border-white/5">
              <h3 className="font-display text-sm font-semibold text-text-primary uppercase mb-4">
                Get Tickets
              </h3>
              {event.ticketUrl ? (
                <a
                  href={event.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-gold-gradient text-black text-sm font-bold uppercase rounded-full hover:scale-[1.02] transition-transform"
                >
                  <Ticket size={16} />
                  Buy Tickets
                </a>
              ) : (
                <div className="text-center py-4">
                  <Music size={24} className="text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">No ticket link available</p>
                  <p className="text-xs text-text-muted mt-1">
                    Check back later or contact the organizer
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
