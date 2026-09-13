import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Loader2,
  Camera,
  Save,
  Check,
  MapPin,
  Music,
  Instagram,
  Twitter,
  Facebook,
  User,
  Link as LinkIcon,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  Disc3,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SIERRA_LEONE_CITIES } from '@/lib/sierraLeoneLocations';
import { AFRICAN_COUNTRIES } from '@/lib/africanCountries';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { getAvatarImageUrl } from '@/lib/utils';

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

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'NON_BINARY', label: 'Non-Binary' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

type SectionId = 'about' | 'genres' | 'social' | null;

interface UserProfileForm {
  username: string;
  name: string;
  bio: string;
  city: string;
  country: string;
  gender: string;
  dateOfBirth: string;
  favoriteGenres: string[];
  social: {
    instagram: string;
    twitter: string;
    facebook: string;
    tiktok: string;
  };
}

function parseApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export default function UserProfile() {
  const { user, fetchMe } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Switch to DJ dialog
  const [showDjDialog, setShowDjDialog] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Form state
  const [form, setForm] = useState<UserProfileForm>({
    username: '',
    name: '',
    bio: '',
    city: 'Freetown',
    country: 'Sierra Leone',
    gender: '',
    dateOfBirth: '',
    favoriteGenres: [],
    social: {
      instagram: '',
      twitter: '',
      facebook: '',
      tiktok: '',
    },
  });

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get('/users/profile');
        const data = res.data.data || {};
        const loadedForm: UserProfileForm = {
          username: data.username || user?.username || '',
          name: data.name || user?.name || '',
          bio: data.bio || '',
          city: data.city || data.location?.split(',')[0]?.trim() || 'Freetown',
          country: data.country || 'Sierra Leone',
          gender: data.gender || user?.gender || '',
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().slice(0, 10) : '',
          favoriteGenres: data.favoriteGenres || [],
          social: {
            instagram: data.social?.instagram || '',
            twitter: data.social?.twitter || '',
            facebook: data.social?.facebook || '',
            tiktok: data.social?.tiktok || '',
          },
        };
        setForm(loadedForm);
        if (data.avatar || user?.avatar) {
          setAvatarPreview(data.avatar || user?.avatar);
        }
      } catch (err: unknown) {
        toast.error(parseApiError(err, 'Failed to load profile'));
        const fallbackForm: UserProfileForm = {
          username: user?.username || '',
          name: user?.name || '',
          bio: '',
          city: 'Freetown',
          country: 'Sierra Leone',
          gender: user?.gender || '',
          dateOfBirth: '',
          favoriteGenres: [],
          social: { instagram: '', twitter: '', facebook: '', tiktok: '' },
        };
        setForm(fallbackForm);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const updateForm = (updater: (prev: UserProfileForm) => UserProfileForm) => {
    setForm((prev) => updater(prev));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.put('/users/avatar', formData);
      if (res.data.success) {
        toast.success('Avatar updated successfully');
        if (res.data.data?.avatar) {
          setAvatarPreview(res.data.data.avatar);
        }
        await fetchMe();
      }
    } catch (err) {
      toast.error(parseApiError(err, 'Failed to update avatar'));
      setAvatarPreview(user?.avatar || null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        username: form.username.trim(),
        name: form.name.trim(),
        bio: form.bio.trim(),
        city: form.city,
        country: form.country,
        location: `${form.city}, ${form.country}`,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        favoriteGenres: form.favoriteGenres,
        social: form.social,
      };

      const res = await api.put('/users/profile', payload);
      if (res.data?.success) {
        toast.success('Profile updated successfully!');
        await fetchMe();
        setActiveSection(null);
      }
    } catch (err: unknown) {
      const msg = parseApiError(err, 'Failed to update profile');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchToDj = async () => {
    setIsSwitching(true);
    try {
      const res = await api.post('/djs/switch-to-dj');
      if (res.data.success) {
        toast.success('Welcome to Deck Salone DJ Studio! Your DJ profile has been created.');
        await fetchMe();
        setShowDjDialog(false);
        navigate('/dashboard/profile');
      } else {
        toast.error(res.data.error || 'Failed to switch account role');
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to upgrade to DJ account'));
    } finally {
      setIsSwitching(false);
    }
  };

  const toggleGenre = (genre: string) => {
    updateForm((prev) => {
      const current = prev.favoriteGenres;
      if (current.includes(genre)) {
        return { ...prev, favoriteGenres: current.filter((g) => g !== genre) };
      }
      if (current.length >= 6) {
        toast.error('Maximum 6 favorite genres allowed');
        return prev;
      }
      return { ...prev, favoriteGenres: [...current, genre] };
    });
  };

  // Profile completion stats
  const completionStats = useMemo(() => {
    const checks = [
      { label: 'Upload profile avatar', done: !!avatarPreview || !!user?.avatar, section: null },
      { label: 'Set your full name', done: !!form.name?.trim(), section: 'about' as SectionId },
      { label: 'Add a bio description', done: !!form.bio?.trim(), section: 'about' as SectionId },
      { label: 'Select favorite genres', done: form.favoriteGenres.length > 0, section: 'genres' as SectionId },
      { label: 'Add your city / location', done: !!form.city?.trim(), section: 'about' as SectionId },
    ];

    const completed = checks.filter((c) => c.done).length;
    const percentage = Math.round((completed / checks.length) * 100);
    const remaining = checks.filter((c) => !c.done);

    return { percentage, remaining };
  }, [avatarPreview, user?.avatar, form]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  // ─── Render Sub-Section Editor if a section is active ───
  if (activeSection) {
    return (
      <div className="space-y-5 max-w-4xl mx-auto pb-24 px-3 sm:px-4">
        {/* Back Navigation Bar */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#222222]">
          <button
            onClick={() => setActiveSection(null)}
            className="inline-flex items-center gap-2 text-sm font-bold text-text-primary hover:text-gold transition-colors py-1 px-2 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4 text-gold" />
            <span>Back to Profile</span>
          </button>
          <Button
            size="sm"
            className="bg-gold-gradient text-black font-extrabold text-xs uppercase tracking-wider hover:scale-[1.02] transition-transform"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* Section 1: About You */}
        {activeSection === 'about' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-display font-black text-text-primary uppercase tracking-tight">
                About You
              </h2>
              <p className="text-[11px] text-text-muted mt-0.5">
                Name, username, bio, gender, and location.
              </p>
            </div>

            <Card className="bg-[#121212] border-[#262626]">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-text-secondary">Full Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => updateForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. John Kamara"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary focus:border-gold h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-text-secondary">Username</Label>
                    <Input
                      value={form.username}
                      onChange={(e) => updateForm((prev) => ({ ...prev, username: e.target.value.toLowerCase() }))}
                      placeholder="e.g. johnkamara"
                      className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary focus:border-gold h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold text-text-secondary">Bio</Label>
                    <span className="text-[10px] font-mono text-text-muted">{form.bio.length}/500</span>
                  </div>
                  <Textarea
                    value={form.bio}
                    onChange={(e) => updateForm((prev) => ({ ...prev, bio: e.target.value.slice(0, 500) }))}
                    rows={3}
                    placeholder="Music enthusiast..."
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary focus:border-gold text-xs leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-text-secondary">Gender</Label>
                    <Select
                      value={form.gender}
                      onValueChange={(val) => updateForm((prev) => ({ ...prev, gender: val }))}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary h-9 text-xs">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141414] border-[#2a2a2a] text-text-primary">
                        {GENDER_OPTIONS.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-text-secondary">City</Label>
                    {form.country === 'Sierra Leone' ? (
                      <Select
                        value={form.city}
                        onValueChange={(val) => updateForm((prev) => ({ ...prev, city: val }))}
                      >
                        <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary h-9 text-xs">
                          <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#141414] border-[#2a2a2a] text-text-primary max-h-64">
                          {CITIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={form.city}
                        onChange={(e) => updateForm((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder="Your city"
                        className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary focus:border-gold h-9 text-sm"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-semibold text-text-secondary">Country</Label>
                  <Select
                    value={form.country}
                    onValueChange={(val) => updateForm((prev) => ({ ...prev, country: val }))}
                  >
                    <SelectTrigger className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary h-9 text-xs">
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141414] border-[#2a2a2a] text-text-primary max-h-64">
                      {AFRICAN_COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 2: Favorite Genres */}
        {activeSection === 'genres' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-display font-black text-text-primary uppercase tracking-tight">
                Favorite Genres
              </h2>
              <p className="text-[11px] text-text-muted mt-0.5">
                Select your top genres to personalize your feed.
              </p>
            </div>

            <Card className="bg-[#121212] border-[#262626]">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => {
                    const isSelected = form.favoriteGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#f4e059] text-black shadow-sm'
                            : 'bg-[#0a0a0a] border border-[#2a2a2a] text-text-secondary hover:border-gold/50 hover:text-text-primary'
                        }`}
                      >
                        <Music className={`w-3 h-3 ${isSelected ? 'text-black' : 'text-gold'}`} />
                        <span>{genre}</span>
                        {isSelected && <Check className="w-3 h-3 ml-0.5 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-text-muted pt-1">
                  {form.favoriteGenres.length} of 6 genres selected.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 3: Social Links */}
        {activeSection === 'social' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-display font-black text-text-primary uppercase tracking-tight">
                Social Profiles
              </h2>
              <p className="text-[11px] text-text-muted mt-0.5">
                Connect your social media channels.
              </p>
            </div>

            <Card className="bg-[#121212] border-[#262626]">
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-text-secondary flex items-center gap-2">
                    <Instagram className="w-3.5 h-3.5 text-pink-500" /> Instagram
                  </Label>
                  <Input
                    value={form.social.instagram}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        social: { ...prev.social, instagram: e.target.value },
                      }))
                    }
                    placeholder="@handle or URL"
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary focus:border-gold h-9 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-text-secondary flex items-center gap-2">
                    <Twitter className="w-3.5 h-3.5 text-sky-400" /> Twitter / X
                  </Label>
                  <Input
                    value={form.social.twitter}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        social: { ...prev.social, twitter: e.target.value },
                      }))
                    }
                    placeholder="@handle"
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary focus:border-gold h-9 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-text-secondary flex items-center gap-2">
                    <Facebook className="w-3.5 h-3.5 text-blue-500" /> Facebook
                  </Label>
                  <Input
                    value={form.social.facebook}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        social: { ...prev.social, facebook: e.target.value },
                      }))
                    }
                    placeholder="Profile URL"
                    className="bg-[#0a0a0a] border-[#2a2a2a] text-text-primary focus:border-gold h-9 text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ─── Main Hub View ───
  const displayName = form.name || user?.name || form.username || user?.username || 'Deck Salone Fan';
  const displayLocation = form.city ? `${form.city}, ${form.country}` : 'Freetown, Sierra Leone';

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-24 px-3 sm:px-4">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ═══════════ Hero Header Card ═══════════ */}
      <div className="relative rounded-2xl overflow-hidden bg-[#0d0d0d] border border-[#222222] shadow-xl">
        {/* Cover Banner Area */}
        <div className="relative h-24 sm:h-28 w-full overflow-hidden bg-black">
          <img
            src="/images/battle-arena.jpg"
            alt="User Cover"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/50 to-transparent" />
        </div>

        {/* User Info Content Overlapping Banner */}
        <div className="relative px-3 sm:px-4 pb-4 pt-0 -mt-10 sm:-mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] border-white/90 bg-black overflow-hidden shadow-xl">
                  <img
                    src={avatarPreview || getAvatarImageUrl(user?.avatar)}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-avatar.jpg';
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-gold text-black hover:scale-110 active:scale-95 transition-transform shadow-lg border-2 border-[#0d0d0d] cursor-pointer"
                  title="Change Profile Picture"
                >
                  <Camera className="w-3 h-3 stroke-[2.5]" />
                </button>
              </div>

              {/* Names & Tags */}
              <div className="space-y-0.5 mb-0.5">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 border border-gold/30 text-gold text-[9px] font-extrabold uppercase tracking-wide">
                  <User className="w-2.5 h-2.5 text-gold" />
                  <span>Fan / Listener</span>
                </div>

                <h1 className="font-display text-base sm:text-lg font-black text-text-primary uppercase tracking-tight">
                  {displayName}
                </h1>

                <div className="flex items-center gap-1 text-[10px] text-text-muted">
                  <MapPin className="w-3 h-3 text-text-secondary" />
                  <span>{displayLocation}</span>
                </div>

                {form.favoriteGenres.length > 0 && (
                  <p className="text-[10px] text-text-secondary font-medium truncate max-w-[200px]">
                    {form.favoriteGenres.join(' • ')}
                  </p>
                )}
              </div>
            </div>

            {/* Preview action */}
            <div className="flex items-center gap-2 sm:self-start sm:mt-10">
              <Button
                type="button"
                size="sm"
                onClick={() => setShowDjDialog(true)}
                className="bg-gold-gradient text-black font-extrabold text-[10px] uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all h-8"
              >
                <Disc3 className="w-3 h-3 mr-1" />
                Become DJ
              </Button>

              <Link
                to={`/u/${user?.username || user?.id || 'me'}`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-text-primary text-[10px] font-semibold transition-colors"
              >
                <span>Preview</span>
                <ExternalLink className="w-3 h-3 text-text-muted" />
              </Link>
            </div>
          </div>

          {/* Profile Completion Widget */}
          {completionStats.percentage < 100 && (
            <div className="mt-3 pt-3 border-t border-[#222222] grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-[#141414]/70 rounded-xl p-3 border border-[#222222]/80">
              <div>
                <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Profile Completion</span>
                <div className="text-xl font-black text-gold mt-0.5">{completionStats.percentage}%</div>
                <div className="w-full h-1.5 rounded-full bg-[#2a2a2a] overflow-hidden mt-1.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold via-amber-300 to-gold transition-all duration-500"
                    style={{ width: `${completionStats.percentage}%` }}
                  />
                </div>
              </div>

              <div
                onClick={() => {
                  if (completionStats.remaining.length > 0 && completionStats.remaining[0].section) {
                    setActiveSection(completionStats.remaining[0].section);
                  }
                }}
                className="sm:border-l sm:border-[#2a2a2a] sm:pl-3 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gold">
                    {completionStats.remaining.length > 0
                      ? `${completionStats.remaining.length} items remaining`
                      : 'Profile 100% Complete!'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-transform" />
                </div>
                {completionStats.remaining.length > 0 ? (
                  <ul className="mt-1 space-y-0">
                    {completionStats.remaining.slice(0, 2).map((item, idx) => (
                      <li key={idx} className="text-[10px] text-text-secondary flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-gold shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] text-green-400 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> All details filled out.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ Profile Settings ═══════════ */}
      <div>
        <h3 className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] mb-2 px-1">
          Profile Settings
        </h3>

        <div className="space-y-2">
          {/* About You */}
          <div
            onClick={() => setActiveSection('about')}
            className="bg-[#121212] border border-[#242424] hover:border-gold/50 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all duration-200 group hover:bg-[#161616]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center text-gold group-hover:border-gold group-hover:scale-105 transition-all shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">
                  About You
                </h4>
                <p className="text-[10px] text-text-muted">Name, username, bio, gender, location</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {form.name && form.bio ? (
                <span className="text-[9px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full border border-green-500/20 hidden sm:inline">
                  Complete
                </span>
              ) : (
                <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20 hidden sm:inline">
                  Incomplete
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Favorite Genres */}
          <div
            onClick={() => setActiveSection('genres')}
            className="bg-[#121212] border border-[#242424] hover:border-gold/50 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all duration-200 group hover:bg-[#161616]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center text-gold group-hover:border-gold group-hover:scale-105 transition-all shrink-0">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">
                  Favorite Genres
                </h4>
                <p className="text-[10px] text-text-muted">
                  {form.favoriteGenres.length > 0
                    ? `${form.favoriteGenres.length} genres selected`
                    : 'Personalize your music feed'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gold font-mono font-bold hidden sm:inline">
                {form.favoriteGenres.length}
              </span>
              <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Social Profiles */}
          <div
            onClick={() => setActiveSection('social')}
            className="bg-[#121212] border border-[#242424] hover:border-gold/50 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all duration-200 group hover:bg-[#161616]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center text-gold group-hover:border-gold group-hover:scale-105 transition-all shrink-0">
                <LinkIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">
                  Social Links
                </h4>
                <p className="text-[10px] text-text-muted">Instagram, Twitter / X, Facebook</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Switch to DJ */}
          <div
            onClick={() => setShowDjDialog(true)}
            className="bg-[#14120a] border border-gold/30 hover:border-gold rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all duration-200 group hover:bg-gold/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border border-gold bg-gold/20 flex items-center justify-center text-gold group-hover:scale-110 transition-all shrink-0">
                <Disc3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-gold uppercase tracking-tight flex items-center gap-1">
                  Become a DJ Studio
                  <span className="text-[8px] px-1 py-0 bg-gold text-black rounded font-black">UPGRADE</span>
                </h4>
                <p className="text-[10px] text-text-muted">Upload mixes, get bookings, join battles</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gold group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>

          {/* Account Settings */}
          <Link
            to="/user/settings"
            className="bg-[#121212] border border-[#242424] hover:border-gold/50 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all duration-200 group hover:bg-[#161616] block"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center text-gold group-hover:border-gold group-hover:scale-105 transition-all shrink-0">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">
                  Account Settings
                </h4>
                <p className="text-[10px] text-text-muted">Password, email, notifications, security</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        </div>
      </div>

      {/* Switch to DJ Dialog */}
      <Dialog open={showDjDialog} onOpenChange={setShowDjDialog}>
        <DialogContent className="bg-[#121212] border-[#2a2a2a] text-text-primary max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold font-display uppercase tracking-tight">
              <Disc3 className="w-5 h-5" /> Switch to DJ Account
            </DialogTitle>
            <DialogDescription className="text-text-muted text-sm leading-relaxed pt-2">
              Ready to take center stage? Upgrading to a DJ account unlocks your official DJ Studio:
              <ul className="mt-2 space-y-1 text-xs text-text-secondary list-disc pl-4">
                <li>Upload and distribute high-definition DJ mix sets</li>
                <li>Receive direct event gig bookings &amp; payments</li>
                <li>Get ranked on the weekly Top 10 DJ leaderboard</li>
                <li>Compete in live DJ Battles for cash and trophies</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDjDialog(false)}
              disabled={isSwitching}
              className="border-white/10 text-text-primary hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSwitchToDj}
              disabled={isSwitching}
              className="bg-[#f4e059] hover:bg-[#f4e059]/90 text-black font-extrabold"
            >
              {isSwitching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Upgrading...
                </>
              ) : (
                'Yes, Activate DJ Studio'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
