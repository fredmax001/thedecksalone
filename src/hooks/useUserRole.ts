import { useAuthStore } from '@/stores/authStore';
import { isAdminRole } from '@/constants/roles';

export function useUserRole() {
  const { user } = useAuthStore();

  const isStaff = isAdminRole(user?.role);
  const isDj = user?.role === 'DJ' || isStaff || Boolean(user?.djProfile);

  return { isStaff, isDj, role: user?.role };
}
