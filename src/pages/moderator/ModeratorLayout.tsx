import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Music,
  ListMusic,
  Trophy,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Menu,
  ChevronsLeft,
  LogOut,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';

export function ModeratorLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-text-primary flex">
      {/* ─── Sidebar ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0A0A0A] border-r border-white/[0.06] transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0 md:relative md:translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f4e059] flex items-center justify-center shadow-[0_0_15px_rgba(244,224,89,0.3)]">
                <ShieldAlert className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-wide">Moderator</h1>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Content & Community</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={closeSidebarOnMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#f4e059]/10 text-[#f4e059] border border-[#f4e059]/20'
                        : 'text-text-muted hover:bg-white/[0.05] hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <div className="w-8 h-8 rounded-full bg-[#f4e059]/15 flex items-center justify-center text-[#f4e059] text-xs font-bold">
                {(user?.name || user?.username || user?.email || 'M').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.name || user?.username || user?.email || 'Moderator'}</p>
                <p className="text-[10px] text-[#f4e059] uppercase tracking-wider">Moderator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-3 flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Mobile Overlay ─── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── Main Content ─── */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-[#080808]/95 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 rounded-xl text-text-muted hover:bg-white/[0.06] hover:text-white transition-all"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <ChevronsLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#f4e059] hidden sm:block" />
            <h2 className="text-base font-bold text-white tracking-wide">Moderator Console</h2>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 pb-24 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default ModeratorLayout;
