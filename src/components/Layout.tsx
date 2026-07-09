import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import Footer from './Footer';
import { usePlayerStore } from '@/stores/playerStore';

export default function Layout() {
  const location = useLocation();
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-[100dvh] flex flex-col theme-bg">
      <Navbar />
      <main
        className={`flex-1 transition-all duration-300 ${
          currentTrack ? 'pb-44 lg:pb-28' : 'pb-24 lg:pb-12'
        }`}
      >
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
