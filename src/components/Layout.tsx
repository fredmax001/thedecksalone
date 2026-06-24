import { useEffect, useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import Footer from './Footer';
import MixPlayer, { type MixTrack } from './MixPlayer';

/* ───── typed window event for cross-page track selection ───── */
declare global {
  interface WindowEventMap {
    'play-mix': CustomEvent<MixTrack>;
  }
}

export default function Layout() {
  const location = useLocation();
  const [currentTrack, setCurrentTrack] = useState<MixTrack | null>(null);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  /* Listen for play-mix events from any page */
  useEffect(() => {
    const handler = (e: Event) => {
      const track = (e as CustomEvent<MixTrack>).detail;
      setCurrentTrack(track);
    };
    window.addEventListener('play-mix', handler);
    return () => window.removeEventListener('play-mix', handler);
  }, []);

  const handleClose = useCallback(() => setCurrentTrack(null), []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-black">
      <Navbar />
      <main className="flex-1 pb-16 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
      <MixPlayer
        track={currentTrack}
        onClose={handleClose}
      />
    </div>
  );
}
