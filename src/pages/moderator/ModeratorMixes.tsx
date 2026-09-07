import { useEffect, useState } from 'react';
import {
  Search,
  Edit2,
  Eye,
  EyeOff,
  Flag,
  AlertTriangle,
  Loader2,
  Music,
  Sparkles,
  Star,
} from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { formatDate } from '@/lib/dateTime';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ListSkeleton } from '@/components/ui/page-skeletons';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
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

const SYSTEM_GENRES = [
  'Afrobeats',
  'Amapiano',
  'Salone Mix',
  'Reggae',
  'Dancehall',
  'Gospel',
  'Club Mixes',
  'Club & Party Mixes',
  'Throwbacks',
  'Other',
];

export function ModeratorMixes() {
  const [loading, setLoading] = useState(true);
  const showSkeleton = useDelayedLoading(loading);
  const [mixes, setMixes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('ALL');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [editingMix, setEditingMix] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [secondaryGenresInput, setSecondaryGenresInput] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editCurated, setEditCurated] = useState(false);
  const [moderatorNotes, setModeratorNotes] = useState('');

  // Flag/Report Modal
  const [actionMix, setActionMix] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'FLAG' | 'REPORT' | null>(null);
  const [actionReason, setActionReason] = useState('');

  useEffect(() => {
    fetchMixes();
  }, [search, genreFilter, flaggedOnly, hiddenOnly, page, limit]);

  const fetchMixes = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (search) params.search = search;
      if (genreFilter !== 'ALL') params.genre = genreFilter;
      if (flaggedOnly) params.flagged = 'true';
      if (hiddenOnly) params.hidden = 'true';

      const res = await api.get('/moderator/mixes', { params });
      if (res.data.success) {
        setMixes(res.data.data || []);
        if (res.data.meta) {
          setTotal(res.data.meta.total || 0);
          setTotalPages(res.data.meta.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Failed to fetch moderator mixes', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (mix: any) => {
    setEditingMix(mix);
    setEditTitle(mix.title || '');
    setEditDescription(mix.description || '');
    setEditGenre(mix.genre || 'OTHER');
    setSecondaryGenresInput((mix.secondaryGenres || []).join(', '));
    setEditIsPublic(mix.isPublic !== false);
    setEditCurated(Boolean(mix.moderatorCurated));
    setModeratorNotes(mix.moderatorNotes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingMix) return;
    try {
      setSaving(true);
      const secondaryGenres = secondaryGenresInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await api.put(`/moderator/mixes/${editingMix.id}`, {
        title: editTitle,
        description: editDescription,
        genre: editGenre,
        secondaryGenres,
        isPublic: editIsPublic,
        moderatorCurated: editCurated,
        moderatorNotes,
      });

      if (res.data.success) {
        setEditingMix(null);
        fetchMixes();
      }
    } catch (err) {
      console.error('Failed to save mix edit', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUnpublish = async (mix: any) => {
    try {
      const newStatus = !mix.isPublic;
      const res = await api.put(`/moderator/mixes/${mix.id}`, {
        isPublic: newStatus,
        reason: newStatus ? 'Republished by moderator' : 'Unpublished by moderator for review',
      });
      if (res.data.success) {
        fetchMixes();
      }
    } catch (err) {
      console.error('Failed to toggle mix status', err);
    }
  };

  const handleToggleFeature = async (mix: { id: string; featured?: boolean }) => {
    try {
      const newFeatured = !mix.featured;
      const res = await api.put(`/admin/mixes/${mix.id}/feature`, { featured: newFeatured });
      if (res.data.success) {
        toast.success(newFeatured ? 'Mix featured' : 'Mix unfeatured');
        fetchMixes();
      }
    } catch (err) {
      console.error('Failed to toggle mix feature status', err);
      toast.error('Failed to update feature status');
    }
  };

  const handleActionSubmit = async () => {
    if (!actionMix || !actionType) return;
    try {
      setSaving(true);
      if (actionType === 'FLAG') {
        await api.post(`/moderator/mixes/${actionMix.id}/flag`, { reason: actionReason });
      } else if (actionType === 'REPORT') {
        await api.post('/reports', {
          mixId: actionMix.id,
          reason: 'copyright_infringement',
          details: actionReason || 'Copyright/Duplicate report filed by Moderator',
        });
      }
      setActionMix(null);
      setActionType(null);
      setActionReason('');
      fetchMixes();
    } catch (err) {
      console.error('Action failed', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-black-elevated p-4 rounded-xl border border-dark-gray">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-gold" />
            Mix Management & Genre Curation
          </h2>
          <p className="text-xs text-text-secondary">
            Review DJ uploads, correct assigned genres, edit metadata, and hide/unpublish rule-violating mixes.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search title, DJ, desc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-black-surface border-dark-gray text-xs h-9 text-white placeholder:text-text-muted"
            />
          </div>

          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="bg-black-surface border border-dark-gray text-xs text-white rounded-md px-3 h-9 focus:outline-none focus:border-gold"
          >
            <option value="ALL">All Genres</option>
            {SYSTEM_GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant={flaggedOnly ? 'default' : 'outline'}
            onClick={() => setFlaggedOnly(!flaggedOnly)}
            className={`h-9 text-xs gap-1 border-dark-gray ${
              flaggedOnly ? 'bg-amber-500 text-black hover:bg-amber-600' : 'text-text-secondary hover:text-white'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            Flagged
          </Button>

          <Button
            size="sm"
            variant={hiddenOnly ? 'default' : 'outline'}
            onClick={() => setHiddenOnly(!hiddenOnly)}
            className={`h-9 text-xs gap-1 border-dark-gray ${
              hiddenOnly ? 'bg-red-500 text-white hover:bg-red-600' : 'text-text-secondary hover:text-white'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            Hidden
          </Button>
        </div>
      </div>

      {/* Mix List Table / Cards */}
      {loading ? (
        showSkeleton ? <ListSkeleton /> : null
      ) : mixes.length === 0 ? (
        <Card className="bg-black-elevated border-dark-gray p-12 text-center">
          <Music className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">No mixes found</p>
          <p className="text-xs text-text-muted mt-1">Try resetting your search filters.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {mixes.map((mix) => (
            <Card
              key={mix.id}
              className={`bg-black-elevated border-dark-gray p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition ${
                !mix.isPublic ? 'opacity-60 border-red/30 bg-red-950/10' : ''
              }`}
            >
              {/* Left Info */}
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <img
                  src={getMediaUrl(mix.coverImage) || '/placeholder-mix.jpg'}
                  alt={mix.title}
                  className="w-14 h-14 rounded-lg object-cover border border-dark-gray shrink-0"
                />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate max-w-[220px] sm:max-w-[320px]">
                      {mix.title}
                    </h3>
                    <Badge variant="outline" className="text-[10px] bg-gold/10 text-gold border-gold/30">
                      {mix.genre}
                    </Badge>
                    {mix.moderatorCurated && (
                      <Badge className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40 gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Moderator Curated
                      </Badge>
                    )}
                    {mix.featured && (
                      <Badge className="text-[10px] bg-gold/20 text-gold border-gold/40 gap-1">
                        <Star className="w-3 h-3" />
                        Featured
                      </Badge>
                    )}
                    {!mix.isPublic && (
                      <Badge variant="destructive" className="text-[10px]">
                        Hidden / Unpublished
                      </Badge>
                    )}
                    {mix.flaggedForReview && (
                      <Badge className="text-[10px] bg-red-500/20 text-red-300 border-red-500/40 gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Flagged
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-text-secondary truncate">
                    by <span className="text-white font-medium">{mix.dj?.stageName}</span> • Uploaded{' '}
                    {formatDate(mix.createdAt)}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-text-muted">
                    <span>▶ {mix.plays || 0} plays</span>
                    <span>❤️ {mix.likes || 0} likes</span>
                    {mix.secondaryGenres?.length > 0 && (
                      <span>Tags: {mix.secondaryGenres.join(', ')}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-dark-gray">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(mix)}
                  className="h-8 text-xs border-dark-gray text-white hover:border-gold hover:text-gold"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Edit & Genre
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleUnpublish(mix)}
                  className={`h-8 text-xs border-dark-gray ${
                    mix.isPublic
                      ? 'text-amber-400 hover:bg-amber-500/10'
                      : 'text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {mix.isPublic ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 mr-1" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 mr-1" /> Publish
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleFeature(mix)}
                  className={`h-8 text-xs border-dark-gray ${
                    mix.featured
                      ? 'text-gold hover:bg-gold/10'
                      : 'text-text-secondary hover:text-gold hover:bg-gold/10'
                  }`}
                  title={mix.featured ? 'Unfeature Mix' : 'Feature Mix'}
                >
                  <Star className={cn('w-3.5 h-3.5 mr-1', mix.featured && 'fill-gold')} />
                  {mix.featured ? 'Featured' : 'Feature'}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setActionMix(mix);
                    setActionType('FLAG');
                  }}
                  className="h-8 text-xs text-red-400 hover:bg-red-500/10"
                >
                  <Flag className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-black-elevated border border-dark-gray p-3 rounded-xl text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong>{(page - 1) * limit + 1}</strong> - <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> mixes
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-black-surface border border-dark-gray rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-gold"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
                <option value={1000}>All (1000)</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 text-xs border-dark-gray text-white"
              >
                Previous
              </Button>
              <span className="px-2 font-medium text-white">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 text-xs border-dark-gray text-white"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mix Modal */}
      <Dialog open={Boolean(editingMix)} onOpenChange={() => setEditingMix(null)}>
        <DialogContent className="bg-black-elevated border-dark-gray text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold text-base font-bold">
              <Edit2 className="w-5 h-5" />
              Edit Mix & Reassign Genre
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Update mix metadata, reassign to correct genre, toggle visibility or mark as Moderator Curated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-black-surface border-dark-gray text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Primary Genre</label>
                <select
                  value={editGenre}
                  onChange={(e) => setEditGenre(e.target.value)}
                  className="w-full bg-black-surface border border-dark-gray text-xs text-white rounded-md px-3 h-9 focus:outline-none focus:border-gold"
                >
                  {SYSTEM_GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Secondary Genres (comma separated)
                </label>
                <Input
                  value={secondaryGenresInput}
                  onChange={(e) => setSecondaryGenresInput(e.target.value)}
                  placeholder="e.g. R&B, Slow Jams"
                  className="bg-black-surface border-dark-gray text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full bg-black-surface border border-dark-gray rounded-md p-2.5 text-xs text-white focus:outline-none focus:border-gold"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-black-surface rounded-lg border border-dark-gray">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                  className="rounded accent-gold w-4 h-4"
                />
                <span>Published / Visible publicly</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-300 font-medium">
                <input
                  type="checkbox"
                  checked={editCurated}
                  onChange={(e) => setEditCurated(e.target.checked)}
                  className="rounded accent-amber-500 w-4 h-4"
                />
                <span>⭐ Mark as Moderator Curated</span>
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Moderator Internal Notes / Audit Reason
              </label>
              <Input
                value={moderatorNotes}
                onChange={(e) => setModeratorNotes(e.target.value)}
                placeholder="Reason for genre change or unpublishing..."
                className="bg-black-surface border-dark-gray text-xs text-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditingMix(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={saving}
              className="bg-gold text-black hover:bg-gold-light text-xs font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Modal */}
      <Dialog open={Boolean(actionMix)} onOpenChange={() => setActionMix(null)}>
        <DialogContent className="bg-black-elevated border-dark-gray text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400 text-base font-bold">
              <AlertTriangle className="w-5 h-5" />
              Flag Mix for Admin Review
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Provide details for escalating this mix to Super Admin.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <p className="text-xs font-medium text-white">Target: {actionMix?.title}</p>
            <textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Describe copyright, duplicate, or policy concerns..."
              rows={3}
              className="w-full bg-black-surface border border-dark-gray rounded-md p-2.5 text-xs text-white focus:outline-none focus:border-red-400"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setActionMix(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleActionSubmit}
              disabled={saving}
              className="bg-red-500 text-white hover:bg-red-600 text-xs font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Flag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ModeratorMixes;
