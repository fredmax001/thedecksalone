const express = require('express');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { uploadBuffer } = require('../utils/storage');
const multer = require('multer');

const router = express.Router();

const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WebP allowed.'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// POST /api/photos — Upload a photo (multipart/form-data, field name: 'photo')
router.post('/', authMiddleware, uploadPhoto.single('photo'), async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!dj) return res.status(404).json({ success: false, error: 'DJ profile not found' });

    const count = await prisma.djPhoto.count({ where: { djId: dj.id } });
    if (count >= 10) {
      return res.status(400).json({ success: false, error: 'Maximum 10 photos allowed' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Photo file required' });
    }

    const imageUrl = await uploadBuffer(req.file.buffer, 'photos', {
      contentType: req.file.mimetype,
      ext: req.file.originalname.split('.').pop() || 'webp',
    });

    const { caption } = req.body;
    const photo = await prisma.djPhoto.create({
      data: {
        djId: dj.id,
        url: imageUrl,
        caption: caption || null,
        sortOrder: count,
      },
    });

    return res.status(201).json({ success: true, data: photo });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/djs/me/photos — DJ's photos
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!dj) return res.status(404).json({ success: false, error: 'DJ profile not found' });

    const photos = await prisma.djPhoto.findMany({
      where: { djId: dj.id, isPublic: true },
      orderBy: { sortOrder: 'asc' },
    });

    return res.json({ success: true, data: photos });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/djs/:identifier/photos — Public photos for a DJ
router.get('/dj/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const dj = await prisma.djProfile.findFirst({
      where: {
        OR: [
          { user: { username: { equals: identifier, mode: 'insensitive' } } },
          { id: identifier },
        ],
      },
      select: { id: true },
    });

    if (!dj) return res.status(404).json({ success: false, error: 'DJ not found' });

    const photos = await prisma.djPhoto.findMany({
      where: { djId: dj.id, isPublic: true },
      orderBy: { sortOrder: 'asc' },
    });

    return res.json({ success: true, data: photos });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/djs/me/photos/:id — Delete a photo
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!dj) return res.status(404).json({ success: false, error: 'DJ profile not found' });

    const photo = await prisma.djPhoto.findFirst({
      where: { id: req.params.id, djId: dj.id },
    });
    if (!photo) return res.status(404).json({ success: false, error: 'Photo not found' });

    await prisma.djPhoto.delete({ where: { id: photo.id } });

    return res.json({ success: true, message: 'Photo deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
