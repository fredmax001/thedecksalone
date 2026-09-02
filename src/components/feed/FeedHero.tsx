import { Link } from 'react-router-dom';
import { Play, Ticket, Headphones, Music, ArrowRight } from 'lucide-react';
import { getMediaUrl } from '@/lib/api';
import { usePlayerStore } from '@/stores/playerStore';
import { cn } from '@/lib/utils';
import type { FeedDJ, FeedEvent, FeedMix } from './types';
import { getAvatarImageUrl } from '@/lib/utils';

interface FeedHeroProps {
  mix?: FeedMix | null;
  event?: FeedEvent | null;
  dj?: FeedDJ | null;
}

export default function FeedHero({ mix, event, dj }: FeedHeroProps) {
  const { currentTrack, isPlaying, play, pause } = usePlayerStore();

  if (mix) {
    const cover = mix.coverImage || mix.cover || mix.dj?.avatar || '/mix-placeholder.jpg';
    const djName = mix.dj?.stageName || mix.djName || 'Unknown DJ';
    const isCurrent = currentTrack?.id === mix.id;

    const handlePlay = () => {
      if (isCurrent) {
        if (isPlaying) pause();
        else play();
        return;
      }
      play({
        id: mix.id,
        title: mix.title,
        dj: djName,
        duration: mix.duration || 0,
        cover,
        genre: mix.genre || mix.category || 'Mix',
        audioUrl: mix.audioUrl,
        audioSource: mix.audioSource,
        originalUrl: mix.originalUrl,
        plays: mix.plays || 0,
      });
    };

    return (
      <section className="relative overflow-hidden rounded-3xl border border-dark-gray bg-black-surface">
        <div className="absolute inset-0">
          <img
            src={cover}
            alt={mix.title}
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-end gap-6 p-6 sm:p-10 min-h-[280px] sm:min-h-[340px]">
          <div className="relative w-32 h-32 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-2xl">
            <img src={cover} alt={mix.title} className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gold mb-2">
              <Music className="w-3 h-3" /> Spotlight Mix
            </span>
            <h2 className="font-display text-2xl sm:text-4xl font-black uppercase tracking-tight text-white mb-1 truncate">
              {mix.title}
            </h2>
            <p className="text-sm sm:text-base text-text-secondary mb-4">
              {djName} • {mix.genre || mix.category || 'Mix'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlay}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm uppercase tracking-wider transition-all shadow-lg',
                  isCurrent && isPlaying
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-gold text-black hover:brightness-110 shadow-gold/25'
                )}
              >
                {isCurrent && isPlaying ? (
                  <>
                    <span className="w-1 h-4 bg-black rounded-full animate-pulse" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" /> Play Now
                  </>
                )}
              </button>
              <Link
                to={`/mix/${mix.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-white text-xs font-bold uppercase transition-all"
              >
                View Mix <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (event) {
    const flyer = event.flyerImage || event.coverImage ? getMediaUrl(event.flyerImage || event.coverImage) : null;

    return (
      <section className="relative overflow-hidden rounded-3xl border border-dark-gray bg-black-surface">
        <div className="absolute inset-0">
          {flyer ? (
            <img src={flyer} alt={event.title} className="w-full h-full object-cover opacity-30" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col justify-end p-6 sm:p-10 min-h-[280px] sm:min-h-[340px]">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gold mb-2">
            <Ticket className="w-3 h-3" /> Featured Event
          </span>
          <h2 className="font-display text-2xl sm:text-4xl font-black uppercase tracking-tight text-white mb-1 max-w-2xl">
            {event.title}
          </h2>
          <p className="text-sm sm:text-base text-text-secondary mb-4">
            {event.venue || event.city || 'Sierra Leone'} •{' '}
            {event.date
              ? new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : 'Upcoming'}
          </p>
          <Link
            to={`/events/${event.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold text-black font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-gold/25 w-fit"
          >
            <Ticket className="w-4 h-4" /> Get Tickets
          </Link>
        </div>
      </section>
    );
  }

  if (dj) {
    const avatar = getAvatarImageUrl(dj.avatar);

    return (
      <section className="relative overflow-hidden rounded-3xl border border-dark-gray bg-black-surface">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-black to-black" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 sm:p-10 min-h-[280px] sm:min-h-[340px]">
          <div className="relative w-32 h-32 sm:w-44 sm:h-44 rounded-full overflow-hidden shrink-0 border-2 border-gold/30 shadow-2xl">
            <img src={avatar} alt={dj.stageName} className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gold mb-2">
              <Headphones className="w-3 h-3" /> Featured DJ
            </span>
            <h2 className="font-display text-2xl sm:text-4xl font-black uppercase tracking-tight text-white mb-1">
              {dj.stageName}
            </h2>
            <p className="text-sm sm:text-base text-text-secondary mb-4">
              {dj.city ? `${dj.city}, Sierra Leone` : 'Sierra Leone 🇸🇱'}
              {dj.genres && dj.genres.length > 0 ? ` • ${dj.genres[0]}` : ''}
            </p>
            <Link
              to={`/dj/${dj.username || dj.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold text-black font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-gold/25 w-fit"
            >
              View Profile <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-dark-gray bg-gradient-to-br from-[#15140f] via-black to-black">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="relative z-10 flex flex-col justify-center p-6 sm:p-10 min-h-[260px] sm:min-h-[300px]">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gold mb-2">
          <Music className="w-3 h-3" /> Welcome to the Feed
        </span>
        <h2 className="font-display text-2xl sm:text-4xl font-black uppercase tracking-tight text-white mb-2">
          Discover Salone&apos;s Finest DJs
        </h2>
        <p className="text-sm sm:text-base text-text-secondary mb-5 max-w-xl">
          The feed is loading the latest mixes, events, and playlists from across the platform. Check back soon or explore the archives.
        </p>
        <div className="flex items-center gap-3">
          <Link
            to="/mixes"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold text-black font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-gold/25"
          >
            Browse Mixes <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/discover"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-white text-xs font-bold uppercase transition-all"
          >
            Discover DJs
          </Link>
        </div>
      </div>
    </section>
  );
}
