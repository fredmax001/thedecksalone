import { useEffect, Suspense, lazy } from 'react';
import { hideSplashScreen } from '@/lib/splashScreen';
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { initSystemNotifications, syncUnreadSystemNotifications } from '@/lib/systemNotifications';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from './components/Layout';
import DashboardLayout from './components/DashboardLayout';
import UserDashboardLayout from './components/UserDashboardLayout';
import MixPlayer from './components/MixPlayer';
import TermsAcceptanceModal from './components/TermsAcceptanceModal';
import LocationPrompt from './components/LocationPrompt';
import ResumeListeningModal from './components/ResumeListeningModal';

// Lazy loaded pages for better code splitting
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Home = lazy(() => import('./pages/Home'));
const Discover = lazy(() => import('./pages/Discover'));
const Rankings = lazy(() => import('./pages/Rankings'));
const DjProfile = lazy(() => import('./pages/DjProfile'));
const Booking = lazy(() => import('./pages/Booking'));
const MixHub = lazy(() => import('./pages/MixHub'));
const MixDetail = lazy(() => import('./pages/MixDetail'));
const UserPublicProfile = lazy(() => import('./pages/UserPublicProfile'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const HallOfFame = lazy(() => import('./pages/HallOfFame'));
const Battles = lazy(() => import('./pages/Battles'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Help = lazy(() => import('./pages/Help'));
const Blog = lazy(() => import('./pages/Blog'));
const About = lazy(() => import('./pages/About'));
const RequestDj = lazy(() => import('./pages/RequestDj'));
const InstallApp = lazy(() => import('./pages/InstallApp'));
const Feed = lazy(() => import('./pages/Feed'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const Developers = lazy(() => import('./pages/Developers'));

/* ─── Role-Based Admin Dashboards ─── */
const FinanceDashboard = lazy(() => import('./pages/FinanceDashboard'));
const SupportDashboard = lazy(() => import('./pages/SupportDashboard'));
const VerificationDashboard = lazy(() => import('./pages/VerificationDashboard'));

/* ─── Moderator Console pages ─── */
const ModeratorLayout = lazy(() => import('./pages/moderator/ModeratorLayout'));
const ModeratorOverview = lazy(() => import('./pages/moderator/ModeratorOverview'));
const ModeratorMixes = lazy(() => import('./pages/moderator/ModeratorMixes'));
const ModeratorPlaylists = lazy(() => import('./pages/moderator/ModeratorPlaylists'));
const ModeratorRankings = lazy(() => import('./pages/moderator/ModeratorRankings'));
const ModeratorReports = lazy(() => import('./pages/moderator/ModeratorReports'));
const ModeratorAuditLogs = lazy(() => import('./pages/moderator/ModeratorAuditLogs'));

/* ─── Official Playlists ─── */
const OfficialPlaylists = lazy(() => import('./pages/OfficialPlaylists'));
const OfficialPlaylistDetail = lazy(() => import('./pages/OfficialPlaylistDetail'));

/* ─── DJ Dashboard pages ─── */
const DashboardOverview = lazy(() => import('./pages/dashboard/Overview'));
const DashboardBookings = lazy(() => import('./pages/dashboard/Bookings'));
const DashboardMessages = lazy(() => import('./pages/dashboard/Messages'));
const DashboardMixes = lazy(() => import('./pages/dashboard/Mixes'));
const DashboardSets = lazy(() => import('./pages/dashboard/Sets'));
const DashboardPhotos = lazy(() => import('./pages/dashboard/Photos'));
const DashboardEvents = lazy(() => import('./pages/dashboard/DjEvents'));
const DashboardAnalytics = lazy(() => import('./pages/dashboard/Analytics'));
const DashboardEarnings = lazy(() => import('./pages/dashboard/Earnings'));
const DashboardProfile = lazy(() => import('./pages/dashboard/Profile'));
const DashboardSettings = lazy(() => import('./pages/dashboard/Settings'));
const DashboardSubscription = lazy(() => import('./pages/dashboard/Subscription'));

const DashboardCampaigns = lazy(() => import('./pages/dashboard/Campaigns'));
const EditMix = lazy(() => import('./pages/dashboard/EditMix'));
const TicketScanner = lazy(() => import('./pages/dashboard/TicketScanner'));
const ScannerLanding = lazy(() => import('./pages/dashboard/ScannerLanding'));
const OnsiteLogin = lazy(() => import('./pages/onsite/OnsiteLogin'));
const OnsiteTools = lazy(() => import('./pages/onsite/OnsiteTools'));
const EventDashboard = lazy(() => import('./pages/dashboard/EventDashboard'));
const EventTicketManagement = lazy(() => import('./pages/dashboard/EventTicketManagement'));
const EventAnalytics = lazy(() => import('./pages/dashboard/EventAnalytics'));
const DashboardOpportunities = lazy(() =>
  import('./pages/Opportunities').then((m) => ({ default: m.Opportunities }))
);
const DashboardFollowers = lazy(() => import('./pages/dashboard/Followers'));

/* ─── User Dashboard pages ─── */
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const UserBookings = lazy(() => import('./pages/user/MyBookings'));
const MyTickets = lazy(() => import('./pages/user/MyTickets'));
const UserMessages = lazy(() => import('./pages/user/Messages'));
const UserFollowing = lazy(() => import('./pages/user/Following'));
const UserActivity = lazy(() => import('./pages/user/Activity'));
const UserNotifications = lazy(() => import('./pages/user/Notifications'));
const UserProfile = lazy(() => import('./pages/user/UserProfile'));
const UserSettings = lazy(() => import('./pages/user/UserSettings'));

const Pricing = lazy(() => import('./pages/Pricing'));

function AuthInitializer() {
  const init = useAuthStore((state) => state.init);

  useEffect(() => {
    init();
  }, [init]);

  return null;
}

function RequireProRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-deck-accent">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-deck-accent" />
      </div>
    );
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  const tier = user.djProfile?.subscriptionTier?.toLowerCase();
  const isProPlus = tier === 'pro' || tier === 'legend';
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'FINANCE_ADMIN' || user.role === 'VERIFICATION_ADMIN' || user.role === 'SUPPORT_ADMIN' || user.role === 'MODERATOR';
  if (!isProPlus && !isAdmin) {
    return <Navigate to="/dashboard/events" replace />;
  }
  return <>{children}</>;
}

function VisitTracker() {
  const location = useLocation();

  useEffect(() => {
    const payload = {
      path: location.pathname + location.search,
      referrer: document.referrer,
    };
    api.post('/analytics/visit', payload).catch(() => {});
  }, [location]);

  return null;
}

/* ─── Deep link handler for native OAuth callbacks ─── */
function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAuthUrl = async (rawUrl: string) => {
      try {
        // Always close any open in-app browser tab when deep link arrives
        await Browser.close().catch(() => {});

        // Robust parsing: handle decksalone://auth/callback?token=...#token=...
        let token: string | null = null;
        let error: string | null = null;
        try {
          const url = new URL(rawUrl);
          const search = new URLSearchParams(url.search);
          const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
          token = search.get('token') || hash.get('token');
          error = search.get('error') || hash.get('error');
        } catch (parseErr) {
          // Fallback regex parser for non-standard URLs
          const tokenMatch = rawUrl.match(/[?&#]token=([^&#]+)/);
          const errorMatch = rawUrl.match(/[?&#]error=([^&#]+)/);
          token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
          error = errorMatch ? decodeURIComponent(errorMatch[1]) : null;
        }

        if (token) {
          try {
            localStorage.setItem('token', token);
          } catch (e) {}

          useAuthStore.getState().setAuth({ id: '', email: '', username: '', role: 'USER' } as any, token);

          try {
            const meRes = await api.get('/auth/me', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (meRes.data?.data) {
              const user = meRes.data.data;
              useAuthStore.getState().setAuth(user, token);
              const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
              const target = user.role === 'DJ' ? (isMobile ? '/discover' : '/dashboard') : (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? '/admin' : '/discover');
              navigate(target, { replace: true });
              return;
            }
          } catch (e) {
            console.warn('[DeepLink] Immediate /auth/me fetch failed, falling back to /auth/callback:', e);
          }

          navigate(`/auth/callback?token=${encodeURIComponent(token)}#token=${encodeURIComponent(token)}`, {
            replace: true,
            state: { token },
          });
        } else if (error) {
          console.warn('[DeepLink] Extracted error from URL:', error);
          navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true, state: { error } });
        } else if (rawUrl.includes('decksalone') || rawUrl.includes('auth')) {
          console.warn('[DeepLink] Callback received without token or error');
          navigate('/login?error=google_auth_failed', { replace: true });
        }
      } catch (e) {
        console.error('Failed to handle deep link:', e);
      }
    };

    let listener: { remove: () => Promise<void> } | null = null;

    // Listen for app being resumed via deep link while running
    CapacitorApp.addListener('appUrlOpen', (event) => {
      handleAuthUrl(event.url);
    }).then((l) => {
      listener = l;
    });

    // Also handle the URL that launched the app (cold start)
    CapacitorApp.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) {
        handleAuthUrl(launchUrl.url);
      }
    }).catch((e) => {
      console.error('[DeepLink] Failed to get launch URL:', e);
    });

    return () => {
      listener?.remove().catch(() => {});
      CapacitorApp.removeAllListeners();
    };
  }, [navigate]);

  return null;
}

/* ─── Android System Notification sync and tap manager ─── */
function SystemNotificationManager() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    initSystemNotifications(navigate);
  }, [navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial sync
    syncUnreadSystemNotifications();

    // Periodic sync every 45 seconds while app is running
    const interval = setInterval(() => {
      syncUnreadSystemNotifications();
    }, 45000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return null;
}

/* ──────────────────────── Router ──────────────────────── */
export default function App() {
  useEffect(() => {
    // Gracefully fade out splash screen when the app is initialized and ready
    hideSplashScreen(250);
  }, []);

  return (
    <BrowserRouter>
      <DeepLinkHandler />
      <SystemNotificationManager />
      <AuthInitializer />
      <VisitTracker />
      <Suspense fallback={<div className="flex h-screen w-full items-center justify-center text-deck-accent"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-deck-accent"></div></div>}>
        <Routes>
          {/* Auth callback (Google OAuth) */}
          <Route path="auth/callback" element={<AuthCallback />} />

          {/* Admin — protected, standalone layout */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} fallback="/login" />}>
            <Route path="admin" element={<AdminDashboard />} />
          </Route>

          {/* Finance Admin — protected, standalone layout */}
          <Route element={<ProtectedRoute allowedRoles={['FINANCE_ADMIN']} fallback="/login" />}>
            <Route path="finance" element={<FinanceDashboard />} />
          </Route>

          {/* Support Admin — protected, standalone layout */}
          <Route element={<ProtectedRoute allowedRoles={['SUPPORT_ADMIN']} fallback="/login" />}>
            <Route path="support" element={<SupportDashboard />} />
          </Route>

          {/* Verification Admin — protected, standalone layout */}
          <Route element={<ProtectedRoute allowedRoles={['VERIFICATION_ADMIN']} fallback="/login" />}>
            <Route path="verification" element={<VerificationDashboard />} />
          </Route>

          {/* Moderator Console — protected, standalone layout */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'MODERATOR']} fallback="/login" />}>
            <Route path="moderator" element={<ModeratorLayout />}>
              <Route index element={<ModeratorOverview />} />
              <Route path="mixes" element={<ModeratorMixes />} />
              <Route path="playlists" element={<ModeratorPlaylists />} />
              <Route path="rankings" element={<ModeratorRankings />} />
              <Route path="reports" element={<ModeratorReports />} />
              <Route path="logs" element={<ModeratorAuditLogs />} />
            </Route>
          </Route>

          {/* DJ Dashboard — protected, custom layout (no public navbar/footer) */}
          {/* USER role is excluded and redirected to /user/dashboard */}
          <Route element={<ProtectedRoute excludeRoles={['USER']} fallback="/user/dashboard" />}>
            <Route element={<DashboardLayout />}>
              <Route path="dashboard" element={<DashboardOverview />} />
              <Route path="dashboard/bookings" element={<DashboardBookings />} />
              <Route path="dashboard/messages" element={<DashboardMessages />} />
              <Route path="dashboard/mixes" element={<DashboardMixes />} />
              <Route path="dashboard/mixes/:id/edit" element={<EditMix />} />
              <Route path="dashboard/sets" element={<DashboardSets />} />
              <Route path="dashboard/photos" element={<DashboardPhotos />} />
              <Route path="dashboard/events" element={<DashboardEvents />} />
              <Route path="dashboard/events/:id" element={<EventDashboard />} />
              <Route path="dashboard/events/:id/tickets" element={<EventTicketManagement />} />
              <Route path="dashboard/events/:id/analytics" element={<EventAnalytics />} />
              <Route path="dashboard/analytics" element={<DashboardAnalytics />} />
              <Route path="dashboard/earnings" element={<DashboardEarnings />} />
              <Route path="dashboard/followers" element={<DashboardFollowers />} />
              <Route path="dashboard/profile" element={<DashboardProfile />} />
              <Route path="dashboard/subscription" element={<DashboardSubscription />} />

              <Route path="dashboard/opportunities" element={<DashboardOpportunities />} />
              <Route path="dashboard/campaigns" element={<DashboardCampaigns />} />
              <Route path="dashboard/settings" element={<DashboardSettings />} />
              <Route
                path="dashboard/scanner"
                element={
                  <RequireProRoute>
                    <ScannerLanding />
                  </RequireProRoute>
                }
              />
            </Route>
            {/* Ticket scanner: full-screen, no dashboard sidebar. Pro+ only. */}
            <Route
              path="dashboard/events/:eventId/scan"
              element={
                <RequireProRoute>
                  <TicketScanner />
                </RequireProRoute>
              }
            />
          </Route>

          {/* User Dashboard — protected, custom layout (no public navbar/footer) */}
          <Route element={<ProtectedRoute fallback="/login" />}>
            <Route element={<UserDashboardLayout />}>
              <Route path="user/dashboard" element={<UserDashboard />} />
              <Route path="user/bookings" element={<UserBookings />} />
              <Route path="user/tickets" element={<MyTickets />} />
              <Route path="user/messages" element={<UserMessages />} />
              <Route path="user/following" element={<UserFollowing />} />
              <Route path="user/activity" element={<UserActivity />} />
              <Route path="user/notifications" element={<UserNotifications />} />
              <Route path="user/profile" element={<UserProfile />} />

              <Route path="user/settings" element={<UserSettings />} />
            </Route>
          </Route>

          {/* Auth screens (Standalone layout) */}
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />

          {/* Public site */}
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="discover" element={<Discover />} />
            <Route path="rankings" element={<Rankings />} />
            <Route path="dj/:identifier" element={<DjProfile />} />
            <Route path="booking" element={<Booking />} />
            <Route path="mixes" element={<MixHub />} />
            <Route path="mix/:id" element={<MixDetail />} />
            <Route path="mix/:id/edit" element={<EditMix />} />
            <Route path="mixes/:id" element={<MixDetail />} />
            <Route path="mixes/:id/edit" element={<EditMix />} />
            <Route path="playlists" element={<OfficialPlaylists />} />
            <Route path="playlist/:slug" element={<OfficialPlaylistDetail />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="subscription" element={<Pricing />} />
            <Route path="user/:username" element={<UserPublicProfile />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="events/:id/onsite" element={<OnsiteLogin />} />
            <Route path="events/:id/onsite/tools" element={<OnsiteTools />} />
            <Route path="hall-of-fame" element={<HallOfFame />} />
            <Route path="battles" element={<Battles />} />
            <Route path="feed" element={<Feed />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="help" element={<Help />} />
            <Route path="blog" element={<Blog />} />
            <Route path="about" element={<About />} />
            <Route path="request-dj" element={<RequestDj />} />
            <Route path="install" element={<InstallApp />} />
            <Route path="developers" element={<Developers />} />
            <Route path="api" element={<Developers />} />
          </Route>
        </Routes>
        <MixPlayer />
        <TermsAcceptanceModal />
        <LocationPrompt />
        <ResumeListeningModal />
      </Suspense>
    </BrowserRouter>
  );
}
