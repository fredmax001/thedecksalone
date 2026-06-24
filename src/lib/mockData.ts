/**
 * Mock data for DJ Profile and Booking pages
 * These are used as placeholder data before API integration
 */

// ─── Mock DJ Profile ───
export const mockDJProfile = {
  id: "fred-max",
  stageName: "Fred Max",
  realName: "Fred Max",
  location: "Freetown, Sierra Leone",
  genres: ["Afrobeats", "Dancehall", "Hip Hop", "Salone Mix", "Amapiano"],
  badges: [
    { label: "TOP RANKED #1", color: "gold" as const },
    { label: "TRENDING", color: "orange" as const },
    { label: "VETERAN", color: "purple" as const },
  ],
  avatar: "/placeholder.jpg",
  coverImage: "/placeholder.jpg",
  isVerified: true,
  activeSince: 2015,

  // Quick Stats
  rank: "#1",
  rankingScore: 94.2,
  followers: "24.5K",
  followersRaw: 24500,
  mixCount: 89,
  rating: 4.9,
  ratingCount: 128,
  events: 34,
  yearsActive: 10,

  // Bio
  bio: [
    "Fred Max is one of Sierra Leone's most sought-after DJs, known for blending Afrobeats and Dancehall into electrifying sets that keep crowds moving all night. With over 10 years in the industry, he has performed at major venues across Freetown, Bo, and internationally.",
    "Starting from small neighborhood parties in Freetown, Fred Max built his reputation through consistency, crowd reading, and an unmatched selection of tracks. His monthly mix series 'Fred Max Sessions' has garnered over 2 million streams across platforms.",
    "He has opened for international acts including Wizkid, Burna Boy, and Davido. His equipment setup includes Pioneer CDJ-3000s and DJM-900NXS2 mixer.",
  ],

  // Equipment
  equipment: [
    "Pioneer CDJ-3000",
    "DJM-900NXS2 Mixer",
    "Pioneer DDJ-1000",
    "Sennheiser HD 25 Headphones",
    "JBL PRX Speakers",
  ],

  // Languages
  languages: ["English", "Krio", "Mende"],

  // Awards
  awards: [
    "Best DJ Freetown 2023",
    "Salone Music Awards 2022",
    "Eastern Region Champion 2021",
  ],

  // Social Links
  socialLinks: {
    instagram: "https://instagram.com/fredmax",
    twitter: "https://twitter.com/fredmax",
    facebook: "https://facebook.com/fredmax",
    tiktok: "https://tiktok.com/@fredmax",
  },

  // Contact
  email: "bookings@fredmax.sl",
  website: "https://fredmax.com",
  phone: "+232 76 123 456",

  // Booking
  booking: {
    feeRange: "SLE 5,000 – SLE 15,000",
    feeMin: 5000,
    feeMax: 15000,
    isAvailable: true,
    responseTime: "Usually responds within 24 hours",
    whatsapp: "+232 76 123 456",
  },

  // Streaming platforms
  streaming: {
    youtube: { followers: "45.2K", label: "subscribers" },
    audiomack: { followers: "28.1K", label: "followers" },
    mixcloud: { followers: "12.4K", label: "followers" },
    soundcloud: { followers: "8.7K", label: "followers" },
    spotify: { followers: "6.2K", label: "monthly listeners" },
    appleMusic: { followers: "3.1K", label: "followers" },
  },

  // Mixes
  mixes: [
    {
      id: 1,
      title: "Fred Max Sessions Vol. 45 — Afrobeats Heat",
      genre: "Afrobeats",
      date: "2 weeks ago",
      plays: "45.2K",
      duration: "1:24:36",
      cover: "/placeholder.jpg",
    },
    {
      id: 2,
      title: "Dancehall Kings Mix 2025",
      genre: "Dancehall",
      date: "1 month ago",
      plays: "32.1K",
      duration: "58:22",
      cover: "/placeholder.jpg",
    },
    {
      id: 3,
      title: "Salone Independence Special",
      genre: "Salone Mix",
      date: "2 months ago",
      plays: "28.7K",
      duration: "2:15:00",
      cover: "/placeholder.jpg",
    },
    {
      id: 4,
      title: "Amapiano to the World",
      genre: "Amapiano",
      date: "3 months ago",
      plays: "19.4K",
      duration: "1:45:30",
      cover: "/placeholder.jpg",
    },
    {
      id: 5,
      title: "Throwback Thursday — 90s & 2000s",
      genre: "Throwback",
      date: "4 months ago",
      plays: "15.8K",
      duration: "1:32:15",
      cover: "/placeholder.jpg",
    },
    {
      id: 6,
      title: "Club Night Live Set",
      genre: "Club Mix",
      date: "5 months ago",
      plays: "12.3K",
      duration: "2:00:00",
      cover: "/placeholder.jpg",
    },
  ],

  // Score breakdown
  scoreBreakdown: {
    digital: 72.1,
    digitalMax: 75,
    industry: 18.5,
    industryMax: 20,
    community: 3.6,
    communityMax: 5,
    total: 94.2,
  },

  // Key metrics
  keyMetrics: {
    monthlyStreams: "2.4M",
    profileVisits: "18.5K",
    bookingRequests: 12,
    conversionRate: "68%",
  },

  // Monthly streams data (for chart)
  monthlyStreamsData: [
    { month: "Oct", streams: 1800000 },
    { month: "Nov", streams: 2100000 },
    { month: "Dec", streams: 1950000 },
    { month: "Jan", streams: 2400000 },
    { month: "Feb", streams: 2800000 },
    { month: "Mar", streams: 3200000 },
  ],

  // Audience locations
  audienceLocations: [
    { name: "Freetown", value: 45 },
    { name: "Bo", value: 20 },
    { name: "Kenema", value: 15 },
    { name: "Makeni", value: 10 },
    { name: "International", value: 10 },
  ],

  // Ranking history (last 12 weeks)
  rankingHistory: [3, 2, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1],

  // Reviews
  reviews: [
    {
      id: 1,
      name: "Sarah M.",
      avatar: "",
      rating: 5,
      comment:
        "Absolutely incredible set! Fred Max read the crowd perfectly and kept everyone dancing until 3am. Highly recommend for any event.",
      eventType: "Wedding Reception",
      date: "2 weeks ago",
      helpful: 12,
    },
    {
      id: 2,
      name: "Mike T.",
      avatar: "",
      rating: 5,
      comment:
        "Professional from start to finish. Great communication, arrived early, and the music was fire. Our club night was packed!",
      eventType: "Club Night",
      date: "1 month ago",
      helpful: 8,
    },
    {
      id: 3,
      name: "Aminata K.",
      avatar: "",
      rating: 4,
      comment:
        "Great mixing skills and song selection. Would have loved more Salone classics but overall a great experience.",
      eventType: "Private Party",
      date: "2 months ago",
      helpful: 5,
    },
    {
      id: 4,
      name: "David S.",
      avatar: "",
      rating: 5,
      comment:
        "Best DJ in Freetown, hands down. He understood exactly what we wanted for our corporate gala and delivered beyond expectations.",
      eventType: "Corporate Event",
      date: "3 months ago",
      helpful: 15,
    },
    {
      id: 5,
      name: "Fatima J.",
      avatar: "",
      rating: 5,
      comment:
        "Booked Fred Max for my sister's birthday party and he was phenomenal. The energy was unmatched all night!",
      eventType: "Private Party",
      date: "4 months ago",
      helpful: 7,
    },
  ],

  // Rating distribution
  ratingDistribution: {
    5: 98,
    4: 18,
    3: 4,
    2: 0,
    1: 1,
  },

  // Events
  upcomingEvents: [
    {
      id: 1,
      name: "Freetown Vibes Festival",
      venue: "National Stadium",
      day: "15",
      month: "MAR",
      time: "8:00 PM",
      status: "Confirmed" as const,
    },
    {
      id: 2,
      name: "Club Night XL",
      venue: "Paddy's Club, Bo",
      day: "22",
      month: "MAR",
      time: "10:00 PM",
      status: "Confirmed" as const,
    },
    {
      id: 3,
      name: "Corporate Launch Party",
      venue: "Radisson Blu",
      day: "05",
      month: "APR",
      time: "7:00 PM",
      status: "Pending" as const,
    },
  ],

  pastEvents: [
    {
      id: 4,
      name: "New Year's Eve Countdown",
      venue: "Balmaya Compound",
      day: "31",
      month: "DEC",
      time: "9:00 PM",
      status: "Completed" as const,
      attendance: 2500,
    },
    {
      id: 5,
      name: "East End Block Party",
      venue: "Kissy Road",
      day: "15",
      month: "DEC",
      time: "6:00 PM",
      status: "Completed" as const,
      attendance: 800,
    },
  ],
};

