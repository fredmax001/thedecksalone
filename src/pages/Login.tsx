import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { openGoogleAuth } from '@/lib/googleAuth';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { redirectAfterAuth } from '@/lib/navigation';

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

export default function Login() {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { isAuthenticated, user, login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      redirectAfterAuth(user?.role, navigate);
    }
  }, [isAuthenticated, user]);

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
      redirectAfterAuth(user?.role, navigate);
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await openGoogleAuth();
    } catch (err) {
      console.error('Google login error:', err);
      setError('Could not open Google sign-in. Please try again.');
    }
  };

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

          {/* Google Login */}
          <motion.div variants={fadeUpItem}>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full h-[48px] bg-white hover:bg-gray-100 text-black text-sm font-bold rounded-xl flex items-center justify-center gap-3 transition-all shadow-md active:scale-95 border border-white/20"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <span>Continue with Google</span>
            </button>
          </motion.div>

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
    </AuthLayout>
  );
}
