require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const djData = [
  {
    email: 'fredmax@soundit.sl',
    password: 'password123',
    stageName: 'Fred Max',
    fullName: 'Abdul Conteh',
    city: 'Freetown',
    bio: "One of Sierra Leone's most celebrated DJs, known for electrifying club sets and seamless transitions between Afrobeats and Dancehall.",
    yearsActive: 12,
    genres: ['Afrobeats', 'Dancehall', 'Hip Hop'],
    awards: ['Best Club DJ 2023', 'DJ of the Year 2022'],
    equipment: ['Pioneer CDJ-3000', 'DJM-900NXS2', 'RANE Twelve'],
    languages: ['English', 'Krio'],
    bookingFeeMin: 3000,
    bookingFeeMax: 8000,
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&h=400&fit=crop',
    coverBanner: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=1200&h=400&fit=crop',
    verified: true,
    badges: ['Verified DJ', 'Top Ranked', 'Veteran'],
    streaming: [
      { platform: 'YouTube', url: 'https://youtube.com/fredmax' },
      { platform: 'Audiomack', url: 'https://audiomack.com/fredmax' },
      { platform: 'Mixcloud', url: 'https://mixcloud.com/fredmax' },
    ],
  },
  {
    email: 'rampage@soundit.sl',
    password: 'password123',
    stageName: 'Rampage',
    fullName: 'Fred Max',
    city: 'Freetown',
    bio: 'The crowd controller. Rampage has been setting dance floors on fire with his unique blend of Salone music and international hits.',
    yearsActive: 8,
    genres: ['Salone Mix', 'Afrobeats', 'Amapiano'],
    awards: ['Best Event DJ 2023'],
    equipment: ['Pioneer DDJ-1000', 'Serato DJ Pro'],
    languages: ['English', 'Krio'],
    bookingFeeMin: 2000,
    bookingFeeMax: 5000,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    coverBanner: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=400&fit=crop',
    verified: true,
    badges: ['Verified DJ', 'Trending'],
    streaming: [
      { platform: 'YouTube', url: 'https://youtube.com/rampage' },
      { platform: 'Audiomack', url: 'https://audiomack.com/rampage' },
      { platform: 'SoundCloud', url: 'https://soundcloud.com/rampage' },
    ],
  },
  {
    email: 'cess@soundit.sl',
    password: 'password123',
    stageName: 'Cess',
    fullName: 'Lamin Kamara',
    city: 'Freetown',
    bio: 'Specializing in Ghanaian Azonto and Alkayida dance styles, bringing West African flavor to every set.',
    yearsActive: 6,
    genres: ['Azonto', 'Afrobeats', 'Dancehall', 'Hip Life'],
    awards: ['Rising Star DJ 2023'],
    equipment: ['Pioneer XDJ-XZ', 'Rekordbox'],
    languages: ['English', 'Krio', 'Twi'],
    bookingFeeMin: 1500,
    bookingFeeMax: 4000,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    coverBanner: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop',
    verified: true,
    badges: ['Verified DJ', 'Fastest Rising'],
    streaming: [
      { platform: 'YouTube', url: 'https://youtube.com/cess' },
      { platform: 'Audiomack', url: 'https://audiomack.com/cess' },
      { platform: 'Mixcloud', url: 'https://mixcloud.com/cess' },
    ],
  },
  {
    email: 'ditofreaky@soundit.sl',
    password: 'password123',
    stageName: 'Dito Freaky',
    fullName: 'Mohamed Conteh',
    city: 'Freetown',
    bio: 'The smooth operator. Known for soulful R&B mixes and romantic wedding sets that create unforgettable moments.',
    yearsActive: 10,
    genres: ['R&B', 'Salone Mix', 'Wedding Mixes'],
    awards: ['Best Wedding DJ 2023', 'Most Requested DJ 2022'],
    equipment: ['Pioneer DJM-V10', 'CDJ-2000NXS2'],
    languages: ['English', 'Krio'],
    bookingFeeMin: 2500,
    bookingFeeMax: 6000,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    coverBanner: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&h=400&fit=crop',
    verified: true,
    badges: ['Verified DJ', 'Veteran'],
    streaming: [
      { platform: 'YouTube', url: 'https://youtube.com/ditofreaky' },
      { platform: 'Audiomack', url: 'https://audiomack.com/ditofreaky' },
      { platform: 'SoundCloud', url: 'https://soundcloud.com/ditofreaky' },
    ],
  },
  {
    email: 'busy@soundit.sl',
    password: 'password123',
    stageName: 'Busy',
    fullName: 'Abdul Turay',
    city: 'Freetown',
    bio: 'The party starter. Busy brings high-energy sets that keep the crowd moving all night long.',
    yearsActive: 5,
    genres: ['Club Mixes', 'Dancehall', 'Hip Hop', 'Afrobeats'],
    awards: ['Best New DJ 2022'],
    equipment: ['Pioneer DDJ-FLX10'],
    languages: ['English', 'Krio'],
    bookingFeeMin: 1200,
    bookingFeeMax: 3500,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
    coverBanner: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=1200&h=400&fit=crop',
    verified: true,
    badges: ['Verified DJ'],
    streaming: [
      { platform: 'YouTube', url: 'https://youtube.com/busy' },
      { platform: 'Audiomack', url: 'https://audiomack.com/busy' },
      { platform: 'Mixcloud', url: 'https://mixcloud.com/busy' },
    ],
  },
  {
    email: 'kaywizesalone@soundit.sl',
    password: 'password123',
    stageName: 'Kaywize Salone',
    fullName: 'Ibrahim Bangura',
    city: 'Freetown',
    bio: 'The sound system specialist. Known for the deepest bass and the hardest dancehall selections in Sierra Leone.',
    yearsActive: 15,
    genres: ['Dancehall', 'Reggae', 'Dub'],
    awards: ['Best Sound System 2023', 'Legendary DJ Award 2021'],
    equipment: ['Pioneer CDJ-3000', 'DJM-V10', 'Custom Sound System'],
    languages: ['English', 'Krio'],
    bookingFeeMin: 4000,
    bookingFeeMax: 10000,
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop',
    coverBanner: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&h=400&fit=crop',
    verified: true,
    badges: ['Verified DJ', 'Veteran'],
    streaming: [
      { platform: 'YouTube', url: 'https://youtube.com/kaywizesalone' },
      { platform: 'Audiomack', url: 'https://audiomack.com/kaywizesalone' },
      { platform: 'Mixcloud', url: 'https://mixcloud.com/kaywizesalone' },
    ],
  },
  {
    email: 'djmaggie@soundit.sl',
    password: 'password123',
    stageName: 'DJ Maggie',
    fullName: 'DJ Maggie',
    city: 'Bo',
    bio: 'The leading female DJ in Sierra Leone, breaking barriers with versatile sets spanning multiple genres.',
    yearsActive: 7,
    genres: ['Afrobeats', 'Amapiano', 'R&B', 'Salone Mix'],
    awards: ['Best Female DJ 2023', 'DJ of the Year Bo 2022'],
    equipment: ['Pioneer DDJ-1000', 'Serato DJ Pro'],
    languages: ['English', 'Krio'],
    bookingFeeMin: 2000,
    bookingFeeMax: 4500,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    coverBanner: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=400&fit=crop',
    verified: true,
    badges: ['Verified DJ', 'Trending'],
    streaming: [
      { platform: 'YouTube', url: 'https://youtube.com/djmaggie' },
      { platform: 'Audiomack', url: 'https://audiomack.com/djmaggie' },
      { platform: 'SoundCloud', url: 'https://soundcloud.com/djmaggie' },
    ],
  },
  {
    email: 'switch@soundit.sl',
    password: 'password123',
    stageName: 'Switch',
    fullName: 'Kelvin Doe',
    city: 'Kenema',
    bio: 'The Eastern Province champion. Switch reps Kenema with pride and brings the best mix of local and international hits.',
    yearsActive: 4,
    genres: ['Salone Mix', 'Afrobeats', 'Dancehall'],
    awards: ['Best DJ Kenema 2023'],
    equipment: ['Pioneer XDJ-RX3'],
    languages: ['English', 'Krio', 'Mende'],
    bookingFeeMin: 1000,
    bookingFeeMax: 3000,
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400&h=400&fit=crop',
    coverBanner: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=1200&h=400&fit=crop',
    verified: true,
    badges: ['Verified DJ'],
    streaming: [
      { platform: 'YouTube', url: 'https://youtube.com/switch' },
      { platform: 'Audiomack', url: 'https://audiomack.com/switch' },
      { platform: 'Mixcloud', url: 'https://mixcloud.com/switch' },
    ],
  },
  {
    email: 'bow@soundit.sl',
    password: 'password123',
    stageName: 'Bow',
    fullName: 'Alie Hassan Nasralla',
    city: 'Makeni',
    bio: 'The Northern star. Bow has been keeping Makeni dancing with his signature blend of traditional and modern sounds.',
    yearsActive: 9,
    genres: ['Salone Mix', 'Gospel', 'Afrobeats'],
    awards: ['Best DJ North 2022'],
    equipment: ['Pioneer DDJ-800'],
    languages: ['English', 'Krio', 'Temne'],
    bookingFeeMin: 1500,
    bookingFeeMax: 3500,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    coverBanner: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=400&fit=crop',
    verified: true,
    badges: ['Verified DJ', 'Veteran'],
    streaming: [
      { platform: 'YouTube', url: 'https://youtube.com/bow' },
      { platform: 'Audiomack', url: 'https://audiomack.com/bow' },
      { platform: 'SoundCloud', url: 'https://soundcloud.com/bow' },
    ],
  },
  {
    email: 'min1@soundit.sl',
    password: 'password123',
    stageName: 'Min-1',
    fullName: 'Mamaja Jalloh',
    city: 'Bo',
    bio: 'The Amapiano ambassador of Sierra Leone. Min-1 introduced the South African sound to the Southern Province.',
    yearsActive: 3,
    genres: ['Amapiano', 'Afrobeats', 'Deep House'],
    awards: ['Best Amapiano DJ 2023'],
    equipment: ['Pioneer DDJ-FLX6'],
    languages: ['English', 'Krio'],
    bookingFeeMin: 800,
    bookingFeeMax: 2500,
    avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop',
    coverBanner: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=400&fit=crop',
    verified: true,
    badges: ['Verified DJ', 'Fastest Rising'],
    streaming: [
      { platform: 'YouTube', url: 'https://youtube.com/min1' },
      { platform: 'Audiomack', url: 'https://audiomack.com/min1' },
      { platform: 'Mixcloud', url: 'https://mixcloud.com/min1' },
    ],
  },
  {
    email: 'flex@soundit.sl',
    password: 'password123',
    stageName: 'Flex',
    fullName: 'Wilmot Faulkner',
    city: 'Freetown',
    bio: 'The versatile maestro. From corporate events to beach parties, Flex adapts to any crowd and any vibe.',
    yearsActive: 7,
    genres: ['Club Mixes', 'Afrobeats', 'Hip Hop', 'Throwbacks'],
    awards: ['Most Versatile DJ 2023'],
    equipment: ['Pioneer CDJ-2000NXS2', 'DJM-900NXS2'],
    languages: ['English', 'Krio'],
    bookingFeeMin: 1800,
    bookingFeeMax: 4500,
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd9c?w=400&h=400&fit=crop',
    coverBanner: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&h=400&fit=crop',
    verified: true,
    badges: ['Verified DJ'],
    streaming: [
      { platform: 'YouTube', url: 'https://youtube.com/flex' },
      { platform: 'Audiomack', url: 'https://audiomack.com/flex' },
      { platform: 'SoundCloud', url: 'https://soundcloud.com/flex' },
    ],
  },
];

