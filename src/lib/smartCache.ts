import { ScionPortfolio } from '@/types';
import { cache, CACHE_KEYS, CACHE_TTL } from './cache';
import { fileCache, FILE_CACHE_KEYS } from './fileCache';
import { getCachedNPSHoldings } from './sec-edgar';

/**
 * Smart caching strategy for Scion holdings:
 * 1. Memory cache (30 days) - Fastest access
 * 2. File cache (90 days) - Persistent across restarts
 * 3. API fallback - Only when absolutely necessary
 * 4. Stale data fallback - Better than no data
 */
export async function getSmartCachedScionHoldings(): Promise<ScionPortfolio | null> {
  console.log('🔍 Smart cache lookup for Scion holdings...');

  // 1. Try memory cache first (fastest)
  const memoryCached = cache.get<ScionPortfolio>(CACHE_KEYS.SCION_HOLDINGS);
  if (memoryCached) {
    console.log('✅ Memory cache hit');
    return memoryCached;
  }

  // 2. Try file cache (persistent)
  const fileCached = await fileCache.get<ScionPortfolio>(FILE_CACHE_KEYS.SCION_HOLDINGS);
  if (fileCached) {
    console.log('✅ File cache hit - loading into memory');
    // Load back into memory cache for faster future access
    cache.set(CACHE_KEYS.SCION_HOLDINGS, fileCached, CACHE_TTL.SCION_HOLDINGS);
    return fileCached;
  }

  console.log('💭 No cache hit - checking file cache info...');
  const cacheInfo = await fileCache.getCacheInfo(FILE_CACHE_KEYS.SCION_HOLDINGS);
  
  // 3. If we have expired file cache data, use it as fallback while fetching new data
  let staleData: ScionPortfolio | null = null;
  if (cacheInfo.exists && cacheInfo.expired) {
    staleData = await fileCache.getStale<ScionPortfolio>(FILE_CACHE_KEYS.SCION_HOLDINGS);
    console.log('📦 Found stale file cache data as fallback');
  }

  try {
    // 4. Try to fetch fresh data from API
    console.log('🏛️ Fetching fresh data from SEC EDGAR API...');
    const freshData = await getCachedNPSHoldings();
    
    if (freshData) {
      console.log('✅ Fresh API data received');
      
      // Save to both caches
      cache.set(CACHE_KEYS.SCION_HOLDINGS, freshData, CACHE_TTL.SCION_HOLDINGS);
      await fileCache.set(
        FILE_CACHE_KEYS.SCION_HOLDINGS, 
        freshData, 
        90 * 24 * 60 * 60 * 1000, // 90 days for file cache
        freshData.quarter
      );
      
      return freshData;
    }
    
  } catch (error) {
    console.error('❌ API fetch failed:', error);
    
    // 5. Return stale data if API fails
    if (staleData) {
      console.log('🔄 Using stale data due to API failure');
      return staleData;
    }
  }

  console.log('💨 No data available from any source');
  return null;
}

/**
 * Force refresh data and update all caches
 */
export async function forceRefreshScionHoldings(): Promise<ScionPortfolio | null> {
  console.log('🔄 Force refresh requested');
  
  try {
    // Clear existing caches
    cache.delete(CACHE_KEYS.SCION_HOLDINGS);
    await fileCache.delete(FILE_CACHE_KEYS.SCION_HOLDINGS);
    
    // Fetch fresh data
    const freshData = await getCachedNPSHoldings();
    
    if (freshData) {
      console.log('✅ Force refresh successful');
      
      // Update all caches
      cache.set(CACHE_KEYS.SCION_HOLDINGS, freshData, CACHE_TTL.SCION_HOLDINGS);
      await fileCache.set(
        FILE_CACHE_KEYS.SCION_HOLDINGS,
        freshData,
        90 * 24 * 60 * 60 * 1000,
        freshData.quarter
      );
      
      return freshData;
    }
    
  } catch (error) {
    console.error('❌ Force refresh failed:', error);
    
    // Try to return any available stale data
    const staleMemory = cache.getStale<ScionPortfolio>(CACHE_KEYS.SCION_HOLDINGS);
    if (staleMemory) {
      console.log('🔄 Returning stale memory data after failed refresh');
      return staleMemory;
    }
    
    const staleFile = await fileCache.getStale<ScionPortfolio>(FILE_CACHE_KEYS.SCION_HOLDINGS);
    if (staleFile) {
      console.log('🔄 Returning stale file data after failed refresh');
      return staleFile;
    }
  }
  
  return null;
}

/**
 * Get cache status information for debugging
 */
export async function getCacheStatus() {
  const memoryHas = cache.has(CACHE_KEYS.SCION_HOLDINGS);
  const fileInfo = await fileCache.getCacheInfo(FILE_CACHE_KEYS.SCION_HOLDINGS);
  const memoryStats = cache.getStats();
  
  return {
    memory: {
      hasData: memoryHas,
      stats: memoryStats
    },
    file: {
      exists: fileInfo.exists,
      expired: fileInfo.expired,
      quarter: fileInfo.quarter,
      ageHours: fileInfo.age ? Math.round(fileInfo.age / (60 * 60 * 1000)) : null
    },
    recommendations: {
      shouldRefresh: fileInfo.expired && !memoryHas,
      dataAge: fileInfo.age ? `${Math.round(fileInfo.age / (24 * 60 * 60 * 1000))} days` : 'unknown'
    }
  };
}