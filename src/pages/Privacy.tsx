import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Eye,
  Server,
  Share2,
  UserCheck,
  ShieldCheck,
  Database,
  FileCheck,
  Music,
  CreditCard,
  Bell,
  MapPin,
  Globe,
  Radio,
  FileText,
  AlertTriangle,
  Mail,
  UserX,
  Search,
  BookOpen,
} from 'lucide-react';
import FadeIn from '../components/FadeIn';

interface PolicySection {
  number: number;
  title: string;
  icon: React.ElementType;
  content: string[];
  bullets?: string[];
  subsections?: { subtitle: string; content: string[]; bullets?: string[] }[];
}

const policySections: PolicySection[] = [
  {
    number: 1,
    title: '1. INTRODUCTION',
    icon: FileText,
    content: [
      'Deck Salone (“Deck Salone”, “we”, “our” or “us”) respects your privacy and is committed to protecting your personal information.',
      'This Privacy Policy explains how we collect, use, store, disclose and protect personal information when you access or use the Deck Salone website, mobile application, software, services and related platforms (collectively, the “Platform”).',
      'This Privacy Policy applies to DJs, listeners, Clients, visitors, subscribers and other Users of Deck Salone.',
      'By using Deck Salone, you acknowledge that you have read and understood this Privacy Policy.',
    ],
  },
  {
    number: 2,
    title: '2. AN OVERVIEW OF DATA PROTECTION',
    icon: Eye,
    content: [
      'Personal information is information that identifies, relates to or could reasonably be associated with an individual.',
      'Depending on how you use Deck Salone, we may collect information such as:',
    ],
    bullets: [
      'Name;',
      'DJ or stage name;',
      'Username;',
      'Email address;',
      'Telephone number;',
      'Profile photograph;',
      'Date of birth or age information where necessary;',
      'Country and city;',
      'DJ biography;',
      'Music genres;',
      'Social media information;',
      'Uploaded mixes and other content;',
      'Likes, follows and interactions;',
      'Play and listening activity;',
      'Booking information;',
      'Messages and communications;',
      'Payment and transaction information;',
      'Device information;',
      'IP address;',
      'Browser information;',
      'App information;',
      'Approximate location information;',
      'Cookies and similar technologies;',
      'Advertising and analytics information; and',
      'Other information you voluntarily provide.',
    ],
    subsections: [
      {
        subtitle: 'Necessity Principle',
        content: [
          'We only collect information that is reasonably necessary for operating, improving, securing and providing the Platform and its services.',
        ],
      },
    ],
  },
  {
    number: 3,
    title: '3. WHO IS RESPONSIBLE FOR YOUR DATA?',
    icon: ShieldCheck,
    content: [
      'The entity responsible for processing personal information through Deck Salone is:',
      'Deck Salone',
      'Operator/Legal Entity: Leroy Sawyer',
      'Business Address: 10 UN Driver Freetown, Sierra Leone',
      'Country: Republic of Sierra Leone',
      'Email: contact@decksalone.com',
      'Website: https://decksalone.com',
      'For privacy-related questions, complaints or requests, please contact us using the details above.',
    ],
  },
  {
    number: 4,
    title: '4. HOW DO WE COLLECT YOUR INFORMATION?',
    icon: Database,
    content: ['We collect information in several ways.'],
    subsections: [
      {
        subtitle: 'Information you provide directly',
        content: ['You may provide information when you:'],
        bullets: [
          'Create an account;',
          'Create or edit a DJ profile;',
          'Upload a mix;',
          'Upload a photograph or artwork;',
          'Contact us;',
          'Subscribe to a service;',
          'Purchase a service;',
          'Request or accept a booking;',
          'Send a message;',
          'Follow another User;',
          'Like or comment on content;',
          'Participate in promotions;',
          'Submit a support request; or',
          'Otherwise interact with Deck Salone.',
        ],
      },
      {
        subtitle: 'Information collected automatically',
        content: [
          'Some information is automatically collected when you access or use Deck Salone. This may include:',
        ],
        bullets: [
          'IP address;',
          'Device type;',
          'Operating system;',
          'Browser type;',
          'App version;',
          'Language;',
          'Time zone;',
          'Referring website;',
          'Pages or screens visited;',
          'Time spent on the Platform;',
          'Features used;',
          'Approximate location;',
          'Crash information;',
          'Network information; and',
          'Other technical information.',
        ],
      },
    ],
  },
  {
    number: 5,
    title: '5. WHY DO WE USE YOUR INFORMATION?',
    icon: Lock,
    content: ['We may use personal information to:'],
    bullets: [
      '1. Create and manage accounts;',
      '2. Provide Deck Salone’s services;',
      '3. Create and display DJ profiles;',
      '4. Host and stream uploaded mixes;',
      '5. Connect DJs with listeners and potential Clients;',
      '6. Facilitate booking requests;',
      '7. Process payments and subscriptions;',
      '8. Provide customer support;',
      '9. Communicate with Users;',
      '10. Send important account and service notifications;',
      '11. Send newsletters and promotional communications where permitted;',
      '12. Provide push notifications;',
      '13. Measure plays, engagement and Platform activity;',
      '14. Maintain rankings and charts;',
      '15. Detect fraud and artificial engagement;',
      '16. Protect the Platform from abuse;',
      '17. Prevent unauthorized access;',
      '18. Improve Platform functionality;',
      '19. Conduct analytics and research;',
      '20. Personalize parts of the User experience;',
      '21. Provide advertising and sponsored campaigns;',
      '22. Comply with legal obligations;',
      '23. Respond to lawful requests from authorities; and',
      '24. Protect the rights, property and safety of Deck Salone, our Users and third parties.',
    ],
  },
  {
    number: 6,
    title: '6. INFORMATION ABOUT DJ PROFILES',
    icon: UserCheck,
    content: [
      'When you create a DJ profile, information you choose to make public may be visible to other Users and visitors. This may include:',
    ],
    bullets: [
      'DJ name;',
      'Profile photograph;',
      'Biography;',
      'Location;',
      'Genres;',
      'Mixes;',
      'Events;',
      'Social media links;',
      'Booking availability;',
      'Professional information;',
      'Verification status;',
      'Followers;',
      'Likes;',
      'Rankings;',
      'Play counts; and',
      'Other public profile information.',
    ],
    subsections: [
      {
        subtitle: 'Public Visibility Notice',
        content: [
          'You should not publish personal information that you do not want to be publicly accessible.',
          'Deck Salone is not responsible for information that you voluntarily publish publicly.',
        ],
      },
    ],
  },
  {
    number: 7,
    title: '7. USER CONTENT',
    icon: Music,
    content: [
      'When you upload content to Deck Salone, including mixes, photographs, artwork, videos or other materials, the content may be processed and stored on our systems or on systems operated by service providers on our behalf.',
      'We may process User Content for the purpose of:',
    ],
    bullets: [
      'Hosting the content;',
      'Making the content available through the Platform;',
      'Streaming and delivering content;',
      'Generating thumbnails and previews;',
      'Providing search and discovery;',
      'Creating statistics;',
      'Moderating content;',
      'Detecting copyright infringement;',
      'Promoting Deck Salone and its Users;',
      'Maintaining backups; and',
      'Providing other Platform functionality.',
    ],
    subsections: [
      {
        subtitle: 'User Responsibility',
        content: ['You remain responsible for the content you upload.'],
      },
    ],
  },
  {
    number: 8,
    title: '8. MUSIC AND COPYRIGHT INFORMATION',
    icon: Radio,
    content: [
      'Deck Salone may process technical information associated with uploaded audio, including where applicable:',
    ],
    bullets: [
      'File name;',
      'Track title;',
      'Artist information;',
      'Album information;',
      'Artwork;',
      'Duration;',
      'File format;',
      'File size;',
      'Upload date;',
      'Audio metadata;',
      'Play information; and',
      'Copyright or content-identification information.',
    ],
    subsections: [
      {
        subtitle: 'Automated Protection Systems',
        content: [
          'Where appropriate, Deck Salone may use automated systems or third-party technologies to identify potentially infringing or unauthorized content.',
          'This may include audio fingerprinting or similar technologies for the purposes of detecting copyright infringement, preventing repeated unauthorized uploads, responding to rights-holder complaints, protecting artists and rights holders, and protecting the Platform.',
        ],
      },
    ],
  },
  {
    number: 9,
    title: '9. ACCOUNT REGISTRATION',
    icon: UserCheck,
    content: ['When you register for Deck Salone, we may collect information such as:'],
    bullets: [
      'Name;',
      'Username;',
      'Email address;',
      'Phone number;',
      'Password or authentication credentials;',
      'Country;',
      'Date of birth or age information where required;',
      'Profile information; and',
      'Other information necessary to establish your account.',
    ],
    subsections: [
      {
        subtitle: 'Credentials & Security',
        content: [
          'Passwords are intended to be stored using appropriate security measures and should not be shared with anyone.',
          'You are responsible for keeping your login credentials secure.',
        ],
      },
    ],
  },
  {
    number: 10,
    title: '10. SOCIAL LOGIN AND THIRD-PARTY AUTHENTICATION',
    icon: Globe,
    content: [
      'Deck Salone may allow registration or login through third-party authentication services such as Google, Apple, Facebook/Meta, WeChat, or other authentication providers.',
      'If you use a third-party login service, that provider may provide Deck Salone with information necessary to create or authenticate your account. Depending on the provider and your settings, this may include:',
    ],
    bullets: [
      'Name;',
      'Email address;',
      'Profile photograph;',
      'Provider-specific account identifier;',
      'Language;',
      'Country or region; and',
      'Other information that you authorize the provider to share.',
    ],
    subsections: [
      {
        subtitle: 'Third-Party Privacy Notice',
        content: [
          'Deck Salone does not receive your third-party account password.',
          'Your use of third-party authentication is also subject to the privacy policy of that third-party provider.',
        ],
      },
    ],
  },
  {
    number: 11,
    title: '11. COMMUNICATIONS AND MESSAGES',
    icon: Mail,
    content: [
      'If Deck Salone provides messaging, chat, comments or other communication features, information associated with those communications may be processed and stored. This may include:',
    ],
    bullets: [
      'Sender and recipient;',
      'Date and time;',
      'Message content;',
      'Attachments;',
      'Device information;',
      'IP address or security information; and',
      'Other technical information.',
    ],
    subsections: [
      {
        subtitle: 'Lawful Disclosure',
        content: [
          'We may access or disclose communications where reasonably necessary to provide the service, respond to support requests, investigate abuse or fraud, protect Users, enforce our Terms, comply with legal obligations, or respond to lawful requests from authorities.',
        ],
      },
    ],
  },
  {
    number: 12,
    title: '12. LIKES, FOLLOWS, PLAYS AND OTHER INTERACTIONS',
    icon: Music,
    content: ['Deck Salone may record your interactions with the Platform, including:'],
    bullets: [
      'Plays and replays;',
      'Likes and follows;',
      'Comments and shares;',
      'Downloads where available;',
      'Searches and profile views;',
      'Playlist activity and mix interactions;',
      'Booking requests and messages;',
      'Event interactions; and',
      'Other Platform activity.',
    ],
    subsections: [
      {
        subtitle: 'Purpose of Interaction Data',
        content: [
          'We use this information to operate features such as analytics, recommendations, rankings, charts and engagement statistics.',
        ],
      },
    ],
  },
  {
    number: 13,
    title: '13. IP ADDRESSES AND SECURITY INFORMATION',
    icon: Lock,
    content: [
      'We may collect IP addresses and related technical information to protect accounts, prevent fraud, detect malicious activity, prevent unauthorized access, investigate abuse, detect artificial plays or engagement, enforce Platform rules, maintain security, and comply with legal requirements.',
      'Where appropriate, we may hash, anonymize or otherwise protect IP-related information.',
    ],
  },
  {
    number: 14,
    title: '14. COOKIES AND SIMILAR TECHNOLOGIES',
    icon: Database,
    content: [
      'Deck Salone may use cookies, local storage, pixels, SDKs and similar technologies to keep Users signed in, remember preferences, maintain security, understand Platform usage, measure advertising, analyze performance, improve functionality, remember settings, and provide personalized experiences.',
      'Some cookies or technologies are necessary for the Platform to function. Where required by applicable law, we will request consent before using non-essential cookies or similar technologies. You can control certain cookies through your browser or device settings; disabling certain cookies may affect Platform functionality.',
    ],
  },
  {
    number: 15,
    title: '15. SERVER LOGS',
    icon: Server,
    content: [
      'Our servers may automatically record technical information when you access Deck Salone, including IP address, browser, operating system, device type, date and time, requested page or resource, referring URL, error information, and other technical information.',
      'Server logs may be used for security, troubleshooting, analytics and Platform administration.',
    ],
  },
  {
    number: 16,
    title: '16. ANALYTICS',
    icon: Eye,
    content: [
      'Deck Salone may use analytics technologies to understand how Users interact with the Platform, which features are used, which pages are visited, how Users discover content, Platform performance, user engagement, technical errors, geographic trends, device usage, and general audience behaviour.',
      'Where possible, analytics information will be aggregated or anonymized. We may use third-party analytics providers where appropriate.',
    ],
  },
  {
    number: 17,
    title: '17. ADVERTISING',
    icon: Share2,
    content: [
      'Deck Salone may display advertisements, sponsored content and promotional campaigns. Advertising providers may process device information, IP address, approximate location, browser information, advertising identifiers, Platform activity, and interaction with advertisements.',
      'Where required, we will obtain consent before using information for targeted advertising. We may also provide advertisers with aggregated or anonymized statistics about campaigns. We will not represent that a User endorses a product or brand without appropriate authorization.',
    ],
  },
  {
    number: 18,
    title: '18. NEWSLETTERS AND PROMOTIONAL COMMUNICATIONS',
    icon: Mail,
    content: [
      'If you subscribe to Deck Salone communications, we may collect your email address and other information necessary to send Platform updates, DJ opportunities, events, new features, promotional information, partner offers, newsletters, and other communications you have requested or permitted.',
      'You can unsubscribe from promotional emails at any time using the unsubscribe option provided in the communication. Certain service-related communications, such as security alerts, account notices or important changes to the Platform, may still be sent where necessary.',
    ],
  },
  {
    number: 19,
    title: '19. PUSH NOTIFICATIONS',
    icon: Bell,
    content: [
      'If you enable push notifications, Deck Salone may use a push-notification provider to deliver notifications to your device regarding new followers, likes, comments, messages, booking requests, Platform announcements, DJ opportunities, promotional messages, and other relevant updates.',
      'You can disable push notifications through your device or app settings.',
    ],
  },
  {
    number: 20,
    title: '20. LOCATION INFORMATION',
    icon: MapPin,
    content: [
      'Deck Salone may collect or use approximate location information where necessary for Platform functionality, including discovering DJs in a particular city, finding local events, displaying relevant booking opportunities, improving recommendations, and providing location-based Platform features.',
      'Where location information is optional, you may choose not to provide it. Deck Salone will not intentionally publish your precise location unless you choose to provide or publish it through a Platform feature.',
    ],
  },
  {
    number: 21,
    title: '21. BOOKINGS AND TRANSACTIONS',
    icon: FileCheck,
    content: [
      'If you use Deck Salone to request, accept or manage a DJ booking, we may process your name, contact information, event details, venue information, booking date, booking amount, payment status, communication history, cancellation information, and other information necessary to facilitate the transaction.',
      'This information may be shared with the relevant parties to the booking where necessary to provide the service.',
    ],
  },
  {
    number: 22,
    title: '22. PAYMENT INFORMATION',
    icon: CreditCard,
    content: [
      'Deck Salone may use third-party payment providers (including card processors, mobile-money providers, banks or other payment services) to process payments.',
      'Deck Salone may receive payment status, transaction references, amount, currency, payment method, billing information, customer information, and limited payment details.',
      'Where possible, sensitive payment credentials such as full card numbers are processed directly by the payment provider rather than stored by Deck Salone. Payment providers process your information according to their own privacy policies.',
    ],
  },
  {
    number: 23,
    title: '23. THIRD-PARTY SERVICES',
    icon: Server,
    content: [
      'Deck Salone may use third-party providers for cloud hosting, content delivery, analytics, authentication, email delivery, push notifications, customer support, payment processing, security, copyright identification, advertising, error monitoring, and other technical services.',
      'These providers process personal information on our behalf where necessary to provide their services under appropriate confidentiality and data protection terms.',
    ],
  },
  {
    number: 24,
    title: '24. SOCIAL MEDIA',
    icon: Globe,
    content: [
      'Deck Salone may provide links or sharing functionality for social networks such as Facebook/Meta, Instagram, X, TikTok, YouTube, WhatsApp, and other social platforms.',
      'If you interact with social-media functionality, the relevant platform may collect information about your activity. Your interactions with those services are governed by their respective privacy policies.',
    ],
  },
  {
    number: 25,
    title: '25. YOUTUBE AND EMBEDDED CONTENT',
    icon: Radio,
    content: [
      'Deck Salone may display embedded content from third-party platforms such as YouTube.',
      'When embedded content is loaded or interacted with, the third-party provider may collect information about your device and activity.',
      'YouTube is operated by Google. More information about Google’s privacy practices is available through Google’s privacy documentation.',
    ],
  },
  {
    number: 26,
    title: '26. DATA SHARING',
    icon: Share2,
    content: [
      'We do not sell your personal information simply because you create a Deck Salone account.',
      'We may share personal information where reasonably necessary with service providers, payment processors, authentication providers, hosting providers, analytics providers, advertising partners, security providers, copyright owners or representatives where legally appropriate, DJs or Clients where necessary to facilitate bookings, professional advisers, legal representatives, law-enforcement authorities where legally required, and other parties where you have provided appropriate consent.',
    ],
  },
  {
    number: 27,
    title: '27. BUSINESS TRANSFERS',
    icon: FileText,
    content: [
      'If Deck Salone is involved in a merger, acquisition, restructuring, investment, financing, sale of assets or similar transaction, personal information may be transferred as part of that transaction.',
      'Where required, we will take reasonable steps to ensure that personal information remains subject to appropriate privacy protections.',
    ],
  },
  {
    number: 28,
    title: '28. INTERNATIONAL DATA TRANSFERS',
    icon: Globe,
    content: [
      'Deck Salone may use service providers located outside Sierra Leone. As a result, personal information may be processed or stored in other countries.',
      'Where information is transferred internationally, we will take reasonable measures to protect that information and comply with applicable legal requirements.',
    ],
  },
  {
    number: 29,
    title: '29. DATA SECURITY',
    icon: ShieldCheck,
    content: [
      'We use reasonable technical and organizational measures designed to protect personal information against unauthorized access, unauthorized disclosure, loss, misuse, alteration, destruction, and other security threats.',
      'Security measures may include encryption, access controls, authentication, monitoring, logging and other safeguards. However, no internet transmission or electronic storage system can be guaranteed to be completely secure. You use Deck Salone at your own risk to the extent permitted by law.',
    ],
  },
  {
    number: 30,
    title: '30. HOW LONG DO WE KEEP YOUR INFORMATION?',
    icon: Database,
    content: [
      'We retain personal information for as long as reasonably necessary for the purposes described in this Privacy Policy, taking into account whether you maintain an active account, the type of information, the purpose for which it was collected, legal obligations, accounting requirements, dispute resolution, security requirements, and legitimate business needs.',
      'When information is no longer required, we may delete, anonymize or securely dispose of it.',
    ],
  },
  {
    number: 31,
    title: '31. ACCOUNT DELETION',
    icon: UserX,
    content: [
      'You may request deletion of your Deck Salone account at any time.',
      'When your account is deleted, we will take reasonable steps to delete or anonymize personal information associated with the account, subject to legal retention requirements, fraud prevention, security requirements, dispute resolution, financial and accounting obligations, and copyright enforcement.',
    ],
  },
  {
    number: 32,
    title: '32. YOUR PRIVACY RIGHTS',
    icon: UserCheck,
    content: ['Subject to applicable law, you may have the right to:'],
    bullets: [
      '1. Request access to personal information we hold about you;',
      '2. Request correction of inaccurate information;',
      '3. Request deletion of personal information;',
      '4. Request restriction of certain processing;',
      '5. Object to certain processing;',
      '6. Withdraw consent where processing is based on consent;',
      '7. Request a copy of certain personal information;',
      '8. Object to certain promotional communications;',
      '9. Request information about how your information is used; and',
      '10. Lodge a complaint with an appropriate regulatory authority.',
    ],
    subsections: [
      {
        subtitle: 'Exercising Your Rights',
        content: [
          'To exercise your rights, contact: Privacy Email: support@decksalone.com.',
          'We may need to verify your identity before processing certain requests.',
        ],
      },
    ],
  },
  {
    number: 33,
    title: '33. MARKETING COMMUNICATIONS',
    icon: Mail,
    content: [
      'You can unsubscribe from promotional emails at any time using the unsubscribe option provided in the communication.',
      'You may also manage certain push notifications through your device settings. Opting out of marketing communications does not necessarily prevent us from sending essential service communications.',
    ],
  },
  {
    number: 34,
    title: '34. CHILDREN’S PRIVACY',
    icon: AlertTriangle,
    content: [
      'Deck Salone is not intended to collect personal information from children where such collection is prohibited by applicable law.',
      'If you believe that a child has provided personal information to Deck Salone without appropriate authorization, please contact us. If we become aware that we have collected personal information in violation of applicable children’s privacy requirements, we will take reasonable steps to delete it.',
    ],
  },
  {
    number: 35,
    title: '35. THIRD-PARTY WEBSITES',
    icon: Globe,
    content: [
      'Deck Salone may contain links to websites or services operated by third parties.',
      'We are not responsible for the privacy practices, security or content of those third parties. You should review the privacy policy of any third-party website before providing personal information.',
    ],
  },
  {
    number: 36,
    title: '36. FRAUD, SECURITY AND LEGAL REQUESTS',
    icon: ShieldCheck,
    content: [
      'We may collect and retain information necessary to investigate fraud, fake accounts, account takeovers, copyright infringement, manipulation of plays or rankings, payment fraud, abuse, harassment, security incidents, unauthorized access, and other violations of our Terms.',
      'We may disclose relevant information to law-enforcement agencies, courts, regulators or other authorized parties where required or legally permitted.',
    ],
  },
  {
    number: 37,
    title: '37. CHANGES TO THIS PRIVACY POLICY',
    icon: FileCheck,
    content: [
      'We may update this Privacy Policy from time to time. When we make significant changes, we may notify Users through the Platform, email or other appropriate methods.',
      'The updated Privacy Policy will indicate the date on which it became effective. Your continued use of Deck Salone after the effective date means that you acknowledge the updated Privacy Policy.',
    ],
  },
  {
    number: 38,
    title: '38. CONTACT US',
    icon: Mail,
    content: [
      'If you have questions about this Privacy Policy, your personal information or our privacy practices, contact us:',
      'Deck Salone',
      'Operator/Legal Entity: Leroy Sawyer',
      'Privacy Email: contact@decksalone.com',
      'Support Email: support@decksalone.com',
      'Business Address: 10 UN Driver Freetown, Sierra Leone',
      'Country: Republic of Sierra Leone',
    ],
  },
  {
    number: 39,
    title: '39. FINAL NOTICE',
    icon: FileText,
    content: [
      'By using Deck Salone, you acknowledge that you have read and understood this Privacy Policy.',
      'If you do not agree with the way your information is handled as described in this Privacy Policy, you should discontinue your use of Deck Salone.',
      'Effective Date: 15th July 2026',
      'Last Updated: 20th August 2026',
    ],
  },
];

