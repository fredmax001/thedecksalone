import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { useHomeData } from '@/hooks/useHomeData';
import { useAuthStore } from '@/stores/authStore';
import HeroBanner from '@/components/home/HeroBanner';
import CategoryPills from '@/components/home/CategoryPills';
import MixCarousel from '@/components/home/MixCarousel';
import DjCarousel from '@/components/home/DjCarousel';
import PlaylistGrid from '@/components/home/PlaylistGrid';
import RankingList from '@/components/home/RankingList';
import EventCarousel from '@/components/feed/EventCarousel';
import AdStrip from '@/components/home/AdStrip';
import { FeedSectionSkeleton } from '@/components/ui/page-skeletons';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

export default function Home() {
  const { user, isAuthenticated } = useAuthStore();
  const {
    featuredDJs,
    rankings,
    mixCategories,
    events,
    homeAdBoard,
    officialPlaylists,
    trendingMixes,
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
  const showSkeleton = useDelayedLoading(isLoading);

  if (showLoader) {
    return (
      <div className="min-h-screen bg-black">
        {showSkeleton ? <FeedSectionSkeleton sections={2} /> : null}
      </div>
    );
  }

  const djs = featuredDJs.data || [];
  const boardMixes = homeAdBoard.data?.mixes || [];
  const trendingList = trendingMixes.data || [];
  const mixes = (boardMixes.length >= 6 ? boardMixes : trendingList.length >= boardMixes.length ? trendingList : boardMixes);
  const paidAds = homeAdBoard.data?.paidAds || [];
  const playlists = officialPlaylists.data || [];
  const rankingDjs = rankings.data || [];
  const eventsList = (events.data && events.data.length > 0) ? events.data : (homeAdBoard.data?.events || []);

  return (
    <div className="bg-black min-h-screen">
      <SEOHead
        title="Deck Salone"
        description="Discover top DJs, listen to exclusive Sierra Leonean mixes, book DJs for events, and experience live DJ battles on Deck Salone."
      />

      <HeroBanner djs={djs} events={eventsList} mixes={mixes} paidAds={paidAds} />

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

        {/* ─── GUEST CONVERSION BANNER (Sign Up Free & Unlock Features) ─── */}
        {!isAuthenticated && (
          <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
            <div className="relative overflow-hidden rounded-3xl border border-[#f4e059]/30 bg-gradient-to-r from-[#17140b] via-[#12110e] to-[#0a0a0a] p-6 sm:p-8 shadow-2xl">
              <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#f4e059]/10 blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#f4e059]/10 text-[#f4e059] border border-[#f4e059]/30">
                    <Sparkles className="w-3 h-3" /> Join Sierra Leone's #1 DJ Hub
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                    Listen Freely. Follow Top DJs. Never Miss a Drop.
                  </h3>
                  <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                    Create a free account in 10 seconds to save your favorite mixes, build playlists, follow top Sierra Leonean DJs, and get tickets to exclusive events.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-gradient text-black px-6 py-3.5 text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-gold/25"
                  >
                    Create Free Account <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/mixes"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 hover:border-gold/40 text-text-secondary hover:text-white px-5 py-3.5 text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Browse All Mixes
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

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
            action={{ label: 'Browse all', to: '/playlists' }}
          />
        </section>

        <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
          <RankingList djs={rankingDjs} />
        </section>

        {/* ─── UPCOMING EVENTS (Before Sponsored) ─── */}
        {eventsList.length > 0 && (
          <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
            <EventCarousel
              title="Upcoming Events"
              subtitle="Get tickets to the hottest shows"
              events={eventsList}
              action={{ label: 'See all', to: '/events' }}
            />
          </section>
        )}

        <section className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-10">
          <AdStrip paidAds={paidAds} />
        </section>
      </div>
    </div>
  );
}
