import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  ChevronDown,
  Play,
  Clock,
  Award,
  Send,
  Headphones,
  Disc3,
} from 'lucide-react';
import FadeIn from '../components/FadeIn';

/* ──────────────────────────── data ──────────────────────────── */

const pioneers = [
  {
    name: 'DJ MASTER K',
    years: '1985 – 2010',
    location: 'Freetown',
    image: '/placeholder.jpg',
    bio: 'One of the first professional DJs in Freetown, Master K built his own sound system from salvaged parts and played at every major event in the city for 25 years.',
    knownFor: 'Creating the first mobile DJ setup in Sierra Leone',
    quote: '"The music chose me. I just had to find a way to let it speak."',
  },
  {
    name: 'QUEEN LUCY',
    years: '1990 – 2015',
    location: 'Bo',
    image: '/placeholder.jpg',
    bio: 'Breaking barriers as one of the first female DJs in Sierra Leone, Queen Lucy inspired a generation of women to take up the craft. Her Sunday gospel mixes are still talked about today.',
    knownFor: 'Pioneering female DJ culture in Sierra Leone',
    quote: '"The turntables don\'t care who\'s spinning. Only the crowd does."',
  },
  {
    name: 'DJ SOUNDMAN',
    years: '1988 – 2005',
    location: 'Kenema',
    image: '/placeholder.jpg',
    bio: "The Eastern Region's ambassador of sound. DJ Soundman connected Kenema to Freetown's music scene, bringing the latest tracks to the provinces before anyone else.",
    knownFor: 'Bridging urban and provincial music scenes',
    quote: '"Every town deserves to hear the best music."',
  },
];

const legendaryMixes = [
  {
    year: 1995,
    title: 'Freetown All-Nighter Vol. 1',
    dj: 'DJ Master K',
    significance: 'The first widely-circulated mixtape in Sierra Leone. Cassette copies traded across the country.',
    hasAudio: true,
  },
  {
    year: 2002,
    title: 'Post-War Revival Mix',
    dj: 'DJ Soundman',
    significance: 'Recorded just after the civil war ended, this mix symbolized hope and the return of celebration.',
    hasAudio: true,
  },
  {
    year: 2005,
    title: 'Sunday Gospel Special',
    dj: 'Queen Lucy',
    significance: 'Her most celebrated mix — a 3-hour journey through gospel that united churches across Bo.',
    hasAudio: true,
  },
  {
    year: 2010,
    title: 'Independence Golden Jubilee',
    dj: 'Various DJs',
    significance: "50 DJs contributed to this 24-hour mix celebrating 50 years of Sierra Leone's independence.",
    hasAudio: true,
  },
  {
    year: 2015,
    title: 'Ebola Survivors Celebration',
    dj: 'Bow',
    significance: "Mixed during the Ebola recovery, this became the soundtrack to Sierra Leone's resilience.",
    hasAudio: true,
  },
  {
    year: 2020,
    title: 'Lockdown Livestream',
    dj: 'Fred Max',
    significance: 'The first major livestreamed DJ set from Sierra Leone, reaching viewers across the diaspora.',
    hasAudio: true,
  },
];