const mixData = [
  { title: 'Salone Vibes Vol. 1', category: 'Salone Mix', genre: 'Salone Mix', tags: ['sierra leone', 'bubu', 'gumbe'] },
  { title: 'Afrobeats Heatwave 2024', category: 'Afrobeats', genre: 'Afrobeats', tags: ['naija', 'burna boy', 'wizkid'] },
  { title: 'Dancehall Kings Mix', category: 'Dancehall', genre: 'Dancehall', tags: ['jamaica', 'vybz kartel', 'alkaline'] },
  { title: 'Club Night Anthems', category: 'Club Mixes', genre: 'Club Mixes', tags: ['party', 'club', 'anthems'] },
  { title: 'Amapiano to the World', category: 'Amapiano', genre: 'Amapiano', tags: ['south africa', 'kabza de small', 'dj maphorsa'] },
  { title: 'Salone Fiesta Mix', category: 'Salone Mix', genre: 'Salone Mix', tags: ['freetown', 'sierra leone', 'party'] },
  { title: 'Afrobeats Non-Stop', category: 'Afrobeats', genre: 'Afrobeats', tags: ['davido', 'tiwa savage', 'afro'] },
  { title: 'Weekend Turn Up', category: 'Club Mixes', genre: 'Club Mixes', tags: ['weekend', 'party', 'turn up'] },
  { title: 'Azonto Revival', category: 'Afrobeats', genre: 'Afrobeats', tags: ['ghana', 'azonto', 'fuse odg'] },
  { title: 'Alkayida Dance Special', category: 'Afrobeats', genre: 'Afrobeats', tags: ['alkayida', 'dance', 'ghana'] },
  { title: 'West African Connection', category: 'Afrobeats', genre: 'Afrobeats', tags: ['west africa', 'fusion', 'vibes'] },
  { title: 'Slow Jams & R&B Classics', category: 'Throwbacks', genre: 'R&B', tags: ['r&b', 'slow jams', 'love'] },
  { title: 'Wedding Bliss Mix', category: 'Wedding Mixes', genre: 'Wedding Mixes', tags: ['wedding', 'love', 'first dance'] },
  { title: 'Salone Love Songs', category: 'Salone Mix', genre: 'Salone Mix', tags: ['sierra leone', 'love', 'emerson'] },
  { title: 'Party Hard Mix Vol. 1', category: 'Club Mixes', genre: 'Club Mixes', tags: ['party', 'club', 'bangers'] },
  { title: 'Hip Hop Takeover', category: 'Club Mixes', genre: 'Hip Hop', tags: ['hip hop', 'rap', 'drake'] },
  { title: 'Dancehall Don', category: 'Dancehall', genre: 'Dancehall', tags: ['dancehall', 'reggae', 'bashment'] },
  { title: 'Reggae Roots Revival', category: 'Dancehall', genre: 'Reggae', tags: ['reggae', 'bob marley', 'roots'] },
  { title: 'Sound System Culture', category: 'Dancehall', genre: 'Dancehall', tags: ['sound system', 'dub', 'culture'] },
  { title: 'Caribbean Connection', category: 'Dancehall', genre: 'Dancehall', tags: ['caribbean', 'island vibes', 'socca'] },
  { title: 'Queen of the Decks', category: 'Club Mixes', genre: 'Club Mixes', tags: ['female dj', 'power', 'queen'] },
  { title: 'Amapiano Queens', category: 'Amapiano', genre: 'Amapiano', tags: ['amapiano', 'female', 'vibes'] },
  { title: 'Ladies Night Special', category: 'Club Mixes', genre: 'R&B', tags: ['ladies', 'r&b', 'beyonce'] },
  { title: 'Eastern Province Vibes', category: 'Salone Mix', genre: 'Salone Mix', tags: ['kenema', 'eastern province', 'local'] },
  { title: 'Mende Traditional Fusion', category: 'Salone Mix', genre: 'Salone Mix', tags: ['mende', 'traditional', 'fusion'] },
  { title: 'Northern Lights Mix', category: 'Salone Mix', genre: 'Salone Mix', tags: ['makeni', 'northern', 'temne'] },
  { title: 'Gospel Praise Mix', category: 'Gospel', genre: 'Gospel', tags: ['gospel', 'praise', 'worship'] },
  { title: 'Sunday Morning Bliss', category: 'Gospel', genre: 'Gospel', tags: ['sunday', 'gospel', 'peace'] },
  { title: 'Amapiano Deep Cuts', category: 'Amapiano', genre: 'Amapiano', tags: ['amapiano', 'deep', 'soulful'] },
  { title: 'Yanos to the World', category: 'Amapiano', genre: 'Amapiano', tags: ['yano', 'south africa', 'global'] },
  { title: 'Throwback Thursday', category: 'Throwbacks', genre: 'Throwbacks', tags: ['throwback', 'old school', 'classics'] },
  { title: 'Corporate Event Set', category: 'Wedding Mixes', genre: 'Wedding Mixes', tags: ['corporate', 'professional', 'smooth'] },
];

