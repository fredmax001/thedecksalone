import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2,
  Camera,
  Save,
  Check,
  Shield,
  ShieldCheck,
  Upload,
  FileText,
  User,
  Headphones,
  DollarSign,
  ShoppingBag,
  Link as LinkIcon,
  ChevronRight,
  ArrowLeft,
  Crown,
  ExternalLink,
  MapPin,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CITY_TO_COMMUNITIES, SIERRA_LEONE_CITIES } from '@/lib/sierraLeoneLocations';

const GENRES = [
  'Amapiano',
  'Afrobeats',
  'Hip Hop',
  'Dancehall',
  'Reggae',
  'House',
  'Techno',
  'R&B',
  'Salone Mix',
  'Open Format',
];

const CITIES = [...SIERRA_LEONE_CITIES];

const COUNTRIES = [
  'Sierra Leone',
  'Nigeria',
  'Ghana',
  'Liberia',
  'Guinea',
  'United Kingdom',
  'United States',
  'Canada',
  'Germany',
  'Netherlands',
  'France',
  'Other',
];

const LANGUAGES = ['English', 'Krio', 'Mende', 'Temne', 'Limba', 'Other'];

const EQUIPMENT = [
  'Controller',
  'CDJs',
  'Turntables',
  'Mixer',
  'PA System',
  'Speakers',
  'Subwoofers',
  'Lighting',
  'Smoke Machine',
  'Microphones',
  'LED Screens',
  'Generator',
  'Laptop',
];

const EVENT_TYPES = [
  'Wedding',
  'Birthday',
  'Club',
  'Festival',
  'Corporate',
  'Private Party',
  'House Party',
  'Beach Party',
  'Religious Event',
  'School Event',
  'Graduation',
  'Radio',
];

type SectionId = 'about' | 'photos' | 'genres' | 'pricing' | 'marketplace' | 'social' | 'verification' | null;

