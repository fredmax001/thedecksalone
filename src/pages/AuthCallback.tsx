import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { fetchMe, setAuth } = useAuthStore();

  useEffect(() => {
    // Google OAuth redirects with token in hash fragment: /auth/callback#token=...
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      navigate('/login?error=' + encodeURIComponent(error));
      return;
    }

    if (token) {
      // Store token via Zustand persist (soundit-auth key) so the auth store picks it up.
      // We set a minimal user object and let fetchMe populate the full profile.
      setAuth({ id: '', email: '', username: '', role: 'USER' } as any, token);
      fetchMe().then(() => {
        const user = useAuthStore.getState().user;
        if (user?.role === 'ADMIN' || user?.role === 'MODERATOR') {
          navigate('/admin');
        } else if (user?.role === 'DJ') {
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
          navigate(isMobile ? '/discover' : '/dashboard');
        } else {
          navigate('/discover');
        }
      });
    } else {
      navigate('/login');
    }
  }, [navigate, fetchMe, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-text-primary">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4" />
        <p className="text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}
