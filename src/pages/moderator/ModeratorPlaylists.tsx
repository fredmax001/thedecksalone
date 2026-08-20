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
} from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
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

export function ModeratorPlaylists() {
  const [loading, setLoading] = useState(true);
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
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
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
    </div>
  );
}

export default ModeratorPlaylists;
