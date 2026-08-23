import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export default function ThemeToggle({ variant = 'ghost', size = 'icon', className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={`w-9 h-9 rounded-full bg-black-surface/80 border border-white/10 hover:border-gold/40 text-text-muted hover:text-gold transition-all shrink-0 ${className}`}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-gold" />
      ) : (
        <Moon className="w-4 h-4 text-gold" />
      )}
    </Button>
  );
}
