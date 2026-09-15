import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const CHOICE_KEY = 'deck-salone-notif-prompt-choice';
const DISMISSED_KEY = 'deck-salone-notif-prompt-dismissed-at';
const SNOOZE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function NotificationPermissionPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    // Check if user already responded or if notifications are already configured
    const checkNotificationStatus = async () => {
      try {
        const choice = localStorage.getItem(CHOICE_KEY);
        if (choice === 'granted' || choice === 'declined') {
          return;
        }

        const dismissedAt = localStorage.getItem(DISMISSED_KEY);
        if (dismissedAt && Date.now() - Number(dismissedAt) < SNOOZE_PERIOD_MS) {
          return;
        }

        // Don't stack on top of the location prompt — wait until the user
        // has made a location choice before asking for notifications.
        if (!localStorage.getItem('deck-salone-location-preference')) {
          return;
        }

        // Check platform permission status
        if (Capacitor.isNativePlatform()) {
          const status = await LocalNotifications.checkPermissions();
          if (status.display === 'granted') {
            localStorage.setItem(CHOICE_KEY, 'granted');
            return;
          }
        } else if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            localStorage.setItem(CHOICE_KEY, 'granted');
            return;
          }
          if (Notification.permission === 'denied') {
            // Browser permanently blocked it
            localStorage.setItem(CHOICE_KEY, 'denied');
            return;
          }
        } else {
          // Notifications not supported on this browser
          return;
        }

        // Show after a brief delay so initial load is uninterrupted
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 4500);

        return () => clearTimeout(timer);
      } catch (err) {
        console.warn('[NotificationPrompt] Status check error:', err);
      }
    };

    checkNotificationStatus();
  }, []);

  const handleAllow = async () => {
    setRequesting(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await LocalNotifications.requestPermissions();
        if (result.display === 'granted') {
          localStorage.setItem(CHOICE_KEY, 'granted');
          toast.success('🔔 Notifications Enabled!', {
            description: "You'll be alerted for mix releases, event tickets, and bookings.",
          });
          // Show test welcome notification
          await LocalNotifications.schedule({
            notifications: [
              {
                id: 1001,
                title: 'Deck Salone 🎧',
                body: "Push notifications are active! You won't miss any new mixes or DJ alerts.",
                channelId: 'deck_salone_notifications',
                smallIcon: 'ic_stat_decksalone',
                largeIcon: 'ic_launcher',
                iconColor: '#F4E059',
                sound: 'default',
              },
            ],
          }).catch(() => {});
        } else {
          localStorage.setItem(CHOICE_KEY, 'declined');
        }
      } else if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          localStorage.setItem(CHOICE_KEY, 'granted');
          toast.success('🔔 Notifications Enabled!', {
            description: "You'll be alerted for mix releases, event tickets, and bookings.",
          });

          // Show test welcome notification
          try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification('Deck Salone 🎧', {
                  body: "Push notifications are active! You'll receive updates for new mixes, tickets & bookings.",
                  icon: '/logo-icon.png',
                  badge: '/logo-icon.png',
                });
              });
            } else {
              new Notification('Deck Salone 🎧', {
                body: "Push notifications are active! You'll receive updates for new mixes, tickets & bookings.",
                icon: '/logo-icon.png',
                badge: '/logo-icon.png',
              });
            }
          } catch {
            // Fallback gracefully if direct notification constructor fails in some mobile browsers
          }
        } else if (permission === 'denied') {
          localStorage.setItem(CHOICE_KEY, 'denied');
          toast.info('Notifications Blocked', {
            description: 'You can enable notifications anytime in your browser site settings.',
          });
        } else {
          localStorage.setItem(CHOICE_KEY, 'declined');
        }
      }
    } catch (err) {
      console.error('[NotificationPrompt] Permission request failed:', err);
    } finally {
      setRequesting(false);
      setIsVisible(false);
    }
  };

  const handleDecline = () => {
    localStorage.setItem(CHOICE_KEY, 'declined');
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          // Fade-only entrance/exit: keep prompt (and its buttons) stable
          // while visible — positional springs caused click instability.
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-24 md:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 pointer-events-auto"
        >
          <div className="relative overflow-hidden rounded-2xl bg-[#121212]/95 backdrop-blur-xl border border-white/10 p-4 shadow-2xl ring-1 ring-white/5">
            {/* Top decorative gradient line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f4e059] to-transparent opacity-80" />

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-text-muted hover:text-white transition-colors p-1 rounded-full hover:bg-white/5"
              aria-label="Close prompt"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5 pr-5">
              {/* Animated bell icon */}
              <div className="relative shrink-0 mt-0.5">
                <div className="w-10 h-10 rounded-xl bg-[#f4e059]/10 border border-[#f4e059]/30 flex items-center justify-center text-[#f4e059] shadow-inner">
                  <BellRing className="w-5 h-5 animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#f4e059] rounded-full border-2 border-black animate-ping" />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <h4 className="text-sm font-bold text-white tracking-tight font-display">
                    Stay in the Groove
                  </h4>
                  <Sparkles className="w-3.5 h-3.5 text-[#f4e059]" />
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Get instant alerts when top Salone DJs drop fresh mixes, ticket status updates, and booking requests.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex items-center gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={handleDecline}
                aria-label="Not Now"
                className="flex-1 py-2 px-3 rounded-xl text-xs font-medium text-text-muted hover:text-white hover:bg-white/5 transition-colors"
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={handleAllow}
                disabled={requesting}
                aria-label="Allow Alerts"
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-[#f4e059] text-black hover:bg-[#e5d045] active:scale-[0.98] transition-all shadow-md shadow-[#f4e059]/20 flex items-center justify-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5 fill-black" />
                {requesting ? 'Enabling...' : 'Allow Alerts'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
