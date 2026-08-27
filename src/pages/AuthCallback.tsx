import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchMe, setAuth } = useAuthStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Google OAuth redirects with token in query param, hash fragment, or state
    const hashParams = new URLSearchParams((location.hash || window.location.hash || '').replace(/^#/, ''));
    const searchParams = new URLSearchParams(location.search || window.location.search || '');

    const token =
      hashParams.get('token') ||
      searchParams.get('token') ||
      (location.state as any)?.token ||
      localStorage.getItem('token') ||
      useAuthStore.getState().token;

    const error =
      hashParams.get('error') ||
      searchParams.get('error') ||
      (location.state as any)?.error;

    console.log('[AuthCallback] Received callback:', { hasToken: !!token, error, locationSearch: location.search, locationHash: location.hash });

    if (error) {
      console.error('[Google Auth Error]:', error);
      setErrorMessage(error);
      toast.error(`Sign in failed: ${error}`);
      const timer = setTimeout(() => {
        navigate('/login?error=' + encodeURIComponent(error), { replace: true });
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (token) {
      try {
        localStorage.setItem('token', token);
      } catch (e) {
        console.warn('Could not write token to localStorage:', e);
      }

      setAuth({ id: '', email: '', username: '', role: 'USER' } as any, token);

      fetchMe()
        .then(() => {
          toast.success('Successfully signed in with Google!');
          const user = useAuthStore.getState().user;
          if (user?.role === 'MODERATOR') {
            navigate('/moderator', { replace: true });
          } else if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
            navigate('/admin', { replace: true });
          } else if (user?.role === 'FINANCE_ADMIN') {
            navigate('/finance', { replace: true });
          } else if (user?.role === 'SUPPORT_ADMIN') {
            navigate('/support', { replace: true });
          } else if (user?.role === 'VERIFICATION_ADMIN') {
            navigate('/verification', { replace: true });
          } else if (user?.role === 'DJ') {
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
            navigate(isMobile ? '/discover' : '/dashboard', { replace: true });
          } else {
            navigate('/discover', { replace: true });
          }
        })
        .catch((err) => {
          console.error('[Google Auth] Failed to fetch user profile:', err);
          navigate('/discover', { replace: true });
        });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate, location, fetchMe, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-text-primary p-4">
      <div className="text-center max-w-sm rounded-2xl bg-[#121110] border border-white/10 p-8 shadow-2xl">
        {errorMessage ? (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white uppercase">Authentication Failed</h2>
            <p className="text-xs text-text-secondary">{errorMessage}</p>
            <p className="text-[11px] text-text-muted">Redirecting to login...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 text-gold animate-spin mx-auto" />
            <h2 className="text-base font-bold text-white uppercase tracking-tight">Completing Sign In</h2>
            <p className="text-xs text-text-secondary">Securing your session with Google...</p>
          </div>
        )}
      </div>
    </div>
  );
}
