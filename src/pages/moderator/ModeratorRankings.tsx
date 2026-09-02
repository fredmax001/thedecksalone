import { useEffect, useState } from 'react';
import {
  Trophy,
  Award,
  Sparkles,
  Loader2,
  Edit3,
  Search,
  Users,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { getAvatarImageUrl } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export function ModeratorRankings() {
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [djs, setDjs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Adjustment Modal
  const [adjustDj, setAdjustDj] = useState<any | null>(null);
  const [newPosition, setNewPosition] = useState<number | ''>('');
  const [newScore, setNewScore] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRankings(true);
  }, []);

  const fetchRankings = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get('/moderator/rankings');
      if (res.data.success) {
        setDjs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch rankings', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      const res = await api.post('/moderator/rankings/recalculate');
      if (res.data.success) {
        setDjs(res.data.data);
        toast.success(res.data.message || 'Rankings recalculated and synced! 🏆');
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to recalculate rankings'));
      console.error('Failed to recalculate rankings', err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleOpenAdjust = (dj: any) => {
    setAdjustDj(dj);
    setNewPosition(dj.rankingPosition || '');
    setNewScore(dj.rankingScore || '');
    setReason('');
  };

  const handleSaveAdjustment = async () => {
    if (!adjustDj || !reason.trim()) return;
    try {
      setSaving(true);
      await api.post('/moderator/rankings/adjust', {
        djId: adjustDj.id,
        newPosition,
        newScore,
        reason: reason.trim(),
      });
      setAdjustDj(null);
      fetchRankings(false);
      toast.success(`Rank adjusted for ${adjustDj.stageName}`);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to adjust ranking'));
      console.error('Failed to adjust ranking', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeature = async (dj: any, type: 'MODERATOR_FEATURE' | 'RISING_DJ') => {
    const isRising = type === 'RISING_DJ';
    const nextState = isRising ? !dj.isRisingDj : !dj.isModeratorFeatured;
    const key = isRising ? 'isRisingDj' : 'isModeratorFeatured';
    const actionKey = `${dj.id}-${type}`;

    // Optimistic update
    setDjs((prev) =>
      prev.map((item) => (item.id === dj.id ? { ...item, [key]: nextState } : item))
    );
    setTogglingId(actionKey);

    try {
      const payload = isRising ? { isRisingDj: nextState } : { isModeratorFeatured: nextState };
      const res = await api.post(`/moderator/djs/${dj.id}/feature`, payload);
      if (res.data.success && res.data.data) {
        setDjs((prev) =>
          prev.map((item) => (item.id === dj.id ? { ...item, ...res.data.data } : item))
        );
        if (isRising) {
          if (nextState) {
            toast.success(`🚀 Marked ${dj.stageName} as Rising DJ`);
          } else {
            toast.success(`Removed Rising DJ badge from ${dj.stageName}`);
          }
        } else {
          if (nextState) {
            toast.success(`⭐ Marked ${dj.stageName} as Moderator Choice`);
          } else {
            toast.success(`Removed Moderator Choice from ${dj.stageName}`);
          }
        }
      }
    } catch (err: any) {
      // Revert on error
      setDjs((prev) =>
        prev.map((item) => (item.id === dj.id ? { ...item, [key]: !nextState } : item))
      );
      toast.error(getApiErrorMessage(err, 'Failed to update DJ feature state'));
      console.error('Failed to update DJ feature state', err);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredDjs = djs.filter((dj) =>
    (dj.stageName || '').toLowerCase().includes(search.toLowerCase()) ||
    (dj.city || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black-elevated p-4 sm:p-5 rounded-xl border border-dark-gray">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold" />
            <h2 className="text-base font-bold text-white">DJ Ranking & Leaderboard Curation</h2>
            <Badge className="bg-gold/20 text-gold border-gold/40 text-[10px]">Audit Logged</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Review automatically calculated platform rankings, flag suspicious play spikes, feature top performers, and log adjustments.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <Button
            size="sm"
            variant="outline"
            disabled={recalculating || loading}
            onClick={handleRecalculate}
            className="h-9 text-xs border-gold/40 text-gold hover:bg-gold/10 font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Calculating...' : 'Recalculate Platform Ranks'}
          </Button>

          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search DJ stage name or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-black-surface border-dark-gray text-xs text-white h-9"
            />
          </div>
        </div>
      </div>

      {/* Rankings List Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : filteredDjs.length === 0 ? (
        <Card className="bg-black-elevated border-dark-gray p-12 text-center">
          <Users className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">No DJs found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDjs.map((dj, index) => (
            <Card
              key={dj.id}
              className="bg-black-elevated border-dark-gray p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="text-sm font-bold text-gold w-7 text-center shrink-0">
                  #{dj.rankingPosition || index + 1}
                </span>

                <img
                  src={getAvatarImageUrl(dj.avatar)}
                  alt={dj.stageName}
                  className="w-11 h-11 rounded-full object-cover border border-gold/30 shrink-0"
                />

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate">{dj.stageName}</h3>
                    <VerifiedBadge dj={dj} size={14} />
                    {dj.isModeratorFeatured && (
                      <Badge className="bg-gold/20 text-gold border-gold/40 text-[9px]">
                        ⭐ Moderator Choice
                      </Badge>
                    )}
                    {dj.isRisingDj && (
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[9px]">
                        🚀 Rising DJ
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-text-secondary truncate">
                    {dj.city || 'Sierra Leone'} • {dj.totalMixUploads || 0} Mixes • {dj.monthlyListeners || 0} Listeners
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-text-muted">
                    <span>Ranking Score: <strong className="text-gold">{Math.round(dj.rankingScore || 0)} pts</strong></span>
                    <span>Community: {Math.round(dj.communityScore || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-dark-gray">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={togglingId === `${dj.id}-MODERATOR_FEATURE`}
                  onClick={() => handleToggleFeature(dj, 'MODERATOR_FEATURE')}
                  className={`h-8 text-xs border-dark-gray transition-colors ${
                    dj.isModeratorFeatured
                      ? 'bg-gold/20 text-gold border-gold/40 hover:bg-gold/30'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  {togglingId === `${dj.id}-MODERATOR_FEATURE` ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                  )}
                  {dj.isModeratorFeatured ? 'Featured ⭐' : 'Feature DJ'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={togglingId === `${dj.id}-RISING_DJ`}
                  onClick={() => handleToggleFeature(dj, 'RISING_DJ')}
                  className={`h-8 text-xs border-dark-gray transition-colors ${
                    dj.isRisingDj
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  {togglingId === `${dj.id}-RISING_DJ` ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Award className="w-3.5 h-3.5 mr-1" />
                  )}
                  {dj.isRisingDj ? 'Rising DJ 🚀' : 'Set Rising'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAdjust(dj)}
                  className="h-8 text-xs border-gold/40 text-gold hover:bg-gold/10"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  Adjust Rank
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Adjust Ranking Modal */}
      <Dialog open={Boolean(adjustDj)} onOpenChange={() => setAdjustDj(null)}>
        <DialogContent className="bg-black-elevated border-dark-gray text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold text-base font-bold">
              <Trophy className="w-5 h-5" />
              Adjust Ranking for {adjustDj?.stageName}
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Manual rank adjustments require a mandatory reason and are recorded in the Super Admin Audit Trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  New Rank Position
                </label>
                <Input
                  type="number"
                  value={newPosition}
                  onChange={(e) => setNewPosition(Number(e.target.value))}
                  placeholder="e.g. 1"
                  className="bg-black-surface border-dark-gray text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  New Ranking Score
                </label>
                <Input
                  type="number"
                  value={newScore}
                  onChange={(e) => setNewScore(Number(e.target.value))}
                  placeholder="e.g. 95"
                  className="bg-black-surface border-dark-gray text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gold block mb-1">
                Mandatory Reason for Adjustment *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this DJ's rank is being adjusted (e.g. Curated festival headliner performance, cleared suspicious play count)..."
                rows={3}
                required
                className="w-full bg-black-surface border border-gold/40 rounded-md p-2.5 text-xs text-white focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAdjustDj(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAdjustment}
              disabled={saving || !reason.trim()}
              className="bg-gold text-black hover:bg-gold-light text-xs font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log & Save Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ModeratorRankings;
