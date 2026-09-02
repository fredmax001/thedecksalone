import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Crown,
  UserPlus,
  LogIn,
  CheckCircle2,
  X,
  Sparkles,
  Headphones,
  ShieldCheck,
  Repeat,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { getApiErrorMessage } from '@/lib/apiErrors';

interface MixDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'auth' | 'subscribe' | 'repost' | 'follow';
  mix?: {
    id: string;
    title: string;
    djName?: string;
    dj?: {
      id?: string;
      stageName?: string;
      avatar?: string;
    } | null;
  } | null;
  onOpenDjSupport?: (dj: any) => void;
  onOpenDjSubscribe?: (dj: any) => void;
  onActionComplete?: () => void;
}

export function MixDownloadModal({
  isOpen,
  onClose,
  mode,
  mix,
  onOpenDjSupport,
  onOpenDjSubscribe,
  onActionComplete,
}: MixDownloadModalProps) {
  const navigate = useNavigate();
  const { isDj } = useUserRole();

  if (!isOpen) return null;

  const djName = mix?.dj?.stageName || mix?.djName || 'DJ';

  const handleRepost = async () => {
    if (!mix?.id) return;
    try {
      await api.post(`/mixes/${mix.id}/repost`);
      toast.success('Mix reposted! Retrying download...');
      onActionComplete?.();
      onClose();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to repost mix'));
    }
  };

  const handleFollow = async () => {
    if (!mix?.dj?.id) return;
    try {
      await api.post(`/djs/${mix.dj.id}/follow`);
      toast.success(`You are now following ${djName}! Retrying download...`);
      onActionComplete?.();
      onClose();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to follow DJ'));
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-[#111111] border border-gold/30 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-gold/10 overflow-hidden text-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background Ambient Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-gold/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {mode === 'auth' ? (
            /* MODE: AUTH REQUIRED */
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4 text-gold shadow-lg shadow-gold/10">
                <UserPlus size={28} />
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight uppercase">
                Create Account to Download
              </h2>

              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                Join Deck Salone to download <span className="text-white font-medium">"{mix?.title || 'this mix'}"</span> in crystal-clear 320kbps MP3 for offline listening.
              </p>

              {/* Feature Highlights */}
              <div className="mt-5 space-y-2.5 text-left bg-black-surface/70 border border-dark-gray/60 rounded-xl p-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5 text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                  <span>Direct 320kbps MP3 downloads for mobile & desktop</span>
                </div>
                <div className="flex items-center gap-2.5 text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                  <span>Unlimited streaming of top African & Salone mixes</span>
                </div>
                <div className="flex items-center gap-2.5 text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                  <span>Follow favourite DJs & get notified on new sets</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-2.5">
                <Button
                  className="w-full bg-gold-gradient text-black font-semibold h-11 uppercase tracking-wider text-xs shadow-lg hover:opacity-90 transition-opacity"
                  onClick={() => {
                    onClose();
                    navigate('/register');
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Free Account
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-dark-gray text-text-secondary hover:text-white hover:bg-white/5 h-10 text-xs"
                  onClick={() => {
                    onClose();
                    navigate('/login');
                  }}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Already have an account? Sign In
                </Button>
              </div>
            </div>
          ) : mode === 'repost' ? (
            /* MODE: REPOST TO DOWNLOAD */
            <div>
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto mb-4 text-purple-400 shadow-lg shadow-purple-500/10">
                <Repeat size={28} />
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight uppercase">
                Repost to Download
              </h2>

              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                Download <span className="text-white font-medium">"{mix?.title || 'this mix'}"</span> is unlocked when you repost it to your profile.
              </p>

              <div className="mt-6 space-y-2.5">
                <Button
                  className="w-full bg-purple-500 hover:bg-purple-400 text-white font-semibold h-11 uppercase tracking-wider text-xs shadow-lg transition-opacity"
                  onClick={handleRepost}
                >
                  <Repeat className="w-4 h-4 mr-2" />
                  Repost & Download
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-dark-gray text-text-secondary hover:text-white hover:bg-white/5 h-10 text-xs"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : mode === 'follow' ? (
            /* MODE: FOLLOW TO DOWNLOAD */
            <div>
              <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center mx-auto mb-4 text-pink-400 shadow-lg shadow-pink-500/10">
                <UserPlus size={28} />
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight uppercase">
                Follow to Download
              </h2>

              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                Download <span className="text-white font-medium">"{mix?.title || 'this mix'}"</span> is unlocked when you follow {djName}.
              </p>

              <div className="mt-6 space-y-2.5">
                <Button
                  className="w-full bg-pink-500 hover:bg-pink-400 text-white font-semibold h-11 uppercase tracking-wider text-xs shadow-lg transition-opacity"
                  onClick={handleFollow}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Follow {djName} & Download
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-dark-gray text-text-secondary hover:text-white hover:bg-white/5 h-10 text-xs"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* MODE: SUBSCRIBE REQUIRED */
            <div>
              <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-4 text-gold shadow-lg shadow-gold/10">
                <Crown size={28} />
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight uppercase">
                Subscribe to Download
              </h2>

              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                Direct MP3 downloads are free for fans. DJs need a <strong className="text-gold">Pro or Pro+</strong> subscription to download mixes.
              </p>

              {/* Subscription Options Box */}
              <div className="mt-5 space-y-3 text-left">
                {/* Option 1: Pro Subscription */}
                <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 relative overflow-hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-gold font-semibold text-sm">
                        <Sparkles className="w-4 h-4" />
                        <span>Deck Salone Pro & Pro+</span>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Unlimited downloads across all mixes, ad-free listening, upload privileges & VIP perks.
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full mt-3 bg-gold-gradient text-black font-semibold uppercase text-xs h-9"
                    onClick={() => {
                      onClose();
                      if (isDj) {
                        navigate('/dashboard/subscription');
                      } else {
                        navigate('/pricing');
                      }
                    }}
                  >
                    <Crown className="w-3.5 h-3.5 mr-1.5" />
                    {isDj ? 'Upgrade DJ to Pro / Pro+' : 'Fans Download Free'}
                  </Button>
                </div>

                {/* Option 2: Support the DJ */}
                {mix?.dj && (onOpenDjSupport || onOpenDjSubscribe) && (
                  <div className="rounded-xl border border-dark-gray bg-black-surface p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                          <Headphones className="w-4 h-4 text-emerald-400" />
                          <span>Support {djName}</span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          Send a one-time support payment of any amount to {djName}.
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs h-9"
                      onClick={() => {
                        onClose();
                        (onOpenDjSupport || onOpenDjSubscribe)?.(mix.dj);
                      }}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Support {djName}
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-dark-gray/50 flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-gold" />
                <span>Instant activation • Cancel anytime</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default MixDownloadModal;
