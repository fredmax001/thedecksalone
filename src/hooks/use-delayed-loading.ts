import { useEffect, useState } from 'react';

/**
 * Returns true only after `isLoading` has been true continuously for `delay` ms.
 * Prevents skeletons from flashing on fast loads.
 */
export function useDelayedLoading(isLoading: boolean, delay = 300): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [isLoading, delay]);

  return isLoading && show;
}
