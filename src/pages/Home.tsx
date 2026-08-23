import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { useHomeData } from '@/hooks/useHomeData';
import { useAuthStore } from '@/stores/authStore';
import HeroBanner from '@/components/home/HeroBanner';
import CategoryPills from '@/components/home/CategoryPills';
import MixCarousel from '@/components/home/MixCarousel';
import DjCarousel from '@/components/home/DjCarousel';
import PlaylistGrid from '@/components/home/PlaylistGrid';
import RankingList from '@/components/home/RankingList';
import AdStrip from '@/components/home/AdStrip';

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

  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    // Never block the home page for more than 5 seconds; show content as it loads
    const timer = setTimeout(() => setForceShow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const isAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'FINANCE_ADMIN' ||
    user?.role === 'VERIFICATION_ADMIN';

  if (isAuthenticated && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const showLoader = isLoading && !forceShow;

  if (showLoader) {
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
        <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
          <CategoryPills categories={mixCategories.data || []} />
        </section>

        <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
          <MixCarousel
            title="Trending Mixes"
            mixes={mixes}
            action={{ label: 'See all', to: '/mixes' }}
          />
        </section>

        <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
          <DjCarousel
            title="Featured DJs"
            djs={djs}
            action={{ label: 'See all', to: '/discover' }}
          />
        </section>

        <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
          <PlaylistGrid
            title="Official Playlists"
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
