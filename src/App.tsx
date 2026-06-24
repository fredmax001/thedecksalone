import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';
import AuthCallback from './pages/AuthCallback';
import Layout from './components/Layout';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Rankings from './pages/Rankings';
import DjProfile from './pages/DjProfile';
import Booking from './pages/Booking';
import MixHub from './pages/MixHub';
import Events from './pages/Events';
import HallOfFame from './pages/HallOfFame';
import Battles from './pages/Battles';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';

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

        {/* Public site */}
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="discover" element={<Discover />} />
          <Route path="rankings" element={<Rankings />} />
          <Route path="dj/:id" element={<DjProfile />} />
          <Route path="booking" element={<Booking />} />
          <Route path="mixes" element={<MixHub />} />
          <Route path="events" element={<Events />} />
          <Route path="hall-of-fame" element={<HallOfFame />} />
          <Route path="battles" element={<Battles />} />

          {/* Protected dashboard for DJs and regular users */}
          <Route element={<ProtectedRoute fallback="/login" />}>
            <Route path="dashboard" element={<Dashboard />} />
          </Route>

          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
