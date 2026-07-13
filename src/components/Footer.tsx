import { Link } from 'react-router-dom';
import { Instagram, Twitter, Youtube, Music, Mail, Phone } from 'lucide-react';

const platformLinks = [
  { label: 'Discover DJs', path: '/discover' },
  { label: 'Rankings', path: '/rankings' },
  { label: 'Mix Hub', path: '/mixes' },
  { label: 'Events', path: '/events' },
  { label: 'Book a DJ', path: '/booking' },
  { label: 'Battle Arena', path: '/battles' },
];

const resourceLinks = [
  { label: 'About', path: '/about' },
  { label: 'Hall of Fame', path: '/hall-of-fame' },
  { label: 'Blog', path: '/blog' },
  { label: 'Help Center', path: '/help' },
  { label: 'Privacy Policy', path: '/privacy' },
  { label: 'Terms of Service', path: '/terms' },
];

const socialLinks = [
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
  { icon: Music, label: 'TikTok', href: '#' },
];

export default function Footer() {
  return (
    <footer className="theme-bg border-t theme-border-card">
      {/* Full footer — desktop and tablet */}
      <div className="container-main pt-16 pb-8 hidden md:block">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <img
                src="/logo-web.png"
                alt="Deck Salone"
                className="h-6 w-auto object-contain"
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
            <ul className="space-y-3 text-sm text-text-muted">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gold shrink-0" />
                <a href="https://wa.me/23272011156" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">
                  +232 72 011 156
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gold shrink-0" />
                <a href="mailto:support@decksalone.com" className="hover:text-text-primary transition-colors">
                  support@decksalone.com
                </a>
              </li>
            </ul>
            <div className="flex items-center gap-1 text-sm text-text-muted mt-4">
              <span>English</span>
              <span className="mx-2">|</span>
              <span>Krio</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t theme-border-card flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-xs">
            &copy; 2025 Deck Salone. A Sound It Entertainment platform.
          </p>
          <p className="text-text-muted text-xs">
            All rights reserved.
          </p>
        </div>
      </div>

      {/* Compact footer — mobile only */}
      <div className="md:hidden py-6 px-4">
        <div className="flex flex-col items-center gap-3">
          <Link to="/" className="flex items-center mb-1">
            <img
              src="/logo-web.png"
              alt="Deck Salone"
              className="h-4 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="text-text-muted hover:text-gold transition-colors duration-200"
                aria-label={social.label}
              >
                <social.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
          <p className="text-center text-text-muted text-xs">
            &copy; 2025 Deck Salone. A Sound It Entertainment platform.
          </p>
        </div>
      </div>
    </footer>
  );
}
