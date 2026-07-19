import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CheckCircle2,
  Ticket,
  Loader2,
  Upload,
  Smartphone,
  X,
  Users,
  Images,
  Bell,
} from 'lucide-react';
import { useEvent } from '@/hooks/useEvents';
import { imageFallback } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

// ─── Countdown Component ───────────────────────────────────────────────────────
function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    const calc = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        isPast: false,
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[56px]">
      <div className="w-14 h-14 rounded-xl bg-black-elevated border border-gold/20 flex items-center justify-center">
        <span className="font-display text-xl font-bold text-gold tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] text-text-muted uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}

// ─── Buy Ticket Modal ─────────────────────────────────────────────────────────
function BuyTicketModal({
  event,
  onClose,
  onSuccess,
}: {
  event: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file) { toast.error('Please upload your payment screenshot'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('screenshot', file);
      await api.post(`/events/${event.id}/tickets`, fd);
      toast.success('Ticket request submitted! The DJ will review your payment.');
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4 pb-4 sm:pb-0">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-md bg-black-surface rounded-2xl border border-gold/20 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-text-primary text-lg">Buy Ticket</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* Price */}
        <div className="rounded-xl bg-black-elevated border border-white/5 p-4 mb-5">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Ticket Price</p>
          <p className="text-2xl font-bold text-text-primary">
            {event.ticketCurrency || 'SLE'} {event.ticketPrice?.toLocaleString()}
          </p>
        </div>

        {/* Payment Instructions */}
        <div className="rounded-xl bg-orange/10 border border-orange/20 p-4 mb-5">
          <p className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-orange" />
            {event.mobileMoneyProvider || 'Mobile Money'} Payment
          </p>
          <p className="text-xs text-text-muted mb-1">Send payment to:</p>
          <p className="font-mono text-xl text-text-primary font-bold">{event.mobileMoneyNumber}</p>
          <p className="text-xs text-text-muted mt-2">
            After paying, take a screenshot of the confirmation and upload it below.
          </p>
        </div>

        {/* Upload */}
        <label className="block cursor-pointer mb-4">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
          />
          <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
            file ? 'border-gold/40 bg-gold/5' : 'border-white/10 hover:border-gold/20'
          }`}>
            {file ? (
              <p className="text-sm text-gold font-semibold">✓ {file.name}</p>
            ) : (
              <>
                <Upload className="w-6 h-6 text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-muted">Upload payment screenshot</p>
              </>
            )}
          </div>
        </label>

        <button
          onClick={handleSubmit}
          disabled={loading || !file}
          className="w-full py-3 bg-gold-gradient text-black font-bold uppercase rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Submitting...' : 'Submit Payment Proof'}
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: event, isLoading, error, refetch } = useEvent(id);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [localRsvp, setLocalRsvp] = useState<boolean | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const date = event ? new Date(event.date) : new Date();
  const countdown = useCountdown(date);
  const isPastEvent = date < new Date();
  const isUpcoming = !isPastEvent;
  const isTicketedEvent = event?.isTicketed;

  const handleRsvp = async () => {
    if (!user) { toast.error('Please log in to RSVP'); return; }
    setRsvpLoading(true);
    try {
      const res = await api.post(`/events/${id}/rsvp`);
      const rsvped = res.data.data.rsvped;
      setLocalRsvp(rsvped);
      toast.success(rsvped ? '✅ RSVP confirmed!' : 'RSVP cancelled');
      refetch?.();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to RSVP');
    } finally {
      setRsvpLoading(false);
    }
  };

  const userRsvped = localRsvp !== null ? localRsvp : event?.userRsvp;
  const userTicket = event?.userTicket;

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

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  const rsvpCount = event._count?.rsvps ?? 0;
  const gallery = event.gallery ?? [];

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
          className="relative rounded-2xl overflow-hidden border border-white/5 aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]"
        >
          <img
            src={event.image || '/placeholder.jpg'}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-block px-3 py-1 bg-gold text-black text-[10px] font-bold uppercase rounded-full">
                {event.type}
              </span>
              {isTicketedEvent && (
                <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur border border-white/20 text-white text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                  <Ticket size={10} /> Ticketed
                </span>
              )}
              {isPastEvent && (
                <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur border border-white/20 text-white/70 text-[10px] font-bold uppercase rounded-full">
                  Past Event
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary uppercase tracking-tight">
              {event.title}
            </h1>
          </div>
        </motion.div>
      </section>

      {/* Countdown (only for upcoming events) */}
      {isUpcoming && !countdown.isPast && (
        <section className="max-w-container mx-auto px-6 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl bg-black-surface border border-gold/15 p-5 flex flex-col items-center"
          >
            <p className="text-xs text-text-muted uppercase tracking-widest mb-4">Event starts in</p>
            <div className="flex items-center gap-3">
              <CountdownBlock value={countdown.days} label="Days" />
              <span className="text-gold text-2xl font-bold pb-4">:</span>
              <CountdownBlock value={countdown.hours} label="Hrs" />
              <span className="text-gold text-2xl font-bold pb-4">:</span>
              <CountdownBlock value={countdown.minutes} label="Min" />
              <span className="text-gold text-2xl font-bold pb-4">:</span>
              <CountdownBlock value={countdown.seconds} label="Sec" />
            </div>
          </motion.div>
        </section>
      )}

      {/* Details */}
      <section className="max-w-container mx-auto px-6 pt-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
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
              {rsvpCount > 0 && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Users size={18} className="text-gold" />
                  <span className="text-sm">{rsvpCount} {rsvpCount === 1 ? 'person' : 'people'} going</span>
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
                      <img src={event.dj.avatar} alt={event.dj.stageName} onError={imageFallback} className="w-full h-full object-cover" />
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

            {/* Event Gallery (for past events) */}
            {isPastEvent && gallery.length > 0 && (
              <div className="bg-black-elevated rounded-xl p-5 border border-white/5">
                <h3 className="font-display text-sm font-semibold text-text-primary uppercase mb-4 flex items-center gap-2">
                  <Images size={16} className="text-gold" /> Event Gallery
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {gallery.map((photo: any) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhoto(photo.url)}
                      className="relative aspect-square rounded-lg overflow-hidden group"
                    >
                      <img src={photo.url} alt={photo.caption || 'Event photo'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-[10px] truncate">{photo.caption}</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right column: Ticketing / RSVP sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 order-first lg:order-none"
          >
            {/* USER'S APPROVED TICKET: Show QR */}
            {userTicket && userTicket.status === 'approved' && (
              <div className="bg-black-elevated rounded-xl p-5 border border-green/20 text-center">
                <div className="w-8 h-8 rounded-full bg-green/20 mx-auto flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green" />
                </div>
                <p className="text-sm font-bold text-green mb-1">Ticket Approved!</p>
                <p className="text-xs text-text-muted mb-4">Show this QR code at the door</p>
                <div className="bg-white rounded-xl p-4 inline-block mx-auto">
                  <QRCodeSVG value={userTicket.qrCode!} size={160} level="H" />
                </div>
                <p className="text-[10px] text-text-muted mt-3 font-mono break-all">{userTicket.qrCode}</p>
              </div>
            )}

            {/* USER'S PENDING TICKET */}
            {userTicket && userTicket.status === 'pending' && (
              <div className="bg-black-elevated rounded-xl p-5 border border-orange/20">
                <p className="text-sm font-bold text-orange flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Ticket Pending
                </p>
                <p className="text-xs text-text-muted mt-2">
                  Your payment screenshot is being reviewed. You'll receive a notification when it's approved.
                </p>
              </div>
            )}

            {/* USER'S SCANNED TICKET */}
            {userTicket && userTicket.status === 'scanned' && (
              <div className="bg-black-elevated rounded-xl p-5 border border-white/10 text-center">
                <CheckCircle2 className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-sm font-bold text-text-muted">Ticket Used</p>
                <p className="text-xs text-text-muted mt-1">This ticket has been scanned at the event.</p>
              </div>
            )}

            {/* BUY TICKET (if ticketed, upcoming, no existing ticket) */}
            {isTicketedEvent && isUpcoming && !userTicket && (
              <div className="bg-black-elevated rounded-xl p-5 border border-white/5">
                <h3 className="font-display text-sm font-semibold text-text-primary uppercase mb-4 flex items-center gap-2">
                  <Ticket size={14} className="text-gold" /> Get Your Ticket
                </h3>
                <div className="mb-4">
                  <p className="text-xs text-text-muted">Price</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {event.ticketCurrency || 'SLE'} {event.ticketPrice?.toLocaleString()}
                  </p>
                </div>
                {user ? (
                  <button
                    onClick={() => setShowBuyModal(true)}
                    className="w-full py-3 bg-gold-gradient text-black text-sm font-bold uppercase rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Ticket size={16} />
                    Buy Ticket
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="block w-full py-3 bg-gold-gradient text-black text-sm font-bold uppercase rounded-xl text-center"
                  >
                    Log in to Buy
                  </Link>
                )}
              </div>
            )}

            {/* RSVP (if not ticketed, upcoming) */}
            {!isTicketedEvent && isUpcoming && (
              <div className="bg-black-elevated rounded-xl p-5 border border-white/5">
                <h3 className="font-display text-sm font-semibold text-text-primary uppercase mb-4 flex items-center gap-2">
                  <Bell size={14} className="text-gold" /> RSVP to This Event
                </h3>
                <p className="text-xs text-text-muted mb-4">
                  {rsvpCount > 0 ? `${rsvpCount} people are going. ` : ''}
                  Let the organizer know you're attending.
                </p>
                {user ? (
                  <button
                    onClick={handleRsvp}
                    disabled={rsvpLoading}
                    className={`w-full py-3 text-sm font-bold uppercase rounded-xl flex items-center justify-center gap-2 transition-all ${
                      userRsvped
                        ? 'bg-green/15 border border-green/30 text-green hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                        : 'bg-gold-gradient text-black hover:opacity-90'
                    }`}
                  >
                    {rsvpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {userRsvped ? '✓ You\'re Going (click to cancel)' : 'RSVP – I\'m Going!'}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="block w-full py-3 bg-gold-gradient text-black text-sm font-bold uppercase rounded-xl text-center"
                  >
                    Log in to RSVP
                  </Link>
                )}
              </div>
            )}

            {/* Old ticket URL fallback */}
            {event.ticketUrl && !isTicketedEvent && (
              <div className="bg-black-elevated rounded-xl p-5 border border-white/5">
                <h3 className="font-display text-sm font-semibold text-text-primary uppercase mb-4">
                  Get Tickets
                </h3>
                <a
                  href={event.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-gold-gradient text-black text-sm font-bold uppercase rounded-full hover:scale-[1.02] transition-transform"
                >
                  <Ticket size={16} />
                  Buy Tickets
                </a>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Buy Ticket Modal */}
      <AnimatePresence>
        {showBuyModal && (
          <BuyTicketModal
            event={event}
            onClose={() => setShowBuyModal(false)}
            onSuccess={() => { refetch?.(); }}
          />
        )}
      </AnimatePresence>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          >
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <X className="w-5 h-5 text-white" />
            </button>
            <img src={selectedPhoto} alt="" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
