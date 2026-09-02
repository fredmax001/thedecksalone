export interface PaginationOptions {
  maxLimit?: number;
  defaultLimit?: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(
  query: { page?: string | number; limit?: string | number },
  options: PaginationOptions = {}
): PaginationResult {
  const { maxLimit = 50, defaultLimit = 20 } = options;
  const page = Math.max(1, parseInt(String(query.page), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(query.limit), 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
