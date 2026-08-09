import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Music,
  ListMusic,
  Trophy,
  AlertTriangle,
  FileText,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/card';

export function ModeratorLayout() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const isModerator = user?.role === 'MODERATOR' || user?.role === 'ADMIN';

  if (!isModerator) {
    return (
      <div className="min-h-screen bg-black-base flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-black-elevated border-dark-gray p-6 text-center">
          <ShieldAlert className="w-12 h-12 text-red mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-text-secondary mb-6">
            You must be an official Deck Salone Moderator or Admin to access this panel.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-gold text-black font-semibold rounded-lg hover:bg-gold-light transition"
          >
            Return to Homepage
          </button>
        </Card>
      </div>
    );
  }

  const navItems = [
    { label: 'Overview', path: '/moderator', icon: LayoutDashboard, end: true },
    { label: 'Mix Management', path: '/moderator/mixes', icon: Music },
    { label: 'Official Playlists', path: '/moderator/playlists', icon: ListMusic },
    { label: 'DJ Rankings', path: '/moderator/rankings', icon: Trophy },
    { label: 'Community Reports', path: '/moderator/reports', icon: AlertTriangle },
    { label: 'Audit Trail Log', path: '/moderator/logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-black-base text-text-primary">
      {/* Top Banner Header */}
      <div className="bg-black-surface border-b border-dark-gray py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-gold animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  Moderator Console
                </h1>
                <span className="bg-gold/20 text-gold border border-gold/40 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                  ⚙️ Moderator
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Content & Community Management Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-text-muted bg-black-elevated px-3 py-1.5 rounded-lg border border-dark-gray">
            <span>Logged in as:</span>
            <span className="text-gold font-medium">{user?.name || user?.username}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="bg-black-elevated border-b border-dark-gray overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-gold text-gold bg-gold/5'
                      : 'border-transparent text-text-secondary hover:text-white hover:border-dark-gray'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Main Content View */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24">
        <Outlet />
      </div>
    </div>
  );
}

export default ModeratorLayout;
