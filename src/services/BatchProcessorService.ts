/**
 * 🚀 배치 처리 서비스 - 고성능 병렬 처리
 * 목표: 47개 종목을 순차 10초 → 배치 2초로 단축
 */

import { StockPriceService } from './StockPriceService';
import { cacheService } from './CacheService';
import { StockApiResponse } from '../types/stock';

interface BatchJob<T> {
  id: string;
  data: T;
  priority: number;
  createdAt: number;
}

interface BatchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
}

interface BatchStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageLatency: number;
  throughput: number; // jobs per second
}

export class BatchProcessorService {
  private stockPriceService: StockPriceService;
  private maxConcurrency = 10; // 동시 처리 최대 개수
  private batchSize = 20; // 배치 단위
  private retryAttempts = 3;
  private retryDelay = 1000; // ms
  
  private stats: BatchStats = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageLatency: 0,
    throughput: 0
  };

  private activeJobs = new Set<string>();
  private queue: BatchJob<any>[] = [];

  constructor() {
    this.stockPriceService = new StockPriceService();
  }

  /**
   * 🚀 대용량 종목 배치 처리 - 핵심 최적화 함수
   */
  async processStocksBatch(tickers: string[]): Promise<Record<string, StockApiResponse | null>> {
    const startTime = Date.now();
    console.log(`🚀 Starting batch processing for ${tickers.length} stocks`);

    // 1. 캐시에서 이미 있는 데이터 먼저 확인
    const cachedResults: Record<string, StockApiResponse | null> = {};
    const uncachedTickers: string[] = [];

    for (const ticker of tickers) {
      const cached = cacheService.getStockPrice(ticker);
      if (cached) {
        cachedResults[ticker] = cached;
      } else {
        uncachedTickers.push(ticker);
      }
    }

    console.log(`📦 Found ${Object.keys(cachedResults).length} cached, ${uncachedTickers.length} need fetching`);

    // 2. 비상장 종목 필터링
    const { validTickers, invalidTickers } = this.filterValidTickers(uncachedTickers);
    
    // 비상장 종목은 null로 처리
    invalidTickers.forEach(ticker => {
      cachedResults[ticker] = null;
    });

    // 3. 유효한 종목들을 배치로 병렬 처리
    if (validTickers.length > 0) {
      const batchResults = await this.parallelBatchProcess(
        validTickers,
        async (ticker: string) => this.fetchSingleStock(ticker),
        this.maxConcurrency
      );

      // 결과를 캐시에 저장하고 병합
      Object.entries(batchResults).forEach(([ticker, result]) => {
        if (result.success && result.data) {
          cacheService.setStockPrice(ticker, result.data);
          cachedResults[ticker] = result.data;
        } else {
          cachedResults[ticker] = null;
        }
      });
    }

    const totalTime = Date.now() - startTime;
    this.updateStats(tickers.length, totalTime);
    
    console.log(`✅ Batch completed in ${totalTime}ms (${this.stats.throughput.toFixed(1)} stocks/sec)`);
    return cachedResults;
  }

  /**
   * 병렬 배치 처리 - 동시성 제어
   */
  private async parallelBatchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    maxConcurrency: number
  ): Promise<Record<string, BatchResult<R>>> {
    const results: Record<string, BatchResult<R>> = {};
    const semaphore = new AsyncSemaphore(maxConcurrency);

    const promises = items.map(async (item) => {
      const itemKey = String(item);
      const startTime = Date.now();
      
      await semaphore.acquire();
      
      try {
        const data = await this.executeWithRetry(() => processor(item));
        results[itemKey] = {
          success: true,
          data,
          duration: Date.now() - startTime
        };
      } catch (error) {
        results[itemKey] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime
        };
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * 재시도 로직이 포함된 실행
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.retryAttempts
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        // 지수 백오프
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
        
        console.log(`🔄 Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);
      }
    }
    
    throw lastError!;
  }

  /**
   * 단일 종목 주가 조회
   */
  private async fetchSingleStock(ticker: string): Promise<StockApiResponse> {
    try {
      return await this.stockPriceService.getStockPrice(ticker, false);
    } catch (error) {
      console.error(`❌ Failed to fetch ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * 유효한 종목 필터링 (비상장 제외)
   */
  private filterValidTickers(tickers: string[]): {
    validTickers: string[];
    invalidTickers: string[];
  } {
    const nonPublicTickers = [
      'DeepSeek(중국)', 'BOE(중국)', 'CATL(중국)', 
      'Neuralink(미상장)', 'CIRCLE(미상장)', 'TETHER(미상장)', 
      '한수원(비상장)', 'SpaceX', 'OpenAI', 'Anthropic'
    ];

    const validTickers: string[] = [];
    const invalidTickers: string[] = [];

    tickers.forEach(ticker => {
      const isInvalid = nonPublicTickers.some(invalid => 
        ticker.includes(invalid) || 
        ticker.includes('미상장') || 
        ticker.includes('비상장') ||
        ticker.includes('중국') && !ticker.match(/^\d{6}$/) // 중국 종목 중 한국 코드가 아닌 것
      );

      if (isInvalid) {
        invalidTickers.push(ticker);
      } else {
        validTickers.push(ticker);
      }
    });

    console.log(`✅ Filtered: ${validTickers.length} valid, ${invalidTickers.length} invalid tickers`);
    return { validTickers, invalidTickers };
  }

  /**
   * 뉴스 배치 수집 최적화
   */
  async collectNewsBatch(sources: string[]): Promise<Record<string, any[]>> {
    const results: Record<string, any[]> = {};
    
    // 캐시 먼저 확인
    const cachedSources: string[] = [];
    const uncachedSources: string[] = [];

    sources.forEach(source => {
      const cached = cacheService.getNews(source);
      if (cached) {
        results[source] = cached;
        cachedSources.push(source);
      } else {
        uncachedSources.push(source);
      }
    });

    console.log(`📰 News cache: ${cachedSources.length} hit, ${uncachedSources.length} miss`);

    // 캐시되지 않은 소스들만 병렬로 수집
    if (uncachedSources.length > 0) {
      const batchResults = await this.parallelBatchProcess(
        uncachedSources,
        async (source: string) => this.fetchNewsFromSource(source),
        3 // 뉴스는 동시 3개만
      );

      // 결과를 캐시에 저장하고 병합
      Object.entries(batchResults).forEach(([source, result]) => {
        if (result.success && result.data) {
          cacheService.setNews(source, result.data);
          results[source] = result.data;
        } else {
          results[source] = [];
        }
      });
    }

    return results;
  }

  /**
   * 단일 뉴스 소스에서 수집
   */
  private async fetchNewsFromSource(source: string): Promise<any[]> {
    // 실제 뉴스 수집 로직은 기존 서비스 활용
    // 여기서는 구조만 정의
    console.log(`📡 Fetching news from ${source}`);
    
    // Mock implementation - 실제로는 뉴스 서비스 호출
    await this.sleep(500 + Math.random() * 1000); // 0.5-1.5초 시뮬레이션
    
    return [
      { title: `News from ${source}`, date: new Date().toISOString() }
    ];
  }

  /**
   * 감정 분석 배치 처리
   */
  async analyzeSentimentBatch(posts: any[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    // 캐시 확인
    const uncachedPosts = posts.filter(post => {
      const cached = cacheService.getSentiment(post.id);
      if (cached) {
        results[post.id] = cached;
        return false;
      }
      return true;
    });

    if (uncachedPosts.length > 0) {
      const batchResults = await this.parallelBatchProcess(
        uncachedPosts,
        async (post: any) => this.analyzeSinglePost(post),
        5 // 감정 분석은 동시 5개
      );

      Object.entries(batchResults).forEach(([postId, result]) => {
        if (result.success && result.data) {
          cacheService.setSentiment(postId, result.data);
          results[postId] = result.data;
        }
      });
    }

    return results;
  }

  /**
   * 단일 포스트 감정 분석
   */
  private async analyzeSinglePost(post: any): Promise<any> {
    // 실제 감정 분석 로직
    await this.sleep(200 + Math.random() * 300); // 0.2-0.5초 시뮬레이션
    
    return {
      sentiment: 'positive',
      confidence: 0.8,
      keywords: ['투자', '성장'],
      analyzedAt: Date.now()
    };
  }

  /**
   * 통계 업데이트
   */
  private updateStats(jobCount: number, totalTime: number): void {
    this.stats.totalJobs += jobCount;
    this.stats.completedJobs += jobCount;
    this.stats.averageLatency = totalTime / jobCount;
    this.stats.throughput = (jobCount / totalTime) * 1000; // jobs per second
  }

  /**
   * 배치 처리 통계 조회
   */
  getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * 동시성 설정 조정
   */
  configureConcurrency(maxConcurrency: number, batchSize?: number): void {
    this.maxConcurrency = maxConcurrency;
    if (batchSize) {
      this.batchSize = batchSize;
    }
    console.log(`⚙️ Concurrency set to ${maxConcurrency}, batch size: ${this.batchSize}`);
  }

  /**
   * 유틸리티: Sleep 함수
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 큐 상태 조회
   */
  getQueueStatus(): { active: number; pending: number } {
    return {
      active: this.activeJobs.size,
      pending: this.queue.length
    };
  }

  /**
   * 처리 중인 작업 취소
   */
  cancelAllJobs(): void {
    this.queue.length = 0;
    this.activeJobs.clear();
    console.log('🛑 All batch jobs cancelled');
  }
}

/**
 * 비동기 세마포어 - 동시성 제어
 */
class AsyncSemaphore {
  private permits: number;
  private waiting: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    
    if (this.waiting.length > 0) {
      this.permits--;
      const resolve = this.waiting.shift()!;
      resolve();
    }
  }
}

// 싱글톤 인스턴스
export const batchProcessor = new BatchProcessorService();