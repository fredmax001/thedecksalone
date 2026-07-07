import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
        style={{ backgroundImage: "url('/login-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/85 z-0" />

        {/* Waveform background */}
        <WaveformAnimation className="absolute inset-0 pointer-events-none overflow-hidden z-[1]" />

        {/* Logo at top */}
        <Link to="/" className="relative z-10 hover:opacity-80 transition-opacity">
          <img
            src="/logo.png"
            alt="Deck Salone"
            className="h-20 w-auto object-contain"
          />
        </Link>

        {/* Center content — below the logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative z-10 max-w-md mt-4"
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
          className="relative z-10 flex items-center gap-2 text-xs text-text-muted mt-4"
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
          <Link to="/" className="lg:hidden mb-8 text-center hover:opacity-80 transition-opacity block">
            <img
              src="/logo.png"
              alt="Deck Salone"
              className="h-32 w-auto object-contain mx-auto"
            />
          </Link>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
