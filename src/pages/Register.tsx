import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  MapPin,
  Calendar,
  Upload,
  Loader2,
  CheckCircle,
  ChevronRight,
  Headphones,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import PasswordStrength from '@/components/PasswordStrength';

/* ─── Constants ─── */
const CITIES = ['Freetown', 'Bo', 'Kenema', 'Makeni', 'Other'] as const;

const GENRES = [
  'Afrobeats',
  'Amapiano',
  'Dancehall',
  'Hip Hop',
  'Gospel',
  'Salone Mix',
  'Club Mix',
  'Throwback',
  'Reggae',
  'R&B',
] as const;

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ─── Schemas ─── */
const step1Schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/\d/, 'Must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  stageName: z.string().min(2, 'Stage name must be at least 2 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  userType: z.enum(['DJ', 'Promoter / Fan']).default('DJ'),
  terms: z.literal(true),
});

const step2Schema = z.object({
  city: z.string().min(1, 'Please select a city'),
  genres: z.array(z.string()).min(1, 'Select at least one genre'),
  yearsActive: z
    .string()
    .min(1, 'Years active is required')
    .refine((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 0 && num <= 60;
    }, 'Must be between 0 and 60'),
  bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),
});

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;

/* ─── Page Variants ─── */
const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -20 : 20,
    opacity: 0,
  }),
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

