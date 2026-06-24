import React, { memo } from 'react';
import { motion } from 'framer-motion';

const BAR_COUNT = 40;

function WaveformAnimation({ className }: { className?: string }) {
  const bars = React.useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => ({
        id: i,
        initialHeight: 20 + Math.random() * 40,
        delay: Math.random() * 2,
        duration: 1.5 + Math.random() * 1.5,
        x: i * 10,
      })),
    []
  );

  return (
    <div className={className}>
      {bars.map((bar) => (
        <motion.div
          key={bar.id}
          className="absolute bottom-0 w-[3px] rounded-t-full bg-gold"
          style={{
            left: `${(bar.id / BAR_COUNT) * 100}%`,
            opacity: 0.08,
          }}
          initial={{ height: bar.initialHeight }}
          animate={{
            height: [
              bar.initialHeight,
              bar.initialHeight + Math.random() * 60 + 20,
              bar.initialHeight,
            ],
          }}
          transition={{
            duration: bar.duration,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: bar.delay,
          }}
        />
      ))}
    </div>
  );
}

export default memo(WaveformAnimation);
