import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Share,
  PlusSquare,
  Smartphone,
  Bell,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Check if running standalone (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Catch Chrome/Android install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Notification permission check
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        toast.success('Deck Salone App Installed!');
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Install prompt error:', err);
    }
  };

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications are not supported by this browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Push Notifications Enabled!');
        // Send a test welcome notification
        new Notification('Deck Salone', {
          body: 'Push notifications are now active! You will receive updates for event bookings, new mixes, and DJ news.',
          icon: '/logo-icon.png',
          badge: '/logo-icon.png',
        });
      } else if (permission === 'denied') {
        toast.error('Notification permission was blocked. Please enable notifications in your browser settings.');
      }
    } catch (err) {
      console.error('Push permission error:', err);
    }
  };

  const sendTestNotification = () => {
    if (notificationPermission !== 'granted') {
      requestPushPermission();
      return;
    }

    new Notification('Deck Salone Test', {
      body: '🎧 Push notifications are working perfectly in PWA mode!',
      icon: '/logo-icon.png',
      badge: '/logo-icon.png',
    });
    toast.success('Test notification sent!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 select-none">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-gold animate-pulse" />
          <span>Deck Salone PWA Experience</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-black uppercase text-text-primary tracking-tight">
          Install Deck Salone App
        </h1>
      </div>

      {/* Main Status / Install Banner */}
      <div className="bg-black-surface border border-gold/30 rounded-2xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gold-gradient p-0.5 shadow-lg shrink-0">
              <img src="/logo-icon.png" alt="Deck Salone App" className="w-full h-full object-cover rounded-[14px]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-wide">Deck Salone Mobile</h3>
                {isInstalled && (
                  <span className="px-2 py-0.5 rounded-full bg-green/20 text-green border border-green/30 text-[10px] font-bold uppercase">
                    Installed
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Official DJ & Event Network for Sierra Leone
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {deferredPrompt && (
              <Button
                onClick={handleNativeInstall}
                className="w-full sm:w-auto px-6 py-3 bg-gold-gradient text-black font-extrabold text-sm uppercase tracking-wide rounded-full shadow-[0_0_20px_rgba(244, 224, 89,0.3)] hover:scale-105 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4 mr-2" /> Install PWA App
              </Button>
            )}
            <a
              href="/deck-salone-debug.apk"
              download="DeckSalone.apk"
              className="w-full sm:w-auto px-6 py-3 bg-black-surface hover:bg-gold/15 text-gold border border-gold/40 font-bold text-sm uppercase tracking-wide rounded-full flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 text-center"
            >
              <Smartphone className="w-4 h-4 text-gold" /> Download Android APK (24MB)
            </a>
          </div>
        </div>
      </div>

      {/* Installation Guide by Platform */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold uppercase text-text-primary tracking-wide flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-gold" /> Step-by-Step Installation Guide
          </h2>
          <span className="text-xs font-semibold uppercase tracking-wider text-gold px-2.5 py-1 rounded-full bg-gold/10 border border-gold/20">
            Detected: {platform === 'ios' ? 'Apple iOS' : platform === 'android' ? 'Android' : 'Desktop'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* iOS Safari Card */}
          <motion.div
            whileHover={{ y: -2 }}
            className={`p-6 rounded-2xl border transition-all ${
              platform === 'ios'
                ? 'bg-black-surface border-gold shadow-[0_0_20px_rgba(244, 224, 89,0.15)]'
                : 'bg-black-surface/60 border-dark-gray'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center text-gold font-bold">
                iOS
              </div>
              <div>
                <h4 className="font-bold text-text-primary text-base">iPhone & iPad (Safari)</h4>
                <p className="text-xs text-text-muted">Follow these 3 quick steps in Safari</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-text-secondary">
              <li className="flex items-start gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-xs shrink-0">1</div>
                <div>
                  Tap the <strong className="text-white">Share</strong> button <Share className="w-3.5 h-3.5 inline text-gold mx-1" /> in Safari's bottom toolbar.
                </div>
              </li>
              <li className="flex items-start gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-xs shrink-0">2</div>
                <div>
                  Scroll down the options list and tap <strong className="text-white">"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-gold mx-1" />.
                </div>
              </li>
              <li className="flex items-start gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-xs shrink-0">3</div>
                <div>
                  Tap <strong className="text-white">"Add"</strong> in the top right. Launch Deck Salone directly from your home screen!
                </div>
              </li>
            </ol>
          </motion.div>

          {/* Android Chrome Card */}
          <motion.div
            whileHover={{ y: -2 }}
            className={`p-6 rounded-2xl border transition-all ${
              platform === 'android'
                ? 'bg-black-surface border-gold shadow-[0_0_20px_rgba(244, 224, 89,0.15)]'
                : 'bg-black-surface/60 border-dark-gray'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center text-gold font-bold">
                AND
              </div>
              <div>
                <h4 className="font-bold text-text-primary text-base">Android (Chrome & Edge)</h4>
                <p className="text-xs text-text-muted">Install with one tap</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-text-secondary">
              <li className="flex items-start gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-xs shrink-0">1</div>
                <div>
                  Tap the <strong className="text-white">3 dots menu</strong> (⋮) in Chrome's top right corner.
                </div>
              </li>
              <li className="flex items-start gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-xs shrink-0">2</div>
                <div>
                  Select <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.
                </div>
              </li>
              <li className="flex items-start gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5">
                <div className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-xs shrink-0">3</div>
                <div>
                  Confirm installation. Deck Salone will now run full-screen as a standalone app!
                </div>
              </li>
            </ol>
          </motion.div>
        </div>
      </div>

      {/* Push Notifications Configuration */}
      <div className="bg-black-surface border border-dark-gray rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gold/15 flex items-center justify-center text-gold shrink-0">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary uppercase tracking-wide">
                PWA Push Notifications
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Get real-time alerts for booking requests, event tickets, and new mixes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {notificationPermission === 'granted' ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green/20 text-green border border-green/30 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Notifications Active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-xs font-bold">
                <AlertCircle className="w-3.5 h-3.5" /> Permission Required
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 text-text-secondary">
              <ShieldCheck className="w-4 h-4 text-gold shrink-0" />
              <span>Encrypted Web Push</span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Zap className="w-4 h-4 text-gold shrink-0" />
              <span>Instant Door Scans</span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
              <span>Works in Standalone Mode</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/10">
            {notificationPermission !== 'granted' ? (
              <Button
                onClick={requestPushPermission}
                className="bg-gold-gradient text-black font-extrabold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl hover:scale-102"
              >
                Enable Push Notifications
              </Button>
            ) : (
              <Button
                onClick={sendTestNotification}
                className="bg-gold-gradient text-black font-extrabold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl hover:scale-102 flex items-center gap-2"
              >
                <Bell className="w-4 h-4" /> Send Test Notification
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