export default function Profile() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [djData, setDjData] = useState<any>(null);
  const [initialData, setInitialData] = useState<any>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const idDocInputRef = useRef<HTMLInputElement>(null);

  // Verification form state
  const [verificationForm, setVerificationForm] = useState({
    fullLegalName: '',
    nationality: 'Sierra Leonean',
    idDocumentType: 'passport',
    socialProofLinks: '',
    whyVerified: '',
  });
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  const isDj = user?.role === 'DJ';
  const [djId, setDjId] = useState<string | null>(user?.djProfile?.id || null);

  // Form state
  const [form, setForm] = useState({
    stageName: '',
    fullName: '',
    bio: '',
    startYear: '',
    country: 'Sierra Leone',
    city: 'Freetown',
    community: 'Brookfields',
    genres: [] as string[],
    eventTypes: [] as string[],
    awards: [] as string[],
    equipment: [] as string[],
    languages: ['English', 'Krio'] as string[],
    bookingFeeMin: '',
    bookingFeeMax: '',
    hourlyRate: '',
    fullDayRate: '',
    depositPercent: '30',
    currency: 'SLE',
    willTravel: false,
    maxTravelDistanceKm: '',
    services: [] as { name: string; price?: number; description?: string }[],
    website: '',
    whatsappNumber: '',
    socialLinks: {
      instagram: '',
      twitter: '',
      tiktok: '',
      youtube: '',
      facebook: '',
    } as Record<string, string>,
    streamingLinks: {
      audiomack: '',
      mixcloud: '',
      soundcloud: '',
      youtube: '',
      hearthis: '',
      appleMusic: '',
      spotify: '',
    } as Record<string, string>,
  });

  useEffect(() => {
    if (!isDj) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await api.get('/djs/me');
        if (res.data.success) {
          const dj = res.data.data;
          setDjId(dj.id);
          setDjData(dj);
          const loadedForm = {
            stageName: dj.stageName || user?.name || '',
            fullName: dj.fullName || user?.name || '',
            bio: dj.bio || '',
            startYear: String(dj.startYear || ''),
            country: dj.country || 'Sierra Leone',
            city: dj.city || 'Freetown',
            community: dj.community || '',
            genres: dj.genres || ['Afrobeats', 'Open Format'],
            eventTypes: dj.eventTypes || [],
            awards: dj.awards || [],
            equipment: dj.equipment || [],
            languages: dj.languages?.length ? dj.languages : ['English', 'Krio'],
            bookingFeeMin: String(dj.bookingFeeMin || ''),
            bookingFeeMax: String(dj.bookingFeeMax || ''),
            hourlyRate: String(dj.hourlyRate || ''),
            fullDayRate: String(dj.fullDayRate || ''),
            depositPercent: String(dj.depositPercent || '30'),
            currency: dj.currency || 'SLE',
            willTravel: dj.willTravel || false,
            maxTravelDistanceKm: String(dj.maxTravelDistanceKm || ''),
            services: Array.isArray(dj.services) ? dj.services : [],
            website: dj.website || '',
            whatsappNumber: dj.whatsappNumber || '',
            socialLinks: {
              instagram: dj.socialLinks?.instagram ?? '',
              twitter: dj.socialLinks?.twitter ?? '',
              tiktok: dj.socialLinks?.tiktok ?? '',
              youtube: dj.socialLinks?.youtube ?? '',
              facebook: dj.socialLinks?.facebook ?? '',
            },
            streamingLinks: {
              audiomack: dj.streamingLinks?.audiomack ?? '',
              mixcloud: dj.streamingLinks?.mixcloud ?? '',
              soundcloud: dj.streamingLinks?.soundcloud ?? '',
              youtube: dj.streamingLinks?.youtube ?? '',
              hearthis: dj.streamingLinks?.hearthis ?? '',
              appleMusic: dj.streamingLinks?.appleMusic ?? '',
              spotify: dj.streamingLinks?.spotify ?? '',
            },
          };
          setForm(loadedForm);
          setInitialData(loadedForm);
          if (dj.avatar) setAvatarPreview(dj.avatar);
          if (dj.coverBanner) setCoverPreview(dj.coverBanner);
        }
      } catch (err: any) {
        if (err?.response?.status !== 404) {
          console.error('Failed to load profile', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isDj, user]);

  const updateForm = (updater: (prev: typeof form) => typeof form) => {
    setForm(updater);
    setHasChanges(true);
  };

  // Dynamic Profile Completion Calculation
  const completionStats = useMemo(() => {
    let score = 0;
    const remaining: { label: string; section: SectionId }[] = [];

    // Avatar
    if (avatarPreview || avatarFile || djData?.avatar) {
      score += 15;
    } else {
      remaining.push({ label: 'Add profile photo', section: 'photos' });
    }

    // Stage name & Full name
    if (form.stageName.trim() && form.fullName.trim()) {
      score += 15;
    } else {
      remaining.push({ label: 'Add stage and full name', section: 'about' });
    }

    // Bio
    if (form.bio.trim().length >= 20) {
      score += 15;
    } else {
      remaining.push({ label: 'Write your DJ biography', section: 'about' });
    }

    // Genres
    if (form.genres.length > 0) {
      score += 15;
    } else {
      remaining.push({ label: 'Select music genres', section: 'genres' });
    }

    // Rates / Pricing
    if (form.bookingFeeMin || form.hourlyRate || form.fullDayRate) {
      score += 15;
    } else {
      remaining.push({ label: 'Set your booking rates', section: 'pricing' });
    }

    // Cover Banner
    if (coverPreview || coverFile || djData?.coverBanner) {
      score += 10;
    } else {
      remaining.push({ label: 'Upload cover banner', section: 'photos' });
    }

    // Verification
    if (djData?.verificationStatus === 'verified') {
      score += 15;
    } else {
      remaining.push({ label: 'Verify your identity', section: 'verification' });
    }

    return {
      percentage: Math.min(100, Math.max(25, score)),
      remaining,
    };
  }, [avatarPreview, avatarFile, form, coverPreview, coverFile, djData]);

  const buildFormData = () => {
    const formData = new FormData();
    const appendArray = (key: string, value: string[]) => {
      formData.append(key, JSON.stringify(value));
    };

    if (form.stageName) formData.append('stageName', form.stageName);
    if (form.fullName) formData.append('fullName', form.fullName);
    if (form.bio) formData.append('bio', form.bio);
    if (form.startYear) formData.append('startYear', form.startYear);
    if (form.country) formData.append('country', form.country);
    if (form.city) formData.append('city', form.city);
    formData.append('community', form.community);
    appendArray('genres', form.genres);
    appendArray('eventTypes', form.eventTypes);
    appendArray('awards', form.awards);
    appendArray('equipment', form.equipment);
    appendArray('languages', form.languages);
    if (form.bookingFeeMin) formData.append('bookingFeeMin', form.bookingFeeMin);
    if (form.bookingFeeMax) formData.append('bookingFeeMax', form.bookingFeeMax);
    if (form.hourlyRate) formData.append('hourlyRate', form.hourlyRate);
    if (form.fullDayRate) formData.append('fullDayRate', form.fullDayRate);
    if (form.depositPercent) formData.append('depositPercent', form.depositPercent);
    if (form.currency) formData.append('currency', form.currency);
    if (form.website) formData.append('website', form.website);
    if (form.whatsappNumber) formData.append('whatsappNumber', form.whatsappNumber);
    formData.append('willTravel', String(form.willTravel));
    if (form.maxTravelDistanceKm) formData.append('maxTravelDistanceKm', form.maxTravelDistanceKm);
    formData.append('services', JSON.stringify(form.services));
    formData.append('socialLinks', JSON.stringify(form.socialLinks));
    formData.append('streamingLinks', JSON.stringify(form.streamingLinks));

    const avatarFromInput = avatarInputRef.current?.files?.[0];
    const coverFromInput = coverInputRef.current?.files?.[0];
    if (avatarFromInput) formData.append('avatar', avatarFromInput);
    if (coverFromInput) formData.append('coverBanner', coverFromInput);
    return formData;
  };

  const handleSave = async () => {
    if (!form.stageName || !form.fullName) {
      setError('Stage name and full name are required');
      toast.error('Stage name and full name are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      let res;

      if (djId) {
        res = await api.put('/djs/me', buildFormData());
      } else {
        res = await api.post('/djs', buildFormData());
      }

      if (res.data.success) {
        setSaved(true);
        setHasChanges(false);
        setTimeout(() => setSaved(false), 3000);
        const createdOrUpdated = res.data.data;
        setDjId(createdOrUpdated.id);
        setDjData(createdOrUpdated);
        setAvatarFile(null);
        setCoverFile(null);
        if (createdOrUpdated.avatar) setAvatarPreview(createdOrUpdated.avatar);
        if (createdOrUpdated.coverBanner) setCoverPreview(createdOrUpdated.coverBanner);
        await useAuthStore.getState().fetchMe();
        toast.success('Profile saved successfully!');
      }
    } catch (err: any) {
      const details = err.response?.data?.details;
      let msg = err.response?.data?.error || 'Failed to save profile';
      if (details?.fieldErrors) {
        const fields = Object.entries(details.fieldErrors)
          .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
          .join('; ');
        msg += ` (${fields})`;
      } else if (details?.formErrors && details.formErrors.length > 0) {
        msg += ` (${details.formErrors.join(', ')})`;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (initialData) {
      setForm(initialData);
      setHasChanges(false);
      toast.info('Changes discarded');
    }
  };

  const toggleArray = (field: 'genres' | 'eventTypes' | 'equipment' | 'languages', value: string) => {
    updateForm((prev) => {
      const current = prev[field] as string[];
      if (!current.includes(value) && field === 'genres' && current.length >= 5) {
        toast.error('Maximum 5 genres allowed');
        return prev;
      }
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const addService = () => {
    const name = prompt('Service name (e.g. Wedding DJ Package):');
    if (!name?.trim()) return;
    const priceStr = prompt('Price (optional, e.g. 2500):');
    const price = priceStr ? Number(priceStr) : undefined;
    const description = prompt('Description (optional):') || undefined;
    updateForm((prev) => ({
      ...prev,
      services: [...prev.services, { name: name.trim(), price, description }],
    }));
  };

  const removeService = (index: number) => {
    updateForm((prev) => ({ ...prev, services: prev.services.filter((_, i) => i !== index) }));
  };

  const addAward = () => {
    const award = prompt('Enter award name:');
    if (award?.trim()) {
      updateForm((prev) => ({ ...prev, awards: [...prev.awards, award.trim()] }));
    }
  };

  const removeAward = (index: number) => {
    updateForm((prev) => ({ ...prev, awards: prev.awards.filter((_, i) => i !== index) }));
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationForm.fullLegalName || !verificationForm.nationality || !verificationForm.idDocumentType || !idDocFile) {
      toast.error('Full legal name, nationality, ID type, and document are required');
      return;
    }

    setVerificationSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('fullLegalName', verificationForm.fullLegalName);
      formData.append('nationality', verificationForm.nationality);
      formData.append('idDocumentType', verificationForm.idDocumentType);
      if (verificationForm.socialProofLinks) formData.append('socialProofLinks', verificationForm.socialProofLinks);
      if (verificationForm.whyVerified) formData.append('whyVerified', verificationForm.whyVerified);
      formData.append('document', idDocFile);

      await api.post('/djs/verification-request', formData);
      toast.success('Verification request submitted for review! Our team will get back to you within 2-3 business days.');
      const res = await api.get('/djs/me');
      if (res.data.success) setDjData(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit verification request');
    } finally {
      setVerificationSubmitting(false);
    }
  };

  const verificationStatus = djData?.verificationStatus || 'unverified';
  const isVerified = verificationStatus === 'verified';
  const communityOptions = form.city ? CITY_TO_COMMUNITIES[form.city] ?? [] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  // Fallback for non-DJ fan users
  if (!isDj) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Fan Profile
          </h1>
        </div>
        <Card className="bg-[#121212] border-[#262626]">
          <CardContent className="p-6 space-y-6">
            <div>
              <Label className="text-text-secondary mb-3 block">Avatar</Label>
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border-2 border-gold/30">
                  <AvatarImage src={avatarPreview || user?.avatar} />
                  <AvatarFallback className="bg-gold/20 text-gold text-xl font-bold">
                    {(user?.name || user?.username || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAvatarFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => setAvatarPreview(reader.result as string);
                        reader.readAsDataURL(file);
                        const formData = new FormData();
                        formData.append('avatar', file);
                        try {
                          await api.put('/users/avatar', formData);
                          toast.success('Avatar updated successfully!');
                        } catch (err: any) {
                          toast.error(err.response?.data?.error || 'Failed to update avatar');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-black-elevated border-dark-gray hover:border-gold/50 text-text-primary"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Change Avatar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render Sub-Section Editor if a section is active ───
  if (activeSection) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-24">
        {/* Back Navigation Bar */}
        <div className="flex items-center justify-between gap-4 pb-2 border-b border-[#222222]">
          <button
            onClick={() => setActiveSection(null)}
            className="inline-flex items-center gap-2 text-sm font-bold text-text-primary hover:text-gold transition-colors py-1 px-2 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4 text-gold" />
            <span>Back to Profile Settings</span>
          </button>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-gold-gradient text-black font-extrabold text-xs uppercase tracking-wider hover:scale-[1.02] transition-transform"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Section 1: About You */}
        {activeSection === 'about' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-display font-black text-text-primary uppercase tracking-tight">
                About You
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Set your public stage name, full legal name, biography, location, and languages spoken.
              </p>
            </div>

            <Card className="bg-[#121212] border-[#262626]">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-text-secondary">Stage Name</Label>
                  <Input
                    value={form.stageName}
                    onChange={(e) => updateForm((prev) => ({ ...prev, stageName: e.target.value }))}
                    placeholder="e.g. Deck Salone"
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary focus:border-gold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-text-secondary">Full Name</Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => updateForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="e.g. Sierra Leone DJ Platform"
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary focus:border-gold"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold text-text-secondary">Bio</Label>
                    <span className="text-[11px] font-mono text-text-muted">
                      {form.bio.length}/2000 characters
                    </span>
                  </div>
                  <Textarea
                    value={form.bio}
                    onChange={(e) => updateForm((prev) => ({ ...prev, bio: e.target.value.slice(0, 2000) }))}
                    rows={5}
                    placeholder="Deck Salone is Sierra Leone's official DJ ecosystem a platform built to empower DJs..."
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary focus:border-gold text-sm leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-text-secondary">Year Started DJing</Label>
                  <Input
                    type="number"
                    value={form.startYear}
                    onChange={(e) => updateForm((prev) => ({ ...prev, startYear: e.target.value }))}
                    placeholder="e.g. 2009"
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary focus:border-gold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-text-secondary">Country</Label>
                    <Select
                      value={form.country}
                      onValueChange={(val) => updateForm((prev) => ({ ...prev, country: val }))}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary">
                        <SelectValue placeholder="Select Country" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141414] border-[#2a2a2a] text-text-primary">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-text-secondary">City</Label>
                    <Select
                      value={form.city}
                      onValueChange={(val) => updateForm((prev) => ({ ...prev, city: val, community: '' }))}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary">
                        <SelectValue placeholder="Select City" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141414] border-[#2a2a2a] text-text-primary">
                        {CITIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-text-secondary">Community</Label>
                    {communityOptions.length > 0 ? (
                      <Select
                        value={form.community}
                        onValueChange={(val) => updateForm((prev) => ({ ...prev, community: val }))}
                      >
                        <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary">
                          <SelectValue placeholder="Select Community" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#141414] border-[#2a2a2a] text-text-primary">
                          {communityOptions.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={form.community}
                        onChange={(e) => updateForm((prev) => ({ ...prev, community: e.target.value }))}
                        placeholder="e.g. Brookfields / Lumley"
                        className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-semibold text-text-secondary">Languages Spoken</Label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((lang) => {
                      const selected = form.languages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleArray('languages', lang)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                            selected
                              ? 'bg-gold/15 text-gold border border-gold shadow-[0_0_10px_rgba(244,224,89,0.2)]'
                              : 'bg-[#1a1a1a] text-text-muted border border-[#2e2e2e] hover:text-text-primary hover:border-gold/30'
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 2: Photos & Branding */}
        {activeSection === 'photos' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-display font-black text-text-primary uppercase tracking-tight">
                Photos &amp; Branding
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Upload your high-resolution profile picture and cover banner.
              </p>
            </div>

            <Card className="bg-[#121212] border-[#262626]">
              <CardContent className="p-5 sm:p-6 space-y-6">
                {/* Profile Picture */}
                <div>
                  <Label className="text-xs font-semibold text-text-secondary block mb-2">Profile Picture (Avatar)</Label>
                  <div className="flex items-center gap-5">
                    <div className="relative group">
                      <Avatar className="w-24 h-24 rounded-full border-2 border-gold/40 bg-black">
                        <AvatarImage src={avatarPreview || djData?.avatar || user?.avatar} className="object-cover" />
                        <AvatarFallback className="bg-gold/20 text-gold text-2xl font-black">
                          {(form.stageName || 'DJ').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gold"
                      >
                        <Camera className="w-6 h-6" />
                      </button>
                    </div>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => avatarInputRef.current?.click()}
                        className="bg-[#1a1a1a] border-[#333333] hover:border-gold/50 text-text-primary text-xs font-bold uppercase"
                      >
                        <Camera className="w-3.5 h-3.5 mr-1.5 text-gold" />
                        Upload New Photo
                      </Button>
                      <p className="text-[11px] text-text-muted mt-1.5">
                        Recommended: Square image, at least 500x500px (JPG, PNG, WebP)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cover Banner */}
                <div className="pt-4 border-t border-[#222222]">
                  <Label className="text-xs font-semibold text-text-secondary block mb-2">Cover Banner</Label>
                  <div className="relative rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#0a0a0a] h-40 sm:h-48 group flex items-center justify-center">
                    {coverPreview || djData?.coverBanner ? (
                      <img
                        src={coverPreview || djData?.coverBanner}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
                        <span className="text-xs text-text-muted">No custom cover banner uploaded</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => coverInputRef.current?.click()}
                        className="bg-gold-gradient text-black font-extrabold text-xs uppercase tracking-wider shadow-lg"
                      >
                        <Camera className="w-4 h-4 mr-1.5" />
                        Change Cover Banner
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-[11px] text-text-muted">
                      Recommended: 1920x600px wide image for crisp display across all devices
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => coverInputRef.current?.click()}
                      className="text-gold text-xs font-semibold hover:bg-gold/10"
                    >
                      Browse Image
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 3: Genres & Skills */}
        {activeSection === 'genres' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-display font-black text-text-primary uppercase tracking-tight">
                Genres &amp; Skills
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Highlight your musical expertise, supported event formats, and gear.
              </p>
            </div>

            <Card className="bg-[#121212] border-[#262626]">
              <CardContent className="p-5 sm:p-6 space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-xs font-semibold text-text-secondary">Music Genres (Select up to 5)</Label>
                    <span className="text-[11px] font-mono text-gold">{form.genres.length}/5 selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map((g) => {
                      const selected = form.genres.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleArray('genres', g)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                            selected
                              ? 'bg-gold-gradient text-black shadow-[0_0_12px_rgba(244,224,89,0.3)] font-extrabold'
                              : 'bg-[#1a1a1a] text-text-muted border border-[#2e2e2e] hover:text-text-primary hover:border-gold/30'
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#222222]">
                  <Label className="text-xs font-semibold text-text-secondary block mb-2">Event Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map((et) => {
                      const selected = form.eventTypes.includes(et);
                      return (
                        <button
                          key={et}
                          type="button"
                          onClick={() => toggleArray('eventTypes', et)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                            selected
                              ? 'bg-gold/15 text-gold border border-gold shadow-[0_0_10px_rgba(244,224,89,0.2)]'
                              : 'bg-[#1a1a1a] text-text-muted border border-[#2e2e2e] hover:text-text-primary hover:border-gold/30'
                          }`}
                        >
                          {et}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#222222]">
                  <Label className="text-xs font-semibold text-text-secondary block mb-2">DJ Equipment / Gear</Label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT.map((eq) => {
                      const selected = form.equipment.includes(eq);
                      return (
                        <button
                          key={eq}
                          type="button"
                          onClick={() => toggleArray('equipment', eq)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                            selected
                              ? 'bg-gold/15 text-gold border border-gold shadow-[0_0_10px_rgba(244,224,89,0.2)]'
                              : 'bg-[#1a1a1a] text-text-muted border border-[#2e2e2e] hover:text-text-primary hover:border-gold/30'
                          }`}
                        >
                          {eq}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#222222]">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-xs font-semibold text-text-secondary">Awards &amp; Recognition</Label>
                    <Button type="button" size="sm" variant="ghost" onClick={addAward} className="text-gold text-xs h-7 hover:bg-gold/10">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Award
                    </Button>
                  </div>
                  {form.awards.length === 0 ? (
                    <p className="text-xs text-text-muted italic">No awards added yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {form.awards.map((a, i) => (
                        <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-black-surface border border-gold/40 rounded-full text-xs text-gold">
                          <span>{a}</span>
                          <button type="button" onClick={() => removeAward(i)} className="text-red hover:scale-110">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 4: Rates & Availability */}
        {activeSection === 'pricing' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-display font-black text-text-primary uppercase tracking-tight">
                Rates &amp; Availability
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Configure your performance rates, travel availability, and deposit terms.
              </p>
            </div>

            <Card className="bg-[#121212] border-[#262626]">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-text-secondary">Currency</Label>
                    <Select
                      value={form.currency}
                      onValueChange={(val) => updateForm((prev) => ({ ...prev, currency: val }))}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary">
                        <SelectValue placeholder="Currency" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141414] border-[#2a2a2a] text-text-primary">
                        <SelectItem value="SLE">SLE (Sierra Leone Leones)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-text-secondary">Deposit Required (%)</Label>
                    <Input
                      type="number"
                      value={form.depositPercent}
                      onChange={(e) => updateForm((prev) => ({ ...prev, depositPercent: e.target.value }))}
                      placeholder="30"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-text-secondary">Minimum Booking Fee</Label>
                    <Input
                      type="number"
                      value={form.bookingFeeMin}
                      onChange={(e) => updateForm((prev) => ({ ...prev, bookingFeeMin: e.target.value }))}
                      placeholder="e.g. 1500"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-text-secondary">Maximum Booking Fee</Label>
                    <Input
                      type="number"
                      value={form.bookingFeeMax}
                      onChange={(e) => updateForm((prev) => ({ ...prev, bookingFeeMax: e.target.value }))}
                      placeholder="e.g. 5000"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-text-secondary">Hourly Rate</Label>
                    <Input
                      type="number"
                      value={form.hourlyRate}
                      onChange={(e) => updateForm((prev) => ({ ...prev, hourlyRate: e.target.value }))}
                      placeholder="e.g. 300"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-text-secondary">Full Day Rate</Label>
                    <Input
                      type="number"
                      value={form.fullDayRate}
                      onChange={(e) => updateForm((prev) => ({ ...prev, fullDayRate: e.target.value }))}
                      placeholder="e.g. 3500"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#222222] space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="willTravel"
                      checked={form.willTravel}
                      onChange={(e) => updateForm((prev) => ({ ...prev, willTravel: e.target.checked }))}
                      className="w-4 h-4 rounded border-dark-gray bg-[#0a0a0a] text-gold focus:ring-gold"
                    />
                    <Label htmlFor="willTravel" className="text-xs font-semibold text-text-primary cursor-pointer">
                      Available to travel for international &amp; provincial gigs
                    </Label>
                  </div>

                  {form.willTravel && (
                    <div className="space-y-1.5 pl-7">
                      <Label className="text-xs font-semibold text-text-secondary">Max Travel Distance (km)</Label>
                      <Input
                        type="number"
                        value={form.maxTravelDistanceKm}
                        onChange={(e) => updateForm((prev) => ({ ...prev, maxTravelDistanceKm: e.target.value }))}
                        placeholder="e.g. 500"
                        className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary max-w-xs"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 5: Marketplace */}
        {activeSection === 'marketplace' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-display font-black text-text-primary uppercase tracking-tight">
                Marketplace Services
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Offer specialized packages, sound equipment rentals, or lighting services.
              </p>
            </div>

            <Card className="bg-[#121212] border-[#262626]">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-text-secondary">Offered Services &amp; Packages</Label>
                  <Button type="button" size="sm" onClick={addService} className="bg-gold-gradient text-black font-extrabold text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Service
                  </Button>
                </div>

                {form.services.length === 0 ? (
                  <div className="text-center py-8 bg-[#0a0a0a] rounded-xl border border-dashed border-[#2a2a2a]">
                    <ShoppingBag className="w-8 h-8 text-text-muted mx-auto mb-2" />
                    <p className="text-xs text-text-muted">No marketplace packages added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.services.map((s, i) => (
                      <div key={i} className="p-3.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-text-primary">{s.name}</h4>
                          {s.price && (
                            <span className="text-xs font-mono text-gold font-semibold">
                              {form.currency} {s.price}
                            </span>
                          )}
                          {s.description && (
                            <p className="text-xs text-text-muted mt-1">{s.description}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(i)}
                          className="text-red hover:bg-red/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 6: Social & Links */}
        {activeSection === 'social' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-display font-black text-text-primary uppercase tracking-tight">
                Social &amp; Streaming Links
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Connect your social media channels and music streaming profiles.
              </p>
            </div>

            <Card className="bg-[#121212] border-[#262626]">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-text-secondary">Official Website</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => updateForm((prev) => ({ ...prev, website: e.target.value }))}
                    placeholder="https://yourwebsite.com"
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-text-secondary">WhatsApp Direct Booking Number</Label>
                  <Input
                    value={form.whatsappNumber}
                    onChange={(e) => updateForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
                    placeholder="+232 76 000000"
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary"
                  />
                </div>

                <div className="pt-3 border-t border-[#222222]">
                  <Label className="text-xs font-semibold text-text-secondary block mb-3">Social Profiles</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['instagram', 'twitter', 'tiktok', 'youtube', 'facebook'].map((net) => (
                      <div key={net} className="space-y-1">
                        <Label className="text-[11px] font-semibold text-text-muted uppercase">{net}</Label>
                        <Input
                          value={form.socialLinks[net] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateForm((prev) => ({
                              ...prev,
                              socialLinks: { ...prev.socialLinks, [net]: val },
                            }));
                          }}
                          placeholder={`https://${net}.com/yourhandle`}
                          className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#222222]">
                  <Label className="text-xs font-semibold text-text-secondary block mb-3">Music Streaming Platforms</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['audiomack', 'soundcloud', 'mixcloud', 'spotify', 'appleMusic', 'hearthis'].map((platform) => (
                      <div key={platform} className="space-y-1">
                        <Label className="text-[11px] font-semibold text-text-muted uppercase">{platform}</Label>
                        <Input
                          value={form.streamingLinks[platform] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateForm((prev) => ({
                              ...prev,
                              streamingLinks: { ...prev.streamingLinks, [platform]: val },
                            }));
                          }}
                          placeholder={`https://${platform}.com/yourchannel`}
                          className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 7: Verification */}
        {activeSection === 'verification' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-display font-black text-text-primary uppercase tracking-tight">
                DJ Verification
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Verify your identity to get the official gold verified badge on Deck Salone.
              </p>
            </div>

            <Card className="bg-[#121212] border-[#262626]">
              <CardContent className="p-5 sm:p-6 space-y-4">
                {isVerified ? (
                  <div className="p-6 text-center bg-green/10 border border-green/30 rounded-2xl">
                    <ShieldCheck className="w-12 h-12 text-green mx-auto mb-2" />
                    <h3 className="text-lg font-bold text-text-primary">You are Officially Verified</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      Your identity and DJ status have been verified by the Deck Salone trust &amp; safety team.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleVerificationSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-text-secondary">Full Legal Name</Label>
                      <Input
                        value={verificationForm.fullLegalName}
                        onChange={(e) => setVerificationForm({ ...verificationForm, fullLegalName: e.target.value })}
                        placeholder="As shown on your official ID"
                        className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-text-secondary">Nationality</Label>
                        <Input
                          value={verificationForm.nationality}
                          onChange={(e) => setVerificationForm({ ...verificationForm, nationality: e.target.value })}
                          className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-text-secondary">Document Type</Label>
                        <Select
                          value={verificationForm.idDocumentType}
                          onValueChange={(val) => setVerificationForm({ ...verificationForm, idDocumentType: val })}
                        >
                          <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary">
                            <SelectValue placeholder="Select ID Type" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#141414] border-[#2a2a2a] text-text-primary">
                            <SelectItem value="passport">Passport</SelectItem>
                            <SelectItem value="national_id">National ID Card</SelectItem>
                            <SelectItem value="voter_id">Voter ID Card</SelectItem>
                            <SelectItem value="drivers_license">Driver&apos;s License</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-text-secondary">Upload ID Document</Label>
                      <input
                        ref={idDocInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => setIdDocFile(e.target.files?.[0] || null)}
                      />
                      <div
                        onClick={() => idDocInputRef.current?.click()}
                        className="p-4 border-2 border-dashed border-[#333333] hover:border-gold/50 rounded-xl bg-[#0a0a0a] text-center cursor-pointer transition-colors"
                      >
                        <FileText className="w-6 h-6 text-gold mx-auto mb-1" />
                        <span className="text-xs font-semibold text-text-primary block">
                          {idDocFile ? idDocFile.name : 'Click to select ID photo or PDF'}
                        </span>
                        <span className="text-[10px] text-text-muted">JPG, PNG, PDF up to 10MB</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-text-secondary">Social Proof / Event Links</Label>
                      <Input
                        value={verificationForm.socialProofLinks}
                        onChange={(e) => setVerificationForm({ ...verificationForm, socialProofLinks: e.target.value })}
                        placeholder="e.g. Links to flyers, news articles, verified Instagram"
                        className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={verificationSubmitting}
                      className="w-full bg-gold-gradient text-black font-extrabold text-xs uppercase tracking-wider py-2.5"
                    >
                      {verificationSubmitting ? 'Submitting Request...' : 'Submit Verification Request'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ─── Main Hub View (Matching Image 3) ───
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Hidden file inputs for avatar and cover */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setAvatarFile(file);
            setHasChanges(true);
            const reader = new FileReader();
            reader.onloadend = () => setAvatarPreview(reader.result as string);
            reader.readAsDataURL(file);
          }
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setCoverFile(file);
            setHasChanges(true);
            const reader = new FileReader();
            reader.onloadend = () => setCoverPreview(reader.result as string);
            reader.readAsDataURL(file);
          }
        }}
      />

      {error && (
        <div className="p-3.5 rounded-xl bg-red/10 border border-red/30 text-red text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ═══════════ Hero Header Card ═══════════ */}
      <div className="relative rounded-2xl overflow-hidden bg-[#0d0d0d] border border-[#222222] shadow-2xl">
        {/* Cover Banner Area */}
        <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-black">
          <img
            src={coverPreview || djData?.coverBanner || '/images/battle-arena.jpg'}
            alt="DJ Cover"
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/50 to-transparent" />
        </div>

        {/* User Info Content Overlapping Banner */}
        <div className="relative px-4 sm:px-6 pb-5 pt-0 -mt-12 sm:-mt-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              {/* Large Circular Avatar with Camera Badge */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[3.5px] border-white/90 bg-black overflow-hidden shadow-2xl">
                  <img
                    src={avatarPreview || djData?.avatar || user?.avatar || '/logo-icon.png'}
                    alt={form.stageName || 'DJ Avatar'}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Camera Edit Badge */}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-gold text-black hover:scale-110 active:scale-95 transition-transform shadow-lg border-2 border-[#0d0d0d] cursor-pointer"
                  title="Change Profile Picture"
                >
                  <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Names & Tags */}
              <div className="space-y-1 mb-1">
                {/* Verified Pill */}
                {isVerified && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 border border-gold/30 text-gold text-[10px] font-extrabold uppercase tracking-wide">
                    <Check className="w-3 h-3 text-gold" />
                    <span>Verified</span>
                  </div>
                )}

                {/* Stage Name + Badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-xl sm:text-2xl font-black text-text-primary uppercase tracking-tight">
                    {form.stageName || user?.name || 'Deck Salone'}
                  </h1>
                  {isVerified && (
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="8" fill="#F4E059" />
                      <path d="M5 8L7 10L11 6" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <MapPin className="w-3.5 h-3.5 text-text-secondary" />
                  <span>{form.city ? `${form.city}, ${form.country}` : 'Freetown, Sierra Leone'}</span>
                </div>

                {/* Genres */}
                {form.genres.length > 0 && (
                  <p className="text-xs text-text-secondary font-medium">
                    {form.genres.join(' • ')}
                  </p>
                )}
              </div>
            </div>

            {/* Preview Public Profile Button */}
            <div className="sm:self-start sm:mt-14">
              <Link
                to={`/dj/${djId || user?.username || 'me'}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-text-primary text-xs font-semibold transition-colors"
              >
                <span>Preview Public Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
              </Link>
            </div>
          </div>

          {/* Profile Completion Card Widget — ONLY shown if NOT verified and profile is under 100% */}
          {!isVerified && completionStats.percentage < 100 && (
            <div className="mt-5 pt-4 border-t border-[#222222] grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-[#141414]/70 rounded-xl p-3.5 border border-[#222222]/80">
              {/* Left: Completion % */}
              <div>
                <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">Profile Completion</span>
                <div className="text-2xl font-black text-gold mt-0.5">
                  {completionStats.percentage}%
                </div>
                <div className="w-full h-2 rounded-full bg-[#2a2a2a] overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold via-amber-300 to-gold transition-all duration-500"
                    style={{ width: `${completionStats.percentage}%` }}
                  />
                </div>
              </div>

              {/* Right: Remaining Checklist Items */}
              <div
                onClick={() => {
                  if (completionStats.remaining.length > 0) {
                    setActiveSection(completionStats.remaining[0].section);
                  }
                }}
                className="sm:border-l sm:border-[#2a2a2a] sm:pl-4 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gold">
                    {completionStats.remaining.length > 0
                      ? `${completionStats.remaining.length} things remaining`
                      : 'Profile 100% Complete!'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-transform" />
                </div>
                {completionStats.remaining.length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5">
                    {completionStats.remaining.slice(0, 3).map((item, idx) => (
                      <li key={idx} className="text-xs text-text-secondary flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-gold shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> All essential profile details are filled out.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ Section: PROFILE SETTINGS ═══════════ */}
      <div>
        <h3 className="text-xs font-extrabold text-text-muted uppercase tracking-[0.15em] mb-3 px-1">
          PROFILE SETTINGS
        </h3>

        <div className="space-y-2.5">
          {/* 1. About You */}
          <div
            onClick={() => setActiveSection('about')}
            className="bg-[#121212] border border-[#242424] hover:border-gold/50 rounded-xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer transition-all duration-200 group hover:bg-[#161616]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center text-gold group-hover:border-gold group-hover:scale-105 transition-all shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">
                  About You
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  Stage name, bio, location &amp; languages
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* 2. Photos & Branding */}
          <div
            onClick={() => setActiveSection('photos')}
            className="bg-[#121212] border border-[#242424] hover:border-gold/50 rounded-xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer transition-all duration-200 group hover:bg-[#161616]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center text-gold group-hover:border-gold group-hover:scale-105 transition-all shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">
                  Photos &amp; Branding
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  Profile picture, cover image &amp; gallery
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* 3. Genres & Skills */}
          <div
            onClick={() => setActiveSection('genres')}
            className="bg-[#121212] border border-[#242424] hover:border-gold/50 rounded-xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer transition-all duration-200 group hover:bg-[#161616]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center text-gold group-hover:border-gold group-hover:scale-105 transition-all shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">
                  Genres &amp; Skills
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  Music genres, DJ styles &amp; specialties
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* 4. Rates & Availability */}
          <div
            onClick={() => setActiveSection('pricing')}
            className="bg-[#121212] border border-[#242424] hover:border-gold/50 rounded-xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer transition-all duration-200 group hover:bg-[#161616]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center text-gold group-hover:border-gold group-hover:scale-105 transition-all shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">
                  Rates &amp; Availability
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  Set your booking rates &amp; availability
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* 5. Marketplace */}
          <div
            onClick={() => setActiveSection('marketplace')}
            className="bg-[#121212] border border-[#242424] hover:border-gold/50 rounded-xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer transition-all duration-200 group hover:bg-[#161616]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center text-gold group-hover:border-gold group-hover:scale-105 transition-all shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">
                  Marketplace
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  Services, equipment &amp; products
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* 6. Social & Links */}
          <div
            onClick={() => setActiveSection('social')}
            className="bg-[#121212] border border-[#242424] hover:border-gold/50 rounded-xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer transition-all duration-200 group hover:bg-[#161616]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center text-gold group-hover:border-gold group-hover:scale-105 transition-all shrink-0">
                <LinkIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">
                  Social &amp; Links
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  Connect your social platforms
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* 7. Verification */}
          <div
            onClick={() => setActiveSection('verification')}
            className="bg-[#121212] border border-[#242424] hover:border-gold/50 rounded-xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer transition-all duration-200 group hover:bg-[#161616]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center text-gold group-hover:border-gold group-hover:scale-105 transition-all shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">
                  Verification
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  Verify your identity &amp; professional status
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isVerified ? (
                <span className="px-2.5 py-0.5 rounded-full bg-green/15 border border-green/30 text-green text-[11px] font-extrabold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Verified
                </span>
              ) : djData?.verificationStatus === 'pending' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-400 text-[11px] font-extrabold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> In Review
                </span>
              ) : null}
              <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ Upgrade to Pro Card — only shown for Free tier ═══════════ */}
      {(() => {
        const subTier = (djData?.subscriptionTier || (user as any)?.subscriptionTier || (user as any)?.djProfile?.subscriptionTier || 'FREE').toUpperCase();
        const hasActiveSubscription = subTier !== 'FREE' && subTier !== 'NONE' && subTier !== '';
        if (hasActiveSubscription) return null;
        return (
          <div className="rounded-2xl bg-gradient-to-r from-gold/15 via-[#1a1808] to-[#121212] border border-gold/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(244,224,89,0.06)]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gold/20 border border-gold/50 flex items-center justify-center text-gold shrink-0">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-text-primary">
                  Upgrade to Pro
                </h4>
                <p className="text-xs text-text-secondary mt-0.5 max-w-md leading-relaxed">
                  Get more bookings and grow your brand with Pro features on Deck Salone.
                </p>
              </div>
            </div>
            <Link
              to="/dashboard/subscription"
              className="px-5 py-2.5 rounded-xl bg-gold-gradient text-black font-extrabold text-xs uppercase tracking-wider hover:scale-[1.03] active:scale-[0.98] transition-transform text-center shrink-0 shadow-md"
            >
              Upgrade Now
            </Link>
          </div>
        );
      })()}

      {/* ═══════════ Bottom Sticky Action Bar ═══════════ */}
      <div className="sticky bottom-4 z-40 bg-[#121212]/95 backdrop-blur-md border border-[#2a2a2a] rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-2">
          {hasChanges ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Unsaved changes
            </span>
          ) : saved ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
              <Check className="w-3.5 h-3.5" />
              Profile updated
            </span>
          ) : (
            <span className="text-xs text-text-muted font-medium">
              Profile up to date
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              className="text-xs text-text-secondary hover:text-text-primary px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors font-medium"
            >
              Discard
            </button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-gold-gradient text-black font-extrabold text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
