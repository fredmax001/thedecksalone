import { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import type { HearThisTrack } from '@/hooks/useHearThis';

interface HearThisPlayerProps {
  track: HearThisTrack;
  compact?: boolean;
}

export default function HearThisPlayer({ track, compact = false }: HearThisPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Example permalink: https://hearthis.at/username/track-slug/
  // Embed format: https://hearthis.at/username/track-slug/embed/?hcolor=D4A24A&color=888&style=2&show_listens=1
  const embedUrl = track.permalink_url.endsWith('/')
    ? `${track.permalink_url}embed/?hcolor=D4A24A&color=888&style=2&show_listens=1`
    : `${track.permalink_url}/embed/?hcolor=D4A24A&color=888&style=2&show_listens=1`;

  const iframeHeight = compact ? 145 : 350;

  return (
    <div className="flex flex-col w-full">
      <div 
        className="relative w-full rounded-2xl overflow-hidden bg-[#111] border border-[rgba(212,162,74,0.2)]"
        style={{ height: iframeHeight }}
      >
        {!isLoaded && (
          <motion.div 
            className="absolute inset-0 bg-[#1a1a1a]"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-[rgba(212,162,74,0.1)] to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          </motion.div>
        )}
        
        <iframe
          width="100%"
          height={iframeHeight}
          scrolling="no"
          frameBorder="0"
          allow="autoplay"
          src={embedUrl}
          onLoad={() => setIsLoaded(true)}
          className={`absolute inset-0 transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>

      <div className="mt-3 flex items-center justify-between px-1">
        <div className="flex flex-col">
          <h3 className="text-white font-display font-semibold text-lg line-clamp-1">{track.title}</h3>
          <p className="text-gold text-sm">{track.user?.username || 'Unknown DJ'}</p>
        </div>
        
        <a 
          href={track.permalink_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-gold transition-colors shrink-0 bg-white/5 px-3 py-1.5 rounded-full"
        >
          <span className="hidden sm:inline">Open in HearThis</span>
          <span className="sm:hidden">HearThis</span>
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
