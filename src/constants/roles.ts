export const ADMIN_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'FINANCE_ADMIN',
  'SUPPORT_ADMIN',
  'VERIFICATION_ADMIN',
  'MODERATOR',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(role: string | undefined | null): boolean {
  return !!role && ADMIN_ROLES.includes(role as AdminRole);
}
