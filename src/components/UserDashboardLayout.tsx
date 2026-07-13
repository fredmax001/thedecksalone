import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarCheck,
  MessageSquare,
  Users,
  Activity,
  Bell,
  User,
  Settings,
  LogOut,
  Search,
  ChevronRight,
  Home,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore } from '@/stores/playerStore';
import MobileTabBar from '@/components/MobileTabBar';
import NotificationBell from '@/components/NotificationBell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: CalendarCheck, label: 'My Bookings', path: '/user/bookings' },
  { icon: MessageSquare, label: 'Messages', path: '/user/messages' },
  { icon: Users, label: 'Following', path: '/user/following' },
  { icon: Activity, label: 'My Activity', path: '/user/activity' },
  { icon: Bell, label: 'Notifications', path: '/user/notifications' },
  { icon: User, label: 'Profile', path: '/user/profile' },
  { icon: Settings, label: 'Settings', path: '/user/settings' },
];

export default function UserDashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const displayName = user?.username || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.djProfile?.avatar || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  const isActive = (path: string) => {
    if (path === '/user/dashboard') return location.pathname === '/user/dashboard';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidth = collapsed ? '72px' : '260px';

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const active = isActive(item.path);
    const Icon = item.icon;

    return (
      <Link
        to={item.path}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
          active
            ? 'bg-gold/10 text-gold'
            : 'text-text-secondary hover:text-text-primary hover:bg-black-elevated'
        )}
      >
        <div className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
          active ? 'bg-gold/20' : 'bg-transparent group-hover:bg-black-surface'
        )}>
          <Icon className="w-5 h-5" />
        </div>
        {!collapsed && (
          <span className="text-sm font-medium flex-1">{item.label}</span>
        )}
        {!collapsed && active && (
          <ChevronRight className="w-4 h-4 text-gold/60" />
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <Link to="/" className={cn(
        'flex items-center gap-3 px-4 pt-6 pb-4 hover:opacity-80 transition-opacity',
        collapsed && 'justify-center px-2'
      )}>
        <img
          src="/logo.png"
          alt="Deck Salone"
          className="h-10 w-auto object-contain flex-shrink-0"
        />
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Fan Space</p>
          </div>
        )}
      </Link>

      {/* User Profile Mini */}
      <div className={cn(
        'px-4 py-4 border-b border-dark-gray',
        collapsed && 'px-2 flex justify-center'
      )}>
        <div className={cn(
          'flex items-center gap-3',
          collapsed && 'flex-col gap-1'
        )}>
          <Avatar className="w-10 h-10 border-2 border-gold/30">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-gold/20 text-gold text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
              <p className="text-xs text-text-muted truncate">Fan Account</p>
            </div>
          )}
        </div>
      </div>

      {/* Back to Discover */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <Link
            to="/discover"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-black-elevated transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Back to Discover</span>
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto py-4 space-y-1', collapsed ? 'px-2' : 'px-3')}>
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </nav>

      {/* Bottom: Logout */}
      <div className={cn('border-t border-dark-gray p-4', collapsed && 'px-2 flex justify-center')}>
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 text-text-muted hover:text-red transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 h-screen border-r border-dark-gray transition-all duration-300 z-40 bg-black"
        style={{ width: sidebarWidth }}
      >
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300 ml-0 lg:ml-[72px] xl:ml-[260px]"
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-dark-gray">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Left: Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-text-muted hover:text-text-primary transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3 h-3 text-text-muted" />
              <Link to="/user/dashboard" className="text-text-muted hover:text-text-primary transition-colors">
                Dashboard
              </Link>
              {location.pathname !== '/user/dashboard' && (
                <>
                  <ChevronRight className="w-3 h-3 text-text-muted" />
                  <span className="text-gold capitalize">
                    {location.pathname.replace('/user/', '').replace(/-/g, ' ')}
                  </span>
                </>
              )}
            </div>

            {/* Center: Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <Input
                  placeholder="Search bookings, DJs, events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 bg-black-elevated border-dark-gray text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:ring-gold/20"
                />
              </div>
            </div>

            {/* Right: Notifications + Profile */}
            <div className="flex items-center gap-3">
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-9 px-2 hover:bg-black-elevated">
                    <Avatar className="w-7 h-7 border border-gold/30">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-gold/20 text-gold text-[10px] font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-sm text-text-primary">{displayName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black-surface border-dark-gray">
                  <DropdownMenuItem asChild>
                    <Link to="/user/profile" className="cursor-pointer">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/user/dashboard" className="cursor-pointer">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/user/settings" className="cursor-pointer">Account Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-dark-gray" />
                  <DropdownMenuItem asChild>
                    <Link to="/help" className="cursor-pointer">Support</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-dark-gray" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main
          className={cn(
            'flex-1 p-4 lg:p-6 overflow-y-auto transition-all duration-300',
            currentTrack ? 'pb-40 lg:pb-6' : 'pb-20 lg:pb-6'
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileTabBar items={navItems} />
    </div>
  );
}
