import { useEffect, Suspense, lazy } from 'react';
import { hideSplashScreen } from '@/lib/splashScreen';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from './components/Layout';
import DashboardLayout from './components/DashboardLayout';
import UserDashboardLayout from './components/UserDashboardLayout';
import MixPlayer from './components/MixPlayer';
import TermsAcceptanceModal from './components/TermsAcceptanceModal';
import LocationPrompt from './components/LocationPrompt';

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
const DashboardFanSubscriptions = lazy(() => import('./pages/dashboard/FanSubscriptions'));
const DashboardCampaigns = lazy(() => import('./pages/dashboard/Campaigns'));
const TicketScanner = lazy(() => import('./pages/dashboard/TicketScanner'));
const ScannerLanding = lazy(() => import('./pages/dashboard/ScannerLanding'));
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
const UserSubscription = lazy(() => import('./pages/user/UserSubscription'));
const Pricing = lazy(() => import('./pages/Pricing'));

function AuthInitializer() {
  const init = useAuthStore((state) => state.init);

  useEffect(() => {
    init();
  }, [init]);

  return null;
}

function RequireLegendRoute({ children }: { children: React.ReactNode }) {
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
  const isLegend = user.djProfile?.subscriptionTier?.toLowerCase() === 'legend';
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'FINANCE_ADMIN' || user.role === 'VERIFICATION_ADMIN' || user.role === 'SUPPORT_ADMIN' || user.role === 'MODERATOR';
  if (!isLegend && !isAdmin) {
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

/* ──────────────────────── Router ──────────────────────── */
export default function App() {
  useEffect(() => {
    // Gracefully fade out splash screen when the app is initialized and ready
    hideSplashScreen(250);
  }, []);

  return (
    <BrowserRouter>
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

          {/* Moderator Console — protected */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'MODERATOR']} fallback="/login" />}>
            <Route element={<Layout />}>
              <Route path="moderator" element={<ModeratorLayout />}>
                <Route index element={<ModeratorOverview />} />
                <Route path="mixes" element={<ModeratorMixes />} />
                <Route path="playlists" element={<ModeratorPlaylists />} />
                <Route path="rankings" element={<ModeratorRankings />} />
                <Route path="reports" element={<ModeratorReports />} />
                <Route path="logs" element={<ModeratorAuditLogs />} />
              </Route>
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
              <Route path="dashboard/fan-subscriptions" element={<DashboardFanSubscriptions />} />
              <Route path="dashboard/opportunities" element={<DashboardOpportunities />} />
              <Route path="dashboard/campaigns" element={<DashboardCampaigns />} />
              <Route path="dashboard/settings" element={<DashboardSettings />} />
              <Route
                path="dashboard/scanner"
                element={
                  <RequireLegendRoute>
                    <ScannerLanding />
                  </RequireLegendRoute>
                }
              />
            </Route>
            {/* Ticket scanner: full-screen, no dashboard sidebar. Pro+ (legend) only. */}
            <Route
              path="dashboard/events/:eventId/scan"
              element={
                <RequireLegendRoute>
                  <TicketScanner />
                </RequireLegendRoute>
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
              <Route path="user/subscription" element={<UserSubscription />} />
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
            <Route path="mixes/:id" element={<MixDetail />} />
            <Route path="playlists" element={<OfficialPlaylists />} />
            <Route path="playlist/:slug" element={<OfficialPlaylistDetail />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="subscription" element={<Pricing />} />
            <Route path="user/:username" element={<UserPublicProfile />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<EventDetail />} />
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
      </Suspense>
    </BrowserRouter>
  );
}
