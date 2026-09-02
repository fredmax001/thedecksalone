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
  Repeat,
  UserPlus,
  Globe,
  Star,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List,
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
import { useMyHighlights, useAddHighlight, useRemoveHighlight } from '@/hooks/useHighlights';
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
  allowPublicDownloads?: boolean;
  repostToDownload?: boolean;
  followToDownload?: boolean;
  sortOrder?: number;
  createdAt: string;
  duration?: string;
}

import { GENRES } from '@/constants/genres';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { useRequireDj } from '@/hooks/useRequireDj';

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gold">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-text-primary font-medium">{label}</span>
          <button
            type="button"
            onClick={() => onChange(!checked)}
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
              checked ? 'bg-gold' : 'bg-dark-gray'
            )}
            aria-pressed={checked}
          >
            <span
              className={cn(
                'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                checked ? 'translate-x-5' : 'translate-x-1'
              )}
            />
          </button>
        </div>
        <p className="text-[11px] text-text-muted mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function Mixes() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { isFree, openUpgradeModal } = useFeatureAccess();
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [uploadForm, setUploadForm] = useState({
    title: '',
    genre: '',
    description: '',
    isPublic: true,
    allowPublicDownloads: false,
    repostToDownload: false,
    followToDownload: false,
    audioUrl: '',
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState('');
  const [audioSource, setAudioSource] = useState<'file' | 'url'>('file');
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const isDj = useRequireDj();
  const djId = user?.djProfile?.id;

  // Highlights
  const { data: myHighlights = [] } = useMyHighlights();
  const addHighlight = useAddHighlight();
  const removeHighlight = useRemoveHighlight();
  const highlightedMixIds = new Set(myHighlights.map((h) => h.mixId));

  // Edit state
  const [editingMix, setEditingMix] = useState<Mix | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    genre: '',
    description: '',
    isPublic: true,
    allowPublicDownloads: false,
    repostToDownload: false,
    followToDownload: false,
  });
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const editCoverInputRef = useRef<HTMLInputElement>(null);
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
        const res = await api.get('/mixes/my-mixes');
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
    setUploadProgress(0);
    setUploadStatusText('Preparing audio upload...');

    const formData = new FormData();
    formData.append('title', uploadForm.title);
    formData.append('genre', uploadForm.genre);
    formData.append('category', uploadForm.genre);
    formData.append('description', uploadForm.description);
    formData.append('isPublic', String(uploadForm.isPublic));
    formData.append('allowPublicDownloads', String(uploadForm.allowPublicDownloads));
    formData.append('repostToDownload', String(uploadForm.repostToDownload));
    formData.append('followToDownload', String(uploadForm.followToDownload));
    if (audioSource === 'file' && audioFile) {
      formData.append('audio', audioFile);
    } else if (audioSource === 'url' && uploadForm.audioUrl) {
      formData.append('audioUrl', uploadForm.audioUrl);
    }
    if (coverFile) {
      formData.append('coverImage', coverFile);
    } else if (coverUrl.trim()) {
      formData.append('coverImage', coverUrl.trim());
    }

    try {
      const res = await api.post('/mixes', formData, {
        timeout: 300000, // 5 minutes timeout for large audio files
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && progressEvent.total > 0) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            const loadedMb = (progressEvent.loaded / (1024 * 1024)).toFixed(1);
            const totalMb = (progressEvent.total / (1024 * 1024)).toFixed(1);
            setUploadProgress(percent);
            if (percent < 99) {
              setUploadStatusText(`Uploading audio file (${loadedMb} MB / ${totalMb} MB) — ${percent}%`);
            } else {
              setUploadStatusText('Processing audio & saving mix on server...');
            }
          } else {
            setUploadStatusText('Uploading audio file...');
          }
        },
      });

      if (res.data.success) {
        toast.success('🎉 Mix uploaded successfully!');
        setMixes((prev) => [res.data.data, ...prev]);
        setIsUploadOpen(false);
        setUploadForm({
          title: '',
          genre: '',
          description: '',
          isPublic: true,
          allowPublicDownloads: false,
          repostToDownload: false,
          followToDownload: false,
          audioUrl: '',
        });
        setAudioFile(null);
        setCoverFile(null);
        setCoverUrl('');
        setAudioSource('file');
      } else {
        toast.error(res.data.error || 'Upload failed');
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Upload failed. Check your internet connection.'));
    } finally {
      setUploadLoading(false);
      setUploadProgress(null);
      setUploadStatusText('');
    }
  };

  const openEditModal = (mix: Mix) => {
    navigate(`/dashboard/mixes/${mix.id}/edit`);
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
      const formData = new FormData();
      formData.append('title', editForm.title);
      formData.append('genre', editForm.genre);
      formData.append('category', editForm.genre);
      formData.append('description', editForm.description);
      formData.append('isPublic', String(editForm.isPublic));
      formData.append('allowPublicDownloads', String(editForm.allowPublicDownloads));
      formData.append('repostToDownload', String(editForm.repostToDownload));
      formData.append('followToDownload', String(editForm.followToDownload));

      if (editCoverFile) {
        formData.append('coverImage', editCoverFile);
      } else if (editCoverUrl.trim()) {
        formData.append('coverImage', editCoverUrl.trim());
      }

      const res = await api.put(`/mixes/${editingMix.id}`, formData);
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
      toast.error(getApiErrorMessage(err, 'Update failed'));
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
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    } finally {
      setDeleteLoading(false);
    }
  };

  // Track which mix share sheet is open
  const [shareMixId, setShareMixId] = useState<string | null>(null);

  const handleShare = async (mix: Mix) => {
    const shareUrl = `${window.location.origin}/mix/${mix.id}`;
    const djName = user?.djProfile?.stageName || 'DJ';
    const shareData = {
      title: mix.title,
      text: `Check out "${mix.title}" by ${djName} on Deck Salone!`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // User cancelled or share not supported — open inline share sheet
    }
    setShareMixId(mix.id);
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= mixes.length) return;

    const previousMixes = mixes;
    const newMixes = [...mixes];
    [newMixes[index], newMixes[newIndex]] = [newMixes[newIndex], newMixes[index]];

    // Assign descending sortOrder so the array order matches backend sortOrder desc
    const items = newMixes.map((mix, i) => ({
      id: mix.id,
      sortOrder: Math.max(0, newMixes.length - 1 - i),
    }));

    setMixes(newMixes.map((mix, i) => ({ ...mix, sortOrder: items[i].sortOrder })));

    try {
      await api.put('/mixes/reorder', { items });
      toast.success('Mix order updated');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to update order'));
      setMixes(previousMixes);
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
        <div className="flex items-center justify-between gap-4">
          <TabsList className="bg-black-elevated border border-dark-gray">
            <TabsTrigger value="my-mixes" className="data-[state=active]:bg-gold data-[state=active]:text-black">
              My Mixes ({mixes.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-gold data-[state=active]:text-black">
              Mix Analytics
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center bg-black-elevated border border-dark-gray rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'grid' ? 'bg-gold text-black' : 'text-text-secondary hover:text-text-primary'
              )}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-gold text-black' : 'text-text-secondary hover:text-text-primary'
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

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
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {mixes.map((mix, index) => (
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
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 bg-black/50 text-text-primary hover:bg-black/70 hover:text-gold"
                          disabled={index === 0}
                          onClick={() => handleReorder(index, 'up')}
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 bg-black/50 text-text-primary hover:bg-black/70 hover:text-gold"
                          disabled={index === mixes.length - 1}
                          onClick={() => handleReorder(index, 'down')}
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                      </div>
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
                              onClick={(e) => { e.preventDefault(); handleShare(mix); }}
                            >
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            {highlightedMixIds.has(mix.id) ? (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={async () => {
                                  try {
                                    await removeHighlight.mutateAsync(mix.id);
                                    toast.success('Removed from highlights');
                                  } catch (err: any) {
                                    toast.error(err.message || 'Failed to remove highlight');
                                  }
                                }}
                              >
                                <Star className="w-4 h-4 mr-2 text-gold fill-gold" />
                                Remove Highlight
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                disabled={highlightedMixIds.size >= 4}
                                onClick={async () => {
                                  if (highlightedMixIds.size >= 4) {
                                    toast.error('You can only highlight up to 4 mixes.');
                                    return;
                                  }
                                  try {
                                    await addHighlight.mutateAsync({ mixId: mix.id, sortOrder: myHighlights.length });
                                    toast.success('Mix highlighted on your profile');
                                  } catch (err: any) {
                                    toast.error(err.message || 'Failed to highlight mix');
                                  }
                                }}
                              >
                                <Star className="w-4 h-4 mr-2" />
                                Highlight on Profile
                              </DropdownMenuItem>
                            )}
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
                      <div className="absolute bottom-2 left-2 flex flex-col gap-1">
                        <Badge
                          className={cn(
                            'border-0 text-xs w-fit',
                            mix.isPublic ? 'bg-green/10 text-green' : 'bg-yellow-500/10 text-yellow-500'
                          )}
                        >
                          {mix.isPublic ? 'Public' : 'Draft'}
                        </Badge>
                        {mix.allowPublicDownloads && (
                          <Badge className="border-0 text-xs w-fit bg-blue-500/10 text-blue-400">
                            <Globe className="w-3 h-3 mr-1" /> Public DL
                          </Badge>
                        )}
                        {mix.repostToDownload && (
                          <Badge className="border-0 text-xs w-fit bg-purple-500/10 text-purple-400">
                            <Repeat className="w-3 h-3 mr-1" /> Repost DL
                          </Badge>
                        )}
                        {mix.followToDownload && (
                          <Badge className="border-0 text-xs w-fit bg-pink-500/10 text-pink-400">
                            <UserPlus className="w-3 h-3 mr-1" /> Follow DL
                          </Badge>
                        )}
                        {highlightedMixIds.has(mix.id) && (
                          <Badge className="border-0 text-xs w-fit bg-gold/10 text-gold">
                            <Star className="w-3 h-3 mr-1 fill-gold" /> Highlighted
                          </Badge>
                        )}
                      </div>
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
          ) : (
            <div className="space-y-2">
              {mixes.map((mix, index) => (
                <motion.div
                  key={mix.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="bg-black-surface border-dark-gray hover:border-gold/30 transition-colors">
                    <div className="flex items-center gap-3 p-3">
                      {/* Reorder */}
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-text-secondary hover:text-gold"
                          disabled={index === 0}
                          onClick={() => handleReorder(index, 'up')}
                          title="Move up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-text-secondary hover:text-gold"
                          disabled={index === mixes.length - 1}
                          onClick={() => handleReorder(index, 'down')}
                          title="Move down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Thumbnail */}
                      <button
                        type="button"
                        onClick={() => handlePlay(mix)}
                        className="relative w-14 h-14 rounded-lg bg-black-elevated flex-shrink-0 overflow-hidden group/play"
                      >
                        {mix.coverImage ? (
                          <img
                            src={mix.coverImage || '/mix-placeholder.jpg'}
                            alt={mix.title}
                            onError={imageFallback}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="w-6 h-6 text-text-muted" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/play:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        </div>
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-text-primary truncate">{mix.title}</h3>
                        <p className="text-xs text-text-secondary capitalize">{mix.genre}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <Badge
                            className={cn(
                              'border-0 text-[10px] px-1.5 py-0',
                              mix.isPublic ? 'bg-green/10 text-green' : 'bg-yellow-500/10 text-yellow-500'
                            )}
                          >
                            {mix.isPublic ? 'Public' : 'Draft'}
                          </Badge>
                          {mix.allowPublicDownloads && (
                            <Badge className="border-0 text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-400">
                              DL
                            </Badge>
                          )}
                          {mix.repostToDownload && (
                            <Badge className="border-0 text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-400">
                              Repost
                            </Badge>
                          )}
                          {mix.followToDownload && (
                            <Badge className="border-0 text-[10px] px-1.5 py-0 bg-pink-500/10 text-pink-400">
                              Follow
                            </Badge>
                          )}
                          {highlightedMixIds.has(mix.id) && (
                            <Badge className="border-0 text-[10px] px-1.5 py-0 bg-gold/10 text-gold">
                              <Star className="w-2.5 h-2.5 mr-0.5 fill-gold" /> Highlight
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-4 text-xs text-text-muted min-w-[120px]">
                        <span className="flex items-center gap-1" title="Plays">
                          <Play className="w-3 h-3" />
                          {mix.plays.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1" title="Likes">
                          <Heart className="w-3 h-3" />
                          {mix.likes.toLocaleString()}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-text-secondary hover:text-gold"
                          onClick={() => handlePlay(mix)}
                          title="Play"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-text-secondary hover:text-text-primary"
                          onClick={() => openEditModal(mix)}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-text-secondary hover:text-text-primary"
                          onClick={() => handleShare(mix)}
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-8 w-8',
                            highlightedMixIds.has(mix.id) ? 'text-gold' : 'text-text-secondary hover:text-gold'
                          )}
                          onClick={async () => {
                            if (highlightedMixIds.has(mix.id)) {
                              try {
                                await removeHighlight.mutateAsync(mix.id);
                                toast.success('Removed from highlights');
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to remove highlight');
                              }
                            } else {
                              if (highlightedMixIds.size >= 4) {
                                toast.error('You can only highlight up to 4 mixes.');
                                return;
                              }
                              try {
                                await addHighlight.mutateAsync({ mixId: mix.id, sortOrder: myHighlights.length });
                                toast.success('Mix highlighted on your profile');
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to highlight mix');
                              }
                            }
                          }}
                          title={highlightedMixIds.has(mix.id) ? 'Remove highlight' : 'Highlight on profile'}
                        >
                          <Star className={cn('w-4 h-4', highlightedMixIds.has(mix.id) && 'fill-gold')} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-text-secondary hover:text-red"
                          onClick={() => confirmDelete(mix.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
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
                      placeholder="Hearthis.at or direct .mp3 link"
                      className="bg-black-elevated border-dark-gray text-text-primary"
                      required={audioSource === 'url'}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-text-secondary block">Cover Image (Upload file or paste URL)</Label>
                  <div className="flex gap-2">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setCoverFile(file);
                        if (file) setCoverUrl('');
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-dark-gray hover:border-gold/50 transition-colors bg-black-elevated text-xs font-semibold text-text-secondary"
                    >
                      <ImageIcon className="w-4 h-4 text-gold shrink-0" />
                      <span className="truncate">
                        {coverFile ? coverFile.name : 'Select Image File'}
                      </span>
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      value={coverUrl}
                      onChange={(e) => {
                        setCoverUrl(e.target.value);
                        if (e.target.value) setCoverFile(null);
                      }}
                      placeholder="Or paste image URL (e.g. https://...)"
                      className="bg-black-elevated border-dark-gray text-text-primary text-xs"
                    />
                  </div>
                  {(coverFile || coverUrl) && (
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-black-elevated border border-gold/20 mt-2">
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-dark-gray">
                        <img
                          src={coverFile ? URL.createObjectURL(coverFile) : coverUrl}
                          alt="Cover Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                      <p className="text-xs text-gold font-semibold truncate">Cover preview selected</p>
                    </div>
                  )}
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

                <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray space-y-3">
                  <Label className="text-text-secondary block text-xs uppercase tracking-wider">Downloads</Label>

                  <ToggleRow
                    icon={<Globe className="w-4 h-4" />}
                    label="Allow public downloads"
                    description="Anyone logged in can download this mix."
                    checked={uploadForm.allowPublicDownloads}
                    onChange={(checked) =>
                      setUploadForm({
                        ...uploadForm,
                        allowPublicDownloads: checked,
                        repostToDownload: checked ? false : uploadForm.repostToDownload,
                        followToDownload: checked ? false : uploadForm.followToDownload,
                      })
                    }
                  />
                  <ToggleRow
                    icon={<Repeat className="w-4 h-4" />}
                    label="Repost to Download"
                    description="Download is only active for users who reposted your upload."
                    checked={uploadForm.repostToDownload}
                    onChange={(checked) =>
                      setUploadForm({
                        ...uploadForm,
                        repostToDownload: checked,
                        allowPublicDownloads: checked ? false : uploadForm.allowPublicDownloads,
                        followToDownload: checked ? false : uploadForm.followToDownload,
                      })
                    }
                  />
                  <ToggleRow
                    icon={<UserPlus className="w-4 h-4" />}
                    label="Follow to Download"
                    description="Download is only active for users who are following you."
                    checked={uploadForm.followToDownload}
                    onChange={(checked) =>
                      setUploadForm({
                        ...uploadForm,
                        followToDownload: checked,
                        allowPublicDownloads: checked ? false : uploadForm.allowPublicDownloads,
                        repostToDownload: checked ? false : uploadForm.repostToDownload,
                      })
                    }
                  />
                </div>

                {uploadLoading && (
                  <div className="p-4 rounded-xl bg-black border border-gold/30 space-y-2">
                    <div className="flex items-center justify-between text-xs text-text-primary">
                      <span className="font-medium text-gold">{uploadStatusText || 'Uploading mix...'}</span>
                      <span className="font-bold text-gold">{uploadProgress !== null ? `${uploadProgress}%` : ''}</span>
                    </div>
                    <Progress value={uploadProgress ?? 0} className="h-2 bg-dark-gray text-gold" />
                    <p className="text-[10px] text-text-muted text-center">Please do not close this window while upload completes.</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={uploadLoading}
                  className="w-full bg-gold-gradient text-black font-semibold uppercase hover:opacity-90 disabled:opacity-50"
                >
                  {uploadLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploadLoading ? (uploadProgress !== null ? `Uploading (${uploadProgress}%)` : 'Uploading...') : 'Upload Mix'}
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

                <div className="space-y-2">
                  <Label className="text-text-secondary block">Cover Image (Upload file or paste URL)</Label>
                  <div className="flex gap-2">
                    <input
                      ref={editCoverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setEditCoverFile(file);
                        if (file) setEditCoverUrl('');
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => editCoverInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-dark-gray hover:border-gold/50 transition-colors bg-black-elevated text-xs font-semibold text-text-secondary"
                    >
                      <ImageIcon className="w-4 h-4 text-gold shrink-0" />
                      <span className="truncate">
                        {editCoverFile ? editCoverFile.name : 'Upload New Cover File'}
                      </span>
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      value={editCoverUrl}
                      onChange={(e) => {
                        setEditCoverUrl(e.target.value);
                        if (e.target.value) setEditCoverFile(null);
                      }}
                      placeholder="Or paste cover image URL (e.g. https://...)"
                      className="bg-black-elevated border-dark-gray text-text-primary text-xs"
                    />
                  </div>
                  {(editCoverFile || editCoverUrl) && (
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-black-elevated border border-gold/20 mt-2">
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-dark-gray">
                        <img
                          src={editCoverFile ? URL.createObjectURL(editCoverFile) : editCoverUrl}
                          alt="Cover Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                      <p className="text-xs text-gold font-semibold truncate">Cover preview selected</p>
                    </div>
                  )}
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

                <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray space-y-3">
                  <Label className="text-text-secondary block text-xs uppercase tracking-wider">Downloads</Label>

                  <ToggleRow
                    icon={<Globe className="w-4 h-4" />}
                    label="Allow public downloads"
                    description="Anyone logged in can download this mix."
                    checked={editForm.allowPublicDownloads}
                    onChange={(checked) =>
                      setEditForm({
                        ...editForm,
                        allowPublicDownloads: checked,
                        repostToDownload: checked ? false : editForm.repostToDownload,
                        followToDownload: checked ? false : editForm.followToDownload,
                      })
                    }
                  />
                  <ToggleRow
                    icon={<Repeat className="w-4 h-4" />}
                    label="Repost to Download"
                    description="Download is only active for users who reposted your upload."
                    checked={editForm.repostToDownload}
                    onChange={(checked) =>
                      setEditForm({
                        ...editForm,
                        repostToDownload: checked,
                        allowPublicDownloads: checked ? false : editForm.allowPublicDownloads,
                        followToDownload: checked ? false : editForm.followToDownload,
                      })
                    }
                  />
                  <ToggleRow
                    icon={<UserPlus className="w-4 h-4" />}
                    label="Follow to Download"
                    description="Download is only active for users who are following you."
                    checked={editForm.followToDownload}
                    onChange={(checked) =>
                      setEditForm({
                        ...editForm,
                        followToDownload: checked,
                        allowPublicDownloads: checked ? false : editForm.allowPublicDownloads,
                        repostToDownload: checked ? false : editForm.repostToDownload,
                      })
                    }
                  />
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
      {/* Mix Share Sheet (desktop fallback) */}
      <AnimatePresence>
        {shareMixId && (() => {
          const mix = mixes.find(m => m.id === shareMixId);
          if (!mix) return null;
          const shareUrl = `${window.location.origin}/mix/${mix.id}`;
          const djName = user?.djProfile?.stageName || 'DJ';
          return (
            <motion.div
              key="mix-share-sheet"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setShareMixId(null)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm bg-[#111111] border border-[rgba(255,255,255,0.1)] rounded-2xl overflow-hidden shadow-card"
              >
                {/* Mix preview card */}
                <div className="flex items-center gap-3 p-4 border-b border-[rgba(255,255,255,0.05)]">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-[#1a1a1a] flex items-center justify-center">
                    {mix.coverImage ? (
                      <img src={mix.coverImage} alt={mix.title} className="w-full h-full object-cover" onError={imageFallback} />
                    ) : (
                      <Music className="w-6 h-6 text-gold/40" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-semibold uppercase tracking-tight text-text-primary truncate">{mix.title}</p>
                    <p className="text-[11px] text-gold mt-0.5 truncate">{djName}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{mix.genre}</p>
                  </div>
                  <button onClick={() => setShareMixId(null)} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Share via</p>
                </div>
                {/* Share options */}
                {[
                  { label: 'Copy Link', icon: <ExternalLink className="w-4 h-4" />, action: async () => { try { await navigator.clipboard.writeText(shareUrl); toast.success('Link copied!'); setShareMixId(null); } catch { toast.error('Failed to copy'); } } },
                  { label: 'WhatsApp', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.134 1.585 5.938L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>, action: () => { window.open(`https://wa.me/?text=${encodeURIComponent(`${mix.title} by ${djName}`)}%20${encodeURIComponent(shareUrl)}`, '_blank'); setShareMixId(null); } },
                  { label: 'Facebook', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, action: () => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank'); setShareMixId(null); } },
                  { label: 'X (Twitter)', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, action: () => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${mix.title} by ${djName}`)}&url=${encodeURIComponent(shareUrl)}`, '_blank'); setShareMixId(null); } },
                  { label: 'Instagram Story', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><defs><linearGradient id="ig-m" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="25%" stopColor="#e6683c"/><stop offset="50%" stopColor="#dc2743"/><stop offset="75%" stopColor="#cc2366"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs><path fill="url(#ig-m)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>, action: async () => { try { await navigator.clipboard.writeText(shareUrl); } catch {} const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent); if (isMobile) { window.location.href = 'instagram://story-camera'; setTimeout(() => { toast.info('Link copied! Open Instagram → Stories → paste as link sticker 📎', { duration: 5000 }); }, 1500); } else { toast.info('Link copied! Open Instagram on your phone → Stories → paste as a link sticker 📎', { duration: 5000 }); } setShareMixId(null); } },
                ].map(opt => (
                  <button key={opt.label} onClick={opt.action}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                    {opt.icon}<span>{opt.label}</span>
                  </button>
                ))}
                <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.05)]">
                  <p className="text-[10px] text-text-muted truncate">{shareUrl}</p>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

