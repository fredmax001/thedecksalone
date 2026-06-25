import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';
import AuthCallback from './pages/AuthCallback';
import Layout from './components/Layout';
import DashboardLayout from './components/DashboardLayout';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Rankings from './pages/Rankings';
import DjProfile from './pages/DjProfile';
import Booking from './pages/Booking';
import MixHub from './pages/MixHub';
import Events from './pages/Events';
import HallOfFame from './pages/HallOfFame';
import Battles from './pages/Battles';
import Login from './pages/Login';
import Register from './pages/Register';

/* ─── Dashboard pages ─── */
import DashboardOverview from './pages/dashboard/Overview';
import DashboardBookings from './pages/dashboard/Bookings';
import DashboardMessages from './pages/dashboard/Messages';
import DashboardMixes from './pages/dashboard/Mixes';
import DashboardEvents from './pages/dashboard/DjEvents';
import DashboardAnalytics from './pages/dashboard/Analytics';
import DashboardEarnings from './pages/dashboard/Earnings';
import DashboardProfile from './pages/dashboard/Profile';
import DashboardSettings from './pages/dashboard/Settings';
import DashboardSubscription from './pages/dashboard/Subscription';

function AuthInitializer() {
  const init = useAuthStore((state) => state.init);

  useEffect(() => {
    init();
  }, [init]);

  return null;
}

/* ──────────────────────── Router ──────────────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <AuthInitializer />
      <Routes>
        {/* Auth callback (Google OAuth) */}
        <Route path="auth/callback" element={<AuthCallback />} />

        {/* Admin — protected, standalone layout */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'MODERATOR']} fallback="/login" />}>
          <Route path="admin" element={<AdminDashboard />} />
        </Route>

        {/* DJ Dashboard — protected, custom layout (no public navbar/footer) */}
        <Route element={<ProtectedRoute fallback="/login" />}>
          <Route element={<DashboardLayout />}>
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="dashboard/bookings" element={<DashboardBookings />} />
            <Route path="dashboard/messages" element={<DashboardMessages />} />
            <Route path="dashboard/mixes" element={<DashboardMixes />} />
            <Route path="dashboard/events" element={<DashboardEvents />} />
            <Route path="dashboard/analytics" element={<DashboardAnalytics />} />
            <Route path="dashboard/earnings" element={<DashboardEarnings />} />
            <Route path="dashboard/profile" element={<DashboardProfile />} />
            <Route path="dashboard/subscription" element={<DashboardSubscription />} />
            <Route path="dashboard/settings" element={<DashboardSettings />} />
          </Route>
        </Route>

        {/* Public site */}
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="discover" element={<Discover />} />
          <Route path="rankings" element={<Rankings />} />
          <Route path="dj/:identifier" element={<DjProfile />} />
          <Route path="booking" element={<Booking />} />
          <Route path="mixes" element={<MixHub />} />
          <Route path="events" element={<Events />} />
          <Route path="hall-of-fame" element={<HallOfFame />} />
          <Route path="battles" element={<Battles />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
