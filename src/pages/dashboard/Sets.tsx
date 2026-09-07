import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ListMusic, Plus, Play, Trash2, Music, Loader2,
  Radio, Globe, Lock, PlusCircle, CheckCircle2, Upload
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore } from '@/stores/playerStore';
import { GENRES } from '@/constants/genres';
import api, { getMediaUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { getAvatarImageUrl } from '@/lib/utils';

interface MixItem {
  id: string;
  title: string;
  genre: string;
  coverImage?: string;
  audioUrl?: string;
  duration?: string | number;
  plays: number;
  likes: number;
}

interface SetItem {
  id: string;
  setId: string;
  mixId: string;
  sortOrder: number;
  mix: MixItem;
}

interface DJSet {
  id: string;
  title: string;
  description?: string;
  genre?: string;
  coverImage?: string;
  isPublic: boolean;
  mixCount: number;
  items: SetItem[];
  createdAt: string;
}

export default function Sets() {
  const { user } = useAuthStore();
  const { play, setQueue } = usePlayerStore();
  const [sets, setSets] = useState<DJSet[]>([]);
  const [myMixes, setMyMixes] = useState<MixItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<DJSet | null>(null);

  // File upload vs URL state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Form state
  const [formLoading, setFormLoading] = useState(false);
  const [addingMixId, setAddingMixId] = useState<string | null>(null);
  const [setForm, setSetForm] = useState({
    title: '',
    genre: 'Salone Mix',
    description: '',
    coverImage: '',
    isPublic: true,
  });

  const fetchSets = async () => {
    try {
      const res = await api.get('/sets/mine');
      if (res.data.success) {
        setSets(res.data.data || []);
      }
    } catch {
      toast.error('Failed to load sets');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyMixes = async () => {
    try {
      const djId = user?.djProfile?.id;
      if (!djId) return;
      const res = await api.get(`/mixes?djId=${djId}&limit=100`);
      if (res.data.success) {
        setMyMixes(res.data.data?.mixes || res.data.data || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchSets();
    fetchMyMixes();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setForm.title.trim()) {
      toast.error('Set title is required');
      return;
    }
    setFormLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', setForm.title);
      formData.append('genre', setForm.genre);
      formData.append('description', setForm.description);
      formData.append('isPublic', String(setForm.isPublic));

      if (coverFile) {
        formData.append('coverImageFile', coverFile);
      } else if (setForm.coverImage) {
        formData.append('coverImage', setForm.coverImage);
      }

      const res = await api.post('/sets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        toast.success('Set playlist created!');
        setIsCreateOpen(false);
        setSetForm({ title: '', genre: 'Salone Mix', description: '', coverImage: '', isPublic: true });
        setCoverFile(null);
        setCoverPreview(null);
        fetchSets();
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to create set'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteSet = async (setId: string) => {
    if (!confirm('Are you sure you want to delete this set?')) return;
    // Optimistic removal with snapshot-then-rollback
    const previousSets = sets;
    setSets((prev) => prev.filter((s) => s.id !== setId));
    try {
      const res = await api.delete(`/sets/${setId}`);
      if (!res.data.success) {
        throw new Error(res.data.error || 'Failed to delete set');
      }
      toast.success('Set deleted');
    } catch (err: any) {
      setSets(previousSets);
      toast.error('Could not remove: ' + getApiErrorMessage(err, 'Failed to delete set'));
    }
  };

  const handleAddMixToSet = async (setId: string, mix: MixItem) => {
    setAddingMixId(mix.id);

    // Optimistic add with snapshot-then-rollback: show the mix in the set immediately
    const previousSets = sets;
    const previousSelectedSet = selectedSet;
    const newItem: SetItem = {
      id: `temp-${mix.id}`,
      setId,
      mixId: mix.id,
      sortOrder: selectedSet?.items?.length || 0,
      mix,
    };
    setSets((prev) =>
      prev.map((s) =>
        s.id === setId
          ? { ...s, mixCount: (s.mixCount || 0) + 1, items: [...(s.items || []), newItem] }
          : s
      )
    );
    if (selectedSet && selectedSet.id === setId) {
      setSelectedSet({
        ...selectedSet,
        mixCount: (selectedSet.mixCount || 0) + 1,
        items: [...(selectedSet.items || []), newItem],
      });
    }

    try {
      const res = await api.post(`/sets/${setId}/mixes`, { mixId: mix.id });
      if (!res.data.success) {
        throw new Error(res.data.error || 'Failed to add mix to set');
      }
      toast.success(`Added "${mix.title}" to set!`);
      // Reconcile with server data (e.g. real item id, mixCount)
      fetchSets();
    } catch (err: any) {
      setSets(previousSets);
      setSelectedSet(previousSelectedSet);
      toast.error('Could not add mix to set: ' + getApiErrorMessage(err, 'Failed to add mix to set'));
    } finally {
      setAddingMixId(null);
    }
  };

  const handleRemoveMixFromSet = async (setId: string, mixId: string) => {
    // Optimistic removal with snapshot-then-rollback
    const previousSets = sets;
    const previousSelectedSet = selectedSet;
    setSets((prev) =>
      prev.map((s) =>
        s.id === setId
          ? {
              ...s,
              mixCount: Math.max(0, (s.mixCount || 0) - 1),
              items: (s.items || []).filter((i) => i.mixId !== mixId),
            }
          : s
      )
    );
    if (selectedSet && selectedSet.id === setId) {
      setSelectedSet({
        ...selectedSet,
        mixCount: Math.max(0, (selectedSet.mixCount || 0) - 1),
        items: selectedSet.items.filter((i) => i.mixId !== mixId),
      });
    }

    try {
      const res = await api.delete(`/sets/${setId}/mixes/${mixId}`);
      if (!res.data.success) {
        throw new Error(res.data.error || 'Failed to remove mix');
      }
      toast.success('Mix removed from set');
      fetchSets();
    } catch (err: any) {
      setSets(previousSets);
      setSelectedSet(previousSelectedSet);
      toast.error('Could not remove: ' + getApiErrorMessage(err, 'Failed to remove mix'));
    }
  };

  const playEntireSet = (set: DJSet) => {
    if (!set.items || set.items.length === 0) {
      toast.error('This set has no mixes yet!');
      return;
    }
    const tracks = set.items
      .filter((i) => i.mix)
      .map((i) => ({
        id: i.mix.id,
        title: i.mix.title,
        dj: user?.djProfile?.stageName || 'DJ',
        duration: typeof i.mix.duration === 'number' ? i.mix.duration : parseInt(String(i.mix.duration)) || 0,
        cover: getMediaUrl(i.mix.coverImage || set.coverImage) || '',
        genre: i.mix.genre || set.genre || 'Salone Mix',
        plays: i.mix.plays || 0,
        audioUrl: getMediaUrl(i.mix.audioUrl) || '',
      }));
    if (tracks.length === 0) {
      toast.error('No playable tracks in this set');
      return;
    }
    setQueue(tracks as any);
    play(tracks[0] as any);
    toast.success(`Playing set: ${set.title}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
            <Radio className="w-6 h-6 text-gold" /> DJ Sets & Playlists
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Create custom mix playlists by genre, vibe, or event series.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gold-gradient text-black font-bold uppercase tracking-wider text-xs px-4 py-2 rounded-full"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Create New Set
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : sets.length === 0 ? (
        <Card className="bg-black-surface border-dark-gray text-center py-12">
          <CardContent className="space-y-3">
            <ListMusic className="w-12 h-12 text-gold mx-auto" />
            <h3 className="font-display text-lg font-bold text-text-primary uppercase">No DJ Sets Created Yet</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              Organize your uploaded mixes into genre playlists (e.g. Afrobeats 2026, Reggae Vibration, Old Skool Salone).
            </p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-gold-gradient text-black font-bold text-xs uppercase tracking-wider mt-2"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create Your First Set
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sets.map((set, idx) => (
            <motion.div
              key={set.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-black-surface border border-dark-gray rounded-2xl p-4 flex flex-col justify-between hover:border-gold/30 transition-all shadow-lg"
            >
              <div>
                {/* Cover & Badges */}
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-3 bg-black-elevated">
                  <img
                    src={getAvatarImageUrl(set.coverImage || set.items[0]?.mix?.coverImage)}
                    alt={set.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3 justify-between">
                    <Badge className="bg-black/70 backdrop-blur border border-gold/40 text-gold text-[10px] uppercase font-bold">
                      {set.genre || 'Playlist'}
                    </Badge>
                    <Badge className="bg-black/70 backdrop-blur border border-white/20 text-white text-[10px]">
                      {set.mixCount} {set.mixCount === 1 ? 'Mix' : 'Mixes'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-base text-text-primary uppercase truncate">{set.title}</h3>
                  {set.isPublic ? (
                    <span className="flex items-center gap-1 text-[10px] text-green font-semibold">
                      <Globe className="w-3 h-3" /> Public
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-text-muted">
                      <Lock className="w-3 h-3" /> Private
                    </span>
                  )}
                </div>

                {set.description && (
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">{set.description}</p>
                )}

                {/* Tracklist preview */}
                <div className="mt-3 space-y-1.5 bg-black/40 rounded-xl p-2.5 border border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold">Mixes in Set:</span>
                  {set.items && set.items.length > 0 ? (
                    set.items.slice(0, 3).map((item, i) => (
                      <div key={item.id} className="flex items-center justify-between text-xs text-text-secondary truncate">
                        <span className="truncate">{i + 1}. {item.mix?.title}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-text-muted italic">No mixes added yet</p>
                  )}
                  {set.items && set.items.length > 3 && (
                    <p className="text-[10px] text-gold font-semibold">+ {set.items.length - 3} more mixes</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-dark-gray/60">
                <Button
                  size="sm"
                  onClick={() => playEntireSet(set)}
                  className="bg-gold-gradient text-black text-xs font-bold uppercase tracking-wider flex-1"
                >
                  <Play className="w-3.5 h-3.5 mr-1 fill-black" /> Play Set
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedSet(set);
                    setIsManageOpen(true);
                  }}
                  className="border-dark-gray text-text-primary text-xs font-medium"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1 text-gold" /> Manage Mixes
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteSet(set.id)}
                  className="text-text-muted hover:text-red p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal: Create Set */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-black-surface border-dark-gray max-w-md text-text-primary">
          <DialogHeader>
            <DialogTitle className="font-display font-bold uppercase text-lg text-gold flex items-center gap-2">
              <Radio className="w-5 h-5 text-gold" /> Create DJ Set / Playlist
            </DialogTitle>
            <DialogDescription className="text-xs text-text-muted">
              Group your mixes by genre or event theme.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSet} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs uppercase text-text-muted">Set Title</Label>
              <Input
                placeholder="e.g. Afrobeats Party 2026"
                value={setForm.title}
                onChange={(e) => setSetForm((prev) => ({ ...prev, title: e.target.value }))}
                className="bg-black-elevated border-dark-gray mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs uppercase text-text-muted">Genre Category</Label>
              <select
                value={setForm.genre}
                onChange={(e) => setSetForm((prev) => ({ ...prev, genre: e.target.value }))}
                className="w-full bg-black-elevated border border-dark-gray rounded-md p-2.5 text-sm text-text-primary mt-1 focus:border-gold"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs uppercase text-text-muted">Description (Optional)</Label>
              <Textarea
                placeholder="Describe this set..."
                value={setForm.description}
                onChange={(e) => setSetForm((prev) => ({ ...prev, description: e.target.value }))}
                className="bg-black-elevated border-dark-gray mt-1 text-sm h-20"
              />
            </div>

            {/* Cover Image File Upload / URL toggle */}
            <div>
              <Label className="text-xs uppercase text-text-muted">Cover Artwork</Label>
              <div className="mt-1 space-y-2">
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer bg-black-elevated border border-dashed border-gold/40 hover:border-gold rounded-xl p-3 text-center transition-colors flex items-center justify-center gap-2 text-xs text-gold">
                    <Upload className="w-4 h-4" />
                    <span>{coverFile ? coverFile.name : 'Upload Image File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {coverPreview && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-gold flex-shrink-0">
                      <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-text-muted text-center">OR enter direct image URL below:</p>
                <Input
                  placeholder="https://..."
                  value={setForm.coverImage}
                  onChange={(e) => {
                    setSetForm((prev) => ({ ...prev, coverImage: e.target.value }));
                    if (e.target.value) setCoverPreview(e.target.value);
                  }}
                  className="bg-black-elevated border-dark-gray text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={setForm.isPublic}
                onChange={(e) => setSetForm((prev) => ({ ...prev, isPublic: e.target.checked }))}
                className="rounded border-dark-gray accent-gold"
              />
              <Label htmlFor="isPublic" className="text-xs text-text-secondary cursor-pointer">
                Make this Set public on my DJ profile
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-dark-gray">
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading} className="bg-gold-gradient text-black font-bold text-xs uppercase">
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Set'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Manage Mixes in Set */}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="bg-black-surface border-dark-gray max-w-xl text-text-primary max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-bold uppercase text-lg text-gold flex items-center gap-2">
              <ListMusic className="w-5 h-5" /> Manage Mixes: {selectedSet?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-text-muted">
              Add or remove your uploaded mixes to this Set playlist.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Mixes currently in set */}
            <div>
              <h4 className="text-xs font-bold uppercase text-gold mb-2">Mixes in this Set ({selectedSet?.items?.length || 0})</h4>
              {selectedSet?.items && selectedSet.items.length > 0 ? (
                <div className="space-y-2">
                  {selectedSet.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-black-elevated border border-white/10 rounded-xl p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Music className="w-4 h-4 text-gold flex-shrink-0" />
                        <span className="font-semibold text-text-primary truncate">{item.mix?.title}</span>
                        <Badge variant="outline" className="text-[9px] border-gold/30 text-gold uppercase">
                          {item.mix?.genre}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMixFromSet(selectedSet.id, item.mixId)}
                        className="text-red hover:bg-red/10 h-7 text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic bg-black-elevated p-3 rounded-xl border border-white/5">
                  No mixes in this set yet. Select from your mixes below to add them!
                </p>
              )}
            </div>

            {/* Available uploaded mixes */}
            <div className="pt-4 border-t border-dark-gray">
              <h4 className="text-xs font-bold uppercase text-text-primary mb-2">Your Uploaded Mixes</h4>
              {myMixes.length === 0 ? (
                <p className="text-xs text-text-muted">You haven't uploaded any mixes yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {myMixes.map((mix) => {
                    const isInSet = selectedSet?.items?.some((i) => i.mixId === mix.id);
                    const isAddingThis = addingMixId === mix.id;

                    return (
                      <div
                        key={mix.id}
                        className="flex items-center justify-between bg-black/40 border border-dark-gray rounded-xl p-2.5 text-xs hover:border-gold/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <img
                            src={mix.coverImage || '/default-avatar.jpg'}
                            alt={mix.title}
                            className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                          />
                          <div className="truncate">
                            <p className="font-semibold text-text-primary truncate">{mix.title}</p>
                            <p className="text-[10px] text-text-muted">{mix.genre}</p>
                          </div>
                        </div>

                        {isInSet ? (
                          <span className="flex items-center gap-1 text-[11px] text-green font-semibold px-2.5 py-1 bg-green/10 border border-green/30 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ADDED
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isAddingThis}
                            onClick={() => selectedSet && handleAddMixToSet(selectedSet.id, mix)}
                            className="bg-gold-gradient text-black h-7 text-xs font-bold uppercase px-3"
                          >
                            {isAddingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
