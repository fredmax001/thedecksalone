export function computeGenreRanks(mixes: any[]): Record<string, number> {
  const rankMap: Record<string, number> = {};
  const byGenre: Record<string, any[]> = {};

  if (!Array.isArray(mixes)) return rankMap;

  mixes.forEach((m) => {
    if (!m || !m.id) return;
    const genre = (m.genre || m.category || 'General').toLowerCase().trim();
    if (!byGenre[genre]) byGenre[genre] = [];
    byGenre[genre].push(m);
  });

  Object.values(byGenre).forEach((genreMixes) => {
    const sorted = [...genreMixes].sort((a, b) => (b.plays || 0) - (a.plays || 0));
    sorted.slice(0, 5).forEach((mix, index) => {
      rankMap[mix.id] = index + 1;
    });
  });

  return rankMap;
}
