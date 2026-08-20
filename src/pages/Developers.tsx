import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  Terminal,
  Key,
  Database,
  Radio,
  Music,
  Award,
  Calendar,
  Send,
  CheckCircle2,
  Copy,
  Check,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import FadeIn from '../components/FadeIn';

type CodeLanguage = 'curl' | 'javascript' | 'python' | 'php';
type EndpointKey = 'trendingMixes' | 'djProfile' | 'weeklyRankings' | 'eventsList';

interface EndpointConfig {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
  snippets: Record<CodeLanguage, string>;
  response: string;
}

const API_ENDPOINTS: Record<EndpointKey, EndpointConfig> = {
  trendingMixes: {
    name: 'Get Trending Mixes',
    method: 'GET',
    path: '/api/mixes?sort=trending&limit=10',
    description: 'Fetch the top trending DJ mixes across Sierra Leone with metadata, genres, and audio stream links.',
    snippets: {
      curl: `curl -X GET "https://decksalone.com/api/mixes?sort=trending&limit=10" \\
  -H "X-Deck-API-Key: ds_live_your_api_key_here" \\
  -H "Accept: application/json"`,
      javascript: `const response = await fetch('https://decksalone.com/api/mixes?sort=trending&limit=10', {
  headers: {
    'X-Deck-API-Key': 'ds_live_your_api_key_here',
    'Accept': 'application/json'
  }
});
const data = await response.json();
console.log(data.mixes);`,
      python: `import requests

url = "https://decksalone.com/api/mixes"
headers = {
    "X-Deck-API-Key": "ds_live_your_api_key_here",
    "Accept": "application/json"
}
params = {"sort": "trending", "limit": 10}

response = requests.get(url, headers=headers, params=params)
data = response.json()
print(data["mixes"])`,
      php: `<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://decksalone.com/api/mixes?sort=trending&limit=10");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "X-Deck-API-Key: ds_live_your_api_key_here",
    "Accept: application/json"
]);
$output = curl_exec($ch);
curl_close($ch);
$data = json_decode($output, true);
?>`,
    },
    response: `{
  "success": true,
  "count": 10,
  "mixes": [
    {
      "id": "mix_cm894k2001",
      "title": "Salone Afrobeats & Amapiano Invasion 2026",
      "slug": "salone-afrobeats-amapiano-2026",
      "duration": 3480,
      "audioUrl": "https://decksalone.com/audio/mix-101.mp3",
      "audioSource": "upload",
      "coverImage": "https://decksalone.com/covers/mix-101.jpg",
      "genres": ["Afrobeats", "Amapiano"],
      "playCount": 18450,
      "likeCount": 1420,
      "dj": {
        "id": "dj_fredmax_99",
        "stageName": "DJ Fred Max",
        "verified": true,
        "location": "Freetown, Sierra Leone"
      }
    }
  ]
}`,
  },
  djProfile: {
    name: 'Get DJ Profile & Roster',
    method: 'GET',
    path: '/api/djs/dj-fredmax',
    description: 'Retrieve public DJ profile information, biography, accolades, genres, and booking availability.',
    snippets: {
      curl: `curl -X GET "https://decksalone.com/api/djs/dj-fredmax" \\
  -H "X-Deck-API-Key: ds_live_your_api_key_here"`,
      javascript: `const response = await fetch('https://decksalone.com/api/djs/dj-fredmax', {
  headers: { 'X-Deck-API-Key': 'ds_live_your_api_key_here' }
});
const dj = await response.json();
console.log(dj);`,
      python: `import requests

res = requests.get(
    "https://decksalone.com/api/djs/dj-fredmax",
    headers={"X-Deck-API-Key": "ds_live_your_api_key_here"}
)
print(res.json())`,
      php: `<?php
$json = file_get_contents("https://decksalone.com/api/djs/dj-fredmax", false, stream_context_create([
    "http" => ["header" => "X-Deck-API-Key: ds_live_your_api_key_here"]
]));
$dj = json_decode($json, true);
?>`,
    },
    response: `{
  "success": true,
  "dj": {
    "id": "dj_fredmax_99",
    "stageName": "DJ Fred Max",
    "slug": "dj-fredmax",
    "verified": true,
    "bio": "Official resident DJ & sound engineer in Freetown.",
    "location": "Freetown, Sierra Leone",
    "genres": ["Afrobeats", "Dancehall", "Hip Hop", "Koloqua"],
    "rating": 4.95,
    "totalPlays": 128400,
    "totalFollowers": 8420,
    "bookingAvailable": true,
    "socialLinks": {
      "instagram": "https://instagram.com/djfredmax",
      "twitter": "https://x.com/djfredmax"
    }
  }
}`,
  },
  weeklyRankings: {
    name: 'Get Weekly Rankings Leaderboard',
    method: 'GET',
    path: '/api/rankings/weekly',
    description: 'Access the official weekly Top DJs leaderboard based on verified streams, engagement, and fan votes.',
    snippets: {
      curl: `curl -X GET "https://decksalone.com/api/rankings/weekly" \\
  -H "X-Deck-API-Key: ds_live_your_api_key_here"`,
      javascript: `const res = await fetch('https://decksalone.com/api/rankings/weekly', {
  headers: { 'X-Deck-API-Key': 'ds_live_your_api_key_here' }
});
const leaderboard = await res.json();`,
      python: `import requests
res = requests.get(
    "https://decksalone.com/api/rankings/weekly",
    headers={"X-Deck-API-Key": "ds_live_your_api_key_here"}
)
rankings = res.json()`,
      php: `<?php
$rankings = json_decode(file_get_contents("https://decksalone.com/api/rankings/weekly"), true);
?>`,
    },
    response: `{
  "success": true,
  "period": "2026-W34",
  "rankings": [
    {
      "rank": 1,
      "previousRank": 2,
      "points": 9850,
      "stageName": "DJ Fred Max",
      "avatar": "https://decksalone.com/avatars/dj1.jpg",
      "verified": true,
      "weeklyPlays": 42100
    },
    {
      "rank": 2,
      "previousRank": 1,
      "points": 9420,
      "stageName": "DJ Leo Salone",
      "avatar": "https://decksalone.com/avatars/dj2.jpg",
      "verified": true,
      "weeklyPlays": 38900
    }
  ]
}`,
  },
  eventsList: {
    name: 'Get Upcoming Club & Festival Events',
    method: 'GET',
    path: '/api/events?status=UPCOMING&limit=5',
    description: 'Query verified upcoming events, festival dates, venue addresses, and ticket links in Sierra Leone.',
    snippets: {
      curl: `curl -X GET "https://decksalone.com/api/events?status=UPCOMING&limit=5" \\
  -H "X-Deck-API-Key: ds_live_your_api_key_here"`,
      javascript: `const res = await fetch('https://decksalone.com/api/events?status=UPCOMING&limit=5', {
  headers: { 'X-Deck-API-Key': 'ds_live_your_api_key_here' }
});
const events = await res.json();`,
      python: `import requests
res = requests.get(
    "https://decksalone.com/api/events?status=UPCOMING&limit=5",
    headers={"X-Deck-API-Key": "ds_live_your_api_key_here"}
)
events = res.json()`,
      php: `<?php
$events = json_decode(file_get_contents("https://decksalone.com/api/events?status=UPCOMING&limit=5"), true);
?>`,
    },
    response: `{
  "success": true,
  "events": [
    {
      "id": "evt_lumley_beach_fest_2026",
      "title": "Salone All-Star Beach Music Fest 2026",
      "venue": "Lumley Beach Arena, Freetown",
      "eventDate": "2026-09-12T20:00:00Z",
      "priceRange": "SLE 50 - SLE 250",
      "ticketAvailable": true,
      "featuredDjs": ["DJ Fred Max", "DJ Leo Salone"]
    }
  ]
}`,
  },
};

