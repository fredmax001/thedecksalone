import { useState, useEffect, memo } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
  className?: string;
}

const CountdownTimer = memo(function CountdownTimer({ targetDate, className = '' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className={`font-mono text-gold ${className}`}>
      {timeLeft.days > 0 && (
        <>
          <span className="text-2xl sm:text-3xl font-bold">{pad(timeLeft.days)}</span>
          <span className="text-sm text-text-muted mx-1">d</span>
        </>
      )}
      <span className="text-2xl sm:text-3xl font-bold">{pad(timeLeft.hours)}</span>
      <span className="text-sm text-text-muted mx-1">h</span>
      <span className="text-2xl sm:text-3xl font-bold">{pad(timeLeft.minutes)}</span>
      <span className="text-sm text-text-muted mx-1">m</span>
      <span className="text-2xl sm:text-3xl font-bold">{pad(timeLeft.seconds)}</span>
      <span className="text-sm text-text-muted ml-1">s</span>
    </div>
  );
});

export default CountdownTimer;