// ─── Mock Similar DJs ───
export const similarDJs = [
  {
    id: "dj-spinall",
    name: "Rampage",
    genres: ["Amapiano", "Hip Hop"],
    location: "Freetown",
    rank: "#2",
    avatar: "/placeholder.jpg",
    followers: "18.2K",
    mixes: 64,
    rating: 4.8,
  },
  {
    id: "dj-mercenary",
    name: "Cess",
    genres: ["Dancehall", "Reggae"],
    location: "Freetown",
    rank: "#5",
    avatar: "/placeholder.jpg",
    followers: "12.1K",
    mixes: 45,
    rating: 4.6,
  },
  {
    id: "dj-lex",
    name: "Dito Freaky",
    genres: ["Hip Hop", "Afrobeats"],
    location: "Freetown",
    rank: "#6",
    avatar: "/placeholder.jpg",
    followers: "9.8K",
    mixes: 38,
    rating: 4.7,
  },
  {
    id: "dj-blaze",
    name: "Busy",
    genres: ["Amapiano", "Club"],
    location: "Bo",
    rank: "#9",
    avatar: "/placeholder.jpg",
    followers: "7.5K",
    mixes: 29,
    rating: 4.5,
  },
];

// ─── Mock Booking DJ Search Results ───
export const bookingDJs = [
  {
    id: "fred-max",
    name: "Fred Max",
    genres: ["Afrobeats", "Dancehall"],
    location: "Freetown",
    priceMin: 5000,
    priceMax: 15000,
    rating: 4.9,
    reviews: 128,
    experience: 10,
    avatar: "/placeholder.jpg",
    verified: true,
    available: true,
    responseTime: "2 hours",
  },
  {
    id: "dj-spinall",
    name: "Rampage",
    genres: ["Amapiano", "Hip Hop"],
    location: "Freetown",
    priceMin: 8000,
    priceMax: 20000,
    rating: 4.8,
    reviews: 96,
    experience: 8,
    avatar: "/placeholder.jpg",
    verified: true,
    available: true,
    responseTime: "4 hours",
  },
  {
    id: "queen-v",
    name: "Kaywize Salone",
    genres: ["Afrobeats", "R&B"],
    location: "Bo",
    priceMin: 3000,
    priceMax: 10000,
    rating: 4.9,
    reviews: 72,
    experience: 6,
    avatar: "/placeholder.jpg",
    verified: true,
    available: true,
    responseTime: "6 hours",
  },
  {
    id: "dj-coalition",
    name: "Bow",
    genres: ["Salone Mix", "Throwback"],
    location: "Kenema",
    priceMin: 2500,
    priceMax: 8000,
    rating: 4.7,
    reviews: 54,
    experience: 12,
    avatar: "/placeholder.jpg",
    verified: true,
    available: true,
    responseTime: "12 hours",
  },
  {
    id: "dj-mercenary",
    name: "Cess",
    genres: ["Dancehall", "Reggae"],
    location: "Freetown",
    priceMin: 4000,
    priceMax: 12000,
    rating: 4.6,
    reviews: 89,
    experience: 9,
    avatar: "/placeholder.jpg",
    verified: true,
    available: true,
    responseTime: "3 hours",
  },
  {
    id: "dj-lex",
    name: "Dito Freaky",
    genres: ["Hip Hop", "Afrobeats"],
    location: "Freetown",
    priceMin: 6000,
    priceMax: 18000,
    rating: 4.5,
    reviews: 67,
    experience: 7,
    avatar: "/placeholder.jpg",
    verified: true,
    available: true,
    responseTime: "8 hours",
  },
];

