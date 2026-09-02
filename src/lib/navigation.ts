import type { NavigateFunction } from 'react-router-dom';

export function redirectAfterAuth(
  role: string | undefined,
  navigate: NavigateFunction,
  opts: { replace?: boolean } = {}
): void {
  const { replace } = opts;
  const navOptions = replace ? { replace: true } : undefined;

  if (role === 'MODERATOR') {
    navigate('/moderator', navOptions);
  } else if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    navigate('/admin', navOptions);
  } else if (role === 'FINANCE_ADMIN') {
    navigate('/finance', navOptions);
  } else if (role === 'SUPPORT_ADMIN') {
    navigate('/support', navOptions);
  } else if (role === 'VERIFICATION_ADMIN') {
    navigate('/verification', navOptions);
  } else if (role === 'DJ') {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    navigate(isMobile ? '/discover' : '/dashboard', navOptions);
  } else {
    navigate('/discover', navOptions);
  }
}
