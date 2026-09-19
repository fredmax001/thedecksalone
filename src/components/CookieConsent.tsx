import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cookie, X, Check, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const CONSENT_STORAGE_KEY = 'decksalone_cookie_consent_v2';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  gpcApplied?: boolean;
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/**
 * Updates Google Consent Mode v2 based on user selections
 */
export function updateGoogleConsent(preferences: CookiePreferences) {
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: preferences.analytics ? 'granted' : 'denied',
      ad_storage: preferences.marketing ? 'granted' : 'denied',
      ad_user_data: preferences.marketing ? 'granted' : 'denied',
      ad_personalization: preferences.marketing ? 'granted' : 'denied',
    });
  }
}

export function getCookieConsent(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function CookieConsent() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // Check Global Privacy Control (GPC) signal
    const isGpcEnabled = typeof navigator !== 'undefined' && (navigator as any).globalPrivacyControl === true;

    const stored = getCookieConsent();
    if (!stored) {
      if (isGpcEnabled) {
        // Automatically honour GPC signal: opt-out of marketing/analytics cookies
        const gpcConsent: CookiePreferences = {
          necessary: true,
          analytics: false,
          marketing: false,
          gpcApplied: true,
        };
        localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(gpcConsent));
        updateGoogleConsent(gpcConsent);
      } else {
        // Show banner to allow user to make explicit choice
        const timer = setTimeout(() => setIsOpen(true), 800);
        return () => clearTimeout(timer);
      }
    } else {
      updateGoogleConsent(stored);
    }
  }, []);

  const handleAcceptAll = () => {
    const consent: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    updateGoogleConsent(consent);
    setIsOpen(false);
  };

  const handleRejectAll = () => {
    const consent: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    updateGoogleConsent(consent);
    setIsOpen(false);
  };

  const handleSaveCustom = () => {
    const consent: CookiePreferences = {
      necessary: true,
      analytics,
      marketing,
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    updateGoogleConsent(consent);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-50 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          className="bg-[#121110]/95 backdrop-blur-xl border border-gold/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0">
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-sm sm:text-base font-bold uppercase tracking-wide text-white">
                  Privacy & Cookie Preferences
                </h3>
                <p className="text-[11px] text-text-muted">
                  We respect your privacy and honor Global Privacy Control (GPC).
                </p>
              </div>
            </div>
            <button
              onClick={handleRejectAll}
              className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">
            We use essential cookies to keep you signed in, remember playback preferences, and secure payments. Optional analytics help us understand how DJs and mixes are discovered.{' '}
            <Link to="/privacy" className="text-gold underline hover:text-gold-light">
              Privacy Policy
            </Link>
          </p>

          {showDetails && (
            <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gold" />
                  <div>
                    <p className="font-semibold text-white">Strictly Necessary</p>
                    <p className="text-[10px] text-text-muted">Authentication, security, audio streaming</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gold uppercase px-2 py-0.5 rounded bg-gold/10">Required</span>
              </div>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] cursor-pointer">
                <div>
                  <p className="font-semibold text-white">Analytics & Performance</p>
                  <p className="text-[10px] text-text-muted">Help us improve platform streaming & search</p>
                </div>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="accent-gold w-4 h-4 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] cursor-pointer">
                <div>
                  <p className="font-semibold text-white">Marketing & Advertising</p>
                  <p className="text-[10px] text-text-muted">Personalized event & DJ recommendations</p>
                </div>
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="accent-gold w-4 h-4 rounded"
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs font-bold text-text-muted hover:text-white px-3 py-2 transition-colors mr-auto"
            >
              {showDetails ? 'Hide Options' : 'Customize'}
            </button>

            {showDetails ? (
              <button
                type="button"
                onClick={handleSaveCustom}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Save Preferences
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRejectAll}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Reject Non-Essential
              </button>
            )}

            <button
              type="button"
              onClick={handleAcceptAll}
              className="px-5 py-2 rounded-full bg-gold text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md shadow-gold/20"
            >
              Accept All
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
