import { Link } from 'react-router-dom';
import { Instagram, Twitter, Youtube, Music } from 'lucide-react';

const platformLinks = [
  { label: 'Discover DJs', path: '/discover' },
  { label: 'Rankings', path: '/rankings' },
  { label: 'Mix Hub', path: '/mixes' },
  { label: 'Events', path: '/events' },
  { label: 'Book a DJ', path: '/booking' },
  { label: 'Battle Arena', path: '/battles' },
];

const resourceLinks = [
  { label: 'Hall of Fame', path: '/hall-of-fame' },
  { label: 'Blog', path: '#' },
  { label: 'Help Center', path: '#' },
  { label: 'Privacy Policy', path: '#' },
  { label: 'Terms of Service', path: '#' },
];

const socialLinks = [
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
  { icon: Music, label: 'TikTok', href: '#' },
];

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/5">
      <div className="container-main pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <img
                src="/logo.png"
                alt="Deck Salone"
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
              The first official digital ecosystem for DJs in Sierra Leone and
              across Africa.
            </p>
            <div className="flex items-center gap-4 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="text-text-muted hover:text-gold transition-colors duration-200"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-text-primary mb-4">
              Platform
            </h4>
            <ul className="space-y-3">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-text-secondary hover:text-gold transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-text-primary mb-4">
              Resources
            </h4>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-text-secondary hover:text-gold transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-text-primary mb-4">
              Connect
            </h4>
            <p className="text-text-secondary text-sm mb-4">
              Follow us for updates, featured DJs, and exclusive content.
            </p>
            <div className="flex items-center gap-1 text-sm text-text-muted">
              <span>SLE</span>
              <span className="mx-2">|</span>
              <span>English</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-xs">
            &copy; 2025 Deck Salone. A Sound It Entertainment platform.
          </p>
          <p className="text-text-muted text-xs">
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
