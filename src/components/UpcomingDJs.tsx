import { motion, type Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Flame, MapPin, Users, Disc } from 'lucide-react';
import { useUpcomingDJs } from '@/hooks/useHearThis';

interface UpcomingDJsProps {
  limit?: number;
}

export default function UpcomingDJs({ limit = 8 }: UpcomingDJsProps) {
  const { data, isLoading } = useUpcomingDJs(limit);

  if (isLoading) {
    return (
      <section className="py-12">
        <div className="flex items-center gap-3 mb-8">
          <Flame className="w-8 h-8 text-gold" />
          <div>
            <h2 className="text-2xl font-display font-bold uppercase tracking-wider text-white">Rising Stars</h2>
            <p className="text-text-muted text-sm">Sierra Leone's upcoming DJ talent</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-[4/5] rounded-xl bg-[#111] animate-pulse border border-white/5" />
          ))}
        </div>
      </section>
    );
  }

  const djs = data?.data || [];

  if (djs.length === 0) {
    return null;
  }

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <section className="py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
          <Flame className="w-6 h-6 text-gold" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold uppercase tracking-wider text-white">Rising Stars</h2>
          <p className="text-text-muted text-sm">Sierra Leone's upcoming DJ talent</p>
        </div>
      </div>

      <motion.div 
        className="flex overflow-x-auto md:grid md:grid-cols-4 gap-4 pb-4 md:pb-0 hide-scrollbar"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        {djs.map((dj: any) => {
          const profileUrl = `/dj/${dj.user?.username || dj.id}`;
          const isNew = dj.totalMixes > 0; // Simplified "New Talent" logic for now

          return (
            <motion.div key={dj.id} variants={item} className="min-w-[240px] md:min-w-0">
              <Link 
                to={profileUrl}
                className="group relative block aspect-[4/5] rounded-xl overflow-hidden border border-white/5 bg-[#111] transition-all hover:scale-[1.02] hover:border-gold/50"
              >
                <img 
                  src={dj.avatar || '/avatar-placeholder.jpg'} 
                  alt={dj.stageName}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                
                {/* Badges top */}
                <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                  {isNew ? (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1 uppercase">
                      <Flame size={10} /> New Talent
                    </span>
                  ) : <div />}
                  
                  <span className={`text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase ${
                    dj.yearsActive <= 1 ? 'bg-gold text-black' : 
                    dj.yearsActive === 2 ? 'bg-orange-500 text-white' : 
                    'bg-white text-black'
                  }`}>
                    {dj.yearsActive === 0 ? '<1 YR' : `${dj.yearsActive} YR${dj.yearsActive > 1 ? 'S' : ''}`}
                  </span>
                </div>

                {/* Info bottom */}
                <div className="absolute bottom-0 left-0 w-full p-4">
                  <h3 className="text-xl font-display font-bold text-white mb-1 group-hover:text-gold transition-colors line-clamp-1">
                    {dj.stageName}
                  </h3>
                  
                  {dj.djType && (
                    <p className="text-xs text-gold uppercase tracking-wider font-medium mb-2">
                      {dj.djType}
                    </p>
                  )}
                  
                  {dj.city && (
                    <div className="flex items-center text-xs text-text-muted mb-3">
                      <MapPin size={12} className="mr-1" />
                      {dj.city}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-white">
                      <Users size={12} className="text-gold" />
                      {new Intl.NumberFormat('en-US', { notation: 'compact' }).format(dj.totalFollowers || 0)}
                    </div>
                    <div className="flex items-center gap-1.5 text-white">
                      <Disc size={12} className="text-gold" />
                      {dj.totalMixes || 0} Mixes
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
