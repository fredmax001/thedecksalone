import { useEffect, useState } from 'react';
import {
  ListMusic,
  Plus,
  Edit2,
  Trash2,
  Search,
  Music,
  Loader2,
  X,
  Upload,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { GENRES } from '@/constants/genres';
import { MOODS, ENERGIES, MOOD_LABELS, ENERGY_LABELS } from '@/constants/moods';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DashboardSkeleton } from '@/components/ui/page-skeletons';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

const PRESET_PLAYLIST_NAMES = [
  '🔥 Deck Salone Top Mixes',
  '🇸🇱 Best of Sierra Leone DJs',
  '🎧 Weekend Vibes',
  '🔥 Trending Mixes',
  'Afrobeat Favorites',
  'Hip-Hop & Rap',
  'R&B & Slow Jams',
  'Amapiano Heat',
  'Old Salone Classics',
  'Party & Club Mixes',
  'New & Rising DJs',
];

const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending (most played)' },
  { value: 'newest', label: 'Newest first' },
  { value: 'most_liked', label: 'Most liked' },
];

function RuleChips({ playlist }: { playlist: any }) {
  const chips: string[] = [];
  (playlist.moods || []).forEach((m: string) => chips.push(MOOD_LABELS[m] || m));
  (playlist.energies || []).forEach((e: string) => chips.push(`${ENERGY_LABELS[e] || e} Energy`));
  return (
    <div className="flex flex-wrap gap-1">
      {chips.length === 0 && playlist.genres?.length === 0 && (
        <Badge className="bg-white/5 text-text-secondary border-white/10 text-[9px]">All mixes</Badge>
      )}
      {chips.map((c) => (
        <Badge key={c} className="bg-gold/10 text-gold border-gold/30 text-[9px]">{c}</Badge>
      ))}
      {(playlist.genres || []).slice(0, 3).map((g: string) => (
        <Badge key={g} className="bg-white/5 text-text-secondary border-white/10 text-[9px]">{g}</Badge>
      ))}
      {(playlist.genres || []).length > 3 && (
        <Badge className="bg-white/5 text-text-secondary border-white/10 text-[9px]">
          +{playlist.genres.length - 3} more
        </Badge>
      )}
    </div>
  );
}

