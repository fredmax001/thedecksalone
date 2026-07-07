import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Heart,
  Share2,
  ListMusic,
  X,
} from 'lucide-react';
import api from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface MixTrack {
  id: string;
  title: string;
  dj: string;
  duration: number; // seconds
  cover: string;
  genre: string;
  plays?: number;
  audioUrl?: string;
  audioSource?: string;
  originalUrl?: string;
}

function isEmbedSource(source?: string): boolean {
  return ['audiomack', 'youtube', 'soundcloud', 'mixcloud'].includes(source || '');
}

interface MixPlayerProps {
  track: MixTrack | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Waveform Bars — isolated + memo'd for perf                       */
/* ------------------------------------------------------------------ */
const WaveformBars = memo(function WaveformBars({
  isPlaying,
  progress,
  onSeek,
}: {
  isPlaying: boolean;
  progress: number;
  onSeek: (pct: number) => void;
}) {
  const barCount = 40;
  const barWidth = 2;
  const gap = 1;
  const totalWidth = barCount * (barWidth + gap);

  // Generate stable random heights
  const heightsRef = useRef<number[]>([]);
  if (heightsRef.current.length === 0) {
    heightsRef.current = Array.from({ length: barCount }, () =>
      Math.floor(Math.random() * 28 + 4)
    );
  }

  const [pulsed, setPulsed] = useState<number[]>(heightsRef.current);

  // Subtle pulse animation when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPulsed(
        heightsRef.current.map((h) => {
          const variation = (Math.random() - 0.5) * 6;
          return Math.max(4, Math.min(32, h + variation));
        })
      );
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      onSeek(pct);
    },
    [onSeek]
  );

  return (
    <div
      className="flex items-end h-[40px] cursor-pointer select-none"
      style={{ width: totalWidth, gap: `${gap}px` }}
      onClick={handleClick}
      role="slider"
      aria-label="Seek"
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={0}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const barProgress = i / barCount;
        const isPlayed = barProgress < progress;
        const height = isPlaying ? pulsed[i] : heightsRef.current[i];
        return (
          <div
            key={i}
            className="rounded-full transition-colors duration-100"
            style={{
              width: `${barWidth}px`,
              height: `${height}px`,
              backgroundColor: isPlayed ? '#D4A24A' : '#1E1E1E',
            }}
          />
        );
      })}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Full Waveform (for expanded player)                               */
/* ------------------------------------------------------------------ */
const FullWaveform = memo(function FullWaveform({
  isPlaying,
  progress,
  onSeek,
}: {
  isPlaying: boolean;
  progress: number;
  onSeek: (pct: number) => void;
}) {
  const barCount = 60;
  const heightsRef = useRef<number[]>([]);
  if (heightsRef.current.length === 0) {
    heightsRef.current = Array.from({ length: barCount }, () =>
      Math.floor(Math.random() * 60 + 8)
    );
  }

  const [pulsed, setPulsed] = useState<number[]>(heightsRef.current);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPulsed(
        heightsRef.current.map((h) => {
          const variation = (Math.random() - 0.5) * 10;
          return Math.max(8, Math.min(68, h + variation));
        })
      );
    }, 120);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      onSeek(pct);
    },
    [onSeek]
  );

  return (
    <div
      className="flex items-end h-[80px] w-full cursor-pointer select-none gap-[2px]"
      onClick={handleClick}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const barProgress = i / barCount;
        const isPlayed = barProgress < progress;
        const height = isPlaying ? pulsed[i] : heightsRef.current[i];
        return (
          <div
            key={i}
            className="flex-1 rounded-full transition-colors duration-100"
            style={{
              height: `${height}px`,
              backgroundColor: isPlayed ? '#D4A24A' : '#1E1E1E',
            }}
          />
        );
      })}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Format time helper                                                 */
