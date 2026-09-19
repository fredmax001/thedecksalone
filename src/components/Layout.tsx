import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Calendar,
  Flame,
  Headphones,
  HelpCircle,
  Home,
  Info,
  Library,
  ListMusic,
  Radio,
  Search,
  Upload,
  Users,
  Rss,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';
import NotificationBell from '@/components/NotificationBell';
import UserDropdownMenu from '@/components/UserDropdownMenu';
import BottomNav from '@/components/BottomNav';
import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import SearchModal from '@/components/SearchModal';
import { useUserRole } from '@/hooks/useUserRole';

const browseItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Discover', path: '/discover', icon: Flame },
  { label: 'Ranking', path: '/rankings', icon: BarChart3 },
  { label: 'Mix Hub', path: '/mixes', icon: ListMusic },
  { label: 'Playlists', path: '/playlists', icon: Radio },
  { label: 'Feed', path: '/feed', icon: Rss },
  { label: 'Events', path: '/events', icon: Calendar },
  { label: 'My Library', path: '/library', icon: Library },
  { label: 'Request DJ', path: '/request-dj', icon: Users },
];

const studioItems = [
  { label: 'DJ Dashboard', path: '/dashboard', icon: Headphones },
  { label: 'Upload Mix', path: '/dashboard/mixes', icon: Upload },
  { label: 'Bookings', path: '/dashboard/bookings', icon: Library },
  { label: 'Sets', path: '/dashboard/sets', icon: Radio },
];


const ROUTE_TITLE_MAP: Record<string, string> = {
  '/': 'Deck Salone',
  '/discover': 'Deck Salone | Discover',
  '/rankings': 'Deck Salone | Rankings',
  '/mixes': 'Deck Salone | Mixes',
  '/playlists': 'Deck Salone | Playlists',
  '/feed': 'Deck Salone | Feed',
  '/events': 'Deck Salone | Events',
  '/library': 'Deck Salone | My Library',
  '/my-library': 'Deck Salone | My Library',
  '/request-dj': 'Deck Salone | Request DJ',
  '/booking': 'Deck Salone | Book a DJ',
  '/pricing': 'Deck Salone | Pricing',
  '/subscription': 'Deck Salone | Pricing',
  '/hall-of-fame': 'Deck Salone | Hall of Fame',
  '/account': 'Deck Salone | Account',
  '/terms': 'Deck Salone | Terms of Service',
  '/privacy': 'Deck Salone | Privacy Policy',
  '/help': 'Deck Salone | Help & Support',
  '/blog': 'Deck Salone | Blog',
};

