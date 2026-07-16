import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Navigation } from 'lucide-react';

const STORAGE_KEY = 'deck-salone-location-preference';

export default function LocationPrompt() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a location choice
    const locationPref = localStorage.getItem(STORAGE_KEY);
    if (!locationPref) {
      // Show after a delay to not overwhelm on first load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAllow = () => {
    localStorage.setItem(STORAGE_KEY, 'allowed');
    
    // Request actual geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Store coordinates for later use (events, nearby DJs, etc.)
          localStorage.setItem(
            'deck-salone-location',
            JSON.stringify({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: Date.now(),
            })
          );
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
      );
    }
    
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          transition={{ duration: 0.4, type: 'spring', damping: 25 }}
          className="fixed bottom-6 left-1/2 z-[9998] w-[calc(100%-2rem)] max-w-md"
        >
          <div className="bg-black-elevated border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 transition-colors z-10"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>

            <div className="p-5">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-gold" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-base font-semibold text-text-primary uppercase tracking-tight">
                    Enable Location
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                    Allow Deck Salone to access your location to discover nearby events, DJs, and venues in Sierra Leone.
                  </p>

                  {/* Buttons */}
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={handleAllow}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gold-gradient text-black font-semibold text-xs uppercase rounded-full hover:scale-[1.02] transition-transform"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Allow
                    </button>
                    <button
                      onClick={handleDecline}
                      className="px-5 py-2.5 text-text-muted font-medium text-xs uppercase rounded-full hover:bg-white/5 transition-colors"
                    >
                      Not Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