const FAQ_ITEMS = [
  {
    q: 'How long does the API application review process take?',
    a: 'Our developer relations team reviews all applications within 24 to 48 business hours. You will receive an email confirmation with your API keys and quickstart instructions once approved.',
  },
  {
    q: 'Is there a cost to use the Deck Salone Developer API?',
    a: 'Developer API access is free for standard applications, startups, personal projects, and non-commercial integrations up to 250,000 requests/month. For high-volume commercial or enterprise white-label feeds, custom partner tiers are available.',
  },
  {
    q: 'What authentication methods does the API support?',
    a: 'Deck Salone REST APIs use API Key authentication passed via the `X-Deck-API-Key` request header or standard `Authorization: Bearer <API_KEY>` header. All API traffic is strictly encrypted over HTTPS (TLS 1.3).',
  },
  {
    q: 'Can I use the API to build iOS/Android mobile apps or radio automation?',
    a: 'Yes! Our REST API is designed for mobile apps, website widgets, FM / online radio playout software, and festival displays. Please describe your platform in the application form.',
  },
  {
    q: 'Are webhooks supported for real-time updates?',
    a: 'Yes, approved developer accounts can register webhook endpoints to receive instant POST notifications whenever a new mix is published, a DJ goes live, or weekly ranking charts are finalized.',
  },
];

