import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Scale,
  Shield,
  FileText,
  Globe,
  AlertTriangle,
  Lock,
  Award,
  Flag,
  HelpCircle,
  Music,
  CreditCard,
  UserCheck,
  Search,
  BookOpen,
  Mail,
  ShieldAlert,
  Server,
  FileCheck,
} from 'lucide-react';
import FadeIn from '../components/FadeIn';

interface TermSection {
  number: number;
  title: string;
  icon: React.ElementType;
  content: string[];
  bullets?: string[];
  subsections?: { subtitle: string; content: string[]; bullets?: string[] }[];
}

const termsSections: TermSection[] = [
  {
    number: 1,
    title: '1. DEFINITIONS',
    icon: FileText,
    content: ['For purposes of these Terms:'],
    bullets: [
      '“Deck Salone”, “Platform”, “Website”, “App” or “Services” means the Deck Salone website, mobile applications, software, APIs, features, databases and related services operated or made available by us.',
      '“User”, “you” or “your” means any person who accesses or uses Deck Salone.',
      '“DJ” means a User who creates a DJ profile or uploads, publishes or promotes DJ-related content through the Platform.',
      '“Client” means a User or third party seeking to discover, contact, hire or book a DJ or other music professional through Deck Salone.',
      '“User Content” means any audio, DJ mix, music, image, photograph, video, artwork, profile information, biography, description, comment, message, review, link or other material submitted, uploaded, posted or otherwise made available by a User.',
      '“Platform Content” means all content, software, designs, graphics, logos, trademarks, databases, interfaces, functionality, text and other materials owned or controlled by Deck Salone, excluding User Content.',
    ],
  },
  {
    number: 2,
    title: '2. CHANGES TO THESE TERMS',
    icon: FileCheck,
    content: [
      'We may update, modify, add or remove provisions of these Terms from time to time.',
      'When we make material changes, we may provide notice through the Platform, by email or through another reasonable method.',
      'The updated Terms will become effective on the date stated in the revised Terms. Your continued use of Deck Salone after the effective date of revised Terms constitutes your acceptance of the updated Terms.',
      'You are responsible for reviewing these Terms periodically.',
    ],
  },
  {
    number: 3,
    title: '3. DESCRIPTION OF DECK SALONE',
    icon: Music,
    content: [
      'Deck Salone provides an online ecosystem for discovering, promoting and connecting DJs and music professionals.',
      'Depending on the features available at any particular time, the Platform may allow Users to:',
    ],
    bullets: [
      '1. Create DJ or User profiles;',
      '2. Upload and publish DJ mixes and other permitted content;',
      '3. Stream and discover audio content;',
      '4. Follow DJs and other Users;',
      '5. Like, comment on or interact with content;',
      '6. Discover DJs by location, genre, popularity or other criteria;',
      '7. Contact DJs regarding professional opportunities;',
      '8. Request or arrange DJ bookings;',
      '9. Promote events, services and professional activities;',
      '10. Access statistics, rankings, analytics or other performance information;',
      '11. Purchase subscriptions, promotional services or other paid features;',
      '12. Receive advertisements, sponsored content or promotional communications;',
      '13. Use APIs, widgets or other tools where made available; and',
      '14. Access other services and features that Deck Salone may introduce.',
    ],
    subsections: [
      {
        subtitle: 'Platform Modifications & Limitations',
        content: [
          'We reserve the right to add, modify, suspend or discontinue any feature, service or functionality at any time.',
          'We may also impose reasonable limitations on particular features, accounts, uploads, storage, streaming or other Platform activities.',
        ],
      },
    ],
  },
  {
    number: 4,
    title: '4. ELIGIBILITY',
    icon: UserCheck,
    content: [
      'You must provide accurate information when creating an account.',
      'You must not create an account using false information, another person’s identity or information that you do not have permission to use.',
      'If you are under the age required to legally enter into a binding agreement under applicable law, you may only use Deck Salone with the involvement and consent of a parent or legal guardian where required by law.',
      'By using Deck Salone, you represent that you have the legal capacity to enter into these Terms.',
    ],
  },
  {
    number: 5,
    title: '5. USER ACCOUNTS',
    icon: Shield,
    content: ['Certain Platform features require an account. You agree to:'],
    bullets: [
      'Provide accurate, current and complete registration information;',
      'Keep your account information accurate and updated;',
      'Maintain the confidentiality of your password and account credentials;',
      'Not share your account with unauthorized persons;',
      'Not create accounts for fraudulent or abusive purposes; and',
      'Immediately notify us if you believe your account has been compromised.',
    ],
    subsections: [
      {
        subtitle: 'Account Responsibility & Termination',
        content: [
          'You are responsible for activities conducted through your account unless you can demonstrate that the activity occurred without your authorization and despite reasonable security measures on your part.',
          'Deck Salone may suspend or terminate accounts that contain false, misleading or fraudulent information.',
        ],
      },
    ],
  },
  {
    number: 6,
    title: '6. DJ PROFILES',
    icon: Award,
    content: [
      'DJs may create professional profiles containing information such as DJ name, legal/professional name, biography, location, genres, profile photograph, cover artwork, social media links, contact info, mixes, events, booking info, performance history, ratings or engagement metrics.',
    ],
    bullets: [
      'You are responsible for ensuring that information on your profile is accurate and does not intentionally mislead Users.',
      'You must not impersonate another DJ, artist, company, organization or public figure.',
      'Deck Salone may request verification or supporting information before granting a verification badge or other professional status.',
      'Verification does not constitute an endorsement, guarantee or representation that a DJ will perform satisfactorily.',
    ],
  },
  {
    number: 7,
    title: '7. USER CONTENT',
    icon: Music,
    content: [
      'Deck Salone allows Users to upload, submit, publish and share User Content. You retain ownership of User Content that you own. Deck Salone does not claim ownership of your original music, DJ mixes, photographs, artwork or other intellectual property merely because you upload it to the Platform.',
      'By uploading or submitting User Content, you grant Deck Salone a worldwide, non-exclusive, royalty-free, transferable and sublicensable licence to host, store, reproduce, process, transmit, publicly display, publicly perform, distribute, communicate and otherwise use that User Content as reasonably necessary to:',
    ],
    bullets: [
      '1. Operate and provide the Platform;',
      '2. Make your content available to other Users;',
      '3. Stream and display your content;',
      '4. Promote your profile and content;',
      '5. Promote Deck Salone;',
      '6. Create previews, thumbnails, excerpts or promotional materials;',
      '7. Improve, maintain and develop the Platform;',
      '8. Distribute content through Deck Salone’s applications, website, APIs, widgets and other services; and',
      '9. Provide advertising, marketing and promotional features associated with the Platform.',
    ],
    subsections: [
      {
        subtitle: 'Licence Duration & Retention',
        content: [
          'This licence continues for as long as your User Content remains on the Platform and for a reasonable period thereafter where necessary for backups, technical systems, legal obligations or legitimate business purposes.',
          'Deck Salone will not sell ownership of your original User Content to third parties merely because you upload it to the Platform.',
        ],
      },
    ],
  },
  {
    number: 8,
    title: '8. YOUR RESPONSIBILITY FOR MUSIC AND COPYRIGHT',
    icon: AlertTriangle,
    content: [
      'This section is particularly important for DJs.',
      'You are solely responsible for ensuring that you have the necessary rights, permissions, licences and consents required to upload, publish, stream, perform, distribute or otherwise make your User Content available through Deck Salone. This includes musical compositions, sound recordings, remixes, mashups, samples, acapellas, instrumentals, artwork, photographs, videos, logos, and trademarks.',
    ],
    bullets: [
      'A DJ mix containing copyrighted music does not automatically mean that the DJ owns the copyright in the underlying recordings or compositions.',
      'You must not upload content where you do not have the necessary rights or permissions.',
      'Deck Salone does not grant you permission to use copyrighted music merely because that music can be uploaded to the Platform.',
      'You are responsible for obtaining any licences or permissions required under applicable law.',
    ],
  },
  {
    number: 9,
    title: '9. COPYRIGHT COMPLAINTS AND TAKEDOWN PROCEDURE',
    icon: Flag,
    content: [
      'Deck Salone respects intellectual property rights. If you believe that content available on Deck Salone infringes your copyright or other intellectual property rights, you may contact us with a written complaint.',
      'A complaint should include, where applicable:',
    ],
    bullets: [
      '1. Identification of the copyrighted work or intellectual property;',
      '2. Identification of the allegedly infringing content;',
      '3. A URL or other information allowing us to locate the content;',
      '4. Your full name and contact information;',
      '5. A statement explaining your ownership or authority to act on behalf of the rights holder;',
      '6. A statement that you have a good-faith belief that the use is unauthorized; and',
      '7. Any additional information reasonably required to investigate the complaint.',
    ],
    subsections: [
      {
        subtitle: 'Submitting a Takedown Notice',
        content: [
          'You may contact Deck Salone through: support@decksalone.com / legal@decksalone.com.',
          'We may remove, restrict, disable or otherwise limit access to allegedly infringing content while investigating a complaint. Where appropriate, we may terminate or restrict accounts belonging to repeat copyright infringers.',
        ],
      },
    ],
  },
  {
    number: 10,
    title: '10. PROHIBITED USER CONTENT',
    icon: ShieldAlert,
    content: ['You must not upload, publish, transmit or otherwise make available content that:'],
    bullets: [
      '1. Is unlawful;',
      '2. Infringes copyright or other intellectual property rights;',
      '3. Is defamatory or deliberately misleading;',
      '4. Contains threats or harassment;',
      '5. Promotes violence;',
      '6. Contains hate speech or discriminatory material;',
      '7. Contains unlawful sexual or exploitative content;',
      '8. Exploits or endangers minors;',
      '9. Contains malware, viruses or malicious code;',
      '10. Impersonates another person or organization;',
      '11. Contains fraudulent information;',
      '12. Promotes illegal activities;',
      '13. Contains unauthorized personal information of another person;',
      '14. Is designed to manipulate Platform rankings or engagement;',
      '15. Uses automated methods to generate fake plays, likes, followers or interactions;',
      '16. Contains unauthorized advertisements or commercial solicitations where prohibited;',
      '17. Violates applicable laws or regulations; or',
      '18. Is otherwise harmful to the Platform or its Users.',
    ],
  },
  {
    number: 11,
    title: '11. PROHIBITED USES OF THE PLATFORM',
    icon: ShieldAlert,
    content: ['You agree not to:'],
    bullets: [
      '1. Use Deck Salone for unlawful purposes;',
      '2. Attempt to gain unauthorized access to another account;',
      '3. Hack, attack or interfere with the Platform;',
      '4. Introduce viruses, malware, spyware or other harmful code;',
      '5. Circumvent security measures;',
      '6. Reverse engineer or decompile the Platform except where expressly permitted by applicable law;',
      '7. Scrape or automatically collect Platform data without authorization;',
      '8. Use bots or automated systems to manipulate plays, followers, rankings or engagement;',
      '9. Create fake accounts;',
      '10. Manipulate rankings, charts or statistics;',
      '11. Buy or sell fake engagement;',
      '12. Harass or threaten other Users;',
      '13. Collect personal information without appropriate authorization;',
      '14. Impersonate another DJ, artist, company or organization;',
      '15. Use the Platform to commit fraud;',
      '16. Attempt to circumvent payment systems or Platform fees;',
      '17. Interfere with another User’s access to the Platform;',
      '18. Copy, reproduce or commercially exploit Platform Content without permission; or',
      '19. Use Deck Salone in any manner that violates these Terms or applicable law.',
    ],
  },
  {
    number: 12,
    title: '12. DJ BOOKINGS',
    icon: CreditCard,
    content: [
      'Deck Salone may provide features that allow Clients to discover, contact or request bookings from DJs.',
      'Unless expressly stated otherwise, Deck Salone is a technology platform connecting DJs and potential Clients and is not itself the performing DJ.',
      'A booking may be subject to separate terms between the DJ and Client.',
    ],
    bullets: [
      'DJs are responsible for confirming their availability, providing accurate pricing, communicating professionally, honouring confirmed bookings, providing agreed services, and complying with applicable regulations.',
      'Clients are responsible for providing accurate event information and honouring agreed payment and booking terms.',
      'Deck Salone does not guarantee that a DJ or Client will complete a booking.',
      'Deck Salone is not responsible for the quality, cancellation, performance or outcome of a booking arranged between Users.',
    ],
  },
  {
    number: 13,
    title: '13. PAYMENTS, SUBSCRIPTIONS AND FEES',
    icon: CreditCard,
    content: [
      'Deck Salone may offer free and paid services, including subscriptions, promotional services, advertising, booking-related services or other premium features.',
      'Where a fee applies, the applicable price and payment terms will be displayed before purchase. You authorize Deck Salone or its authorized payment provider to process applicable payments.',
    ],
    bullets: [
      'Fees may be non-refundable except where required by applicable law, expressly stated in service terms, or determined appropriate by Deck Salone.',
      'If a payment fails, Deck Salone may suspend or restrict access to paid features.',
      'Third-party payment providers (including Mobile Money operators) may impose their own terms and fees.',
      'Deck Salone does not store sensitive card information except as permitted by applicable law and our privacy practices.',
    ],
  },
  {
    number: 14,
    title: '14. PLATFORM RANKINGS, PLAYS AND ANALYTICS',
    icon: Award,
    content: [
      'Deck Salone may provide rankings, charts, statistics, play counts, followers, likes, engagement metrics or other analytics calculated using automated systems.',
      'Deck Salone reserves the right to remove fraudulent, artificial or manipulated engagement from statistics. We may adjust rankings or statistics where we identify bots, fraudulent activity, technical errors or other forms of manipulation.',
      'No ranking, chart position, verification badge or statistic guarantees commercial success, bookings, popularity or income.',
    ],
  },
  {
    number: 15,
    title: '15. ADVERTISING AND PROMOTIONAL CONTENT',
    icon: Globe,
    content: [
      'Deck Salone may display advertising, sponsored campaigns, promoted DJs, events, brands or other promotional content alongside User Content.',
      'Deck Salone may use information relating to Platform activity in accordance with its Privacy Policy and applicable law to provide relevant advertising.',
      'Advertisers and third-party businesses are responsible for their own products, services and claims. Deck Salone does not necessarily endorse products or services displayed through advertising.',
    ],
  },
  {
    number: 16,
    title: '16. PLATFORM INTELLECTUAL PROPERTY',
    icon: Lock,
    content: [
      'All rights in the Platform and Platform Content belong to Deck Salone, its licensors or applicable rights holders. This includes trademarks, logos, names, website/app design, user interface, software, source code, databases, graphics, text, functionality, branding, and layouts.',
      'Except where expressly permitted, you may not copy, reproduce, modify, distribute, sell, license, reverse engineer or create derivative works from Platform Content.',
      'Nothing in these Terms grants you ownership of Deck Salone’s intellectual property.',
    ],
  },
  {
    number: 17,
    title: '17. THIRD-PARTY SERVICES AND LINKS',
    icon: Globe,
    content: [
      'Deck Salone may contain links, integrations or services provided by third parties (payment providers, social networks, music services, analytics, hosting, authentication).',
      'Deck Salone does not control third-party services and is not responsible for their availability, policies, security, content or practices. Your use of third-party services is subject to their separate terms and privacy policies.',
    ],
  },
  {
    number: 18,
    title: '18. CONTENT MODERATION AND REMOVAL',
    icon: Shield,
    content: [
      'Deck Salone may, but is not obligated to, monitor or review content submitted to the Platform.',
      'We reserve the right to remove, restrict, disable, hide or modify content at any time where we reasonably believe that it violates these Terms, violates applicable law, infringes intellectual property rights, creates a security risk, harms other Users, is fraudulent or misleading, damages Platform integrity, or action is otherwise reasonably necessary.',
      'We may take such action with or without prior notice where appropriate.',
    ],
  },
  {
    number: 19,
    title: '19. ACCOUNT SUSPENSION AND TERMINATION',
    icon: ShieldAlert,
    content: [
      'Deck Salone may suspend, restrict or terminate an account where we reasonably believe that a User violated these Terms, engaged in fraudulent activity, repeatedly infringed intellectual property rights, manipulated engagement, abused another User, attempted unauthorized access, or created risk for the Platform.',
      'You may stop using Deck Salone at any time. Upon termination, your right to access the Platform may immediately end. Certain provisions (including intellectual property, indemnification, liability, and dispute provisions) survive termination.',
    ],
  },
  {
    number: 20,
    title: '20. PRIVACY',
    icon: Lock,
    content: [
      'Your use of Deck Salone is also subject to our Privacy Policy, which explains how we collect, use, store and protect personal information.',
      'You should review the Privacy Policy before using the Platform.',
    ],
  },
  {
    number: 21,
    title: '21. DISCLAIMER OF WARRANTIES',
    icon: AlertTriangle,
    content: [
      'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DECK SALONE AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, CONTRACTORS AND SERVICE PROVIDERS PROVIDE THE PLATFORM ON AN “AS IS” AND “AS AVAILABLE” BASIS.',
      'WE DO NOT GUARANTEE THAT THE PLATFORM WILL ALWAYS BE AVAILABLE, ERROR-FREE, FREE FROM VIRUSES OR SECURITY THREATS; THAT CONTENT WILL ALWAYS BE ACCURATE OR SAVED; THAT EVERY DJ OR BOOKING WILL COMPLETE; OR THAT ANY PARTICULAR RESULT OR INCOME WILL BE ACHIEVED.',
      'YOUR USE OF THE PLATFORM IS AT YOUR OWN RISK TO THE EXTENT PERMITTED BY LAW.',
    ],
  },
  {
    number: 22,
    title: '22. LIMITATION OF LIABILITY',
    icon: Scale,
    content: [
      'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DECK SALONE AND ITS OWNERS, DIRECTORS, OFFICERS, EMPLOYEES, CONTRACTORS, AFFILIATES AND SERVICE PROVIDERS SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE DAMAGES ARISING FROM OR RELATING TO YOUR USE OF THE PLATFORM.',
      'THIS INCLUDES LOSS OF PROFITS, LOSS OF BUSINESS, LOSS OF BOOKINGS, LOSS OF DATA, LOSS OF REPUTATION, LOSS OF CONTENT, INTERRUPTION OF SERVICE, LOSS ARISING FROM THIRD-PARTY SERVICES, OR DISPUTES BETWEEN USERS.',
    ],
  },
  {
    number: 23,
    title: '23. INDEMNIFICATION',
    icon: Shield,
    content: [
      'You agree to indemnify and hold harmless Deck Salone, its owners, directors, officers, employees, contractors, affiliates and service providers from claims, damages, losses, liabilities, costs and expenses (including reasonable legal fees) arising from or relating to:',
    ],
    bullets: [
      '1. Your User Content;',
      '2. Your use of the Platform;',
      '3. Your violation of these Terms;',
      '4. Your violation of applicable law;',
      '5. Your infringement of another person’s intellectual property;',
      '6. Your dealings with other Users; or',
      '7. Your use of Deck Salone for unauthorized or unlawful purposes.',
    ],
  },
  {
    number: 24,
    title: '24. GOVERNING LAW',
    icon: Scale,
    content: [
      'These Terms shall be governed by and interpreted in accordance with the laws of the Republic of Sierra Leone, without regard to conflict-of-law principles.',
      'Subject to any mandatory legal rights available to you, disputes arising from or relating to these Terms or your use of Deck Salone shall be subject to the jurisdiction of the appropriate courts of Sierra Leone.',
    ],
  },
  {
    number: 25,
    title: '25. DISPUTES BETWEEN USERS',
    icon: Scale,
    content: [
      'Deck Salone may provide tools that allow Users to communicate or conduct business with each other. Users are responsible for resolving disputes arising from their own transactions, bookings, payments or professional relationships.',
      'Where appropriate, Deck Salone may assist with investigations or disputes, but we do not guarantee that we will resolve disputes between Users. Deck Salone may take action against an account where a User is found to have violated these Terms.',
    ],
  },
  {
    number: 26,
    title: '26. CHANGES TO THE PLATFORM',
    icon: Server,
    content: [
      'Deck Salone may change, suspend or discontinue any portion of the Platform at any time, introduce new services, remove existing services, change functionality, modify subscription plans or alter Platform features.',
      'We will make reasonable efforts to provide notice where required by law.',
    ],
  },
  {
    number: 27,
    title: '27. GENERAL PROVISIONS',
    icon: FileText,
    content: [
      'If any provision of these Terms is determined to be invalid or unenforceable, that provision shall be modified to the minimum extent necessary to make it enforceable, and remaining provisions shall remain in effect.',
      'Failure by Deck Salone to enforce any provision does not constitute a waiver of that provision.',
      'These Terms constitute the entire agreement between you and Deck Salone concerning your use of the Platform.',
      'You may not transfer your rights or obligations under these Terms without our prior written consent. Deck Salone may assign or transfer its rights and obligations where legally permitted.',
    ],
  },
  {
    number: 28,
    title: '28. CONTACT',
    icon: Mail,
    content: [
      'For questions, complaints, copyright matters, legal notices or other inquiries concerning these Terms, please contact:',
      'Deck Salone',
      'Operator/Legal Entity: Deck Salone Ltd.',
      'Legal & Support Email: legal@decksalone.com / support@decksalone.com',
      'Website: https://decksalone.com',
      'Business Address: Freetown, Republic of Sierra Leone',
    ],
  },
  {
    number: 29,
    title: '29. ACCEPTANCE',
    icon: FileCheck,
    content: [
      'By creating an account, accessing the Platform, uploading content, streaming content, creating a DJ profile, using booking features or otherwise using Deck Salone, you acknowledge that:',
    ],
    bullets: [
      '1. You have read these Terms;',
      '2. You understand these Terms;',
      '3. You agree to be bound by these Terms; and',
      '4. You agree to comply with applicable laws and regulations.',
    ],
    subsections: [
      {
        subtitle: 'Final Notice',
        content: [
          'If you do not agree to these Terms, you must not access or use Deck Salone.',
          'Effective Date: 15th July 2026',
          'Last Updated: 20th August 2026',
        ],
      },
    ],
  },
];

