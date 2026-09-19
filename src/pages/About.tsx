import { useState } from 'react';
import { Link } from 'react-router-dom';
import FadeIn from '@/components/FadeIn';
import {
  Headphones,
  CalendarCheck,
  Trophy,
  Globe,
  ShieldCheck,
  Flame,
  FileText,
  Download,
  Building2,
  Users,
  Radio,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Layers,
  Monitor,
  Smartphone,
} from 'lucide-react';

const desktopScreens = [
  {
    title: 'Platform Home & Spotlight',
    path: 'decksalone.com',
    image: '/images/about/desktop-home.png',
    badge: 'Flagship Feed',
    desc: 'Dynamic homepage showcasing trending DJ sets, J Wave Entertainment sponsorship, and top mixes.',
  },
  {
    title: 'Interactive Mix Hub',
    path: 'decksalone.com/mixhub',
    image: '/images/about/desktop-mixhub.png',
    badge: 'Audio Streaming',
    desc: 'Persistent mix playback engine with live audio waveforms, instant genre pills, and track info.',
  },
  {
    title: 'DJ Discovery Engine',
    path: 'decksalone.com/discover',
    image: '/images/about/desktop-discover.png',
    badge: 'Verified Directory',
    desc: 'Curated directory of verified African DJs with direct booking badges, bio previews, and ratings.',
  },
  {
    title: 'Official DJ Rankings',
    path: 'decksalone.com/rankings',
    image: '/images/about/desktop-rankings.png',
    badge: 'National Leaderboard',
    desc: 'Transparent real-time leaderboards celebrating top Sierra Leonean and African DJs by stream impact.',
  },
  {
    title: 'Curated Playlists Hub',
    path: 'decksalone.com/playlists',
    image: '/images/about/desktop-playlists.png',
    badge: 'Sound Collections',
    desc: 'Handcrafted official playlists, party anthems, and genre-defining sound sets curated for every vibe.',
  },
];

const mobileScreens = [
  {
    title: 'Sets & Spotlight Feed',
    image: '/images/about/screen-sets-spotlight.png',
    badge: 'Mobile Discovery',
    desc: 'Instant access to premier DJ sets, genre filtering, and curated official playlists on mobile.',
  },
  {
    title: 'Live Waveform Feed',
    image: '/images/about/screen-waveform-feed.png',
    badge: 'Audio Engine',
    desc: 'Real-time mix playback, audio waveforms, community reactions, and seamless listening on the go.',
  },
  {
    title: 'Creator & Fan Onboarding',
    image: '/images/about/screen-creator-onboarding.png',
    badge: 'Dual Portal',
    desc: 'Streamlined gateway for DJs to build verified digital EPKs and music fans to join the ecosystem.',
  },
];

const ecosystemPillars = [
  {
    icon: ShieldCheck,
    title: 'Verified DJ Profiles',
    description:
      'Professional digital EPKs with verified credentials, bios, social links, equipment rider specs, and audio portfolios tailored for booking managers.',
  },
  {
    icon: Radio,
    title: 'Audio Mix Streaming',
    description:
      'Optimized high-fidelity audio engine with tracklisting, persistent playback, waveform scrubbing, and instant mobile-friendly listening.',
  },
  {
    icon: CalendarCheck,
    title: 'Direct Booking Engine',
    description:
      'Frictionless client-to-DJ booking workflow with event date selection, rate negotiation, status tracking, and automated email notifications.',
  },
  {
    icon: Trophy,
    title: 'Rankings & DJ Battles',
    description:
      'Community-powered real-time leaderboards and competitive DJ Battles where fans vote and celebrate top-tier mixing talent.',
  },
  {
    icon: Layers,
    title: 'Event & Gig Directory',
    description:
      'Comprehensive listings for upcoming concerts, club nights, festivals, and private gigs with direct DJ lineup integration.',
  },
  {
    icon: Users,
    title: 'Direct DJ-to-Fan Connect',
    description:
      'Interactive community hub allowing fans to follow favorite DJs, leave comments, favorite mixes, and directly engage with talent.',
  },
  {
    icon: Globe,
    title: 'Pan-African & Diaspora Reach',
    description:
      'Bridging Sierra Leonean sound culture with the broader African music industry and global diaspora audiences across the UK, US, and beyond.',
  },
  {
    icon: Sparkles,
    title: 'Creator Economy & Monetization',
    description:
      'Empowering DJs with sustainable revenue opportunities through bookings, sponsorships, brand partnerships, and future tipping models.',
  },
];

