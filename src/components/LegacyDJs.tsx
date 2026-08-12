import { motion, type Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Crown, MapPin, Users, Disc } from 'lucide-react';
import { useLegacyDJs } from '@/hooks/useDJs';

interface LegacyDJsProps {
  limit?: number;
}

export default function LegacyDJs({ limit = 8 }: LegacyDJsProps) {
  const { data, isLoading } = useLegacyDJs(limit);

  if (isLoading) {
    return (
      <section className="py-12">
        <div className="flex items-center gap-3 mb-8">
          <Crown className="w-8 h-8 text-gold" />
          <div>
            <h2 className="text-2xl font-display font-bold uppercase tracking-wider text-white">Legends</h2>
            <p className="text-text-muted text-sm">Pioneers with 15+ years in the game</p>
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

  const djs = data || [];

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
    <section className="py-12 border-t border-white/5 mt-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20 shadow-[0_0_15px_rgba(212,162,74,0.3)]">
          <Crown className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-200">Legends</h2>
          <p className="text-text-muted text-sm">Pioneers with 15+ years in the game</p>
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

          return (
            <motion.div key={dj.id} variants={item} className="min-w-[240px] md:min-w-0">
              <Link 
                to={profileUrl}
                className="group relative block aspect-[4/5] rounded-xl overflow-hidden border border-gold/20 bg-[#111] transition-all hover:scale-[1.02] hover:border-gold hover:shadow-[0_0_30px_rgba(212,162,74,0.15)]"
              >
                <img 
                  src={dj.avatar || '/avatar-placeholder.jpg'} 
                  alt={dj.stageName}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 sepia-[0.3]"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                
                {/* Badges top */}
                <div className="absolute top-3 right-3 flex justify-end items-start">
                  <span className="bg-gradient-to-r from-yellow-600 to-gold text-black text-[10px] font-extrabold px-2 py-1 rounded shadow-lg uppercase tracking-wider flex items-center gap-1 border border-yellow-300/30">
                    <Crown size={10} /> LEGEND
                  </span>
                </div>

                {/* Info bottom */}
                <div className="absolute bottom-0 left-0 w-full p-4">
                  <h3 className="text-xl font-display font-bold text-gold mb-1 drop-shadow-md line-clamp-1">
                    {dj.stageName}
                  </h3>
                  
                  {dj.djType && (
                    <p className="text-xs text-white/80 uppercase tracking-wider font-medium mb-2">
                      {dj.djType}
                    </p>
                  )}
                  
                  {dj.city && (
                    <div className="flex items-center text-xs text-gray-300 mb-3">
                      <MapPin size={12} className="mr-1 text-gold/70" />
                      {dj.city}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-white/90">
                      <Users size={12} className="text-gold/80" />
                      {new Intl.NumberFormat('en-US', { notation: 'compact' }).format(dj.totalFollowers || 0)}
                    </div>
                    <div className="flex items-center gap-1.5 text-white/90">
                      <Disc size={12} className="text-gold/80" />
                      {dj.yearsActive} YRS
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
