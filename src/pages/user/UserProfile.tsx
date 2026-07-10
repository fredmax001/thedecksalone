import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  'Koidu Town',
  'Port Loko',
  'Lunsar',
  'Waterloo',
  'Kabala',
  'Magburaka',
  'Kailahun',
  'Moyamba',
  'Pujehun',
  'Bonthe',
  'Kambia',
];

export default function UserProfile() {
  const { user, fetchMe } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    username: '',
    name: '',
    bio: '',
    location: '',
    avatar: '',
    favoriteGenres: [] as string[],
    social: {
      instagram: '',
      twitter: '',
      facebook: '',
    },
  });

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get('/users/profile');
        const data = res.data.data || {};
        setForm({
          username: data.username || user?.username || '',
          name: data.name || '',
          bio: data.bio || '',
          location: data.location || '',
          avatar: data.avatar || '',
          favoriteGenres: data.favoriteGenres || [],
          social: {
            instagram: data.social?.instagram || '',
            twitter: data.social?.twitter || '',
            facebook: data.social?.facebook || '',
          },
        });
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to load profile');
        setForm((prev) => ({
          ...prev,
          username: user?.username || '',
        }));
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await api.put('/users/profile', form);
      if (res.data?.success) {
        setSaved(true);
        toast.success('Profile updated successfully');
        fetchMe();
        setTimeout(() => setSaved(false), 3000);
      } else {
        toast.error(res.data?.error || 'Failed to update profile');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      e.target.value = '';
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.put('/users/avatar', formData);
      if (res.data?.success && res.data?.data?.avatar) {
        setForm((prev) => ({ ...prev, avatar: res.data.data.avatar }));
        fetchMe();
        toast.success('Avatar updated successfully');
      } else {
        toast.error(res.data?.error || 'Invalid response from server');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleGenre = (genre: string) => {
    setForm((prev) => ({
      ...prev,
      favoriteGenres: prev.favoriteGenres.includes(genre)
        ? prev.favoriteGenres.filter((g) => g !== genre)
        : [...prev.favoriteGenres, genre],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
          Profile
        </h1>
      </div>

      {/* Avatar Section */}
      <Card className="bg-black-elevated border-dark-gray">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-2 border-gold/30">
                <AvatarImage src={form.avatar} />
                <AvatarFallback className="bg-gold/10 text-gold text-2xl">
                  <User className="w-10 h-10" />
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-gold text-black rounded-full flex items-center justify-center hover:bg-gold-light transition-colors"
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <p className="font-medium text-text-primary">{form.name || form.username}</p>
              <p className="text-sm text-text-muted">@{form.username}</p>
              <p className="text-xs text-text-muted mt-1">
                Click the camera icon to upload a new avatar
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card className="bg-black-elevated border-dark-gray">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-text-primary">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-text-secondary">Display Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Your name"
                className="bg-black-surface border-dark-gray text-text-primary placeholder:text-text-muted"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-text-secondary">Username</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="username"
                className="bg-black-surface border-dark-gray text-text-primary placeholder:text-text-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-text-secondary">Bio</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us a bit about yourself..."
              rows={3}
              className="bg-black-surface border-dark-gray text-text-primary placeholder:text-text-muted resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-text-secondary flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Location
            </Label>
            <Select
              value={form.location}
              onValueChange={(v) => setForm((prev) => ({ ...prev, location: v }))}
            >
              <SelectTrigger className="bg-black-surface border-dark-gray text-text-primary">
                <SelectValue placeholder="Select your city" />
              </SelectTrigger>
              <SelectContent className="bg-black-surface border-dark-gray">
                {CITIES.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Favorite Genres */}
      <Card className="bg-black-elevated border-dark-gray">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-text-primary flex items-center gap-2">
            <Music className="w-4 h-4 text-gold" />
            Favorite Genres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  form.favoriteGenres.includes(genre)
                    ? 'bg-gold/20 text-gold border border-gold/30'
                    : 'bg-black-surface text-text-muted border border-dark-gray hover:border-text-muted'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card className="bg-black-elevated border-dark-gray">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-text-primary">Social Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-text-secondary flex items-center gap-1">
              <Instagram className="w-3.5 h-3.5" /> Instagram
            </Label>
            <Input
              value={form.social.instagram}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  social: { ...prev.social, instagram: e.target.value },
                }))
              }
              placeholder="@username or full URL"
              className="bg-black-surface border-dark-gray text-text-primary placeholder:text-text-muted"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-text-secondary flex items-center gap-1">
              <Twitter className="w-3.5 h-3.5" /> Twitter / X
            </Label>
            <Input
              value={form.social.twitter}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  social: { ...prev.social, twitter: e.target.value },
                }))
              }
              placeholder="@username or full URL"
              className="bg-black-surface border-dark-gray text-text-primary placeholder:text-text-muted"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-text-secondary flex items-center gap-1">
              <Facebook className="w-3.5 h-3.5" /> Facebook
            </Label>
            <Input
              value={form.social.facebook}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  social: { ...prev.social, facebook: e.target.value },
                }))
              }
              placeholder="Profile URL"
              className="bg-black-surface border-dark-gray text-text-primary placeholder:text-text-muted"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gold text-black hover:bg-gold-light"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : saved ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
        </Button>
        {saved && (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-green"
          >
            Profile updated successfully
          </motion.p>
        )}
      </div>
    </div>
  );
}
