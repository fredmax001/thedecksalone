import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import NotificationBell from '@/components/NotificationBell';
import {
  Calendar,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LogOut,
  Music,
  Search,
  Settings,
  Smartphone,
  User,
  Users,
  MessageSquare,
  Zap,
  BarChart3,
  Wallet,
  CreditCard,
  BriefcaseBusiness,
  Megaphone,
  Crown,
  ScanLine,
  ListMusic,
  Camera,
  CalendarDays,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore } from '@/stores/playerStore';
import api from '@/lib/api';
import MobileTabBar from '@/components/MobileTabBar';
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
import { UpgradeModal } from '@/components/UpgradeModal';
import { useUpgradeModalStore } from '@/stores/upgradeModalStore';
import TrialBanner from '@/components/TrialBanner';
import { getAvatarImageUrl } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
  { icon: Calendar, label: 'Bookings', path: '/dashboard/bookings' },
  { icon: MessageSquare, label: 'Messages', path: '/dashboard/messages' },
  { icon: Music, label: 'Mixes', path: '/dashboard/mixes' },
  { icon: ListMusic, label: 'Sets', path: '/dashboard/sets' },
  { icon: Camera, label: 'Photos', path: '/dashboard/photos' },
  { icon: CalendarDays, label: 'Events', path: '/dashboard/events' },
  { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics' },
  { icon: Wallet, label: 'Earnings', path: '/dashboard/earnings' },
  { icon: Users, label: 'Followers', path: '/dashboard/followers' },

  { icon: User, label: 'Profile', path: '/dashboard/profile' },
  { icon: CreditCard, label: 'Subscription', path: '/dashboard/subscription' },
  { icon: BriefcaseBusiness, label: 'Opportunities', path: '/dashboard/opportunities' },
  { icon: Megaphone, label: 'Promotions', path: '/dashboard/campaigns' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const [collapsed, setCollapsed] = useState(false);
  const [manualCollapse, setManualCollapse] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { isDj } = useUserRole();
  const isProPlus = user?.djProfile?.subscriptionTier === 'legend';
  const djProfile = user?.djProfile;
  const djName = djProfile?.stageName || user?.email?.split('@')[0] || 'User';
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string>('');
  const avatarUrl = getAvatarImageUrl(djProfile?.avatar || localAvatarUrl || user?.avatar);
  const initials = djName.slice(0, 2).toUpperCase();

  // Redirect Moderators to Moderator Console
  useEffect(() => {
    if (user?.role === 'MODERATOR') {
      navigate('/moderator', { replace: true });
    }
  }, [user, navigate]);

  // Fetch DJ profile directly if auth store doesn't have avatar yet
  useEffect(() => {
    if (isDj && !djProfile?.avatar) {
      api.get('/djs/me')
        .then((res) => {
          if (res.data.success && res.data.data?.avatar) {
            setLocalAvatarUrl(res.data.data.avatar);
          }
        })
        .catch(() => {}); // 404 means no DJ profile yet
    }
  }, [isDj, djProfile?.avatar]);

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };



  useEffect(() => {
    const handleResize = () => {
      if (!manualCollapse) {
        setCollapsed(window.innerWidth < 1280);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [manualCollapse]);

  // Role guard: only DJs may access the DJ dashboard
  useEffect(() => {
    if (user && !isDj) {
      navigate('/user/dashboard', { replace: true });
    }
  }, [user, isDj, navigate]);

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
          src="/logo-web.png?v=4"
          alt="Deck Salone"
          className="h-10 w-auto object-contain flex-shrink-0"
        />
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">DJ Studio</p>
          </div>
        )}
      </Link>

      {/* DJ Profile Mini */}
      <div className={cn(
        'px-4 py-4 border-b border-dark-gray',
        collapsed && 'px-2 flex justify-center'
      )}>
        <div className={cn(
          'flex items-center gap-3',
          collapsed && 'flex-col gap-1'
        )}>
          <div className="relative">
            <Avatar className={cn(
              "w-10 h-10 border-2 relative z-10",
              djProfile?.subscriptionTier === 'legend' 
                ? "border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]"
                : "border-gold/30"
            )}>
              <AvatarImage src={avatarUrl} alt={djName} />
              <AvatarFallback className="bg-gold/20 text-gold text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {djProfile?.subscriptionTier === 'legend' && (
              <div className="absolute inset-0 rounded-full border border-yellow-400/50 animate-ping opacity-30 z-0" style={{ animationDuration: '3s' }} />
            )}
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate flex items-center gap-1.5">
                {djName}
                {djProfile?.subscriptionTier === 'legend' && (
                  <Crown size={12} className="text-yellow-400 shrink-0" />
                )}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs text-text-muted truncate">
                  {isDj ? 'DJ Account' : 'Fan Account'}
                </p>
                {user?.djProfile?.subscriptionTier === 'legend' && (
                  <span className="flex items-center gap-0.5 px-1.5 py-[1px] rounded bg-yellow-400/20 text-yellow-400 text-[9px] font-bold uppercase tracking-wider border border-yellow-400/30">
                    <Crown className="w-2.5 h-2.5" />
                    Pro+
                  </span>
                )}
                {user?.djProfile?.subscriptionTier === 'pro' && (
                  <span className="flex items-center gap-0.5 px-1.5 py-[1px] rounded bg-gold/20 text-gold text-[9px] font-bold uppercase tracking-wider border border-gold/30">
                    <Zap className="w-2.5 h-2.5" />
                    Pro
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
        className="hidden md:flex flex-col fixed top-0 left-0 h-screen border-r border-dark-gray transition-all duration-300 z-40 bg-black"
        style={{ width: sidebarWidth }}
      >
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden transition-all duration-300 ml-0',
          collapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
        )}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-xl border-b border-dark-gray pt-[env(safe-area-inset-top,0px)]">
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6">
            {/* Left: Sidebar toggle + Breadcrumb */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => {
                  setManualCollapse(true);
                  setCollapsed((c) => !c);
                }}
                className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-black-elevated transition-colors"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
              </button>
              <Link to="/" className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1">
                <img src="/logo-mobile.png?v=4" alt="Home" className="h-6 w-auto lg:hidden object-contain" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <ChevronRight className="w-3 h-3 text-text-muted" />
              <span className="text-text-secondary font-medium">Dashboard</span>
              {location.pathname !== '/dashboard' && (
                <>
                  <ChevronRight className="w-3 h-3 text-text-muted" />
                  <span className="text-gold capitalize truncate max-w-[100px] sm:max-w-none">
                    {location.pathname.replace('/dashboard/', '').replace(/-/g, ' ')}
                  </span>
                </>
              )}
            </div>

            {/* Center: Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <Input
                  placeholder="Search bookings, mixes, messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 bg-black-elevated border-dark-gray text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:ring-gold/20 h-9 text-xs"
                />
              </div>
            </div>

            {/* Right: Notifications + Profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-8 sm:h-9 px-1.5 sm:px-2 hover:bg-black-elevated">
                    <Avatar className="w-7 h-7 border border-gold/30">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-gold/20 text-gold text-[10px] font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-xs font-semibold text-text-primary">{djName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black-surface border-dark-gray w-48 shadow-2xl z-50">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/profile" className="cursor-pointer text-xs">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings" className="cursor-pointer text-xs">Settings</Link>
                  </DropdownMenuItem>
                  {!(typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.())) && (
                    <DropdownMenuItem asChild>
                      <Link to="/install" className="cursor-pointer text-xs text-gold font-semibold flex items-center">
                        <Smartphone className="w-3.5 h-3.5 mr-2" /> Install App
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-dark-gray" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red text-xs">
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
            'flex-1 p-4 md:p-6 transition-all duration-300 space-y-4',
            currentTrack ? 'pb-40 md:pb-24' : 'pb-20 md:pb-6'
          )}
        >
          <TrialBanner />
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

      <MobileTabBar
        items={
          isProPlus
            ? [...navItems, { icon: ScanLine, label: 'Scanner', path: '/dashboard/scanner' }]
            : navItems
        }
      />

      {/* Global Upgrade Modal — triggered from any component via useUpgradeModalStore */}
      <GlobalUpgradeModal />
    </div>
  );
}

function GlobalUpgradeModal() {
  const { isOpen, feature, requiredTier, close } = useUpgradeModalStore();
  return (
    <UpgradeModal
      isOpen={isOpen}
      onClose={close}
      feature={feature}
      requiredTier={requiredTier}
    />
  );
}