export default function Terms() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSections = termsSections.filter((sec) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      sec.title.toLowerCase().includes(term) ||
      sec.content.some((c) => c.toLowerCase().includes(term)) ||
      (sec.bullets && sec.bullets.some((b) => b.toLowerCase().includes(term))) ||
      (sec.subsections &&
        sec.subsections.some(
          (sub) =>
            sub.subtitle.toLowerCase().includes(term) ||
            sub.content.some((c) => c.toLowerCase().includes(term)) ||
            (sub.bullets && sub.bullets.some((b) => b.toLowerCase().includes(term)))
        ))
    );
  });

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
            <span className="inline-block px-3.5 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs font-bold uppercase tracking-widest">
              Legal Framework · Republic of Sierra Leone
            </span>
          </motion.div>
          <motion.h1
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white mt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Terms of <span className="text-gradient-gold">Use</span>
          </motion.h1>
          <motion.div
            className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-text-secondary font-mono"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
              📅 Effective: 15th July 2026
            </span>
            <span className="px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold">
              ⚡ Last Updated: 20th August 2026
            </span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
              📍 High Court of Sierra Leone
            </span>
          </motion.div>

          {/* Quick Search */}
          <div className="mt-8 max-w-md mx-auto relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search terms (e.g. copyright, bookings, refunds, DJ profiles)..."
              className="w-full pl-10 pr-4 py-2.5 bg-black-elevated border border-white/10 focus:border-gold rounded-xl text-xs sm:text-sm text-white placeholder:text-text-muted/60 focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTIONS ═══════════════ */}
      <section className="py-12 sm:py-16 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="space-y-6">
            {filteredSections.length === 0 ? (
              <div className="text-center py-16 p-8 rounded-2xl bg-black-elevated border border-white/10">
                <BookOpen className="w-12 h-12 text-gold/50 mx-auto mb-3" />
                <p className="text-white font-semibold">No matching sections found</p>
                <p className="text-xs text-text-muted mt-1">Try a different search term like "copyright", "DJ", "bookings", or "payments".</p>
              </div>
            ) : (
              filteredSections.map((section, index) => {
                const IconComponent = section.icon;
                return (
                  <FadeIn key={section.title} delay={Math.min(0.2, 0.02 * index)}>
                    <div className="p-6 sm:p-8 bg-black-elevated rounded-2xl border border-white/10 hover:border-gold/30 transition-colors shadow-lg">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0 mt-1">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="font-display text-lg sm:text-xl font-bold text-white uppercase tracking-tight">
                            {section.title}
                          </h2>

                          <div className="mt-3 space-y-2 text-xs sm:text-sm text-text-secondary leading-relaxed">
                            {section.content.map((paragraph, pIdx) => (
                              <p key={pIdx}>{paragraph}</p>
                            ))}

                            {section.bullets && (
                              <ul className="mt-3 space-y-1.5 pl-5 list-disc text-text-secondary text-xs sm:text-sm">
                                {section.bullets.map((b, bIdx) => (
                                  <li key={bIdx}>{b}</li>
                                ))}
                              </ul>
                            )}

                            {section.subsections &&
                              section.subsections.map((sub, sIdx) => (
                                <div key={sIdx} className="mt-4 pt-3 border-t border-white/5">
                                  <h3 className="font-semibold text-white text-xs sm:text-sm uppercase tracking-wider text-gold/90 mb-1.5">
                                    {sub.subtitle}
                                  </h3>
                                  {sub.content.map((sc, scIdx) => (
                                    <p key={scIdx} className="mt-1">{sc}</p>
                                  ))}
                                  {sub.bullets && (
                                    <ul className="mt-2 space-y-1.5 pl-5 list-disc text-text-secondary text-xs sm:text-sm">
                                      {sub.bullets.map((sb, sbIdx) => (
                                        <li key={sbIdx}>{sb}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </FadeIn>
                );
              })
            )}

            {/* Reporting & Legal Notice Card */}
            <FadeIn delay={0.2}>
              <div className="p-6 sm:p-8 bg-gradient-to-r from-red/10 via-black-elevated to-gold/10 rounded-2xl border border-red/30 shadow-xl mt-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red/20 border border-red/40 flex items-center justify-center text-red shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white uppercase tracking-tight">
                      Violations & Legal Inquiries
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed">
                      To report a Terms of Use violation, copyright infringement, or fraudulent activity, please contact our Legal & Compliance Desk:
                    </p>
                    <div className="mt-4 p-4 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-gold flex flex-col sm:flex-row gap-2 sm:gap-6 flex-wrap">
                      <span>📧 Legal Email: legal@decksalone.com</span>
                      <span>🛡️ Compliance: support@decksalone.com</span>
                      <span>🏢 Entity: Deck Salone Ltd.</span>
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
