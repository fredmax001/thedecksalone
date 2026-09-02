export function formatDate(d?: string | Date | null, fallback = '--'): string {
  if (!d) return fallback;
  return new Date(d).toLocaleDateString();
}

export function formatTime(d?: string | Date | null, fallback = ''): string {
  if (!d) return fallback;
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(d?: string | Date | null, fallback = '--'): string {
  if (!d) return fallback;
  return new Date(d).toLocaleString();
}

export function formatEventDate(
  d?: string | Date | null,
  fallback = '--',
  opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
): string {
  if (!d) return fallback;
  return new Date(d).toLocaleDateString('en-US', opts);
}
