import { NextRequest, NextResponse } from 'next/server';
const StockDB = require('../../../../../lib/stock-db-sqlite3.js');

// 티커 매핑 테이블 - 잘못된 티커를 올바른 티커로 수정
const TICKER_MAPPING: Record<string, string> = {
  'OCLR': 'OKLO', // Oklo Inc - 잘못된 티커 OCLR을 올바른 OKLO로 매핑
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: rawTicker } = await params;
    let ticker = rawTicker.toUpperCase();
    
    // 티커 매핑 확인 및 변경
    const originalTicker = ticker;
    if (TICKER_MAPPING[ticker]) {
      ticker = TICKER_MAPPING[ticker];
      console.log(`🔄 Ticker mapping: ${originalTicker} → ${ticker}`);
    }
    
    console.log(`📊 Fetching stock data for: ${ticker}`);
    
    const stockDB = new StockDB();
    await stockDB.connect();
    
    // 종목 기본 정보 가져오기 - 간단한 버전
    const stockInfo = await stockDB.getStockByTicker(ticker);
    console.log(`🔍 stockInfo for ${ticker}:`, stockInfo);
    
    // stockInfo가 없어도 기본 정보로 처리
    const basicInfo = stockInfo || {
      ticker: ticker,
      company_name: ticker,
      market: ticker.length === 6 ? 'KOSPI' : 'NASDAQ',
      currency: ticker.length === 6 ? 'KRW' : 'USD',
      mention_count: 0,
      is_merry_mentioned: 0,
      description: `${ticker} 종목`,
      tags: ''
    };
    
    // 한국 주식 currency 강제 수정 (DB에 잘못 저장된 경우 대비)
    const isKoreanStock = ticker.length === 6 && !isNaN(Number(ticker));
    if (isKoreanStock && basicInfo.currency !== 'KRW') {
      console.log(`🔧 Fixing currency for Korean stock ${ticker}: ${basicInfo.currency} → KRW`);
      basicInfo.currency = 'KRW';
    }
    
    // 가격 데이터 가져오기 (6개월)
    const priceData = await stockDB.getStockPrices(ticker, '6mo');
    
    // 메르 언급 정보 가져오기
    const mentions = await stockDB.getMerryMentions(ticker);
    
    // 관련 포스트 가져오기
    let relatedPosts = { posts: [], total: 0 };
    try {
      relatedPosts = await stockDB.getRelatedPosts(ticker, 10, 0);
    } catch (error) {
      console.log('관련 포스트 조회 실패, 빈 배열 사용');
    }
    
    // 감정 분석 개수 가져오기 (post_stock_analysis 테이블)
    let analyzedCount = 0;
    try {
      const analyzedResult = await new Promise<any>((resolve, reject) => {
        stockDB.db.get(
          'SELECT COUNT(*) as count FROM post_stock_analysis WHERE ticker = ?',
          [ticker],
          (err: any, row: any) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      analyzedCount = analyzedResult?.count || 0;
      console.log(`📊 Found ${analyzedCount} analyzed posts for ${ticker}`);
    } catch (error) {
      console.log('감정 분석 개수 조회 실패:', error);
    }
    
    // 실시간 가격 정보 가져오기 (실패 시 종가 데이터로 폴백)
    let priceInfo = { currentPrice: 0, priceChange: '+0.00%' };
    let useRealTimePrice = false;
    
    try {
      console.log(`💰 Fetching real-time price for ${ticker}...`);
      const isKoreanStock = ticker.length === 6 && !isNaN(Number(ticker));
      const symbol = isKoreanStock ? `${ticker}.KS` : ticker;
      
      const priceResponse = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${Math.floor(Date.now() / 1000) - 86400}&period2=${Math.floor(Date.now() / 1000)}&interval=1d`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          next: { revalidate: 300 }
        }
      );
      
      if (priceResponse.ok) {
        const responseText = await priceResponse.text();
        
        // Check if response is empty or invalid JSON
        if (!responseText || responseText.trim() === '') {
          console.warn(`⚠️ Empty response from Yahoo Finance for ${ticker}`);
          throw new Error('Empty response from Yahoo Finance');
        }
        
        let priceData;
        try {
          priceData = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`❌ JSON parsing failed for ${ticker}:`, responseText.substring(0, 200));
          throw new Error('Invalid JSON response from Yahoo Finance');
        }
        
        const result = priceData.chart?.result?.[0];
        
        if (result?.meta) {
          const currentPrice = result.meta.regularMarketPrice;
          const previousClose = result.meta.chartPreviousClose || result.meta.regularMarketPreviousClose;
          
          if (currentPrice && previousClose) {
            const changeAmount = currentPrice - previousClose;
            const changePercent = ((changeAmount / previousClose) * 100).toFixed(2);
            const changeSign = changeAmount >= 0 ? '+' : '';
            
            priceInfo = {
              currentPrice: isKoreanStock ? Math.round(currentPrice) : parseFloat(currentPrice.toFixed(2)),
              priceChange: `${changeSign}${changePercent}%`
            };
            useRealTimePrice = true;
            console.log(`✅ Real-time price for ${ticker}: ${priceInfo.currentPrice} (${priceInfo.priceChange})`);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch real-time price for ${ticker}:`, error instanceof Error ? error.message : 'Unknown error');
    }
    
    // 실시간 가격 실패 시 종가 데이터로 폴백
    if (!useRealTimePrice && priceData.length >= 2) {
      console.log(`🔄 Using historical price data as fallback for ${ticker}`);
      const sortedPriceData = [...priceData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const latest = sortedPriceData[sortedPriceData.length - 1];
      const previous = sortedPriceData[sortedPriceData.length - 2];
      
      const changeAmount = latest.close_price - previous.close_price;
      const changePercent = ((changeAmount / previous.close_price) * 100).toFixed(2);
      const changeSign = changeAmount >= 0 ? '+' : '';
      
      const isKoreanStock = ticker.length === 6 && !isNaN(Number(ticker));
      priceInfo = {
        currentPrice: isKoreanStock ? Math.round(latest.close_price) : parseFloat(latest.close_price.toFixed(2)),
        priceChange: `${changeSign}${changePercent}%`
      };
      console.log(`✅ Fallback price for ${ticker}: ${priceInfo.currentPrice} (${priceInfo.priceChange}) from ${latest.date}`);
    }

    // first_mentioned_date fallback 로직 구현
    let firstMentionDate = basicInfo.first_mentioned_date;
    
    // stocks DB에 first_mentioned_date가 없거나 빈 값인 경우 blog_posts에서 찾기
    if (!firstMentionDate) {
      try {
        console.log(`🔍 Finding earliest blog post mention for ${ticker}...`);
        
        // 한국 종목인지 확인
        const isKoreanStock = ticker.length === 6 && !isNaN(Number(ticker));
        let searchTerms = [ticker];
        
        // 티커에 따른 회사명 검색어 추가
        if (basicInfo.company_name && basicInfo.company_name !== ticker) {
          searchTerms.push(basicInfo.company_name);
        }
        
        // 한국 주요 종목의 추가 검색어
        const koreanStockNames: Record<string, string[]> = {
          '005930': ['삼성전자', '삼성'],
          '000660': ['SK하이닉스', '하이닉스'],
          '035420': ['네이버', 'NAVER']
        };
        
        // 미국 주요 종목의 추가 검색어
        const usStockNames: Record<string, string[]> = {
          'TSLA': ['테슬라', 'Tesla'],
          'NVDA': ['엔비디아', 'NVIDIA'],
          'GOOGL': ['구글', 'Google', '알파벳', 'Alphabet'],
          'MSFT': ['마이크로소프트', 'Microsoft'],
          'AAPL': ['애플', 'Apple']
        };
        
        if (isKoreanStock && koreanStockNames[ticker]) {
          searchTerms = searchTerms.concat(koreanStockNames[ticker]);
        } else if (usStockNames[ticker]) {
          searchTerms = searchTerms.concat(usStockNames[ticker]);
        }
        
        // 검색 쿼리 생성
        const titleConditions = searchTerms.map(term => `title LIKE '%${term}%'`).join(' OR ');
        const contentConditions = searchTerms.map(term => `content LIKE '%${term}%'`).join(' OR ');
        
        const earliestPostQuery = `
          SELECT MIN(created_date) as earliest_date 
          FROM blog_posts 
          WHERE (${titleConditions}) OR (${contentConditions})
          ORDER BY created_date 
          LIMIT 1
        `;
        
        const earliestPostResult = await new Promise<any>((resolve, reject) => {
          stockDB.db.get(earliestPostQuery, (err: any, row: any) => {
            if (err) {
              console.error('Earliest post query error:', err);
              reject(err);
            } else {
              resolve(row);
            }
          });
        });
        
        if (earliestPostResult?.earliest_date) {
          firstMentionDate = earliestPostResult.earliest_date;
          console.log(`✅ Found fallback first mention date for ${ticker}: ${firstMentionDate}`);
        } else {
          console.log(`⚠️ No fallback first mention date found for ${ticker}`);
        }
        
      } catch (error) {
        console.warn(`⚠️ Failed to get fallback first mention date for ${ticker}:`, error);
      }
    }

    // 응답 데이터 구성 - 실시간 가격 포함
    const responseData = {
      success: true,
      data: {
        ticker: basicInfo.ticker,
        name: basicInfo.company_name || ticker,
        market: basicInfo.market,
        currentPrice: priceInfo.currentPrice,
        priceChange: priceInfo.priceChange,
        currency: basicInfo.currency,
        description: basicInfo.description || `${basicInfo.company_name || ticker} 종목`,
        tags: basicInfo.tags ? (typeof basicInfo.tags === 'string' ? JSON.parse(basicInfo.tags) : basicInfo.tags) : [],
        
        // 차트 데이터
        chartData: priceData,
        
        // 메르 언급 정보
        mentions: mentions.map((m: any) => ({
          date: m.mentioned_date?.split(' ')[0] || m.mentioned_date,
          postId: m.log_no,
          sentiment: m.mention_type || 'neutral',
          context: m.context
        })),
        
        // 관련 포스트
        relatedPosts: relatedPosts.posts,
        
        // 통계
        stats: {
          totalMentions: basicInfo.mention_count || mentions.length,
          firstMention: firstMentionDate,
          lastMention: basicInfo.last_mentioned_date || basicInfo.last_mentioned_at,
          totalPosts: analyzedCount
        }
      }
    };
    
    // 캐시 헤더 설정 (5분)
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
    
  } catch (error) {
    console.error('❌ Error fetching stock data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}