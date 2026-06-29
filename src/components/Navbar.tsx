import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const navLinks = [
  { label: 'Discover', path: '/discover' },
  { label: 'Rankings', path: '/rankings' },
  { label: 'Mixes', path: '/mixes' },
  { label: 'Events', path: '/events' },
  { label: 'Battles', path: '/battles' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'glass-nav border-b border-white/5 shadow-nav'
            : 'bg-transparent'
        }`}
        style={{ height: '140px' }}
      >
        <div className="container-main h-full flex items-center justify-between">
          {/* Logo — larger for visibility */}
          <Link to="/" className="flex items-center shrink-0">
            <img
              src="/logo.png"
              alt="Deck Salone"
              className="h-32 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative text-sm font-medium uppercase tracking-[0.05em] transition-colors duration-300 py-1 ${
                  location.pathname === link.path
                    ? 'text-gold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {link.label}
                {location.pathname === link.path && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold"
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <button
              className="text-text-secondary hover:text-gold transition-colors p-2"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {isAuthenticated && user ? (
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-primary hover:text-gold transition-colors"
                >
                  <User className="w-4 h-4" />
                  {user.djProfile?.stageName || user.email.split('@')[0]}
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="inline-flex items-center px-5 py-2 border border-dark-gray text-text-secondary text-sm font-medium rounded-full hover:bg-medium-gray transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center px-6 py-2.5 bg-gold-gradient text-black text-sm font-semibold uppercase tracking-wide rounded-full hover:scale-[1.02] hover:brightness-110 transition-all duration-200"
              >
                Join as DJ
              </Link>
            )}

            {/* Mobile Hamburger */}
            <button
              className="lg:hidden text-text-primary p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-lg lg:hidden pt-20"
          >
            <div className="flex flex-col items-center gap-8 pt-12">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Link
                    to={link.path}
                    className={`text-2xl font-display uppercase tracking-wide ${
                      location.pathname === link.path
                        ? 'text-gold'
                        : 'text-text-primary'
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {isAuthenticated && user ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="mt-4 inline-flex items-center px-8 py-3 bg-gold-gradient text-black text-lg font-semibold uppercase tracking-wide rounded-full"
                      onClick={() => setMobileOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        navigate('/');
                        setMobileOpen(false);
                      }}
                      className="mt-2 inline-flex items-center px-8 py-3 border border-dark-gray text-text-primary text-lg font-semibold uppercase tracking-wide rounded-full"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="mt-4 inline-flex items-center px-8 py-3 bg-gold-gradient text-black text-lg font-semibold uppercase tracking-wide rounded-full"
                    onClick={() => setMobileOpen(false)}
                  >
                    Join as DJ
                  </Link>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
