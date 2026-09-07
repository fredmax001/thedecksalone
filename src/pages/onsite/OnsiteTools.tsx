import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  ScanLine, Users, UserPlus, BarChart3, CheckCircle2, XCircle,
  AlertCircle, Loader2, Search, LogOut, Ticket, Clock, RefreshCw, Keyboard,
  Send, Undo2, QrCode, ClipboardList, Share2, MapPin, Calendar, ArrowLeft, User
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useOnsiteDashboard, useOnsiteGuests, useOnsiteCheckin, useOnsiteWalkin, useEventAvailability } from '@/hooks/useEventTicketing';
import { formatCurrency } from '@/lib/formatting';
import { formatEventDate } from '@/lib/dateTime';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { DashboardSkeleton } from '@/components/ui/page-skeletons';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

type View = 'home' | 'scanner' | 'guests' | 'walkin' | 'stats';
type ScanState = 'idle' | 'scanning' | 'valid' | 'already_used' | 'invalid' | 'wrong_event' | 'not_approved' | 'unauthorized';

export default function OnsiteTools() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = sessionStorage.getItem(`onsite_token_${eventId}`);
  const [view, setView] = useState<View>('home');

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gold mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Access Required</h1>
          <p className="text-text-secondary mb-6">Please log in with the event staff password.</p>
          <button
            onClick={() => navigate(`/events/${eventId}/onsite`)}
            className="bg-gold text-black font-bold px-6 py-3 rounded-xl"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (view !== 'home') {
    const titles: Record<Exclude<View, 'home'>, string> = {
      scanner: 'QR Scanner',
      guests: 'Checked-in Guests',
      walkin: 'Walk-In Ticket',
      stats: 'Stats',
    };
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <SubViewHeader title={titles[view]} onBack={() => setView('home')} eventId={eventId!} />
        <div className="flex-1 overflow-y-auto">
          {view === 'scanner' && <ScannerTab eventId={eventId!} token={token} />}
          {view === 'guests' && <GuestsTab eventId={eventId!} />}
          {view === 'walkin' && <WalkinTab eventId={eventId!} />}
          {view === 'stats' && <StatsTab eventId={eventId!} />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <OnsiteHeader eventId={eventId!} />
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <HomeView eventId={eventId!} onNavigate={setView} />
      </div>
    </div>
  );
}

