// UPL-1 / UPL-8 — central helper for safe mix audio URLs.
//
// Raw local audio paths (/uploads/mixes/...) must never be handed out in API
// responses: the /uploads static mount no longer serves mix bytes, and paid /
// exclusive mixes must stream only through the authorized
// GET /api/mixes/:id/audio endpoint. External http(s) URLs (SoundCloud,
// Hearthis.at, S3) are left untouched — those platforms handle their own auth.
function toPublicAudioUrl(mix: any) {
  if (!mix || typeof mix !== 'object' || typeof mix.audioUrl !== 'string') return mix;
  if (!mix.audioUrl.startsWith('/uploads/')) return mix;
  return { ...mix, audioUrl: `/api/mixes/${mix.id}/audio` };
}

module.exports = { toPublicAudioUrl };
