import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Lock, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiErrors';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];
const RESEND_SECONDS = 60;


const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

const iconCls = 'absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none';

interface PhoneOtpFormProps {
  onVerified: (
    user: { id: string; email: string; phone?: string; role: string },
    token: string,
    isNewUser: boolean
  ) => void;
  verifyLabel?: string;
}

/**
 * Shared phone OTP flow: phone number → send code → verify code.
 * Calls POST /auth/phone/send-otp and POST /auth/phone/verify.
 * The backend finds OR creates the account on first verification.
 */
export default function PhoneOtpForm({ onVerified, verifyLabel = 'Verify & Continue' }: PhoneOtpFormProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const sendCode = useCallback(
    async (targetPhone: string) => {
      setError(null);
      setIsSending(true);
      try {
        const res = await api.post('/auth/phone/send-otp', { phone: targetPhone });
        if (res.data?.success) {
          setStage('code');
          setCode('');
          setResendCountdown(RESEND_SECONDS);
          setDevCode(res.data.data?.devCode || null);
        } else {
          setError(res.data?.error || 'Could not send code. Please try again.');
        }
      } catch (err: any) {
        setError(getApiErrorMessage(err, 'Could not send code. Please try again.'));
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phone.trim();
    if (trimmed.replace(/\D/g, '').length < 6) {
      setError('Please enter a valid phone number (e.g. +232 XX XXX XXXX)');
      return;
    }
    await sendCode(trimmed);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      setError('Please enter the code you received');
      return;
    }
    setError(null);
    setIsVerifying(true);
    try {
      const res = await api.post('/auth/phone/verify', { phone: phone.trim(), code: code.trim() });
      if (res.data?.success) {
        const { user, token, isNewUser } = res.data.data;
        onVerified(user, token, !!isNewUser);
      } else {
        setError(res.data?.error || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Verification failed. Please try again.'));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="otp-error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 rounded-lg bg-red/10 border border-red/30 text-red text-sm text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {stage === 'phone' ? (
        <motion.form
          key="phone-stage"
          onSubmit={handleSend}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-5"
        >
          <motion.div variants={fadeUpItem}>
            <label htmlFor="otp-phone" className="block text-sm font-medium text-text-primary mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className={iconCls} />
              <input
                id="otp-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+232 XX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-[48px] bg-black-surface border border-medium-gray rounded-lg pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(244, 224, 89,0.1)]"
              />
            </div>
            <p className="mt-1.5 text-xs text-text-muted">
              Enter your number with country code — e.g. +232 for Sierra Leone.
            </p>
          </motion.div>

          <motion.div variants={fadeUpItem}>
            <button
              type="submit"
              disabled={isSending}
              className="w-full h-[48px] bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-gold/10"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Code'}
            </button>
          </motion.div>
        </motion.form>
      ) : (
        <motion.form
          key="code-stage"
          onSubmit={handleVerify}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-5"
        >
          <motion.div variants={fadeUpItem}>
            <p className="text-sm text-text-secondary text-center">
              We sent a code to <span className="text-text-primary font-medium">{phone}</span>
            </p>
          </motion.div>

          <motion.div variants={fadeUpItem}>
            <label htmlFor="otp-code" className="block text-sm font-medium text-text-primary mb-1.5">
              Verification Code
            </label>
            <div className="relative">
              <Lock className={iconCls} />
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-[48px] bg-black-surface border border-medium-gray rounded-lg pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(244, 224, 89,0.1)]"
              />
            </div>
            {devCode && (
              <p className="mt-1.5 text-xs text-text-muted">Dev code: {devCode}</p>
            )}
          </motion.div>

          <motion.div variants={fadeUpItem}>
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full h-[48px] bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-gold/10"
            >
              {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : verifyLabel}
            </button>
          </motion.div>

          <motion.div variants={fadeUpItem} className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStage('phone');
                setError(null);
                setCode('');
              }}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              ← Change number
            </button>
            <button
              type="button"
              onClick={() => sendCode(phone.trim())}
              disabled={resendCountdown > 0 || isSending}
              className="text-gold hover:text-gold-light transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendCountdown > 0 ? `Resend code (${resendCountdown}s)` : 'Resend code'}
            </button>
          </motion.div>
        </motion.form>
      )}
    </div>
  );
}
