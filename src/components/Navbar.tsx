import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, LogOut, Menu, Sparkles, Smartphone, Crown } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import SearchModal from '@/components/SearchModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetTrigger,
} from '@/components/ui/sheet';

import { useFeedStats } from '@/hooks/useRecommendations';
import { getMediaUrl } from '@/lib/api';

const navLinks = [
  { label: 'Feed', path: '/feed', showBadge: true },
  { label: 'Discover', path: '/discover' },
  { label: 'Rankings', path: '/rankings' },
  { label: 'Mixes', path: '/mixes' },
  { label: 'Playlists', path: '/playlists' },
  { label: 'Events', path: '/events' },
  { label: 'Battles', path: '/battles' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Request DJ', path: '/request-dj' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  const isModerator = user?.role === 'MODERATOR';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isFinanceAdmin = user?.role === 'FINANCE_ADMIN';
  const isSupportAdmin = user?.role === 'SUPPORT_ADMIN';
  const isVerificationAdmin = user?.role === 'VERIFICATION_ADMIN';
  const isAdmin = isSuperAdmin || isFinanceAdmin || isSupportAdmin || isVerificationAdmin;
  const isDj = user?.role === 'DJ';

  const roleDashboardMap: Record<string, string> = {
    MODERATOR: '/moderator',
    SUPER_ADMIN: '/admin',
    ADMIN: '/admin',
    FINANCE_ADMIN: '/finance',
    SUPPORT_ADMIN: '/support',
    VERIFICATION_ADMIN: '/verification',
    DJ: '/dashboard',
    USER: '/user/dashboard',
  };
  const dashboardPath = roleDashboardMap[user?.role || 'USER'] || '/discover';
  const profilePath = isAdmin ? dashboardPath : isDj ? '/dashboard/profile' : '/user/profile';
  const settingsPath = isAdmin ? dashboardPath : isDj ? '/dashboard/settings' : '/user/settings';
  const displayName = user?.djProfile?.stageName || user?.name || user?.email?.split('@')[0] || (isModerator ? 'Moderator' : isAdmin ? 'Admin' : 'User');
  const avatarUrl = getMediaUrl(user?.djProfile?.avatar || user?.avatar) || '/default-avatar.jpg';
  const initials = displayName.slice(0, 2).toUpperCase();
  const { data: feedStats } = useFeedStats();
  const newDropsCount = feedStats?.totalNewDrops || 0;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'glass-nav border-b border-white/10 shadow-nav'
          : 'bg-black/90 backdrop-blur-md border-b border-white/5'
      }`}
    >
      {/* Safe area top padding for native status bar */}
      <div className="w-full pt-[env(safe-area-inset-top,0px)] bg-black/95">
        <div className="max-w-container mx-auto h-14 sm:h-16 lg:h-20 flex items-center justify-between px-3 sm:px-4 lg:px-8">
          {/* Logo */}
          <Link to={isAdmin ? dashboardPath : '/'} className="flex items-center shrink-0">
            {/* Mobile icon logo */}
            <img
              src="/logo-mobile.png?v=3"
              alt="Deck Salone"
              className="lg:hidden h-9 w-auto object-contain"
            />
            {/* Desktop wordmark logo */}
            <img
              src="/logo-web.png?v=3"
              alt="Deck Salone"
              className="hidden lg:block h-10 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              const hasBadge = link.showBadge && newDropsCount > 0;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative text-xs font-bold uppercase tracking-[0.08em] transition-colors duration-300 py-1 flex items-center gap-1.5 ${
                    isActive ? 'text-gold' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span>{link.label}</span>
                  {hasBadge && (
                    <span className="px-1.5 py-0.2 rounded-full bg-gold text-black text-[9px] font-black tracking-tighter shadow-sm animate-pulse">
                      +{newDropsCount > 99 ? '99+' : newDropsCount}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent rounded-full shadow-[0_0_8px_rgba(244,224,89,0.8)]" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Actions — Desktop & Mobile */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
            {!isAuthenticated && (
              <Link
                to="/register"
                className="lg:hidden flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold-gradient text-black text-[10px] font-extrabold uppercase tracking-wide shrink-0"
                style={{ boxShadow: '0 0 10px rgba(244,224,89,0.3)' }}
              >
                <Sparkles className="w-3 h-3" />
                Join
              </Link>
            )}

            {/* Global Search Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-black-surface/80 border border-white/10 text-text-muted hover:text-gold hover:border-gold/40 transition-all shadow-inner"
              aria-label="Search"
            >
              <Search className="w-4 h-4 text-gold" />
            </button>

            {isModerator && (
              <Link
                to="/moderator"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-gold text-xs font-extrabold uppercase tracking-wider hover:bg-amber-500/25 transition-all shadow-[0_0_12px_rgba(244,224,89,0.2)]"
              >
                ⚙️ Moderator Console
              </Link>
            )}

            {(isSuperAdmin || isFinanceAdmin || isSupportAdmin || isVerificationAdmin) && (
              <Link
                to={dashboardPath}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gold/15 border border-gold/40 text-gold text-xs font-extrabold uppercase tracking-wider hover:bg-gold/25 transition-all shadow-[0_0_12px_rgba(244,224,89,0.2)]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isSuperAdmin ? 'Admin Console' : isFinanceAdmin ? 'Finance Console' : isSupportAdmin ? 'Support Console' : 'Verification Console'}
              </Link>
            )}

            {/* Theme Toggle */}
            <ThemeToggle className="flex" />

            {/* Notification Bell */}
            <NotificationBell />

            {/* Profile Avatar Dropdown */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center rounded-full p-0.5 focus:outline-none hover:ring-2 hover:ring-gold/40 transition-all">
                    <Avatar className="w-8 h-8 sm:w-9 sm:h-9 border-2 border-gold/50">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="bg-gold/20 text-gold text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black-surface border-dark-gray w-52 shadow-2xl z-50">
                  <div className="px-3 py-2 border-b border-dark-gray">
                    <p className="text-xs font-bold text-text-primary truncate">{displayName}</p>
                    <p className="text-[10px] text-gold uppercase tracking-wider font-semibold">{user?.role || 'Member'}</p>
                  </div>
                  {user?.role === 'MODERATOR' && (
                    <DropdownMenuItem asChild>
                      <Link to="/moderator" className="cursor-pointer font-bold text-gold text-xs flex items-center">
                        ⚙️ Moderator Console
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to={dashboardPath} className="cursor-pointer text-xs font-bold text-gold">
                        {isSuperAdmin ? 'Admin Dashboard' : isFinanceAdmin ? 'Finance Dashboard' : isSupportAdmin ? 'Support Dashboard' : 'Verification Dashboard'}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {!isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to={profilePath} className="cursor-pointer text-xs">Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={dashboardPath} className="cursor-pointer text-xs">Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={isDj ? '/dashboard/subscription' : '/user/subscription'} className="cursor-pointer text-xs font-bold text-gold flex items-center">
                          <Crown className="w-3.5 h-3.5 mr-2" /> Membership & Pro
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={settingsPath} className="cursor-pointer text-xs">Settings</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/install" className="cursor-pointer font-semibold text-gold text-xs flex items-center">
                      <Smartphone className="w-3.5 h-3.5 mr-2" /> Install App
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-dark-gray" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red text-xs">
                    <LogOut className="w-3.5 h-3.5 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/login"
                className="hidden lg:inline-flex items-center px-6 py-2.5 bg-gold-gradient text-black text-sm font-semibold uppercase tracking-wide rounded-full hover:scale-[1.02] hover:brightness-110 transition-all duration-200"
              >
                Join as DJ
              </Link>
            )}

            {/* Mobile menu sheet for navigation links */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className="lg:hidden text-text-secondary hover:text-gold transition-colors p-2 flex items-center justify-center"
                  aria-label="Open menu"
                >
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-black-surface border-l border-dark-gray w-[280px] sm:w-[320px] z-50">
                <SheetHeader className="pb-4">
                  <SheetTitle className="text-text-primary text-sm font-semibold uppercase tracking-wider">Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => {
                    const isActive = location.pathname === link.path;
                    const hasBadge = link.showBadge && newDropsCount > 0;
                    return (
                      <SheetClose asChild key={link.path}>
                        <Link
                          to={link.path}
                          className={`rounded-lg px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors flex items-center justify-between ${
                            isActive
                              ? 'bg-white/10 text-gold font-bold'
                              : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                          }`}
                        >
                          <span>{link.label}</span>
                          {hasBadge && (
                            <span className="px-2 py-0.5 rounded-full bg-gold text-black text-[10px] font-black tracking-wider">
                              +{newDropsCount > 99 ? '99+' : newDropsCount} NEW
                            </span>
                          )}
                        </Link>
                      </SheetClose>
                    );
                  })}

                  <div className="my-3 border-t border-dark-gray" />

                  {isAuthenticated && user ? (
                    <>
                      {!isAdmin && (
                        <SheetClose asChild>
                          <Link
                            to={profilePath}
                            className="rounded-lg px-4 py-3 text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors"
                          >
                            Profile
                          </Link>
                        </SheetClose>
                      )}
                      <SheetClose asChild>
                        <Link
                          to={dashboardPath}
                          className="rounded-lg px-4 py-3 text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors"
                        >
                          {isAdmin ? 'Dashboard' : 'Dashboard'}
                        </Link>
                      </SheetClose>
                      {!isAdmin && (
                        <SheetClose asChild>
                          <Link
                            to={settingsPath}
                            className="rounded-lg px-4 py-3 text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors"
                          >
                            Settings
                          </Link>
                        </SheetClose>
                      )}
                      <button
                        onClick={handleLogout}
                        className="rounded-lg px-4 py-3 text-sm font-medium text-red hover:bg-white/5 transition-colors text-left"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <SheetClose asChild>
                      <Link
                        to="/login"
                        className="rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide text-black bg-gold-gradient hover:brightness-110 transition-all text-center"
                      >
                        Join as DJ
                      </Link>
                    </SheetClose>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </nav>
  );
}
