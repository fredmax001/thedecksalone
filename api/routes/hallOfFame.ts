const express = require('express');
const { prisma } = require('../utils/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { uploadHallOfFameImage } = require('../utils/upload');
const { processHallOfFameImage } = require('../utils/imageProcessor');
const { uploadBuffer, deleteFile } = require('../utils/storage');
const { ok, fail } = require('../utils/response');

const router = express.Router();

const DEFAULT_LEGENDS = [
  {
    name: 'DJ Master J',
    era: '1985 — 2005',
    status: 'deceased',
    story:
      "One of the first mobile DJs in Freetown, Master J built his own sound system from salvaged parts in the early 1980s. He played at virtually every community event in the capital for two decades, introducing generations to vinyl culture before anyone else had access to imported records. His Saturday night sets at the famous Palm Beach Nightclub became legendary.",
    contribution:
      'Introduced vinyl DJ culture to Freetown; built the first community sound system; mentored over 20 DJs who went on to define the scene.',
    quote: 'The music is the message. Without it, we have no voice.',
    city: 'Freetown',
    image: '',
  },
  {
    name: 'Selector Brown',
    era: '1990 — Present',
    status: 'living',
    story:
      "The godfather of mixtape culture in Sierra Leone. In the mid-1990s, Brown began recording live sets onto cassette tapes and distributing them across the country through market vendors. Before the internet, his tapes were how people in Bo, Kenema, and Makeni discovered new music. He never owned a digital mixer, but his ear for transitions was unmatched.",
    contribution:
      'Created the nationwide mixtape distribution network; bridged regional music scenes; preserved hundreds of live sets from the 1990s.',
    quote: '',
    city: 'Bo',
    image: '',
  },
  {
    name: 'MC Spinna',
    era: '1995 — 2010',
    status: 'deceased',
    story:
      'The first DJ to introduce competitive battling to Sierra Leone. In 1995, MC Spinna organized the legendary battle at Lumley Beach that pitted east Freetown DJs against west Freetown selectors. The event drew over 5,000 people and established the competitive DJ culture that still thrives today. He was known for his rapid-fire scratching and unmatched crowd control.',
    contribution:
      'Founded the DJ battle culture in Sierra Leone; established the first DJ competition format; inspired the modern battle scene.',
    quote: 'Let the turntables talk.',
    city: 'Freetown',
    image: '',
  },
  {
    name: 'Digital K',
    era: '2000 — Present',
    status: 'living',
    story:
      'When CDJs arrived in Sierra Leone in the early 2000s, most DJs resisted the change. Digital K embraced it. He was the first to blend digital mixing with traditional vinyl techniques, creating a hybrid style that defined the 2000s era. His groundbreaking work in wedding DJing professionalized the industry, setting standards for equipment and performance quality.',
    contribution:
      'Pioneered digital mixing in Sierra Leone; professionalized wedding DJ industry; set equipment standards adopted nationwide.',
    quote: '',
    city: 'Makeni',
    image: '',
  },
];

function generateAvatarUrl(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f4e059&color=000&size=512&bold=true`;
}

async function seedDefaultLegendsIfEmpty() {
  const count = await prisma.hallOfFameLegend.count();
  if (count > 0) return;
  await prisma.hallOfFameLegend.createMany({
    data: DEFAULT_LEGENDS.map((legend, index) => ({
      ...legend,
      image: generateAvatarUrl(legend.name),
      sortOrder: index,
    })),
  });
}

// GET /api/hall-of-fame/legends - Public list of legacy legends
router.get('/legends', async (req, res) => {
  try {
    await seedDefaultLegendsIfEmpty();
    const legends = await prisma.hallOfFameLegend.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return ok(res, legends);
  } catch (error) {
    console.error('[Hall of Fame Legends] GET error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

async function handleImageUpload(file?: any, imageUrl?: string, currentImage?: string | null) {
  if (file) {
    if (currentImage) {
      try {
        await deleteFile(currentImage);
      } catch (err) {
        console.warn('Failed to delete old Hall of Fame image:', err.message);
      }
    }
    const processed = await processHallOfFameImage(file.buffer);
    return await uploadBuffer(processed.buffer, 'hall-of-fame', {
      ext: processed.ext,
      contentType: processed.contentType,
    });
  }
  if (imageUrl && typeof imageUrl === 'string') {
    if (currentImage && imageUrl !== currentImage) {
      try {
        await deleteFile(currentImage);
      } catch (err) {
        console.warn('Failed to delete old Hall of Fame image:', err.message);
      }
    }
    return imageUrl.trim();
  }
  return currentImage || '';
}

function legendInputFromBody(body: any) {
  const status = body.status || 'unknown';
  if (!['living', 'deceased', 'unknown'].includes(status)) {
    throw new Error("Status must be 'living', 'deceased', or 'unknown'");
  }
  return {
    name: body.name?.trim() || '',
    era: body.era?.trim() || null,
    status,
    story: body.story?.trim() || '',
    contribution: body.contribution?.trim() || '',
    quote: body.quote?.trim() || null,
    city: body.city?.trim() || null,
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
  };
}

// POST /api/hall-of-fame/legends - Add a new legend (admin/mod only)
router.post(
  '/legends',
  authMiddleware,
  requireRole('ADMIN', 'MODERATOR'),
  uploadHallOfFameImage.single('imageFile'),
  async (req: any, res: any) => {
    try {
      const input = legendInputFromBody(req.body);
      if (!input.name) {
        return fail(res, 400, 'Name is required');
      }
      if (!input.story || !input.contribution) {
        return fail(res, 400, 'Story and contribution are required');
      }

      const image = await handleImageUpload(req.file, req.body.imageUrl);

      const legend = await prisma.hallOfFameLegend.create({
        data: { ...input, image: image || generateAvatarUrl(input.name) },
      });

      return res.status(201).json({ success: true, data: legend });
    } catch (error: any) {
      console.error('[Hall of Fame Legends] POST error:', error);
      return fail(res, 500, 'Internal server error');
    }
  }
);

// PUT /api/hall-of-fame/legends/:id - Update a legend (admin/mod only)
router.put(
  '/legends/:id',
  authMiddleware,
  requireRole('ADMIN', 'MODERATOR'),
  uploadHallOfFameImage.single('imageFile'),
  async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const existing = await prisma.hallOfFameLegend.findUnique({ where: { id } });
      if (!existing) {
        return fail(res, 404, 'Legend not found');
      }

      const input = legendInputFromBody(req.body);
      const image = await handleImageUpload(req.file, req.body.imageUrl, existing.image);

      const updated = await prisma.hallOfFameLegend.update({
        where: { id },
        data: { ...input, image: image || existing.image || generateAvatarUrl(input.name || existing.name) },
      });

      return ok(res, updated);
    } catch (error: any) {
      console.error('[Hall of Fame Legends] PUT error:', error);
      return fail(res, 500, 'Internal server error');
    }
  }
);

// DELETE /api/hall-of-fame/legends/:id - Remove a legend (admin/mod only)
router.delete(
  '/legends/:id',
  authMiddleware,
  requireRole('ADMIN', 'MODERATOR'),
  async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const existing = await prisma.hallOfFameLegend.findUnique({ where: { id } });
      if (!existing) {
        return fail(res, 404, 'Legend not found');
      }

      if (existing.image) {
        try {
          await deleteFile(existing.image);
        } catch (err) {
          console.warn('Failed to delete Hall of Fame image:', err.message);
        }
      }

      await prisma.hallOfFameLegend.delete({ where: { id } });
      return ok(res, { id });
    } catch (error: any) {
      console.error('[Hall of Fame Legends] DELETE error:', error);
      return fail(res, 500, 'Internal server error');
    }
  }
);

module.exports = router;
