const passport = require('passport');
const crypto = require('crypto');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { prisma } = require('./prisma');
const { signToken } = require('./jwt');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn('[Auth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set. Google OAuth will not work.');
}

const RESERVED_USERNAMES = new Set([
  'admin', 'api', 'dashboard', 'login', 'logout', 'dj', 'user', 'soundit',
  'thedeck', 'moderator', 'support', 'help', 'about', 'contact', 'terms',
  'privacy', 'settings',
]);

function isValidUsername(username) {
  return (
    typeof username === 'string' &&
    username.length >= 3 &&
    username.length <= 30 &&
    /^[a-z0-9_-]+$/.test(username) &&
    !RESERVED_USERNAMES.has(username.toLowerCase())
  );
}

async function generateUsername(email) {
  const prefix = (email.split('@')[0] || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '')
    .slice(0, 20)
    .replace(/^[-_]+|[-_]+$/g, '');
  const base = prefix.length >= 3 ? prefix : 'user';

  // First try the bare base name
  const baseExists = await prisma.user.findUnique({ where: { username: base } });
  if (!baseExists && !RESERVED_USERNAMES.has(base)) return base;

  // Append a random 4-char suffix — collision probability is astronomically low
  // (36^4 = 1.6M combinations). Retry up to 5 times for safety.
  for (let i = 0; i < 5; i++) {
    const suffix = crypto.randomBytes(2).toString('hex'); // e.g. "a3f2"
    const candidate = `${base}_${suffix}`;
    if (!RESERVED_USERNAMES.has(candidate)) {
      const existing = await prisma.user.findUnique({ where: { username: candidate } });
      if (!existing) return candidate;
    }
  }
  throw new Error('Unable to generate unique username after retries');
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID || 'dummy',
      clientSecret: GOOGLE_CLIENT_SECRET || 'dummy',
      callbackURL: `${BACKEND_URL}/api/auth/google/callback`,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const googleId = profile.id;
        const displayName = profile.displayName || email?.split('@')[0];

        if (!email) {
          return done(null, false, { message: 'Google account has no email.' });
        }

        // Check if user exists by Google ID or email
        let user = await prisma.user.findUnique({ where: { googleId } });

        if (!user) {
          // Check by email for account linking
          const existingByEmail = await prisma.user.findUnique({ where: { email } });
          if (existingByEmail) {
            // Link Google to existing account
            user = await prisma.user.update({
              where: { id: existingByEmail.id },
              data: { googleId },
            });
          } else {
            // Create new user with generated username and name
            const username = await generateUsername(email);
            user = await prisma.user.create({
              data: {
                email,
                username,
                name: displayName || null,
                googleId,
                role: 'USER',
              },
            });

            // Optionally create a DJ profile if they signed up as a DJ
            // For now, they remain a USER and can upgrade to DJ later
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
