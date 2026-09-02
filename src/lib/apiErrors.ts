/**
 * Extract a user-facing error message from an API/axios error.
 * Preserves per-call fallback text.
 */
export const getApiErrorMessage = (err: any, fallback: string): string => {
  return err?.response?.data?.error || fallback;
};
