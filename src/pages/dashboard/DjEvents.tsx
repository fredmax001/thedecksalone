import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Loader2, Plus, X, MapPin, Ticket, Trash2, Edit3, ImageIcon,
  ScanLine, Crown, Share2, LayoutDashboard, BarChart3, Users, Eye, EyeOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import TicketTypeBuilder, { type TicketTypeInput } from '@/components/events/TicketTypeBuilder';

interface DJEvent {
  id: string;
  title: string;
  description?: string;
  type: string;
  date: string;
  endDate?: string | null;
  location: string;
  city?: string;
  venue?: string;
  image?: string | null;
  banner?: string | null;
  googleMapsUrl?: string | null;
  organizerName?: string | null;
  organizerContact?: string | null;
  category?: string | null;
  musicGenre?: string | null;
  ageRestriction?: string | null;
  capacity?: number | null;
  refundPolicy?: string | null;
  termsConditions?: string | null;
  ticketSaleStartsAt?: string | null;
  ticketSaleEndsAt?: string | null;
  approvalMode?: string;
  ticketUrl?: string | null;
  isTicketed: boolean;
  ticketPrice?: number | null;
  ticketCurrency?: string;
  mobileMoneyNumber?: string | null;
  mobileMoneyProvider?: string | null;
  totalTickets?: number | null;
  publishStatus: string;
  status: string;
  createdAt: string;
  ticketTypes?: any[];
}

const EVENT_TYPES = ['Club Night', 'Festival', 'Private Party', 'Wedding', 'Corporate Event', 'Open DJ Slot'];
const STATUS_OPTIONS = ['upcoming', 'ongoing', 'completed', 'cancelled'];
const AGE_OPTIONS = [
  { value: 'all_ages', label: 'All Ages' },
  { value: 'eighteen_plus', label: '18+' },
  { value: 'twenty_one_plus', label: '21+' },
];

