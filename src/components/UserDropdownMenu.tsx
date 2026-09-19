import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  LayoutDashboard,
  Settings,
  Info,
  HelpCircle,
  Smartphone,
  LogOut,
  UserPlus,
  X,
  Crown,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUserRole } from '@/hooks/useUserRole';
import { getAvatarImageUrl } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface UserDropdownMenuProps {
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export default function UserDropdownMenu({ align = 'end', className }: UserDropdownMenuProps) {
  const navigate = useNavigate();
  const { user, savedAccounts, switchAccount, removeSavedAccount, logout } = useAuthStore();
  const { isDj } = useUserRole();

  const [isStandaloneOrNative, setIsStandaloneOrNative] = useState(true);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect if already installed / standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);
    const isNative = Boolean((window as any).Capacitor?.isNativePlatform?.());
    setIsStandaloneOrNative(isStandalone || isNative);

    // Detect mobile platform (Android / iOS)
    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    setIsMobileDevice(isMobile);
  }, []);

  if (!user) return null;

  const displayName =
    user?.djProfile?.stageName || user?.name || user?.username || user?.email?.split('@')[0] || 'Account';
  const avatarUrl = getAvatarImageUrl(user?.djProfile?.avatar || user?.avatar);
  const isModerator = user.role === 'MODERATOR' || user.role === 'ADMIN';
  const subscriptionTier = user?.djProfile?.subscriptionTier || 'free';
  const isLegend = subscriptionTier === 'legend' || subscriptionTier === 'pro_plus';
  const isPro = subscriptionTier === 'pro';

  // Role-aware paths
  const profilePath = isDj ? '/dashboard/profile' : '/user/profile';
  const dashboardPath = isDj ? '/dashboard' : isModerator ? '/moderator' : '/user/dashboard';
  const settingsPath = isDj ? '/dashboard/settings' : '/user/settings';

  // Filter other accounts stored on device
  const otherAccounts = (savedAccounts || []).filter((acc) => acc.id !== user.id);

  // Install app visibility:
  // Should show for users who do NOT have the app installed yet (on mobile / PWA installable),
  // and should NOT show if already running in standalone/native or on standard desktop web layout.
  const shouldShowInstallApp = !isStandaloneOrNative && isMobileDevice;

  const handleSwitch = async (accountId: string, accountName: string) => {
    const success = await switchAccount(accountId);
    if (success) {
      toast.success(`Switched account to ${accountName}`);
      navigate('/discover');
    } else {
      toast.error('Could not switch account');
    }
  };

  const handleRemoveAccount = (e: React.MouseEvent, accountId: string, accountName: string) => {
    e.stopPropagation();
    e.preventDefault();
    removeSavedAccount(accountId);
    toast.info(`Removed ${accountName} from saved accounts`);
  };

  const handleLogoutCurrent = () => {
    logout(false);
    toast.success('Signed out');
    navigate('/');
  };

  const handleLogoutAll = () => {
    logout(true);
    toast.success('Signed out of all accounts');
    navigate('/');
  };

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center justify-center rounded-full p-0.5 focus:outline-none hover:ring-2 hover:ring-gold/50 transition-all group relative"
            aria-label="User Account Menu"
          >
            <Avatar
              className={`h-8 w-8 sm:h-9 sm:w-9 border transition-all ${
                isLegend
                  ? 'border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.4)]'
                  : isPro || isDj
                  ? 'border-gold/50 shadow-[0_0_8px_rgba(244,224,89,0.2)]'
                  : 'border-white/20'
              }`}
            >
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-black-surface text-gold font-bold text-xs">
                {(displayName || 'U').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isLegend && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-black rounded-full p-0.5 shadow-sm">
                <Crown className="w-2.5 h-2.5" />
              </span>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={align}
          className="bg-[#0e0e0e] border border-white/10 w-64 p-1.5 shadow-2xl rounded-2xl z-50 text-text-primary animate-fadeIn"
        >
          {/* ── Active User Card ── */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-1.5">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-gold/30 shrink-0">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-gold/10 text-gold text-xs font-bold">
                  {(displayName || 'U').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-text-primary truncate flex items-center gap-1">
                  {displayName}
                  {isLegend && <Crown className="w-3 h-3 text-yellow-400 shrink-0" />}
                </p>
                <p className="text-[11px] text-text-muted truncate mt-0.5">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                    {isDj ? 'DJ Account' : user.role === 'MODERATOR' ? 'Moderator' : 'Fan Account'}
                  </span>
                  {isLegend && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                      VIP
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Switch Account Section ── */}
          <div className="px-1 py-1">
            {otherAccounts.length > 0 && (
              <div className="space-y-1 mb-1.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted px-2 py-1">
                  Switch Account
                </p>
                {otherAccounts.map((acc) => {
                  const accName = acc.djProfile?.stageName || acc.name || acc.username || acc.email.split('@')[0];
                  const accAvatar = getAvatarImageUrl(acc.djProfile?.avatar || acc.avatar);
                  const isAccDj = acc.role === 'DJ';
                  return (
                    <div
                      key={acc.id}
                      onClick={() => handleSwitch(acc.id, accName)}
                      className="group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs hover:bg-white/5 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="w-6 h-6 border border-white/10 shrink-0">
                          <AvatarImage src={accAvatar} />
                          <AvatarFallback className="bg-black text-[9px] text-gold font-bold">
                            {(accName || 'U').slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-text-secondary group-hover:text-text-primary truncate">
                            {accName}
                          </p>
                          <p className="text-[10px] text-text-muted truncate">
                            {isAccDj ? 'DJ' : 'Fan'} • {acc.email}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleRemoveAccount(e, acc.id, accName)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-text-muted hover:text-red hover:bg-white/10 transition-all shrink-0"
                        title="Remove saved account"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add another account */}
            <Link
              to="/login?mode=add_account"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-gold hover:bg-gold/10 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add another account</span>
            </Link>
          </div>

          <DropdownMenuSeparator className="bg-white/10 my-1" />

          {/* ── Standard Navigation Items ── */}
          <div className="space-y-0.5">
            {/* 1. Profile */}
            <DropdownMenuItem asChild>
              <Link
                to={profilePath}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 cursor-pointer transition-all"
              >
                <UserIcon className="w-4 h-4 text-gold" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>

            {/* 2. Dashboard */}
            <DropdownMenuItem asChild>
              <Link
                to={dashboardPath}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 cursor-pointer transition-all"
              >
                <LayoutDashboard className="w-4 h-4 text-gold" />
                <span>Dashboard</span>
              </Link>
            </DropdownMenuItem>

            {/* 3. Settings */}
            <DropdownMenuItem asChild>
              <Link
                to={settingsPath}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 cursor-pointer transition-all"
              >
                <Settings className="w-4 h-4 text-gold" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            {/* 4. About Deck Salone */}
            <DropdownMenuItem asChild>
              <Link
                to="/about"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 cursor-pointer transition-all"
              >
                <Info className="w-4 h-4 text-gold" />
                <span>About Deck Salone</span>
              </Link>
            </DropdownMenuItem>

            {/* 5. Help Center */}
            <DropdownMenuItem asChild>
              <Link
                to="/help"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 cursor-pointer transition-all"
              >
                <HelpCircle className="w-4 h-4 text-gold" />
                <span>Help Center</span>
              </Link>
            </DropdownMenuItem>

            {/* 6. Install App (Conditional) */}
            {shouldShowInstallApp && (
              <DropdownMenuItem asChild>
                <Link
                  to="/install"
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-gold hover:bg-gold/10 cursor-pointer transition-all"
                >
                  <Smartphone className="w-4 h-4 text-gold" />
                  <span>Install App</span>
                </Link>
              </DropdownMenuItem>
            )}
          </div>

          <DropdownMenuSeparator className="bg-white/10 my-1" />

          {/* ── Logout Actions ── */}
          <div className="space-y-0.5">
            <DropdownMenuItem
              onClick={handleLogoutCurrent}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-red hover:bg-red/10 cursor-pointer transition-all"
            >
              <LogOut className="w-4 h-4 text-red" />
              <span>Log out</span>
            </DropdownMenuItem>

            {savedAccounts.length > 1 && (
              <DropdownMenuItem
                onClick={handleLogoutAll}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-red hover:bg-red/10 cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4 text-red" />
                <span>Log out of all accounts ({savedAccounts.length})</span>
              </DropdownMenuItem>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
