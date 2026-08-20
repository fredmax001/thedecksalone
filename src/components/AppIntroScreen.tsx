import { useEffect, useState } from 'react';

interface AppIntroScreenProps {
  onDone?: () => void;
}

export default function AppIntroScreen({ onDone }: AppIntroScreenProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        onDone?.();
      }, 400);
    }, 600);

    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100dvh',
        opacity: fading ? 0 : 1,
        transition: 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: fading ? 'none' : 'all',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        <img
          src="/logo-mobile.png"
          alt="Deck Salone"
          style={{
            width: 'clamp(140px, 36vw, 210px)',
            maxWidth: '80%',
            height: 'auto',
            aspectRatio: '561 / 620',
            objectFit: 'contain',
            userSelect: 'none',
          }}
        />
      </div>
    </div>
  );
}

export function shouldShowIntro(): boolean {
  return false;
}
