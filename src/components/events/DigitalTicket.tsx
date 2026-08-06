import { QRCodeSVG } from 'qrcode.react';
import { Calendar, MapPin, Ticket, User, Clock } from 'lucide-react';

interface Props {
  ticket: any;
  event: any;
}

export default function DigitalTicket({ ticket, event }: Props) {
  const date = event?.date ? new Date(event.date) : null;
  const isCheckedIn = ticket?.status === 'checked_in';

  return (
    <div className="w-full max-w-sm mx-auto bg-black-surface border border-dark-gray rounded-2xl overflow-hidden shadow-2xl">
      {/* Event image header */}
      <div className="relative h-32 overflow-hidden">
        <img src={event?.image || '/placeholder.jpg'} alt={event?.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black-surface via-black/50 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <p className="text-[10px] text-gold uppercase tracking-wider font-bold flex items-center gap-1">
            <Ticket className="w-3 h-3" /> {ticket?.ticketType?.name || 'Ticket'}
          </p>
          <h3 className="font-display font-bold text-text-primary uppercase text-sm truncate">{event?.title}</h3>
        </div>
      </div>

      {/* Ticket body */}
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Ticket Number</p>
            <p className="font-mono text-gold font-bold">{ticket?.ticketNumber || 'DS-XXXX-XXXX'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Status</p>
            <p className={`text-xs font-bold uppercase ${isCheckedIn ? 'text-green' : ticket?.status === 'approved' ? 'text-gold' : 'text-orange'}`}>
              {isCheckedIn ? 'Checked In' : ticket?.status}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {date && (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Calendar className="w-3.5 h-3.5 text-gold" />
              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </div>
          )}
          {(event?.venue || event?.location) && (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <MapPin className="w-3.5 h-3.5 text-gold" />
              {event?.venue || event?.location}{event?.city ? `, ${event.city}` : ''}
            </div>
          )}
          {(ticket?.buyerName || ticket?.user?.name) && (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <User className="w-3.5 h-3.5 text-gold" />
              {ticket?.buyerName || ticket?.user?.name}
            </div>
          )}
          {ticket?.scannedAt && (
            <div className="flex items-center gap-2 text-xs text-green">
              <Clock className="w-3.5 h-3.5" />
              Checked in {new Date(ticket.scannedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* QR Code */}
        {ticket?.qrPayload && (
          <div className="flex flex-col items-center pt-2">
            <div className="p-3 bg-white rounded-xl">
              <QRCodeSVG value={ticket.qrPayload} size={180} level="H" includeMargin={false} />
            </div>
            <p className="text-[10px] text-text-muted mt-2 text-center">Show this QR code at the entrance</p>
          </div>
        )}
      </div>

      {/* Perforated edge effect */}
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-dark-gray" />
        <div className="absolute left-0 top-0 w-3 h-3 bg-black rounded-full -translate-x-1/2" />
        <div className="absolute right-0 top-0 w-3 h-3 bg-black rounded-full translate-x-1/2" />
      </div>

      <div className="px-5 pb-5 pt-1 text-center">
        <p className="text-[10px] text-text-muted">Deck Salone · {event?.dj?.stageName || 'Organizer'}</p>
      </div>
    </div>
  );
}
