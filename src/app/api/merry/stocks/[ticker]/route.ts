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
    
    // 종목 기본 정보 가져오기
    const stockInfo = await stockDB.getStockByTicker(ticker);
    
    if (!stockInfo) {
      return NextResponse.json(
        { error: `Stock ${ticker} not found` },
        { status: 404 }
      );
    }
    
    // 최근 180일 (6개월) 가격 데이터 가져오기
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 180);
    
    const priceData = await stockDB.getStockPrices(
      ticker,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    
    // 메르 언급 정보 가져오기
    const mentions = await stockDB.getMerryMentions(ticker);
    
    // 관련 포스트 가져오기 (테이블 없으면 빈 배열)
    let relatedPosts = [];
    try {
      relatedPosts = await stockDB.getRelatedPosts(ticker, 10);
    } catch (error) {
      console.log('관련 포스트 테이블 없음, 빈 배열 사용');
      relatedPosts = [];
    }
    
    // 응답 데이터 구성
    const responseData = {
      success: true,
      data: {
        ticker: stockInfo.ticker,
        name: stockInfo.name,
        market: stockInfo.market || 'NASDAQ',
        currentPrice: stockInfo.current_price,
        priceChange: stockInfo.price_change,
        changePercent: stockInfo.change_percent,
        lastUpdate: stockInfo.last_update,
        description: stockInfo.description,
        
        // 6개월 차트 데이터
        chartData: priceData.map((item: any) => ({
          date: item.date,
          price: item.close_price,
          volume: item.volume,
          // 메르 언급이 있는 날짜 표시
          hasMention: mentions.some((m: any) => 
            m.mentioned_date === item.date
          )
        })),
        
        // 메르 언급 정보
        mentions: mentions.map((m: any) => ({
          date: m.mentioned_date,
          postId: m.post_id,
          sentiment: m.sentiment || 'neutral',
          excerpt: m.excerpt
        })),
        
        // 관련 포스트
        relatedPosts: relatedPosts,
        
        // 통계
        stats: {
          totalMentions: stockInfo.post_count || mentions.length,
          firstMention: stockInfo.first_mentioned_at,
          lastMention: stockInfo.last_mentioned_at,
          averagePrice: priceData.length > 0 
            ? priceData.reduce((sum: number, p: any) => sum + p.close_price, 0) / priceData.length
            : null,
          priceRange: priceData.length > 0
            ? {
                min: Math.min(...priceData.map((p: any) => p.close_price)),
                max: Math.max(...priceData.map((p: any) => p.close_price))
              }
            : null
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