const eventData = [
  {
    title: 'Freetown Music Festival 2024',
    description: 'The biggest music festival in Sierra Leone featuring top DJs and live performances.',
    type: 'festival',
    date: new Date('2024-12-15T18:00:00Z'),
    location: 'Lumley Beach, Freetown',
    city: 'Freetown',
    venue: 'Lumley Beach',
    slots: 8,
    status: 'upcoming',
  },
  {
    title: 'Club Night at The Warehouse',
    description: 'Weekly club night featuring resident DJs and special guests.',
    type: 'club-night',
    date: new Date('2024-11-30T21:00:00Z'),
    location: 'The Warehouse, Freetown',
    city: 'Freetown',
    venue: 'The Warehouse',
    slots: 3,
    status: 'upcoming',
  },
  {
    title: 'Bo City Carnival',
    description: 'Annual carnival celebrating Southern Province culture with music and dance.',
    type: 'festival',
    date: new Date('2024-12-20T14:00:00Z'),
    location: 'Bo Stadium, Bo',
    city: 'Bo',
    venue: 'Bo Stadium',
    slots: 6,
    status: 'upcoming',
  },
  {
    title: 'Wedding Expo 2024',
    description: 'Connect with wedding DJs and plan your perfect celebration.',
    type: 'corporate',
    date: new Date('2024-11-25T10:00:00Z'),
    location: 'Bintumani Hotel, Freetown',
    city: 'Freetown',
    venue: 'Bintumani Hotel',
    isOpenSlot: true,
    slots: 4,
    compensation: 5000,
    status: 'upcoming',
  },
  {
    title: 'Kenema All-Night Party',
    description: 'The biggest party in the Eastern Province. All-night dancing with the best DJs.',
    type: 'private-party',
    date: new Date('2024-12-05T20:00:00Z'),
    location: 'Palm Beach Hotel, Kenema',
    city: 'Kenema',
    venue: 'Palm Beach Hotel',
    slots: 4,
    status: 'upcoming',
  },
];

