// UPL-9: only attach the JWT to same-origin media URLs. The previous
// host-blind `url.includes('/api/mixes/')` predicate let DJs store an
// external audioUrl like `https://evil.example/api/mixes/track.mp3`, causing
// every listener's player to append `?token=<JWT>` to the attacker's URL.
// Kept in its own module (no import.meta) so it can be unit-tested in node.
export const shouldAttachToken = (url: string, origin: string): boolean => {
  if (url.startsWith('data:') || url.startsWith('blob:')) return false;
  let pathname: string;
  if (url.startsWith('/')) {
    pathname = url;
  } else {
    try {
      const parsed = new URL(url, origin);
      if (parsed.origin !== origin) return false;
      pathname = parsed.pathname;
    } catch {
      return false;
    }
  }
  return pathname.startsWith('/uploads/') || pathname.includes('/api/mixes/');
};