export function SmartPlaylistsPanel() {
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const showSkeleton = useDelayedLoading(loading);

  // Dialog / form state
  const [editing, setEditing] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [energies, setEnergies] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('trending');
  const [trackLimit, setTrackLimit] = useState(20);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  // Live preview
  const [previewTotal, setPreviewTotal] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const res = await api.get('/moderator/smart-playlists');
      if (res.data.success) setPlaylists(res.data.data);
    } catch (err) {
      console.error('Failed to fetch smart playlists', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  // Debounced live preview of how many mixes match the current rules
  useEffect(() => {
    if (!editing) return;
    setPreviewLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/moderator/smart-playlists/preview', {
          params: {
            genres: JSON.stringify(genres),
            moods: JSON.stringify(moods),
            energies: JSON.stringify(energies),
            sortBy,
            trackLimit,
          },
        });
        if (res.data.success) setPreviewTotal(res.data.data.total);
      } catch {
        setPreviewTotal(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [editing, genres, moods, energies, sortBy, trackLimit]);

  const handleOpenCreate = () => {
    setIsNew(true);
    setEditing({});
    setTitle('');
    setDescription('');
    setCoverImage('');
    setCoverFile(null);
    setCoverPreview(null);
    setGenres([]);
    setMoods([]);
    setEnergies([]);
    setSortBy('trending');
    setTrackLimit(20);
    setIsFeatured(false);
    setIsPublished(true);
    setPreviewTotal(null);
  };

  const handleOpenEdit = (pl: any) => {
    setIsNew(false);
    setEditing(pl);
    setTitle(pl.title || '');
    setDescription(pl.description || '');
    setCoverImage(pl.coverImage || '');
    setCoverFile(null);
    setCoverPreview(pl.coverImage ? getMediaUrl(pl.coverImage) : null);
    setGenres(pl.genres || []);
    setMoods(pl.moods || []);
    setEnergies(pl.energies || []);
    setSortBy(pl.sortBy || 'trending');
    setTrackLimit(pl.trackLimit || 20);
    setIsFeatured(Boolean(pl.isFeatured));
    setIsPublished(pl.isPublished !== false);
    setPreviewTotal(null);
  };

  const toggleValue = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description || '');
      formData.append('genres', JSON.stringify(genres));
      formData.append('moods', JSON.stringify(moods));
      formData.append('energies', JSON.stringify(energies));
      formData.append('sortBy', sortBy);
      formData.append('trackLimit', String(trackLimit));
      formData.append('isFeatured', String(isFeatured));
      formData.append('isPublished', String(isPublished));
      if (coverFile) {
        formData.append('coverImageFile', coverFile);
      } else if (coverImage) {
        formData.append('coverImage', coverImage);
      }

      if (isNew) {
        await api.post('/moderator/smart-playlists', formData);
      } else {
        await api.put(`/moderator/smart-playlists/${editing.id}`, formData);
      }
      setEditing(null);
      fetchPlaylists();
    } catch (err) {
      console.error('Failed to save smart playlist', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this smart playlist?')) return;
    try {
      await api.delete(`/moderator/smart-playlists/${id}`);
      fetchPlaylists();
    } catch (err) {
      console.error('Failed to delete smart playlist', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-black-elevated p-4 sm:p-5 rounded-xl border border-dark-gray">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <h2 className="text-base font-bold text-white">Smart Playlists</h2>
            <Badge className="bg-gold/20 text-gold border-gold/40 text-[10px]">Mood • Genre • Energy</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Rule-based playlists that build themselves from mix mood, genre and energy tags. Leave a rule empty to match everything.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="bg-gold text-black hover:bg-gold-light font-semibold text-xs gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Smart Playlist
        </Button>
      </div>

      {loading ? (
        showSkeleton ? <DashboardSkeleton /> : null
      ) : playlists.length === 0 ? (
        <Card className="bg-black-elevated border-dark-gray p-12 text-center">
          <Sparkles className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">No smart playlists yet</p>
          <p className="text-xs text-text-muted mt-1">
            Create one to auto-fill a playlist from mixes matching mood, genre and energy rules.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {playlists.map((pl) => (
            <Card
              key={pl.id}
              className={`bg-black-elevated border-dark-gray p-4 space-y-3 ${
                !pl.isPublished ? 'opacity-60 border-red/30' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0 overflow-hidden">
                    {pl.coverImage ? (
                      <img src={getMediaUrl(pl.coverImage)} alt={pl.title} className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles className="w-6 h-6 text-gold" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white truncate">{pl.title}</h3>
                      {pl.isFeatured && (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] px-1.5 py-0">
                          ⭐ Featured
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-text-muted">
                      Smart Playlist • up to {pl.trackLimit} mixes • {SORT_OPTIONS.find((s) => s.value === pl.sortBy)?.label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(pl)} className="h-7 w-7 p-0 text-gold hover:text-white">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(pl.id)} className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <RuleChips playlist={pl} />

              <div className="pt-2 border-t border-dark-gray/60 flex items-center justify-between text-[10px] text-text-muted">
                <span className="truncate">Slug: /playlist/{pl.slug}</span>
                <span className={pl.isPublished ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                  {pl.isPublished ? '● Published' : '○ Unpublished'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Smart Playlist Dialog */}
      <Dialog open={Boolean(editing)} onOpenChange={() => setEditing(null)}>
        <DialogContent className="bg-black-elevated border-dark-gray text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold text-base font-bold">
              <Sparkles className="w-5 h-5" />
              {isNew ? 'Create Smart Playlist' : 'Edit Smart Playlist'}
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Mixes are matched automatically from the rules below. Leaving a group empty means "match all".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Playlist Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. High-Energy Amapiano Party"
                className="bg-black-surface border-dark-gray text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What vibe is this playlist?"
                rows={2}
                className="w-full bg-black-surface border border-dark-gray rounded-md p-2.5 text-xs text-white focus:outline-none focus:border-gold"
              />
            </div>

            {/* Rules */}
            <div className="space-y-3 bg-black-surface rounded-lg border border-dark-gray p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Match Rules</p>

              <div>
                <p className="text-[11px] font-semibold text-text-secondary mb-1.5">Moods</p>
                <div className="flex flex-wrap gap-1.5">
                  {MOODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => toggleValue(moods, setMoods, m.value)}
                      className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border transition ${
                        moods.includes(m.value)
                          ? 'bg-gold text-black border-gold'
                          : 'bg-black-elevated text-text-secondary border-dark-gray hover:border-gold/40'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-text-secondary mb-1.5">Energy</p>
                <div className="flex flex-wrap gap-1.5">
                  {ENERGIES.map((en) => (
                    <button
                      key={en.value}
                      type="button"
                      onClick={() => toggleValue(energies, setEnergies, en.value)}
                      className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border transition ${
                        energies.includes(en.value)
                          ? 'bg-gold text-black border-gold'
                          : 'bg-black-elevated text-text-secondary border-dark-gray hover:border-gold/40'
                      }`}
                    >
                      {en.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-text-secondary mb-1.5">Genres</p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {GENRES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleValue(genres, setGenres, g)}
                      className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border transition ${
                        genres.includes(g)
                          ? 'bg-gold text-black border-gold'
                          : 'bg-black-elevated text-text-secondary border-dark-gray hover:border-gold/40'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-text-secondary block mb-1">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-black-elevated border border-dark-gray rounded-md px-2.5 py-2 text-xs text-white focus:border-gold focus:outline-none"
                  >
                    {SORT_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-text-secondary block mb-1">Max Mixes</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={trackLimit}
                    onChange={(e) => setTrackLimit(parseInt(e.target.value, 10) || 20)}
                    className="bg-black-elevated border-dark-gray text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-text-secondary bg-black-elevated rounded-md px-3 py-2 border border-dark-gray">
                <RefreshCw className={`w-3.5 h-3.5 text-gold ${previewLoading ? 'animate-spin' : ''}`} />
                {previewLoading ? (
                  <span>Checking matches…</span>
                ) : previewTotal !== null ? (
                  <span>
                    <span className="text-gold font-bold">{previewTotal}</span> {previewTotal === 1 ? 'mix matches' : 'mixes match'} these rules right now
                  </span>
                ) : (
                  <span>Preview will appear as you set rules</span>
                )}
              </div>
            </div>

            {/* Cover */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Cover Artwork (optional)</label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer bg-black-surface border border-dashed border-gold/40 hover:border-gold rounded-xl p-3 text-center transition-colors flex items-center justify-center gap-2 text-xs text-gold">
                  <Upload className="w-4 h-4" />
                  <span>{coverFile ? coverFile.name : 'Upload Image File'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setCoverFile(f);
                        setCoverPreview(URL.createObjectURL(f));
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {coverPreview && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-gold shrink-0">
                    <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <Input
                value={coverImage}
                onChange={(e) => {
                  setCoverImage(e.target.value);
                  if (e.target.value) setCoverPreview(e.target.value);
                }}
                placeholder="…or direct image URL"
                className="bg-black-surface border-dark-gray text-xs text-white mt-2"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-black-surface rounded-lg border border-dark-gray">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded accent-gold w-4 h-4"
                />
                <span>Publish Immediately</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-300 font-medium">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded accent-amber-500 w-4 h-4"
                />
                <span>⭐ Feature</span>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="bg-gold text-black hover:bg-gold-light text-xs font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Smart Playlist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ModeratorPlaylists() {
  const [loading, setLoading] = useState(true);
  const showSkeleton = useDelayedLoading(loading);
  const [activeTab, setActiveTab] = useState<'curated' | 'smart'>('curated');
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [editingPlaylist, setEditingPlaylist] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mix Picker Modal
  const [mixPickerPlaylist, setMixPickerPlaylist] = useState<any | null>(null);
  const [searchMixQuery, setSearchMixQuery] = useState('');
  const [availableMixes, setAvailableMixes] = useState<any[]>([]);
  const [selectedMixIds, setSelectedMixIds] = useState<string[]>([]);
  const [searchingMixes, setSearchingMixes] = useState(false);
  const [addingMixId, setAddingMixId] = useState<string | null>(null);
  const [bulkAdding, setBulkAdding] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const res = await api.get('/moderator/playlists');
      if (res.data.success) {
        setPlaylists(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch playlists', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleOpenCreate = () => {
    setIsNew(true);
    setEditingPlaylist({});
    setTitle('');
    setDescription('');
    setCoverImage('');
    setCoverFile(null);
    setCoverPreview(null);
    setIsFeatured(false);
    setIsPublished(true);
  };

  const handleOpenEdit = (pl: any) => {
    setIsNew(false);
    setEditingPlaylist(pl);
    setTitle(pl.title || '');
    setDescription(pl.description || '');
    setCoverImage(pl.coverImage || '');
    setCoverFile(null);
    setCoverPreview(pl.coverImage ? getMediaUrl(pl.coverImage) : null);
    setIsFeatured(Boolean(pl.isFeatured));
    setIsPublished(pl.isPublished !== false);
  };

  const handleSavePlaylist = async () => {
    if (!title.trim()) return;
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description || '');
      formData.append('isFeatured', String(isFeatured));
      formData.append('isPublished', String(isPublished));

      if (coverFile) {
        formData.append('coverImageFile', coverFile);
      } else if (coverImage) {
        formData.append('coverImage', coverImage);
      }

      if (isNew) {
        await api.post('/moderator/playlists', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.put(`/moderator/playlists/${editingPlaylist.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setEditingPlaylist(null);
      fetchPlaylists();
    } catch (err) {
      console.error('Failed to save playlist', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this official playlist?')) return;
    try {
      await api.delete(`/moderator/playlists/${id}`);
      fetchPlaylists();
    } catch (err) {
      console.error('Failed to delete playlist', err);
    }
  };

  // Mix Picker & Item Operations
  const handleOpenMixPicker = async (pl: any) => {
    setMixPickerPlaylist(pl);
    setSearchMixQuery('');
    setSelectedMixIds([]);
    fetchAvailableMixes('');
  };

  const fetchAvailableMixes = async (query: string) => {
    try {
      setSearchingMixes(true);
      const res = await api.get('/moderator/mixes', { params: { search: query, limit: 500 } });
      if (res.data.success) {
        setAvailableMixes(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch mixes for playlist', err);
    } finally {
      setSearchingMixes(false);
    }
  };

  const handleAddMixToPlaylist = async (mix: any) => {
    if (!mixPickerPlaylist) return;
    try {
      setAddingMixId(mix.id);
      const res = await api.post(`/moderator/playlists/${mixPickerPlaylist.id}/items`, { mixId: mix.id });
      if (res.data.success) {
        const returnedData = res.data.data;
        const newItem = {
          id: returnedData?.id || `item-${Date.now()}-${mix.id}`,
          playlistId: mixPickerPlaylist.id,
          mixId: mix.id,
          position: returnedData?.position || ((mixPickerPlaylist.items?.length || 0) + 1),
          mix: returnedData?.mix || mix,
        };
        const currentItems = mixPickerPlaylist.items || [];
        const exists = currentItems.some((i: any) => i.mixId === mix.id || i.mix?.id === mix.id);
        const updatedItems = exists ? currentItems : [...currentItems, newItem];

        setMixPickerPlaylist({ ...mixPickerPlaylist, items: updatedItems });

        // Update playlists list state in background
        setPlaylists((prev) =>
          prev.map((p) => (p.id === mixPickerPlaylist.id ? { ...p, items: updatedItems } : p))
        );
      }
    } catch (err) {
      console.error('Failed to add mix to playlist', err);
    } finally {
      setAddingMixId(null);
    }
  };

  const handleBulkAddMixes = async () => {
    if (!mixPickerPlaylist || selectedMixIds.length === 0) return;
    try {
      setBulkAdding(true);
      const res = await api.post(`/moderator/playlists/${mixPickerPlaylist.id}/items/bulk`, {
        mixIds: selectedMixIds,
      });
      if (res.data.success) {
        setSelectedMixIds([]);
        // Re-fetch all playlists to sync full item states
        const plRes = await api.get('/moderator/playlists');
        if (plRes.data.success) {
          setPlaylists(plRes.data.data);
          const current = plRes.data.data.find((p: any) => p.id === mixPickerPlaylist.id);
          if (current) setMixPickerPlaylist(current);
        }
      }
    } catch (err) {
      console.error('Failed to bulk add mixes', err);
    } finally {
      setBulkAdding(false);
    }
  };

  const handleRemoveMixFromPlaylist = async (playlistId: string, itemId: string) => {
    try {
      await api.delete(`/moderator/playlists/${playlistId}/items/${itemId}`);
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === playlistId) {
            return { ...p, items: (p.items || []).filter((i: any) => i.id !== itemId) };
          }
          return p;
        })
      );
      if (mixPickerPlaylist && mixPickerPlaylist.id === playlistId) {
        setMixPickerPlaylist({
          ...mixPickerPlaylist,
          items: (mixPickerPlaylist.items || []).filter((i: any) => i.id !== itemId),
        });
      }
    } catch (err) {
      console.error('Failed to remove item', err);
    }
  };

  const handleMoveItem = async (playlistId: string, itemIndex: number, direction: 'up' | 'down') => {
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl || !pl.items) return;

    const newItems = [...pl.items];
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const [moved] = newItems.splice(itemIndex, 1);
    newItems.splice(targetIndex, 0, moved);

    // Optimistic update
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, items: newItems } : p))
    );
    if (mixPickerPlaylist && mixPickerPlaylist.id === playlistId) {
      setMixPickerPlaylist({ ...mixPickerPlaylist, items: newItems });
    }

    try {
      await api.put(`/moderator/playlists/${playlistId}/reorder`, {
        itemIds: newItems.map((i) => i.id),
      });
    } catch (err) {
      console.error('Failed to save reordered playlist', err);
      fetchPlaylists();
    }
  };

  const toggleSelectMix = (mixId: string) => {
    setSelectedMixIds((prev) =>
      prev.includes(mixId) ? prev.filter((id) => id !== mixId) : [...prev, mixId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Curated vs Smart tab switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('curated')}
          className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-lg border transition ${
            activeTab === 'curated'
              ? 'bg-gold text-black border-gold'
              : 'bg-black-elevated text-text-secondary border-dark-gray hover:border-gold/40'
          }`}
        >
          <ListMusic className="w-4 h-4" />
          Curated Playlists
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('smart')}
          className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-lg border transition ${
            activeTab === 'smart'
              ? 'bg-gold text-black border-gold'
              : 'bg-black-elevated text-text-secondary border-dark-gray hover:border-gold/40'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Smart Playlists
        </button>
      </div>

      {activeTab === 'smart' ? (
        <SmartPlaylistsPanel />
      ) : (
        <>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black-elevated p-4 sm:p-5 rounded-xl border border-dark-gray">
        <div>
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-gold" />
            <h2 className="text-base font-bold text-white">Official Deck Salone Playlists</h2>
            <Badge className="bg-gold/20 text-gold border-gold/40 text-[10px]">Official Curator</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Create, curate, and feature official platform playlists for the Deck Salone community.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="bg-gold text-black hover:bg-gold-light font-semibold text-xs gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Official Playlist
        </Button>
      </div>

      {/* Preset Name Quick Suggestions */}
      <Card className="bg-black-elevated border-dark-gray p-4">
        <p className="text-xs font-semibold text-text-secondary mb-2.5">Suggested Playlist Themes:</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_PLAYLIST_NAMES.map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setIsNew(true);
                setEditingPlaylist({});
                setTitle(preset);
                setDescription(`Official ${preset} playlist curated by Deck Salone Moderators.`);
                setCoverImage('');
                setCoverFile(null);
                setCoverPreview(null);
                setIsFeatured(true);
                setIsPublished(true);
              }}
              className="text-xs bg-black-surface hover:bg-gold/10 border border-dark-gray hover:border-gold/50 text-white hover:text-gold px-3 py-1.5 rounded-lg transition"
            >
              + {preset}
            </button>
          ))}
        </div>
      </Card>

      {/* Playlists List */}
      {loading ? (
        showSkeleton ? <DashboardSkeleton /> : null
      ) : playlists.length === 0 ? (
        <Card className="bg-black-elevated border-dark-gray p-12 text-center">
          <ListMusic className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">No official playlists created yet</p>
          <p className="text-xs text-text-muted mt-1">
            Click "Create Official Playlist" or choose a theme above to start curating.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {playlists.map((pl) => (
            <Card
              key={pl.id}
              className={`bg-black-elevated border-dark-gray p-4 flex flex-col justify-between space-y-4 ${
                !pl.isPublished ? 'opacity-60 border-red/30' : ''
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0 overflow-hidden">
                      {pl.coverImage ? (
                        <img src={getMediaUrl(pl.coverImage)} alt={pl.title} className="w-full h-full object-cover" />
                      ) : (
                        <ListMusic className="w-6 h-6 text-gold" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{pl.title}</h3>
                        {pl.isFeatured && (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] px-1.5 py-0">
                            ⭐ Featured
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-text-muted">
                        Official Deck Salone Playlist • {pl.items?.length || 0} mixes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(pl)}
                      className="h-7 w-7 p-0 text-gold hover:text-white"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeletePlaylist(pl.id)}
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {pl.description && (
                  <p className="text-xs text-text-secondary line-clamp-2">{pl.description}</p>
                )}

                {/* Included Mixes Preview */}
                <div className="space-y-1.5 pt-2 border-t border-dark-gray/60">
                  <div className="flex items-center justify-between text-[11px] text-text-muted font-semibold">
                    <span>Curated Tracklist ({pl.items?.length || 0})</span>
                    <button
                      onClick={() => handleOpenMixPicker(pl)}
                      className="text-gold hover:underline flex items-center gap-1"
                    >
                      + Add Mixes
                    </button>
                  </div>

                  {pl.items?.length === 0 ? (
                    <p className="text-[10px] text-text-muted italic py-1">No mixes added to this playlist yet.</p>
                  ) : (
                    pl.items?.map((item: any, idx: number) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-black-surface p-2 rounded border border-dark-gray/40 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-text-muted w-3.5">{idx + 1}.</span>
                          <Music className="w-3.5 h-3.5 text-gold shrink-0" />
                          <span className="text-white truncate font-medium">{item.mix?.title}</span>
                          <span className="text-[10px] text-text-muted truncate">({item.mix?.dj?.stageName})</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            disabled={idx === 0}
                            onClick={() => handleMoveItem(pl.id, idx, 'up')}
                            className="p-1 text-text-muted hover:text-white disabled:opacity-20"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            disabled={idx === pl.items.length - 1}
                            onClick={() => handleMoveItem(pl.id, idx, 'down')}
                            className="p-1 text-text-muted hover:text-white disabled:opacity-20"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRemoveMixFromPlaylist(pl.id, item.id)}
                            className="text-text-muted hover:text-red-400 p-1"
                            title="Remove Mix"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-dark-gray flex items-center justify-between text-xs">
                <span className="text-[10px] text-text-muted">Slug: /playlist/{pl.slug}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenMixPicker(pl)}
                  className="h-7 text-xs border-gold/40 text-gold hover:bg-gold/10"
                >
                  Manage Mixes ({pl.items?.length || 0})
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Playlist Modal */}
      <Dialog open={Boolean(editingPlaylist)} onOpenChange={() => setEditingPlaylist(null)}>
        <DialogContent className="bg-black-elevated border-dark-gray text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold text-base font-bold">
              <ListMusic className="w-5 h-5" />
              {isNew ? 'Create Official Playlist' : 'Edit Official Playlist'}
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Official Deck Salone playlists are highlighted across the mobile app and web platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Playlist Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 🔥 Deck Salone Top Mixes"
                className="bg-black-surface border-dark-gray text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what makes this playlist special..."
                rows={3}
                className="w-full bg-black-surface border border-dark-gray rounded-md p-2.5 text-xs text-white focus:outline-none focus:border-gold"
              />
            </div>

            {/* Cover Image Upload / URL */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Cover Artwork</label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer bg-black-surface border border-dashed border-gold/40 hover:border-gold rounded-xl p-3 text-center transition-colors flex items-center justify-center gap-2 text-xs text-gold">
                    <Upload className="w-4 h-4" />
                    <span>{coverFile ? coverFile.name : 'Upload Image File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFileChange}
                      className="hidden"
                    />
                  </label>
                  {coverPreview && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-gold shrink-0">
                      <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-text-muted text-center">OR enter direct image URL:</p>
                <Input
                  value={coverImage}
                  onChange={(e) => {
                    setCoverImage(e.target.value);
                    if (e.target.value) setCoverPreview(e.target.value);
                  }}
                  placeholder="https://..."
                  className="bg-black-surface border-dark-gray text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-black-surface rounded-lg border border-dark-gray">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded accent-gold w-4 h-4"
                />
                <span>Publish Immediately</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-300 font-medium">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded accent-amber-500 w-4 h-4"
                />
                <span>⭐ Feature on Homepage</span>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditingPlaylist(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSavePlaylist}
              disabled={saving || !title.trim()}
              className="bg-gold text-black hover:bg-gold-light text-xs font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Playlist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Mix Picker Modal */}
      <Dialog open={Boolean(mixPickerPlaylist)} onOpenChange={() => setMixPickerPlaylist(null)}>
        <DialogContent className="bg-black-elevated border-dark-gray text-white max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 text-gold text-base font-bold">
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Manage Mixes: "{mixPickerPlaylist?.title}"
              </span>
              <span className="text-xs font-normal text-text-muted">
                {mixPickerPlaylist?.items?.length || 0} in playlist
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Search published mixes to add them to this official playlist. Keep this modal open to curate multiple tracks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search mix by title, genre, or DJ name..."
                  value={searchMixQuery}
                  onChange={(e) => {
                    setSearchMixQuery(e.target.value);
                    fetchAvailableMixes(e.target.value);
                  }}
                  className="pl-9 bg-black-surface border-dark-gray text-xs text-white"
                />
              </div>

              {selectedMixIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleBulkAddMixes}
                  disabled={bulkAdding}
                  className="bg-gold text-black hover:bg-gold-light text-xs font-bold shrink-0"
                >
                  {bulkAdding ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    `+ Add Selected (${selectedMixIds.length})`
                  )}
                </Button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {searchingMixes ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 text-gold animate-spin mx-auto" />
                </div>
              ) : availableMixes.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">No mixes matched your search</p>
              ) : (
                availableMixes.map((mix) => {
                  const isInPlaylist = mixPickerPlaylist?.items?.some(
                    (item: any) => item.mixId === mix.id || item.mix?.id === mix.id
                  );
                  const isSelected = selectedMixIds.includes(mix.id);
                  const isAdding = addingMixId === mix.id;

                  return (
                    <div
                      key={mix.id}
                      className={`flex items-center justify-between bg-black-surface p-2.5 rounded-lg border transition ${
                        isInPlaylist
                          ? 'border-dark-gray/40 opacity-75'
                          : isSelected
                          ? 'border-gold/60 bg-gold/5'
                          : 'border-dark-gray hover:border-gold/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {!isInPlaylist && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectMix(mix.id)}
                            className="rounded accent-gold w-4 h-4 cursor-pointer"
                          />
                        )}
                        <img
                          src={getMediaUrl(mix.coverImage) || '/placeholder-mix.jpg'}
                          alt={mix.title}
                          className="w-9 h-9 rounded object-cover border border-dark-gray shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{mix.title}</p>
                          <p className="text-[10px] text-text-muted truncate">
                            {mix.dj?.stageName} • <span className="text-gold">{mix.genre}</span>
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 ml-2">
                        {isInPlaylist ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ADDED
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isAdding}
                            onClick={() => handleAddMixToPlaylist(mix)}
                            className="bg-gold text-black hover:bg-gold-light text-xs font-semibold h-7 px-3"
                          >
                            {isAdding ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              '+ Add'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}

export default ModeratorPlaylists;