const reviewData = [
  { userIndex: 0, djIndex: 0, rating: 5, comment: 'Absolutely amazing set at our wedding! Fred Max kept everyone on the dance floor all night.', eventType: 'wedding' },
  { userIndex: 1, djIndex: 0, rating: 5, comment: 'The best DJ in Freetown, hands down. Professional and incredibly talented.', eventType: 'club-night' },
  { userIndex: 2, djIndex: 1, rating: 4, comment: 'Rampage brought amazing energy to our event. The crowd loved every minute.', eventType: 'private-party' },
  { userIndex: 3, djIndex: 1, rating: 5, comment: 'Incredible mixing skills. Seamless transitions and great song selection.', eventType: 'club-night' },
  { userIndex: 4, djIndex: 2, rating: 4, comment: 'Love the Alkayida mixes! Always gets the crowd moving.', eventType: 'festival' },
  { userIndex: 5, djIndex: 3, rating: 5, comment: 'Dito Freaky made our wedding day absolutely perfect. Beautiful music selection.', eventType: 'wedding' },
  { userIndex: 6, djIndex: 4, rating: 4, comment: 'High energy and great crowd interaction. Would book again!', eventType: 'club-night' },
  { userIndex: 7, djIndex: 5, rating: 5, comment: 'Kaywize Salone is a legend. The sound system alone is worth the booking.', eventType: 'festival' },
  { userIndex: 8, djIndex: 6, rating: 5, comment: 'DJ Maggie is an inspiration for female DJs. Amazing talent!', eventType: 'club-night' },
  { userIndex: 9, djIndex: 7, rating: 4, comment: 'Great selection of local and international hits. Kenema represent!', eventType: 'private-party' },
];

