import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Share, MoreVertical, Plus, Download, ChevronRight } from 'lucide-react';

// ─── Detect platform ──────────────────────────────────────────────────────────
function getOS(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

const DISMISSED_KEY = 'ds_pwa_prompt_dismissed';
const DISMISSED_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Step types ───────────────────────────────────────────────────────────────
interface Step {
  icon: React.ReactNode;
  text: React.ReactNode;
}

const androidSteps: Step[] = [
  { icon: <MoreVertical className="w-4 h-4 text-gold shrink-0" />, text: <><strong>Tap ⋮</strong> (three dots) in Chrome's top-right corner</> },
  { icon: <Plus className="w-4 h-4 text-gold shrink-0" />, text: <><strong>Select</strong> "Add to Home screen" or "Install app"</> },
  { icon: <Download className="w-4 h-4 text-gold shrink-0" />, text: <><strong>Tap Install</strong> — the icon appears on your home screen</> },
];

const iosSteps: Step[] = [
  { icon: <Share className="w-4 h-4 text-gold shrink-0" />, text: <><strong>Tap the Share button</strong> (square with ↑ arrow) in Safari</> },
  { icon: <Plus className="w-4 h-4 text-gold shrink-0" />, text: <><strong>Scroll down</strong> and tap "Add to Home Screen"</> },
  { icon: <ChevronRight className="w-4 h-4 text-gold shrink-0" />, text: <><strong>Tap Add</strong> in the top-right — done! 🎉</> },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<'android' | 'ios'>('android');
  const os = getOS();

  useEffect(() => {
    // Don't show if already installed or not on mobile
    if (isInStandaloneMode()) return;
    if (os === 'other') return;

    // Don't show if dismissed recently
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISSED_TTL) return;

    // Set default tab based on detected OS
    setTab(os === 'ios' ? 'ios' : 'android');

    // Show after a short delay so the page loads first
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, [os]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  };

  const steps = tab === 'ios' ? iosSteps : androidSteps;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
          />

          {/* Bottom sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[61] max-w-lg mx-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="bg-[#0e0e0e] border-t border-[rgba(255,255,255,0.08)] rounded-t-3xl overflow-hidden shadow-2xl">
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between px-5 pt-3 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border border-gold/30 shrink-0">
                    <img src="/logo-icon.png" alt="Deck Salone" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-display text-base font-bold text-text-primary uppercase tracking-tight">
                      Install Deck Salone
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Get the full app experience — fast &amp; offline-ready
                    </p>
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  className="p-1.5 text-text-muted hover:text-text-primary rounded-full hover:bg-white/5 transition-colors shrink-0 mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* OS Tab switcher */}
              <div className="flex mx-5 mb-4 bg-[#181818] rounded-xl p-1 gap-1">
                {(['android', 'ios'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-200 ${
                      tab === t
                        ? 'bg-gold-gradient text-black shadow-sm'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    {t === 'android' ? 'Android' : 'iPhone / iPad'}
                  </button>
                ))}
              </div>

              {/* Browser note */}
              <div className="mx-5 mb-3 px-3 py-2 rounded-xl bg-[rgba(212,162,74,0.08)] border border-gold/20 flex items-center gap-2">
                <span className="text-gold text-base">{tab === 'ios' ? '🧭' : '🌐'}</span>
                <p className="text-[11px] text-text-muted leading-tight">
                  {tab === 'ios'
                    ? 'Use Safari — Chrome & Firefox don\'t support Add to Home Screen on iOS'
                    : 'Use Chrome browser for the best install experience on Android'}
                </p>
              </div>

              {/* Steps */}
              <div className="mx-5 mb-5 flex flex-col gap-2.5">
                {steps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-start gap-3 bg-[#161616] rounded-xl px-3.5 py-3 border border-[rgba(255,255,255,0.04)]"
                  >
                    <span className="w-5 h-5 rounded-full bg-gold/10 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-gold">
                      {i + 1}
                    </span>
                    <span className="text-[12px] text-text-secondary leading-relaxed">{step.text}</span>
                    <div className="ml-auto shrink-0 mt-0.5">{step.icon}</div>
                  </motion.div>
                ))}
              </div>

              {/* Dismiss strip */}
              <button
                onClick={dismiss}
                className="w-full py-4 text-[11px] text-text-muted hover:text-text-primary transition-colors border-t border-[rgba(255,255,255,0.05)] bg-[#0a0a0a]"
              >
                Maybe later
              </button>

              {/* iOS safe area */}
              <div className="h-safe-bottom" style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
