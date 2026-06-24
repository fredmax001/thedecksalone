import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import WaveformAnimation from './WaveformAnimation';

interface AuthLayoutProps {
  children: ReactNode;
  quote: string;
  statLine?: string;
}

export default function AuthLayout({ children, quote, statLine }: AuthLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] bg-black">
      {/* ─── Left Panel (decorative) ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative hidden lg:flex lg:w-[45%] flex-col justify-between p-8 overflow-hidden"
        style={{ background: '#0A0A0A' }}
      >
        {/* Waveform background */}
        <WaveformAnimation className="absolute inset-0 pointer-events-none overflow-hidden" />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative z-10"
        >
          <span className="text-[20px] font-bold tracking-tight text-text-primary font-display uppercase">
            DECK <span className="text-gold">SALONE</span>
          </span>
        </motion.div>

        {/* Center content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative z-10 max-w-md"
        >
          <p className="text-[18px] leading-relaxed text-text-secondary font-body">
            {quote}
          </p>
          {statLine && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-6 text-sm font-mono text-gold tracking-wide"
            >
              {statLine}
            </motion.p>
          )}
        </motion.div>

        {/* Bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="relative z-10 flex items-center gap-2 text-xs text-text-muted"
        >
          <span>&copy; 2025 Deck Salone by Sound It Entertainment</span>
          <span className="text-medium-gray">|</span>
          <a href="#" className="hover:text-gold transition-colors">Terms</a>
          <span className="text-medium-gray">|</span>
          <a href="#" className="hover:text-gold transition-colors">Privacy</a>
        </motion.div>
      </motion.div>

      {/* ─── Right Panel (form) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex flex-1 items-center justify-center bg-black-elevated p-4 sm:p-6 lg:p-8"
      >
        <div className="w-full max-w-[440px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <span className="text-[20px] font-bold tracking-tight text-text-primary font-display uppercase">
              DECK <span className="text-gold">SALONE</span>
            </span>
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