const audienceGroups = [
  {
    title: 'For Professional DJs',
    badge: 'Creatives & Performers',
    points: [
      'Showcase your brand with a verified, industry-grade profile',
      'Upload and distribute mixes directly to thousands of listeners',
      'Receive qualified booking inquiries and event requests',
      'Climb the national leaderboard and enter high-profile battles',
    ],
  },
  {
    title: 'For Promoters & Venues',
    badge: 'Event Organizers',
    points: [
      'Discover vetted DJ talent across Afrobeats, Amapiano, Dancehall, and more',
      'Send direct booking requests with clear event parameters',
      'Review verified audio portfolios before making hiring decisions',
      'Promote your events to a targeted audience of nightlife enthusiasts',
    ],
  },
  {
    title: 'For Music Lovers & Fans',
    badge: 'Audience & Community',
    points: [
      'Stream exclusive DJ mixes anytime on web and mobile',
      'Discover fresh Sierra Leonean and African sounds daily',
      'Vote for your favorite selectors in weekly DJ battles',
      'Stay updated on the hottest parties and club events near you',
    ],
  },
  {
    title: 'For Brands & Partners',
    badge: 'Sponsors & Investors',
    points: [
      'Direct cultural connection to youth, nightlife, and entertainment demographics',
      'High-impact event sponsorship and digital campaign integration',
      'Support creative economy growth in Sierra Leone and West Africa',
      'Data-driven insights into music trends and listener engagement',
    ],
  },
];