async function seed() {
  console.log('Seeding Deck Salone database...');

  // Clear existing data
  await prisma.payment.deleteMany();
  await prisma.battleVote.deleteMany();
  await prisma.battleEntry.deleteMany();
  await prisma.battle.deleteMany();
  await prisma.rankingHistory.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.event.deleteMany();
  await prisma.mix.deleteMany();
  await prisma.streamingPlatform.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.djProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared existing data');

  // Create regular users for reviews
  const regularUsers = [];
  for (let i = 0; i < 12; i++) {
    const user = await prisma.user.create({
      data: {
        email: `user${i + 1}@example.com`,
        username: `user${i + 1}`,
        password: await bcrypt.hash('password123', 10),
        role: 'USER',
      },
    });
    regularUsers.push(user);
  }
  console.log('Created 12 regular users');

  // Create DJ users and profiles (base data only — no fake aggregates)
  const djProfiles = [];
  for (let i = 0; i < djData.length; i++) {
    const dj = djData[i];

    const user = await prisma.user.create({
      data: {
        email: dj.email,
        username: dj.email.split('@')[0],
        password: await bcrypt.hash(dj.password, 10),
        role: 'DJ',
      },
    });

    const profile = await prisma.djProfile.create({
      data: {
        userId: user.id,
        stageName: dj.stageName,
        fullName: dj.fullName,
        bio: dj.bio,
        avatar: dj.avatar,
        coverBanner: dj.coverBanner,
        yearsActive: dj.yearsActive,
        city: dj.city,
        genres: dj.genres,
        awards: dj.awards,
        equipment: dj.equipment,
        languages: dj.languages,
        bookingFeeMin: dj.bookingFeeMin,
        bookingFeeMax: dj.bookingFeeMax,
        verified: dj.verified,
        badges: dj.badges,
      },
    });

    // Create streaming platforms (URLs only — counts default to 0)
    for (const platform of dj.streaming) {
      await prisma.streamingPlatform.create({
        data: {
          djId: profile.id,
          platform: platform.platform,
          url: platform.url,
        },
      });
    }

    djProfiles.push(profile);
  }

  console.log(`Created ${djProfiles.length} DJ profiles`);

  // Create mixes (distribute among DJs) — no fake play/like/download counts
  let mixIndex = 0;
  for (const mix of mixData) {
    const djIdx = mixIndex % djProfiles.length;
    await prisma.mix.create({
      data: {
        djId: djProfiles[djIdx].id,
        title: mix.title,
        coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
        audioUrl: 'https://example.com/audio.mp3',
        duration: 3600 + Math.floor(Math.random() * 3600),
        genre: mix.genre,
        category: mix.category,
        tags: mix.tags,
        isPublic: true,
      },
    });
    mixIndex++;
  }

  console.log(`Created ${mixData.length} mixes`);

  // Create events
  const createdEvents = [];
  for (const event of eventData) {
    const created = await prisma.event.create({
      data: event,
    });
    createdEvents.push(created);
  }

  // Assign some events to DJs
  for (let i = 0; i < Math.min(3, djProfiles.length); i++) {
    await prisma.event.create({
      data: {
        djId: djProfiles[i].id,
        title: `${djProfiles[i].stageName} Live Set`,
        description: `Exclusive live performance by ${djProfiles[i].stageName}`,
        type: 'club-night',
        date: new Date(Date.now() + (i + 1) * 7 * 86400000),
        location: `${djProfiles[i].city} City Center`,
        city: djProfiles[i].city,
        venue: `${djProfiles[i].stageName} Venue`,
        status: 'upcoming',
      },
    });
  }

  console.log(`Created ${eventData.length + 3} events`);

  // Create reviews
  for (const review of reviewData) {
    await prisma.review.create({
      data: {
        userId: regularUsers[review.userIndex].id,
        djId: djProfiles[review.djIndex].id,
        rating: review.rating,
        comment: review.comment,
        eventType: review.eventType,
        verified: true,
      },
    });
  }

  console.log(`Created ${reviewData.length} reviews`);

  // Create follow relationships so totalFollowers reflects real data
  for (let i = 0; i < regularUsers.length; i++) {
    for (let j = 0; j < djProfiles.length; j++) {
      if ((i + j) % 3 === 0) {
        try {
          await prisma.follow.create({
            data: {
              userId: regularUsers[i].id,
              djId: djProfiles[j].id,
            },
          });
        } catch (e) {
          // Ignore duplicate follow errors
        }
      }
    }
  }
  console.log('Created follow relationships');

  // Compute real aggregates from actual database records and update each DJ profile
  const { recalculateAllRankings } = require('../utils/ranking');

  for (const profile of djProfiles) {
    const totalFollowers = await prisma.follow.count({ where: { djId: profile.id } });
    const totalMixes = await prisma.mix.count({ where: { djId: profile.id } });
    const totalEvents = await prisma.event.count({ where: { djId: profile.id } });
    const totalBookings = await prisma.booking.count({ where: { djId: profile.id } });

    const streamAgg = await prisma.streamingPlatform.aggregate({
      where: { djId: profile.id },
      _sum: { streams: true },
    });
    const totalStreams = streamAgg._sum.streams || 0;

    const reviewAgg = await prisma.review.aggregate({
      where: { djId: profile.id },
      _avg: { rating: true },
    });
    const averageRating = reviewAgg._avg.rating || 0;

    await prisma.djProfile.update({
      where: { id: profile.id },
      data: {
        totalFollowers,
        totalMixes,
        totalEvents,
        totalBookings,
        totalStreams,
        averageRating,
      },
    });
  }

  console.log('Updated DJ profiles with real aggregates');

  // Recalculate real ranking scores and positions from actual data
  await recalculateAllRankings();
  console.log('Recalculated real ranking scores and positions');

  // Create a metric-based battle (after aggregates are real)
  const now = new Date();
  const battle = await prisma.battle.create({
    data: {
      title: 'Weekly DJ Battle - Amapiano Week',
      weekStart: now,
      weekEnd: new Date(now.getTime() + 7 * 86400000),
      status: 'ACTIVE',
      theme: 'Amapiano Week',
      metricType: 'COMPOSITE',
    },
  });

  const { calculateBattleBaseScore } = require('../utils/ranking');
  for (let i = 0; i < 4; i++) {
    const baseScore = await calculateBattleBaseScore(djProfiles[i].id, 'COMPOSITE');

    const entry = await prisma.battleEntry.create({
      data: {
        battleId: battle.id,
        djId: djProfiles[i].id,
        baseScore,
        voteScore: 0,
        finalScore: baseScore,
        votes: 0,
      },
    });

    // Add some votes
    for (let v = 0; v < Math.min(5, regularUsers.length); v++) {
      try {
        await prisma.battleVote.create({
          data: {
            entryId: entry.id,
            userId: regularUsers[v].id,
          },
        });

        await prisma.battleEntry.update({
          where: { id: entry.id },
          data: { votes: { increment: 1 } },
        });
      } catch (e) {
        // Ignore duplicate vote errors
      }
    }
  }

  // Recalculate final scores for battle entries based on votes
  const allEntries = await prisma.battleEntry.findMany({
    where: { battleId: battle.id },
  });
  const totalVotes = allEntries.reduce((sum, e) => sum + e.votes, 0);
  for (const e of allEntries) {
    const voteShare = totalVotes > 0 ? e.votes / totalVotes : 0;
    const voteScore = voteShare * 40;
    const finalScore = e.baseScore * 0.6 + voteScore;
    await prisma.battleEntry.update({
      where: { id: e.id },
      data: { voteScore, finalScore: Math.round(finalScore * 100) / 100 },
    });
  }

  console.log('Created metric-based battle with entries');

  // Create a sample booking
  const sampleBooking = await prisma.booking.create({
    data: {
      clientId: regularUsers[0].id,
      djId: djProfiles[0].id,
      eventType: 'wedding',
      eventDate: new Date('2024-12-20T16:00:00Z'),
      eventLocation: 'Lumley Beach, Freetown',
      duration: 6,
      budget: 8000,
      finalPrice: 7500,
      deposit: 2500,
      status: 'CONFIRMED',
      notes: 'Please arrive by 3 PM for setup.',
      requirements: 'Need wireless microphone for speeches.',
    },
  });

  // Create sample payments for the booking
  await prisma.payment.create({
    data: {
      bookingId: sampleBooking.id,
      clientId: regularUsers[0].id,
      djId: djProfiles[0].id,
      amount: 2500,
      currency: 'SLE',
      type: 'DEPOSIT',
      status: 'COMPLETED',
      provider: 'manual',
      providerRef: 'DEPOSIT_001',
      paidAt: new Date(),
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: sampleBooking.id,
      clientId: regularUsers[0].id,
      djId: djProfiles[0].id,
      amount: 5000,
      currency: 'SLE',
      type: 'FULL_PAYMENT',
      status: 'PENDING',
      provider: 'manual',
    },
  });

  console.log('Created sample booking with payments');

  // Create an admin user
  await prisma.user.create({
    data: {
      email: 'admin@soundit.sl',
      username: 'admin',
      password: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
    },
  });

  console.log('Created admin user');

  console.log('\nSeed completed successfully!');
  console.log(`Summary:`);
  console.log(`- ${regularUsers.length} regular users`);
  console.log(`- ${djProfiles.length} DJ profiles`);
  console.log(`- ${mixData.length} mixes`);
  console.log(`- ${eventData.length + 3} events`);
  console.log(`- ${reviewData.length} reviews`);
  console.log(`- 1 admin user (admin@soundit.sl / admin123)`);
  console.log(`- 1 active metric-based battle with entries`);
  console.log(`- 1 sample booking with deposit and pending payment`);
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
