import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Loader2,
  Plus,
  X,
  MapPin,
  Ticket,
  Trash2,
  Edit3,
  ImageIcon,
  ExternalLink,
  QrCode,
  ScanLine,
  CheckCircle2,
  XCircle,
  Crown,
  Images,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface DJEvent {
  id: string;
  title: string;
  description?: string;
  type: string;
  date: string;
  location: string;
  city?: string;
  venue?: string;
  image?: string | null;
  ticketUrl?: string | null;
  isTicketed: boolean;
  ticketPrice?: number | null;
  ticketCurrency?: string;
  mobileMoneyNumber?: string | null;
  mobileMoneyProvider?: string | null;
  totalTickets?: number | null;
  status: string;
  createdAt: string;
}

interface EventTicket {
  id: string;
  eventId: string;
  userId: string;
  status: string; // pending | approved | declined | scanned
  paymentScreenshot: string;
  amount: number;
  currency: string;
  qrCode?: string | null;
  approvedAt?: string | null;
  declineReason?: string | null;
  createdAt: string;
  user: { id: string; name?: string; username: string; avatar?: string; email: string };
}

const EVENT_TYPES = ['Club Night', 'Festival', 'Private Party', 'Wedding', 'Corporate Event', 'Open DJ Slot'];
const STATUS_OPTIONS = ['upcoming', 'ongoing', 'completed', 'cancelled'];

const emptyForm = {
  title: '',
  description: '',
  type: 'Club Night',
  date: '',
  location: '',
  city: '',
  venue: '',
  ticketUrl: '',
  status: 'upcoming',
  isTicketed: false,
  ticketPrice: '',
  ticketCurrency: 'SLE',
  mobileMoneyNumber: '',
  mobileMoneyProvider: 'Orange Money',
  totalTickets: '',
};