// ─── Event Types for Booking ───
export const eventTypes = [
  "Wedding",
  "Club Night",
  "Corporate Event",
  "Private Party",
  "Festival",
  "Birthday",
  "Gospel Event",
  "Outdoor Party",
];

// ─── Genre Options ───
export const genreOptions = [
  "Afrobeats",
  "Amapiano",
  "Dancehall",
  "Hip Hop",
  "Gospel",
  "Salone Mix",
  "Club Mix",
  "Throwback",
  "Reggae",
  "R&B",
];

// ─── Location Options ───
export const locationOptions = [
  "Freetown",
  "Bo",
  "Kenema",
  "Makeni",
  "Koidu",
  "Port Loko",
];

// ─── Pricing Guide Data ───
export const pricingGuide = [
  {
    eventType: "Wedding",
    icon: "ring",
    priceRange: "SLE 5,000 – 25,000",
    includes: [
      "4-6 hour set",
      "Consultation",
      "Ceremony + reception music",
      "MC services",
    ],
  },
  {
    eventType: "Club Night",
    icon: "disc",
    priceRange: "SLE 3,000 – 15,000",
    includes: [
      "3-5 hour set",
      "Club sound system",
      "Mix integration",
      "Crowd reading",
    ],
  },
  {
    eventType: "Corporate",
    icon: "briefcase",
    priceRange: "SLE 8,000 – 30,000",
    includes: [
      "Background music",
      "MC services",
      "Professional setup",
      "Branded presentation",
    ],
  },
  {
    eventType: "Festival",
    icon: "mic",
    priceRange: "SLE 15,000 – 100,000+",
    includes: [
      "1-2 hour set",
      "Festival-grade equipment",
      "Travel included",
      "Sound check",
    ],
  },
];

