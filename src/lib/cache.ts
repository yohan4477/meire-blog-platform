// Enhanced caching utility for Scion data
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

class SimpleCache {
  private cache = new Map<string, CacheItem<any>>();

  set<T>(key: string, data: T, ttl: number = 3600000): void { // 1 hour default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      key,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  getStale<T>(key: string): T | null {
    const item = this.cache.get(key);
    return item ? item.data as T : null;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Get cache statistics
  getStats() {
    const items = Array.from(this.cache.values());
    const now = Date.now();
    
    return {
      totalItems: items.length,
      activeItems: items.filter(item => now - item.timestamp < item.ttl).length,
      expiredItems: items.filter(item => now - item.timestamp >= item.ttl).length,
      oldestItem: items.length > 0 ? Math.min(...items.map(item => item.timestamp)) : null,
      newestItem: items.length > 0 ? Math.max(...items.map(item => item.timestamp)) : null,
    };
  }

  // Cleanup expired items
  cleanup(): number {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp >= item.ttl) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
}

// Singleton cache instance
export const cache = new SimpleCache();

// Cache keys
export const CACHE_KEYS = {
  SCION_HOLDINGS: 'scion-holdings',
  SCION_STATS: 'scion-stats',
  SCION_COMPARISON: 'scion-comparison',
} as const;

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  SCION_HOLDINGS: 30 * 24 * 60 * 60 * 1000, // 30 days (quarterly data)
  SCION_STATS: 30 * 24 * 60 * 60 * 1000, // 30 days
  SCION_COMPARISON: 30 * 24 * 60 * 60 * 1000, // 30 days
  SCION_ERROR: 5 * 60 * 1000, // 5 minutes (error cache)
} as const;