const timelineEvents = [
  {
    year: '1985',
    title: 'First Sound System in Freetown',
    description:
      'Mobile sound systems appear in Freetown. DJs begin playing at weddings and community events using vinyl records and basic mixers.',
  },
  {
    year: '1990',
    title: 'Rise of Mobile DJ Culture',
    description:
      'DJs take their setups on the road, playing at events across the city. Mobile DJ culture becomes the heartbeat of celebrations.',
  },
  {
    year: '1995',
    title: 'First DJ Battle at Lumley Beach',
    description:
      'The first DJ battle takes place at Lumley Beach, Freetown. Two DJs go head-to-head, launching the competitive DJ scene.',
  },
  {
    year: '2000',
    title: 'Digital Mixing Arrives',
    description:
      'CDJs replace turntables. Digital recording allows DJs to produce higher-quality mixes and reach wider audiences.',
  },
  {
    year: '2005',
    title: 'Mixtape Culture Explosion',
    description:
      'The first widely-circulated mixtapes spread across Sierra Leone. DJs become household names through cassette culture.',
  },
  {
    year: '2010',
    title: 'Social Media Changes DJ Promotion',
    description:
      'Platforms like Facebook transform how DJs promote events and share mixes. The digital revolution reshapes the industry.',
  },
  {
    year: '2015',
    title: 'Afrobeats Fusion Era Begins',
    description:
      'Afrobeats takes center stage. Sierra Leonean DJs blend global sounds with local Salone music, creating a unique fusion.',
  },
  {
    year: '2018',
    title: 'First National DJ Competition',
    description:
      'The first national DJ competition brings together talent from across the country, crowning Sierra Leone\'s best DJ.',
  },
  {
    year: '2020',
    title: 'Streaming Platforms Transform Reach',
    description:
      'COVID-19 forces innovation. DJs master livestreaming, reaching diaspora communities worldwide through digital platforms.',
  },
  {
    year: '2025',
    title: 'Deck Salone Platform Launches',
    description:
      'The first official digital ecosystem for Sierra Leonean DJs is born, backed by Sound It Entertainment.',
  },
];

/* ──────────────────────────── components ──────────────────────────── */

function SectionLabel({ text }: { text: string }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
      {text}
    </span>
  );
}

/* ──────────────────────────── page ──────────────────────────── */

