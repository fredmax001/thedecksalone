import { motion } from 'framer-motion';
import { Scale, Shield, FileText, Globe, AlertTriangle, Lock, Award, Flag, HelpCircle } from 'lucide-react';
import FadeIn from '../components/FadeIn';

const sections = [
  {
    icon: FileText,
    title: '1. Acceptance & Legal Scope',
    content: `By accessing, registering, or using the Deck Salone platform (web, mobile applications, and API services), you enter into a binding legal agreement subject to the laws of the Republic of Sierra Leone. These Terms apply to all registered and guest users, including DJs, event organizers, event attendees, promoters, and general music fans. If you do not agree to these Terms, you must discontinue platform usage immediately.`,
  },
  {
    icon: Shield,
    title: '2. User Accounts & Identity Verification',
    content: `You are responsible for maintaining the confidentiality of your account credentials. All activities occurring under your account are your sole legal responsibility. Account registration requires accurate, truthful information. DJ Profile verification and event ticketing organizers may be required to submit government-issued identification (National ID, Passport, or Business Registration) in accordance with Sierra Leone identity verification guidelines.`,
  },
  {
    icon: Globe,
    title: '3. Compliance with Sierra Leone Legislation',
    content: `Deck Salone operates in full compliance with the statutory frameworks of Sierra Leone, including but not limited to:
• Cyber Security and Crimes Act, 2021: Strict prohibition of unauthorized computer access, cyber-stalking, harassment, identity theft, hate speech, or computer fraud.
• Copyright Act, 2011: Mandatory protection of intellectual property, original musical compositions, and derivative DJ mix recordings.
• Anti-Money Laundering and Combating of Financing of Terrorism Act, 2012: Strict monitoring of financial transactions, Mobile Money (Orange Money / Africell Afrimoney) ticket sales, and booking escrow deposits.
• Consumer Protection Act, 2020: Transparent pricing, non-fraudulent event ticketing, and fair cancellation policies.`,
  },
  {
    icon: Award,
    title: '4. Intellectual Property & Copyright Takedowns',
    content: `DJs and content creators retain ownership of their original recordings and promotional media. By uploading audio mixes, artwork, or event materials to Deck Salone, you grant the platform a non-exclusive, worldwide, royalty-free license to stream, host, and promote your content. You guarantee that you hold necessary distribution rights or performance clearance. Unauthorized upload of copyrighted sound recordings without authorization is strictly prohibited. Rightsholders may file Copyright Takedown notices to support@decksalone.com under the Copyright Act 2011 of Sierra Leone.`,
  },
  {
    icon: Scale,
    title: '5. Prohibited Conduct & Terms Violations',
    content: `The following actions constitute severe platform violations:
• Uploading infringing, defamatory, profane, violent, or hate-speech content.
• Creating fraudulent event listings or selling counterfeit/duplicate event tickets.
• Accepting DJ booking deposits and failing to perform without valid emergency notice.
• Manipulating stream counters, play metrics, battle votes, or ranking leaderboards through automated bots or fraudulent scripts.
• Attempting to reverse engineer, scrape, or disrupt Deck Salone infrastructure or user data.`,
  },
  {
    icon: AlertTriangle,
    title: '6. Admin Violation Alerts, Account Suspension & Banning',
    content: `Deck Salone maintains a zero-tolerance policy for fraudulent and abusive conduct. Every reported violation triggers an instant Admin Alert to our compliance and security teams.
Deck Salone administrators reserve the absolute right to:
1. Issue formal compliance warnings to account owners.
2. Immediately remove or unpublish non-compliant mixes, comments, or event listings.
3. Temporarily SUSPEND user accounts pending formal investigation.
4. Permanently BAN accounts, forfeit verified badges, and block IP/device access for grave or repeated violations.
Suspended or banned users will receive formal notification detailing the violated clause and appeal instructions.`,
  },
  {
    icon: Lock,
    title: '7. DJ Bookings, Escrow & Event Ticketing Terms',
    content: `Event ticket purchases made via Orange Money, Africell Afrimoney, or card payments are non-refundable except in cases of event cancellation or material breach under the Consumer Protection Act 2020. Booking agreements entered into between Event Organizers and DJs via Deck Salone create direct contractual obligations. Deck Salone acts as a facilitator and escrow host and is not liable for third-party venue defaults or event cancellations.`,
  },
  {
    icon: Flag,
    title: '8. Governing Law & Dispute Jurisdiction',
    content: `These Terms of Service are governed by and construed exclusively in accordance with the laws of the Republic of Sierra Leone. Any dispute, claim, or legal action arising out of or in connection with these Terms or platform usage shall be submitted to the exclusive jurisdiction of the High Court of Sierra Leone in Freetown.`,
  },
];

export default function Terms() {
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
              Legal Framework · Republic of Sierra Leone
            </span>
          </motion.div>
          <motion.h1
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white mt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Terms of <span className="text-gradient-gold">Service</span>
          </motion.h1>
          <motion.p
            className="mt-4 text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Effective Date: August 2026. Aligned with the Cyber Security and Crimes Act 2021, Copyright Act 2011, and Laws of Sierra Leone.
          </motion.p>
        </div>
      </section>

      {/* ═══════════════ SECTIONS ═══════════════ */}
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

            {/* Reporting & Legal Notice Card */}
            <FadeIn delay={0.4}>
              <div className="p-6 sm:p-8 bg-gradient-to-r from-red/10 via-black-elevated to-gold/10 rounded-2xl border border-red/30 shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red/20 border border-red/40 flex items-center justify-center text-red shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white uppercase tracking-tight">
                      Violations & Legal Inquiries
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed">
                      To report a Terms of Service violation, copyright infringement, or fraudulent activity, please use the in-app <strong>Flag/Report</strong> button or contact our Legal & Compliance Officer directly:
                    </p>
                    <div className="mt-4 p-4 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-gold flex flex-col sm:flex-row gap-2 sm:gap-6">
                      <span>📧 Legal Email: legal@decksalone.com</span>
                      <span>🛡️ Compliance: support@decksalone.com</span>
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
