interface CacheEntry<T = any> {
  value: T;
  expiry: number;
}

const store = new Map<string, CacheEntry>();

export async function withCache<T>(
  key: string,
  ttlMs: number,
  factory: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const cached = store.get(key);
  if (cached && cached.expiry > now) {
    return cached.value as T;
  }

  const value = await factory();
  store.set(key, { value, expiry: now + ttlMs });
  return value;
}

export function clearCache(pattern?: string | RegExp): void {
  if (!pattern) {
    store.clear();
    return;
  }

  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  for (const key of store.keys()) {
    if (regex.test(key)) {
      store.delete(key);
    }
  }
}

export function cacheStats() {
  return {
    keys: store.size,
  };
}
