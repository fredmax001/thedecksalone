import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Zap,
  X,
  Crown,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface ReachListenersModalProps {
  isOpen: boolean;
  onClose: () => void;
  mix: {
    id: string;
    title: string;
    cover: string;
    dj: string;
    djTier?: string;
  };
  onPromoted?: (promotedUntil: string, remainingPoints: number) => void;
}

export function ReachListenersModal({
  isOpen,
  onClose,
  mix,
  onPromoted,
}: ReachListenersModalProps) {
  const { user } = useAuthStore();
  const [selectedDuration, setSelectedDuration] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [fetchingPoints, setFetchingPoints] = useState(false);
  const [pointsData, setPointsData] = useState<{
    promotionPoints: number;
    subscriptionTier: string;
    isEligible: boolean;
  } | null>(null);

  const isDj = user?.role === 'DJ' || (user as any)?.djProfile;
  const userTier = ((user as any)?.djProfile?.subscriptionTier || (user as any)?.subscriptionTier || 'free').toLowerCase();
  const isProEligible = userTier === 'pro' || userTier === 'legend';

  useEffect(() => {
    if (isOpen && isDj) {
      const fetchPoints = async () => {
        try {
          setFetchingPoints(true);
          const res = await api.get('/djs/me/promotion-points');
          if (res.data.success) {
            setPointsData(res.data.data);
          }
        } catch (err) {
          console.error('Failed to fetch promotion points', err);
        } finally {
          setFetchingPoints(false);
        }
      };
      fetchPoints();
    }
  }, [isOpen, isDj]);

  if (!isOpen) return null;

  const packages = [
    { days: 1, points: 100, label: '1 Day Boost', desc: 'Instant push into today’s trending feeds' },
    { days: 3, points: 250, label: '3 Days Spotlight', desc: 'Featured placement across genre categories', popular: true },
    { days: 7, points: 500, label: '7 Days Megaboost', desc: 'Maximum homepage prominence & 5x algorithm reach' },
  ];

  const selectedPkg = packages.find((p) => p.days === selectedDuration) || packages[1];
  const userPoints = pointsData?.promotionPoints ?? 1000;
  const hasEnoughPoints = userPoints >= selectedPkg.points;

  const handlePromote = async () => {
    try {
      setLoading(true);
      const res = await api.post(`/mixes/${mix.id}/promote`, {
        durationDays: selectedDuration,
      });

      if (res.data.success) {
        toast.success(`🚀 "${mix.title}" has been boosted!`, {
          description: `Promoted until ${new Date(res.data.data.promotedUntil).toLocaleDateString()}`,
        });
        if (onPromoted) {
          onPromoted(res.data.data.promotedUntil, res.data.data.remainingPoints);
        }
        onClose();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to promote mix.';
      toast.error('Promotion Failed', { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg rounded-3xl bg-[#111] border border-white/10 shadow-2xl overflow-hidden p-6 text-text-primary"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-56 h-56 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-[#f4e059]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-text-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-lg shadow-red-600/30">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                PRO & PRO+ FEATURE
              </span>
              <h3 className="font-display text-xl font-bold uppercase tracking-tight text-white mt-1">
                Reach More Listeners!
              </h3>
            </div>
          </div>

          {/* Mix Target Preview */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-5">
            <img
              src={mix.cover}
              alt={mix.title}
              className="w-14 h-14 rounded-xl object-cover shrink-0 bg-black"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white uppercase truncate">{mix.title}</h4>
              <p className="text-xs text-text-secondary truncate mt-0.5">{mix.dj}</p>
            </div>
          </div>

          {/* If NOT a Pro or Legend DJ: Upgrade requirement */}
          {!isProEligible ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/40 via-[#181210] to-[#121212] border border-red-500/30 space-y-3">
                <div className="flex items-start gap-3">
                  <Crown className="w-6 h-6 text-[#f4e059] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase">Upgrade to Pro or Pro+ (Legend)</h4>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      Promotion points and algorithm mix boosts are exclusively available for verified **Pro** and **PRO+** DJs.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-[#f4e059]">Pro Plan</span>
                    <p className="text-white font-bold font-mono mt-0.5">1,000 Points/mo</p>
                    <p className="text-[10px] text-text-muted">Boost up to 10 mixes</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-red-400">Pro+ Legend</span>
                    <p className="text-white font-bold font-mono mt-0.5">10,000 Points/yr</p>
                    <p className="text-[10px] text-text-muted">Maximum reach + VIP</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  to="/dashboard/subscription"
                  className="flex-1 py-3 px-4 rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-[#f4e059] text-black font-extrabold text-xs uppercase tracking-wider text-center hover:brightness-110 shadow-lg shadow-red-600/20 transition-all"
                >
                  Upgrade to Pro Now →
                </Link>
                <button
                  onClick={onClose}
                  className="px-5 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Pro / Legend DJ Flow: Points Spending */
            <div className="space-y-5">
              {/* Point Balance Header */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f4e059]/10 border border-[#f4e059]/30">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#f4e059]" />
                  <span className="text-xs font-bold uppercase text-[#f4e059]">Your Promotion Points:</span>
                </div>
                <span className="font-mono text-base font-black text-white">
                  {fetchingPoints ? <Loader2 className="w-4 h-4 animate-spin text-[#f4e059]" /> : `${userPoints.toLocaleString()} PTS`}
                </span>
              </div>

              {/* Package Selection */}
              <div className="space-y-2.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-text-muted block">
                  Select Boost Duration:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.days}
                      onClick={() => setSelectedDuration(pkg.days)}
                      className={`relative p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                        selectedDuration === pkg.days
                          ? 'bg-red-600/15 border-red-500 shadow-md shadow-red-600/20'
                          : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                      }`}
                    >
                      {pkg.popular && (
                        <span className="absolute -top-2 right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded shadow">
                          POPULAR
                        </span>
                      )}
                      <div>
                        <div className="text-xs font-bold text-white">{pkg.label}</div>
                        <div className="text-[10px] text-text-muted mt-1 leading-snug">{pkg.desc}</div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-white/[0.06] font-mono text-xs font-black text-[#f4e059]">
                        {pkg.points} PTS
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary & Guarantee */}
              <div className="text-[11px] text-text-muted flex items-center gap-2 px-1">
                <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                <span>Your mix will be promoted across all genre charts and trending carousels.</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  disabled={!hasEnoughPoints || loading || fetchingPoints}
                  onClick={handlePromote}
                  className="flex-1 py-3 px-4 rounded-full bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Promoting...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" /> Boost Mix for {selectedPkg.points} PTS
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white uppercase"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default ReachListenersModal;
