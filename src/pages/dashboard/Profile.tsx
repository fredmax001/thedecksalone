import { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  Camera,
  Music,
  Save,
  Check,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const CITIES = [
  'Freetown',
  'Bo',
  'Kenema',
  'Makeni',
  'Koidu',
  'Lunsar',
  'Port Loko',
  'Kailahun',
  'Kabala',
  'Pujehun',
];

const LANGUAGES = ['English', 'Krio', 'Mende', 'Temne', 'Limba', 'Other'];

const EQUIPMENT = [
  'Pioneer DJ',
  'Serato DJ',
  'Traktor',
  'Rekordbox',
  'CDJs',
  'Turntables',
  'Controller',
  'PA System',
  'Lighting',
];

export default function Profile() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [djData, setDjData] = useState<any>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const isDj = user?.role === 'DJ';
  const djId = user?.djProfile?.id;

  // Form state
  const [form, setForm] = useState({
    stageName: '',
    fullName: '',
    bio: '',
    yearsActive: '',
    city: '',
    genres: [] as string[],
    awards: [] as string[],
    equipment: [] as string[],
    languages: [] as string[],
    bookingFeeMin: '',
    bookingFeeMax: '',
    currency: 'SLE',
    website: '',
    whatsappNumber: '',
  });

  useEffect(() => {
    if (!isDj || !djId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await api.get(`/djs/${djId}`);
        if (res.data.success) {
          const dj = res.data.data;
          setDjData(dj);
          setForm({
            stageName: dj.stageName || '',
            fullName: dj.fullName || '',
            bio: dj.bio || '',
            yearsActive: String(dj.yearsActive || ''),
            city: dj.city || '',
            genres: dj.genres || [],
            awards: dj.awards || [],
            equipment: dj.equipment || [],
            languages: dj.languages || [],
            bookingFeeMin: String(dj.bookingFeeMin || ''),
            bookingFeeMax: String(dj.bookingFeeMax || ''),
            currency: dj.currency || 'SLE',
            website: dj.website || '',
            whatsappNumber: dj.whatsappNumber || '',
          });
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isDj, djId]);

  const handleSave = async () => {
    if (!djId) return;
    try {
      setSaving(true);
      setError(null);

      // Use FormData when images are present, otherwise JSON
      const hasImages = avatarFile || coverFile;
      let res;

      if (hasImages) {
        const formData = new FormData();
        if (form.stageName) formData.append('stageName', form.stageName);
        if (form.fullName) formData.append('fullName', form.fullName);
        if (form.bio) formData.append('bio', form.bio);
        if (form.yearsActive) formData.append('yearsActive', form.yearsActive);
        if (form.city) formData.append('city', form.city);
        if (form.genres.length) form.genres.forEach((g) => formData.append('genres', g));
        if (form.awards.length) form.awards.forEach((a) => formData.append('awards', a));
        if (form.equipment.length) form.equipment.forEach((e) => formData.append('equipment', e));
        if (form.languages.length) form.languages.forEach((l) => formData.append('languages', l));
        if (form.bookingFeeMin) formData.append('bookingFeeMin', form.bookingFeeMin);
        if (form.bookingFeeMax) formData.append('bookingFeeMax', form.bookingFeeMax);
        if (form.currency) formData.append('currency', form.currency);
        if (form.website) formData.append('website', form.website);
        if (form.whatsappNumber) formData.append('whatsappNumber', form.whatsappNumber);
        if (avatarFile) formData.append('avatar', avatarFile);
        if (coverFile) formData.append('coverBanner', coverFile);

        res = await api.put(`/djs/${djId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const payload = {
          ...form,
          yearsActive: form.yearsActive ? parseInt(form.yearsActive) : undefined,
          bookingFeeMin: form.bookingFeeMin ? parseFloat(form.bookingFeeMin) : undefined,
          bookingFeeMax: form.bookingFeeMax ? parseFloat(form.bookingFeeMax) : undefined,
        };
        res = await api.put(`/djs/${djId}`, payload);
      }

      if (res.data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        // Clear file selections after successful save
        setAvatarFile(null);
        setAvatarPreview(null);
        setCoverFile(null);
        setCoverPreview(null);
        // Refresh profile data
        const refreshed = await api.get(`/djs/${djId}`);
        if (refreshed.data.success) {
          setDjData(refreshed.data.data);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleArray = (field: keyof typeof form, value: string) => {
    setForm((prev) => {
      const current = prev[field] as string[];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const addAward = () => {
    const award = prompt('Enter award name:');
    if (award?.trim()) {
      setForm((prev) => ({ ...prev, awards: [...prev.awards, award.trim()] }));
    }
  };

  const removeAward = (index: number) => {
    setForm((prev) => ({ ...prev, awards: prev.awards.filter((_, i) => i !== index) }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  if (!isDj) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Profile editing is only available for DJs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Profile
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Edit your public DJ profile. This is what clients see when they visit your page.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <Badge className="bg-green/10 text-green border-0">
              <Check className="w-3 h-3 mr-1" />
              Saved
            </Badge>
          )}
          <Button
            className="bg-gold-gradient text-black hover:opacity-90"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red/10 border border-red/30 text-red text-sm">
          {error}
        </div>
      )}

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="bg-black-elevated border border-dark-gray flex-wrap h-auto">
          <TabsTrigger value="basic" className="data-[state=active]:bg-gold data-[state=active]:text-black">Basic Info</TabsTrigger>
          <TabsTrigger value="photos" className="data-[state=active]:bg-gold data-[state=active]:text-black">Photos</TabsTrigger>
          <TabsTrigger value="genres" className="data-[state=active]:bg-gold data-[state=active]:text-black">Genres & Skills</TabsTrigger>
          <TabsTrigger value="pricing" className="data-[state=active]:bg-gold data-[state=active]:text-black">Pricing</TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-gold data-[state=active]:text-black">Social & Links</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-4 space-y-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-text-secondary mb-2 block">Stage Name</Label>
                  <Input
                    value={form.stageName}
                    onChange={(e) => setForm({ ...form, stageName: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Full Name</Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
              </div>

              <div>
                <Label className="text-text-secondary mb-2 block">Bio</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={5}
                  maxLength={2000}
                  className="bg-black-elevated border-dark-gray text-text-primary resize-none"
                />
                <p className="text-xs text-text-muted mt-1">{form.bio.length}/2000 characters</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-text-secondary mb-2 block">Years Active</Label>
                  <Input
                    type="number"
                    value={form.yearsActive}
                    onChange={(e) => setForm({ ...form, yearsActive: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">City</Label>
                  <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                    <SelectTrigger className="bg-black-elevated border-dark-gray text-text-primary">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent className="bg-black-surface border-dark-gray">
                      {CITIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Languages</Label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => toggleArray('languages', lang)}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs border transition-colors',
                          form.languages.includes(lang)
                            ? 'bg-gold/20 border-gold text-gold'
                            : 'bg-black-elevated border-dark-gray text-text-secondary hover:border-gold/30'
                        )}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="p-6 space-y-6">
              <div>
                <Label className="text-text-secondary mb-3 block">Avatar</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 border-2 border-gold/30">
                    <AvatarImage src={avatarPreview || djData?.avatar} />
                    <AvatarFallback className="bg-gold/20 text-gold text-xl font-bold">
                      {form.stageName?.slice(0, 2).toUpperCase() || 'DJ'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAvatarFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setAvatarPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      className="border-dark-gray text-text-primary"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {avatarFile ? 'Change Avatar' : 'Upload Avatar'}
                    </Button>
                    {avatarFile && (
                      <p className="text-xs text-green mt-1">{avatarFile.name} selected</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-2">Recommended: 400x400px square image</p>
              </div>

              <div className="border-t border-dark-gray pt-6">
                <Label className="text-text-secondary mb-3 block">Cover Banner</Label>
                <div className="w-full h-40 rounded-xl bg-black-elevated border border-dashed border-dark-gray overflow-hidden relative">
                  {coverPreview || djData?.coverBanner ? (
                    <img
                      src={coverPreview || djData?.coverBanner}
                      alt="Cover banner"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <Camera className="w-8 h-8 text-text-muted mb-2" />
                      <p className="text-sm text-text-secondary">Upload cover banner</p>
                      <p className="text-xs text-text-muted">Recommended: 1920x1080px</p>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCoverFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => setCoverPreview(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    className="border-dark-gray text-text-primary"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {coverFile ? 'Change Cover' : 'Upload Cover'}
                  </Button>
                  {coverFile && (
                    <p className="text-xs text-green mt-1">{coverFile.name} selected</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="genres" className="mt-4 space-y-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-text-secondary block">Genres</Label>
                  <span className={cn('text-xs', form.genres.length >= 5 ? 'text-gold' : 'text-text-muted')}>
                    {form.genres.length}/5 selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => toggleArray('genres', genre)}
                      disabled={!form.genres.includes(genre) && form.genres.length >= 5}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs border transition-colors',
                        form.genres.includes(genre)
                          ? 'bg-gold/20 border-gold text-gold'
                          : 'bg-black-elevated border-dark-gray text-text-secondary hover:border-gold/30',
                        !form.genres.includes(genre) && form.genres.length >= 5 && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Music className="w-3 h-3 inline mr-1" />
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-dark-gray pt-6">
                <Label className="text-text-secondary mb-3 block">Equipment</Label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT.map((eq) => (
                    <button
                      key={eq}
                      onClick={() => toggleArray('equipment', eq)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs border transition-colors',
                        form.equipment.includes(eq)
                          ? 'bg-gold/20 border-gold text-gold'
                          : 'bg-black-elevated border-dark-gray text-text-secondary hover:border-gold/30'
                      )}
                    >
                      {eq}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-dark-gray pt-6">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-text-secondary block">Awards</Label>
                  <Button variant="ghost" size="sm" className="text-gold hover:bg-gold/10" onClick={addAward}>
                    + Add Award
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.awards.map((award, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-black-elevated">
                      <span className="text-sm text-text-primary">{award}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red hover:bg-red/10 h-6 px-2"
                        onClick={() => removeAward(i)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {form.awards.length === 0 && (
                    <p className="text-sm text-text-muted italic">No awards added yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-text-secondary mb-2 block">Min Booking Fee (SLE)</Label>
                  <Input
                    type="number"
                    value={form.bookingFeeMin}
                    onChange={(e) => setForm({ ...form, bookingFeeMin: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Max Booking Fee (SLE)</Label>
                  <Input
                    type="number"
                    value={form.bookingFeeMax}
                    onChange={(e) => setForm({ ...form, bookingFeeMax: e.target.value })}
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger className="bg-black-elevated border-dark-gray text-text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black-surface border-dark-gray">
                      <SelectItem value="SLE">SLE (Sierra Leone)</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-text-muted">
                Setting a price range helps clients understand your rates before reaching out.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="mt-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-text-secondary mb-2 block">Website</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://..."
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
                <div>
                  <Label className="text-text-secondary mb-2 block">WhatsApp Number</Label>
                  <Input
                    value={form.whatsappNumber}
                    onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                    placeholder="+232..."
                    className="bg-black-elevated border-dark-gray text-text-primary"
                  />
                </div>
              </div>
              <p className="text-xs text-text-muted">
                Social links and streaming platforms will be added here in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
