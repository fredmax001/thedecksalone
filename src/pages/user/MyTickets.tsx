import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Ticket, X, Calendar, MapPin, QrCode, Download, Share2 } from 'lucide-react';
import { useMyTickets } from '@/hooks/useEventTicketing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DigitalTicket from '@/components/events/DigitalTicket';
import { formatEventDate } from '@/lib/dateTime';
import { toast } from 'sonner';

const statusColor: Record<string, string> = {
  pending: 'bg-orange/15 text-orange border-orange/30',
  approved: 'bg-green/15 text-green border-green/30',
  checked_in: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  cancelled: 'bg-text-muted/15 text-text-muted border-white/10',
};

export default function MyTickets() {
  const navigate = useNavigate();
  const { data: tickets, isLoading } = useMyTickets();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">My Tickets</h1>
          <p className="text-sm text-text-muted mt-1">Your ticket history and digital passes</p>
        </div>
      </div>

      {tickets?.length === 0 ? (
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="py-12 text-center">
            <Ticket className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary mb-2">No tickets yet</p>
            <p className="text-sm text-text-muted mb-4">Browse events and purchase tickets to see them here.</p>
            <Button className="bg-gold-gradient text-black" onClick={() => navigate('/events')}>
              Browse Events
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tickets?.map((ticket: any) => {
            const event = ticket.event;
            const date = event?.date ? new Date(event.date) : null;
            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black-surface border border-dark-gray rounded-xl overflow-hidden hover:border-gold/30 transition-colors cursor-pointer"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="relative h-36 overflow-hidden">
                  <img src={event?.image || '/placeholder.jpg'} alt={event?.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black-surface via-black/50 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <Badge className={`text-[10px] ${statusColor[ticket.status] || 'bg-white/5 text-text-muted'}`}>
                      {ticket.status === 'checked_in' ? 'Checked In' : ticket.status}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4">
                    <p className="font-display font-bold text-text-primary uppercase text-sm truncate">{event?.title}</p>
                    <p className="text-[10px] text-gold flex items-center gap-1 mt-0.5">
                      <Ticket className="w-3 h-3" /> {ticket.ticketType?.name}
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {date && (
                    <p className="text-xs text-text-secondary flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gold" />
                      {formatEventDate(date)}
                    </p>
                  )}
                  {(event?.venue || event?.location) && (
                    <p className="text-xs text-text-secondary flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gold" />
                      {event?.venue || event?.location}{event?.city ? `, ${event.city}` : ''}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <p className="font-mono text-xs text-gold">{ticket.ticketNumber}</p>
                    <QrCode className="w-5 h-5 text-gold" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Ticket detail modal */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-md"
            >
              <button
                onClick={() => setSelectedTicket(null)}
                className="absolute -top-10 right-0 p-2 text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <DigitalTicket ticket={selectedTicket} event={selectedTicket.event} />
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-dark-gray text-text-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/events/${selectedTicket.event.id}`);
                    toast.success('Event link copied');
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
                <Button
                  className="flex-1 bg-gold-gradient text-black"
                  onClick={() => toast.info('Download feature coming soon')}
                >
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}