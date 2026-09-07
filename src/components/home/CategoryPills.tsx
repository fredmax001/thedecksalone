import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CategoryPillsProps {
  categories: { id?: string; name: string }[];
  active?: string;
}

export default function CategoryPills({ categories, active }: CategoryPillsProps) {
  const navigate = useNavigate();

  if (!categories || categories.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none -mx-3 px-3 sm:-mx-0 sm:px-0">
        {categories.map((cat) => {
          const isActive = active?.toLowerCase() === cat.name.toLowerCase();
          return (
            <button
              key={cat.id || cat.name}
              onClick={() => navigate(`/mixes?genre=${encodeURIComponent(cat.name)}`)}
              className={cn(
                'btn-press-subtle shrink-0 rounded-full px-4 py-2 text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all border',
                isActive
                  ? 'bg-gold text-black border-gold shadow-[0_0_12px_rgba(244,224,89,0.35)]'
                  : 'bg-black-surface border-dark-gray text-text-secondary hover:border-gold/40 hover:text-white'
              )}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
