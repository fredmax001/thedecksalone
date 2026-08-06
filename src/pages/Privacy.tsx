import { motion } from 'framer-motion';
import { Lock, Eye, Server, Share2, UserCheck, ShieldCheck, Database, FileCheck } from 'lucide-react';
import FadeIn from '../components/FadeIn';

const sections = [
  {
    icon: Eye,
    title: '1. Information We Collect',
    content: `Deck Salone collects personal data to operate the digital DJ & event platform effectively:
• Personal Identity Data: Full name, stage name, email address, phone number, location, gender, profile photo/avatar.
• Verification & KYC Data: Government-issued ID numbers (National ID/Passport) submitted by DJs for verification badges under Sierra Leone identity regulations.
• Financial & Payout Data: Orange Money / Africell Afrimoney numbers, transaction reference codes, and payout request logs for ticket sales and DJ booking escrows.
• Usage & Device Technical Data: IP addresses, browser agent, device identifiers, stream counts, playback history, site navigation patterns, and cookie session identifiers.`,
  },
  {
    icon: Lock,
    title: '2. Purpose of Data Processing & Legal Basis',
    content: `Your data is processed strictly in accordance with Sierra Leone privacy laws and data protection principles for:
• Account authentication, identity verification, and fraud prevention.
• Facilitating DJ bookings, event ticket purchases, Mobile Money payment validation, and QR code verification.
• Calculating DJ ranking metrics, stream counts, and community engagement scores.
• Detecting security threats, unauthorized bot activity, or Terms of Service violations under the Cyber Security and Crimes Act, 2021 of Sierra Leone.`,
  },
  {
    icon: Server,
    title: '3. Data Security & Storage Architecture',
    content: `We implement robust technical and organizational security measures to protect your personal data:
• Encryption in Transit & Rest: All HTTP communications are protected via SSL/TLS encryption. Sensitive tokens, passwords, and QR encryption keys are hashed using industry-standard cryptography.
• Secure Infrastructure: Data is hosted in secured server environments with strict access controls and real-time threat monitoring.
• No Unlawful Access: We strictly restrict employee access to personal data on a need-to-know basis.`,
  },
  {
    icon: Share2,
    title: '4. Data Sharing & Third-Party Integrations',
    content: `We do not sell, rent, or trade your personal information. Data is shared strictly under the following operational circumstances:
• Public Profiles: DJ stage names, biographies, genres, public mixes, and event listings are visible to platform visitors.
• Mobile Money & Payment Processors: Transaction data (amount, phone number, reference) is securely transmitted to authorized payment partners (Orange Money / Africell Afrimoney) to process ticket purchases and payouts.
• Law Enforcement Requests: We may disclose user data if required by a valid court order or official legal process issued by judicial authorities of the Republic of Sierra Leone under the Cyber Security and Crimes Act 2021.`,
  },
  {
    icon: UserCheck,
    title: '5. Your Rights as a Data Subject',
    content: `Under applicable data protection principles, you possess full control over your personal information:
• Right of Access & Inspection: Request a copy of the personal data held about you.
• Right of Rectification: Update or correct your profile details via account settings.
• Right to Erasure / Right to be Forgotten: Request complete deletion of your account and personal data by contacting privacy@decksalone.com.
• Right to Restrict Processing: Opt out of non-essential marketing communications or analytics tracking.`,
  },
  {
    icon: Database,
    title: '6. Cookies, Analytics & Tracking',
    content: `Deck Salone uses essential session cookies and local storage to maintain user authentication, save audio player playback positions, and preserve user preferences. We analyze aggregated, non-personally identifiable site visit metrics to improve platform speed and user experience.`,
  },
  {
    icon: FileCheck,
    title: '7. Policy Updates & Contact Information',
    content: `We may update this Privacy Policy periodically to reflect changes in platform features or Sierra Leone statutory regulations. Material changes will be communicated via in-app notification or email.

For privacy requests, data deletion inquiries, or legal concerns, please contact our Data Protection Officer:
📧 Email: privacy@decksalone.com / support@decksalone.com
📍 Location: Freetown, Republic of Sierra Leone`,
  },
];

export default function Privacy() {
  return (
    <div className="bg-black min-h-[100dvh] text-white">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative py-20 sm:py-24 lg:py-28 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-hero-overlay opacity-60" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-3 py-1 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs font-bold uppercase tracking-widest">
              Data Protection & Privacy Policy
            </span>
          </motion.div>
          <motion.h1
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white mt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Privacy <span className="text-gradient-gold">Policy</span>
          </motion.h1>
          <motion.p
            className="mt-4 text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Effective Date: August 2026. Compliant with Sierra Leone Data Protection Standards & Cyber Security and Crimes Act 2021.
          </motion.p>
        </div>
      </section>

      {/* ═══════════════ CONTENT ═══════════════ */}
      <section className="py-12 sm:py-16 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="space-y-6">
            {sections.map((section, index) => (
              <FadeIn key={section.title} delay={0.05 * index}>
                <div className="p-6 sm:p-8 bg-black-elevated rounded-2xl border border-white/10 hover:border-gold/30 transition-colors shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0 mt-1">
                      <section.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-display text-lg sm:text-xl font-bold text-white uppercase tracking-tight">
                        {section.title}
                      </h2>
                      <div className="mt-3 text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                        {section.content}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}

            {/* Privacy Contact Box */}
            <FadeIn delay={0.4}>
              <div className="p-6 sm:p-8 bg-gradient-to-r from-gold/10 via-black-elevated to-purple-900/20 rounded-2xl border border-gold/30 shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white uppercase tracking-tight">
                      Data Protection Officer & Privacy Desk
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed">
                      If you have questions regarding data retention, user consent, or wish to exercise your data subject rights, please reach out to our privacy desk:
                    </p>
                    <div className="mt-4 p-4 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-gold flex flex-col sm:flex-row gap-2 sm:gap-6">
                      <span>📧 Privacy: privacy@decksalone.com</span>
                      <span>🛡️ Data Controller: Deck Salone Ltd.</span>
                      <span>📍 Freetown, Sierra Leone</span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </div>
  );
}
