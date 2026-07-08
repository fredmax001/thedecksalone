import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Share2,
  ListMusic,
  X,
  Maximize2,
  Minimize2,
  Repeat,
  Shuffle,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface MixTrack {
  id: string;
  title: string;
  dj: string;
  duration: number;
  cover: string;
  genre: string;
  plays?: number;
  audioUrl?: string;
  audioSource?: string;
  originalUrl?: string;
}

function isEmbedSource(source?: string, audioUrl?: string): boolean {
  // Resolved Hearthis tracks are direct MP3 streams, not embeds.
  const sourceLower = (source || '').toLowerCase();
  if (sourceLower === 'hearthis') return false;

  const knownEmbed = ['audiomack', 'youtube', 'soundcloud', 'mixcloud'];
  if (knownEmbed.includes(sourceLower)) return true;
  if (!audioUrl) return false;
  const url = audioUrl.toLowerCase();
  return (
    url.includes('audiomack.com') ||
    url.includes('soundcloud.com') ||
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('mixcloud.com')
  );
}

interface MixPlayerProps {
  track: MixTrack | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Modern Progress Bar with Waveform Preview                         */
/* ------------------------------------------------------------------ */
const ModernProgressBar = memo(function ModernProgressBar({
  progress,
  onSeek,
  currentTime,
  duration,
}: {
  progress: number;
  onSeek: (pct: number) => void;
  currentTime: number;
  duration: number;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [hoverPct, setHoverPct] = useState(0);

  // Generate waveform preview data (stable per instance)
  const waveRef = useRef<number[]>([]);
  if (waveRef.current.length === 0) {
    waveRef.current = Array.from({ length: 80 }, (_, i) => {
      const base = Math.sin(i * 0.4) * 0.5 + 0.5;
      return base * 0.6 + Math.random() * 0.4;
    });
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPct(pct);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pct);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex items-center gap-3">
      <span className="text-[10px] font-mono text-text-muted/60 w-10 text-right tabular-nums">
        {formatTime(currentTime)}
      </span>
      <div
        ref={barRef}
        className="flex-1 relative h-8 cursor-pointer group"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleClick}
      >
        {/* Waveform background */}
        <div className="absolute inset-0 flex items-center gap-[1px] pointer-events-none">
          {waveRef.current.map((height, i) => {
            const barProgress = i / waveRef.current.length;
            const isPlayed = barProgress < progress;
            const isHover = hovered && barProgress < hoverPct;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-100"
                style={{
                  height: `${height * 24}px`,
                  backgroundColor: isPlayed
                    ? '#D4A24A'
                    : isHover
                    ? 'rgba(212,162,74,0.4)'
                    : 'rgba(255,255,255,0.08)',
                  opacity: isPlayed ? 1 : 0.5,
                }}
              />
            );
          })}
        </div>
        {/* Progress line overlay */}
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div className="h-[2px] bg-gold/30 rounded-full relative w-full">
            <div
              className="h-full bg-gold rounded-full transition-all duration-100"
              style={{ width: `${progress * 100}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-gold rounded-full shadow-[0_0_8px_rgba(212,162,74,0.6)] transition-all duration-100 group-hover:scale-125"
              style={{ left: `${progress * 100}%`, transform: `translate(-50%, -50%)` }}
            />
          </div>
        </div>
        {/* Hover tooltip */}
        {hovered && (
          <div
            className="absolute -top-6 bg-black/90 border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono text-white/80 pointer-events-none transform -translate-x-1/2"
            style={{ left: `${hoverPct * 100}%` }}
          >
            {formatTime(hoverPct * duration)}
          </div>
        )}
      </div>
      <span className="text-[10px] font-mono text-text-muted/60 w-10 tabular-nums">
        {formatTime(duration)}
      </span>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Expanded Waveform                                                  */
/* ------------------------------------------------------------------ */
const ExpandedWaveform = memo(function ExpandedWaveform({
  isPlaying,
  progress,
  onSeek,
}: {
  isPlaying: boolean;
  progress: number;
  onSeek: (pct: number) => void;
}) {
  const barCount = 100;
  const heightsRef = useRef<number[]>([]);
  if (heightsRef.current.length === 0) {
    heightsRef.current = Array.from({ length: barCount }, () =>
      Math.floor(Math.random() * 50 + 10)
    );
  }
  const [pulsed, setPulsed] = useState(heightsRef.current);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPulsed(
        heightsRef.current.map((h) => {
          const variation = (Math.random() - 0.5) * 8;
          return Math.max(10, Math.min(60, h + variation));
        })
      );
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    onSeek(pct);
  };

  return (
    <div
      className="flex items-end h-[60px] w-full cursor-pointer select-none gap-[2px]"
      onClick={handleClick}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const barProgress = i / barCount;
        const isPlayed = barProgress < progress;
        const height = isPlaying ? pulsed[i] : heightsRef.current[i];
        return (
          <div
            key={i}
            className="flex-1 rounded-full transition-colors duration-75"
            style={{
              height: `${height}px`,
              backgroundColor: isPlayed ? '#D4A24A' : 'rgba(255,255,255,0.08)',
              opacity: isPlayed ? 1 : 0.4,
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
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function MixPlayer({ track, onClose, onNext, onPrev }: MixPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTrackedRef = useRef(false);
  const isRepeatingRef = useRef(isRepeating);

  // Keep ref in sync with state so audio listeners read current value
  useEffect(() => {
    isRepeatingRef.current = isRepeating;
  }, [isRepeating]);

  const embed = isEmbedSource(track?.audioSource, track?.audioUrl);

  // Reset when track changes
  useEffect(() => {
    setProgress(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setLiked(false);
    setAudioError(null);
    playTrackedRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [track?.id, embed]);

  // Initialize audio element
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
      if (isRepeatingRef.current) {
        audio.currentTime = 0;
        audio.play().catch((err) => {
          console.error('Audio repeat failed:', err);
          setAudioError('Unable to replay this track');
          setIsPlaying(false);
        });
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    };

    const onError = () => {
      console.error('Audio failed to load:', track?.audioUrl);
      setAudioError('Audio unavailable');
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, [track?.id, track?.audioUrl, track?.duration, embed]);

  // Play / pause control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || embed) return;
    if (isPlaying) {
      if (audio.error || audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        audio.load();
      }
      const playPromise = audio.paused || audio.ended
        ? audio.play()
        : Promise.resolve();
      playPromise.catch((err) => {
        console.error('Audio playback failed:', err);
        setAudioError('Unable to play this track. The audio URL may be unsupported or unavailable.');
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, embed]);

  // Track play count
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

  // Fallback timer
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
    setAudioError(null);
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
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[55]"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className={cn(
            'fixed left-0 right-0 z-[60]',
            isExpanded ? 'bottom-0 h-[100vh]' : 'bottom-16 lg:bottom-0 h-[84px]'
          )}
        >
          {/* Background */}
          <div
            className="absolute inset-0 border-t border-white/[0.06]"
            style={{
              background: isExpanded
                ? 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(10,10,10,0.98) 100%)'
                : 'linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(14,14,14,0.99) 100%)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            }}
          />
          {/* Subtle top highlight line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

          {/* ─── Compact Mode ─── */}
          {!isExpanded && (
            <div className="relative flex items-center h-full px-4 lg:px-6 max-w-container mx-auto">
              {/* Left: Artwork + Info */}
              <div className="flex items-center gap-3 flex-shrink-0 w-[35%] min-w-0">
                <div className="relative group">
                  <motion.img
                    src={track.cover}
                    alt={track.title}
                    className="w-14 h-14 rounded-xl object-cover shadow-lg"
                    animate={isPlaying ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                    transition={isPlaying ? { duration: 2, repeat: Infinity } : {}}
                  />
                  {/* Small playing indicator dot */}
                  {isPlaying && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green rounded-full border-2 border-[#121212]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate leading-tight">
                    {track.title}
                  </p>
                  <p className="text-xs text-gold/80 truncate mt-0.5">{track.dj}</p>
                </div>
                <button
                  onClick={toggleLike}
                  className="ml-1 p-1.5 rounded-full hover:bg-white/5 transition-colors flex-shrink-0"
                >
                  <Heart
                    size={15}
                    className={liked ? 'text-red fill-red' : 'text-white/30 hover:text-white/60'}
                  />
                </button>
              </div>

              {/* Center: Controls + Progress */}
              <div className="flex flex-col items-center flex-1 px-6 min-w-0">
                {embed ? (
                  <iframe
                    src={track.audioUrl}
                    title={`${track.title} player`}
                    width="100%"
                    height="80"
                    scrolling="no"
                    frameBorder="0"
                    allow="autoplay"
                    className="rounded-lg max-w-md"
                  />
                ) : (
                  <div className="w-full max-w-lg flex flex-col items-center gap-2">
                    {/* Controls row */}
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => setIsShuffled((s) => !s)}
                        className={`p-1 transition-colors ${isShuffled ? 'text-gold' : 'text-white/20 hover:text-white/50'}`}
                      >
                        <Shuffle size={14} />
                      </button>
                      <button
                        onClick={onPrev}
                        className="p-1 text-white/40 hover:text-white/80 transition-colors"
                      >
                        <SkipBack size={18} />
                      </button>
                      <button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-gold flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_16px_rgba(212,162,74,0.3)]"
                      >
                        {isPlaying ? (
                          <Pause size={16} className="text-black" />
                        ) : (
                          <Play size={16} className="text-black ml-0.5" />
                        )}
                      </button>
                      <button
                        onClick={onNext}
                        className="p-1 text-white/40 hover:text-white/80 transition-colors"
                      >
                        <SkipForward size={18} />
                      </button>
                      <button
                        onClick={() => setIsRepeating((r) => !r)}
                        className={`p-1 transition-colors ${isRepeating ? 'text-gold' : 'text-white/20 hover:text-white/50'}`}
                      >
                        <Repeat size={14} />
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full">
                      <ModernProgressBar
                        progress={progress}
                        onSeek={handleSeek}
                        currentTime={currentTime}
                        duration={track.duration}
                      />
                    </div>
                    {audioError && (
                      <p className="text-[10px] text-red/80 mt-0.5">{audioError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Volume + Actions */}
              <div className="flex items-center gap-2 flex-shrink-0 w-[25%] justify-end">
                <div className="flex items-center gap-2 group">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX size={16} />
                    ) : (
                      <Volume2 size={16} />
                    )}
                  </button>
                  <div className="relative w-16 h-1 bg-white/10 rounded-full overflow-hidden group-hover:bg-white/15 transition-colors">
                    <div
                      className="absolute top-0 left-0 h-full bg-white/40 rounded-full transition-all"
                      style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                    />
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
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setIsExpanded(true)}
                  className="p-1.5 text-white/30 hover:text-white/60 transition-colors ml-1"
                >
                  <Maximize2 size={16} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-white/30 hover:text-white/60 transition-colors ml-1"
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="h-full flex flex-col items-center justify-center px-6 relative"
              >
                {/* Close button */}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="absolute top-6 right-6 p-2 text-white/40 hover:text-white/80 transition-colors"
                >
                  <Minimize2 size={20} />
                </button>

                {/* Top info */}
                <p className="text-xs text-white/30 uppercase tracking-[0.3em] mb-8">Now Playing</p>

                {/* Artwork with vinyl effect */}
                <div className="relative mb-8">
                  <motion.div
                    className="w-64 h-64 rounded-full overflow-hidden shadow-[0_0_60px_rgba(212,162,74,0.15)]"
                    animate={isPlaying ? { rotate: 360 } : {}}
                    transition={isPlaying ? { duration: 12, repeat: Infinity, ease: 'linear' } : {}}
                  >
                    <img
                      src={track.cover}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                  {/* Center hole */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black border border-white/10" />
                </div>

                {/* Track Info */}
                <h3 className="font-display text-3xl font-semibold text-white uppercase tracking-tight text-center">
                  {track.title}
                </h3>
                <p className="text-gold/80 text-sm mt-2">{track.dj}</p>
                <p className="text-white/30 text-xs mt-1">{track.genre}</p>

                {embed ? (
                  <iframe
                    src={track.audioUrl}
                    title={`${track.title} player`}
                    width="100%"
                    height="250"
                    scrolling="no"
                    frameBorder="0"
                    allow="autoplay"
                    className="w-full max-w-lg mt-8 rounded-xl"
                  />
                ) : (
                  <>
                    {/* Waveform */}
                    <div className="w-full max-w-lg mt-8">
                      <ExpandedWaveform
                        isPlaying={isPlaying}
                        progress={progress}
                        onSeek={handleSeek}
                      />
                    </div>

                    {/* Time display */}
                    <div className="flex justify-between w-full max-w-lg mt-3">
                      <span className="text-xs font-mono text-white/30">
                        {formatTime(currentTime)}
                      </span>
                      <span className="text-xs font-mono text-white/30">
                        {formatTime(track.duration)}
                      </span>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-8 mt-8">
                      <button
                        onClick={() => setIsShuffled((s) => !s)}
                        className={`p-2 transition-colors ${isShuffled ? 'text-gold' : 'text-white/20'}`}
                      >
                        <Shuffle size={20} />
                      </button>
                      <button
                        onClick={onPrev}
                        className="p-2 text-white/40 hover:text-white/80 transition-colors"
                      >
                        <SkipBack size={28} />
                      </button>
                      <button
                        onClick={togglePlay}
                        className="w-16 h-16 rounded-full bg-gold flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_24px_rgba(212,162,74,0.4)]"
                      >
                        {isPlaying ? (
                          <Pause size={28} className="text-black" />
                        ) : (
                          <Play size={28} className="text-black ml-1" />
                        )}
                      </button>
                      <button
                        onClick={onNext}
                        className="p-2 text-white/40 hover:text-white/80 transition-colors"
                      >
                        <SkipForward size={28} />
                      </button>
                      <button
                        onClick={() => setIsRepeating((r) => !r)}
                        className={`p-2 transition-colors ${isRepeating ? 'text-gold' : 'text-white/20'}`}
                      >
                        <Repeat size={20} />
                      </button>
                    </div>
                    {audioError && (
                      <p className="text-xs text-red mt-3">{audioError}</p>
                    )}
                  </>
                )}

                {/* Volume */}
                <div className="flex items-center gap-3 mt-8 w-full max-w-xs">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <div className="relative flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-white/40 rounded-full"
                      style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                    />
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
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 mt-8">
                  <button
                    onClick={toggleLike}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-colors text-sm ${
                      liked
                        ? 'border-red/30 text-red bg-red/5'
                        : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
                    }`}
                  >
                    <Heart size={15} className={liked ? 'fill-red' : ''} />
                    <span>{liked ? 'Liked' : 'Like'}</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (!track) return;
                      const url = `${window.location.origin}/mixes`;
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: `${track.title} by ${track.dj}`, url });
                        } else {
                          await navigator.clipboard.writeText(url);
                          alert('Link copied to clipboard!');
                        }
                      } catch {}
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-white/50 hover:border-white/30 hover:text-white/80 transition-colors text-sm"
                  >
                    <Share2 size={15} />
                    <span>Share</span>
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-white/50 hover:border-white/30 hover:text-white/80 transition-colors text-sm">
                    <ListMusic size={15} />
                    <span>Queue</span>
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
