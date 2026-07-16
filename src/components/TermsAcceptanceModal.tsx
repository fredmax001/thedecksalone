import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, ExternalLink } from 'lucide-react';

const STORAGE_KEY = 'deck-salone-terms-accepted';

export default function TermsAcceptanceModal() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted terms
    const hasAccepted = localStorage.getItem(STORAGE_KEY);
    if (!hasAccepted) {
      // Small delay to let the page load first
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  const handleDecline = () => {
    // Redirect to a simple "goodbye" or external site
    window.location.href = 'https://www.google.com';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative w-full max-w-lg bg-black-elevated border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="relative px-6 pt-8 pb-6 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-gold" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-semibold uppercase tracking-tight text-text-primary">
                Welcome to Deck Salone
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Before you continue, please review and accept our terms
              </p>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              <div className="bg-black-surface border border-white/5 rounded-xl p-4 mb-6">
                <p className="text-sm text-text-secondary leading-relaxed">
                  By using Deck Salone, you agree to our{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold hover:underline inline-flex items-center gap-0.5"
                  >
                    Terms of Service
                    <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  and{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold hover:underline inline-flex items-center gap-0.5"
                  >
                    Privacy Policy
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  . We collect and process your data to provide our services, including location data for event discovery.
                </p>
              </div>

              {/* Checklist */}
              <div className="space-y-3 mb-6">
                {[
                  'I am at least 16 years of age',
                  'I agree to the Terms of Service',
                  'I agree to the Privacy Policy',
                  'I understand that my data will be processed as described',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded bg-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-gold" />
                    </div>
                    <span className="text-sm text-text-secondary">{item}</span>
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAccept}
                  className="flex-1 py-3 px-6 bg-gold-gradient text-black font-semibold uppercase text-sm rounded-full hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  I Accept
                </button>
                <button
                  onClick={handleDecline}
                  className="flex-1 py-3 px-6 border border-white/20 text-text-secondary font-semibold uppercase text-sm rounded-full hover:bg-white/5 transition-colors"
                >
                  Decline
                </button>
              </div>

              <p className="mt-4 text-center text-xs text-text-muted">
                You must accept to use Deck Salone. Declining will redirect you away.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
