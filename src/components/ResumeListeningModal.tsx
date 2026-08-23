import { useEffect, useState } from 'react';
import { X, Play, RotateCcw, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function ResumeListeningModal() {
  const lastSession = usePlayerStore((s) => s.lastSession);
  const play = usePlayerStore((s) => s.play);
  const clearSession = usePlayerStore((s) => s.clearSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Only prompt once per app session
    if (sessionStorage.getItem('resumePrompted') === 'true') return;
    if (!isAuthenticated || !user || !lastSession || !lastSession.track) return;

    // Only show if there is meaningful progress (between 5s and 96%)
    const progress = lastSession.duration > 0 ? lastSession.currentTime / lastSession.duration : 0;
    if (lastSession.currentTime < 5 || progress >= 0.96) return;

    sessionStorage.setItem('resumePrompted', 'true');
    setOpen(true);
  }, [isAuthenticated, user, lastSession]);

  const handleResume = () => {
    if (!lastSession?.track) return;
    play(lastSession.track, lastSession.currentTime);
    setOpen(false);
  };

  const handleStartOver = () => {
    if (!lastSession?.track) return;
    play(lastSession.track, 0);
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleClear = () => {
    clearSession();
    setOpen(false);
  };

  if (!open || !lastSession?.track) return null;

  const { track, currentTime, duration } = lastSession;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-[#1a1914] to-[#0d0d0c] border border-gold/30 rounded-3xl p-6 shadow-2xl shadow-gold/10"
          >
            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center">
              <Headphones className="w-8 h-8 text-gold" />
            </div>

            {/* Title */}
            <h2 className="font-display text-xl font-black uppercase text-center text-white tracking-tight mb-1">
              Continue Listening?
            </h2>
            <p className="text-xs text-text-secondary text-center mb-5">
              Pick up right where you left off.
            </p>

            {/* Mix Card */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-black-surface border border-white/[0.08] mb-5">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
                <img
                  src={track.cover || '/mix-placeholder.jpg'}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Play className="w-5 h-5 text-gold fill-gold" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gold text-[9px] font-black uppercase tracking-widest mb-0.5">
                  Resume Mix
                </p>
                <h4 className="font-display font-bold text-xs uppercase text-white truncate">
                  {track.title}
                </h4>
                <p className="text-[10px] text-text-muted truncate">
                  {track.dj} • {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-5">
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-1.5">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                onClick={handleResume}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gold text-black font-extrabold text-xs uppercase tracking-wider hover:brightness-110 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                Resume Where I Left Off
              </button>

              <button
                onClick={handleStartOver}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </button>
            </div>

            {/* Clear */}
            <button
              onClick={handleClear}
              className="w-full mt-3 text-[10px] text-text-muted hover:text-red-400 transition-colors"
            >
              Don&apos;t ask again for this mix
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
