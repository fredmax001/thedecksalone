import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import PasswordStrength from '@/components/PasswordStrength';
import api from '@/lib/api';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/\d/, 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fadeUpItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const passwordValue = watch('password') || '';

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword: data.password,
      });
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(res.data.error || 'Reset failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout quote="Your stage is waiting. Create your profile and let the world hear your sound.">
        <div className="bg-black-surface border border-dark-gray rounded-2xl p-8 sm:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.3)] text-center">
          <h2 className="text-[24px] font-semibold uppercase tracking-tight text-text-primary font-display">
            Invalid Link
          </h2>
          <p className="mt-3 text-text-secondary">
            This password reset link is invalid or has expired.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-flex items-center justify-center h-[48px] px-8 bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] transition-transform"
          >
            Request New Link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout quote="Your stage is waiting. Create your profile and let the world hear your sound.">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease }}
          className="bg-black-surface border border-dark-gray rounded-2xl p-8 sm:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.3)] text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            <CheckCircle className="w-16 h-16 text-green mx-auto" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4, ease }}
            className="mt-6 text-[24px] font-semibold uppercase tracking-tight text-text-primary font-display"
          >
            Password Updated
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4, ease }}
            className="mt-3 text-text-secondary"
          >
            Your password has been reset successfully. Redirecting you to sign in...
          </motion.p>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      quote="Join verified DJs shaping the sound of Sierra Leone."
      statLine="Upload mixes, get booked, grow your audience"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="bg-black-surface border border-dark-gray rounded-2xl p-6 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
      >
        <div className="text-center mb-8">
          <h1 className="text-[28px] sm:text-[36px] font-semibold uppercase tracking-tight text-text-primary font-display">
            New Password
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Create a new password for your account
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
          className="flex flex-col gap-5"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.05 } },
          }}
        >
          <motion.div variants={fadeUpItem}>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                {...register('password')}
                className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-11 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,162,74,0.1)] ${
                  errors.password
                    ? 'border-red focus:border-red focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                    : 'border-medium-gray'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                tabIndex={-1}
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
            <PasswordStrength password={passwordValue} />
          </motion.div>

          <motion.div variants={fadeUpItem}>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-11 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,162,74,0.1)] ${
                  errors.confirmPassword
                    ? 'border-red focus:border-red focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                    : 'border-medium-gray'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 text-sm text-red"
              >
                {errors.confirmPassword.message}
              </motion.p>
            )}
          </motion.div>

          <motion.div variants={fadeUpItem}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[48px] bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Update Password'
              )}
            </button>
          </motion.div>

          <motion.div variants={fadeUpItem} className="text-center">
            <Link
              to="/login"
              className="text-sm text-gold hover:text-gold-light transition-colors"
            >
              Back to Sign In
            </Link>
          </motion.div>
        </motion.form>
      </motion.div>
    </AuthLayout>
  );
}
