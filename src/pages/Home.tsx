
import { Navigate } from 'react-router-dom';
import { Loader2, Play } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { useHomeData } from '@/hooks/useHomeData';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore } from '@/stores/playerStore';
import HeroBanner from '@/components/home/HeroBanner';
import CategoryPills from '@/components/home/CategoryPills';
import MixCarousel from '@/components/home/MixCarousel';
import DjCarousel from '@/components/home/DjCarousel';
import PlaylistGrid from '@/components/home/PlaylistGrid';
import RankingList from '@/components/home/RankingList';
import AdStrip from '@/components/home/AdStrip';

function ContinueListeningCard() {
  const lastSession = usePlayerStore((s) => s.lastSession);
  const play = usePlayerStore((s) => s.play);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated || !user || !lastSession || !lastSession.track) return null;

  const { track, currentTime, duration } = lastSession;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
      <div className="bg-black-surface border border-gold/30 hover:border-gold rounded-2xl p-4 shadow-card transition-all">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gold/30">
              <img src={track.cover || '/mix-placeholder.jpg'} alt={track.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Play className="w-4 h-4 text-gold fill-gold" />
              </div>
            </div>
            <div className="min-w-0">
              <span className="text-gold text-[9px] font-black uppercase tracking-widest block">Continue Listening</span>
              <h4 className="font-display font-bold text-xs sm:text-sm uppercase text-white truncate">{track.title}</h4>
              <p className="text-[10px] sm:text-xs text-text-muted mt-0.5 truncate">
                {track.dj} • Resuming at {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>
          </div>

          <button
            onClick={() => play(track, currentTime)}
            className="bg-gold text-black font-extrabold text-xs uppercase tracking-wider px-4 py-2 rounded-full shrink-0 flex items-center gap-1.5 hover:brightness-110 transition-transform"
          >
            <Play className="w-3.5 h-3.5 fill-black" /> Resume
          </button>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { user, isAuthenticated } = useAuthStore();
  const {
    featuredDJs,
    rankings,
    mixCategories,
    events,
    homeAdBoard,
    officialPlaylists,
    isLoading,
  } = useHomeData();

  const isAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'FINANCE_ADMIN' ||
    user?.role === 'VERIFICATION_ADMIN';

  if (isAuthenticated && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-gold" />
      </div>
    );
  }

  const djs = featuredDJs.data || [];
  const mixes = homeAdBoard.data?.mixes || [];
  const paidAds = homeAdBoard.data?.paidAds || [];
  const playlists = officialPlaylists.data || [];
  const rankingDjs = rankings.data || [];

  return (
    <div className="bg-black min-h-screen">
      <SEOHead
        title="Deck Salone — Sierra Leone's Official DJ Platform"
        description="Discover top DJs, listen to exclusive Sierra Leonean mixes, book DJs for events, and experience live DJ battles on Deck Salone."
      />

      <HeroBanner djs={djs} events={events.data || []} mixes={mixes} paidAds={paidAds} />

      <div className="py-6 sm:py-8 pb-28 md:pb-16 space-y-8 sm:space-y-10">
        <ContinueListeningCard />

        <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
          <CategoryPills categories={mixCategories.data || []} />
        </section>

        <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
          <MixCarousel
            title="Trending Mixes"
            subtitle="Hottest DJ sets right now"
            mixes={mixes}
            action={{ label: 'See all', to: '/mixes' }}
          />
        </section>

        <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
          <DjCarousel
            title="Featured DJs"
            subtitle="Top talent from Sierra Leone"
            djs={djs}
            action={{ label: 'See all', to: '/discover' }}
          />
        </section>

        <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
          <PlaylistGrid
            title="Official Playlists"
            subtitle="Curated by Deck Salone"
            playlists={playlists}
            action={{ label: 'Browse all', to: '/official-playlists' }}
          />
        </section>

        <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
          <RankingList djs={rankingDjs} />
        </section>

        <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
          <AdStrip paidAds={paidAds} />
        </section>
      </div>
    </div>
  );
}
