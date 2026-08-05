interface CacheEntry<T> {
  data: T;
  expiry: number;
  cachedAt: Date;
}

class SimpleMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Get cached data by key
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data with TTL in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, {
      data,
      expiry,
      cachedAt: new Date(),
    });
  }

  /**
   * Delete specific cache key or matching keys
   */
  delete(keyPattern?: string): number {
    if (!keyPattern) {
      const size = this.cache.size;
      this.cache.clear();
      return size;
    }

    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): number {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }

  /**
   * Get current cache stats
   */
  getStats() {
    const keys = Array.from(this.cache.keys());
    const now = Date.now();
    const activeEntries = keys.filter((k) => (this.cache.get(k)?.expiry ?? 0) > now);

    return {
      totalKeys: keys.length,
      activeKeys: activeEntries.length,
      keys: keys.map((k) => ({
        key: k,
        cachedAt: this.cache.get(k)?.cachedAt,
        ttlRemainingSeconds: Math.max(0, Math.round(((this.cache.get(k)?.expiry ?? 0) - now) / 1000)),
      })),
    };
  }
}

// Global singleton instance across HMR in Next.js development
const globalForCache = globalThis as unknown as { apiCache: SimpleMemoryCache };

export const apiCache = globalForCache.apiCache || new SimpleMemoryCache();

if (process.env.NODE_ENV !== "production") globalForCache.apiCache = apiCache;
