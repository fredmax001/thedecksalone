/**
 * Safe in-memory and Web Storage wrapper.
 * Prevents Safari / iOS Safari (Private Browsing mode, restricted cookie policies,
 * or embedded WebViews) from throwing unhandled `SecurityError: The operation is insecure`
 * or `QuotaExceededError`.
 */

class MemoryStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const memoryStorage = new MemoryStorage();

function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const storage = window[type];
    if (!storage) return false;
    const testKey = '__decksalone_storage_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const hasLocalStorage = isStorageAvailable('localStorage');
const hasSessionStorage = isStorageAvailable('sessionStorage');

export const safeLocalStorage: Storage = hasLocalStorage ? window.localStorage : memoryStorage;
export const safeSessionStorage: Storage = hasSessionStorage ? window.sessionStorage : memoryStorage;

export const safeGetItem = (key: string, storage: Storage = safeLocalStorage): string | null => {
  try {
    return storage.getItem(key);
  } catch {
    return memoryStorage.getItem(key);
  }
};

export const safeSetItem = (key: string, value: string, storage: Storage = safeLocalStorage): void => {
  try {
    storage.setItem(key, value);
  } catch {
    memoryStorage.setItem(key, value);
  }
};

export const safeRemoveItem = (key: string, storage: Storage = safeLocalStorage): void => {
  try {
    storage.removeItem(key);
  } catch {
    memoryStorage.removeItem(key);
  }
};
