import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Heart,
  Radio,
  Calendar,
  Settings,
  Bell,
  Music2,
  LogOut,
  Smartphone,
  ChevronLeft,
  Headphones,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import SEOHead from '@/components/SEOHead';
import { useUserRole } from '@/hooks/useUserRole';

interface MenuItem {
  label: string;
  description: string;
  icon: React.ElementType;
  path: string;
  djOnly?: boolean;
}

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  const { isDj } = useUserRole();
  const isNativeApp = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());

  const baseItems: MenuItem[] = [
    {
      label: 'Profile',
      description: 'Manage your public profile',
      icon: User,
      path: isDj ? '/dashboard/profile' : '/user/profile',
    },
    {
      label: 'Likes',
      description: 'Mixes and DJs you liked',
      icon: Heart,
      path: isDj ? '/dashboard/mixes' : '/user/activity',
    },
    {
      label: 'Playlists',
      description: 'Official & curated playlists',
      icon: Radio,
      path: isDj ? '/dashboard/sets' : '/playlists',
    },
    {
      label: 'Bookings',
      description: 'Event bookings & requests',
      icon: Calendar,
      path: isDj ? '/dashboard/bookings' : '/user/bookings',
    },
    {
      label: 'Settings',
      description: 'Account & app preferences',
      icon: Settings,
      path: isDj ? '/dashboard/settings' : '/user/settings',
    },
    {
      label: 'Notifications',
      description: 'Alerts & messages',
      icon: Bell,
      path: '/user/notifications',
    },
  ];

  const djItems: MenuItem[] = [
    {
      label: 'My Mixes',
      description: 'Uploads & analytics',
      icon: Music2,
      path: '/dashboard/mixes',
      djOnly: true,
    },
    {
      label: 'My Events',
      description: 'Manage your events',
      icon: Headphones,
      path: '/dashboard/events',
      djOnly: true,
    },
  ];

  const items = [...baseItems, ...(isDj ? djItems : [])];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-[100dvh] bg-black pb-24 md:pb-8">
      <SEOHead title="Account — Deck Salone" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gold/10 bg-black/95 backdrop-blur-2xl">
        <div className="flex items-center h-14 sm:h-16 px-4 sm:px-6 gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gold/10 text-gold transition-colors shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-base sm:text-lg font-black uppercase tracking-tight text-text-primary">
            Account
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 max-w-lg mx-auto space-y-6">
        {/* User Summary */}
        {isAuthenticated && user && (
          <div className="flex items-center gap-4 rounded-2xl bg-black-surface border border-gold/20 p-4">
            <div className="w-14 h-14 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">
                {user.djProfile?.stageName || user.name || user.username || user.email}
              </p>
              <p className="text-xs text-gold uppercase tracking-wider font-semibold mt-0.5">
                {user.role}
              </p>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <section className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center gap-4 rounded-xl bg-black-surface border border-white/5 hover:border-gold/40 p-4 transition-all active:scale-[0.98] group"
            >
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0 group-hover:bg-gold/20 transition-colors">
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">
                  {item.label}
                </p>
                <p className="text-xs text-text-muted mt-0.5 truncate">{item.description}</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-text-muted rotate-180 shrink-0" />
            </Link>
          ))}

          {/* Install App */}
          {!isNativeApp && (
            <Link
              to="/install"
              className="flex items-center gap-4 rounded-xl bg-black-surface border border-white/5 hover:border-gold/40 p-4 transition-all active:scale-[0.98] group"
            >
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0 group-hover:bg-gold/20 transition-colors">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary group-hover:text-gold transition-colors">
                  Install App
                </p>
                <p className="text-xs text-text-muted mt-0.5 truncate">Add to Home Screen</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-text-muted rotate-180 shrink-0" />
            </Link>
          )}
        </section>

        {/* Logout */}
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 rounded-xl bg-red/5 border border-red/20 hover:border-red/40 hover:bg-red/10 p-4 transition-all active:scale-[0.98] group"
          >
            <div className="w-10 h-10 rounded-xl bg-red/10 border border-red/20 flex items-center justify-center text-red shrink-0 group-hover:bg-red/20 transition-colors">
              <LogOut className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-red">Logout</p>
              <p className="text-xs text-text-muted mt-0.5">Sign out of your account</p>
            </div>
          </button>
        )}
      </main>
    </div>
  );
}
