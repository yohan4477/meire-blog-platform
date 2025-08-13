import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
const StockDB = require('../../../../lib/stock-db-sqlite3.js');

// 캐시 저장소
let stocksCache: {
  data: any[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 12 * 60 * 60 * 1000; // 12시간 (밀리초)

// 실제 주가 데이터를 가져오는 함수
async function getStockPrice(ticker: string, market: string) {
  try {
    // Yahoo Finance에서 실제 가격 가져오기
    const isKoreanStock = ticker.length === 6 && !isNaN(Number(ticker));
    const symbol = isKoreanStock ? `${ticker}.KS` : ticker;
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${Math.floor(Date.now() / 1000) - 86400}&period2=${Math.floor(Date.now() / 1000)}&interval=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

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
    console.error(`❌ Error fetching price for ${ticker}:`, error);
    return null;
  }
}

// 종목 데이터 로드 함수 (캐시 적용)
async function loadStocksData(): Promise<any[]> {
  const now = Date.now();
  
  // 캐시가 유효한 경우 캐시 데이터 반환
  if (stocksCache && (now - stocksCache.timestamp) < CACHE_TTL) {
    console.log('📦 Using cached stocks data');
    return stocksCache.data;
  }
  
  console.log('🔄 Loading fresh stocks data from SQLite DB');
  
  // DB에서 메르's Pick 데이터 로드
  const stockDB = new StockDB();
  let stockData = [];
  
  try {
    // 메르가 언급한 종목들을 최근 언급일 기준으로 가져오기
    stockData = await stockDB.getMerryPickStocks(10);
    console.log(`✅ DB에서 ${stockData.length}개 종목 로드 완료`);
  } catch (error) {
    console.error('종목 데이터 파일 읽기 실패, fallback 데이터 사용');
    // fallback 데이터
    stockData = [
      { 
        ticker: 'TSLA', 
        name: '테슬라', 
        market: 'NASDAQ',
        postCount: 42,
        firstMention: '2024-12-20',
        lastMention: '2025-08-09',
        sentiment: 'positive',
        tags: ['전기차', 'AI', '자율주행'],
        description: '일론 머스크가 이끄는 전기차와 자율주행 기술의 글로벌 선도기업',
        recentPosts: []
      }
    ];
  }

  // 주가 정보 추가
  for (let stock of stockData) {
    const priceData = await getStockPrice(stock.ticker, stock.market);
    
    if (priceData) {
      stock.currentPrice = priceData.current;
      stock.currency = priceData.currency;
      stock.priceChange = priceData.change;
    } else {
      // 실제 가격을 가져올 수 없는 경우
      stock.currentPrice = null;
      stock.currency = stock.market === 'KOSPI' || stock.market === 'KOSDAQ' ? 'KRW' : 'USD';
      stock.priceChange = null;
    }
    
    // mentions를 postCount로 변경
    if (stock.postCount) {
      stock.mentions = stock.postCount;
    }
  }

  // 캐시 업데이트
  stocksCache = {
    data: stockData,
    timestamp: now
  };
  
  console.log(`✅ Cached ${stockData.length} stocks data for 12 hours`);
  return stockData;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const tag = searchParams.get('tag');
    const market = searchParams.get('market');
    const sentiment = searchParams.get('sentiment');
    const offset = (page - 1) * limit;

    // 캐시된 종목 데이터 로드
    let stockData = await loadStocksData();

    // 최근 언급 순서로 정렬 (CLAUDE.md 요구사항: 메르's Pick - 최근 언급 순서)
    stockData.sort((a, b) => {
      const dateA = new Date(a.lastMention).getTime();
      const dateB = new Date(b.lastMention).getTime();
      return dateB - dateA; // 내림차순 (최근 날짜가 먼저)
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

    return NextResponse.json({
      success: true,
      data: {
        stocks: paginatedStocks,
        total: stockData.length,
        page,
        limit,
        hasMore: offset + limit < stockData.length
      }
    });

  } catch (error) {
    console.error('종목 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: { message: '종목 데이터 조회 실패' }
    }, { status: 500 });
  }
}