export default function Privacy() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSections = policySections.filter((sec) => {
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
              📍 10 UN Driver, Freetown
            </span>
          </motion.div>

          {/* Quick Search */}
          <div className="mt-8 max-w-md mx-auto relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search privacy topics (e.g. cookies, copyright, deletion, DJ profiles)..."
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

      {/* ═══════════════ CONTENT ═══════════════ */}
      <section className="py-12 sm:py-16 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="space-y-6">
            {filteredSections.length === 0 ? (
              <div className="text-center py-16 p-8 rounded-2xl bg-black-elevated border border-white/10">
                <BookOpen className="w-12 h-12 text-gold/50 mx-auto mb-3" />
                <p className="text-white font-semibold">No matching sections found</p>
                <p className="text-xs text-text-muted mt-1">Try a different search term like "data", "DJ", "mix", or "cookies".</p>
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

            {/* Privacy Contact Box */}
            <FadeIn delay={0.2}>
              <div className="p-6 sm:p-8 bg-gradient-to-r from-gold/10 via-black-elevated to-purple-900/20 rounded-2xl border border-gold/30 shadow-xl mt-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white uppercase tracking-tight">
                      Data Protection & Privacy Desk
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed">
                      For any questions regarding this Privacy Policy, your personal information, or to exercise your privacy rights, please reach out to us:
                    </p>
                    <div className="mt-4 p-4 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-gold flex flex-col sm:flex-row gap-2 sm:gap-6 flex-wrap">
                      <span>📧 Privacy: contact@decksalone.com</span>
                      <span>🛡️ Support: support@decksalone.com</span>
                      <span>👤 Entity: Leroy Sawyer</span>
                      <span>📍 10 UN Driver, Freetown, Sierra Leone</span>
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
