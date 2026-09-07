import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Calendar, CheckCircle2, Ticket, Loader2, Upload,
  Smartphone, X, Users, Images, Bell, Minus, Plus, LayoutDashboard, ScanLine, Lock, Copy, Check
} from 'lucide-react';
import { useEvent } from '@/hooks/useEvents';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { imageFallback } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { api, getMediaUrl } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useEventAvailability, usePurchaseTicket } from '@/hooks/useEventTicketing';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  ticketTypes,
  onClose,
  onSuccess,
}: {
  event: any;
  ticketTypes: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedType, setSelectedType] = useState<any>(ticketTypes[0]);
  const [quantity, setQuantity] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const purchase = usePurchaseTicket(event.id);

  const total = selectedType.price * quantity;
  const isFree = total === 0;

  const handleSubmit = async () => {
    if (!isFree && !file) { toast.error('Please upload your payment screenshot'); return; }
    try {
      const payload: any = {
        ticketTypeId: selectedType.id,
        quantity,
        buyerName: buyerName ? buyerName.trim() : undefined,
        buyerEmail: buyerEmail ? buyerEmail.trim() : undefined,
        buyerPhone: buyerPhone ? buyerPhone.trim() : undefined,
        notes: notes ? notes.trim() : undefined,
      };
      if (!isFree && file) {
        const fd = new FormData();
        fd.append('ticketTypeId', selectedType.id);
        fd.append('quantity', String(quantity));
        if (buyerName) fd.append('buyerName', buyerName.trim());
        if (buyerEmail) fd.append('buyerEmail', buyerEmail.trim());
        if (buyerPhone) fd.append('buyerPhone', buyerPhone.trim());
        if (notes) fd.append('notes', notes.trim());
        fd.append('screenshot', file);
        await api.post(`/events/${event.id}/ticketing/purchase`, fd);
      } else {
        await purchase.mutateAsync(payload);
      }
      toast.success(isFree ? 'Ticket reserved!' : 'Ticket request submitted! The organizer will review your payment.');
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error('Ticket purchase failed:', e);
      const detailMsg = e.response?.data?.details
        ? Object.entries(e.response.data.details)
            .map(([k, v]) => `${k}: ${(v as any[]).join(', ')}`)
            .join(' | ')
        : e.response?.data?.error;
      toast.error('Failed to submit ticket request', {
        description: detailMsg || 'Please verify your details and try again.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4 pb-4 sm:pb-0">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-md bg-black-surface rounded-2xl border border-gold/20 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-text-primary text-lg">Get Ticket</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* Ticket type selector */}
        <div className="space-y-2 mb-5">
          {ticketTypes.map((type: any) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${
                selectedType?.id === type.id ? 'border-gold bg-gold/10' : 'border-dark-gray hover:border-gold/30'
              }`}
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-text-primary">{type.name}</p>
                <p className="text-xs text-text-muted">{type.description || ''}</p>
              </div>
              <p className="text-sm font-bold text-gold">{formatCurrency(type.price, type.currency)}</p>
            </button>
          ))}
        </div>

        {/* Quantity */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-text-secondary">Quantity</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="btn-press-subtle w-8 h-8 rounded-lg bg-black-elevated border border-dark-gray text-text-primary flex items-center justify-center hover:border-gold/50">
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-8 text-center text-text-primary font-bold">{quantity}</span>
            <button onClick={() => setQuantity(q => Math.min(selectedType.maxPerOrder, q + 1))} className="btn-press-subtle w-8 h-8 rounded-lg bg-black-elevated border border-dark-gray text-text-primary flex items-center justify-center hover:border-gold/50">
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Buyer details */}
        <div className="space-y-3 mb-5">
          <div>
            <Label className="text-text-secondary text-xs uppercase">Name</Label>
            <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Attendee name" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
          </div>
          <div>
            <Label className="text-text-secondary text-xs uppercase">Email</Label>
            <Input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="attendee@email.com" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
          </div>
          <div>
            <Label className="text-text-secondary text-xs uppercase">Phone</Label>
            <Input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="+232..." className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
          </div>
        </div>

        <div className="mb-5">
          <Label className="text-text-secondary text-xs uppercase">Notes for Organizer</Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests..."
            className="w-full mt-1 bg-black-elevated border border-dark-gray text-text-primary rounded-md px-3 py-2 text-sm min-h-[60px]"
          />
        </div>

        {/* Price */}
        <div className="rounded-xl bg-black-elevated border border-white/5 p-4 mb-5">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Total</p>
          <p className="text-2xl font-bold text-text-primary">
            {formatCurrency(total, selectedType.currency)}
          </p>
        </div>

        {/* Payment Instructions (paid only) */}
        {!isFree && event.mobileMoneyNumber && (
          <div className="rounded-xl bg-orange/10 border border-orange/20 p-4 mb-5">
            <p className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-orange" />
              {event.mobileMoneyProvider || 'Mobile Money'} Payment
            </p>
            <p className="text-xs text-text-muted mb-1">Send payment to:</p>
            <p className="font-mono text-xl text-text-primary font-bold">{event.mobileMoneyNumber}</p>
            <p className="text-xs text-text-muted mt-2">After paying, take a screenshot of the confirmation and upload it below.</p>
          </div>
        )}

        {/* Upload (paid only) */}
        {!isFree && (
          <label className="block cursor-pointer mb-4">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
            <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${file ? 'border-gold/40 bg-gold/5' : 'border-white/10 hover:border-gold/20'}`}>
              {file ? <p className="text-sm text-gold font-semibold">✓ {file.name}</p> : <><Upload className="w-6 h-6 text-text-muted mx-auto mb-2" /><p className="text-sm text-text-muted">Upload payment screenshot</p></>}
            </div>
          </label>
        )}

        <button
          onClick={handleSubmit}
          disabled={purchase.isPending || (!isFree && !file)}
          className="w-full py-3 bg-gold-gradient text-black font-bold uppercase rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {purchase.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isFree ? 'Reserve Free Ticket' : 'Submit Payment Proof'}
        </button>
      </motion.div>
    </div>
  );
}

import ShareButton from '@/components/ShareButton';
import { formatCurrency } from '@/lib/formatting';
import { getApiErrorMessage } from '@/lib/apiErrors';

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: event, isLoading, error, refetch } = useEvent(id);
  const { data: availability } = useEventAvailability(id);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [localRsvp, setLocalRsvp] = useState<boolean | null>(null);
  const [localRsvpCount, setLocalRsvpCount] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const date = event ? new Date(event.date) : new Date();
  const countdown = useCountdown(date);
  const isPastEvent = date < new Date();
  const isUpcoming = !isPastEvent;
  const isTicketedEvent = event?.isTicketed;
  const ticketTypes = availability?.ticketTypes || event?.ticketTypes || [];

  const handleRsvp = async () => {
    if (!user) { toast.error('Please log in to RSVP'); return; }
    if (rsvpLoading) return; // prevent double-toggle while in flight
    // Optimistic update: flip attending state and count immediately
    const previousRsvp = localRsvp !== null ? localRsvp : !!event?.userRsvp;
    const previousCount = localRsvpCount !== null ? localRsvpCount : (event?._count?.rsvps ?? 0);
    const nextRsvp = !previousRsvp;
    setRsvpLoading(true);
    setLocalRsvp(nextRsvp);
    setLocalRsvpCount(Math.max(0, previousCount + (nextRsvp ? 1 : -1)));
    try {
      const res = await api.post(`/events/${id}/rsvp`);
      const rsvped = res.data.data.rsvped;
      setLocalRsvp(rsvped);
      toast.success(rsvped ? '✅ RSVP confirmed!' : 'RSVP cancelled');
      refetch?.();
    } catch (e: any) {
      // Restore previous state on failure
      setLocalRsvp(previousRsvp);
      setLocalRsvpCount(previousCount);
      toast.error('Could not update RSVP: ' + getApiErrorMessage(e, 'Failed to RSVP'));
    } finally {
      setRsvpLoading(false);
    }
  };

  const userRsvped = localRsvp !== null ? localRsvp : event?.userRsvp;
  // New system supports multiple tickets; show first relevant one
  const userTickets = event?.userTickets || (event?.userTicket ? [event.userTicket] : []);
  const primaryTicket = userTickets[0];

  const showSkeleton = useDelayedLoading(isLoading);
  if (isLoading && showSkeleton) return <PageSkeleton />;
  if (isLoading) return null;

  if (error || !event) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-red-400 font-medium">Event not found</p>
          <button onClick={() => navigate('/events')} className="mt-4 px-4 py-2 bg-gold-gradient text-black text-xs font-bold uppercase rounded-full hover:scale-[1.02] transition-transform">
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  const rsvpCount = localRsvpCount !== null ? localRsvpCount : (event._count?.rsvps ?? 0);
  const gallery = event.gallery ?? [];

  const isOrganizer = !!(
    user &&
    (event?.isOwner ||
      (user.djProfile && event?.djId === user.djProfile.id) ||
      (event?.dj?.userId && user.id === event.dj.userId) ||
      event?.djId === user.id ||
      ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(user.role))
  );

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffCopied, setStaffCopied] = useState(false);

  const handleCopyStaffInvite = () => {
    const link = `${window.location.origin}/events/${event.id}/onsite`;
    const username = event.onsiteUsername || 'staff';
    const password = event.onsitePassword || '(Not set yet)';
    const text = `Sound It Salone On-Site Staff Access:\nEvent: ${event.title}\nEvent Code: ${event.eventCode || event.id}\nEvent Link: ${link}\nUsername: ${username}\nPassword: ${password}`;
    navigator.clipboard.writeText(text);
    setStaffCopied(true);
    setTimeout(() => setStaffCopied(false), 2000);
    toast.success('Staff invite copied! (Event Link - Username - Password)');
  };

  return (
    <div className="min-h-[100dvh] bg-black">
      {/* Back button & Share */}
      <div className="max-w-container mx-auto px-6 pt-6 flex items-center justify-between">
        <button onClick={() => navigate('/events')} className="btn-press-subtle flex items-center gap-2 text-text-muted hover:text-gold transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Events
        </button>
        <ShareButton
          url={window.location.href}
          title={event.title}
          description={event.description}
          preview={{
            type: "event",
            title: event.title,
            image: event.image || event.coverImage,
            date: event.date,
            venue: event.venue || event.location,
            city: event.city,
            djName: event.dj?.stageName,
            djAvatar: event.dj?.avatar,
          }}
          size="md"
        />
      </div>

      {/* ORGANIZER TOOLBAR */}
      {isOrganizer && (
        <section className="max-w-container mx-auto px-6 pt-4">
          <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                <LayoutDashboard size={14} /> You are managing this event
              </p>
              <p className="text-xs text-text-muted mt-0.5">Access your live event dashboard, tickets, door scanner, and gate staff tools.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/dashboard/events/${event.id}`}>
                <button className="px-3 py-1.5 bg-gold text-black font-bold text-xs rounded-lg hover:bg-gold/90 transition-colors flex items-center gap-1.5">
                  <LayoutDashboard size={13} /> Dashboard
                </button>
              </Link>
              {isTicketedEvent && (
                <>
                  <Link to={`/dashboard/events/${event.id}/tickets`}>
                    <button className="px-3 py-1.5 bg-black/60 border border-white/20 text-white font-semibold text-xs rounded-lg hover:border-gold hover:text-gold transition-colors flex items-center gap-1.5">
                      <Users size={13} /> Guest List
                    </button>
                  </Link>
                  <Link to={`/dashboard/events/${event.id}/scan`}>
                    <button className="px-3 py-1.5 bg-black/60 border border-white/20 text-white font-semibold text-xs rounded-lg hover:border-gold hover:text-gold transition-colors flex items-center gap-1.5">
                      <ScanLine size={13} /> Scanner
                    </button>
                  </Link>
                  <button
                    onClick={() => setStaffModalOpen(true)}
                    className="px-3 py-1.5 bg-black/60 border border-gold/40 text-gold font-semibold text-xs rounded-lg hover:bg-gold/20 transition-colors flex items-center gap-1.5"
                  >
                    <Lock size={13} /> On-Site Staff Link
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* On-Site Staff Modal */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-black-surface border border-gold/30 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-text-primary text-base uppercase flex items-center gap-2">
                <Lock size={16} className="text-gold" /> On-Site Door Staff Access
              </h3>
              <button onClick={() => setStaffModalOpen(false)} className="p-1 text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Share these credentials with your gate staff, bouncers, or usher team to let them scan tickets and check in guests.
            </p>

            <div className="space-y-2.5 bg-black-elevated p-3.5 rounded-xl border border-white/10 text-xs">
              <div>
                <p className="text-text-muted mb-1 text-[11px] uppercase tracking-wider font-semibold">Event Link:</p>
                <p className="text-gold font-mono break-all">{window.location.origin}/events/{event.id}/onsite</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                <div>
                  <p className="text-text-muted mb-1 text-[11px] uppercase tracking-wider font-semibold">Username:</p>
                  <p className="text-white font-mono font-bold">{event.onsiteUsername || 'staff'}</p>
                </div>
                <div>
                  <p className="text-text-muted mb-1 text-[11px] uppercase tracking-wider font-semibold">Password:</p>
                  <p className="text-white font-mono font-bold">{event.onsitePassword || '(Not set yet)'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyStaffInvite}
                className="flex-1 py-2.5 bg-gold text-black font-bold text-xs rounded-lg hover:bg-gold/90 flex items-center justify-center gap-2"
              >
                {staffCopied ? <Check size={14} /> : <Copy size={14} />}
                {staffCopied ? 'Copied Staff Invite!' : 'Copy Staff Invite'}
              </button>
              <a
                href={`/events/${event.id}/onsite`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 bg-white/10 text-white font-semibold text-xs rounded-lg hover:bg-white/20 flex items-center gap-1.5"
              >
                <ScanLine size={14} /> Open Portal
              </a>
            </div>
          </motion.div>
        </div>
      )}

      {/* Hero Image */}
      <section className="max-w-container mx-auto px-6 pt-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl overflow-hidden border border-white/5 aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]">
          <img src={event.image || '/placeholder.jpg'} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-block px-3 py-1 bg-gold text-black text-[10px] font-bold uppercase rounded-full">{event.type}</span>
              {isTicketedEvent && <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur border border-white/20 text-white text-[10px] font-bold uppercase rounded-full flex items-center gap-1"><Ticket size={10} /> Ticketed</span>}
              {isPastEvent && <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur border border-white/20 text-white/70 text-[10px] font-bold uppercase rounded-full">Past Event</span>}
              {event.publishStatus !== 'published' && <span className="inline-block px-3 py-1 bg-text-muted/20 backdrop-blur border border-white/20 text-white text-[10px] font-bold uppercase rounded-full">{event.publishStatus}</span>}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary uppercase tracking-tight">{event.title}</h1>
          </div>
        </motion.div>
      </section>

      {/* Countdown */}
      {isUpcoming && !countdown.isPast && (
        <section className="max-w-container mx-auto px-6 pt-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-black-surface border border-gold/15 p-5 flex flex-col items-center">
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-text-secondary"><Calendar size={18} className="text-gold" /><span className="text-sm">{formattedDate}</span></div>
              <div className="flex items-center gap-2 text-text-secondary"><MapPin size={18} className="text-gold" /><span className="text-sm">{event.venue || event.location}{event.city ? `, ${event.city}` : ''}</span></div>
              {rsvpCount > 0 && <div className="flex items-center gap-2 text-text-secondary"><Users size={18} className="text-gold" /><span className="text-sm">{rsvpCount} {rsvpCount === 1 ? 'person' : 'people'} going</span></div>}
            </div>

            {event.description && (
              <div className="bg-black-elevated rounded-xl p-5 border border-white/5">
                <h3 className="font-display text-sm font-semibold text-text-primary uppercase mb-3">About This Event</h3>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {event.dj && (
              <div className="bg-black-elevated rounded-xl p-5 border border-white/5">
                <h3 className="font-display text-sm font-semibold text-text-primary uppercase mb-3">Featured DJ</h3>
                <button onClick={() => navigate(`/dj/${event.dj.id}`)} className="flex items-center gap-3 group">
                  <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-lg border border-gold/30 overflow-hidden">
                    {event.dj.avatar ? <img src={getMediaUrl(event.dj.avatar)} alt={event.dj.stageName} onError={imageFallback} className="w-full h-full object-cover" /> : event.dj.stageName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-text-primary group-hover:text-gold transition-colors">{event.dj.stageName}</p>
                    <p className="text-xs text-text-muted">View Profile</p>
                  </div>
                </button>
              </div>
            )}

            {isPastEvent && gallery.length > 0 && (
              <div className="bg-black-elevated rounded-xl p-5 border border-white/5">
                <h3 className="font-display text-sm font-semibold text-text-primary uppercase mb-4 flex items-center gap-2"><Images size={16} className="text-gold" /> Event Gallery</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {gallery.map((photo: any) => (
                    <button key={photo.id} onClick={() => setSelectedPhoto(photo.url)} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img src={photo.url} alt={photo.caption || 'Event photo'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      {photo.caption && <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"><p className="text-white text-[10px] truncate">{photo.caption}</p></div>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right column: Ticketing / RSVP sidebar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4 order-first lg:order-none">
            {/* USER'S APPROVED TICKET */}
            {primaryTicket && (primaryTicket.status === 'approved' || primaryTicket.status === 'checked_in') && (
              <div className="bg-black-elevated rounded-xl p-5 border border-green/20 text-center">
                <div className="w-8 h-8 rounded-full bg-green/20 mx-auto flex items-center justify-center mb-2"><CheckCircle2 className="w-5 h-5 text-green" /></div>
                <p className="text-sm font-bold text-green mb-1">{primaryTicket.status === 'checked_in' ? 'Checked In!' : 'Ticket Confirmed!'}</p>
                <p className="text-xs text-text-muted mb-4">{primaryTicket.ticketType?.name || 'Ticket'} · {primaryTicket.ticketNumber}</p>
                {primaryTicket.status !== 'checked_in' && primaryTicket.qrPayload && (
                  <div className="bg-white rounded-xl p-4 inline-block mx-auto">
                    <QRCodeSVG value={primaryTicket.qrPayload} size={160} level="H" />
                  </div>
                )}
                {userTickets.length > 1 && (
                  <Link to="/user/tickets" className="block mt-4 text-xs text-gold hover:underline">View all {userTickets.length} tickets</Link>
                )}
              </div>
            )}

            {/* USER'S PENDING TICKET */}
            {primaryTicket && primaryTicket.status === 'pending' && (
              <div className="bg-black-elevated rounded-xl p-5 border border-orange/20">
                <p className="text-sm font-bold text-orange flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Ticket Pending</p>
                <p className="text-xs text-text-muted mt-2">Your payment is being reviewed. You'll receive a notification when it's approved.</p>
              </div>
            )}

            {/* BUY TICKET */}
            {isTicketedEvent && isUpcoming && ticketTypes.length > 0 && !primaryTicket && (
              <div className="bg-black-elevated rounded-xl p-5 border border-white/5">
                <h3 className="font-display text-sm font-semibold text-text-primary uppercase mb-4 flex items-center gap-2"><Ticket size={14} className="text-gold" /> Get Your Ticket</h3>
                <div className="space-y-2 mb-4">
                  {ticketTypes.slice(0, 3).map((type: any) => (
                    <div key={type.id} className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">{type.name}</span>
                      <div className="text-right">
                        <span className="font-bold text-text-primary">{formatCurrency(type.price, type.currency)}</span>
                        {event.showRemainingTickets && type.available !== null && type.available !== undefined && (
                          <p className="text-[10px] text-text-muted">{type.available} remaining</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {event.ticketSalesClosed ? (
                  <div className="w-full py-3 bg-white/5 border border-white/10 text-text-muted text-sm font-bold uppercase rounded-xl text-center flex items-center justify-center gap-2">
                    <Ticket size={16} /> Ticket Sales Closed
                  </div>
                ) : user ? (
                  <button onClick={() => setShowBuyModal(true)} className="w-full py-3 bg-gold-gradient text-black text-sm font-bold uppercase rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <Ticket size={16} /> Buy Ticket
                  </button>
                ) : (
                  <Link to="/login" className="block w-full py-3 bg-gold-gradient text-black text-sm font-bold uppercase rounded-xl text-center">Log in to Buy</Link>
                )}
              </div>
            )}

            {/* RSVP */}
            {!isTicketedEvent && isUpcoming && (
              <div className="bg-black-elevated rounded-xl p-5 border border-white/5">
                <h3 className="font-display text-sm font-semibold text-text-primary uppercase mb-4 flex items-center gap-2"><Bell size={14} className="text-gold" /> RSVP to This Event</h3>
                <p className="text-xs text-text-muted mb-4">{rsvpCount > 0 ? `${rsvpCount} people are going. ` : ''}Let the organizer know you're attending.</p>
                {user ? (
                  <button onClick={handleRsvp} disabled={rsvpLoading} className={`w-full py-3 text-sm font-bold uppercase rounded-xl flex items-center justify-center gap-2 transition-all ${rsvpLoading ? 'opacity-70' : ''} ${userRsvped ? 'bg-green/15 border border-green/30 text-green hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30' : 'bg-gold-gradient text-black hover:opacity-90'}`}>
                    {userRsvped ? '✓ You\'re Going (click to cancel)' : 'RSVP – I\'m Going!'}
                  </button>
                ) : (
                  <Link to="/login" className="block w-full py-3 bg-gold-gradient text-black text-sm font-bold uppercase rounded-xl text-center">Log in to RSVP</Link>
                )}
              </div>
            )}

            {/* Old ticket URL fallback */}
            {event.ticketUrl && !isTicketedEvent && (
              <div className="bg-black-elevated rounded-xl p-5 border border-white/5">
                <h3 className="font-display text-sm font-semibold text-text-primary uppercase mb-4">Get Tickets</h3>
                <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-gold-gradient text-black text-sm font-bold uppercase rounded-full hover:scale-[1.02] transition-transform"><Ticket size={16} /> Buy Tickets</a>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Buy Ticket Modal */}
      <AnimatePresence>
        {showBuyModal && ticketTypes.length > 0 && !event.ticketSalesClosed && (
          <BuyTicketModal event={event} ticketTypes={ticketTypes} onClose={() => setShowBuyModal(false)} onSuccess={() => { refetch?.(); }} />
        )}
      </AnimatePresence>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedPhoto(null)} className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><X className="w-5 h-5 text-white" /></button>
            <img src={selectedPhoto} alt="" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}