import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
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

const navLinks = [
  { label: 'Discover', path: '/discover' },
  { label: 'Rankings', path: '/rankings' },
  { label: 'Mixes', path: '/mixes' },
  { label: 'Events', path: '/events' },
  { label: 'Battles', path: '/battles' },
  { label: 'Request DJ', path: '/request-dj' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  const isDj = user?.role === 'DJ';
  const dashboardPath = isDj ? '/dashboard' : '/user/dashboard';
  const profilePath = isDj ? '/dashboard/profile' : '/user/profile';
  const settingsPath = isDj ? '/dashboard/settings' : '/user/settings';
  const displayName = user?.djProfile?.stageName || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.djProfile?.avatar || '';
  const initials = displayName.slice(0, 2).toUpperCase();

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-16 lg:h-28 overflow-hidden ${
        isScrolled
          ? 'glass-nav border-b border-white/5 dark:border-white/5 shadow-nav'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-container mx-auto h-full flex items-center justify-between px-2 sm:px-4 lg:px-8">
        {/* Logo — kept at current rendered size, pushed slightly left on mobile */}
        <Link to="/" className="flex items-center shrink-0 -ml-2 sm:-ml-1 lg:ml-0">
          {/* Mobile icon logo */}
          <img
            src="/logo-icon.png"
            alt="Deck Salone"
            className="lg:hidden h-9 w-auto object-contain"
          />
          {/* Desktop wordmark logo */}
          <img
            src="/logo-web.png"
            alt="Deck Salone"
            className="hidden lg:block h-10 w-auto object-contain"
          />
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative text-sm font-medium uppercase tracking-[0.05em] transition-colors duration-300 py-1 ${
                location.pathname === link.path
                  ? 'text-gold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            className="text-text-secondary hover:text-gold transition-colors p-2"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <ThemeToggle className="hidden sm:flex" />

          {isAuthenticated && user && (
            <div className="hidden lg:flex">
              <NotificationBell />
            </div>
          )}

          {/* Mobile hamburger menu (lg:hidden) */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="lg:hidden text-text-secondary hover:text-gold transition-colors p-2"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-black-surface border-l border-dark-gray w-[280px] sm:w-[320px]">
              <SheetHeader className="pb-4">
                <SheetTitle className="text-text-primary text-sm font-semibold uppercase tracking-wider">Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.path}>
                    <Link
                      to={link.path}
                      className={`rounded-lg px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors ${
                        location.pathname === link.path
                          ? 'bg-white/10 text-gold'
                          : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}

                <div className="my-3 border-t border-dark-gray" />

                {isAuthenticated && user ? (
                  <>
                    <div className="px-4 py-2">
                      <NotificationBell />
                    </div>
                    <SheetClose asChild>
                      <Link
                        to={profilePath}
                        className="rounded-lg px-4 py-3 text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors"
                      >
                        Profile
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to={dashboardPath}
                        className="rounded-lg px-4 py-3 text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors"
                      >
                        Dashboard
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to={settingsPath}
                        className="rounded-lg px-4 py-3 text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary transition-colors"
                      >
                        Settings
                      </Link>
                    </SheetClose>
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

          {isAuthenticated && user ? (
            <>
              {/* Desktop actions */}
              <div className="hidden lg:flex items-center gap-3">
                {isDj ? (
                  <>
                    <Link
                      to={dashboardPath}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-primary hover:text-gold transition-colors"
                    >
                      <User className="w-4 h-4" />
                      {displayName}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="inline-flex items-center px-5 py-2 border border-dark-gray text-text-secondary text-sm font-medium rounded-full hover:bg-medium-gray transition-colors"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-primary hover:text-gold transition-colors">
                        <Avatar className="w-7 h-7 border border-gold/30">
                          <AvatarImage src={avatarUrl} alt={displayName} />
                          <AvatarFallback className="bg-gold/20 text-gold text-[10px] font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden md:inline">{displayName}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black-surface border-dark-gray">
                      <DropdownMenuItem asChild>
                        <Link to={profilePath} className="cursor-pointer">Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={dashboardPath} className="cursor-pointer">Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={settingsPath} className="cursor-pointer">Account Settings</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/help" className="cursor-pointer">Support</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-dark-gray" />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red">
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Mobile profile avatar dropdown */}
              <div className="lg:hidden flex items-center gap-2">
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-center rounded-full focus:outline-none">
                      <Avatar className="w-9 h-9 border border-gold/30">
                        <AvatarImage src={avatarUrl} alt={displayName} />
                        <AvatarFallback className="bg-gold/20 text-gold text-xs font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-black-surface border-dark-gray">
                    <DropdownMenuItem asChild>
                      <Link to={profilePath} className="cursor-pointer">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={dashboardPath} className="cursor-pointer">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={settingsPath} className="cursor-pointer">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-dark-gray" />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden lg:inline-flex items-center px-6 py-2.5 bg-gold-gradient text-black text-sm font-semibold uppercase tracking-wide rounded-full hover:scale-[1.02] hover:brightness-110 transition-all duration-200"
              >
                Join as DJ
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