/* ------------------------------------------------------------------ */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function MixPlayer({ track, onClose, onNext, onPrev }: MixPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [currentTime, setCurrentTime] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTrackedRef = useRef(false);

  const embed = isEmbedSource(track?.audioSource);

  // Reset when track changes
  useEffect(() => {
    setProgress(0);
    setCurrentTime(0);
    setIsPlaying(!embed);
    setLiked(false);
    playTrackedRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [track?.id, embed]);

  // Initialize audio element when audioUrl is available
  useEffect(() => {
    if (!track?.audioUrl || embed) return;
    const audio = new Audio(track.audioUrl);
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (track.duration && track.duration > 0) {
        setProgress(audio.currentTime / track.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
    };
  }, [track?.id, track?.audioUrl]);

  // Play / pause control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || embed) return;
    if (isPlaying) {
      audio.play().catch((err) => {
        console.error('Audio playback failed:', err);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, embed]);

  // Track play count once per track via API (selection counts as a play)
  useEffect(() => {
    if (track && !playTrackedRef.current) {
      playTrackedRef.current = true;
      api.post(`/mixes/${track.id}/play`).catch(() => {});
    }
  }, [track?.id]);

  // Volume control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || embed) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted, embed]);

  // Fallback timer when no real audio URL
  useEffect(() => {
    if (track?.audioUrl) return;
    if (isPlaying && track) {
      const interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1;
          if (next >= track.duration) {
            setIsPlaying(false);
            return track.duration;
          }
          setProgress(next / track.duration);
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, track]);

  const handleSeek = useCallback(
    (pct: number) => {
      if (!track || embed) return;
      const newTime = pct * track.duration;
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
      setCurrentTime(newTime);
      setProgress(pct);
    },
    [track, embed]
  );

  const togglePlay = useCallback(() => {
    if (embed) {
      setIsExpanded(true);
      return;
    }
    setIsPlaying((p) => !p);
  }, [embed]);
  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);
  const toggleLike = useCallback(() => setLiked((l) => !l), []);

  if (!track) return null;

  return (
    <>
      {/* Expanded overlay backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[55]"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-[60] border-t border-white/5"
          style={{
            background: 'rgba(17,17,17,0.95)',
            backdropFilter: 'blur(16px)',
            height: isExpanded ? '420px' : '80px',
          }}
        >
          {/* ─── Compact Mode ─── */}
          {!isExpanded && (
            <div className="flex items-center h-full px-4 lg:px-6 max-w-container mx-auto">
              {/* Left: Track Info */}
              <div className="flex items-center gap-3 w-[30%] min-w-0">
                <motion.img
                  src={track.cover}
                  alt={track.title}
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={
                    isPlaying
                      ? { duration: 20, repeat: Infinity, ease: 'linear' }
                      : { duration: 0 }
                  }
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {track.title}
                  </p>
                  <p className="text-xs text-gold truncate">{track.dj}</p>
                </div>
                <button
                  onClick={toggleLike}
                  className="ml-2 p-1.5 rounded-full hover:bg-white/5 transition-colors flex-shrink-0"
                >
                  <Heart
                    size={16}
                    className={liked ? 'text-red fill-red' : 'text-text-muted'}
                  />
                </button>
              </div>

              {/* Center: Controls + Waveform (or embed iframe) */}
              <div className="flex flex-col items-center flex-1 px-4 min-w-0">
                {embed ? (
                  <iframe
                    src={track.audioUrl}
                    title={`${track.title} player`}
                    width="100%"
                    height="80"
                    scrolling="no"
                    frameBorder="0"
                    allow="autoplay"
                    className="rounded-md"
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-4 mb-1">
                      <button
                        onClick={onPrev}
                        className="p-1 text-text-muted hover:text-text-primary transition-colors"
                      >
                        <SkipBack size={18} />
                      </button>
                      <button
                        onClick={togglePlay}
                        className="w-9 h-9 rounded-full bg-gold-gradient flex items-center justify-center hover:scale-105 transition-transform"
                      >
                        {isPlaying ? (
                          <Pause size={16} className="text-black" />
                        ) : (
                          <Play size={16} className="text-black ml-0.5" />
                        )}
                      </button>
                      <button
                        onClick={onNext}
                        className="p-1 text-text-muted hover:text-text-primary transition-colors"
                      >
                        <SkipForward size={18} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 w-full max-w-md">
                      <span className="text-[10px] font-mono text-text-muted w-10 text-right">
                        {formatTime(currentTime)}
                      </span>
                      <div className="flex-1">
                        <WaveformBars
                          isPlaying={isPlaying}
                          progress={progress}
                          onSeek={handleSeek}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-text-muted w-10">
                        {formatTime(track.duration)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Right: Volume + Expand */}
              <div className="flex items-center gap-2 w-[25%] justify-end">
                <button
                  onClick={toggleMute}
                  className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={16} />
                  ) : (
                    <Volume2 size={16} />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-20 h-1 accent-gold cursor-pointer"
                />
                <button className="p-1.5 text-text-muted hover:text-text-primary transition-colors">
                  <ListMusic size={16} />
                </button>
                <button
                  onClick={() => setIsExpanded(true)}
                  className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-text-muted hover:text-text-primary transition-colors ml-1"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ─── Expanded Mode ─── */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center px-6 relative"
              >
                {/* Close button */}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary transition-colors"
                >
                  <ChevronDown size={24} />
                </button>

                {/* Artwork */}
                <motion.img
                  src={track.cover}
                  alt={track.title}
                  className="w-32 h-32 rounded-xl object-cover mb-4"
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={
                    isPlaying
                      ? { duration: 20, repeat: Infinity, ease: 'linear' }
                      : { duration: 0 }
                  }
                />

                {/* Track Info */}
                <h3 className="font-display text-2xl font-semibold text-text-primary uppercase tracking-tight">
                  {track.title}
                </h3>
                <p className="text-gold text-sm mt-1">{track.dj}</p>
                <p className="text-text-muted text-xs mt-1">{track.genre}</p>

                {embed ? (
                  <iframe
                    src={track.audioUrl}
                    title={`${track.title} player`}
                    width="100%"
                    height="250"
                    scrolling="no"
                    frameBorder="0"
                    allow="autoplay"
                    className="w-full max-w-lg mt-6 rounded-xl"
                  />
                ) : (
                  <>
                    {/* Full Waveform */}
                    <div className="w-full max-w-lg mt-6">
                      <FullWaveform
                        isPlaying={isPlaying}
                        progress={progress}
                        onSeek={handleSeek}
                      />
                    </div>

                    {/* Time display */}
                    <div className="flex justify-between w-full max-w-lg mt-2">
                      <span className="text-xs font-mono text-text-muted">
                        {formatTime(currentTime)}
                      </span>
                      <span className="text-xs font-mono text-text-muted">
                        {formatTime(track.duration)}
                      </span>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-6 mt-4">
                      <button
                        onClick={onPrev}
                        className="p-2 text-text-muted hover:text-text-primary transition-colors"
                      >
                        <SkipBack size={24} />
                      </button>
                      <button
                        onClick={togglePlay}
                        className="w-14 h-14 rounded-full bg-gold-gradient flex items-center justify-center hover:scale-105 transition-transform"
                      >
                        {isPlaying ? (
                          <Pause size={24} className="text-black" />
                        ) : (
                          <Play size={24} className="text-black ml-1" />
                        )}
                      </button>
                      <button
                        onClick={onNext}
                        className="p-2 text-text-muted hover:text-text-primary transition-colors"
                      >
                        <SkipForward size={24} />
                      </button>
                    </div>
                  </>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-4 mt-4">
                  <button
                    onClick={toggleLike}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-text-secondary hover:border-gold hover:text-gold transition-colors"
                  >
                    <Heart size={16} className={liked ? 'fill-red text-red' : ''} />
                    <span className="text-xs">{liked ? 'Liked' : 'Like'}</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (!track) return;
                      const url = `${window.location.origin}/mixes`;
                      try {
                        if (navigator.share) {
                          await navigator.share({
                            title: `${track.title} by ${track.dj}`,
                            url,
                          });
                        } else {
                          await navigator.clipboard.writeText(url);
                          alert('Link copied to clipboard!');
                        }
                      } catch {
                        // User cancelled share
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-text-secondary hover:border-gold hover:text-gold transition-colors"
                  >
                    <Share2 size={16} />
                    <span className="text-xs">Share</span>
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-text-secondary hover:border-gold hover:text-gold transition-colors">
                    <ListMusic size={16} />
                    <span className="text-xs">Queue</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
