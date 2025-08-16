import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
// NOTE: StockDB require 제거로 성능 개선 (getStockMentions 최적화 함수 사용)
import { performantDb, getStockMentions } from '../../../../lib/db-performance';
import { edgeCache, setCacheHeaders, CACHE_KEYS, CACHE_TAGS } from '../../../../lib/edge-cache';

// 다중 레벨 캐시 저장소
let stocksCache: {
  data: any[];
  timestamp: number;
  hitCount: number;
  missCount: number;
} | null = null;

let priceCache = new Map<string, {
  data: any;
  timestamp: number;
}>();

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12시간 (밀리초)
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5분 (실시간 가격)

// 캐시 성능 메트릭
function getCacheMetrics() {
  const total = (stocksCache?.hitCount || 0) + (stocksCache?.missCount || 0);
  const hitRate = total > 0 ? (stocksCache?.hitCount || 0) / total : 0;
  return { hitRate, total, hits: stocksCache?.hitCount || 0, misses: stocksCache?.missCount || 0 };
}

// 캐시된 가격 데이터 가져오기
async function getCachedStockPrice(ticker: string, market: string) {
  const cacheKey = `${ticker}_${market}`;
  const now = Date.now();
  
  // 캐시 확인
  if (priceCache.has(cacheKey)) {
    const cached = priceCache.get(cacheKey)!;
    if ((now - cached.timestamp) < PRICE_CACHE_TTL) {
      console.log(`💾 Using cached price for ${ticker}`);
      return cached.data;
    } else {
      priceCache.delete(cacheKey);
    }
  }
  
  // 캐시 미스 - 새로운 데이터 가져오기 (타임아웃 추가)
  const priceData = await getStockPrice(ticker, market);
  
  // 성공한 경우에만 캐시 저장
  if (priceData) {
    priceCache.set(cacheKey, {
      data: priceData,
      timestamp: now
    });
  }
  
  return priceData;
}

// 실제 주가 데이터를 가져오는 함수 (타임아웃 최적화)
async function getStockPrice(ticker: string, market: string) {
  try {
    // Yahoo Finance에서 실제 가격 가져오기
    const isKoreanStock = ticker.length === 6 && !isNaN(Number(ticker));
    const symbol = isKoreanStock ? `${ticker}.KS` : ticker;
    
    // 타임아웃 추가로 성능 개선
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3초 타임아웃
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${Math.floor(Date.now() / 1000) - 86400}&period2=${Math.floor(Date.now() / 1000)}&interval=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal,
        next: { revalidate: 300 } // 5분 캐시
      }
    );
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (result?.meta) {
        const currentPrice = result.meta.regularMarketPrice;
        const previousClose = result.meta.chartPreviousClose || result.meta.regularMarketPreviousClose;
        const currency = result.meta.currency;
        
        if (currentPrice && previousClose) {
          const changeAmount = currentPrice - previousClose;
          const changePercent = ((changeAmount / previousClose) * 100).toFixed(2);
          const changeSign = changeAmount >= 0 ? '+' : '';
          
          return {
            current: isKoreanStock ? Math.round(currentPrice) : parseFloat(currentPrice.toFixed(2)),
            currency: currency === 'KRW' ? 'KRW' : 'USD',
            change: `${changeSign}${changePercent}%`
          };
        }
      }
    }
    
    // API 실패 시 null 반환 (모의 데이터 사용하지 않음)
    console.warn(`⚠️ Failed to fetch real price for ${ticker}, using null`);
    return null;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`⏱️ Price fetch timeout for ${ticker}`);
    } else {
      console.error(`❌ Error fetching price for ${ticker}:`, error);
    }
    return null;
  }
}