export default function Layout() {
  const location = useLocation();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const { user, isAuthenticated } = useAuthStore();
  const { isDj } = useUserRole();
  const subscriptionTier = user?.djProfile?.subscriptionTier || 'free';
  const shouldShowGetPro = isDj && subscriptionTier === 'free';
  const [searchOpen, setSearchOpen] = useState(false);

  // Scroll to top on route change & set fallback title
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!document.title.startsWith('▶ ')) {
      const routeTitle = ROUTE_TITLE_MAP[location.pathname];
      if (routeTitle) {
        document.title = routeTitle;
      } else if (location.pathname === '/') {
        document.title = 'Deck Salone';
      }
    }
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-[100dvh] bg-bg-page text-text-primary">
      <PWAInstallPrompt />
      {/* Sidebar — shown on md+ (tablet and desktop) */}
      <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-[260px] lg:w-[300px] flex-col border-r border-gold/10 bg-black/95 backdrop-blur-2xl px-5 py-7 lg:px-7 shadow-[1px_0_30px_rgba(0,0,0,0.6)]">
        <Link to="/" className="flex h-14 items-center">
          <img
            src="/logo-web.png?v=2"
            alt="Deck Salone"
            className="max-h-11 w-auto max-w-[210px] object-contain"
          />
        </Link>

        <nav className="mt-12 flex-1 space-y-10 overflow-y-auto pb-6">
          {/* Browse */}
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-text-muted px-4">Browse</p>
            <div className="space-y-1.5">
              {browseItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 group relative',
                    isActive(item.path)
                      ? 'border border-[#f4e059] text-[#f4e059] bg-[#f4e059]/5 shadow-[0_0_12px_rgba(244,224,89,0.15)]'
                      : 'border border-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 shrink-0 transition-colors', isActive(item.path) ? 'text-[#f4e059]' : 'text-text-muted group-hover:text-[#f4e059]')} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* DJ Studio — only for DJ role */}
          {isDj && (
            <div className="border-t border-white/10 pt-6">
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-text-muted px-4">DJ Studio</p>
              <div className="space-y-1.5">
                {studioItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 group relative',
                      isActive(item.path)
                        ? 'border border-[#f4e059] text-[#f4e059] bg-[#f4e059]/5'
                        : 'border border-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5 shrink-0 transition-colors', isActive(item.path) ? 'text-[#f4e059]' : 'text-text-muted group-hover:text-[#f4e059]')} />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* About & Help Section */}
          <div className="border-t border-gold/10 pt-8">
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-text-muted px-4">Info</p>
            <div className="space-y-1">
              <Link
                to="/about"
                className="flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition-all group"
              >
                <Info className="h-4 w-4 shrink-0 text-text-muted group-hover:text-gold transition-colors" />
                About Deck Salone
              </Link>
              <Link
                to="/help"
                className="flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition-all group"
              >
                <BookOpen className="h-4 w-4 shrink-0 text-text-muted group-hover:text-gold transition-colors" />
                DJ Guide
              </Link>
              <Link
                to="/help"
                className="flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary transition-all group"
              >
                <HelpCircle className="h-4 w-4 shrink-0 text-text-muted group-hover:text-gold transition-colors" />
                How to Use
              </Link>
            </div>

            {/* ─── SIDEBAR UPGRADE / VIP STATUS BADGE (AFTER HOW TO USE) ─── */}
            {isDj && (subscriptionTier === 'pro' || subscriptionTier === 'legend' || subscriptionTier === 'pro_plus') ? (
              /* PRO / PRO+ VIP STATUS */
              <div className="mt-5 mx-1 rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-500/10 via-[#161410] to-[#0d0c0a] p-3.5 shadow-lg shadow-amber-500/5">
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-sm">
                    👑 {subscriptionTier === 'legend' ? 'PRO+ VIP' : subscriptionTier === 'pro_plus' ? 'PRO+ VIP' : 'PRO MEMBER'}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-400">Active</span>
                </div>
                <h4 className="font-display text-xs font-bold uppercase text-white tracking-tight">
                  VIP DJ Status
                </h4>
                <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                  Priority placement, HD 320kbit/s audio & zero booking fees enabled.
                </p>
                <Link
                  to="/dashboard/mixes"
                  className="mt-2.5 block w-full text-center py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-[11px] font-bold uppercase tracking-wider transition-all"
                >
                  Upload & Promote
                </Link>
              </div>
            ) : isDj ? (
              /* FREE TRIAL / FREE TIER DJS */
              <div className="mt-5 mx-1 rounded-2xl border border-gold/30 bg-gradient-to-b from-gold/15 via-[#181610] to-[#0f0e0c] p-3.5 shadow-lg shadow-gold/10">
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold text-black shadow-sm">
                    ⚡ Free Trial
                  </span>
                  <span className="text-[10px] font-bold text-gold">Subscribe</span>
                </div>
                <h4 className="font-display text-xs font-bold uppercase text-white tracking-tight">
                  Upgrade DJ Studio
                </h4>
                <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                  Unlimited mix uploads, priority booking & HD streaming.
                </p>
                <Link
                  to="/dashboard/subscription"
                  className="mt-2.5 block w-full text-center py-1.5 rounded-xl bg-gold hover:brightness-110 active:scale-95 text-black text-[11px] font-black uppercase tracking-wider transition-all shadow-md shadow-gold/20"
                >
                  Upgrade to Pro
                </Link>
              </div>
            ) : (
              /* FANS / LISTENERS */
              <div className="mt-5 mx-1 rounded-2xl border border-gold/30 bg-gradient-to-b from-gold/15 via-[#181610] to-[#0f0e0c] p-3.5 shadow-lg shadow-gold/10">
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold text-black shadow-sm">
                    ♥ Support
                  </span>
                  <span className="text-[10px] font-bold text-gold">Free</span>
                </div>
                <h4 className="font-display text-xs font-bold uppercase text-white tracking-tight">
                  Support a DJ
                </h4>
                <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                  Send support directly to your favourite artists. 100% goes to the DJ.
                </p>
                <Link
                  to="/discover"
                  className="mt-2.5 block w-full text-center py-1.5 rounded-xl bg-gold hover:brightness-110 active:scale-95 text-black text-[11px] font-black uppercase tracking-wider transition-all shadow-md shadow-gold/20"
                >
                  Browse DJs
                </Link>
              </div>
            )}
          </div>
        </nav>
      </aside>

      <div className="min-h-[100dvh] min-w-0 overflow-x-hidden md:ml-[260px] lg:ml-[300px]">
        <header className="sticky top-0 z-30 border-b border-gold/10 bg-black/95 backdrop-blur-2xl shadow-[0_1px_20px_rgba(0,0,0,0.5)] pt-[env(safe-area-inset-top,0px)]">
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6 lg:px-10">
            <Link to="/" className="flex shrink-0 items-center md:hidden">
              <img src="/logo-mobile.png?v=3" alt="Deck Salone" className="h-9 w-auto object-contain" />
            </Link>

            <div className="flex items-center gap-1.5 sm:gap-3 ml-auto shrink-0">
              {shouldShowGetPro && (
                <Link
                  to="/dashboard/subscription"
                  className="shrink-0 rounded-full bg-gold-gradient text-black px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide transition-colors"
                >
                  Get Pro
                </Link>
              )}

              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-black-surface/80 border border-white/10 text-text-muted hover:text-gold hover:border-gold/40 transition-all shadow-inner"
                aria-label="Search"
              >
                <Search className="w-4 h-4 text-gold" />
              </button>

              {/* For DJs: Replace Theme Toggle with Upload icon */}
              {isDj && (
                <Link
                  to="/dashboard/mixes"
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-black-surface/80 border border-white/10 hover:border-gold/40 text-gold hover:brightness-110 active:scale-95 transition-all shadow-inner shrink-0"
                  title="Upload Mix"
                  aria-label="Upload Mix"
                >
                  <Upload className="w-4 h-4" />
                </Link>
              )}

              {isAuthenticated && (
                <NotificationBell className="shrink-0" />
              )}

              {isAuthenticated ? (
                <UserDropdownMenu align="end" className="shrink-0" />
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    aria-label="Sign In"
                    className="shrink-0 rounded-full border border-gold/40 text-gold hover:bg-gold/10 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    aria-label="Join"
                    className="shrink-0 rounded-full bg-gold-gradient text-black px-4 py-2 text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all hidden sm:inline-flex shadow-sm"
                  >
                    Join
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <main
          className={`transition-all duration-300 ${
            currentTrack ? 'pb-44 md:pb-28' : 'pb-24 md:pb-12'
          }`}
        >
          <Outlet />
        </main>

        <div className={currentTrack ? 'pb-20 md:pb-[80px]' : ''}>
          <Footer />
        </div>
      </div>
      <BottomNav />
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
