import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

interface PasswordStrengthProps {
  password: string;
}

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function calculateStrength(password: string): StrengthLevel {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return score as StrengthLevel;
}

const LABELS: Record<number, string> = {
  0: 'Too weak',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
};

const COLORS: Record<number, string> = {
  0: 'bg-medium-gray',
  1: 'bg-red',
  2: 'bg-orange',
  3: 'bg-yellow-400',
  4: 'bg-green',
};

const TEXT_COLORS: Record<number, string> = {
  0: 'text-text-muted',
  1: 'text-red',
  2: 'text-orange',
  3: 'text-yellow-400',
  4: 'text-green',
};

function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => calculateStrength(password), [password]);

  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }, (_, i) => (
          <motion.div
            key={i}
            className="h-1.5 flex-1 rounded-full bg-medium-gray overflow-hidden"
          >
            <motion.div
              className={`h-full rounded-full ${COLORS[strength]}`}
              initial={{ width: '0%' }}
              animate={{
                width: i < strength ? '100%' : '0%',
              }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            />
          </motion.div>
        ))}
      </div>
      {password && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-1.5 text-xs font-medium ${TEXT_COLORS[strength]}`}
        >
          {LABELS[strength]}
        </motion.p>
      )}
    </div>
  );
}

export default memo(PasswordStrength);