/* ─── Register Page ─── */
export default function Register() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [bioLength, setBioLength] = useState(0);

  /* ─── Step 1 Form ─── */
  const {
    register: registerStep1,
    handleSubmit: handleSubmitStep1,
    watch: watchStep1,
    formState: { errors: errorsStep1 },
  } = useForm<Step1Form>({
    resolver: zodResolver(step1Schema as never),
    defaultValues: {
      userType: 'DJ',
    },
  });

  const passwordValue = watchStep1('password') || '';

  /* ─── Step 2 Form ─── */
  const {
    register: registerStep2,
    handleSubmit: handleSubmitStep2,
    formState: { errors: errorsStep2 },
    setValue: setValueStep2,
  } = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      genres: [],
      yearsActive: '',
    },
  });

  /* ─── Handlers ─── */
  const onStep1Submit = useCallback(() => {
    setDirection(1);
    setStep(2);
  }, []);

  const onStep2Submit = useCallback(
    async (data: Step2Form) => {
      setIsSubmitting(true);
      setError(null);

      const step1 = watchStep1();
      const role = step1.userType === 'DJ' ? 'DJ' : 'USER';

      const registerResult = await register(
        step1.email,
        step1.password,
        role,
        step1.phone
      );

      if (!registerResult.success) {
        setIsSubmitting(false);
        setError(registerResult.error || 'Registration failed');
        return;
      }

      // If DJ, create DJ profile
      if (role === 'DJ') {
        try {
          await api.post('/djs', {
            stageName: step1.stageName,
            fullName: step1.fullName,
            city: data.city,
            genres: data.genres,
            yearsActive: parseInt(data.yearsActive, 10),
            bio: data.bio || '',
          });
        } catch (err: any) {
          setIsSubmitting(false);
          setError(err.response?.data?.error || 'Could not create DJ profile');
          return;
        }
      }

      setIsSubmitting(false);
      setCompleted(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    },
    [register, navigate, watchStep1]
  );

  const toggleGenre = useCallback(
    (genre: string) => {
      setSelectedGenres((prev) => {
        const updated = prev.includes(genre)
          ? prev.filter((g) => g !== genre)
          : prev.length < 3
            ? [...prev, genre]
            : prev;
        setValueStep2('genres', updated, { shouldValidate: true });
        return updated;
      });
    },
    [setValueStep2]
  );

  /* ─── Completion State ─── */
  if (completed) {
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
            className="mt-6 text-[28px] font-semibold uppercase tracking-tight text-text-primary font-display"
          >
            Welcome to Deck Salone!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4, ease }}
            className="mt-3 text-text-secondary"
          >
            Your profile is now live. Start uploading mixes and get discovered.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4, ease }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center h-[48px] px-8 bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] transition-transform"
            >
              Go to Dashboard
            </a>
            <a
              href="/mixes"
              className="inline-flex items-center justify-center h-[48px] px-8 bg-black-elevated text-text-primary font-semibold text-sm uppercase tracking-wide rounded-full border border-dark-gray hover:bg-medium-gray transition-colors"
            >
              Upload a Mix
            </a>
          </motion.div>
        </motion.div>
      </AuthLayout>
    );
  }

  /* ─── Main Register Form ─── */
  return (
    <AuthLayout quote="Your stage is waiting. Create your profile and let the world hear your sound.">
      <div className="bg-black-surface border border-dark-gray rounded-2xl p-6 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-[28px] sm:text-[36px] font-semibold uppercase tracking-tight text-text-primary font-display">
            {step === 1 ? 'Join Deck Salone' : 'Complete Your Profile'}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {step === 1 ? 'Create your account to get started' : 'Tell us about your DJ style'}
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

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Step {step} of 2
            </span>
            <span className="text-xs font-medium text-gold">
              {step === 1 ? 'Account' : 'Profile'}
            </span>
          </div>
          <div className="h-1.5 bg-dark-gray rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gold rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: step === 1 ? '50%' : '100%' }}
              transition={{ duration: 0.4, ease }}
            />
          </div>
        </div>

        {/* ─── Step 1: Account ─── */}
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 && (
            <motion.form
              key="step1"
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease }}
              onSubmit={handleSubmitStep1(onStep1Submit)}
              className="flex flex-col gap-5"
            >
              {/* Stage Name */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Stage Name / DJ Name
                </label>
                <div className="relative">
                  <Headphones className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="DJ YourName"
                    {...registerStep1('stageName')}
                    className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,162,74,0.1)] ${
                      errorsStep1.stageName ? 'border-red' : 'border-medium-gray'
                    }`}
                  />
                </div>
                {errorsStep1.stageName && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1.5 text-sm text-red"
                  >
                    {errorsStep1.stageName.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Full Name */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Your full legal name"
                    {...registerStep1('fullName')}
                    className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,162,74,0.1)] ${
                      errorsStep1.fullName ? 'border-red' : 'border-medium-gray'
                    }`}
                  />
                </div>
                {errorsStep1.fullName && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1.5 text-sm text-red"
                  >
                    {errorsStep1.fullName.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Email */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="dj@example.com"
                    {...registerStep1('email')}
                    className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,162,74,0.1)] ${
                      errorsStep1.email ? 'border-red' : 'border-medium-gray'
                    }`}
                  />
                </div>
                {errorsStep1.email && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1.5 text-sm text-red"
                  >
                    {errorsStep1.email.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Phone */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Phone Number <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+232 XX XXX XXXX"
                  {...registerStep1('phone')}
                  className="w-full h-[48px] bg-black-surface border border-medium-gray rounded-lg px-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,162,74,0.1)]"
                />
              </motion.div>

              {/* Password */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...registerStep1('password')}
                    className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-11 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,162,74,0.1)] ${
                      errorsStep1.password ? 'border-red' : 'border-medium-gray'
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
                {errorsStep1.password && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1.5 text-sm text-red"
                  >
                    {errorsStep1.password.message}
                  </motion.p>
                )}
                {/* Password strength indicator */}
                <PasswordStrength password={passwordValue} />
              </motion.div>

              {/* Confirm Password */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...registerStep1('confirmPassword')}
                    className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-11 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,162,74,0.1)] ${
                      errorsStep1.confirmPassword ? 'border-red' : 'border-medium-gray'
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
                {errorsStep1.confirmPassword && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1.5 text-sm text-red"
                  >
                    {errorsStep1.confirmPassword.message}
                  </motion.p>
                )}
              </motion.div>

              {/* User Type */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  I am a:
                </label>
                <div className="flex gap-3">
                  {(['DJ', 'Promoter / Fan'] as const).map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-medium-gray bg-black-surface cursor-pointer hover:border-gold/50 transition-colors"
                    >
                      <input
                        type="radio"
                        value={type}
                        {...registerStep1('userType')}
                        className="accent-gold w-4 h-4"
                      />
                      <span className="text-sm text-text-primary">{type}</span>
                    </label>
                  ))}
                </div>
              </motion.div>

              {/* Terms */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    {...registerStep1('terms')}
                    className="accent-gold w-4 h-4 mt-0.5 rounded"
                  />
                  <span className="text-sm text-text-secondary leading-relaxed">
                    I agree to the{' '}
                    <a href="#" className="text-gold hover:text-gold-light underline">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-gold hover:text-gold-light underline">
                      Privacy Policy
                    </a>
                  </span>
                </label>
                {errorsStep1.terms && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1.5 text-sm text-red"
                  >
                    {errorsStep1.terms.message as string}
                  </motion.p>
                )}
              </motion.div>

              {/* Continue Button */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <button
                  type="submit"
                  className="w-full h-[48px] bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>

              {/* Footer */}
              <motion.p
                variants={fadeUpItem}
                initial="hidden"
                animate="show"
                className="text-center text-sm text-text-secondary"
              >
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-gold hover:text-gold-light font-medium transition-colors"
                >
                  Sign in
                </Link>
              </motion.p>
            </motion.form>
          )}

          {/* ─── Step 2: Profile ─── */}
          {step === 2 && (
            <motion.form
              key="step2"
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease }}
              onSubmit={handleSubmitStep2(onStep2Submit)}
              className="flex flex-col gap-5"
            >
              {/* City */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  City
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                  <select
                    {...registerStep2('city')}
                    className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-4 text-sm text-text-primary outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,162,74,0.1)] appearance-none cursor-pointer ${
                      errorsStep2.city ? 'border-red' : 'border-medium-gray'
                    }`}
                  >
                    <option value="" className="bg-black-surface">
                      Select your city
                    </option>
                    {CITIES.map((city) => (
                      <option key={city} value={city} className="bg-black-surface">
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
                {errorsStep2.city && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1.5 text-sm text-red"
                  >
                    {errorsStep2.city.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Genres */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Primary Genres{' '}
                  <span className="text-text-muted font-normal">(max 3)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                      <motion.button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        whileTap={{ scale: 0.95 }}
                        className={`px-3.5 py-2 rounded-full text-xs font-semibold uppercase tracking-wide border transition-all duration-150 ${
                          isSelected
                            ? 'bg-gold/15 border-gold text-gold'
                            : 'border-medium-gray text-text-secondary hover:text-text-primary hover:border-text-muted'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {isSelected && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-gold"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </motion.span>
                          )}
                          {genre}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                <input type="hidden" {...registerStep2('genres')} />
                {errorsStep2.genres && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1.5 text-sm text-red"
                  >
                    {errorsStep2.genres.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Years Active */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Years Active
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                  <input
                    type="number"
                    min={0}
                    max={60}
                    placeholder="0"
                    {...registerStep2('yearsActive')}
                    className={`w-full h-[48px] bg-black-surface border rounded-lg pl-11 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,162,74,0.1)] ${
                      errorsStep2.yearsActive ? 'border-red' : 'border-medium-gray'
                    }`}
                  />
                </div>
                {errorsStep2.yearsActive && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1.5 text-sm text-red"
                  >
                    {errorsStep2.yearsActive.message}
                  </motion.p>
                )}
              </motion.div>

              {/* Bio */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Bio{' '}
                  <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Tell us about yourself and your style..."
                  {...registerStep2('bio')}
                  onChange={(e) => {
                    registerStep2('bio').onChange(e);
                    setBioLength(e.target.value.length);
                  }}
                  className="w-full bg-black-surface border border-medium-gray rounded-lg p-4 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold focus:shadow-[0_0_0_3px_rgba(212,162,74,0.1)] resize-none"
                />
                <p className="mt-1 text-xs text-text-muted text-right">
                  {bioLength}/500
                </p>
              </motion.div>

              {/* Profile Photo Upload */}
              <motion.div variants={fadeUpItem} initial="hidden" animate="show">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Profile Photo
                </label>
                <div
                  className="border-2 border-dashed border-medium-gray rounded-xl p-6 text-center hover:border-gold transition-colors cursor-pointer"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.click();
                  }}
                >
                  <Upload className="w-8 h-8 text-gold mx-auto mb-2" />
                  <p className="text-sm text-text-secondary">
                    Click to upload photo
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    JPG, PNG (max 5MB)
                  </p>
                </div>
              </motion.div>

              {/* Action buttons */}
              <motion.div
                variants={fadeUpItem}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-3"
              >
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-[48px] bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Create Profile'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDirection(-1);
                    setStep(1);
                  }}
                  className="w-full h-[44px] text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  Back
                </button>
              </motion.div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </AuthLayout>
  );
}
