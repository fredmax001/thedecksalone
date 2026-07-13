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
  Pencil,
  ExternalLink,
  Share2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { cn, imageFallback } from '@/lib/utils';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useImportHearthis } from '@/hooks/useMixes';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Progress } from '@/components/ui/progress';

interface Mix {
  id: string;
  title: string;
  genre: string;
  category?: string;
  description?: string;
  coverImage?: string;
  audioUrl?: string;
  originalUrl?: string;
  audioSource?: string;
  plays: number;
  likes: number;
  isPublic: boolean;
  createdAt: string;
  duration?: string;
}

const GENRES = [
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
  const navigate = useNavigate();
  const { isFree, openUpgradeModal } = useFeatureAccess();
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    genre: '',
    description: '',
    isPublic: true,
    audioUrl: '',
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioSource, setAudioSource] = useState<'file' | 'url'>('file');
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const isDj = user?.role === 'DJ';
  const djId = user?.djProfile?.id;

  // Edit state
  const [editingMix, setEditingMix] = useState<Mix | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    genre: '',
    description: '',
    isPublic: true,
  });
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [deletingMixId, setDeletingMixId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hearthis import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importUrls, setImportUrls] = useState('');
  const [importGenre, setImportGenre] = useState('Salone Mix');
  const [importResult, setImportResult] = useState<{
    count: number;
    errorCount: number;
    errors: Array<{ url: string; error: string }>;
  } | null>(null);
  const { mutate: importHearthis, isPending: importLoading } = useImportHearthis();

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

  const handleUploadClick = () => {
    if (isFree && mixes.length >= 5) {
      openUpgradeModal('Unlimited Mix Uploads', 'pro');
      return;
    }
    setIsUploadOpen(true);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (audioSource === 'file' && !audioFile) {
      toast.error('Audio file required');
      return;
    }
    if (audioSource === 'url' && !uploadForm.audioUrl) {
      toast.error('Audio URL required');
      return;
    }
    if (!uploadForm.title || !uploadForm.genre) {
      toast.error('Title and genre are required');
      return;
    }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('title', uploadForm.title);
    formData.append('genre', uploadForm.genre);
    formData.append('category', uploadForm.genre);
    formData.append('description', uploadForm.description);
    formData.append('isPublic', String(uploadForm.isPublic));
    if (audioSource === 'file' && audioFile) {
      formData.append('audio', audioFile);
    } else if (audioSource === 'url' && uploadForm.audioUrl) {
      formData.append('audioUrl', uploadForm.audioUrl);
    }
    if (coverFile) formData.append('coverImage', coverFile);

    try {
      const res = await api.post('/mixes', formData);
      if (res.data.success) {
        toast.success('Mix uploaded successfully!');
        setMixes((prev) => [res.data.data, ...prev]);
        setIsUploadOpen(false);
        setUploadForm({ title: '', genre: '', description: '', isPublic: true, audioUrl: '' });
        setAudioFile(null);
        setCoverFile(null);
        setAudioSource('file');
      } else {
        toast.error(res.data.error || 'Upload failed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  const openEditModal = (mix: Mix) => {
    setEditingMix(mix);
    setEditForm({
      title: mix.title,
      genre: mix.genre,
      description: mix.description || '',
      isPublic: mix.isPublic,
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMix) return;
    if (!editForm.title || !editForm.genre) {
      toast.error('Title and genre are required');
      return;
    }

    setEditLoading(true);
    try {
      const res = await api.put(`/mixes/${editingMix.id}`, {
        title: editForm.title,
        genre: editForm.genre,
        category: editForm.genre,
        description: editForm.description,
        isPublic: editForm.isPublic,
      });
      if (res.data.success) {
        toast.success('Mix updated successfully!');
        setMixes((prev) =>
          prev.map((m) => (m.id === editingMix.id ? { ...m, ...res.data.data } : m))
        );
        setEditingMix(null);
      } else {
        toast.error(res.data.error || 'Update failed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Update failed');
    } finally {
      setEditLoading(false);
    }
  };

  const confirmDelete = (mixId: string) => {
    setDeletingMixId(mixId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingMixId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/mixes/${deletingMixId}`);
      toast.success('Mix deleted successfully');
      setMixes((prev) => prev.filter((m) => m.id !== deletingMixId));
      setDeleteDialogOpen(false);
      setDeletingMixId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleShare = async (mix: Mix) => {
    const shareUrl = `${window.location.origin}/mixes`;
    const shareData = {
      title: mix.title,
      text: `Check out "${mix.title}" by ${user?.djProfile?.stageName || 'DJ'} on Deck Salone!`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`);
        toast.success('Link copied to clipboard!');
      }
    } catch {
      // User cancelled share
    }
  };

  const handlePlay = (mix: Mix) => {
    const url = mix.audioUrl || mix.originalUrl;
    if (!url) {
      toast.error('This mix does not have an audio file. Upload an audio file to enable playback.');
      return;
    }
    const track = {
      id: mix.id,
      title: mix.title,
      dj: user?.djProfile?.stageName || 'Unknown DJ',
      duration: typeof mix.duration === 'string' ? parseInt(mix.duration, 10) || 0 : 0,
      cover: mix.coverImage || '/placeholder.jpg',
      genre: mix.genre || mix.category || 'Mix',
      audioUrl: url,
      audioSource: mix.audioSource,
      originalUrl: mix.originalUrl,
      plays: mix.plays,
    };
    const queue = mixes.filter(m => m.audioUrl || m.originalUrl).map(m => ({
      id: m.id,
      title: m.title,
      dj: user?.djProfile?.stageName || 'Unknown DJ',
      duration: typeof m.duration === 'string' ? parseInt(m.duration, 10) || 0 : 0,
      cover: m.coverImage || '/placeholder.jpg',
      genre: m.genre || m.category || 'Mix',
      audioUrl: m.audioUrl || m.originalUrl,
      audioSource: m.audioSource,
      originalUrl: m.originalUrl,
      plays: m.plays,
    }));
    window.dispatchEvent(new CustomEvent('play-mix', { detail: { track, queue } }));
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
        <Music className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <p className="text-text-secondary mb-2">Mix management is only available for DJs.</p>
        <p className="text-sm text-text-muted mb-6">
          Upgrade your account to a DJ profile to upload and manage mixes.
        </p>
        <Button className="bg-gold-gradient text-black" onClick={() => navigate('/dashboard/profile')}>
          Go to Profile
        </Button>
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
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {isFree && (
            <div className="flex flex-col items-end mr-4">
              <div className="flex justify-between w-full text-xs text-white/50 mb-1">
                <span>Free Tier Limit</span>
                <span>{mixes.length} / 5</span>
              </div>
              <Progress value={(mixes.length / 5) * 100} className="w-32 h-1.5" />
            </div>
          )}
          <Button
            variant="outline"
            className="border-gold/50 text-gold hover:bg-gold/10"
            onClick={() => {
              if (isFree) {
                openUpgradeModal('HearThis.at Import', 'pro');
              } else {
                setImportResult(null);
                setIsImportOpen(true);
              }
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Import from Hearthis
          </Button>
          <Button
            className="bg-gold-gradient text-black hover:opacity-90"
            onClick={handleUploadClick}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload New Mix
          </Button>
        </div>
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
                  Upload your mixes or import them directly from Hearthis.at.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    className="bg-gold-gradient text-black"
                    onClick={handleUploadClick}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Your First Mix
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gold/50 text-gold hover:bg-gold/10"
                    onClick={() => { setImportResult(null); setIsImportOpen(true); }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Import from Hearthis
                  </Button>
                </div>
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
                          src={mix.coverImage || '/mix-placeholder.jpg'}
                          alt={mix.title}
                          onError={imageFallback}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-12 h-12 text-text-muted" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="icon"
                          className="bg-gold/90 text-black hover:bg-gold rounded-full"
                          onClick={() => handlePlay(mix)}
                        >
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
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => openEditModal(mix)}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => navigate('/mixes')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View on Site
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleShare(mix)}
                            >
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-red"
                              onClick={() => confirmDelete(mix.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
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
            <CardContent className="p-6">
              {mixes.length === 0 ? (
                <div className="text-center py-12">
                  <Eye className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary mb-2">Upload mixes to see analytics here</p>
                  <p className="text-sm text-text-muted">
                    Your mix performance data will appear once you have uploaded mixes.
                  </p>
                  <Button
                    className="mt-4 bg-gold-gradient text-black"
                    onClick={handleUploadClick}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Your First Mix
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray">
                      <p className="text-xs text-text-muted mb-1">Total Plays</p>
                      <p className="text-2xl font-mono font-bold text-text-primary">
                        {mixes.reduce((sum, mix) => sum + (mix.plays || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray">
                      <p className="text-xs text-text-muted mb-1">Total Likes</p>
                      <p className="text-2xl font-mono font-bold text-gold">
                        {mixes.reduce((sum, mix) => sum + (mix.likes || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray">
                      <p className="text-xs text-text-muted mb-1">Total Mixes</p>
                      <p className="text-2xl font-mono font-bold text-green">
                        {mixes.length}
                      </p>
                    </div>
                  </div>

                  {/* Most Popular Mix */}
                  {(() => {
                    const mostPopular = [...mixes].sort((a, b) => (b.plays || 0) - (a.plays || 0))[0];
                    return mostPopular ? (
                      <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray">
                        <p className="text-xs text-text-muted mb-3">Most Popular Mix</p>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                            <Music className="w-6 h-6 text-gold" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{mostPopular.title}</p>
                            <p className="text-xs text-text-muted">{mostPopular.genre}</p>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-text-muted">
                            <span className="flex items-center gap-1">
                              <Play className="w-3 h-3 text-gold" />
                              {mostPopular.plays?.toLocaleString() || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3 text-red" />
                              {mostPopular.likes?.toLocaleString() || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Mix Performance Table */}
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary mb-3">Mix Performance</h3>
                    <div className="space-y-2">
                      {[...mixes]
                        .sort((a, b) => (b.plays || 0) - (a.plays || 0))
                        .map((mix, index) => (
                          <div
                            key={mix.id}
                            className="flex items-center gap-4 p-3 rounded-lg bg-black-elevated border border-dark-gray hover:border-gold/20 transition-colors"
                          >
                            <div className="w-6 h-6 rounded bg-gold/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-gold">{index + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">{mix.title}</p>
                              <p className="text-xs text-text-muted">{mix.genre}</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-text-muted">
                              <span className="flex items-center gap-1">
                                <Play className="w-3 h-3" />
                                {mix.plays?.toLocaleString() || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {mix.likes?.toLocaleString() || 0}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
                  <Label className="text-text-secondary mb-2 block">Audio Source</Label>
                  <div className="flex bg-black-elevated border border-dark-gray rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setAudioSource('file')}
                      className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                        audioSource === 'file' ? 'bg-gold text-black' : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioSource('url')}
                      className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                        audioSource === 'url' ? 'bg-gold text-black' : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      External URL
                    </button>
                  </div>
                </div>

                {audioSource === 'file' ? (
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
                ) : (
                  <div>
                    <Label className="text-text-secondary mb-2 block">Audio URL *</Label>
                    <Input
                      value={uploadForm.audioUrl}
                      onChange={(e) => setUploadForm({ ...uploadForm, audioUrl: e.target.value })}
                      placeholder="Audiomack, Hearthis.at, or direct .mp3 link"
                      className="bg-black-elevated border-dark-gray text-text-primary"
                      required={audioSource === 'url'}
                    />
                  </div>
                )}

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

      {/* Hearthis Import Modal */}
      <AnimatePresence>
        {isImportOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsImportOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-lg bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsImportOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#1E1E1E] transition-colors"
              >
                <X size={20} className="text-text-muted" />
              </button>

              <h2 className="font-display text-xl font-semibold text-text-primary uppercase tracking-tight">
                Import from Hearthis.at
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Paste your Hearthis.at track or set links below (one per line). Single tracks and entire sets/playlist links will be imported as mixes on your profile.
              </p>

              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setImportResult(null);
                  if (!importUrls.trim()) {
                    toast.error('Please paste at least one Hearthis URL');
                    return;
                  }
                  importHearthis(
                    {
                      urls: importUrls,
                      defaultGenre: importGenre,
                      defaultCategory: importGenre,
                    },
                    {
                      onSuccess: (res) => {
                        const result = res.data || {};
                        const { count = 0, errorCount = 0, errors = [] } = result;
                        setImportResult({ count, errorCount, errors });
                        if (count > 0) {
                          toast.success(`Imported ${count} mix(es)`);
                          setMixes((prev) => [
                            ...(result.imported || []),
                            ...prev,
                          ]);
                        }
                        if (errorCount > 0) {
                          toast.error(`${errorCount} URL(s) could not be imported`);
                        }
                        if (errorCount === 0 && count > 0) {
                          setTimeout(() => {
                            setIsImportOpen(false);
                            setImportUrls('');
                            setImportResult(null);
                          }, 1200);
                        }
                      },
                      onError: (err: any) => {
                        const message = err?.response?.data?.error || err?.message || 'Import failed';
                        toast.error(message);
                        setImportResult({ count: 0, errorCount: 1, errors: [{ url: 'Request', error: message }] });
                      },
                    }
                  );
                }}
              >
                <div>
                  <Label className="text-text-secondary mb-2 block">Hearthis URLs</Label>
                  <Textarea
                    value={importUrls}
                    onChange={(e) => { setImportUrls(e.target.value); setImportResult(null); }}
                    placeholder="https://hearthis.at/artist/track-name/&#10;https://hearthis.at/artist/set/set-name/"
                    rows={6}
                    className="bg-black-elevated border-dark-gray text-text-primary resize-none"
                    required
                    disabled={importLoading}
                  />
                </div>

                <div>
                  <Label className="text-text-secondary mb-2 block">Default Genre</Label>
                  <select
                    value={importGenre}
                    onChange={(e) => setImportGenre(e.target.value)}
                    disabled={importLoading}
                    className="w-full bg-black-elevated border border-dark-gray rounded-lg px-3 py-2 text-sm text-text-primary focus:border-gold focus:outline-none disabled:opacity-50"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {importResult && (
                  <div className={`rounded-lg border p-3 text-sm ${importResult.errorCount === 0 ? 'bg-green/10 border-green/30 text-green' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'}`}>
                    <p className="font-semibold">
                      Imported {importResult.count} mix{importResult.count === 1 ? '' : 'es'}
                      {importResult.errorCount > 0 ? ` • ${importResult.errorCount} failed` : ''}
                    </p>
                    {importResult.errors.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs max-h-32 overflow-y-auto">
                        {importResult.errors.slice(0, 10).map((err, i) => (
                          <li key={i} className="break-all">
                            <span className="text-text-secondary">{err.url}:</span> {err.error}
                          </li>
                        ))}
                        {importResult.errors.length > 10 && (
                          <li className="text-text-muted">...and {importResult.errors.length - 10} more</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={importLoading || !importUrls.trim()}
                  className="w-full bg-gold-gradient text-black font-semibold uppercase hover:opacity-90 disabled:opacity-50"
                >
                  {importLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  {importLoading ? 'Importing...' : 'Import Mixes'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingMix && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingMix(null)}
          >
            <motion.div
              className="relative w-full max-w-lg bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setEditingMix(null)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#1E1E1E] transition-colors"
              >
                <X size={20} className="text-text-muted" />
              </button>

              <h2 className="font-display text-xl font-semibold text-text-primary uppercase tracking-tight">
                Edit Mix
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Update your mix details
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleEdit}>
                <div>
                  <Label className="text-text-secondary mb-2 block">Title</Label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="Enter mix title"
                    className="bg-black-elevated border-dark-gray text-text-primary"
                    required
                  />
                </div>

                <div>
                  <Label className="text-text-secondary mb-2 block">Genre</Label>
                  <select
                    value={editForm.genre}
                    onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
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
                  <Label className="text-text-secondary mb-2 block">Description</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Tell listeners about this mix..."
                    rows={3}
                    className="bg-black-elevated border-dark-gray text-text-primary resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsPublic"
                    checked={editForm.isPublic}
                    onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })}
                    className="w-4 h-4 accent-gold rounded"
                  />
                  <Label htmlFor="editIsPublic" className="text-sm text-text-secondary cursor-pointer">
                    Make this mix public
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={editLoading}
                  className="w-full bg-gold-gradient text-black font-semibold uppercase hover:opacity-90"
                >
                  {editLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Pencil className="w-4 h-4 mr-2" />
                  )}
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-black-surface border-dark-gray text-text-primary">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-text-primary">
              <AlertTriangle className="w-5 h-5 text-red" />
              Delete Mix
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              Are you sure you want to delete this mix? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              className="border-dark-gray text-text-primary"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-red text-white hover:bg-red/90"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

