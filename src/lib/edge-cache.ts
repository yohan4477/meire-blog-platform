// Edge caching utilities with cache invalidation for maximum performance
import { NextRequest, NextResponse } from 'next/server';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  staleWhileRevalidate?: number; // SWR time in seconds
  tags?: string[]; // Cache tags for invalidation
  bypassCache?: boolean; // Force bypass cache
}

export class EdgeCache {
  private static instance: EdgeCache;
  private cache = new Map<string, { data: any; timestamp: number; tags: string[] }>();
  
  static getInstance(): EdgeCache {
    if (!EdgeCache.instance) {
      EdgeCache.instance = new EdgeCache();
    }
    return EdgeCache.instance;
  }

  // High-performance caching with proven patterns
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig
  ): Promise<{ data: T; cached: boolean; hitRate?: number }> {
    const startTime = Date.now();
    
    // Check cache first (sub-1ms lookup)
    if (!config.bypassCache) {
      const cached = this.cache.get(key);
      if (cached && (Date.now() - cached.timestamp) < (config.ttl * 1000)) {
        console.log(`🎯 Cache HIT for ${key} (${Date.now() - startTime}ms)`);
        return { data: cached.data, cached: true };
      }
    }

    // Cache miss - fetch new data
    console.log(`💾 Cache MISS for ${key}, fetching...`);
    const fetchStart = Date.now();
    
    try {
      const data = await fetcher();
      
      // Store in cache with tags
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        tags: config.tags || []
      });
      
      const fetchTime = Date.now() - fetchStart;
      console.log(`✅ Cached ${key} (fetch: ${fetchTime}ms, total: ${Date.now() - startTime}ms)`);
      
      return { data, cached: false };
    } catch (error) {
      console.error(`💥 Cache fetch failed for ${key}:`, error);
      throw error;
    }
  }

  // Intelligent cache invalidation by tags
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    console.log(`🗑️ Invalidated ${invalidated} cache entries for tags: ${tags.join(', ')}`);
    return invalidated;
  }

  // Performance monitoring
  getStats() {
    const totalEntries = this.cache.size;
    const memoryUsage = JSON.stringify([...this.cache.entries()]).length;
    
    return {
      totalEntries,
      memoryUsageBytes: memoryUsage,
      memoryUsageMB: (memoryUsage / 1024 / 1024).toFixed(2)
    };
  }

  // Cleanup expired entries (runs automatically)
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Remove entries older than 1 hour (default max)
      if (now - entry.timestamp > 3600000) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
    
    return cleaned;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    console.log('🗑️ All cache cleared');
  }
}

// Singleton instance
export const edgeCache = EdgeCache.getInstance();

// HTTP cache headers for Next.js responses
export function setCacheHeaders(
  response: NextResponse,
  config: CacheConfig
): NextResponse {
  const maxAge = config.ttl;
  const swr = config.staleWhileRevalidate || Math.min(maxAge * 2, 3600);
  
  // Set optimized cache headers
  response.headers.set(
    'Cache-Control',
    `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${swr}`
  );
  
  // Add cache tags for Vercel/Cloudflare
  if (config.tags?.length) {
    response.headers.set('Cache-Tag', config.tags.join(','));
  }
  
  // Performance headers
  response.headers.set('X-Cache-Status', 'OPTIMIZED');
  response.headers.set('X-Cache-TTL', maxAge.toString());
  
  return response;
}

// Cache invalidation webhook endpoint
export async function handleCacheInvalidation(request: NextRequest) {
  try {
    const body = await request.json();
    const { tags, keys } = body;
    
    let invalidated = 0;
    
    // Invalidate by tags
    if (tags?.length) {
      invalidated += edgeCache.invalidateByTags(tags);
    }
    
    // Invalidate specific keys
    if (keys?.length) {
      for (const key of keys) {
        if ((edgeCache as any).cache.has(key)) {
          (edgeCache as any).cache.delete(key);
          invalidated++;
        }
      }
    }
    
    // Cleanup expired entries
    invalidated += edgeCache.cleanup();
    
    return NextResponse.json({
      success: true,
      invalidated,
      stats: edgeCache.getStats()
    });
    
  } catch (error) {
    console.error('Cache invalidation failed:', error);
    return NextResponse.json(
      { error: 'Cache invalidation failed' },
      { status: 500 }
    );
  }
}

// Proven cache keys for stock data
export const CACHE_KEYS = {
  STOCK_MENTIONS: (limit: number) => `stocks:mentions:${limit}`,
  STOCK_SENTIMENTS: (ticker: string, period: string) => `stocks:sentiments:${ticker}:${period}`,
  RECENT_POSTS: (days: number) => `posts:recent:${days}`,
  STOCK_PRICES: (ticker: string) => `prices:${ticker}`,
  MERRY_PICKS: () => 'merry:picks:latest'
};

// Cache tags for intelligent invalidation
export const CACHE_TAGS = {
  STOCKS: 'stocks',
  POSTS: 'posts', 
  SENTIMENTS: 'sentiments',
  PRICES: 'prices',
  MERRY: 'merry'
};

// Optimized response wrapper with automatic caching
export async function cachedApiResponse<T>(
  fetcher: () => Promise<T>,
  cacheKey: string,
  config: CacheConfig
): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const result = await edgeCache.getOrSet(cacheKey, fetcher, config);
    
    const response = NextResponse.json({
      success: true,
      data: result.data,
      cached: result.cached,
      performance: {
        responseTime: Date.now() - startTime,
        cacheStatus: result.cached ? 'HIT' : 'MISS'
      }
    });
    
    return setCacheHeaders(response, config);
    
  } catch (error) {
    console.error('Cached API response failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Data fetch failed',
      performance: {
        responseTime: Date.now() - startTime,
        cacheStatus: 'ERROR'
      }
    }, { status: 500 });
  }
}