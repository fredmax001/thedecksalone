import { type FormEvent, useEffect, useState } from 'react';
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
  Moon,
  Radio,
  Search,
  Sparkles,
  Sun,
  Trophy,
  Upload,
  Users,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';
import NotificationBell from '@/components/NotificationBell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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

const browseItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Discover', path: '/discover', icon: Flame },
  { label: 'Ranking', path: '/rankings', icon: BarChart3 },
  { label: 'Mix Hub', path: '/mixes', icon: ListMusic },
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

function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('deck_salone_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('deck_salone_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="p-2 rounded-full border border-gold/25 bg-black-surface/80 hover:bg-gold/15 hover:border-gold/50 text-gold transition-all shrink-0 flex items-center justify-center shadow-sm"
      aria-label="Toggle theme mode"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-gold hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-4 h-4 text-gold hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const { user, isAuthenticated, logout } = useAuthStore();
  const isDj = user?.role === 'DJ';
  const subscriptionTier = user?.djProfile?.subscriptionTier || 'free';
  const shouldShowGetPro = isDj && subscriptionTier === 'free';
  const displayName = user?.djProfile?.stageName || user?.name || user?.username || user?.email?.split('@')[0] || 'Account';
  const avatarUrl = user?.djProfile?.avatar || user?.avatar || '';
  const profilePath = isDj ? '/dashboard/profile' : '/user/profile';
  const dashboardPath = isDj ? '/dashboard' : '/user/dashboard';
  const isNativeApp = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get('q') || '').trim();
    if (query) {
      navigate(`/discover?search=${encodeURIComponent(query)}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-[100dvh] bg-black text-text-primary">
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
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gold">Browse</p>
            <div className="space-y-1">
              {browseItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 group relative overflow-hidden',
                    isActive(item.path)
                      ? 'bg-gold/10 text-gold border border-gold/20 shadow-[0_0_16px_rgba(212,162,74,0.1)]'
                      : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                  )}
                >
                  {isActive(item.path) && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gold rounded-r-full shadow-[0_0_8px_rgba(212,162,74,0.8)]" />
                  )}
                  <item.icon className={cn('h-5 w-5 shrink-0 transition-colors', isActive(item.path) ? 'text-gold' : 'text-gold/60 group-hover:text-gold')} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* DJ Studio — only for DJ role */}
          {isDj && (
            <div className="border-t border-gold/10 pt-8">
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-gold/70 px-4">DJ Studio</p>
              <div className="space-y-1">
                {studioItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 group relative overflow-hidden',
                      isActive(item.path)
                        ? 'bg-gold/10 text-gold border border-gold/20'
                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                    )}
                  >
                    {isActive(item.path) && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gold rounded-r-full shadow-[0_0_8px_rgba(212,162,74,0.8)]" />
                    )}
                    <item.icon className="h-5 w-5 shrink-0 text-gold/60 group-hover:text-gold transition-colors" />
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

            {/* Pro Upgrade Banner */}
            {isAuthenticated && shouldShowGetPro && (
              <div className="mt-4 mx-2 rounded-xl border border-gold/25 bg-gold/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-gold shrink-0" />
                  <p className="text-xs font-extrabold text-gold uppercase tracking-wide">Go Pro</p>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed mb-3">
                  Unlock Pro tools — analytics, priority bookings & more.
                </p>
                <Link
                  to="/dashboard/subscription"
                  className="block w-full text-center py-2 rounded-lg bg-gold text-black text-xs font-extrabold uppercase tracking-wide hover:bg-gold/90 transition-colors"
                >
                  Upgrade Now
                </Link>
              </div>
            )}
          </div>
        </nav>
      </aside>

      <div className="min-h-[100dvh] md:ml-[260px] lg:ml-[300px]">
        <header className="sticky top-0 z-30 border-b border-gold/10 bg-black/95 backdrop-blur-2xl shadow-[0_1px_20px_rgba(0,0,0,0.5)] pt-[env(safe-area-inset-top,0px)]">
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6 lg:px-10">
            <Link to="/" className="flex shrink-0 items-center md:hidden">
              <img src="/logo-mobile.png?v=3" alt="Deck Salone" className="h-9 w-auto object-contain" />
            </Link>

            {shouldShowGetPro && (
              <Link
                to="/dashboard/subscription"
                className="shrink-0 rounded-full bg-gold-gradient text-black px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide transition-colors"
              >
                Get Pro
              </Link>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto shrink-0 text-text-secondary hover:text-gold md:hidden">
                  <Search className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[calc(100vw-2rem)] border-dark-gray bg-black-surface p-3 z-50">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
                  <input
                    name="q"
                    type="search"
                    autoFocus
                    placeholder="Search DJs, mixes, genres"
                    className="h-11 w-full rounded-full border border-white/10 bg-white/10 py-2.5 pl-11 pr-4 text-xs font-medium text-text-primary outline-none placeholder:text-text-muted focus:border-gold/50"
                  />
                </form>
              </DropdownMenuContent>
            </DropdownMenu>

            <form onSubmit={handleSearch} className="relative mx-auto hidden w-full max-w-xl md:block">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
              <input
                name="q"
                type="search"
                placeholder="Search DJs, mixes, events..."
                className="h-10 w-full rounded-full border border-white/10 bg-black-surface/80 py-2.5 pl-10 pr-5 text-sm font-medium text-text-primary outline-none placeholder:text-text-muted focus:border-gold/40 focus:shadow-[0_0_12px_rgba(212,162,74,0.12)] transition-all"
              />
            </form>

            <ThemeToggle />

            {isAuthenticated && (
              <NotificationBell className="shrink-0" />
            )}

            {isAuthenticated ? (
              <div className="shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-center rounded-full p-0.5 focus:outline-none hover:ring-2 hover:ring-gold/40 transition-all">
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-gold/40">
                        <AvatarImage src={avatarUrl || '/default-avatar.jpg'} alt={displayName} />
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
                      <Link to={profilePath} className="cursor-pointer text-xs">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={dashboardPath} className="cursor-pointer text-xs">Dashboard</Link>
                    </DropdownMenuItem>
                    {isDj && (
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="cursor-pointer text-xs font-semibold text-gold flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5" /> DJ Studio
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to={isDj ? '/dashboard/settings' : '/user/settings'} className="cursor-pointer text-xs">Settings</Link>
                    </DropdownMenuItem>
                    {!isNativeApp && (
                      <DropdownMenuItem asChild>
                        <Link to="/install" className="cursor-pointer text-xs text-gold font-semibold flex items-center gap-1.5">
                          Install App
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-dark-gray" />
                    <DropdownMenuItem asChild>
                      <Link to="/about" className="cursor-pointer text-xs text-text-secondary flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" /> About Deck Salone
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/help" className="cursor-pointer text-xs text-text-secondary flex items-center gap-1.5">
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
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red text-xs">
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
    </div>
  );
}
