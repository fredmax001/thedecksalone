import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Music,
  ListMusic,
  Trophy,
  AlertTriangle,
  FileText,
  ShieldAlert,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';


export function ModeratorLayout() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const isModerator = user?.role === 'MODERATOR' || user?.role === 'ADMIN';

  if (!isModerator) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#101010] border border-white/5 p-6 text-center rounded-2xl">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-text-muted mb-6">
            You must be an official Deck Salone Moderator or Admin to access this panel.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-[#f4e059] text-black font-semibold rounded-lg hover:bg-[#f4e059]/90 transition"
          >
            Return to Homepage
          </button>
        </div>
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
    <div className="min-h-screen bg-[#080808] text-text-primary">
      {/* Top Banner Header */}
      <div className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-xl border-b border-white/[0.08] py-3 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f4e059] flex items-center justify-center shadow-[0_0_15px_rgba(244,224,89,0.3)]">
              <ShieldAlert className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  Moderator Console
                </h1>
              </div>
              <p className="text-xs text-text-muted">
                Content & Community Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-[#f4e059]/10 border border-[#f4e059]/30 text-[#f4e059] px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide">
              {user?.name || user?.username || 'Moderator'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="bg-[#0C0C0C] border-b border-white/[0.06] overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center px-4 sm:px-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-b-2 border-[#f4e059] text-[#f4e059] bg-[#f4e059]/5'
                      : 'border-b-2 border-transparent text-text-muted hover:text-white hover:border-white/20'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span className="uppercase tracking-wider">{item.label}</span>
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