function OnsiteHeader({ eventId }: { eventId: string }) {
  const navigate = useNavigate();
  const { data } = useOnsiteDashboard(eventId);
  const event = data?.event;

  const handleLogout = () => {
    sessionStorage.removeItem(`onsite_token_${eventId}`);
    navigate(`/events/${eventId}/onsite`);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/events/${eventId}/onsite`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'On-site Check-In', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Portal link copied');
      }
    } catch {
      // user cancelled share
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-black px-4 py-5 flex items-start justify-between">
      <div className="min-w-0 pr-4">
        <h1 className="text-2xl font-bold text-white leading-tight">On Site Tools</h1>
        <p className="text-sm text-text-secondary mt-1 truncate">
          {event?.title ? `${event.title} • Guest Check-In` : 'Guest Check-In'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleShare}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Share portal link"
        >
          <Share2 size={20} />
        </button>
        <button
          onClick={handleLogout}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Log out"
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
}

function SubViewHeader({ title, onBack, eventId }: { title: string; onBack: () => void; eventId: string }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem(`onsite_token_${eventId}`);
    navigate(`/events/${eventId}/onsite`);
  };

  return (
    <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/10 px-4 py-4 flex items-center justify-between">
      <button
        onClick={onBack}
        className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white transition-colors"
        aria-label="Back"
      >
        <ArrowLeft size={22} />
      </button>
      <h1 className="text-base font-bold truncate px-2">{title}</h1>
      <button
        onClick={handleLogout}
        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        title="Log out"
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}

function HomeView({ eventId, onNavigate }: { eventId: string; onNavigate: (v: View) => void }) {
  const { data, isLoading } = useOnsiteDashboard(eventId);
  const event = data?.event;
  const summary = data?.summary;
  const cover = event?.banner || event?.image || event?.poster;

  return (
    <div className="space-y-5 pt-2">
      {/* Event card */}
      <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden">
        {cover ? (
          <div
            className="h-44 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${cover})` }}
          />
        ) : (
          <div className="h-24 w-full bg-gradient-to-br from-gold/20 to-black flex items-center justify-center">
            <Ticket size={32} className="text-gold/60" />
          </div>
        )}
        <div className="p-4">
          <h2 className="text-xl font-bold text-white mb-3">{event?.title || 'Loading...'}</h2>
          <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-text-secondary">
            {event?.date && (
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gold" />
                <span>{formatEventDate(event.date)}</span>
              </div>
            )}
            {(event?.location || event?.city) && (
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gold" />
                <span>{[event?.location, event?.city].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main actions */}
      <div className="space-y-4">
        <ActionCard
          icon={<QrCode size={28} />}
          iconBg="bg-[#2a2a1a] text-gold"
          title="QR Scanner"
          subtitle="Scan and validate guest tickets"
          onClick={() => onNavigate('scanner')}
        />
        <ActionCard
          icon={<ClipboardList size={28} />}
          iconBg="bg-[#1a2633] text-blue-400"
          title="Checked-in Guests"
          subtitle="View guest list and check-in status"
          onClick={() => onNavigate('guests')}
        />
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={<Ticket size={20} className="text-gold" />}
          label="Tickets Scanned"
          value={summary?.ticketsScanned ?? 0}
          isLoading={isLoading}
        />
        <StatCard
          icon={<CheckCircle2 size={20} className="text-green-400" />}
          label="Checked In"
          value={summary?.checkedIn ?? 0}
          isLoading={isLoading}
        />
      </div>

      {/* Secondary actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate('walkin')}
          className="bg-[#111] border border-white/10 rounded-2xl p-4 text-left hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          <UserPlus size={20} className="text-gold mb-3" />
          <p className="font-bold text-white text-sm">Walk-In</p>
          <p className="text-xs text-text-secondary mt-0.5">Sell at the door</p>
        </button>
        <button
          onClick={() => onNavigate('stats')}
          className="bg-[#111] border border-white/10 rounded-2xl p-4 text-left hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          <BarChart3 size={20} className="text-gold mb-3" />
          <p className="font-bold text-white text-sm">Stats</p>
          <p className="text-xs text-text-secondary mt-0.5">Full dashboard</p>
        </button>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  iconBg,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/5 active:bg-white/10 active:scale-[0.99] transition-all"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="text-left min-w-0 flex-1">
        <p className="font-bold text-white text-lg">{title}</p>
        <p className="text-sm text-text-secondary truncate">{subtitle}</p>
      </div>
      <ScanLine size={20} className="text-text-muted rotate-0" />
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  isLoading: boolean;
}) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-3xl font-bold text-white">
        {isLoading ? <Loader2 size={24} className="animate-spin mx-auto" /> : value}
      </p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
    </div>
  );
}



/* ─── Scanner Tab ─────────────────────────────────────────────────────────── */

function ScannerTab({ eventId, token }: { eventId: string; token: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const lastScanned = useRef<string | null>(null);

  const stopCamera = useCallback(() => {
    if (readerRef.current) {
      try { (readerRef.current as any).reset?.(); } catch {}
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const validateCode = useCallback(async (code: string) => {
    if (isProcessing || lastScanned.current === code) return;
    lastScanned.current = code;
    setIsProcessing(true);
    setShowManual(false);

    try {
      const res = await api.post(`/events/${eventId}/ticketing/scan`, { qrPayload: code }, {
        headers: { 'X-Onsite-Token': token },
      });
      setScanState('valid');
      setResult(res.data.data);
      setMessage(res.data.message || 'Valid ticket');
      toast.success('Checked in');
    } catch (err: any) {
      const status = err.response?.status;
      const errCode = err.response?.data?.error;
      const errMsg = err.response?.data?.message || 'Invalid ticket';
      if (errCode === 'ALREADY_SCANNED') setScanState('already_used');
      else if (errCode === 'WRONG_EVENT') setScanState('wrong_event');
      else if (errCode === 'NOT_APPROVED') setScanState('not_approved');
      else if (status === 403 || status === 401) setScanState('unauthorized');
      else setScanState('invalid');
      setResult(err.response?.data?.data || null);
      setMessage(errMsg);
    } finally {
      setIsProcessing(false);
    }
  }, [eventId, token, isProcessing]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setScanState('scanning');
    setResult(null);
    lastScanned.current = null;

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not supported');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      activeStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      reader.decodeFromStream(stream, videoRef.current!, (res, error) => {
        if (res) validateCode(res.getText());
        if (error && error.name !== 'NotFoundException') console.warn(error);
      });
    } catch (err: any) {
      setCameraError(err.message || 'Could not start camera');
      setScanState('idle');
    }
  }, [stopCamera, validateCode]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    validateCode(manualCode.trim());
    setManualCode('');
  };

  const reset = () => {
    lastScanned.current = null;
    setScanState('scanning');
    setResult(null);
    setMessage('');
    startCamera();
  };

  const bgClass =
    scanState === 'valid' ? 'bg-green-950/50' :
    scanState === 'already_used' ? 'bg-yellow-950/50' :
    scanState === 'wrong_event' ? 'bg-orange-950/50' :
    scanState === 'not_approved' ? 'bg-purple-950/50' :
    scanState === 'unauthorized' ? 'bg-gray-900/50' :
    scanState === 'invalid' ? 'bg-red-950/50' : 'bg-black';

  return (
    <div className={`flex flex-col h-full ${bgClass} transition-colors`}>
      <div className="relative flex-1 min-h-[360px] bg-black overflow-hidden">
        {scanState === 'scanning' && !cameraError && (
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
        )}
        {scanState === 'scanning' && !cameraError && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-56 border-2 border-gold/60 rounded-3xl relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-gold" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-gold" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-24 bg-gold" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-24 bg-gold" />
            </div>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div>
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-text-secondary">{cameraError}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowManual((v) => !v)}
          className={`absolute top-4 right-4 p-2 rounded-full ${showManual ? 'bg-gold text-black' : 'bg-black/60 text-white'}`}
        >
          <Keyboard size={18} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {showManual && (
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Paste QR payload"
              className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-gold"
            />
            <button type="submit" className="bg-gold text-black font-bold px-4 rounded-xl">
              <Send size={18} />
            </button>
          </form>
        )}

        {scanState !== 'scanning' && (
          <div className={`rounded-2xl border p-4 ${
            scanState === 'valid' ? 'border-green/30 bg-green-950/30' :
            scanState === 'already_used' ? 'border-yellow-400/30 bg-yellow-950/30' :
            scanState === 'wrong_event' ? 'border-orange-400/30 bg-orange-950/30' :
            scanState === 'not_approved' ? 'border-purple-400/30 bg-purple-950/30' :
            scanState === 'unauthorized' ? 'border-gray-500/30 bg-gray-900/30' :
            'border-red-500/30 bg-red-950/30'
          }`}>
            <div className="flex items-start gap-3">
              {scanState === 'valid' && <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />}
              {scanState === 'already_used' && <Clock className="w-6 h-6 text-yellow-400 shrink-0" />}
              {scanState === 'wrong_event' && <MapPin className="w-6 h-6 text-orange-400 shrink-0" />}
              {scanState === 'not_approved' && <Clock className="w-6 h-6 text-purple-400 shrink-0" />}
              {scanState === 'unauthorized' && <User className="w-6 h-6 text-gray-400 shrink-0" />}
              {scanState === 'invalid' && <XCircle className="w-6 h-6 text-red-400 shrink-0" />}
              <div className="flex-1">
                <p className="font-bold text-white">{message}</p>
                {result?.ticketNumber && (
                  <p className="text-sm text-text-secondary mt-1">Ticket #{result.ticketNumber}</p>
                )}
                {result?.buyerName && (
                  <p className="text-sm text-text-secondary">{result.buyerName}</p>
                )}
              </div>
            </div>
            <button
              onClick={reset}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-2.5 rounded-xl transition-colors"
            >
              <RefreshCw size={16} /> Scan Next
            </button>
          </div>
        )}

        {scanState === 'scanning' && (
          <div className="text-center text-text-muted text-sm py-2">
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Point camera at ticket QR code'}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Guests Tab ──────────────────────────────────────────────────────────── */

function GuestsTab({ eventId }: { eventId: string }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useOnsiteGuests(eventId, { search: debouncedSearch, status, page: 1, limit: 50 });
  const showSkeleton = useDelayedLoading(isLoading);
  const checkin = useOnsiteCheckin(eventId);

  const guests = data?.data || [];

  const handleCheckin = (ticketId: string) => {
    checkin.mutate({ ticketId, action: 'checkin' }, {
      onSuccess: () => toast.success('Checked in'),
      onError: (err: any) => toast.error(getApiErrorMessage(err, 'Check-in failed')),
    });
  };

  const handleUndo = (ticketId: string) => {
    checkin.mutate({ ticketId, action: 'undo-checkin' }, {
      onSuccess: () => toast.success('Check-in undone'),
      onError: (err: any) => toast.error(getApiErrorMessage(err, 'Undo failed')),
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Quick Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: '', label: 'All Guests' },
          { key: 'checked_in', label: 'Checked In' },
          { key: 'approved', label: 'Pending Arrival' },
          { key: 'pending', label: 'Pending Approval' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              status === tab.key
                ? 'bg-gold text-black'
                : 'bg-[#161616] text-text-secondary border border-white/10 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, ticket #"
            className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-gold"
          />
        </div>
      </div>

      {isLoading && (showSkeleton ? <DashboardSkeleton cards={2} /> : null)}

      <div className="space-y-3">
        {guests.map((guest: any) => (
          <div key={guest.id} className="bg-[#111] border border-white/10 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-white truncate">{guest.buyerName || guest.user?.name || 'Guest'}</p>
                <p className="text-xs text-text-secondary truncate">{guest.ticketType?.name} · #{guest.ticketNumber}</p>
                <p className="text-xs text-text-muted truncate">{guest.buyerEmail || guest.user?.email || guest.buyerPhone || 'No contact'}</p>
                <p className="text-xs text-gold mt-1">Qty: {guest.quantity} · {guest.currency} {guest.amount}</p>
              </div>
              <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg ${
                guest.status === 'checked_in' ? 'bg-green-500/20 text-green-400' :
                guest.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                guest.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {guest.status.replace('_', ' ')}
              </span>
            </div>

            <div className="mt-3 flex gap-2">
              {guest.status === 'approved' && (
                <button
                  onClick={() => handleCheckin(guest.id)}
                  disabled={checkin.isPending}
                  className="flex-1 bg-gold text-black font-bold text-sm py-2 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> Check In
                </button>
              )}
              {guest.status === 'checked_in' && (
                <button
                  onClick={() => handleUndo(guest.id)}
                  disabled={checkin.isPending}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold text-sm py-2 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Undo2 size={14} /> Undo
                </button>
              )}
            </div>
          </div>
        ))}

        {!isLoading && guests.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No guests found</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Walk-In Tab ─────────────────────────────────────────────────────────── */

function WalkinTab({ eventId }: { eventId: string }) {
  const { data: availability } = useEventAvailability(eventId);
  const walkin = useOnsiteWalkin(eventId);
  const ticketTypes = availability?.ticketTypes || [];

  const [ticketTypeId, setTicketTypeId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'complimentary' | 'mobile_money'>('cash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (ticketTypes.length && !ticketTypeId) {
      setTicketTypeId(ticketTypes[0].id);
    }
  }, [ticketTypes, ticketTypeId]);

  const selectedType = ticketTypes.find((t: any) => t.id === ticketTypeId);
  const computedAmount = selectedType ? selectedType.price * quantity : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTypeId || !buyerName.trim()) {
      toast.error('Please select a ticket type and enter buyer name');
      return;
    }

    walkin.mutate({
      ticketTypeId,
      quantity,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim() || undefined,
      buyerEmail: buyerEmail.trim() || undefined,
      paymentMethod,
      amount: paymentMethod === 'complimentary' ? 0 : computedAmount,
      notes: notes.trim() || undefined,
    }, {
      onSuccess: () => {
        toast.success('Walk-in ticket created');
        setBuyerName('');
        setBuyerPhone('');
        setBuyerEmail('');
        setNotes('');
        setQuantity(1);
      },
      onError: (err: any) => toast.error(getApiErrorMessage(err, 'Failed to create ticket')),
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
        <h2 className="font-bold text-white flex items-center gap-2 mb-4">
          <Ticket size={18} className="text-gold" /> Walk-In / Complimentary Ticket
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Ticket Type</label>
            <select
              value={ticketTypeId}
              onChange={(e) => setTicketTypeId(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold"
            >
              {ticketTypes.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name} — {t.currency} {t.price} ({t.available ?? 'unlimited'} left)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Quantity</label>
            <input
              type="number"
              min={1}
              max={selectedType?.maxPerOrder || 10}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Buyer Name *</label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Phone</label>
            <input
              type="tel"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              placeholder="+232..."
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Email</label>
            <input
              type="email"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              placeholder="guest@example.com"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold"
            >
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="complimentary">Complimentary</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Table number, VIP guest, etc."
              rows={3}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-muted focus:outline-none focus:border-gold"
            />
          </div>

          <div className="pt-2">
            <p className="text-sm text-text-secondary mb-3">
              Total: <span className="text-gold font-bold">{formatCurrency(paymentMethod === 'complimentary' ? 0 : computedAmount)}</span>
            </p>
            <button
              type="submit"
              disabled={walkin.isPending}
              className="w-full bg-gold text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {walkin.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus size={18} />}
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Stats Tab ───────────────────────────────────────────────────────────── */

function StatsTab({ eventId }: { eventId: string }) {
  const { data, isLoading } = useOnsiteDashboard(eventId);
  const summary = data?.summary;
  const showSkeleton = useDelayedLoading(isLoading);

  if (isLoading || !summary) {
    return showSkeleton ? <DashboardSkeleton /> : null;
  }

  const stats = [
    { label: 'Tickets Sold', value: summary.ticketsSold },
    { label: 'Checked In', value: summary.checkedIn },
    { label: 'Remaining', value: summary.ticketsRemaining ?? '—' },
    { label: 'Pending', value: summary.pending },
    { label: 'Approved', value: summary.approved },
    { label: 'Cancelled', value: summary.cancelled },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#111] border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-text-secondary mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
        <p className="text-sm text-text-secondary">Capacity</p>
        <p className="text-xl font-bold text-white">{summary.capacity ?? 'Unlimited'}</p>
      </div>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
        <p className="text-sm text-text-secondary">Revenue</p>
        <p className="text-xl font-bold text-gold">{formatCurrency(summary.revenue)}</p>
      </div>
    </div>
  );
}