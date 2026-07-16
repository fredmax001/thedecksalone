import { motion } from 'framer-motion';
import { Scale, Shield, FileText, Globe, AlertTriangle } from 'lucide-react';
import FadeIn from '../components/FadeIn';

const sections = [
  {
    icon: FileText,
    title: '1. Acceptance of Terms',
    content: `By accessing or using the Deck Salone platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. These terms apply to all users, including DJs, event organizers, and fans.`,
  },
  {
    icon: Shield,
    title: '2. User Accounts',
    content: `You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account. You must be at least 16 years of age to create an account.`,
  },
  {
    icon: Globe,
    title: '3. Content and Intellectual Property',
    content: `DJs retain ownership of all mixes and content they upload. By uploading content, you grant Deck Salone a non-exclusive, worldwide, royalty-free license to distribute, display, and promote your content on the platform. You represent that you have all necessary rights to the content you upload.`,
  },
  {
    icon: Scale,
    title: '4. Prohibited Activities',
    content: `Users may not engage in: copyright infringement, harassment or abuse, spam, fraudulent activities, attempts to circumvent platform security, or any activity that violates applicable laws in Sierra Leone or your jurisdiction.`,
  },
  {
    icon: AlertTriangle,
    title: '5. Termination',
    content: `We reserve the right to suspend or terminate any account that violates these terms. You may terminate your account at any time by contacting support. Upon termination, your content may be removed from the platform.`,
  },
];

export default function Terms() {
  return (
    <div className="bg-black min-h-[100dvh]">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative py-20 sm:py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="container-main relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Legal
              </span>
            </motion.div>
            <motion.h1
              className="font-display text-4xl sm:text-5xl lg:text-[56px] font-semibold uppercase tracking-tight text-text-primary mt-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Terms of <span className="text-gradient-gold">Service</span>
            </motion.h1>
            <motion.p
              className="mt-5 text-lg text-text-secondary max-w-xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              Last updated: July 2026. Please read these terms carefully before using Deck Salone.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ═══════════════ CONTENT ═══════════════ */}
      <section className="py-12 sm:py-16 pb-24">
        <div className="container-main">
          <div className="max-w-3xl mx-auto">
            {sections.map((section, index) => (
              <FadeIn key={section.title} delay={0.1 * index}>
                <div className="mb-10 p-6 sm:p-8 bg-black-elevated rounded-2xl border border-white/5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <section.icon className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-text-primary uppercase tracking-tight">
                        {section.title}
                      </h2>
                      <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}

            <FadeIn delay={0.5}>
              <div className="p-6 sm:p-8 bg-black-elevated rounded-2xl border border-white/5">
                <h2 className="font-display text-lg font-semibold text-text-primary uppercase tracking-tight">
                  6. Governing Law
                </h2>
                <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                  These Terms are governed by the laws of Sierra Leone. Any disputes arising from these terms will be resolved in the courts of Freetown, Sierra Leone.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.6}>
              <div className="mt-10 p-6 bg-gold/5 border border-gold/20 rounded-xl text-center">
                <p className="text-sm text-text-secondary">
                  Questions about these terms? Contact us at{' '}
                  <a href="mailto:support@decksalone.com" className="text-gold hover:underline">
                    support@decksalone.com
                  </a>
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </div>
  );
}