export default function About() {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className="min-h-screen bg-black text-text-primary selection:bg-gold selection:text-black">
      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-32 pb-20 sm:pb-28 overflow-hidden border-b border-white/5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/10 via-black to-black">
        <div className="container-main relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Headline */}
            <div className="lg:col-span-7 space-y-6">
              <FadeIn>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gold/30 bg-gold/5 text-gold text-xs font-semibold tracking-wider uppercase">
                  <Flame className="w-3.5 h-3.5 text-gold animate-pulse" />
                  Sierra Leone's Official DJ Ecosystem
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-text-primary leading-[1.1]">
                  Empowering The Sound.{' '}
                  <span className="text-gold block">Connecting The Culture.</span>
                </h1>
              </FadeIn>

              <FadeIn delay={0.2}>
                <p className="text-text-secondary text-base sm:text-lg max-w-2xl leading-relaxed">
                  Deck Salone is the pioneering digital platform modernizing Africa’s DJ and nightlife ecosystem. Built first for Sierra Leone and scaling across the continent, we unify talent discovery, mix streaming, verified bookings, live rankings, and event management into one powerful home.
                </p>
              </FadeIn>

              <FadeIn delay={0.3}>
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <a
                    href="/downloads/Deck_Salone_About_Company_Profile.pdf"
                    download="Deck_Salone_About_Company_Profile.pdf"
                    className="inline-flex items-center gap-2.5 px-6 py-3 bg-gold-gradient text-black font-semibold uppercase tracking-wide rounded-xl text-xs sm:text-sm hover:scale-[1.02] shadow-lg shadow-gold/20 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download Company Profile (PDF)
                  </a>
                  <Link
                    to="/discover"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-text-primary font-semibold uppercase tracking-wide rounded-xl text-xs sm:text-sm hover:border-gold/50 hover:text-gold transition-all"
                  >
                    Explore Platform
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </FadeIn>
            </div>

            {/* Right Standout Logo Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <FadeIn direction="left" delay={0.2}>
                <div className="relative group max-w-sm sm:max-w-md w-full">
                  {/* Glowing backdrop */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-gold/40 to-yellow-600/30 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition duration-1000"></div>
                  
                  <div className="relative rounded-2xl bg-black-surface border border-gold/30 p-8 sm:p-10 flex flex-col items-center text-center shadow-2xl">
                    <div className="w-full flex items-center justify-center p-4 rounded-xl bg-black/80 border border-white/5 mb-6">
                      <img
                        src="/deck-salone-brand-logo-square.png"
                        alt="Deck Salone Official Emblem"
                        className="w-44 sm:w-56 h-auto object-contain filter drop-shadow-[0_4px_20px_rgba(255,245,89,0.25)]"
                      />
                    </div>
                    <span className="text-gold font-display text-sm uppercase font-bold tracking-widest">
                      Official Flagship Platform
                    </span>
                    <p className="text-xs text-text-muted mt-1 uppercase tracking-wider">
                      An Initiative by Sound It Entertainment
                    </p>
                    <div className="mt-4 pt-4 border-t border-white/10 w-full grid grid-cols-2 gap-2 text-center text-[11px] text-text-secondary">
                      <div className="p-2 rounded-lg bg-black-elevated/60 border border-white/5">
                        <span className="text-gold font-bold block text-sm">100%</span>
                        Sierra Leonean Born
                      </div>
                      <div className="p-2 rounded-lg bg-black-elevated/60 border border-white/5">
                        <span className="text-gold font-bold block text-sm">Pan-African</span>
                        Expansion Ready
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ORIGIN STORY & FOUNDER ─── */}
      <section className="py-16 sm:py-24 bg-black-elevated border-b border-white/5">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left: Origin & Context */}
            <div className="lg:col-span-7 space-y-6">
              <FadeIn>
                <p className="section-label text-gold uppercase tracking-widest text-xs font-semibold">
                  Origin Story & Vision
                </p>
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-tight text-text-primary mt-2">
                  Born from Passion, Engineered for African DJs
                </h2>
              </FadeIn>

              <FadeIn delay={0.15}>
                <div className="space-y-4 text-text-secondary text-sm sm:text-base leading-relaxed">
                  <p>
                    For decades, Sierra Leonean DJs have been the vital heartbeat of weddings, club culture, radio airwaves, street carnivals, and cultural festivals. Yet historically, these gifted tastemakers lacked a unified digital home — relying on fragmented social media clips and word-of-mouth without structured rate cards, verified credentials, or global streaming distribution.
                  </p>
                  <p>
                    <strong className="text-text-primary">Deck Salone was created to change that forever.</strong> Conceived and developed as the nation’s first dedicated digital DJ ecosystem, Deck Salone provides DJs with a professional springboard to showcase their craft, distribute high-quality audio mixes, streamline direct client bookings, and compete on transparent national leaderboards.
                  </p>
                  <p>
                    While rooted deeply in Sierra Leone’s sonic identity, Deck Salone is built with a Pan-African vision. We are actively expanding to support West African talent and the international diaspora, building bridges that connect African music curators with global festivals, international clubs, and worldwide corporate stages.
                  </p>
                </div>
              </FadeIn>

              <FadeIn delay={0.25}>
                <div className="p-4 sm:p-5 rounded-xl bg-black-surface border border-gold/20 flex items-start gap-4">
                  <Building2 className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="text-sm font-semibold uppercase text-text-primary tracking-wide">
                      Parent Company: Sound It Entertainment
                    </h4>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      Deck Salone is proudly operated under <strong>Sound It Entertainment</strong>, an innovative creative media and entertainment company committed to elevating African music, sound engineering, events, and digital culture worldwide.
                    </p>
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Right: Founder Card */}
            <div className="lg:col-span-5">
              <FadeIn direction="left" delay={0.2}>
                <div className="bg-black-surface border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                      <Headphones className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg sm:text-xl font-bold uppercase text-text-primary">
                        Frederick Julian Max-Macauley
                      </h3>
                      <p className="text-gold text-xs font-semibold uppercase tracking-wider">
                        Founder & DJ Fred Max
                      </p>
                    </div>
                  </div>

                  <p className="text-text-secondary text-xs sm:text-sm leading-relaxed border-t border-b border-white/5 py-4">
                    "As a DJ and creator, I saw firsthand the immense musical talent throughout Sierra Leone that had no centralized digital stage. Deck Salone is our commitment to giving African DJs the respect, digital tools, and economic opportunities they deserve — connecting our sound directly to the world."
                  </p>

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0" />
                      <span>Visionary behind Sierra Leone's 1st digital DJ ecosystem</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0" />
                      <span>CEO & Creative Director, Sound It Entertainment</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0" />
                      <span>Champion of fair compensation & digital innovation for creatives</span>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MISSION & VISION STATEMENTS ─── */}
      <section className="py-16 sm:py-20 bg-black border-b border-white/5">
        <div className="container-main">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FadeIn>
              <div className="h-full bg-black-surface border border-white/10 hover:border-gold/30 transition-all rounded-2xl p-8 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-6">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold uppercase text-text-primary mb-3">
                    Our Mission
                  </h3>
                  <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
                    To modernize, formalize, and elevate the African DJ industry by providing an end-to-end digital infrastructure that enables talent discovery, seamless bookings, audio distribution, and sustainable career growth for creative performers everywhere.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-gold font-medium uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" /> Integrity • Innovation • Empowerment
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className="h-full bg-black-surface border border-white/10 hover:border-gold/30 transition-all rounded-2xl p-8 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-6">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold uppercase text-text-primary mb-3">
                    Our Vision
                  </h3>
                  <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
                    To become the premier Pan-African sound technology and DJ management network, recognized globally as the primary bridge connecting African nightlife curators, DJs, and sound engineers to international festivals, brands, and audiences.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-gold font-medium uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" /> Pan-African Growth • Global Diaspora Reach
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── 8 CORE ECOSYSTEM PILLARS ─── */}
      <section className="py-16 sm:py-24 bg-black-elevated border-b border-white/5">
        <div className="container-main">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16">
            <p className="section-label text-gold uppercase tracking-widest text-xs font-semibold">
              The Architecture
            </p>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-tight text-text-primary mt-2">
              The 8 Core Pillars of Deck Salone
            </h2>
            <p className="mt-3 text-text-secondary text-sm sm:text-base">
              A holistic ecosystem engineered to cover every touchpoint of the DJ and entertainment landscape.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ecosystemPillars.map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <FadeIn key={pillar.title} delay={i * 0.05}>
                  <div className="h-full bg-black-surface border border-white/5 rounded-2xl p-6 hover:border-gold/30 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-black border border-white/10 group-hover:border-gold/40 flex items-center justify-center text-gold mb-5 transition-colors">
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-display text-base font-bold uppercase text-text-primary mb-2.5 group-hover:text-gold transition-colors">
                        {pillar.title}
                      </h3>
                      <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── PLATFORM UI SHOWCASE ─── */}
      <section className="py-16 sm:py-24 bg-black border-b border-white/5">
        <div className="container-main">
          <FadeIn className="mb-10 sm:mb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="section-label text-gold uppercase tracking-widest text-xs font-semibold">
                  Platform Showcase
                </p>
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-text-primary mt-2">
                  Engineered For Every Screen
                </h2>
              </div>
              
              {/* Device Mode Switcher */}
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black-surface border border-white/10 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('desktop')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                    viewMode === 'desktop'
                      ? 'bg-gold text-black shadow-lg shadow-gold/20'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  Desktop View ({desktopScreens.length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('mobile')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                    viewMode === 'mobile'
                      ? 'bg-gold text-black shadow-lg shadow-gold/20'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Mobile View ({mobileScreens.length})
                </button>
              </div>
            </div>
          </FadeIn>

          {/* ── Desktop Showcase ── */}
          {viewMode === 'desktop' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {desktopScreens.map((screen, i) => (
                  <FadeIn key={screen.title} delay={i * 0.06}>
                    <div className="group rounded-2xl border border-white/10 bg-black-surface overflow-hidden shadow-2xl hover:border-gold/40 transition-all duration-300">
                      {/* Browser Mockup Top Bar */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-black/80 border-b border-white/10">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-black-elevated/90 border border-white/5 text-[11px] text-text-muted font-mono max-w-[200px] sm:max-w-xs truncate">
                          <span className="text-gold/80">https://</span>
                          <span className="text-text-secondary">{screen.path}</span>
                        </div>
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-gold px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
                          {screen.badge}
                        </span>
                      </div>

                      {/* Desktop Browser Image */}
                      <div className="relative overflow-hidden bg-black aspect-[16/10]">
                        <img
                          src={screen.image}
                          alt={`${screen.title} desktop screenshot`}
                          className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>

                      {/* Details & Caption */}
                      <div className="p-5 flex flex-col justify-between">
                        <div>
                          <h4 className="text-base font-bold uppercase text-text-primary group-hover:text-gold transition-colors">
                            {screen.title}
                          </h4>
                          <p className="text-xs sm:text-sm text-text-secondary mt-1.5 leading-relaxed">
                            {screen.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          )}

          {/* ── Mobile Showcase ── */}
          {viewMode === 'mobile' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto animate-fadeIn">
              {mobileScreens.map((screen, i) => (
                <FadeIn key={screen.title} delay={i * 0.08}>
                  <div className="group rounded-3xl border border-white/10 bg-black-surface overflow-hidden shadow-2xl hover:border-gold/40 transition-all duration-300 p-3">
                    {/* Smartphone Bezel & Notch */}
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-black-elevated rounded-full border border-white/10 z-10 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-white/20"></span>
                      </div>
                      <img
                        src={screen.image}
                        alt={`${screen.title} mobile screenshot`}
                        className="w-full h-[480px] object-cover object-top group-hover:scale-[1.02] transition-transform duration-500 pt-2"
                        loading="lazy"
                      />
                    </div>

                    <div className="mt-4 px-2 pb-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-sm font-bold uppercase text-text-primary group-hover:text-gold transition-colors">
                          {screen.title}
                        </h4>
                        <span className="text-[10px] uppercase font-semibold text-gold px-2 py-0.5 rounded bg-gold/10 border border-gold/20">
                          {screen.badge}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">
                        {screen.desc}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── WHO WE SERVE / ECOSYSTEM VALUE ─── */}
      <section className="py-16 sm:py-24 bg-black-elevated border-b border-white/5">
        <div className="container-main">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16">
            <p className="section-label text-gold uppercase tracking-widest text-xs font-semibold">
              Stakeholder Value
            </p>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-tight text-text-primary mt-2">
              Value Across The Entire Ecosystem
            </h2>
            <p className="mt-3 text-text-secondary text-sm sm:text-base">
              Deck Salone aligns incentives for artists, event organizers, music fans, and corporate partners.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {audienceGroups.map((group, i) => (
              <FadeIn key={group.title} delay={i * 0.08}>
                <div className="bg-black-surface border border-white/10 rounded-2xl p-6 sm:p-8 hover:border-gold/30 transition-all h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h3 className="font-display text-lg sm:text-xl font-bold uppercase text-text-primary">
                        {group.title}
                      </h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">
                        {group.badge}
                      </span>
                    </div>
                    <ul className="space-y-3 mt-4">
                      {group.points.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-text-secondary">
                          <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DOWNLOADABLE DOSSIER & CALL TO ACTION ─── */}
      <section className="py-20 sm:py-28 bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent pointer-events-none"></div>

        <div className="container-main text-center relative z-10 max-w-4xl mx-auto space-y-8">
          <FadeIn>
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gold/10 text-gold border border-gold/20 mb-2">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-5xl font-bold uppercase tracking-tight text-text-primary">
              Ready to Partner or Explore?
            </h2>
            <p className="mt-4 text-text-secondary text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Download the official Deck Salone Company Profile and Brand Dossier for grants, festival bookings, sponsorship inquiries, and partnership decks.
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <a
                href="/downloads/Deck_Salone_About_Company_Profile.pdf"
                download="Deck_Salone_About_Company_Profile.pdf"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-gold-gradient text-black font-bold uppercase tracking-wide rounded-xl text-sm hover:scale-[1.02] shadow-xl shadow-gold/20 transition-all"
              >
                <Download className="w-4 h-4" />
                Download Company Profile PDF
              </a>
              <Link
                to="/discover"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-white/20 text-text-primary font-bold uppercase tracking-wide rounded-xl text-sm hover:border-gold/50 hover:text-gold transition-all"
              >
                Discover DJs
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/5 border border-white/10 text-text-secondary font-bold uppercase tracking-wide rounded-xl text-sm hover:text-text-primary hover:bg-white/10 transition-all"
              >
                Join as DJ
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={0.25}>
            <div className="pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 text-xs text-text-muted">
              <span>Deck Salone © {new Date().getFullYear()}</span>
              <span>•</span>
              <span>A Sound It Entertainment Product</span>
              <span>•</span>
              <span>Freetown, Sierra Leone</span>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
