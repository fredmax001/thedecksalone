import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { isAdminRole } from '@/constants/roles';

export function useRequireDj() {
  const { user } = useAuthStore();

  const isDj = user?.role === 'DJ' || isAdminRole(user?.role) || Boolean(user?.djProfile);

  useEffect(() => {
    if (!isDj) {
      // Intentionally left blank: callers decide what UI to render when not a DJ.
    }
  }, [isDj]);

  return isDj;
}
