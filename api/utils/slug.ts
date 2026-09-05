/**
 * Slug generation utilities
 */

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove special characters
    .replace(/[\s_-]+/g, '-') // replace spaces and underscores with single hyphen
    .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens
}

export async function generateUniqueMixSlug(
  prisma: any,
  djId: string,
  title: string,
  currentMixId?: string
): Promise<string> {
  const baseSlug = slugify(title) || 'mix';
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.mix.findFirst({
      where: {
        djId,
        slug,
        ...(currentMixId ? { NOT: { id: currentMixId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

module.exports = {
  slugify,
  generateUniqueMixSlug,
};