export default function Developers() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointKey>('trendingMixes');
  const [selectedLang, setSelectedLang] = useState<CodeLanguage>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    website: '',
    projectName: '',
    projectType: 'web' as 'web' | 'mobile' | 'radio' | 'analytics' | 'events' | 'research' | 'bot' | 'other',
    expectedVolume: 'under_10k' as 'under_10k' | '10k_100k' | '100k_1m' | 'over_1m',
    useCase: '',
    agreedToTerms: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const handleCopySnippet = () => {
    const code = API_ENDPOINTS[selectedEndpoint].snippets[selectedLang];
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleCopyRef = () => {
    if (submittedRef) {
      navigator.clipboard.writeText(submittedRef);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim()) {
      setErrorMessage('Please enter your full name or organization name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please enter a valid developer contact email.');
      return;
    }
    if (!formData.projectName.trim()) {
      setErrorMessage('Please provide your project or application name.');
      return;
    }
    if (formData.useCase.trim().length < 20) {
      setErrorMessage('Please provide a detailed description of your integration use case (at least 20 characters).');
      return;
    }
    if (!formData.agreedToTerms) {
      setErrorMessage('You must agree to the Developer Terms of Service and API Fair Use Policy.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/developers/apply', formData);
      if (res.data?.success) {
        setSubmittedRef(res.data.referenceId || `DS-DEV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
      } else {
        setErrorMessage(res.data?.error || 'Failed to submit application. Please try again.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'An error occurred while submitting your application.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-black min-h-[100dvh] text-white">
      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section className="relative pt-24 pb-20 sm:pt-32 sm:pb-28 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-hero-overlay opacity-60 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gold/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs font-bold uppercase tracking-widest mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Deck Salone Developer Platform · REST API v1
          </motion.div>

          <motion.h1
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Build Next-Gen Music Apps on{' '}
            <span className="text-gradient-gold">Deck Salone</span>
          </motion.h1>

          <motion.p
            className="mt-6 text-sm sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Integrate Sierra Leone's official DJ roster, trending Afrobeats mixes, real-time weekly charts, audio streams, and event ticketing directly into your mobile apps, websites, and radio stations.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <a
              href="#apply-form"
              className="px-8 py-3.5 bg-gold-gradient text-black font-bold uppercase tracking-wider text-xs sm:text-sm rounded-xl hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-gold/20"
            >
              <Key className="w-4 h-4" />
              Apply for API Access
            </a>
            <a
              href="#api-explorer"
              className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold uppercase tracking-wider text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-2"
            >
              <Code2 className="w-4 h-4 text-gold" />
              Explore API Endpoints
            </a>
          </motion.div>

          {/* Quick Metrics Bar */}
          <motion.div
            className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="p-4 rounded-xl bg-black-elevated border border-white/10 text-center">
              <div className="text-xl sm:text-2xl font-bold font-mono text-gold">&lt; 45ms</div>
              <div className="text-xs text-text-muted mt-1 uppercase tracking-wider">Median Latency</div>
            </div>
            <div className="p-4 rounded-xl bg-black-elevated border border-white/10 text-center">
              <div className="text-xl sm:text-2xl font-bold font-mono text-gold">99.9%</div>
              <div className="text-xs text-text-muted mt-1 uppercase tracking-wider">Uptime SLA</div>
            </div>
            <div className="p-4 rounded-xl bg-black-elevated border border-white/10 text-center">
              <div className="text-xl sm:text-2xl font-bold font-mono text-gold">TLS 1.3</div>
              <div className="text-xs text-text-muted mt-1 uppercase tracking-wider">Encrypted APIs</div>
            </div>
            <div className="p-4 rounded-xl bg-black-elevated border border-white/10 text-center">
              <div className="text-xl sm:text-2xl font-bold font-mono text-gold">JSON & Webhooks</div>
              <div className="text-xs text-text-muted mt-1 uppercase tracking-wider">Modern Protocols</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ API CAPABILITIES ═══════════════ */}
      <section className="py-20 border-b border-white/10 bg-black-surface/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-gold text-xs font-mono uppercase tracking-widest">Platform Capabilities</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white mt-2">
              Everything you need to build music experiences
            </h2>
            <p className="mt-3 text-sm text-text-secondary">
              High-performance endpoints designed with clean JSON schemas, rich pagination, and robust error handling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FadeIn delay={0.05}>
              <div className="p-6 rounded-2xl bg-black-elevated border border-white/10 hover:border-gold/30 transition-colors h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold mb-4">
                  <Music className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-white uppercase tracking-tight">Mixes & Streams API</h3>
                <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed flex-1">
                  Access catalog mixes, genres, BPM, direct streaming URLs, embedded SoundCloud / Audiomack players, waveforms, and track durations.
                </p>
                <div className="mt-4 pt-3 border-t border-white/5 text-xs font-mono text-gold">GET /api/mixes</div>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="p-6 rounded-2xl bg-black-elevated border border-white/10 hover:border-gold/30 transition-colors h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                  <Radio className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-white uppercase tracking-tight">DJ Rosters & Profiles</h3>
                <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed flex-1">
                  Search Sierra Leone's verified DJs, biographies, social links, location availability, booking fees, and fan follow counts.
                </p>
                <div className="mt-4 pt-3 border-t border-white/5 text-xs font-mono text-purple-400">GET /api/djs</div>
              </div>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className="p-6 rounded-2xl bg-black-elevated border border-white/10 hover:border-gold/30 transition-colors h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-white uppercase tracking-tight">Rankings & Charts API</h3>
                <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed flex-1">
                  Real-time weekly and monthly leaderboard statistics, trending score algorithms, play velocity, and community battle results.
                </p>
                <div className="mt-4 pt-3 border-t border-white/5 text-xs font-mono text-emerald-400">GET /api/rankings/weekly</div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="p-6 rounded-2xl bg-black-elevated border border-white/10 hover:border-gold/30 transition-colors h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-white uppercase tracking-tight">Events & Ticketing</h3>
                <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed flex-1">
                  Discover upcoming nightlife events, concerts, festival lineups, venue GPS coordinates, and ticket tier pricing.
                </p>
                <div className="mt-4 pt-3 border-t border-white/5 text-xs font-mono text-blue-400">GET /api/events</div>
              </div>
            </FadeIn>

            <FadeIn delay={0.25}>
              <div className="p-6 rounded-2xl bg-black-elevated border border-white/10 hover:border-gold/30 transition-colors h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-white uppercase tracking-tight">Webhooks & Events</h3>
                <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed flex-1">
                  Subscribe to instant HTTP webhook notifications on mix uploads, chart shifts, booking requests, and verification approvals.
                </p>
                <div className="mt-4 pt-3 border-t border-white/5 text-xs font-mono text-amber-400">POST /webhooks/subscribe</div>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="p-6 rounded-2xl bg-black-elevated border border-white/10 hover:border-gold/30 transition-colors h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-white uppercase tracking-tight">High Availability & Security</h3>
                <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed flex-1">
                  Protected with DDoS mitigation, API rate limits, granular scope permissions, and global CDN edge caching.
                </p>
                <div className="mt-4 pt-3 border-t border-white/5 text-xs font-mono text-red-400">REST · TLS 1.3 · HMAC</div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════════ INTERACTIVE CODE EXPLORER ═══════════════ */}
      <section id="api-explorer" className="py-20 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-gold text-xs font-mono uppercase tracking-widest">Interactive API Explorer</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white mt-2">
              Simple, Powerful REST Endpoints
            </h2>
            <p className="mt-3 text-sm text-text-secondary">
              Select an endpoint and your programming language of choice to view ready-to-use integration code.
            </p>
          </div>

          {/* Endpoint Selector Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {(Object.keys(API_ENDPOINTS) as EndpointKey[]).map((key) => {
              const endpoint = API_ENDPOINTS[key];
              const isSelected = selectedEndpoint === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedEndpoint(key)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-gold text-black shadow-lg shadow-gold/20 font-bold'
                      : 'bg-black-elevated border border-white/10 text-text-secondary hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-gold'
                  }`}>
                    {endpoint.method}
                  </span>
                  {endpoint.name}
                </button>
              );
            })}
          </div>

          {/* Code Viewer Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-black-elevated border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8">
            {/* Left: Request Snippet */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-gold" />
                  <span className="text-xs font-mono font-bold text-white uppercase">Request Sample</span>
                </div>

                {/* Language Switcher */}
                <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-white/10 text-xs font-mono">
                  {(['curl', 'javascript', 'python', 'php'] as CodeLanguage[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLang(lang)}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        selectedLang === lang ? 'bg-gold text-black font-bold' : 'text-text-muted hover:text-white'
                      }`}
                    >
                      {lang === 'javascript' ? 'JS / TS' : lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-text-secondary mb-3">
                {API_ENDPOINTS[selectedEndpoint].description}
              </div>

              <div className="relative flex-1 bg-black/80 rounded-xl border border-white/10 p-4 font-mono text-xs text-gold/90 overflow-x-auto">
                <button
                  onClick={handleCopySnippet}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-[11px]"
                  title="Copy code"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                </button>
                <pre className="whitespace-pre-wrap leading-relaxed">
                  {API_ENDPOINTS[selectedEndpoint].snippets[selectedLang]}
                </pre>
              </div>
            </div>

            {/* Right: Response Preview */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase">JSON Response (200 OK)</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  application/json
                </span>
              </div>

              <div className="flex-1 bg-black/80 rounded-xl border border-white/10 p-4 font-mono text-xs text-emerald-300/90 overflow-x-auto max-h-[360px] overflow-y-auto">
                <pre className="whitespace-pre leading-relaxed">
                  {API_ENDPOINTS[selectedEndpoint].response}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ APPLICATION FORM SECTION ═══════════════ */}
      <section id="apply-form" className="py-20 border-b border-white/10 bg-gradient-to-b from-black via-black-elevated/40 to-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block px-3.5 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs font-bold uppercase tracking-widest mb-3">
              Developer Registration
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              Apply for <span className="text-gradient-gold">API Access</span>
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-text-secondary">
              To protect copyright holders, audio bandwidth, and our DJ community, access is provided through developer application. Submit your details below to obtain your live API key.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-black-elevated border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 blur-3xl rounded-full pointer-events-none" />

            {submittedRef ? (
              /* Success Confirmation */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white tracking-tight">
                  Application Successfully Submitted!
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-text-secondary max-w-lg mx-auto leading-relaxed">
                  Thank you for applying to the Deck Salone Developer Platform. Our engineering & developer relations team has received your request.
                </p>

                <div className="mt-6 p-4 rounded-xl bg-black/60 border border-white/10 max-w-md mx-auto">
                  <div className="text-xs text-text-muted mb-1">Your Application Reference ID:</div>
                  <div className="flex items-center justify-center gap-2 font-mono text-base font-bold text-gold">
                    <span>{submittedRef}</span>
                    <button
                      onClick={handleCopyRef}
                      className="p-1 text-text-muted hover:text-white transition-colors"
                      title="Copy Reference ID"
                    >
                      {copiedRef ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="mt-8 p-4 rounded-xl bg-gold/10 border border-gold/25 max-w-lg mx-auto text-xs text-text-secondary text-left space-y-2">
                  <div className="font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Next Steps & Timeline:
                  </div>
                  <p>1. We review your use case within <strong>24–48 business hours</strong>.</p>
                  <p>2. You will receive an email at <strong>{formData.email}</strong> with your developer credentials and access tokens.</p>
                  <p>3. Need urgent enterprise integration? Reach us directly at <a href="mailto:contact@decksalone.com" className="text-gold underline">contact@decksalone.com</a>.</p>
                </div>

                <button
                  onClick={() => {
                    setSubmittedRef(null);
                    setFormData({
                      name: '',
                      email: '',
                      company: '',
                      website: '',
                      projectName: '',
                      projectType: 'web',
                      expectedVolume: 'under_10k',
                      useCase: '',
                      agreedToTerms: false,
                    });
                  }}
                  className="mt-8 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                >
                  Submit Another Application
                </button>
              </motion.div>
            ) : (
              /* Application Form */
              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">{errorMessage}</div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                      Developer / Applicant Name <span className="text-gold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Samuel Kargbo or Alpha Media Ltd."
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus:border-gold text-white text-xs sm:text-sm placeholder:text-text-muted/50 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                      Developer Email Address <span className="text-gold">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. dev@yourdomain.com"
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus:border-gold text-white text-xs sm:text-sm placeholder:text-text-muted/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                      Company / Organization <span className="text-text-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="e.g. Salone Sound Tech, Studio Freetown"
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus:border-gold text-white text-xs sm:text-sm placeholder:text-text-muted/50 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                      Website or GitHub Repo <span className="text-text-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://github.com/your-username/project"
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus:border-gold text-white text-xs sm:text-sm placeholder:text-text-muted/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                      Project / App Name <span className="text-gold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.projectName}
                      onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                      placeholder="e.g. Freetown Beats iOS App"
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus:border-gold text-white text-xs sm:text-sm placeholder:text-text-muted/50 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                      Project Category <span className="text-gold">*</span>
                    </label>
                    <select
                      value={formData.projectType}
                      onChange={(e: any) => setFormData({ ...formData, projectType: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus:border-gold text-white text-xs sm:text-sm focus:outline-none transition-colors"
                    >
                      <option value="web">Web Application / Portal</option>
                      <option value="mobile">Mobile App (iOS / Android)</option>
                      <option value="radio">Radio Broadcast & Automation Playout</option>
                      <option value="events">Event / Venue Management Platform</option>
                      <option value="analytics">Music Analytics & AI Research</option>
                      <option value="bot">Social Bot / Messaging Extension</option>
                      <option value="other">Other / Custom Tool</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                    Expected Monthly Request Volume <span className="text-gold">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'under_10k', label: '< 10K req/mo', desc: 'Hobby & Prototype' },
                      { id: '10k_100k', label: '10K – 100K', desc: 'Early Stage App' },
                      { id: '100k_1m', label: '100K – 1M', desc: 'Production Scale' },
                      { id: 'over_1m', label: '1M+ req/mo', desc: 'Enterprise / Partner' },
                    ].map((tier) => (
                      <button
                        type="button"
                        key={tier.id}
                        onClick={() => setFormData({ ...formData, expectedVolume: tier.id as any })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          formData.expectedVolume === tier.id
                            ? 'border-gold bg-gold/15 text-white'
                            : 'border-white/10 bg-black/40 text-text-secondary hover:border-white/20'
                        }`}
                      >
                        <div className="text-xs font-bold font-mono text-gold">{tier.label}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">{tier.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                    Describe Your Use Case & Integration Plan <span className="text-gold">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.useCase}
                    onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                    placeholder="Tell us what you are building, which endpoints you plan to query (e.g. mixes, DJ rankings, events), how end-users will interact with the data, and any specific requirements..."
                    className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus:border-gold text-white text-xs sm:text-sm placeholder:text-text-muted/50 focus:outline-none transition-colors leading-relaxed"
                  />
                  <div className="text-right text-[11px] text-text-muted mt-1 font-mono">
                    {formData.useCase.length}/2000 characters (min 20)
                  </div>
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.agreedToTerms}
                      onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded border-white/20 bg-black text-gold focus:ring-gold accent-gold"
                    />
                    <span className="text-xs text-text-secondary leading-relaxed">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-gold underline">
                        Terms of Use
                      </a>{' '}
                      and Developer API Fair Usage Policy. I agree not to redistribute raw copyrighted audio without authorization, scrape platform data, or bypass rate limits.
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gold-gradient text-black font-bold uppercase tracking-wider text-xs sm:text-sm rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit API Access Application
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-text-muted mt-3">
                    🔒 Applications are reviewed securely by Deck Salone Ltd. Freetown, Sierra Leone.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════ DEVELOPER FAQ ═══════════════ */}
      <section className="py-20 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-gold text-xs font-mono uppercase tracking-widest">Questions & Answers</span>
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-white mt-2">
              Developer FAQs
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-black-elevated border border-white/10 overflow-hidden transition-colors hover:border-white/20"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4"
                  >
                    <span className="font-display text-sm sm:text-base font-semibold text-white">
                      {item.q}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-gold shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                    )}
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-5 pb-5 text-xs sm:text-sm text-text-secondary leading-relaxed border-t border-white/5 pt-3"
                      >
                        {item.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Direct Support Card */}
          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-gold/10 via-black-elevated to-gold/5 border border-gold/30 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-display text-lg font-bold text-white uppercase tracking-tight">
                Need Dedicated Enterprise or Custom Feeds?
              </h3>
              <p className="mt-1 text-xs text-text-secondary">
                Contact our developer engineering desk for custom data pipelines, high-volume quotas, or partnership embeds.
              </p>
            </div>
            <a
              href="mailto:contact@decksalone.com?subject=Deck%20Salone%20Developer%20API%20Inquiry"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shrink-0 flex items-center gap-2"
            >
              Contact Developer Desk
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
