#!/usr/bin/env node
/**
 * Build-time image optimizer for Deck Salone.
 * Generates responsive WebP variants for large public images.
 *
 * Usage:
 *   node scripts/optimize-images.js
 *
 * The script preserves originals and creates files like:
 *   public/hero-bg-640.webp
 *   public/hero-bg-768.webp
 *   public/hero-bg-1024.webp
 *   public/hero-bg-1280.webp
 *   public/hero-bg-1920.webp
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '../public');

const CONFIG = [
  {
    file: 'hero-bg.jpg',
    widths: [640, 768, 1024, 1280, 1920],
    quality: 80,
    format: 'webp',
  },
  {
    file: 'login-bg.jpg',
    widths: [640, 768, 1024, 1280, 1920],
    quality: 80,
    format: 'webp',
  },
  {
    file: 'default-avatar.jpg',
    widths: [64, 128, 256, 384],
    quality: 85,
    format: 'webp',
  },
  {
    file: 'mix-placeholder.jpg',
    widths: [256, 384, 512, 768],
    quality: 85,
    format: 'webp',
  },
  {
    file: 'og-banner.png',
    widths: [600, 1200],
    quality: 85,
    format: 'webp',
  },
  {
    file: 'og-image.jpg',
    widths: [600, 1200],
    quality: 85,
    format: 'webp',
  },
  {
    file: 'how_it_works_1.jpg',
    widths: [400, 768, 1024],
    quality: 80,
    format: 'webp',
  },
  {
    file: 'how_it_works_2.jpg',
    widths: [400, 768, 1024],
    quality: 80,
    format: 'webp',
  },
  {
    file: 'how_it_works_3.jpg',
    widths: [400, 768, 1024],
    quality: 80,
    format: 'webp',
  },
  {
    file: 'how_it_works_4.jpg',
    widths: [400, 768, 1024],
    quality: 80,
    format: 'webp',
  },
];

async function optimize() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (err) {
    console.error('sharp is not installed. Run: npm install sharp');
    process.exit(1);
  }

  for (const item of CONFIG) {
    const inputPath = path.join(PUBLIC_DIR, item.file);
    if (!fs.existsSync(inputPath)) {
      console.warn(`Skipping missing file: ${item.file}`);
      continue;
    }

    const baseName = path.basename(item.file, path.extname(item.file));
    const meta = await sharp(inputPath).metadata();
    const originalWidth = meta.width || 1920;

    for (const width of item.widths) {
      if (width > originalWidth) continue;
      const outputName = `${baseName}-${width}.${item.format}`;
      const outputPath = path.join(PUBLIC_DIR, outputName);

      await sharp(inputPath)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: item.quality, effort: 4 })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      console.log(`Generated ${outputName} (${(stats.size / 1024).toFixed(1)} KiB)`);
    }
  }

  console.log('\nImage optimization complete.');
}

optimize().catch((err) => {
  console.error(err);
  process.exit(1);
});
