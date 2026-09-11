/**
 * Mood & energy taxonomy for smart playlists.
 * DJs tag their mixes with these values at upload/edit time;
 * moderators use the same values to define rule-based smart playlists.
 */

export const MOODS = [
  { value: 'relaxed', label: 'Relaxed / Chill' },
  { value: 'party', label: 'Party' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'uplifting', label: 'Uplifting' },
  { value: 'soulful', label: 'Soulful' },
  { value: 'intense', label: 'Dark / Intense' },
  { value: 'nostalgic', label: 'Nostalgic' },
] as const;

export const ENERGIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

export type Mood = (typeof MOODS)[number]['value'];
export type Energy = (typeof ENERGIES)[number]['value'];

export const MOOD_LABELS: Record<string, string> = Object.fromEntries(
  MOODS.map((m) => [m.value, m.label]),
);

export const ENERGY_LABELS: Record<string, string> = Object.fromEntries(
  ENERGIES.map((e) => [e.value, e.label]),
);
