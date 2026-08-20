import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Youtube, Music, Mail, Phone } from 'lucide-react';

const platformLinks = [
  { label: 'Discover DJs', path: '/discover' },
  { label: 'Rankings', path: '/rankings' },
  { label: 'Mix Hub', path: '/mixes' },
  { label: 'Events', path: '/events' },
  { label: 'Book a DJ', path: '/booking' },
  { label: 'Battle Arena', path: '/battles' },
];

const resourceLinks: Array<
  | { label: string; path: string }
  | { label: string; href: string; download: string }
> = [
  { label: 'About', path: '/about' },
  { label: 'Developer API', path: '/developers' },
  { label: 'Hall of Fame', path: '/hall-of-fame' },
  { label: 'Blog', path: '/blog' },
  { label: 'Help Center', path: '/help' },
  { label: 'Privacy Policy', path: '/privacy' },
  { label: 'Terms of Service', path: '/terms' },
  {
    label: 'Logo & Images',
    href: '/downloads/deck-salone-logos-2026.zip',
    download: 'Deck-Salone-Logos-2026.zip',
  },
];

const socialLinks = [
  { icon: Instagram, label: 'Instagram', href: 'https://instagram.com/decksalone' },
  { icon: Facebook, label: 'Facebook', href: 'https://facebook.com/decksalone' },
  { icon: Twitter, label: 'Twitter', href: 'https://x.com/decksalone' },
  { icon: Youtube, label: 'YouTube', href: 'https://youtube.com/@decksalone' },
  { icon: Music, label: 'TikTok', href: 'https://tiktok.com/@decksalone' },
];

export default function Footer() {
  return (
    <footer className="bg-black border-t border-gold/10 relative overflow-hidden">
      {/* Ambient gold glow at the very top edge */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-8 bg-gold/5 blur-2xl pointer-events-none" />
      {/* Full footer — desktop and tablet */}
      <div className="container-main pt-16 pb-8 hidden md:block">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <img
                src="/logo-web.png?v=2"
                alt="Deck Salone"
                className="h-7 w-auto object-contain"
              />
            </Link>
            <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
              The first official digital ecosystem for DJs in Sierra Leone and
              across Africa.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold/70 hover:text-gold hover:bg-gold/20 hover:border-gold/50 transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="w-3.5 h-3.5" />
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
              {resourceLinks.map((link) =>
                'href' in link ? (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      download={link.download}
                      className="text-text-secondary hover:text-gold transition-colors duration-200 text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ) : (
                  <li key={link.label}>
                    <Link
                      to={link.path}
                      className="text-text-secondary hover:text-gold transition-colors duration-200 text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              )}
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
                <a href="mailto:contact@decksalone.com" className="hover:text-text-primary transition-colors">
                  contact@decksalone.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-xs text-text-muted pl-6">
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
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-xs">
            &copy; 2026 Deck Salone. A Sound It Entertainment platform. All rights reserved.
          </p>
          <Link
            to="/install"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gold/10 border border-gold/25 text-gold text-xs font-bold uppercase tracking-wider hover:bg-gold/20 transition-all"
          >
            <Music className="w-3.5 h-3.5" /> Install Mobile App
          </Link>
        </div>
      </div>

      {/* Compact footer — mobile only */}
      <div className="md:hidden py-6 px-4">
        <div className="flex flex-col items-center gap-3">
          <Link to="/" className="flex items-center mb-1">
            <img
              src="/logo-web.png?v=2"
              alt="Deck Salone"
              className="h-5 w-auto object-contain"
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
          <a
            href="/downloads/deck-salone-logos-2026.zip"
            download="Deck-Salone-Logos-2026.zip"
            className="text-text-muted hover:text-gold transition-colors duration-200 text-sm"
          >
            Logo & Images
          </a>
          <p className="text-center text-text-muted text-xs">
            &copy; 2026 Deck Salone. A Sound It Entertainment platform.
          </p>
        </div>
      </div>
    </footer>
  );
}