export default function DjEvents() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [events, setEvents] = useState<DJEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Ticket management state
  const [ticketEventId, setTicketEventId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Gallery upload state
  const [galleryUploading, setGalleryUploading] = useState(false);

  const isDj = user?.role === 'DJ';
  const djId = user?.djProfile?.id;
  const { checkFeature } = useFeatureAccess();
  const subscriptionTier = user?.djProfile?.subscriptionTier || 'free';
  const isProPlus = subscriptionTier === 'legend';

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isDj || !djId) { setLoading(false); return; }
    api.get(`/events?djId=${djId}&limit=100`)
      .then(res => { if (res.data.success) setEvents(res.data.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDj, djId]);

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setIsEditing(null);
  };

  const handleEdit = (event: DJEvent) => {
    setIsEditing(event.id);
    setForm({
      title: event.title,
      description: event.description || '',
      type: event.type,
      date: event.date.slice(0, 16),
      location: event.location,
      city: event.city || '',
      venue: event.venue || '',
      ticketUrl: event.ticketUrl || '',
      status: event.status,
      isTicketed: event.isTicketed || false,
      ticketPrice: event.ticketPrice ? String(event.ticketPrice) : '',
      ticketCurrency: event.ticketCurrency || 'SLE',
      mobileMoneyNumber: event.mobileMoneyNumber || '',
      mobileMoneyProvider: event.mobileMoneyProvider || 'Orange Money',
      totalTickets: event.totalTickets ? String(event.totalTickets) : '',
    });
    setImagePreview(event.image || null);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      toast.success('Event deleted');
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date || !form.location) {
      toast.error('Title, date, and location are required');
      return;
    }
    if (form.isTicketed && !isProPlus) {
      toast.error('Ticketed events require a Pro+ subscription');
      return;
    }

    setSubmitLoading(true);
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('type', form.type);
    formData.append('date', new Date(form.date).toISOString());
    formData.append('location', form.location);
    formData.append('city', form.city);
    formData.append('venue', form.venue);
    formData.append('status', form.status);
    if (form.ticketUrl) formData.append('ticketUrl', form.ticketUrl);
    if (imageFile) formData.append('image', imageFile);

    // Pro+ ticketing fields
    formData.append('isTicketed', String(form.isTicketed));
    if (form.isTicketed) {
      if (form.ticketPrice) formData.append('ticketPrice', form.ticketPrice);
      formData.append('ticketCurrency', form.ticketCurrency);
      if (form.mobileMoneyNumber) formData.append('mobileMoneyNumber', form.mobileMoneyNumber);
      if (form.mobileMoneyProvider) formData.append('mobileMoneyProvider', form.mobileMoneyProvider);
      if (form.totalTickets) formData.append('totalTickets', form.totalTickets);
    }

    try {
      const res = isEditing
        ? await api.put(`/events/${isEditing}`, formData)
        : await api.post('/events', formData);

      if (res.data.success) {
        toast.success(isEditing ? 'Event updated' : 'Event created');
        setEvents(prev =>
          isEditing ? prev.map(ev => ev.id === isEditing ? res.data.data : ev) : [res.data.data, ...prev]
        );
        setIsFormOpen(false);
        resetForm();
      } else {
        toast.error(res.data.error || 'Save failed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Save failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Ticket Management ──────────────────────────────────────────────────────
  const openTicketManagement = async (eventId: string) => {
    setTicketEventId(eventId);
    setTicketsLoading(true);
    try {
      const res = await api.get(`/events/${eventId}/tickets`);
      setTickets(res.data.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to load tickets');
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleApproveTicket = async (eventId: string, ticketId: string) => {
    setActionLoading(ticketId);
    try {
      const res = await api.put(`/events/${eventId}/tickets/${ticketId}/approve`);
      setTickets(prev => prev.map(t => t.id === ticketId ? res.data.data : t));
      toast.success('✅ Ticket approved! User notified.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineTicket = async (eventId: string, ticketId: string) => {
    const reason = prompt('Reason for declining (optional):');
    if (reason === null) return; // user pressed cancel
    setActionLoading(ticketId);
    try {
      await api.put(`/events/${eventId}/tickets/${ticketId}/decline`, { reason });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'declined', declineReason: reason } : t));
      toast.success('Ticket declined. User notified.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to decline');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Gallery Upload ─────────────────────────────────────────────────────────
  const handleGalleryUpload = async (eventId: string, files: FileList) => {
    if (!files || files.length === 0) return;
    setGalleryUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append('photos', f));
      await api.post(`/events/${eventId}/gallery`, fd);
      toast.success(`${files.length} photo(s) uploaded to gallery`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to upload photos');
    } finally {
      setGalleryUploading(false);
    }
  };

  const ticketStatusColor: Record<string, string> = {
    pending: 'text-orange border-orange/30 bg-orange/10',
    approved: 'text-green border-green/30 bg-green/10',
    declined: 'text-red-400 border-red-500/30 bg-red-500/10',
    scanned: 'text-text-muted border-white/10 bg-white/5',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">My Events</h1>
          {isProPlus && (
            <p className="text-xs text-gold/70 mt-1 flex items-center gap-1">
              <Crown className="w-3 h-3" /> Pro+ — Ticketed events, RSVP & gallery unlocked
            </p>
          )}
        </div>
        {isDj && (
          <Button
            className="bg-gold-gradient text-black hover:opacity-90"
            onClick={() => {
              if (!checkFeature('pro', 'Create Events')) return;
              resetForm();
              setIsFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        )}
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary mb-2">No events yet</p>
            <p className="text-sm text-text-muted mb-4">Create your first event to let fans know where you're playing next.</p>
            {isDj && (
              <Button className="bg-gold-gradient text-black" onClick={() => { if (!checkFeature('pro', 'Create Events')) return; resetForm(); setIsFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Create Your First Event
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {events.map((event) => {
            const date = new Date(event.date);
            const isPast = date < new Date();
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black-surface border border-dark-gray rounded-xl overflow-hidden hover:border-gold/30 transition-colors flex flex-col"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={event.image || '/placeholder.jpg'} alt={event.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                    <Badge className="bg-gold text-black border-0 text-[10px] uppercase">{event.type}</Badge>
                    {event.isTicketed && (
                      <Badge className="bg-black/60 backdrop-blur border border-white/20 text-white text-[10px] uppercase flex items-center gap-1">
                        <Ticket className="w-2.5 h-2.5" /> Ticketed
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-3 flex-1">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-display text-sm font-semibold text-text-primary uppercase truncate">{event.title}</h4>
                      <p className="text-xs text-gold mt-1">
                        {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {event.venue || event.location}{event.city ? `, ${event.city}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleEdit(event)} className="p-2 text-text-muted hover:text-gold hover:bg-gold/10 rounded-lg transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(event.id)} className="p-2 text-text-muted hover:text-red hover:bg-red/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Action buttons row */}
                  <div className="mt-3 flex flex-col gap-2">
                    {/* Ticket management (Pro+ only) */}
                    {event.isTicketed && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openTicketManagement(event.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gold/10 border border-gold/20 text-gold text-xs font-semibold rounded-lg hover:bg-gold/20 transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" /> Manage Tickets
                        </button>
                        <button
                          onClick={() => navigate(`/dashboard/events/${event.id}/scan`)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 text-text-secondary text-xs font-semibold rounded-lg hover:border-gold/30 hover:text-gold transition-colors"
                        >
                          <ScanLine className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Gallery upload (Pro+ only, past events) */}
                    {isProPlus && isPast && (
                      <>
                        <label className="flex items-center justify-center gap-1.5 py-2 bg-white/5 border border-white/10 text-text-secondary text-xs font-semibold rounded-lg hover:border-gold/30 hover:text-gold transition-colors cursor-pointer">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files && handleGalleryUpload(event.id, e.target.files)}
                          />
                          {galleryUploading ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
                          ) : (
                            <><Images className="w-3.5 h-3.5" /> Add Gallery Photos</>
                          )}
                        </label>
                      </>
                    )}

                    {/* Ticket link */}
                    {event.ticketUrl && !event.isTicketed && (
                      <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2 bg-gold-gradient text-black text-xs font-bold uppercase rounded-full hover:scale-[1.02] transition-transform">
                        <Ticket className="w-3.5 h-3.5" /> Get Tickets <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Create/Edit Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsFormOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-black-surface border border-dark-gray rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 border-b border-dark-gray flex items-center justify-between sticky top-0 bg-black-surface z-10">
                <h3 className="text-lg font-display font-bold text-text-primary uppercase">
                  {isEditing ? 'Edit Event' : 'Add Event'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="p-2 text-text-muted hover:text-text-primary rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Title */}
                <div>
                  <Label htmlFor="title" className="text-text-secondary text-xs uppercase">Event Title *</Label>
                  <Input id="title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Freetown Summer Vibes" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                </div>

                {/* Type + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-text-secondary text-xs uppercase">Type</Label>
                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="mt-1 bg-black-elevated border-dark-gray text-text-primary"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-black-surface border-dark-gray">
                        {EVENT_TYPES.map(t => <SelectItem key={t} value={t} className="text-text-primary">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-text-secondary text-xs uppercase">Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="mt-1 bg-black-elevated border-dark-gray text-text-primary"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-black-surface border-dark-gray">
                        {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="text-text-primary capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <Label htmlFor="date" className="text-text-secondary text-xs uppercase">Date & Time *</Label>
                  <Input id="date" type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                </div>

                {/* Location + City */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-text-secondary text-xs uppercase">Location *</Label>
                    <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Freetown" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                  </div>
                  <div>
                    <Label className="text-text-secondary text-xs uppercase">City</Label>
                    <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="e.g. Freetown" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                  </div>
                </div>

                {/* Venue */}
                <div>
                  <Label className="text-text-secondary text-xs uppercase">Venue</Label>
                  <Input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                    placeholder="e.g. Atlantic Hall" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                </div>

                {/* Ticket URL (legacy) */}
                <div>
                  <Label className="text-text-secondary text-xs uppercase">External Ticket Link (optional)</Label>
                  <Input type="url" value={form.ticketUrl} onChange={e => setForm(f => ({ ...f, ticketUrl: e.target.value }))}
                    placeholder="https://..." className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                </div>

                {/* ── Pro+ Ticketing Toggle ──────────────────────────── */}
                <div className={`rounded-xl border p-4 space-y-4 ${isProPlus ? 'border-gold/20 bg-gold/5' : 'border-white/10 bg-white/2 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
                        <Crown className="w-4 h-4 text-gold" /> Pro+ Ticketing
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">Mobile Money payment + QR code entry</p>
                    </div>
                    {isProPlus ? (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, isTicketed: !f.isTicketed }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isTicketed ? 'bg-gold' : 'bg-white/10'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isTicketed ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    ) : (
                      <span className="text-[10px] px-2 py-1 bg-gold/15 text-gold rounded-full font-bold">Pro+ Only</span>
                    )}
                  </div>

                  {form.isTicketed && isProPlus && (
                    <div className="space-y-3 pt-2 border-t border-white/10">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-text-secondary text-xs uppercase">Ticket Price</Label>
                          <Input type="number" min="0" value={form.ticketPrice} onChange={e => setForm(f => ({ ...f, ticketPrice: e.target.value }))}
                            placeholder="e.g. 50000" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                        </div>
                        <div>
                          <Label className="text-text-secondary text-xs uppercase">Currency</Label>
                          <Select value={form.ticketCurrency} onValueChange={v => setForm(f => ({ ...f, ticketCurrency: v }))}>
                            <SelectTrigger className="mt-1 bg-black-elevated border-dark-gray text-text-primary"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-black-surface border-dark-gray">
                              {['SLE', 'USD', 'GBP'].map(c => <SelectItem key={c} value={c} className="text-text-primary">{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-text-secondary text-xs uppercase">Total Tickets (leave blank for unlimited)</Label>
                        <Input type="number" min="1" value={form.totalTickets} onChange={e => setForm(f => ({ ...f, totalTickets: e.target.value }))}
                          placeholder="e.g. 200" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                      </div>

                      <div>
                        <Label className="text-text-secondary text-xs uppercase">Mobile Money Provider</Label>
                        <Select value={form.mobileMoneyProvider} onValueChange={v => setForm(f => ({ ...f, mobileMoneyProvider: v }))}>
                          <SelectTrigger className="mt-1 bg-black-elevated border-dark-gray text-text-primary"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-black-surface border-dark-gray">
                            {['Orange Money', 'Africell Money', 'QMoney', 'Other'].map(p => <SelectItem key={p} value={p} className="text-text-primary">{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-text-secondary text-xs uppercase">Your Mobile Money Number</Label>
                        <Input value={form.mobileMoneyNumber} onChange={e => setForm(f => ({ ...f, mobileMoneyNumber: e.target.value }))}
                          placeholder="+232 XX XXX XXXX" className="mt-1 bg-black-elevated border-dark-gray text-text-primary font-mono" />
                        <p className="text-[10px] text-text-muted mt-1">Users will send payment to this number and upload their receipt.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <Label className="text-text-secondary text-xs uppercase">Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Tell fans what to expect..." className="mt-1 bg-black-elevated border-dark-gray text-text-primary min-h-[80px]" />
                </div>

                {/* Event Image */}
                <div>
                  <Label className="text-text-secondary text-xs uppercase">Event Image</Label>
                  <div className="mt-1">
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    {imagePreview ? (
                      <div className="relative rounded-xl overflow-hidden aspect-video bg-black-elevated">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                          className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full hover:bg-red">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => imageInputRef.current?.click()}
                        className="w-full py-8 border border-dashed border-dark-gray rounded-xl flex flex-col items-center justify-center text-text-muted hover:border-gold/50 hover:text-gold transition-colors">
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <span className="text-xs font-medium">Click to upload image</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 border-dark-gray text-text-secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitLoading} className="flex-1 bg-gold-gradient text-black hover:opacity-90">
                    {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? 'Save Changes' : 'Create Event'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ticket Management Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {ticketEventId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setTicketEventId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-black-surface border border-dark-gray rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 border-b border-dark-gray flex items-center justify-between sticky top-0 bg-black-surface z-10">
                <div>
                  <h3 className="text-lg font-display font-bold text-text-primary uppercase flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-gold" /> Manage Tickets
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">{tickets.length} submissions</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setTicketEventId(null); navigate(`/dashboard/events/${ticketEventId}/scan`); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 border border-gold/20 text-gold text-xs font-semibold rounded-lg hover:bg-gold/20 transition-colors"
                  >
                    <ScanLine className="w-3.5 h-3.5" /> Scanner
                  </button>
                  <button onClick={() => setTicketEventId(null)} className="p-2 text-text-muted hover:text-text-primary rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-5">
                {ticketsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <Ticket className="w-10 h-10 text-text-muted mx-auto mb-3" />
                    <p className="text-text-muted text-sm">No ticket submissions yet</p>
                    <p className="text-text-muted text-xs mt-1">Share the event page so fans can buy tickets.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map(ticket => (
                      <div key={ticket.id} className="bg-black-elevated rounded-xl border border-white/5 p-4">
                        <div className="flex items-start gap-3">
                          {/* User avatar */}
                          <div className="w-9 h-9 rounded-full bg-gold/20 overflow-hidden flex-shrink-0 flex items-center justify-center text-gold font-bold text-sm">
                            {ticket.user.avatar ? <img src={ticket.user.avatar} alt="" className="w-full h-full object-cover" /> : ticket.user.name?.[0] || '?'}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-text-primary">{ticket.user.name || ticket.user.username}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border capitalize ${ticketStatusColor[ticket.status] || 'text-text-muted'}`}>
                                {ticket.status}
                              </span>
                            </div>
                            <p className="text-xs text-text-muted">{ticket.user.email}</p>
                            <p className="text-xs text-text-secondary mt-1">
                              {ticket.currency} {ticket.amount?.toLocaleString()}
                              <span className="text-text-muted"> · {new Date(ticket.createdAt).toLocaleDateString()}</span>
                            </p>
                          </div>

                          {/* Screenshot */}
                          <a href={ticket.paymentScreenshot} target="_blank" rel="noreferrer"
                            className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-white/10 hover:border-gold/30 transition-colors">
                            <img src={ticket.paymentScreenshot} alt="Screenshot" className="w-full h-full object-cover" />
                          </a>
                        </div>

                        {ticket.status === 'pending' && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleApproveTicket(ticketEventId!, ticket.id)}
                              disabled={actionLoading === ticket.id}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green/15 border border-green/30 text-green text-xs font-bold rounded-lg hover:bg-green/25 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === ticket.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              Approve
                            </button>
                            <button
                              onClick={() => handleDeclineTicket(ticketEventId!, ticket.id)}
                              disabled={actionLoading === ticket.id}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Decline
                            </button>
                          </div>
                        )}

                        {ticket.status === 'approved' && ticket.qrCode && (
                          <div className="mt-2 px-3 py-2 bg-green/5 border border-green/15 rounded-lg">
                            <p className="text-[10px] text-green font-mono break-all">QR: {ticket.qrCode}</p>
                          </div>
                        )}

                        {ticket.status === 'declined' && ticket.declineReason && (
                          <p className="text-[10px] text-red-400 mt-2">Reason: {ticket.declineReason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