export default function HallOfFame() {
  const [nominationForm, setNominationForm] = useState({
    name: '',
    email: '',
    nomineeName: '',
    reason: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInView = useInView(timelineRef, { once: true, margin: '-100px' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="bg-black min-h-[100dvh]">
      {/* ═══════════════ SECTION 1: HERO ═══════════════ */}
      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
        {/* Background with Ken Burns */}
        <motion.div
          className="absolute inset-0 z-0"
          initial={{ scale: 1 }}
          animate={{ scale: 1.05 }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
        >
          <img
            src="/placeholder.jpg"
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
        </motion.div>
        <div className="absolute inset-0 bg-hero-overlay z-[1]" />

        {/* Content */}
        <div className="relative z-10 max-w-[700px] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <SectionLabel text="PRESERVING THE CULTURE" />
          </motion.div>

          <motion.h1
            className="font-display text-4xl sm:text-5xl lg:text-[56px] font-semibold uppercase tracking-tight text-text-primary mt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            Sierra Leone DJ{' '}
            <span className="text-gradient-gold">Hall of Fame</span>
          </motion.h1>

          <motion.p
            className="mt-5 text-lg text-text-secondary max-w-[520px] mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.5 }}
          >
            Honoring the pioneers, preserving the mixes, and documenting the
            history of Sierra Leone&apos;s DJ culture for future generations.
          </motion.p>

          <motion.div
            className="mt-10 flex items-center justify-center gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 2 }}
          >
            <span className="font-mono text-sm text-gold">Since 1985</span>
            <span className="w-1 h-1 rounded-full bg-text-muted" />
            <span className="font-mono text-sm text-text-muted">Decades of history</span>
            <span className="w-1 h-1 rounded-full bg-text-muted" />
            <span className="font-mono text-sm text-text-muted">A living archive</span>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
        >
          <span className="text-xs text-text-muted uppercase tracking-widest">Explore</span>
          <ChevronDown className="w-5 h-5 text-gold animate-chevron-pulse" />
        </motion.div>
      </section>

      {/* ═══════════════ SECTION 2: MISSION STATEMENT ═══════════════ */}
      <section className="py-16 sm:py-24 lg:py-32">
        <div className="container-main">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - Text */}
            <div>
              <FadeIn>
                <SectionLabel text="THE MISSION" />
              </FadeIn>
              <FadeIn delay={0.1}>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-text-primary mt-3">
                  Why This Matters
                </h2>
              </FadeIn>

              <div className="mt-8 space-y-6">
                <FadeIn delay={0.2}>
                  <p className="text-lg text-text-secondary leading-relaxed">
                    Long before streaming platforms and digital mixers, Sierra
                    Leone&apos;s DJs were the heartbeat of our celebrations. From
                    small neighborhood sound systems in Freetown to the biggest
                    stages across the nation, these pioneers shaped the sound of
                    a generation.
                  </p>
                </FadeIn>
                <FadeIn delay={0.35}>
                  <p className="text-lg text-text-secondary leading-relaxed">
                    The Hall of Fame exists to document this rich history — to
                    honor the legends who started it all, preserve the mixes that
                    defined eras, and create a historical record that future
                    generations can learn from and be inspired by.
                  </p>
                </FadeIn>
                <FadeIn delay={0.5}>
                  <p className="text-lg text-text-secondary leading-relaxed">
                    This is a living archive. We rely on the community to share
                    stories, submit mixes, and nominate pioneers who deserve
                    recognition.
                  </p>
                </FadeIn>
              </div>

              <FadeIn delay={0.65}>
                <a
                  href="#nominate"
                  className="inline-block mt-8 px-6 py-3 border border-white/20 text-text-primary text-sm font-semibold uppercase rounded-full hover:bg-white/5 transition-colors"
                >
                  Nominate a Pioneer
                </a>
              </FadeIn>
            </div>

            {/* Right - Decorative */}
            <FadeIn direction="right" delay={0.3}>
              <div className="relative flex justify-center lg:justify-end">
                <div className="relative">
                  <img
                    src="/placeholder.jpg"
                    alt="Vintage DJ portrait"
                    className="w-full max-w-[400px] rounded-2xl object-cover"
                    style={{ border: '4px solid var(--gold)', transform: 'rotate(-2deg)' }}
                  />
                  <motion.div
                    className="absolute -bottom-6 -left-6 text-gold/40"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <Disc3 className="w-16 h-16" />
                  </motion.div>
                  <motion.div
                    className="absolute -top-4 -right-4 text-gold/30"
                    animate={{ y: [0, 3, 0] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                  >
                    <Headphones className="w-14 h-14" />
                  </motion.div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 3: PIONEER DJS ═══════════════ */}
      <section className="py-16 sm:py-24 lg:py-32 bg-black-elevated">
        <div className="container-main">
          <div className="text-center mb-12 lg:mb-16">
            <FadeIn>
              <SectionLabel text="THE PIONEERS" />
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-text-primary mt-3">
                Legends Who Started It All
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-text-secondary max-w-lg mx-auto">
                The founding generation of Sierra Leone&apos;s DJ culture
              </p>
            </FadeIn>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pioneers.map((pioneer, index) => (
              <FadeIn key={pioneer.name} delay={0.15 * index}>
                <motion.div
                  className="bg-black rounded-2xl overflow-hidden border border-white/5 group hover:border-gold/30 transition-all duration-400"
                  whileHover={{ y: -4 }}
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={pioneer.image}
                      alt={pioneer.name}
                      className="w-full h-full object-cover sepia group-hover:sepia-0 transition-all duration-400"
                    />
                  </div>
                  <div className="p-6">
                    <span className="inline-block px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-gold text-black rounded-full">
                      Pioneer
                    </span>
                    <h3 className="font-display text-xl font-semibold text-text-primary mt-3 uppercase">
                      {pioneer.name}
                    </h3>
                    <p className="font-mono text-sm text-gold mt-1">{pioneer.years}</p>
                    <p className="text-sm text-text-secondary mt-3 leading-relaxed">
                      {pioneer.bio}
                    </p>
                    <p className="text-xs text-text-muted mt-2">
                      Known for: {pioneer.knownFor}
                    </p>
                    <blockquote className="mt-4 text-sm text-gold/70 italic border-l-2 border-gold pl-3">
                      {pioneer.quote}
                    </blockquote>
                  </div>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 4: LEGENDARY MIXES TABLE ═══════════════ */}
      <section className="py-16 sm:py-24 lg:py-32">
        <div className="container-main">
          <div className="mb-12">
            <FadeIn>
              <SectionLabel text="THE ARCHIVE" />
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-text-primary mt-3">
                Legendary Mixes
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-text-secondary max-w-xl">
                Mixes that defined eras and shaped the sound of Sierra Leone
              </p>
            </FadeIn>
          </div>

          <FadeIn delay={0.3}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-dark-gray">
                    <th className="text-left py-4 px-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Year
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Mix Name
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
                      DJ
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Significance
                    </th>
                    <th className="text-center py-4 px-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Listen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {legendaryMixes.map((mix, i) => (
                    <motion.tr
                      key={mix.title}
                      className={`border-b border-white/5 hover:bg-medium-gray/50 transition-colors ${
                        i % 2 === 0 ? 'bg-black' : 'bg-black-elevated'
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <td className="py-5 px-4">
                        <span className="font-mono text-lg font-semibold text-gold">
                          {mix.year}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <span className="font-display text-base font-semibold text-text-primary">
                          {mix.title}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <span className="text-sm text-gold">{mix.dj}</span>
                      </td>
                      <td className="py-5 px-4">
                        <p className="text-sm text-text-secondary max-w-[300px]">
                          {mix.significance}
                        </p>
                      </td>
                      <td className="py-5 px-4 text-center">
                        {mix.hasAudio ? (
                          <button className="w-8 h-8 rounded-full bg-gold/10 hover:bg-gold/20 flex items-center justify-center transition-colors">
                            <Play className="w-4 h-4 text-gold fill-gold" />
                          </button>
                        ) : (
                          <span className="text-xs text-text-muted">Lost</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════ SECTION 5: INTERACTIVE TIMELINE ═══════════════ */}
      <section className="py-16 sm:py-24 lg:py-32 bg-black-elevated" ref={timelineRef}>
        <div className="container-main">
          <div className="text-center mb-12 lg:mb-16">
            <FadeIn>
              <SectionLabel text="THE JOURNEY" />
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-text-primary mt-3">
                A History of DJ Culture in Sierra Leone
              </h2>
            </FadeIn>
          </div>

          <div className="relative">
            {/* Center vertical line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-[2px] bg-dark-gray md:-translate-x-px" />
            <motion.div
              className="absolute left-4 md:left-1/2 top-0 w-[2px] bg-gold md:-translate-x-px origin-top"
              initial={{ scaleY: 0 }}
              animate={timelineInView ? { scaleY: 1 } : { scaleY: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              style={{ height: '100%' }}
            />

            <div className="space-y-12 lg:space-y-16">
              {timelineEvents.map((event, index) => {
                const isLeft = index % 2 === 0;
                return (
                  <motion.div
                    key={event.year}
                    className={`relative flex items-start gap-8 ${
                      isLeft
                        ? 'md:flex-row'
                        : 'md:flex-row-reverse'
                    }`}
                    initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
                    animate={timelineInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.6, delay: index * 0.15 }}
                  >
                    {/* Dot on the line */}
                    <div className="absolute left-4 md:left-1/2 w-4 h-4 rounded-full bg-gold border-[3px] border-black z-10 -translate-x-1/2 mt-1.5" />

                    {/* Content card */}
                    <div
                      className={`ml-12 md:ml-0 md:w-[45%] ${
                        isLeft ? 'md:pr-12 md:text-right' : 'md:pl-12'
                      }`}
                    >
                      <span className="font-mono text-2xl font-semibold text-gold">
                        {event.year}
                      </span>
                      <h4 className="font-display text-lg font-semibold text-text-primary mt-2">
                        {event.title}
                      </h4>
                      <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 6: COMMUNITY NOMINATION FORM ═══════════════ */}
      <section id="nominate" className="py-16 sm:py-24 lg:py-32">
        <div className="container-main">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left - Form */}
            <div>
              <FadeIn>
                <SectionLabel text="CONTRIBUTE" />
              </FadeIn>
              <FadeIn delay={0.1}>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-text-primary mt-3">
                  Nominate a Pioneer
                </h2>
              </FadeIn>

              <FadeIn delay={0.2}>
                {submitted ? (
                  <motion.div
                    className="mt-8 p-6 bg-green/10 border border-green/30 rounded-xl text-center"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Award className="w-10 h-10 text-green mx-auto" />
                    <h3 className="mt-4 font-display text-xl font-semibold text-text-primary">
                      Thank You!
                    </h3>
                    <p className="mt-2 text-text-secondary">
                      Your nomination has been received. Our team will review it
                      within 7 days.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-text-muted mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-black-surface border border-dark-gray rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/10 outline-none transition-colors"
                        placeholder="Enter your full name"
                        value={nominationForm.name}
                        onChange={(e) =>
                          setNominationForm({ ...nominationForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-text-muted mb-2">
                        Your Email
                      </label>
                      <input
                        type="email"
                        required
                        className="w-full bg-black-surface border border-dark-gray rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/10 outline-none transition-colors"
                        placeholder="your@email.com"
                        value={nominationForm.email}
                        onChange={(e) =>
                          setNominationForm({ ...nominationForm, email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-text-muted mb-2">
                        Nominee&apos;s Name / Stage Name
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-black-surface border border-dark-gray rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/10 outline-none transition-colors"
                        placeholder="Who are you nominating?"
                        value={nominationForm.nomineeName}
                        onChange={(e) =>
                          setNominationForm({
                            ...nominationForm,
                            nomineeName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-text-muted mb-2">
                        Why They Deserve Recognition
                      </label>
                      <textarea
                        required
                        rows={4}
                        className="w-full bg-black-surface border border-dark-gray rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/10 outline-none transition-colors resize-none"
                        placeholder="Tell us about this DJ's contribution to Sierra Leone's music culture..."
                        value={nominationForm.reason}
                        onChange={(e) =>
                          setNominationForm({ ...nominationForm, reason: e.target.value })
                        }
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-4 bg-gold-gradient text-black font-semibold uppercase text-sm rounded-full hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Submit Nomination
                    </button>
                  </form>
                )}
              </FadeIn>
            </div>

            {/* Right - Process Info */}
            <div>
              <FadeIn direction="right" delay={0.3}>
                <h4 className="font-display text-lg font-semibold text-text-primary uppercase">
                  What Happens Next?
                </h4>
                <div className="mt-6 space-y-5">
                  {[
                    'We review every submission within 7 days',
                    'Our editorial team researches the nominee',
                    'Community members may be contacted for verification',
                    'Approved nominees are added to the Hall of Fame',
                    'Nominators receive credit on the nominee\'s page',
                  ].map((step, i) => (
                    <motion.div
                      key={step}
                      className="flex items-start gap-4"
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                    >
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gold text-black flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <p className="text-sm text-text-secondary pt-1">{step}</p>
                    </motion.div>
                  ))}
                </div>
              </FadeIn>

              <FadeIn direction="right" delay={0.8}>
                <div className="mt-10 p-5 bg-black-elevated rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gold" />
                    <span className="text-sm font-semibold text-text-primary">
                      Questions?
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-text-muted">
                    Contact us at{' '}
                    <a href="mailto:halloffame@decksalone.com" className="text-gold hover:underline">
                      halloffame@decksalone.com
                    </a>
                  </p>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 7: CTA BANNER ═══════════════ */}
      <section className="relative py-20 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gold-gradient" />
        <div className="absolute inset-0 gold-shimmer opacity-30" />

        <div className="container-main relative z-10 text-center">
          <FadeIn>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-black">
              You Are Part of This Story
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-5 text-lg text-black/70 max-w-[560px] mx-auto leading-relaxed">
              Every mix you upload, every event you play, every fan you inspire —
              you&apos;re writing the next chapter of Sierra Leone&apos;s DJ history.
            </p>
          </FadeIn>
          <FadeIn delay={0.4}>
            <a
              href="/register"
              className="inline-block mt-8 px-8 py-4 bg-black text-gold font-semibold uppercase text-sm rounded-full hover:scale-[1.02] transition-transform"
            >
              Create Your Profile
            </a>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