// ─── Trust Points ───
export const trustPoints = [
  {
    title: "Verified DJs Only",
    icon: "shield-check",
    description:
      "Every DJ on our platform is identity-verified. No fake profiles, no surprises.",
  },
  {
    title: "Secure Payments",
    icon: "lock",
    description:
      "Your deposit is held securely. Released to the DJ only after your event is confirmed complete.",
  },
  {
    title: "Transparent Pricing",
    icon: "tag",
    description:
      "See exact pricing upfront. No hidden fees, no last-minute price changes.",
  },
  {
    title: "Dispute Protection",
    icon: "message-circle-warning",
    description:
      "If something goes wrong, our support team mediates and ensures fair resolution.",
  },
];

// ─── FAQ Data ───
export const faqData = [
  {
    question: "How do I book a DJ through Sound It?",
    answer:
      "Search for DJs using our filters, select the one that fits your needs, and click 'Request Booking'. Fill out your event details and submit. The DJ will respond within 24 hours.",
  },
  {
    question: "What payment methods are accepted?",
    answer:
      "We accept Orange Money, AfriMoney, credit/debit cards, and bank transfers. A 50% deposit is required to secure your booking.",
  },
  {
    question: "Can I cancel or reschedule my booking?",
    answer:
      "Yes, cancellations made 14 days before the event receive a full deposit refund. Rescheduling is free up to 7 days before the event.",
  },
  {
    question: "What happens if the DJ cancels?",
    answer:
      "If a DJ cancels, we'll help you find a suitable replacement DJ at the same rate, or provide a full refund including your deposit.",
  },
  {
    question: "Do DJs bring their own equipment?",
    answer:
      "Most DJs bring their own equipment, which is included in their fee. For large events requiring additional sound/lighting, equipment rental can be arranged.",
  },
];