const emptyForm = {
  title: '',
  description: '',
  type: 'Club Night',
  date: '',
  endDate: '',
  location: '',
  city: '',
  venue: '',
  googleMapsUrl: '',
  organizerName: '',
  organizerContact: '',
  category: '',
  musicGenre: '',
  ageRestriction: '',
  capacity: '',
  refundPolicy: '',
  termsConditions: '',
  ticketSaleStartsAt: '',
  ticketSaleEndsAt: '',
  approvalMode: 'automatic',
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
  const { checkFeature } = useFeatureAccess();
  const [events, setEvents] = useState<DJEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeInput[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [shareEvent, setShareEvent] = useState<DJEvent | null>(null);

  const isDj = user?.role === 'DJ';
  const djId = user?.djProfile?.id;
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
    setTicketTypes([]);
    setActiveTab('details');
  };

  const handleEdit = (event: DJEvent) => {
    setIsEditing(event.id);
    setForm({
      title: event.title,
      description: event.description || '',
      type: event.type,
      date: event.date ? event.date.slice(0, 16) : '',
      endDate: event.endDate ? event.endDate.slice(0, 16) : '',
      location: event.location,
      city: event.city || '',
      venue: event.venue || '',
      googleMapsUrl: event.googleMapsUrl || '',
      organizerName: event.organizerName || '',
      organizerContact: event.organizerContact || '',
      category: event.category || '',
      musicGenre: event.musicGenre || '',
      ageRestriction: event.ageRestriction || '',
      capacity: event.capacity ? String(event.capacity) : '',
      refundPolicy: event.refundPolicy || '',
      termsConditions: event.termsConditions || '',
      ticketSaleStartsAt: event.ticketSaleStartsAt ? event.ticketSaleStartsAt.slice(0, 16) : '',
      ticketSaleEndsAt: event.ticketSaleEndsAt ? event.ticketSaleEndsAt.slice(0, 16) : '',
      approvalMode: event.approvalMode || 'automatic',
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
    setTicketTypes((event.ticketTypes || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      price: t.price,
      currency: t.currency,
      quantity: t.quantity ? String(t.quantity) : '',
      maxPerOrder: t.maxPerOrder,
      saleStartsAt: t.saleStartsAt ? t.saleStartsAt.slice(0, 16) : '',
      saleEndsAt: t.saleEndsAt ? t.saleEndsAt.slice(0, 16) : '',
      isActive: t.isActive,
    })));
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
    if (form.isTicketed && ticketTypes.length === 0) {
      toast.error('Add at least one ticket type for a ticketed event');
      return;
    }

    setSubmitLoading(true);
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('type', form.type);
    formData.append('date', new Date(form.date).toISOString());
    if (form.endDate) formData.append('endDate', new Date(form.endDate).toISOString());
    formData.append('location', form.location);
    formData.append('city', form.city);
    formData.append('venue', form.venue);
    if (form.googleMapsUrl) formData.append('googleMapsUrl', form.googleMapsUrl);
    if (form.organizerName) formData.append('organizerName', form.organizerName);
    if (form.organizerContact) formData.append('organizerContact', form.organizerContact);
    if (form.category) formData.append('category', form.category);
    if (form.musicGenre) formData.append('musicGenre', form.musicGenre);
    if (form.ageRestriction) formData.append('ageRestriction', form.ageRestriction);
    if (form.capacity) formData.append('capacity', form.capacity);
    if (form.refundPolicy) formData.append('refundPolicy', form.refundPolicy);
    if (form.termsConditions) formData.append('termsConditions', form.termsConditions);
    if (form.ticketSaleStartsAt) formData.append('ticketSaleStartsAt', new Date(form.ticketSaleStartsAt).toISOString());
    if (form.ticketSaleEndsAt) formData.append('ticketSaleEndsAt', new Date(form.ticketSaleEndsAt).toISOString());
    formData.append('approvalMode', form.approvalMode);
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
        const eventId = res.data.data.id;

        // Create/update ticket types for ticketed events
        if (form.isTicketed) {
          for (const tt of ticketTypes) {
            const payload = {
              name: tt.name,
              description: tt.description,
              price: tt.price,
              currency: tt.currency,
              quantity: tt.quantity ? Number(tt.quantity) : undefined,
              maxPerOrder: tt.maxPerOrder,
              saleStartsAt: tt.saleStartsAt ? new Date(tt.saleStartsAt).toISOString() : undefined,
              saleEndsAt: tt.saleEndsAt ? new Date(tt.saleEndsAt).toISOString() : undefined,
              isActive: tt.isActive,
            };
            if (tt.id) {
              await api.put(`/events/${eventId}/ticketing/ticket-types/${tt.id}`, payload);
            } else {
              await api.post(`/events/${eventId}/ticketing/ticket-types`, payload);
            }
          }
        }

        toast.success(isEditing ? 'Event updated' : 'Event created as draft');
        // Refresh list
        const listRes = await api.get(`/events?djId=${djId}&limit=100`);
        if (listRes.data.success) setEvents(listRes.data.data || []);
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

  const handlePublishToggle = async (event: DJEvent) => {
    try {
      const publish = event.publishStatus !== 'published';
      await api.post(`/events/${event.id}/ticketing/${publish ? 'publish' : 'unpublish'}`);
      toast.success(publish ? 'Event published' : 'Event unpublished');
      const listRes = await api.get(`/events?djId=${djId}&limit=100`);
      if (listRes.data.success) setEvents(listRes.data.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update publish status');
    }
  };

  const statusBadge = (event: DJEvent) => {
    const isPublished = event.publishStatus === 'published';
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${isPublished ? 'bg-green/15 text-green border-green/30' : 'bg-text-muted/15 text-text-muted border-white/10'}`}>
        {isPublished ? 'Published' : event.publishStatus === 'draft' ? 'Draft' : 'Cancelled'}
      </span>
    );
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
          {isProPlus ? (
            <p className="text-xs text-gold/70 mt-1 flex items-center gap-1">
              <Crown className="w-3 h-3" /> Pro+ — Full event management & ticketing unlocked
            </p>
          ) : (
            <p className="text-xs text-text-muted mt-1">Pro+ subscription required to create and manage events with ticketing.</p>
          )}
        </div>
        {isDj && (
          <Button
            className="bg-gold-gradient text-black hover:opacity-90"
            onClick={() => {
              if (!checkFeature('legend', 'Create Events')) return;
              resetForm();
              setIsFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Event
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
              <Button className="bg-gold-gradient text-black" onClick={() => { if (!checkFeature('legend', 'Create Events')) return; resetForm(); setIsFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Create Your First Event
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {events.map((event) => {
            const date = new Date(event.date);
            const isPublished = event.publishStatus === 'published';
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
                    {statusBadge(event)}
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
                      <button
                        onClick={() => {
                          const shareUrl = `${window.location.origin}/events/${event.id}`;
                          const shareData = { title: event.title, text: `${event.title} — ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${event.venue || event.location}`, url: shareUrl };
                          if (navigator.share) navigator.share(shareData).catch(() => setShareEvent(event));
                          else setShareEvent(event);
                        }}
                        className="p-2 text-text-muted hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                        title="Share event"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(event.id)} className="p-2 text-text-muted hover:text-red hover:bg-red/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Action buttons row */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link
                      to={`/dashboard/events/${event.id}`}
                      className="flex items-center justify-center gap-1.5 py-2 bg-gold/10 border border-gold/20 text-gold text-xs font-semibold rounded-lg hover:bg-gold/20 transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                    </Link>
                    {event.isTicketed && isProPlus && (
                      <>
                        <Link
                          to={`/dashboard/events/${event.id}/tickets`}
                          className="flex items-center justify-center gap-1.5 py-2 bg-white/5 border border-white/10 text-text-secondary text-xs font-semibold rounded-lg hover:border-gold/30 hover:text-gold transition-colors"
                        >
                          <Users className="w-3.5 h-3.5" /> Tickets
                        </Link>
                        <Link
                          to={`/dashboard/events/${event.id}/analytics`}
                          className="flex items-center justify-center gap-1.5 py-2 bg-white/5 border border-white/10 text-text-secondary text-xs font-semibold rounded-lg hover:border-gold/30 hover:text-gold transition-colors"
                        >
                          <BarChart3 className="w-3.5 h-3.5" /> Analytics
                        </Link>
                        <Link
                          to={`/dashboard/events/${event.id}/scan`}
                          className="flex items-center justify-center gap-1.5 py-2 bg-white/5 border border-white/10 text-text-secondary text-xs font-semibold rounded-lg hover:border-gold/30 hover:text-gold transition-colors"
                        >
                          <ScanLine className="w-3.5 h-3.5" /> Scanner
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handlePublishToggle(event)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${isPublished ? 'bg-red/10 border border-red/30 text-red-400 hover:bg-red/20' : 'bg-green/10 border border-green/30 text-green hover:bg-green/20'}`}
                    >
                      {isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {isPublished ? 'Unpublish' : 'Publish'}
                    </button>
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
              className="bg-black-surface border border-dark-gray rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-dark-gray flex items-center justify-between sticky top-0 bg-black-surface z-10">
                <h3 className="text-lg font-display font-bold text-text-primary uppercase">
                  {isEditing ? 'Edit Event' : 'Create Event'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="p-2 text-text-muted hover:text-text-primary rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="px-5 pt-4 border-b border-dark-gray sticky top-0 bg-black-surface z-10">
                    <TabsList className="bg-black-elevated border border-dark-gray">
                      <TabsTrigger value="details" className="data-[state=active]:bg-gold data-[state=active]:text-black text-text-secondary text-xs">Details</TabsTrigger>
                      <TabsTrigger value="tickets" className="data-[state=active]:bg-gold data-[state=active]:text-black text-text-secondary text-xs">Tickets</TabsTrigger>
                      <TabsTrigger value="settings" className="data-[state=active]:bg-gold data-[state=active]:text-black text-text-secondary text-xs">Settings</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-5 space-y-5">
                    <TabsContent value="details" className="space-y-4 mt-0">
                      <div>
                        <Label className="text-text-secondary text-xs uppercase">Event Title *</Label>
                        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Freetown Summer Vibes" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                      </div>

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

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-text-secondary text-xs uppercase">Start Date & Time *</Label>
                          <Input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                        </div>
                        <div>
                          <Label className="text-text-secondary text-xs uppercase">End Date & Time</Label>
                          <Input type="datetime-local" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-text-secondary text-xs uppercase">Location *</Label>
                          <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Freetown" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                        </div>
                        <div>
                          <Label className="text-text-secondary text-xs uppercase">City</Label>
                          <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Freetown" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                        </div>
                      </div>

                      <div>
                        <Label className="text-text-secondary text-xs uppercase">Venue</Label>
                        <Input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="e.g. Atlantic Hall" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                      </div>

                      <div>
                        <Label className="text-text-secondary text-xs uppercase">Google Maps URL</Label>
                        <Input value={form.googleMapsUrl} onChange={e => setForm(f => ({ ...f, googleMapsUrl: e.target.value }))} placeholder="https://maps.google.com/..." className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                      </div>

                      <div>
                        <Label className="text-text-secondary text-xs uppercase">Description</Label>
                        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Tell fans what to expect..." className="mt-1 bg-black-elevated border-dark-gray text-text-primary min-h-[80px]" />
                      </div>

                      <div>
                        <Label className="text-text-secondary text-xs uppercase">Event Image</Label>
                        <div className="mt-1">
                          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                          {imagePreview ? (
                            <div className="relative rounded-xl overflow-hidden aspect-video bg-black-elevated">
                              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full hover:bg-red">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => imageInputRef.current?.click()} className="w-full py-8 border border-dashed border-dark-gray rounded-xl flex flex-col items-center justify-center text-text-muted hover:border-gold/50 hover:text-gold transition-colors">
                              <ImageIcon className="w-8 h-8 mb-2" />
                              <span className="text-xs font-medium">Click to upload image</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="tickets" className="space-y-4 mt-0">
                      <div className={`rounded-xl border p-4 space-y-4 ${isProPlus ? 'border-gold/20 bg-gold/5' : 'border-white/10 bg-white/2 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
                              <Crown className="w-4 h-4 text-gold" /> Pro+ Ticketing
                            </p>
                            <p className="text-xs text-text-muted mt-0.5">Sell tickets with multiple types and QR entry</p>
                          </div>
                          {isProPlus ? (
                            <Switch checked={form.isTicketed} onCheckedChange={(checked) => setForm(f => ({ ...f, isTicketed: checked }))} />
                          ) : (
                            <span className="text-[10px] px-2 py-1 bg-gold/15 text-gold rounded-full font-bold">Pro+ Only</span>
                          )}
                        </div>

                        {form.isTicketed && isProPlus && (
                          <div className="space-y-4 pt-2 border-t border-white/10">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-text-secondary text-xs uppercase">Capacity (optional)</Label>
                                <Input type="number" min="1" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="Total event capacity" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                              </div>
                              <div>
                                <Label className="text-text-secondary text-xs uppercase">Approval Mode</Label>
                                <Select value={form.approvalMode} onValueChange={v => setForm(f => ({ ...f, approvalMode: v }))}>
                                  <SelectTrigger className="mt-1 bg-black-elevated border-dark-gray text-text-primary"><SelectValue /></SelectTrigger>
                                  <SelectContent className="bg-black-surface border-dark-gray">
                                    <SelectItem value="automatic" className="text-text-primary">Automatic (after payment)</SelectItem>
                                    <SelectItem value="manual" className="text-text-primary">Manual (organizer approves)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div>
                              <Label className="text-text-secondary text-xs uppercase">Ticket Sale Window</Label>
                              <div className="grid grid-cols-2 gap-4 mt-1">
                                <Input type="datetime-local" value={form.ticketSaleStartsAt} onChange={e => setForm(f => ({ ...f, ticketSaleStartsAt: e.target.value }))} className="bg-black-elevated border-dark-gray text-text-primary" />
                                <Input type="datetime-local" value={form.ticketSaleEndsAt} onChange={e => setForm(f => ({ ...f, ticketSaleEndsAt: e.target.value }))} className="bg-black-elevated border-dark-gray text-text-primary" />
                              </div>
                            </div>

                            <div>
                              <Label className="text-text-secondary text-xs uppercase">Mobile Money Number</Label>
                              <Input value={form.mobileMoneyNumber} onChange={e => setForm(f => ({ ...f, mobileMoneyNumber: e.target.value }))} placeholder="+232 XX XXX XXXX" className="mt-1 bg-black-elevated border-dark-gray text-text-primary font-mono" />
                            </div>

                            <div>
                              <Label className="text-text-secondary text-xs uppercase">Ticket Types</Label>
                              <div className="mt-2">
                                <TicketTypeBuilder types={ticketTypes} onChange={setTicketTypes} currency={form.ticketCurrency} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4 mt-0">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-text-secondary text-xs uppercase">Organizer Name</Label>
                          <Input value={form.organizerName} onChange={e => setForm(f => ({ ...f, organizerName: e.target.value }))} className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                        </div>
                        <div>
                          <Label className="text-text-secondary text-xs uppercase">Organizer Contact</Label>
                          <Input value={form.organizerContact} onChange={e => setForm(f => ({ ...f, organizerContact: e.target.value }))} className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-text-secondary text-xs uppercase">Category</Label>
                          <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Electronic" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                        </div>
                        <div>
                          <Label className="text-text-secondary text-xs uppercase">Music Genre</Label>
                          <Input value={form.musicGenre} onChange={e => setForm(f => ({ ...f, musicGenre: e.target.value }))} placeholder="e.g. Afrobeats" className="mt-1 bg-black-elevated border-dark-gray text-text-primary" />
                        </div>
                      </div>

                      <div>
                        <Label className="text-text-secondary text-xs uppercase">Age Restriction</Label>
                        <Select value={form.ageRestriction} onValueChange={v => setForm(f => ({ ...f, ageRestriction: v }))}>
                          <SelectTrigger className="mt-1 bg-black-elevated border-dark-gray text-text-primary"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent className="bg-black-surface border-dark-gray">
                            {AGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-text-primary">{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-text-secondary text-xs uppercase">Refund Policy</Label>
                        <Textarea value={form.refundPolicy} onChange={e => setForm(f => ({ ...f, refundPolicy: e.target.value }))} placeholder="Describe your refund policy..." className="mt-1 bg-black-elevated border-dark-gray text-text-primary min-h-[60px]" />
                      </div>

                      <div>
                        <Label className="text-text-secondary text-xs uppercase">Terms & Conditions</Label>
                        <Textarea value={form.termsConditions} onChange={e => setForm(f => ({ ...f, termsConditions: e.target.value }))} placeholder="Event terms and conditions..." className="mt-1 bg-black-elevated border-dark-gray text-text-primary min-h-[80px]" />
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>

                <div className="p-5 border-t border-dark-gray flex gap-3 sticky bottom-0 bg-black-surface">
                  <Button type="button" variant="outline" className="flex-1 border-dark-gray text-text-secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitLoading} className="flex-1 bg-gold-gradient text-black hover:opacity-90">
                    {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? 'Save Changes' : 'Save Draft'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share sheet placeholder */}
      <AnimatePresence>
        {shareEvent && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShareEvent(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-black-surface border border-dark-gray rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-text-primary">Share Event</h3>
                <button onClick={() => setShareEvent(null)}><X className="w-5 h-5 text-text-muted" /></button>
              </div>
              <p className="text-sm text-text-secondary mb-3">{shareEvent.title}</p>
              <button
                onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/events/${shareEvent.id}`); toast.success('Link copied'); setShareEvent(null); } catch { toast.error('Failed to copy'); } }}
                className="w-full py-3 bg-gold-gradient text-black font-bold rounded-xl"
              >
                Copy Link
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
