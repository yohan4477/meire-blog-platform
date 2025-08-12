/**
 * 통합 API 게이트웨이
 * 공공데이터와 주식 데이터를 하나의 일관된 API로 제공
 * 캐싱, rate limiting, 에러 처리, fallback 메커니즘 포함
 */

import { z } from 'zod';
import { PublicDataAPIClient, createPublicDataAPIClient } from '../external-apis/public-data-client';
import { StockDataAPIClient, createStockDataAPIClient } from '../external-apis/stock-data-client';

// 게이트웨이 응답 타입
export interface GatewayResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    processingTime: number;
    dataSource: string;
    cached: boolean;
    rateLimit?: {
      remaining: number;
      resetTime: string;
    };
  };
}

// 캐시 인터페이스
interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  flush(): Promise<void>;
}

// 메모리 캐시 구현 (Redis가 없는 경우 fallback)
class MemoryCache implements CacheProvider {
  private cache = new Map<string, { value: any; expiry: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 5분마다 만료된 캐시 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  async flush(): Promise<void> {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Rate Limiter
class RateLimiter {
  private requests = new Map<string, number[]>();

  constructor(
    private windowMs: number = 60000, // 1분
    private maxRequests: number = 100
  ) {}

  isAllowed(identifier: string): { allowed: boolean; remaining: number; resetTime: string } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // 기존 요청 기록 가져오기
    const userRequests = this.requests.get(identifier) || [];
    
    // 윈도우 밖의 요청 제거
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    // 요청 허용 여부 확인
    const allowed = validRequests.length < this.maxRequests;
    
    if (allowed) {
      validRequests.push(now);
      this.requests.set(identifier, validRequests);
    }
    
    const remaining = Math.max(0, this.maxRequests - validRequests.length);
    const resetTime = new Date(now + this.windowMs).toISOString();
    
    return { allowed, remaining, resetTime };
  }

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// 게이트웨이 설정
interface GatewayConfig {
  enableCaching: boolean;
  defaultCacheTTL: number;
  enableRateLimit: boolean;
  rateLimitWindow: number;
  rateLimitMax: number;
  enableFallback: boolean;
  requestTimeout: number;
}

// 메트릭 수집기
class MetricsCollector {
  private metrics = {
    requestCount: 0,
    successCount: 0,
    errorCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalResponseTime: 0,
    averageResponseTime: 0
  };

  recordRequest(): void {
    this.metrics.requestCount++;
  }

  recordSuccess(responseTime: number): void {
    this.metrics.successCount++;
    this.recordResponseTime(responseTime);
  }

  recordError(): void {
    this.metrics.errorCount++;
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  private recordResponseTime(responseTime: number): void {
    this.metrics.totalResponseTime += responseTime;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / (this.metrics.successCount || 1);
  }

  getMetrics() {
    return {
      ...this.metrics,
      errorRate: this.metrics.requestCount > 0 ? (this.metrics.errorCount / this.metrics.requestCount) * 100 : 0,
      cacheHitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0 
        ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 
        : 0
    };
  }

  reset(): void {
    Object.keys(this.metrics).forEach(key => {
      (this.metrics as any)[key] = 0;
    });
  }
}

// 메인 API 게이트웨이 클래스
export class APIGateway {
  private publicDataClient: PublicDataAPIClient;
  private stockDataClient: StockDataAPIClient;
  private cache: CacheProvider;
  private rateLimiter: RateLimiter;
  private metrics: MetricsCollector;
  private config: GatewayConfig;

  constructor(config: Partial<GatewayConfig> = {}) {
    this.config = {
      enableCaching: true,
      defaultCacheTTL: 300, // 5분
      enableRateLimit: true,
      rateLimitWindow: 60000, // 1분
      rateLimitMax: 100,
      enableFallback: true,
      requestTimeout: 30000, // 30초
      ...config
    };

    this.publicDataClient = createPublicDataAPIClient();
    this.stockDataClient = createStockDataAPIClient();
    this.cache = new MemoryCache(); // TODO: Redis로 교체 가능
    this.rateLimiter = new RateLimiter(this.config.rateLimitWindow, this.config.rateLimitMax);
    this.metrics = new MetricsCollector();

    // 정기적으로 rate limiter 정리
    setInterval(() => {
      this.rateLimiter.cleanup();
    }, this.config.rateLimitWindow);
  }

  /**
   * 통합 주식 시세 조회
   */
  async getStockQuote(symbol: string, clientId: string = 'anonymous'): Promise<GatewayResponse<any>> {
    return this.executeRequest(
      `stock_quote_${symbol}`,
      clientId,
      async () => {
        const quote = await this.stockDataClient.getQuote(symbol);
        return { ...quote, dataSource: 'stock_api' };
      },
      300 // 5분 캐시
    );
  }

  /**
   * 여러 종목 시세 일괄 조회
   */
  async getMultipleStockQuotes(symbols: string[], clientId: string = 'anonymous'): Promise<GatewayResponse<any[]>> {
    const cacheKey = `multiple_quotes_${symbols.sort().join('_')}`;
    
    return this.executeRequest(
      cacheKey,
      clientId,
      async () => {
        const quotes = await this.stockDataClient.getMultipleQuotes(symbols);
        return quotes.map(quote => ({ ...quote, dataSource: 'stock_api' }));
      },
      180 // 3분 캐시 (더 자주 업데이트)
    );
  }

  /**
   * 국민연금 투자현황 조회
   */
  async getNPSInvestmentData(params: any = {}, clientId: string = 'anonymous'): Promise<GatewayResponse<any[]>> {
    const cacheKey = `nps_investment_${JSON.stringify(params)}`;
    
    return this.executeRequest(
      cacheKey,
      clientId,
      async () => {
        const data = await this.publicDataClient.getNPSInvestmentData(params);
        return data.map(item => ({ ...item, dataSource: 'nps_api' }));
      },
      3600 // 1시간 캐시
    );
  }

  /**
   * 한국거래소 시장 데이터 조회
   */
  async getKRXMarketData(params: any = {}, clientId: string = 'anonymous'): Promise<GatewayResponse<any[]>> {
    const cacheKey = `krx_market_${JSON.stringify(params)}`;
    
    return this.executeRequest(
      cacheKey,
      clientId,
      async () => {
        const data = await this.publicDataClient.getKRXMarketData(params);
        return data.map(item => ({ ...item, dataSource: 'krx_api' }));
      },
      1800 // 30분 캐시
    );
  }

  /**
   * 금융감독원 공시 데이터 조회
   */
  async getFSSDisclosureData(params: any = {}, clientId: string = 'anonymous'): Promise<GatewayResponse<any[]>> {
    const cacheKey = `fss_disclosure_${JSON.stringify(params)}`;
    
    return this.executeRequest(
      cacheKey,
      clientId,
      async () => {
        const data = await this.publicDataClient.getFSSDisclosureData(params);
        return data.map(item => ({ ...item, dataSource: 'fss_api' }));
      },
      1800 // 30분 캐시
    );
  }

  /**
   * 기업 재무제표 조회
   */
  async getCompanyFinancials(symbol: string, reportType: 'annual' | 'quarterly' = 'annual', clientId: string = 'anonymous'): Promise<GatewayResponse<any[]>> {
    const cacheKey = `financials_${symbol}_${reportType}`;
    
    return this.executeRequest(
      cacheKey,
      clientId,
      async () => {
        const data = await this.stockDataClient.getFinancials(symbol, reportType);
        return data.map(item => ({ ...item, dataSource: 'financial_api' }));
      },
      86400 // 24시간 캐시
    );
  }

  /**
   * 주식 관련 뉴스 조회
   */
  async getStockNews(symbol: string, clientId: string = 'anonymous'): Promise<GatewayResponse<any[]>> {
    const cacheKey = `stock_news_${symbol}`;
    
    return this.executeRequest(
      cacheKey,
      clientId,
      async () => {
        const data = await this.stockDataClient.getNews(symbol);
        return data.map(item => ({ ...item, dataSource: 'news_api' }));
      },
      900 // 15분 캐시
    );
  }

  /**
   * 과거 주가 데이터 조회
   */
  async getHistoricalPrices(symbol: string, period: string = '1y', clientId: string = 'anonymous'): Promise<GatewayResponse<any[]>> {
    const cacheKey = `historical_${symbol}_${period}`;
    
    return this.executeRequest(
      cacheKey,
      clientId,
      async () => {
        const data = await this.stockDataClient.getHistoricalPrices(symbol, period);
        return data.map(item => ({ ...item, dataSource: 'stock_api' }));
      },
      7200 // 2시간 캐시
    );
  }

  /**
   * 통합 포트폴리오 분석 (여러 데이터 소스 조합)
   */
  async getPortfolioAnalysis(symbols: string[], clientId: string = 'anonymous'): Promise<GatewayResponse<any>> {
    const cacheKey = `portfolio_analysis_${symbols.sort().join('_')}`;
    
    return this.executeRequest(
      cacheKey,
      clientId,
      async () => {
        // 병렬로 여러 데이터 조회
        const [quotes, npsData] = await Promise.allSettled([
          this.stockDataClient.getMultipleQuotes(symbols),
          this.publicDataClient.getNPSInvestmentData({ numOfRows: 100 })
        ]);

        const result: any = {
          dataSource: 'integrated_analysis',
          stocks: quotes.status === 'fulfilled' ? quotes.value : [],
          npsInvestments: npsData.status === 'fulfilled' ? npsData.value : [],
          analysisTimestamp: new Date().toISOString()
        };

        // 국민연금과의 포트폴리오 비교 분석
        if (quotes.status === 'fulfilled' && npsData.status === 'fulfilled') {
          result.npsComparison = this.analyzeNPSComparison(quotes.value, npsData.value);
        }

        return result;
      },
      600 // 10분 캐시
    );
  }

  /**
   * 시스템 상태 확인
   */
  async getHealthStatus(): Promise<GatewayResponse<any>> {
    const startTime = Date.now();
    
    try {
      const [publicDataHealth, stockDataHealth] = await Promise.allSettled([
        this.publicDataClient.healthCheck(),
        this.stockDataClient.healthCheck()
      ]);

      const result = {
        gateway: {
          status: 'healthy',
          uptime: process.uptime(),
          version: '1.0.0'
        },
        publicDataAPIs: publicDataHealth.status === 'fulfilled' ? publicDataHealth.value : { error: 'Health check failed' },
        stockDataAPIs: stockDataHealth.status === 'fulfilled' ? stockDataHealth.value : { error: 'Health check failed' },
        metrics: this.metrics.getMetrics(),
        cache: {
          type: 'memory', // TODO: Redis 정보로 업데이트
          status: 'connected'
        }
      };

      return {
        success: true,
        data: result,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          dataSource: 'system',
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'System health check failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          dataSource: 'system',
          cached: false
        }
      };
    }
  }

  /**
   * 캐시 관리
   */
  async clearCache(pattern?: string): Promise<void> {
    if (pattern) {
      // TODO: 패턴 매칭 캐시 삭제 구현
      console.warn('Pattern-based cache clearing not implemented for memory cache');
    } else {
      await this.cache.flush();
    }
  }

  /**
   * 메트릭 조회
   */
  getMetrics() {
    return this.metrics.getMetrics();
  }

  /**
   * 메트릭 리셋
   */
  resetMetrics(): void {
    this.metrics.reset();
  }

  // Private 헬퍼 메서드들

  private async executeRequest<T>(
    cacheKey: string,
    clientId: string,
    operation: () => Promise<T>,
    cacheTTL: number = this.config.defaultCacheTTL
  ): Promise<GatewayResponse<T>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    this.metrics.recordRequest();

    try {
      // Rate limiting 확인
      if (this.config.enableRateLimit) {
        const rateLimitResult = this.rateLimiter.isAllowed(clientId);
        if (!rateLimitResult.allowed) {
          return {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please try again later.',
              details: { resetTime: rateLimitResult.resetTime }
            },
            metadata: {
              requestId,
              timestamp: new Date().toISOString(),
              processingTime: Date.now() - startTime,
              dataSource: 'gateway',
              cached: false,
              rateLimit: {
                remaining: rateLimitResult.remaining,
                resetTime: rateLimitResult.resetTime
              }
            }
          };
        }
      }

      // 캐시 확인
      let cached = false;
      let data: T | null = null;

      if (this.config.enableCaching) {
        data = await this.cache.get<T>(cacheKey);
        if (data !== null) {
          cached = true;
          this.metrics.recordCacheHit();
        } else {
          this.metrics.recordCacheMiss();
        }
      }

      // 캐시 미스인 경우 실제 API 호출
      if (!cached) {
        data = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), this.config.requestTimeout)
          )
        ]);

        // 결과 캐싱
        if (this.config.enableCaching && data !== null) {
          await this.cache.set(cacheKey, data, cacheTTL);
        }
      }

      const processingTime = Date.now() - startTime;
      this.metrics.recordSuccess(processingTime);

      return {
        success: true,
        data: data || undefined,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime,
          dataSource: cached ? 'cache' : 'api',
          cached
        }
      };

    } catch (error) {
      this.metrics.recordError();
      
      return {
        success: false,
        error: {
          code: 'OPERATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error instanceof Error ? { name: error.name, stack: error.stack } : undefined
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          dataSource: 'gateway',
          cached: false
        }
      };
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private analyzeNPSComparison(stocks: any[], npsInvestments: any[]): any {
    // 간단한 NPS 비교 분석 로직
    const analysis = {
      commonHoldings: [],
      uniqueHoldings: [],
      weightComparison: {}
    };

    // 공통 보유 종목 찾기
    for (const stock of stocks) {
      const npsHolding = npsInvestments.find(nps => 
        nps.stockCode === stock.symbol || 
        nps.stockName?.includes(stock.companyName?.split(' ')[0])
      );
      
      if (npsHolding) {
        analysis.commonHoldings.push({
          symbol: stock.symbol,
          companyName: stock.companyName,
          currentPrice: stock.price,
          npsMarketValue: npsHolding.marketValue,
          npsRatio: npsHolding.ratio
        });
      } else {
        analysis.uniqueHoldings.push({
          symbol: stock.symbol,
          companyName: stock.companyName,
          currentPrice: stock.price
        });
      }
    }

    return analysis;
  }
}

// 싱글톤 게이트웨이 인스턴스
let gatewayInstance: APIGateway | null = null;

export function getAPIGateway(config?: Partial<GatewayConfig>): APIGateway {
  if (!gatewayInstance) {
    gatewayInstance = new APIGateway(config);
  }
  return gatewayInstance;
}

// 환경 변수 검증
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = [
    'NPS_API_KEY',
    'KRX_API_KEY', 
    'FSS_API_KEY',
    'ALPHA_VANTAGE_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  return {
    valid: missing.length === 0,
    missing
  };
}