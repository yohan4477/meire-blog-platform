import { NextRequest, NextResponse } from 'next/server';
const StockDB = require('../../../../../lib/stock-db-sqlite3.js');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: rawTicker } = await params;
    const ticker = rawTicker.toUpperCase();
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
    
    // 실시간 가격 정보 가져오기
    let priceInfo = { currentPrice: 0, priceChange: '+0.00%' };
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
            console.log(`✅ Real-time price for ${ticker}: ${priceInfo.currentPrice} (${priceInfo.priceChange})`);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch real-time price for ${ticker}:`, error instanceof Error ? error.message : 'Unknown error');
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
          postId: m.post_id,
          sentiment: m.mention_type || 'neutral',
          context: m.context
        })),
        
        // 관련 포스트
        relatedPosts: relatedPosts.posts,
        
        // 통계
        stats: {
          totalMentions: basicInfo.mention_count || mentions.length,
          firstMention: basicInfo.first_mentioned_date,
          lastMention: basicInfo.last_mentioned_date || basicInfo.last_mentioned_at,
          totalPosts: relatedPosts.total
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