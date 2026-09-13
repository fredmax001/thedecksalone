import { isAfricanCountry } from '@/lib/africanCountries';

/**
 * Best-effort country of a logged-in user.
 * DJs: djProfile.country (DB defaults to "Sierra Leone").
 * Users: User.location — either "City, Country" (profile save) or just the
 * country (registration). Returns null when unknown.
 */
export function getUserCountry(user: any): string | null {
  const djCountry = user?.djProfile?.country;
  if (djCountry) return djCountry;

  const location: string | undefined = user?.location;
  if (location) {
    const lastPart = location.split(',').map((s: string) => s.trim()).filter(Boolean).pop() || '';
    if (isAfricanCountry(lastPart)) return lastPart;
    if (isAfricanCountry(location)) return location.trim();
  }

  return null;
}

/**
 * Sierra Leone keeps the manual Orange Money / Afrimoney payment system;
 * every other country pays via PayPal only. When the country is unknown
 * (e.g. legacy accounts) we keep the existing behavior (Sierra Leone).
 */
export function isSierraLeoneUser(user: any): boolean {
  return (getUserCountry(user) ?? 'Sierra Leone') === 'Sierra Leone';
}
