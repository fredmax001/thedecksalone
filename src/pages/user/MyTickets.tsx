import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, X, Calendar, MapPin, QrCode, Download, Share2 } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { useMyTickets } from '@/hooks/useEventTicketing';
import { DashboardSkeleton } from '@/components/ui/page-skeletons';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DigitalTicket from '@/components/events/DigitalTicket';
import { formatEventDate } from '@/lib/dateTime';
import { toast } from 'sonner';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

// Opens a standalone printable ticket card in a new tab (user can print / save as PDF).
function printTicket(ticket: any) {
  const event = ticket.event;
  const qrValue = ticket.qrPayload || `DS-TICKET:${ticket.id}:${ticket.ticketNumber}`;
  const qrSvg = renderToStaticMarkup(
    <QRCodeSVG value={qrValue} size={200} level="H" includeMargin={false} />
  );
  const date = event?.date ? formatEventDate(new Date(event.date)) : '';
  const venue = [event?.venue || event?.location, event?.city].filter(Boolean).join(', ');
  const attendee = ticket.buyerName || ticket.user?.name || '';
  const organizer = event?.dj?.stageName || 'Deck Salone';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Ticket ${escapeHtml(ticket.ticketNumber || '')} — ${escapeHtml(event?.title || 'Deck Salone')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f4f4f4; color: #111; display: flex; flex-direction: column; align-items: center; padding: 24px; }
  .no-print { margin-bottom: 16px; }
  .no-print button { background: #111; color: #fff; border: 0; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .ticket { width: 340px; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
  .ticket img.banner { width: 100%; height: 140px; object-fit: cover; display: block; }
  .body { padding: 20px; }
  .label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #777; }
  .title { font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 4px 0 12px; }
  .row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
  .row .value { font-weight: 600; text-align: right; word-break: break-word; }
  .qr { text-align: center; padding: 16px 0 8px; }
  .qr svg { width: 200px; height: 200px; }
  .hint { font-size: 11px; color: #777; text-align: center; }
  .divider { border-top: 2px dashed #ddd; margin: 12px 0; }
  .footer { text-align: center; font-size: 11px; color: #777; padding: 0 20px 16px; }
  @media print {
    body { background: #fff; padding: 0; }
    .no-print { display: none; }
    .ticket { box-shadow: none; border: 1px solid #ddd; }
  }
</style>
</head>
<body>
  <div class="no-print"><button onclick="window.print()">Print / Save as PDF</button></div>
  <div class="ticket">
    ${event?.image ? `<img class="banner" src="${escapeHtml(event.image)}" alt="" />` : ''}
    <div class="body">
      <p class="label">${escapeHtml(ticket.ticketType?.name || 'Ticket')}</p>
      <h1 class="title">${escapeHtml(event?.title || 'Deck Salone Event')}</h1>
      <div class="row"><span class="label">Ticket No.</span><span class="value" style="font-family: monospace;">${escapeHtml(ticket.ticketNumber || '')}</span></div>
      ${attendee ? `<div class="row"><span class="label">Attendee</span><span class="value">${escapeHtml(attendee)}</span></div>` : ''}
      ${date ? `<div class="row"><span class="label">Date</span><span class="value">${escapeHtml(date)}</span></div>` : ''}
      ${venue ? `<div class="row"><span class="label">Venue</span><span class="value">${escapeHtml(venue)}</span></div>` : ''}
      <div class="row"><span class="label">Status</span><span class="value">${escapeHtml(ticket.status === 'checked_in' ? 'Checked In' : ticket.status || '')}</span></div>
      <div class="divider"></div>
      <div class="qr">${qrSvg}</div>
      <p class="hint">${ticket.status === 'pending' ? 'Pending approval — this code activates once the organizer approves your order.' : 'Show this QR code at the entrance'}</p>
    </div>
    <div class="footer">Deck Salone · ${escapeHtml(organizer)}</div>
  </div>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    toast.error('Unable to open the ticket. Please allow pop-ups for this site and try again.');
    return;
  }
  // Give the new tab time to load before releasing the blob URL.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

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

  const showSkeleton = useDelayedLoading(isLoading);

  if (isLoading) {
    return showSkeleton ? <DashboardSkeleton /> : null;
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
                  onClick={() => printTicket(selectedTicket)}
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