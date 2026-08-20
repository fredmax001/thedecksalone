import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; to: string };
  icon?: React.ReactNode;
}

export default function SectionHeader({ title, subtitle, action, icon }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4 sm:mb-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {icon && <span className="text-gold">{icon}</span>}
          <h2 className="font-display font-black text-sm sm:text-base md:text-lg uppercase tracking-tight text-white truncate">
            {title}
          </h2>
        </div>
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-text-secondary truncate">{subtitle}</p>
        )}
      </div>

      {action && (
        <Link
          to={action.to}
          className="shrink-0 inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold uppercase text-gold hover:text-gold-light transition-colors tracking-wide"
        >
          {action.label}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
