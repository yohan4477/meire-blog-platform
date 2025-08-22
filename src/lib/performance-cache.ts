// 🚀 종목 페이지 방식의 차별화된 캐싱 전략
// 메인 페이지 성능 최적화를 위한 스마트 캐싱 시스템

interface CacheConfig {
  key: string;
  ttl: number; // seconds
  staleWhileRevalidate?: boolean;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  stale?: boolean;
}

class PerformanceCache {
  private cache = new Map<string, CacheItem<any>>();
  private requestPromises = new Map<string, Promise<any>>();

  // 🎯 메인 페이지 캐시 설정 (종목 페이지 방식 적용)
  static readonly CACHE_CONFIGS = {
    // 정적 콘텐츠 - 24시간 캐시
    STATIC_CONTENT: { key: 'static', ttl: 24 * 60 * 60 }, // 24h
    
    // 오늘의 메르 말씀 - 6시간 캐시
    TODAY_QUOTE: { key: 'today_quote', ttl: 6 * 60 * 60 }, // 6h
    
    // 메르's Pick - 30분 캐시 (실시간성 중요)
    MERRY_PICKS: { key: 'merry_picks', ttl: 30 * 60 }, // 30m
    
    // 메르 블로그 포스트 - 2시간 캐시
    MERRY_POSTS: { key: 'merry_posts', ttl: 2 * 60 * 60 }, // 2h
    
    // 하단 카드 정보 - 12시간 캐시
    BOTTOM_CARDS: { key: 'bottom_cards', ttl: 12 * 60 * 60 }, // 12h
  } as const;

  /**
   * 캐시에서 데이터 가져오기
   */
  get<T>(config: CacheConfig): T | null {
    const item = this.cache.get(config.key);
    
    if (!item) return null;
    
    const now = Date.now();
    const isExpired = now - item.timestamp > item.ttl * 1000;
    
    if (isExpired) {
      if (!config.staleWhileRevalidate) {
        this.cache.delete(config.key);
        return null;
      }
      // stale 상태로 표시하지만 데이터 반환
      item.stale = true;
      return item.data;
    }
    
    return item.data;
  }

  /**
   * 캐시에 데이터 저장
   */
  set<T>(config: CacheConfig, data: T): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
      stale: false
    };
    
    this.cache.set(config.key, item);
  }

  /**
   * 캐시된 fetch 함수 (종목 페이지 방식)
   */
  async cachedFetch<T>(
    config: CacheConfig, 
    fetcher: () => Promise<T>,
    options?: {
      onStaleData?: (data: T) => void;
      fallbackData?: T;
    }
  ): Promise<T> {
    // 캐시에서 먼저 확인
    const cached = this.get<T>(config);
    
    if (cached && !this.cache.get(config.key)?.stale) {
      return cached;
    }
    
    // stale 데이터가 있으면 즉시 반환하고 백그라운드에서 새로고침
    if (cached && this.cache.get(config.key)?.stale) {
      options?.onStaleData?.(cached);
      // 백그라운드에서 새로고침
      this.refreshInBackground(config, fetcher);
      return cached;
    }
    
    // 중복 요청 방지
    const existingPromise = this.requestPromises.get(config.key);
    if (existingPromise) {
      return existingPromise;
    }
    
    // 새로운 데이터 요청
    const promise = this.fetchWithFallback(config, fetcher, options?.fallbackData);
    this.requestPromises.set(config.key, promise);
    
    try {
      const result = await promise;
      this.set(config, result);
      return result;
    } finally {
      this.requestPromises.delete(config.key);
    }
  }

  /**
   * 백그라운드에서 캐시 새로고침
   */
  private async refreshInBackground<T>(
    config: CacheConfig, 
    fetcher: () => Promise<T>
  ): Promise<void> {
    try {
      const freshData = await fetcher();
      this.set(config, freshData);
      console.log(`🔄 캐시 백그라운드 새로고침 완료: ${config.key}`);
    } catch (error) {
      console.warn(`⚠️ 백그라운드 새로고침 실패: ${config.key}`, error);
    }
  }

  /**
   * Fallback과 함께 데이터 페칭
   */
  private async fetchWithFallback<T>(
    config: CacheConfig,
    fetcher: () => Promise<T>,
    fallbackData?: T
  ): Promise<T> {
    try {
      return await fetcher();
    } catch (error) {
      console.warn(`⚠️ 캐시 fetcher 실패: ${config.key}`, error);
      
      if (fallbackData !== undefined) {
        console.log(`💾 Fallback 데이터 사용: ${config.key}`);
        return fallbackData;
      }
      
      throw error;
    }
  }

  /**
   * 특정 캐시 무효화
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.requestPromises.delete(key);
    console.log(`🗑️ 캐시 무효화: ${key}`);
  }

  /**
   * 모든 캐시 지우기
   */
  clear(): void {
    this.cache.clear();
    this.requestPromises.clear();
    console.log('🧹 전체 캐시 정리 완료');
  }

  /**
   * 캐시 통계
   */
  getStats() {
    const totalItems = this.cache.size;
    const staleItems = Array.from(this.cache.values()).filter(item => item.stale).length;
    const activeFetches = this.requestPromises.size;
    
    return {
      totalItems,
      staleItems,
      activeFetches,
      hitRate: totalItems > 0 ? ((totalItems - staleItems) / totalItems * 100).toFixed(1) : '0'
    };
  }
}

// 싱글톤 인스턴스
export const performanceCache = new PerformanceCache();

// 🎯 메인 페이지용 헬퍼 함수들
export const mainPageCache = {
  // 오늘의 메르 말씀
  async getTodayQuote() {
    return performanceCache.cachedFetch(
      PerformanceCache.CACHE_CONFIGS.TODAY_QUOTE,
      async () => {
        const res = await fetch('/api/today-merry-quote');
        if (!res.ok) throw new Error('Today quote fetch failed');
        return res.json();
      },
      { fallbackData: { quote: '투자는 마음가짐이다.', author: '메르' } }
    );
  },

  // 메르's Pick
  async getMerryPicks() {
    return performanceCache.cachedFetch(
      PerformanceCache.CACHE_CONFIGS.MERRY_PICKS,
      async () => {
        const res = await fetch('/api/merry/stocks?limit=5');
        if (!res.ok) throw new Error('Merry picks fetch failed');
        return res.json();
      },
      { fallbackData: { success: false, data: [] } }
    );
  },

  // 메르 블로그 포스트
  async getMerryPosts() {
    return performanceCache.cachedFetch(
      PerformanceCache.CACHE_CONFIGS.MERRY_POSTS,
      async () => {
        const res = await fetch('/api/merry/posts?limit=2');
        if (!res.ok) throw new Error('Merry posts fetch failed');
        return res.json();
      },
      { fallbackData: { success: false, data: [] } }
    );
  },

  // 성능 통계 확인
  getPerformanceStats() {
    return performanceCache.getStats();
  },

  // 특정 섹션 캐시 무효화
  invalidateSection(section: 'todayQuote' | 'merryPicks' | 'merryPosts') {
    const configMap = {
      todayQuote: PerformanceCache.CACHE_CONFIGS.TODAY_QUOTE.key,
      merryPicks: PerformanceCache.CACHE_CONFIGS.MERRY_PICKS.key,
      merryPosts: PerformanceCache.CACHE_CONFIGS.MERRY_POSTS.key,
    };
    performanceCache.invalidate(configMap[section]);
  }
};