import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Trash2,
  Image as ImageIcon,
  Music,
  MapPin,
  Sparkles,
  Lock,
  Download,
  MessageSquare,
  Scissors,
  ListOrdered,
  RefreshCw,
  Zap,
  Check,
  X,
  Plus,
  Loader2,
  Copy,
  Sliders,
  Bold,
  Italic,
  List,
  Link2,
  Code,
  AlertTriangle,
} from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { GENRES } from '@/constants/genres';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { getMixShareUrl } from '@/lib/slug';

const SUGGESTED_TAGS = [
  'Krio Fusion',
  'Afrobeats',
  'Amapiano',
  'Salone Groove',
  'Gospel',
  'Afro Fusion',
  'Dancehall',
  'Club Mix',
  'Hip Hop',
  '2026 Salone',
];

export default function EditMix() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'detail' | 'sets' | 'premium'>('basic');

  // Form Fields
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Afrobeats');
  const [category, setCategory] = useState('Mixtape');
  const [subGenres, setSubGenres] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Privacy & Access Toggles
  const [isPrivate, setIsPrivate] = useState(false);
  const [notListed, setNotListed] = useState(false);
  const [doNotShowStats, setDoNotShowStats] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [isExclusive, setIsExclusive] = useState(false);
  const [fansSeeTracklist, setFansSeeTracklist] = useState(false);

  // Download Toggles
  const [allowPublicDownloads, setAllowPublicDownloads] = useState(false);
  const [repostToDownload, setRepostToDownload] = useState(false);
  const [followToDownload, setFollowToDownload] = useState(false);

  // Meta Information
  const [recordingLocation, setRecordingLocation] = useState('Freetown, Sierra Leone');
  const [version, setVersion] = useState('');
  const [bpm, setBpm] = useState('');
  const [musicalKey, setMusicalKey] = useState('');
  const [showAutoBpmKey, setShowAutoBpmKey] = useState(true);
  const [isAiProduced, setIsAiProduced] = useState(false);
  const [releaseDate, setReleaseDate] = useState('');
  const [license, setLicense] = useState('All Rights Reserved');

  const [mixSlug, setMixSlug] = useState<string>('');
  const [djInfo, setDjInfo] = useState<any>(null);

  // File Uploads
  const [coverImage, setCoverImage] = useState<string>('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch Mix details on mount
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/mixes/${id}`)
      .then((res) => {
        if (res.data.success && res.data.data) {
          const mix = res.data.data;
          setTitle(mix.title || '');
          setMixSlug(mix.slug || '');
          setDjInfo(mix.dj || null);
          setGenre(mix.genre || 'Afrobeats');
          setCategory(mix.category || 'Mixtape');
          setSubGenres(Array.isArray(mix.secondaryGenres) ? mix.secondaryGenres.join(', ') : '');
          setDescription(mix.description || '');
          setTags(mix.tags || []);
          setIsPrivate(!mix.isPublic);
          setNotListed(Boolean(mix.notListed));
          setDoNotShowStats(Boolean(mix.hideStats));
          setAllowComments(mix.allowComments !== false);
          setIsExclusive(Boolean(mix.isExclusive));
          setFansSeeTracklist(Boolean(mix.fansSeeTracklist));
          setAllowPublicDownloads(Boolean(mix.allowPublicDownloads));
          setRepostToDownload(Boolean(mix.repostToDownload));
          setFollowToDownload(Boolean(mix.followToDownload));
          setCoverImage(getMediaUrl(mix.coverImage) || '');
          setAudioUrl(mix.audioUrl || '');
          setDuration(mix.duration || 0);
          setRecordingLocation(mix.recordingLocation || 'Freetown, Sierra Leone');
          setVersion(mix.version || '');
          setBpm(mix.bpm || '');
          setMusicalKey(mix.musicalKey || '');
          setShowAutoBpmKey(mix.showAutoBpmKey !== false);
          setIsAiProduced(Boolean(mix.isAiProduced));
          setLicense(mix.license || 'All Rights Reserved');
          if (mix.releaseDate) {
            setReleaseDate(new Date(mix.releaseDate).toISOString().slice(0, 16));
          } else if (mix.createdAt) {
            setReleaseDate(new Date(mix.createdAt).toISOString().slice(0, 16));
          }
        }
      })
      .catch((err) => {
        toast.error('Failed to load mix', {
          description: getApiErrorMessage(err, 'Mix not found or you do not have permission.'),
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Handle Cover File Selection
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const objectUrl = URL.createObjectURL(file);
      setCoverPreview(objectUrl);
      toast.success('Cover image selected. Click Save to apply.');
    }
  };

  // Handle Audio File Replacement
  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioFileName(file.name);
      toast.success(`Audio replacement ready: ${file.name}`);
    }
  };

  // Add Tag
  const handleAddTag = (tagToAdd?: string) => {
    const val = (tagToAdd || newTagInput).trim().replace(/^#/, '');
    if (!val) return;
    if (tags.includes(val)) {
      setNewTagInput('');
      return;
    }
    setTags((prev) => [...prev, val]);
    setNewTagInput('');
  };

  // Remove Tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Text formatting insert helper
  const insertFormatting = (prefix: string, suffix = '') => {
    const textarea = descTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = description.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const newText = description.substring(0, start) + replacement + description.substring(end);
    setDescription(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 50);
  };

  // Insert Tracklist Template
  const handleInsertTracklistTemplate = () => {
    const template = `\n\nTRACKLIST:\n1. Intro\n2. \n3. \n4. Outro`;
    setDescription((prev) => (prev ? prev + template : template.trim()));
    toast.info('Tracklist template inserted into Description');
  };

  // Save changes
  const handleSave = async () => {
    if (!id) return;
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('genre', genre);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('tags', JSON.stringify(tags));
      formData.append(
        'secondaryGenres',
        JSON.stringify(
          subGenres
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        )
      );
      formData.append('isPublic', String(!isPrivate));
      formData.append('isExclusive', String(isExclusive));
      formData.append('allowPublicDownloads', String(allowPublicDownloads));
      formData.append('repostToDownload', String(repostToDownload));
      formData.append('followToDownload', String(followToDownload));
      formData.append('notListed', String(notListed));
      formData.append('hideStats', String(doNotShowStats));
      formData.append('allowComments', String(allowComments));
      formData.append('fansSeeTracklist', String(fansSeeTracklist));
      formData.append('recordingLocation', recordingLocation);
      formData.append('version', version);
      formData.append('bpm', bpm);
      formData.append('musicalKey', musicalKey);
      formData.append('showAutoBpmKey', String(showAutoBpmKey));
      formData.append('isAiProduced', String(isAiProduced));
      formData.append('releaseDate', releaseDate || '');
      formData.append('license', license);

      if (coverFile) {
        formData.append('coverImage', coverFile);
      }
      if (audioFile) {
        formData.append('audio', audioFile);
      }

      const res = await api.put(`/mixes/${id}`, formData);

      if (res.data.success) {
        toast.success('Mix updated successfully!');
        if (res.data.data?.coverImage) {
          setCoverImage(getMediaUrl(res.data.data.coverImage) || '');
          setCoverPreview('');
          setCoverFile(null);
        }
      }
    } catch (err: any) {
      toast.error('Failed to save changes', {
        description: getApiErrorMessage(err, 'Please check your inputs and try again.'),
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete Mix
  const handleDeleteMix = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      const res = await api.delete(`/mixes/${id}`);
      if (res.data.success) {
        toast.success('Mix deleted successfully');
        navigate('/dashboard/mixes', { replace: true });
      }
    } catch (err: any) {
      toast.error('Failed to delete mix', {
        description: getApiErrorMessage(err, 'Delete failed'),
      });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-[#f4e059] animate-spin mb-3" />
        <p className="text-sm font-mono text-text-muted">Loading mix details...</p>
      </div>
    );
  }

  const mixUrl = getMixShareUrl({ id, slug: mixSlug, title, dj: djInfo } as any);
  const currentCover = coverPreview || coverImage || '/mix-placeholder.jpg';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col pb-24 md:pb-20">
      {/* ─── TOP HEADER BAR ─── */}
      <header className="sticky top-0 z-40 bg-[#0e0e0e]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 pt-[calc(env(safe-area-inset-top,0px)+10px)]">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors shrink-0"
            title="Go Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="w-8 h-8 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10 shadow">
            <img src={currentCover} alt="cover" className="w-full h-full object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xs sm:text-sm font-bold uppercase tracking-tight text-white truncate">
              {title || 'Edit Mix'}
            </h1>
            <p className="text-[10px] text-text-muted font-mono truncate hidden sm:block">
              {genre} • {category}
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#e63946] hover:bg-[#d62828] text-white font-bold text-xs uppercase px-4 h-8 rounded-lg shadow-md flex items-center gap-1.5 shrink-0"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Save</span>
        </Button>
      </header>

      {/* ─── TABS HEADER ─── */}
      <div className="bg-[#121110] border-b border-white/[0.08] px-3 sm:px-6 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 sm:gap-4 py-2 min-w-max text-xs font-semibold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('basic')}
            className={cn(
              'px-3 py-1.5 rounded-lg transition-colors',
              activeTab === 'basic' ? 'bg-[#f4e059] text-black font-bold shadow-sm' : 'text-text-secondary hover:text-white'
            )}
          >
            Basic
          </button>
          <button
            onClick={() => setActiveTab('detail')}
            className={cn(
              'px-3 py-1.5 rounded-lg transition-colors',
              activeTab === 'detail' ? 'bg-[#f4e059] text-black font-bold shadow-sm' : 'text-text-secondary hover:text-white'
            )}
          >
            Detail
          </button>
          <button
            onClick={() => setActiveTab('sets')}
            className={cn(
              'px-3 py-1.5 rounded-lg transition-colors',
              activeTab === 'sets' ? 'bg-[#f4e059] text-black font-bold shadow-sm' : 'text-text-secondary hover:text-white'
            )}
          >
            Inside Sets
          </button>
          <button
            onClick={() => setActiveTab('premium')}
            className={cn(
              'px-3 py-1.5 rounded-lg transition-colors',
              activeTab === 'premium' ? 'bg-[#f4e059] text-black font-bold shadow-sm' : 'text-text-secondary hover:text-white'
            )}
          >
            Premium Options
          </button>
        </div>
      </div>

      {/* ─── MAIN CONTENT BODY ─── */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 space-y-4">
        {activeTab === 'basic' && (
          <div className="space-y-4">
            {/* 1. COVER ART & TITLE HEADER CARD */}
            <div className="bg-[#141312] border border-white/[0.08] rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-start">
              {/* Cover Art Box with Change Overlay */}
              <div className="relative group w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden bg-black border-2 border-white/10 shadow-xl shrink-0">
                <img
                  src={currentCover}
                  alt={title || 'Mix Cover'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-[10px] sm:text-[11px] uppercase tracking-wider cursor-pointer"
                >
                  <ImageIcon className="w-5 h-5 text-[#f4e059]" />
                  <span>Change Cover</span>
                </button>
              </div>

              {/* Title & Link Info */}
              <div className="flex-1 w-full space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    Title
                  </label>
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="text-xs text-[#f4e059] hover:underline font-semibold flex items-center gap-1 sm:hidden"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Change Cover Art
                  </button>
                </div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter mix title..."
                  className="bg-black/60 border-white/10 text-white font-bold text-sm sm:text-base focus:border-[#f4e059] h-11 rounded-xl"
                />

                {/* Link & Filename */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px] text-text-muted font-mono">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-text-secondary">Link:</span>
                    <span className="truncate text-[#f4e059]">{mixUrl}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(mixUrl);
                        toast.success('Link copied to clipboard!');
                      }}
                      className="p-1 hover:text-white transition-colors shrink-0"
                      title="Copy Link"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-text-secondary">Filename: </span>
                    <span>{title ? `${title.replace(/\s+/g, '_')}.mp3` : 'SALONE_MIX.mp3'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. TAGS SECTION */}
            <div className="bg-[#141312] border border-white/[0.08] rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-lg">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                Tags
              </label>
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-black/60 border border-white/10 rounded-xl min-h-[44px]">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#222] border border-white/15 text-white text-xs font-medium"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-text-muted hover:text-red transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                  <Input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add a tag..."
                    className="bg-transparent border-0 text-xs text-white focus-visible:ring-0 focus-visible:ring-offset-0 h-7 p-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag()}
                    className="p-1 rounded bg-[#f4e059] text-black hover:brightness-110 shrink-0"
                    title="Add Tag"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Used before quick suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                <span className="text-text-muted">Used before:</span>
                {SUGGESTED_TAGS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAddTag(s)}
                    className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-[#f4e059]/20 border border-white/10 hover:border-[#f4e059]/40 text-text-secondary hover:text-[#f4e059] text-[10px] font-medium transition-colors"
                  >
                    #{s}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. EXCLUSIVE FAN FEATURES CARD (Matching Hearthis Gradient style) */}
            <div className="rounded-2xl p-4 bg-gradient-to-r from-[#4a1c1d] via-[#381617] to-[#250f10] border border-[#ff6b6b]/20 shadow-xl space-y-3">
              <p className="text-xs font-semibold text-rose-200">
                You can set exclusive Fan features for this upload:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/30 border border-rose-500/20">
                  <div>
                    <p className="text-xs font-bold text-white">Let only Fans play this content</p>
                    <p className="text-[10px] text-rose-200/70">Subscribers & VIP members only</p>
                  </div>
                  <Switch checked={isExclusive} onCheckedChange={setIsExclusive} />
                </div>

                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/30 border border-rose-500/20">
                  <div>
                    <p className="text-xs font-bold text-white">Fans see the tracklist</p>
                    <p className="text-[10px] text-rose-200/70">Exclusive track list preview</p>
                  </div>
                  <Switch checked={fansSeeTracklist} onCheckedChange={setFansSeeTracklist} />
                </div>
              </div>
            </div>

            {/* 4. TWO-COLUMN GROUP: PRIVACY / DOWNLOADS & DESCRIPTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* LEFT: PRIVACY & DOWNLOADS */}
              <div className="space-y-4">
                {/* Privacy Card */}
                <div className="bg-[#141312] border border-white/[0.08] rounded-2xl p-4 space-y-3 shadow-lg">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <Lock className="w-3.5 h-3.5 text-[#f4e059]" />
                    Privacy
                  </h3>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-white">Private - not visible for others</p>
                        <p className="text-[10px] text-text-muted">Only you can view and play this mix</p>
                      </div>
                      <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                    </div>

                    <div className="flex items-start justify-between gap-3 pt-2 border-t border-white/5">
                      <div>
                        <p className="text-xs font-bold text-white">Not listed</p>
                        <p className="text-[10px] text-text-muted leading-relaxed">
                          Hidden inside genres, sitemaps, official lists and search engines. Only visible inside your followers feed and profile.
                        </p>
                      </div>
                      <Switch checked={notListed} onCheckedChange={setNotListed} />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                      <div>
                        <p className="text-xs font-bold text-white">Do not show statistics</p>
                        <p className="text-[10px] text-text-muted">Hide public play/download counters</p>
                      </div>
                      <Switch checked={doNotShowStats} onCheckedChange={setDoNotShowStats} />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                      <div>
                        <p className="text-xs font-bold text-white">Allow / show comments</p>
                        <p className="text-[10px] text-text-muted">Let listeners leave timestamped comments</p>
                      </div>
                      <Switch checked={allowComments} onCheckedChange={setAllowComments} />
                    </div>
                  </div>
                </div>

                {/* Downloads Card */}
                <div className="bg-[#141312] border border-white/[0.08] rounded-2xl p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-[#f4e059]" />
                      Downloads
                    </h3>
                    <a
                      href={audioUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      Download now
                    </a>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-white">Allow public downloads</p>
                        <p className="text-[10px] text-text-muted">Direct free MP3 download for all listeners</p>
                      </div>
                      <Switch
                        checked={allowPublicDownloads}
                        onCheckedChange={(c) => {
                          setAllowPublicDownloads(c);
                          if (c) {
                            setRepostToDownload(false);
                            setFollowToDownload(false);
                          }
                        }}
                      />
                    </div>

                    <div className="flex items-start justify-between gap-3 pt-2 border-t border-white/5">
                      <div>
                        <p className="text-xs font-bold text-white">Repost to Download</p>
                        <p className="text-[10px] text-text-muted leading-relaxed">
                          Download is only active for users who reposted your upload.
                        </p>
                      </div>
                      <Switch
                        checked={repostToDownload}
                        onCheckedChange={(c) => {
                          setRepostToDownload(c);
                          if (c) {
                            setAllowPublicDownloads(false);
                            setFollowToDownload(false);
                          }
                        }}
                      />
                    </div>

                    <div className="flex items-start justify-between gap-3 pt-2 border-t border-white/5">
                      <div>
                        <p className="text-xs font-bold text-white">Follow to Download</p>
                        <p className="text-[10px] text-text-muted leading-relaxed">
                          Download is only active for users who are following you.
                        </p>
                      </div>
                      <Switch
                        checked={followToDownload}
                        onCheckedChange={(c) => {
                          setFollowToDownload(c);
                          if (c) {
                            setAllowPublicDownloads(false);
                            setRepostToDownload(false);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: DESCRIPTION & TRACKLIST */}
              <div className="bg-[#141312] border border-white/[0.08] rounded-2xl p-4 space-y-2.5 shadow-lg flex flex-col">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <MessageSquare className="w-3.5 h-3.5 text-[#f4e059]" />
                  Description & Tracklist
                </h3>

                {/* Formatting Toolbar */}
                <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-lg text-text-muted">
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**')}
                    className="p-1.5 hover:bg-white/10 hover:text-white rounded"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('*', '*')}
                    className="p-1.5 hover:bg-white/10 hover:text-white rounded"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n- ')}
                    className="p-1.5 hover:bg-white/10 hover:text-white rounded"
                    title="Bullet List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n1. ')}
                    className="p-1.5 hover:bg-white/10 hover:text-white rounded"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('[', '](https://)')}
                    className="p-1.5 hover:bg-white/10 hover:text-white rounded"
                    title="Link"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('`', '`')}
                    className="p-1.5 hover:bg-white/10 hover:text-white rounded"
                    title="Code"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertTracklistTemplate}
                    className="ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#f4e059]/15 text-[#f4e059] hover:bg-[#f4e059]/25 transition-colors"
                    title="Insert Tracklist Template"
                  >
                    + Tracklist
                  </button>
                </div>

                <Textarea
                  ref={descTextareaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell your listeners about this mix, artists featured, tracklist, shoutouts, or event info..."
                  className="bg-black/60 border-white/10 text-xs text-white leading-relaxed focus:border-[#f4e059] flex-1 min-h-[260px] rounded-xl font-mono"
                />
                <p className="text-[10px] text-text-muted font-mono">
                  Tag other users by using "@". Supports markdown and links.
                </p>
              </div>
            </div>

            {/* 5. META SECTION */}
            <div className="bg-[#141312] border border-white/[0.08] rounded-2xl p-4 space-y-4 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary border-b border-white/5 pb-2 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#f4e059]" />
                Meta Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* Genre */}
                <div>
                  <label className="text-[11px] font-bold uppercase text-text-muted block mb-1">
                    Genre
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-semibold outline-none focus:border-[#f4e059]"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g} className="bg-[#181818] text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-genres */}
                <div>
                  <label className="text-[11px] font-bold uppercase text-text-muted block mb-1">
                    Sub-Genres
                  </label>
                  <Input
                    value={subGenres}
                    onChange={(e) => setSubGenres(e.target.value)}
                    placeholder="e.g. Afropop, Street Pop"
                    className="bg-black/60 border-white/10 text-white text-xs h-10 rounded-xl"
                  />
                </div>

                {/* Select Type */}
                <div>
                  <label className="text-[11px] font-bold uppercase text-text-muted block mb-1">
                    Select Type
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-semibold outline-none focus:border-[#f4e059]"
                  >
                    <option value="Mixtape" className="bg-[#181818]">Mixtape / DJ Mix</option>
                    <option value="Live Set" className="bg-[#181818]">Live Event Set</option>
                    <option value="Remix" className="bg-[#181818]">Remix / Mashup</option>
                    <option value="Podcast" className="bg-[#181818]">Radio Show / Podcast</option>
                    <option value="Original" className="bg-[#181818]">Original Beat / Track</option>
                  </select>
                </div>

                {/* Recording Location */}
                <div>
                  <label className="text-[11px] font-bold uppercase text-text-muted block mb-1">
                    Recording Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                    <Input
                      value={recordingLocation}
                      onChange={(e) => setRecordingLocation(e.target.value)}
                      placeholder="e.g. Freetown, Sierra Leone"
                      className="pl-9 bg-black/60 border-white/10 text-white text-xs h-10 rounded-xl"
                    />
                  </div>
                </div>

                {/* Version */}
                <div>
                  <label className="text-[11px] font-bold uppercase text-text-muted block mb-1">
                    Version
                  </label>
                  <Input
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g. Club Edit, Extended"
                    className="bg-black/60 border-white/10 text-white text-xs h-10 rounded-xl"
                  />
                </div>

                {/* BPM & Key */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-text-muted block mb-1">
                      BPM
                    </label>
                    <Input
                      value={bpm}
                      onChange={(e) => setBpm(e.target.value)}
                      placeholder="120"
                      className="bg-black/60 border-white/10 text-white text-xs h-10 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-text-muted block mb-1">
                      Key
                    </label>
                    <Input
                      value={musicalKey}
                      onChange={(e) => setMusicalKey(e.target.value)}
                      placeholder="Abm"
                      className="bg-black/60 border-white/10 text-white text-xs h-10 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Meta Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/30 border border-white/5">
                  <div>
                    <p className="text-xs font-semibold text-white">Show auto-generated BPM and Key</p>
                    <p className="text-[10px] text-text-muted">Display detected BPM & harmonic key on waveform</p>
                  </div>
                  <Switch checked={showAutoBpmKey} onCheckedChange={setShowAutoBpmKey} />
                </div>

                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/30 border border-white/5">
                  <div>
                    <p className="text-xs font-semibold text-white">Was this sound produced using AI?</p>
                    <p className="text-[10px] text-text-muted">Declare AI assistance in stem production</p>
                  </div>
                  <Switch checked={isAiProduced} onCheckedChange={setIsAiProduced} />
                </div>
              </div>

              {/* Release Date & License */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div>
                  <label className="text-[11px] font-bold uppercase text-text-muted block mb-1">
                    Release Date
                  </label>
                  <Input
                    type="datetime-local"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="bg-black/60 border-white/10 text-white text-xs h-10 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-text-muted block mb-1">
                    License
                  </label>
                  <select
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-semibold outline-none focus:border-[#f4e059]"
                  >
                    <option value="All Rights Reserved" className="bg-[#181818]">All Rights Reserved</option>
                    <option value="Creative Commons (CC-BY)" className="bg-[#181818]">Creative Commons (CC-BY)</option>
                    <option value="Public Domain" className="bg-[#181818]">Public Domain</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'detail' && (
          <div className="bg-[#141312] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
            <h3 className="text-sm font-bold uppercase tracking-wide text-white">Advanced Track Details</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Audio stream bitrate: <strong>320 kbit/s HD Audio</strong>. Source: <strong>{audioUrl.includes('hearthis') ? 'Hearthis.at Cloud' : 'Direct Upload'}</strong>.
            </p>
            <div className="p-3 bg-black/50 border border-white/10 rounded-xl font-mono text-xs text-text-secondary space-y-1">
              <p>Duration: {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</p>
              <p>Audio URL: {audioUrl || 'N/A'}</p>
            </div>
          </div>
        )}

        {activeTab === 'sets' && (
          <div className="bg-[#141312] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg text-center py-10">
            <Music className="w-8 h-8 text-[#f4e059] mx-auto opacity-70" />
            <h3 className="text-sm font-bold uppercase text-white">Included In DJ Sets</h3>
            <p className="text-xs text-text-muted max-w-md mx-auto">
              Add or organize this mix within your curated DJ set playlists from the Sets manager.
            </p>
            <Link
              to="/dashboard/sets"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase transition-all"
            >
              Manage DJ Sets
            </Link>
          </div>
        )}

        {activeTab === 'premium' && (
          <div className="bg-[#141312] border border-white/[0.08] rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
            <h3 className="text-sm font-bold uppercase text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#f4e059]" />
              Promotions & Reach Boost
            </h3>
            <p className="text-xs text-text-muted">
              Get 5x more listeners by boosting this mix to the top of the Sierra Leone trending charts!
            </p>
            <Link
              to="/dashboard/subscription"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#f4e059] text-black text-xs font-black uppercase tracking-wider shadow-md hover:brightness-110"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Promote Mix with Boost
            </Link>
          </div>
        )}
      </main>

      {/* ─── HIDDEN FILE INPUTS ─── */}
      <input
        type="file"
        ref={coverInputRef}
        onChange={handleCoverChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={audioInputRef}
        onChange={handleAudioChange}
        accept="audio/*"
        className="hidden"
      />

      {/* ─── BOTTOM STICKY ACTION BAR (Matching Hearthis Bottom Bar) ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0e0e0e]/95 backdrop-blur-xl border-t border-white/10 px-3 sm:px-6 py-2.5 shadow-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Primary Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#e63946] hover:bg-[#d62828] text-white font-bold text-xs uppercase px-4 h-8 rounded-lg shadow-md flex items-center gap-1.5 shrink-0"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save</span>
            </Button>

            {/* Cut / Gain Button */}
            <button
              type="button"
              disabled
              title="Audio cut/effects/gain processing is not available yet"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 text-text-muted text-[11px] font-semibold opacity-50 cursor-not-allowed"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Cut, Effects, Gain...</span>
            </button>

            {/* Tracklist Helper */}
            <button
              type="button"
              onClick={handleInsertTracklistTemplate}
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white text-[11px] font-semibold transition-colors"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Tracklist</span>
            </button>

            {/* Replace Audio File */}
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className={cn(
                'inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors',
                audioFileName
                  ? 'bg-[#f4e059]/20 text-[#f4e059] border border-[#f4e059]/40'
                  : 'bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white'
              )}
              title={audioFileName ? `Selected: ${audioFileName}` : 'Replace Audio File'}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{audioFileName ? 'Audio Selected' : 'Replace File'}</span>
              <span className="sm:hidden">{audioFileName ? 'Audio ✓' : 'Replace'}</span>
            </button>

            {/* Change Cover */}
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white text-[11px] font-semibold transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cover</span>
              <span className="sm:hidden">Cover</span>
            </button>

            {/* Streaming Bitrate Badge */}
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded bg-black/50 border border-white/10 text-[10px] font-mono text-text-muted">
              <Zap className="w-3 h-3 text-[#f4e059]" />
              320kbps HD
            </span>
          </div>

          {/* Delete Mix Button */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red/10 hover:bg-red/20 text-red hover:text-red-300 text-[11px] font-bold uppercase transition-colors shrink-0 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete Mix</span>
          </button>
        </div>
      </div>

      {/* ─── DELETE CONFIRMATION DIALOG ─── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-[#181818] border border-red/30 p-5 shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red/20 border border-red/40 flex items-center justify-center mx-auto text-red">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase">Delete Mix?</h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Are you sure you want to permanently delete <strong>"{title}"</strong>? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteMix}
                  disabled={deleting}
                  className="bg-red hover:bg-red/80 text-white font-bold text-xs uppercase"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Yes, Delete'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
