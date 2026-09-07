import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  LogOut,
  Radio,
  Search,
  Sparkles,
  Trophy,
  Upload,
  Users,
  Shield,
  Rss,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';
import NotificationBell from '@/components/NotificationBell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import BottomNav from '@/components/BottomNav';
import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import SearchModal from '@/components/SearchModal';
import { getAvatarImageUrl } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';

const browseItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Discover', path: '/discover', icon: Flame },
  { label: 'Ranking', path: '/rankings', icon: BarChart3 },
  { label: 'Mix Hub', path: '/mixes', icon: ListMusic },
  { label: 'Playlists', path: '/playlists', icon: Library },
  { label: 'Feed', path: '/feed', icon: Rss },
  { label: 'Events', path: '/events', icon: Calendar },
  { label: 'Battles', path: '/battles', icon: Trophy },
  { label: 'Request DJ', path: '/request-dj', icon: Users },
];

const studioItems = [
  { label: 'DJ Dashboard', path: '/dashboard', icon: Headphones },
  { label: 'Upload Mix', path: '/dashboard/mixes', icon: Upload },
  { label: 'Bookings', path: '/dashboard/bookings', icon: Library },
  { label: 'Sets', path: '/dashboard/sets', icon: Radio },
];


export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isDj } = useUserRole();
  const isModerator = user?.role === 'MODERATOR';
  const subscriptionTier = user?.djProfile?.subscriptionTier || 'free';
  const shouldShowGetPro = isDj && subscriptionTier === 'free';
  const displayName = user?.djProfile?.stageName || user?.name || user?.username || user?.email?.split('@')[0] || 'Account';
  const avatarUrl = getAvatarImageUrl(user?.djProfile?.avatar || user?.avatar);
  const profilePath = isDj ? '/dashboard/profile' : '/user/profile';
  const dashboardPath = isDj ? '/dashboard' : '/user/dashboard';
  const isNativeApp = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
  const [searchOpen, setSearchOpen] = useState(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
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
                <div className="shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center justify-center rounded-full p-0.5 focus:outline-none hover:ring-2 hover:ring-gold/40 transition-all">
                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-gold/40">
                          <AvatarImage src={avatarUrl} alt={displayName} />
                          <AvatarFallback className="bg-black-surface">
                            <img src="/default-avatar.jpg" alt="avatar" className="w-full h-full object-cover rounded-full" />
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-dark-gray bg-black-surface w-52 shadow-2xl z-50">
                      <div className="px-3 py-2 border-b border-dark-gray">
                        <p className="text-xs font-bold text-text-primary truncate">{displayName}</p>
                        <p className="text-[10px] text-gold uppercase tracking-wider font-semibold">{user?.role || 'Member'}</p>
                      </div>
                      <DropdownMenuItem asChild>
                        <Link to={profilePath} className="btn-press-subtle cursor-pointer text-xs">Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={dashboardPath} className="btn-press-subtle cursor-pointer text-xs">Dashboard</Link>
                      </DropdownMenuItem>
                      {isDj && (
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard" className="btn-press-subtle cursor-pointer text-xs font-semibold text-gold flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5" /> DJ Studio
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {isModerator && (
                        <DropdownMenuItem asChild>
                          <Link to="/moderator" className="btn-press-subtle cursor-pointer text-xs font-semibold text-gold flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" /> Moderator Console
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to={isDj ? '/dashboard/settings' : '/user/settings'} className="btn-press-subtle cursor-pointer text-xs">Settings</Link>
                      </DropdownMenuItem>
                      {!isNativeApp && (
                        <DropdownMenuItem asChild>
                          <Link to="/install" className="btn-press-subtle cursor-pointer text-xs text-gold font-semibold flex items-center gap-1.5">
                            Install App
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-dark-gray" />
                      <DropdownMenuItem asChild>
                        <Link to="/about" className="btn-press-subtle cursor-pointer text-xs text-text-secondary flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" /> About Deck Salone
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/help" className="btn-press-subtle cursor-pointer text-xs text-text-secondary flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" /> Help & DJ Guide
                        </Link>
                      </DropdownMenuItem>
                      {shouldShowGetPro && (
                        <>
                          <DropdownMenuSeparator className="bg-dark-gray" />
                          <div className="px-2 py-2">
                            <Link
                              to="/dashboard/subscription"
                              className="flex items-center gap-2 w-full rounded-lg bg-gold/10 border border-gold/25 px-3 py-2 hover:bg-gold/20 transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-gold shrink-0" />
                              <div>
                                <p className="text-[10px] font-extrabold text-gold uppercase tracking-wide">Upgrade to Pro</p>
                                <p className="text-[9px] text-text-muted">Unlock analytics & more</p>
                              </div>
                            </Link>
                          </div>
                        </>
                      )}
                      <DropdownMenuSeparator className="bg-dark-gray" />
                      <DropdownMenuItem onClick={handleLogout} className="btn-press-subtle cursor-pointer text-red text-xs">
                        <LogOut className="w-3.5 h-3.5 mr-2" /> Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="shrink-0 rounded-full bg-gold-gradient text-black px-4 py-2 text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all"
                >
                  Join
                </Link>
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
