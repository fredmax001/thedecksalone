import { useEffect, useState } from 'react';

const INTRO_SEEN_KEY = 'ds-intro-seen-v2';

interface AppIntroScreenProps {
  onDone: () => void;
}

export default function AppIntroScreen({ onDone }: AppIntroScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    // enter → hold after 800ms
    const t1 = setTimeout(() => setPhase('hold'), 800);
    // hold → exit after 2600ms total
    const t2 = setTimeout(() => setPhase('exit'), 2600);
    // call onDone after exit animation completes (600ms fade)
    const t3 = setTimeout(() => {
      localStorage.setItem(INTRO_SEEN_KEY, '1');
      onDone();
    }, 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.6s ease',
        opacity: phase === 'exit' ? 0 : 1,
        pointerEvents: phase === 'exit' ? 'none' : 'all',
      }}
    >
      {/* Glowing backdrop ring */}
      <div
        style={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234,179,8,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
          transition: 'transform 1.2s ease, opacity 1.2s ease',
          transform: phase === 'enter' ? 'scale(0.5)' : 'scale(1.4)',
          opacity: phase === 'enter' ? 0 : 1,
        }}
      />

      {/* Logo container */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
          transition: 'transform 1s cubic-bezier(0.34,1.56,0.64,1), opacity 0.8s ease',
          transform: phase === 'enter' ? 'translateY(40px) scale(0.85)' : 'translateY(0) scale(1)',
          opacity: phase === 'enter' ? 0 : 1,
        }}
      >
        {/* App icon image */}
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: 30,
            overflow: 'hidden',
            background: '#ffffff',
            boxShadow: '0 0 50px rgba(234,179,8,0.5), 0 20px 60px rgba(0,0,0,0.8)',
            border: '2px solid rgba(234,179,8,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8,
          }}
        >
          <img
            src="/app-icon.png"
            alt="Deck Salone"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              el.style.display = 'none';
              const parent = el.parentElement!;
              parent.style.background = 'linear-gradient(135deg, #eab308, #854d0e)';
              parent.style.display = 'flex';
              parent.style.alignItems = 'center';
              parent.style.justifyContent = 'center';
              const span = document.createElement('span');
              span.textContent = 'DS';
              span.style.cssText = 'color:#0a0a0a;font-size:44px;font-weight:900;font-family:sans-serif;';
              parent.appendChild(span);
            }}
          />
        </div>

        {/* App name */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#eab308',
              fontFamily: "'Outfit', 'Inter', sans-serif",
              textShadow: '0 0 20px rgba(234,179,8,0.5)',
            }}
          >
            Deck Salone
          </h1>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 13,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)',
              fontFamily: "'Outfit', 'Inter', sans-serif",
            }}
          >
            Your DJ Platform
          </p>
        </div>
      </div>

      {/* Loading bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 120,
          height: 2,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #eab308, #f59e0b)',
            borderRadius: 2,
            transition: 'width 2s ease',
            width: phase === 'enter' ? '0%' : '100%',
          }}
        />
      </div>
    </div>
  );
}

/** Returns true if the intro screen should be shown this session */
export function shouldShowIntro(): boolean {
  // Only show on native Capacitor app
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
  if (!isNative) return false;
  return !localStorage.getItem(INTRO_SEEN_KEY);
}
