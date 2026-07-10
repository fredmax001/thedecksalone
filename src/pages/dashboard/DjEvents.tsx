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
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
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
  status: string;
  createdAt: string;
}

const EVENT_TYPES = [
  'Club Night',
  'Festival',
  'Private Party',
  'Wedding',
  'Corporate Event',
  'Open DJ Slot',
];

const STATUS_OPTIONS = ['upcoming', 'ongoing', 'completed', 'cancelled'];

export default function DjEvents() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<DJEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isDj = user?.role === 'DJ';
  const djId = user?.djProfile?.id;

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
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isDj || !djId) {
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      try {
        const res = await api.get(`/events?djId=${djId}&limit=100`);
        if (res.data.success) {
          setEvents(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load events', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
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
    });
    setImagePreview(event.image || null);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await api.delete(`/events/${id}`);
      if (res.data.success) {
        toast.success('Event deleted');
        setEvents((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete event');
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

    try {
      let res;
      if (isEditing) {
        res = await api.put(`/events/${isEditing}`, formData);
      } else {
        res = await api.post('/events', formData);
      }

      if (res.data.success) {
        toast.success(isEditing ? 'Event updated' : 'Event created');
        setEvents((prev) => {
          if (isEditing) {
            return prev.map((ev) => (ev.id === isEditing ? res.data.data : ev));
          }
          return [res.data.data, ...prev];
        });
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

  if (loading) {
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
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            My Events
          </h1>
        </div>
        {isDj && (
          <Button
            className="bg-gold-gradient text-black hover:opacity-90"
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        )}
      </div>

      {events.length === 0 ? (
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary mb-2">No events yet</p>
            <p className="text-sm text-text-muted mb-4">
              Create your first event to let fans know where you&apos;re playing next.
            </p>
            {isDj && (
              <Button
                className="bg-gold-gradient text-black"
                onClick={() => {
                  resetForm();
                  setIsFormOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Event
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {events.map((event) => {
            const date = new Date(event.date);
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black-surface border border-dark-gray rounded-xl overflow-hidden hover:border-gold/30 transition-colors"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img
                    src={event.image || '/placeholder.jpg'}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-gold text-black border-0 text-[10px] uppercase">
                      {event.type}
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-display text-sm font-semibold text-text-primary uppercase">
                        {event.title}
                      </h4>
                      <p className="text-xs text-gold mt-1">
                        {date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {event.venue || event.location}
                        {event.city ? `, ${event.city}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(event)}
                        className="p-2 text-text-muted hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-2 text-text-muted hover:text-red hover:bg-red/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {event.ticketUrl ? (
                    <a
                      href={event.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-gold-gradient text-black text-xs font-bold uppercase rounded-full hover:scale-[1.02] transition-transform"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      Get Tickets
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="mt-3 flex items-center justify-center w-full py-2 bg-white/5 text-text-muted text-xs font-medium uppercase rounded-full">
                      No ticket link
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsFormOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black-surface border border-dark-gray rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 border-b border-dark-gray flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-text-primary uppercase">
                  {isEditing ? 'Edit Event' : 'Add Event'}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 text-text-muted hover:text-text-primary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <Label htmlFor="title" className="text-text-secondary text-xs uppercase">
                    Event Title *
                  </Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Freetown Summer Vibes"
                    className="mt-1 bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type" className="text-text-secondary text-xs uppercase">
                      Type
                    </Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                    >
                      <SelectTrigger className="mt-1 bg-black-elevated border-dark-gray text-text-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black-surface border-dark-gray">
                        {EVENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="text-text-primary">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status" className="text-text-secondary text-xs uppercase">
                      Status
                    </Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                    >
                      <SelectTrigger className="mt-1 bg-black-elevated border-dark-gray text-text-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black-surface border-dark-gray">
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s} className="text-text-primary capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="date" className="text-text-secondary text-xs uppercase">
                    Date & Time *
                  </Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="mt-1 bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location" className="text-text-secondary text-xs uppercase">
                      Location *
                    </Label>
                    <Input
                      id="location"
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Freetown"
                      className="mt-1 bg-black-elevated border-dark-gray text-text-primary"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-text-secondary text-xs uppercase">
                      City
                    </Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="e.g. Freetown"
                      className="mt-1 bg-black-elevated border-dark-gray text-text-primary"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="venue" className="text-text-secondary text-xs uppercase">
                    Venue
                  </Label>
                  <Input
                    id="venue"
                    value={form.venue}
                    onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                    placeholder="e.g. Atlantic Hall"
                    className="mt-1 bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>

                <div>
                  <Label htmlFor="ticketUrl" className="text-text-secondary text-xs uppercase">
                    Ticket Link
                  </Label>
                  <Input
                    id="ticketUrl"
                    type="url"
                    value={form.ticketUrl}
                    onChange={(e) => setForm((f) => ({ ...f, ticketUrl: e.target.value }))}
                    placeholder="https://tickets.example.com/my-event"
                    className="mt-1 bg-black-elevated border-dark-gray text-text-primary"
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    Add a link where fans can buy tickets.
                  </p>
                </div>

                <div>
                  <Label htmlFor="description" className="text-text-secondary text-xs uppercase">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Tell fans what to expect..."
                    className="mt-1 bg-black-elevated border-dark-gray text-text-primary min-h-[80px]"
                  />
                </div>

                <div>
                  <Label className="text-text-secondary text-xs uppercase">Event Image</Label>
                  <div className="mt-1">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    {imagePreview ? (
                      <div className="relative rounded-xl overflow-hidden aspect-video bg-black-elevated">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full hover:bg-red"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full py-8 border border-dashed border-dark-gray rounded-xl flex flex-col items-center justify-center text-text-muted hover:border-gold/50 hover:text-gold transition-colors"
                      >
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <span className="text-xs font-medium">Click to upload image</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-dark-gray text-text-secondary hover:text-text-primary"
                    onClick={() => setIsFormOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 bg-gold-gradient text-black hover:opacity-90"
                  >
                    {submitLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isEditing ? (
                      'Save Changes'
                    ) : (
                      'Create Event'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
