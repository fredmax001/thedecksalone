import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Loader2,
  Play,
  Heart,
  Eye,
  MoreVertical,
  Plus,
  Upload,
  X,
  FileAudio,
  ImageIcon,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Mix {
  id: string;
  title: string;
  genre: string;
  coverImage?: string;
  plays: number;
  likes: number;
  isPublic: boolean;
  createdAt: string;
  duration?: string;
}

const GENRES = [
  'Afrobeats',
  'Dancehall',
  'Hip-Hop',
  'R&B',
  'House',
  'Amapiano',
  'Reggae',
  'Soca',
  'Gospel',
  'Open Format',
];

const CATEGORIES = [
  'Salone Mix',
  'Throwbacks',
  'Afrobeats',
  'Amapiano',
  'Dancehall',
  'Club Mixes',
  'Wedding Mixes',
  'Gospel',
];

export default function Mixes() {
  const { user } = useAuthStore();
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    genre: '',
    category: '',
    description: '',
    isPublic: true,
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const isDj = user?.role === 'DJ';
  const djId = user?.djProfile?.id;

  useEffect(() => {
    if (!isDj || !djId) {
      setLoading(false);
      return;
    }

    const fetchMixes = async () => {
      try {
        const res = await api.get(`/mixes?djId=${djId}`);
        if (res.data.success) {
          setMixes(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load mixes', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMixes();
  }, [isDj, djId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) {
      toast.error('Audio file required');
      return;
    }
    if (!uploadForm.title || !uploadForm.genre || !uploadForm.category) {
      toast.error('Title, genre, and category are required');
      return;
    }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('title', uploadForm.title);
    formData.append('genre', uploadForm.genre);
    formData.append('category', uploadForm.category);
    formData.append('description', uploadForm.description);
    formData.append('isPublic', String(uploadForm.isPublic));
    formData.append('audio', audioFile);
    if (coverFile) formData.append('coverImage', coverFile);

    try {
      const res = await api.post('/mixes', formData);
      if (res.data.success) {
        toast.success('Mix uploaded successfully!');
        setMixes((prev) => [res.data.data, ...prev]);
        setIsUploadOpen(false);
        setUploadForm({ title: '', genre: '', category: '', description: '', isPublic: true });
        setAudioFile(null);
        setCoverFile(null);
      } else {
        toast.error(res.data.error || 'Upload failed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Upload failed');
    } finally {
      setUploadLoading(false);
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
            Mixes
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your mixes, track performance, and upload new content.
          </p>
        </div>
        <Button
          className="bg-gold-gradient text-black hover:opacity-90"
          onClick={() => setIsUploadOpen(true)}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload New Mix
        </Button>
      </div>

      <Tabs defaultValue="my-mixes" className="w-full">
        <TabsList className="bg-black-elevated border border-dark-gray">
          <TabsTrigger value="my-mixes" className="data-[state=active]:bg-gold data-[state=active]:text-black">
            My Mixes ({mixes.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-gold data-[state=active]:text-black">
            Mix Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-mixes" className="mt-4">
          {mixes.length === 0 ? (
            <Card className="bg-black-surface border-dark-gray">
              <CardContent className="py-12 text-center">
                <Music className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary mb-2">No mixes uploaded yet</p>
                <p className="text-sm text-text-muted mb-4">
                  Upload your mixes to showcase your talent and attract bookings.
                </p>
                <Button
                  className="bg-gold-gradient text-black"
                  onClick={() => setIsUploadOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Your First Mix
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {mixes.map((mix) => (
                <motion.div
                  key={mix.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-black-surface border-dark-gray overflow-hidden group hover:border-gold/30 transition-colors">
                    <div className="relative aspect-square bg-black-elevated">
                      {mix.coverImage ? (
                        <img
                          src={mix.coverImage}
                          alt={mix.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-12 h-12 text-text-muted" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="icon" className="bg-gold/90 text-black hover:bg-gold rounded-full">
                          <Play className="w-5 h-5 ml-0.5" />
                        </Button>
                      </div>
                      <div className="absolute top-2 right-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 bg-black/50 text-text-primary hover:bg-black/70"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-black-surface border-dark-gray">
                            <DropdownMenuItem className="cursor-pointer">Edit</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">View on Site</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Share</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-red">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Badge
                        className={cn(
                          'absolute bottom-2 left-2 border-0 text-xs',
                          mix.isPublic ? 'bg-green/10 text-green' : 'bg-yellow-500/10 text-yellow-500'
                        )}
                      >
                        {mix.isPublic ? 'Public' : 'Draft'}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-text-primary truncate mb-1">{mix.title}</h3>
                      <p className="text-xs text-text-secondary capitalize mb-3">{mix.genre}</p>
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          {mix.plays.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {mix.likes.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="py-12 text-center">
              <Eye className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary mb-2">Mix analytics coming soon</p>
              <p className="text-sm text-text-muted">
                Detailed play tracking, listener demographics, and engagement metrics will be available here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsUploadOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-lg bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsUploadOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#1E1E1E] transition-colors"
              >
                <X size={20} className="text-text-muted" />
              </button>

              <h2 className="font-display text-xl font-semibold text-text-primary uppercase tracking-tight">
                Upload New Mix
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Share your sound with the world
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleUpload}>
                <div>
                  <Label className="text-text-secondary mb-2 block">Title</Label>
                  <Input
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="Enter mix title"
                    className="bg-black-elevated border-dark-gray text-text-primary"
                    required
                  />
                </div>

                <div>
                  <Label className="text-text-secondary mb-2 block">Genre</Label>
                  <select
                    value={uploadForm.genre}
                    onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })}
                    className="w-full bg-black-elevated border border-dark-gray rounded-lg px-3 py-2 text-sm text-text-primary focus:border-gold focus:outline-none"
                    required
                  >
                    <option value="">Select genre</option>
                    {GENRES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-text-secondary mb-2 block">Category</Label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                    className="w-full bg-black-elevated border border-dark-gray rounded-lg px-3 py-2 text-sm text-text-primary focus:border-gold focus:outline-none"
                    required
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-text-secondary mb-2 block">Description</Label>
                  <Textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    placeholder="Tell listeners about this mix..."
                    rows={3}
                    className="bg-black-elevated border-dark-gray text-text-primary resize-none"
                  />
                </div>

                <div>
                  <Label className="text-text-secondary mb-2 block">Audio File *</Label>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-dark-gray hover:border-gold/50 transition-colors bg-black-elevated"
                  >
                    <FileAudio className="w-5 h-5 text-gold" />
                    <span className="text-sm text-text-secondary">
                      {audioFile ? audioFile.name : 'Click to select audio file'}
                    </span>
                  </button>
                </div>

                <div>
                  <Label className="text-text-secondary mb-2 block">Cover Image</Label>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-dark-gray hover:border-gold/50 transition-colors bg-black-elevated"
                  >
                    <ImageIcon className="w-5 h-5 text-gold" />
                    <span className="text-sm text-text-secondary">
                      {coverFile ? coverFile.name : 'Click to select cover image'}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={uploadForm.isPublic}
                    onChange={(e) => setUploadForm({ ...uploadForm, isPublic: e.target.checked })}
                    className="w-4 h-4 accent-gold rounded"
                  />
                  <Label htmlFor="isPublic" className="text-sm text-text-secondary cursor-pointer">
                    Make this mix public
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={uploadLoading}
                  className="w-full bg-gold-gradient text-black font-semibold uppercase hover:opacity-90"
                >
                  {uploadLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploadLoading ? 'Uploading...' : 'Upload Mix'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
