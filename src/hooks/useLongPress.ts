import { useRef, useCallback, useEffect } from 'react';

interface UseLongPressOptions {
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  threshold?: number;
  disabled?: boolean;
}

export function useLongPress({ onLongPress, onClick, threshold = 500, disabled = false }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      isLongPressRef.current = false;
      const touch = 'touches' in e ? e.touches[0] : null;
      startPosRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress(e);
        if ('vibrate' in navigator) navigator.vibrate(40);
      }, threshold);
    },
    [disabled, onLongPress, threshold]
  );

  const move = useCallback(
    (e: React.TouchEvent) => {
      if (!startPosRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startPosRef.current.x;
      const dy = touch.clientY - startPosRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clearTimer();
      }
    },
    [clearTimer]
  );

  const end = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      clearTimer();
      if (!isLongPressRef.current && onClick) {
        onClick(e);
      }
      isLongPressRef.current = false;
      startPosRef.current = null;
    },
    [clearTimer, onClick]
  );

  const cancel = useCallback(() => {
    clearTimer();
    isLongPressRef.current = false;
    startPosRef.current = null;
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: end,
    onTouchMove: move,
    onTouchCancel: cancel,
  };
}
