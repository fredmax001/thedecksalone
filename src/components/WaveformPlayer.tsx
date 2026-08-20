import React, { useRef, useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface ReactionMarker {
  pos: number;
  emoji: string;
}

export interface WaveformPlayerProps {
  trackId: string;
  isCurrent?: boolean;
  isPlaying?: boolean;
  duration?: number;
  currentTime?: number;
  onSeek?: (time: number) => void;
  className?: string;
  showReactions?: boolean;
  reactions?: ReactionMarker[];
}

// Generate pseudo-random deterministic waveform bar heights from track ID
function generateWaveformData(id: string, count: number = 100): number[] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }

  const bars: number[] = [];
  let seed = Math.abs(hash) || 12345;

  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < count; i++) {
    // Shape: natural audio envelope with intro, build-up, and energetic drop
    const progress = i / count;
    const envelope = Math.sin(progress * Math.PI) * 0.4 + 0.6;
    const noise = pseudoRandom();
    const height = Math.min(1, Math.max(0.18, (noise * 0.75 + 0.25) * envelope));
    bars.push(height);
  }

  return bars;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function WaveformPlayer({
  trackId,
  isCurrent = false,
  duration = 0,
  currentTime = 0,
  onSeek,
  className,
  showReactions = true,
  reactions = [],
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const bars = useMemo(() => generateWaveformData(trackId, 100), [trackId]);

  // Current progress ratio [0..1]
  const progress = useMemo(() => {
    if (!isCurrent || !duration || duration === 0) return 0;
    return Math.min(1, Math.max(0, currentTime / duration));
  }, [isCurrent, currentTime, duration]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const ratio = x / rect.width;
      setHoverPosition(ratio);
      setHoverTime(ratio * (duration || 0));
    },
    [duration]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverPosition(null);
    setHoverTime(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !onSeek) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const ratio = x / rect.width;
      const seekTime = ratio * (duration || 0);
      onSeek(seekTime);
    },
    [duration, onSeek]
  );

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={cn(
        'relative w-full h-11 sm:h-13 cursor-pointer select-none flex items-center group py-1',
        className
      )}
    >
      {/* Waveform Bars Container */}
      <div className="w-full h-full flex items-center justify-between gap-[1.5px] sm:gap-[2px]">
        {bars.map((barHeight, i) => {
          const barRatio = i / bars.length;
          const isPlayed = isCurrent && barRatio <= progress;
          const isHovered = hoverPosition !== null && barRatio <= hoverPosition;

          return (
            <div
              key={i}
              className="flex-1 h-full flex items-center justify-center pointer-events-none"
            >
              <div
                className={cn(
                  'w-full rounded-full transition-all duration-75',
                  isPlayed
                    ? 'bg-gradient-to-t from-amber-500 via-[#f4e059] to-yellow-300 shadow-[0_0_8px_rgba(244,224,89,0.6)]'
                    : isHovered
                    ? 'bg-white/70'
                    : 'bg-white/35 group-hover:bg-white/45'
                )}
                style={{
                  height: `${Math.round(barHeight * 100)}%`,
                  minHeight: '4px',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Scrub Hover Marker & Time Tooltip */}
      {hoverPosition !== null && hoverTime !== null && (
        <>
          <div
            className="absolute top-0 bottom-0 w-[1.5px] bg-white pointer-events-none shadow-md z-20"
            style={{ left: `${hoverPosition * 100}%` }}
          />
          <div
            className="absolute -top-7 transform -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 border border-white/20 text-[10px] font-mono text-white pointer-events-none z-30 shadow-lg whitespace-nowrap"
            style={{ left: `${hoverPosition * 100}%` }}
          >
            {formatTime(hoverTime)}
          </div>
        </>
      )}

      {/* Timestamp Emoji Reactions */}
      {showReactions && (
        <div className="absolute -bottom-1.5 inset-x-0 pointer-events-none z-10 flex">
          {reactions.map((r: ReactionMarker, idx: number) => (
            <div
              key={idx}
              className="absolute transform -translate-x-1/2 text-[9px] filter drop-shadow opacity-70 group-hover:opacity-100 transition-opacity"
              style={{ left: `${r.pos * 100}%` }}
            >
              {r.emoji}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WaveformPlayer;
