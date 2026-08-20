import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  X,
  ArrowRight,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import api from '@/lib/api';
import { toast } from 'sonner';

/* ─── Schema ─── */
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

/* ─── Framer Motion easing ─── */
const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

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

function SoundcloudIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M11.56 8.87V17h8.55c1.59 0 2.89-1.29 2.89-2.89 0-1.57-1.25-2.84-2.81-2.88-.23-2.14-2.03-3.8-4.22-3.8-.95 0-1.84.32-2.55.87-.51-.97-1.12-1.84-1.86-2.5v3.07zM1.01 13.91c-.01.12-.01.24-.01.36 0 1.5 1.05 2.73 2.45 2.73h.14v-5.63c-.11.02-.21.05-.31.08-1.27.38-2.21 1.34-2.27 2.46zm2.34-3.56v6.65h1.16v-6.93c-.41.07-.8.17-1.16.28zm2.33-.42v7.07h1.17v-7.3c-.41.05-.8.13-1.17.23zm2.33-.29v7.36h1.17V9.37c-.4.07-.79.16-1.17.27zm2.33-.14v7.5h1.17V9.1c-.4.06-.79.14-1.17.22z" />
    </svg>
  );
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // SoundCloud Quick Connect Modal
  const [showSoundCloudModal, setShowSoundCloudModal] = useState(false);
  const [soundCloudInput, setSoundCloudInput] = useState('');
  const [soundCloudLoading, setSoundCloudLoading] = useState(false);

  const { login, setAuth, fetchMe } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const errParam = searchParams.get('error');
    if (errParam) {
      if (errParam === 'google_auth_failed') {
        setError('Google sign in could not be completed. Please try again.');
      } else if (errParam === 'access_denied') {
        setError('Sign in was cancelled.');
      } else {
        setError(`Sign in failed: ${errParam}`);
      }
    }
    if (searchParams.get('soundcloud_modal') === 'true') {
      setShowSoundCloudModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      const savedRemember = localStorage.getItem('deck_salone_remember_me');
      if (savedRemember === 'true') {
        setRememberMe(true);
        const savedEmail = localStorage.getItem('deck_salone_saved_email');
        const savedPassword = localStorage.getItem('deck_salone_saved_password');
        if (savedEmail) setValue('email', savedEmail);
        if (savedPassword) setValue('password', savedPassword);
      }
    } catch (e) {
      console.warn('LocalStorage error reading saved credentials:', e);
    }
  }, [setValue]);

  const handleRoleRedirect = (role?: string) => {
    if (role === 'MODERATOR') {
      navigate('/moderator');
    } else if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      navigate('/admin');
    } else if (role === 'FINANCE_ADMIN') {
      navigate('/finance');
    } else if (role === 'SUPPORT_ADMIN') {
      navigate('/support');
    } else if (role === 'VERIFICATION_ADMIN') {
      navigate('/verification');
    } else if (role === 'DJ') {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
      navigate(isMobile ? '/discover' : '/dashboard');
    } else {
      navigate('/discover');
    }
  };

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    setIsSubmitting(true);

    try {
      if (rememberMe) {
        localStorage.setItem('deck_salone_remember_me', 'true');
        localStorage.setItem('deck_salone_saved_email', data.email);
        localStorage.setItem('deck_salone_saved_password', data.password);
      } else {
        localStorage.removeItem('deck_salone_remember_me');
        localStorage.removeItem('deck_salone_saved_email');
        localStorage.removeItem('deck_salone_saved_password');
      }
    } catch (e) {
      console.warn('LocalStorage error saving credentials:', e);
    }

    const result = await login(data.email, data.password);
    setIsSubmitting(false);
    if (result.success) {
      const user = useAuthStore.getState().user;
      handleRoleRedirect(user?.role);
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const handleSoundCloudConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soundCloudInput.trim()) {
      toast.error('Please enter your SoundCloud profile URL or username');
      return;
    }

    try {
      setSoundCloudLoading(true);
      const res = await api.post('/auth/soundcloud/login', {
        profileUrl: soundCloudInput.trim(),
      });

      if (res.data.success && res.data.token) {
        localStorage.setItem('token', res.data.token);
        setAuth(res.data.user || ({ id: '', email: '', username: '', role: 'USER' } as any), res.data.token);
        await fetchMe();
        toast.success('Successfully connected with SoundCloud!');
        setShowSoundCloudModal(false);
        const user = useAuthStore.getState().user;
        handleRoleRedirect(user?.role);
      } else {
        toast.error(res.data.error || 'Could not connect SoundCloud account');
      }
    } catch (err: any) {
      console.error('SoundCloud login failed:', err);
      toast.error(err.response?.data?.error || 'SoundCloud connection failed. Please check your username.');
    } finally {
      setSoundCloudLoading(false);
    }
  };

  const googleLoginUrl = '/api/v1/auth/google';
  const soundCloudOAuthUrl = '/api/v1/auth/soundcloud';

  return (
    <AuthLayout
      quote="Join verified DJs shaping the sound of Sierra Leone."
      statLine="Upload mixes, get booked, grow your audience"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="bg-black-surface border border-dark-gray rounded-2xl p-6 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] sm:text-[36px] font-semibold uppercase tracking-tight text-text-primary font-display">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Sign in to your account
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 rounded-lg bg-red/10 border border-red/30 text-red text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        <motion.form
          onSubmit={handleSubmit(onSubmit)}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-5"
        >
          {/* Email */}
          <motion.div variants={fadeUpItem}>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="dj@example.com"
                {...register('email')}
                className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(244, 224, 89,0.1)] ${
                  errors.email
                    ? 'border-red focus:border-red focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                    : 'border-medium-gray'
                }`}
              />
            </div>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 text-sm text-red"
              >
                {errors.email.message}
              </motion.p>
            )}
          </motion.div>

          {/* Password */}
          <motion.div variants={fadeUpItem}>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-11 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(244, 224, 89,0.1)] ${
                  errors.password
                    ? 'border-red focus:border-red focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                    : 'border-medium-gray'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 text-sm text-red"
              >
                {errors.password.message}
              </motion.p>
            )}
          </motion.div>

          {/* Remember Me & Forgot Password */}
          <motion.div
            variants={fadeUpItem}
            className="flex items-center justify-between text-sm"
          >
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-medium-gray bg-black-surface text-gold focus:ring-gold/20 focus:ring-offset-0 cursor-pointer accent-[#f4e059]"
              />
              <span className="text-text-secondary">Remember Me</span>
            </label>

            <Link
              to="/forgot-password"
              className="text-gold hover:text-gold-light transition-colors font-medium text-xs sm:text-sm"
            >
              Forgot Password?
            </Link>
          </motion.div>

          {/* Sign In button */}
          <motion.div variants={fadeUpItem}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[48px] bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-gold/10"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </motion.div>

          {/* Divider */}
          <motion.div
            variants={fadeUpItem}
            className="relative flex items-center gap-3 py-1"
          >
            <div className="flex-1 h-px bg-dark-gray" />
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              OR CONTINUE WITH
            </span>
            <div className="flex-1 h-px bg-dark-gray" />
          </motion.div>

          {/* Social login buttons: Google & SoundCloud */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Google */}
            <motion.div variants={fadeUpItem}>
              <a
                href={googleLoginUrl}
                className="w-full h-[46px] bg-white hover:bg-gray-100 text-black text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </a>
            </motion.div>

            {/* SoundCloud */}
            <motion.div variants={fadeUpItem}>
              <button
                type="button"
                onClick={() => setShowSoundCloudModal(true)}
                className="w-full h-[46px] bg-[#FF5500] hover:bg-[#ff6a1f] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95 shadow-[#ff5500]/20"
              >
                <SoundcloudIcon className="w-5 h-5 text-white" />
                SoundCloud
              </button>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.p
            variants={fadeUpItem}
            className="text-center text-sm text-text-secondary mt-2"
          >
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="text-gold hover:text-gold-light font-medium transition-colors"
            >
              Join as DJ or Fan
            </Link>
          </motion.p>
        </motion.form>
      </motion.div>

      {/* ─── SOUNDCLOUD QUICK CONNECT MODAL ─── */}
      <AnimatePresence>
        {showSoundCloudModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl bg-[#141412] border border-[#FF5500]/30 p-6 sm:p-8 shadow-2xl space-y-6"
            >
              <button
                onClick={() => setShowSoundCloudModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-[#FF5500]/20 border border-[#FF5500]/40 flex items-center justify-center text-[#FF5500] mx-auto shadow-lg shadow-[#FF5500]/20">
                  <SoundcloudIcon className="w-8 h-8" />
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-white">
                  Continue with SoundCloud
                </h2>
                <p className="text-xs text-text-secondary">
                  Sign in or link your SoundCloud profile to import your DJ identity and mixes.
                </p>
              </div>

              {/* 1. Direct OAuth Button */}
              <a
                href={soundCloudOAuthUrl}
                className="w-full h-11 rounded-xl bg-[#FF5500] hover:bg-[#ff6a1f] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
              >
                <SoundcloudIcon className="w-4 h-4" />
                Authorize with SoundCloud
              </a>

              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  OR USE USERNAME / URL
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* 2. Direct Profile URL / Username Sign In Form */}
              <form onSubmit={handleSoundCloudConnect} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    SoundCloud Username or Profile Link
                  </label>
                  <input
                    type="text"
                    value={soundCloudInput}
                    onChange={(e) => setSoundCloudInput(e.target.value)}
                    placeholder="e.g. djfredmax or soundcloud.com/djfredmax"
                    className="w-full h-11 bg-black-surface border border-dark-gray rounded-xl px-3.5 text-xs text-white placeholder:text-text-muted outline-none focus:border-[#FF5500]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={soundCloudLoading}
                  className="w-full h-11 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
                >
                  {soundCloudLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gold" />
                  ) : (
                    <>
                      <span>Quick Connect</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