// 종목 데이터 로드 함수 (지능형 캐시 적용)
async function loadStocksData(): Promise<any[]> {
  const now = Date.now();
  
  // 캐시가 유효한 경우 캐시 데이터 반환
  if (stocksCache && (now - stocksCache.timestamp) < CACHE_TTL) {
    console.log('🎯 Cache HIT for merry:picks:latest (0ms)');
    stocksCache.hitCount = (stocksCache.hitCount || 0) + 1;
    
    // 캐시 성능 모니터링
    const metrics = getCacheMetrics();
    if (metrics.hitRate < 0.8 && metrics.total > 5) {
      console.warn(`🚨 Performance Alert: cacheHitRate = ${metrics.hitRate.toFixed(1)} (threshold: 0.8)`);
    }
    
    return stocksCache.data;
  }
  
  console.log('💾 Cache MISS for merry:picks:latest, fetching...');
  console.log('🔄 Loading fresh stocks data from SQLite DB');
  
  // 캐시 미스 카운트 증가
  if (stocksCache) {
    stocksCache.missCount = (stocksCache.missCount || 0) + 1;
  }
  
  let stockData = [];
  
  try {
    // PERFORMANCE OPTIMIZED: Use high-performance singleton with caching
    console.log('🚀 Using optimized high-performance database connection');
    stockData = await getStockMentions(10);
    
    console.log(`✅ DB에서 ${stockData.length}개 종목 로드 완료 (최적화된 방식)`);
  } catch (error) {
    console.error('종목 데이터 파일 읽기 실패, fallback 데이터 사용');
    // fallback 데이터
    stockData = [
      { 
        ticker: 'TSLA', 
        name: '테슬라', 
        company_name: '테슬라',
        market: 'NASDAQ',
        mention_count: 28,
        analyzed_count: 3,
        last_mentioned_at: '2025-08-07 07:59:00',
        sentiment: 'positive',
        tags: '["전기차", "자율주행", "AI", "배터리", "미래차"]',
        description: '일론 머스크가 이끄는 전기차와 자율주행 기술의 글로벌 선도기업'
      }
    ];
  }

  // 병렬 가격 가져오기 최적화 (타임아웃 제한)
  const pricePromises = stockData.map(async (stock) => {
    try {
      const priceData = await getCachedStockPrice(stock.ticker, stock.market);
      
      if (priceData) {
        stock.currentPrice = priceData.current;
        stock.currency = priceData.currency;
        stock.priceChange = priceData.change;
      } else {
        // 실제 가격을 가져올 수 없는 경우
        stock.currentPrice = null;
        stock.currency = stock.market === 'KOSPI' || stock.market === 'KOSDAQ' || stock.market === 'KRX' ? 'KRW' : 'USD';
        stock.priceChange = null;
      }
      
      // 데이터 일관성 확보
      stock.name = stock.company_name || stock.name;
      stock.mentions = stock.mention_count;
      stock.lastMention = stock.last_mentioned_at;
      
      // 🔧 tags JSON 문자열을 배열로 변환
      if (stock.tags && typeof stock.tags === 'string') {
        try {
          stock.tags = JSON.parse(stock.tags);
        } catch (error) {
          console.warn(`Failed to parse tags for ${stock.ticker}:`, error);
          stock.tags = [];
        }
      } else if (!Array.isArray(stock.tags)) {
        stock.tags = [];
      }
      
      return stock;
    } catch (error) {
      console.warn(`⚠️ Error processing stock ${stock.ticker}:`, error);
      return stock;
    }
  });

  // 모든 가격 정보를 병렬로 가져오기 (Promise.allSettled로 안정성 확보)
  const results = await Promise.allSettled(pricePromises);
  stockData = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);

  // 캐시 업데이트
  stocksCache = {
    data: stockData,
    timestamp: now,
    hitCount: stocksCache?.hitCount || 0,
    missCount: (stocksCache?.missCount || 0) + 1
  };
  
  console.log(`✅ Cached ${stockData.length} stocks data for 12 hours`);
  return stockData;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const performanceMetrics = {
    dbQueryTime: 0,
    priceApiTime: 0,
    totalResponseTime: 0,
    cacheMetrics: null,
    itemsReturned: 0,
    cacheStatus: 'MISS',
    optimizationLevel: 'ULTRA_PERFORMANCE'
  };

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const tag = searchParams.get('tag');
    const market = searchParams.get('market');
    const sentiment = searchParams.get('sentiment');
    const offset = (page - 1) * limit;

    // ULTRA PERFORMANCE: Edge cache + optimized DB
    const cacheKey = CACHE_KEYS.MERRY_PICKS();
    const dbQueryStart = Date.now();
    
    const result = await edgeCache.getOrSet(
      cacheKey,
      () => loadStocksData(),
      {
        ttl: 300, // 5 minutes
        tags: [CACHE_TAGS.STOCKS, CACHE_TAGS.MERRY]
      }
    );
    
    let stockData = result.data;
    performanceMetrics.dbQueryTime = Date.now() - dbQueryStart;
    performanceMetrics.cacheStatus = result.cached ? 'HIT' : 'MISS';

    // 캐시 메트릭 수집
    performanceMetrics.cacheMetrics = getCacheMetrics();

    // 최신 언급일 기준 정렬 (last_mentioned_at DESC, mention_count DESC)
    stockData.sort((a, b) => {
      // 최신 언급일 기준 먼저
      const dateA = new Date(a.last_mentioned_at).getTime();
      const dateB = new Date(b.last_mentioned_at).getTime();
      if (dateA !== dateB) {
        return dateB - dateA; // 최신 언급일 내림차순
      }
      // 같은 날짜면 언급 횟수 기준
      return b.mention_count - a.mention_count;
    });

    // 필터링
    if (tag) {
      stockData = stockData.filter(stock => 
        stock.tags && stock.tags.some(t => t.includes(tag))
      );
    }
    
    if (market && market !== 'all') {
      stockData = stockData.filter(stock => stock.market === market);
    }
    
    if (sentiment && sentiment !== 'all') {
      stockData = stockData.filter(stock => stock.sentiment === sentiment);
    }

    // 페이지네이션 적용
    const paginatedStocks = stockData.slice(offset, offset + limit);
    performanceMetrics.itemsReturned = paginatedStocks.length;

    // 총 응답 시간 계산
    performanceMetrics.totalResponseTime = Date.now() - startTime;

    // 성능 경고 (목표: <500ms)
    if (performanceMetrics.totalResponseTime > 500) {
      console.warn(`⚠️ PERFORMANCE WARNING: Response time ${performanceMetrics.totalResponseTime}ms exceeds 500ms target`);
    }

    // 성능 로그 (개발 환경에서만)
    console.log(`📊 Performance Metrics:`, {
      ...performanceMetrics,
      target: '< 500ms',
      status: performanceMetrics.totalResponseTime < 500 ? '✅ GOOD' : '❌ SLOW'
    });

    const response = NextResponse.json({
      success: true,
      data: {
        stocks: paginatedStocks,
        total: stockData.length,
        page,
        limit,
        hasMore: offset + limit < stockData.length
      }
    });
    
    // Set optimized cache headers
    return setCacheHeaders(response, {
      ttl: 300, // 5 minutes
      staleWhileRevalidate: 600, // 10 minutes SWR
      tags: [CACHE_TAGS.STOCKS, CACHE_TAGS.MERRY]
    });

  } catch (error) {
    performanceMetrics.totalResponseTime = Date.now() - startTime;
    console.error('💥 종목 조회 오류:', error);
    console.error(`💥 Error Response Time: ${performanceMetrics.totalResponseTime}ms`);
    
    const errorResponse = NextResponse.json({
      success: false,
      error: { message: '종목 데이터 조회 실패', details: error.message }
    }, { status: 500 });
    
    // No cache on errors
    errorResponse.headers.set('Cache-Control', 'no-store');
    return errorResponse;
  }
}