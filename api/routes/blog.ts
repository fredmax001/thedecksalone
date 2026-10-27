const express = require('express');
const { ok, fail } = require('../utils/response');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { z } = require('zod');
const logger = require('../utils/logger').default || require('../utils/logger');

const router = express.Router();

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  readTime: string;
  author: string;
  publishedAt: string;
  coverImage?: string;
}

const DEFAULT_POSTS: BlogPost[] = [
  {
    id: 'blog-1',
    slug: 'rise-of-afrobeats-in-sierra-leone',
    title: 'The Rise of Afrobeats in Sierra Leone',
    excerpt: 'How Afrobeats has transformed the DJ scene and become the dominant sound at parties and events across the country.',
    content: `Afrobeats has experienced a monumental surge across West Africa, and Sierra Leone stands at the heart of this cultural movement. From beach parties at Lumley to high-energy club nights in Kenema, Sierra Leonean DJs are fusing traditional Salone rhythms like Bubu and Gumbe with modern Afrobeats productions.

DJs across Freetown are no longer just playing global hits — they are curating soundscapes that bridge local talent with international chart-toppers, creating a unique sonic identity for Salone music culture.`,
    category: 'Culture',
    readTime: '5 min read',
    author: 'Deck Salone Editorial',
    publishedAt: '2024-12-15T12:00:00Z',
  },
  {
    id: 'blog-2',
    slug: 'dj-battle-arena-season-1-recap',
    title: 'DJ Battle Arena: Season 1 Recap',
    excerpt: 'A look back at the most exciting battles, the rising stars, and the unforgettable moments from our first competitive season.',
    content: `The inaugural season of the Deck Salone Battle Arena brought together over 32 elite DJs from across Sierra Leone. With thousands of votes cast by fans and industry judges, Season 1 proved that the competitive DJ spirit in Salone is stronger than ever.

From seamless quick-mix transitions to crowd-pleasing scratch routines, the battle arena highlighted the incredible technical skill and showmanship of local talent.`,
    category: 'Battles',
    readTime: '8 min read',
    author: 'Battle Arena Team',
    publishedAt: '2024-12-10T12:00:00Z',
  },
  {
    id: 'blog-3',
    slug: 'tips-for-aspiring-djs-getting-started',
    title: 'Tips for Aspiring DJs: Getting Started in Salone',
    excerpt: 'From choosing your first equipment to building your brand — essential advice for anyone looking to start their DJ journey.',
    content: `Starting out as a DJ can feel overwhelming, but mastering the fundamentals will set you apart. Here are key steps for aspiring DJs:

1. Know Your Music: Spend time building a structured library categorized by BPM, key, and vibe.
2. Master Beatmatching: Practice timing without relying solely on visual waveforms.
3. Build Your Brand: Share live mixes, engage with local party organizers, and maintain a professional profile on Deck Salone.`,
    category: 'Guide',
    readTime: '6 min read',
    author: 'DJ Masterclass',
    publishedAt: '2024-12-05T12:00:00Z',
  },
];

let blogPosts: BlogPost[] = [...DEFAULT_POSTS];
const subscribers = new Set<string>();

const createPostSchema = z.object({
  title: z.string().min(3).max(200),
  excerpt: z.string().min(10).max(500),
  content: z.string().min(20),
  category: z.string().min(2).max(50),
  readTime: z.string().optional(),
  author: z.string().optional(),
  coverImage: z.string().optional(),
});

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// GET /api/blog — List all blog posts
router.get('/', (req: any, res: any) => {
  return ok(res, blogPosts);
});

// GET /api/blog/:slug — Get post by slug or ID
router.get('/:slug', (req: any, res: any) => {
  const { slug } = req.params;
  const post = blogPosts.find((p) => p.slug === slug || p.id === slug);
  if (!post) {
    return fail(res, 404, 'Article not found');
  }
  return ok(res, post);
});

// POST /api/blog — Create a new post (Admin/Moderator)
router.post('/', authMiddleware, requireRole('ADMIN', 'MODERATOR'), (req: any, res: any) => {
  try {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid post data', { details: parsed.error.flatten() });
    }

    const { title, excerpt, content, category, readTime, author, coverImage } = parsed.data;
    const slug = generateSlug(title);

    const newPost: BlogPost = {
      id: `blog-${Date.now()}`,
      slug,
      title,
      excerpt,
      content,
      category,
      readTime: readTime || '5 min read',
      author: author || req.user?.username || 'Deck Salone Team',
      publishedAt: new Date().toISOString(),
      coverImage,
    };

    blogPosts.unshift(newPost);
    logger.info('New blog post published', { slug, title });

    return res.status(201).json({ success: true, data: newPost });
  } catch (err: any) {
    logger.error('Error creating blog post', { error: err });
    return fail(res, 500, 'Failed to create blog post');
  }
});

// POST /api/blog/subscribe — Subscribe email to newsletter
router.post('/subscribe', (req: any, res: any) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return fail(res, 400, 'Please provide a valid email address');
  }

  const normalized = email.toLowerCase().trim();
  subscribers.add(normalized);
  logger.info('Newsletter subscription received', { email: normalized });

  return res.json({
    success: true,
    message: 'Thank you for subscribing to Deck Salone updates!',
  });
});

module.exports = router;
