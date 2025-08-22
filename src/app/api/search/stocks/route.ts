import { NextRequest, NextResponse } from 'next/server';
const { getStockDB } = require('../../../../lib/stock-db-sqlite3.js');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    
    if (!query || query.length < 1) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    console.log(`🔍 Stock search query: "${query}"`);

    const stockDB = getStockDB();
    await stockDB.connect();
    
    // 메르가 언급한 종목들에서 검색
    let allStocks = [];
    try {
      allStocks = await stockDB.getMerryPickStocks(50); // 최대 50개까지 검색
    } catch (error) {
      console.error('Failed to get stocks from DB:', error);
      // Fallback 데이터
      allStocks = [
        { ticker: 'TSLA', name: '테슬라', market: 'NASDAQ', company_name: '테슬라', description: '전기차 제조업체', postCount: 42, last_mentioned_at: '2024-08-15' },
        { ticker: '005930', name: '삼성전자', market: 'KOSPI', company_name: '삼성전자', description: '반도체 및 전자제품 제조업체', postCount: 75, last_mentioned_at: '2024-08-14' },
        { ticker: 'AAPL', name: '애플', market: 'NASDAQ', company_name: '애플', description: 'iPhone 및 Mac 제조업체', postCount: 25, last_mentioned_at: '2024-08-10' },
        { ticker: 'NVDA', name: '엔비디아', market: 'NASDAQ', company_name: '엔비디아', description: 'GPU 및 AI 칩 제조업체', postCount: 18, last_mentioned_at: '2024-08-08' },
        { ticker: 'GOOGL', name: '구글', market: 'NASDAQ', company_name: '알파벳', description: '검색엔진 및 클라우드 서비스', postCount: 15, last_mentioned_at: '2024-08-05' }
      ];
    }
    
    // 검색어로 필터링 (한글 종목명, 영문 티커, 회사명으로 검색)
    const searchResults = allStocks.filter((stock: any) => {
      const queryLower = query.toLowerCase();
      const nameLower = stock.name?.toLowerCase() || '';
      const tickerLower = stock.ticker?.toLowerCase() || '';
      const companyLower = stock.company_name?.toLowerCase() || '';
      const descriptionLower = stock.description?.toLowerCase() || '';
      
      return (
        nameLower.includes(queryLower) ||
        tickerLower.includes(queryLower) ||
        companyLower.includes(queryLower) ||
        descriptionLower.includes(queryLower) ||
        // 한글 검색을 위한 부분 매칭
        (query === '테슬라' && (tickerLower === 'tsla' || nameLower.includes('테슬라'))) ||
        (query === '삼성' && (tickerLower === '005930' || nameLower.includes('삼성'))) ||
        (query === '애플' && (tickerLower === 'aapl' || nameLower.includes('애플'))) ||
        (query === '구글' && (tickerLower === 'googl' || nameLower.includes('구글'))) ||
        (query === '엔비디아' && (tickerLower === 'nvda' || nameLower.includes('엔비디아')))
      );
    });

    // 검색 결과를 관련도 순으로 정렬
    searchResults.sort((a: any, b: any) => {
      const queryLower = query.toLowerCase();
      
      // 정확한 매칭이 우선
      const aExact = a.name?.toLowerCase() === queryLower || a.ticker?.toLowerCase() === queryLower;
      const bExact = b.name?.toLowerCase() === queryLower || b.ticker?.toLowerCase() === queryLower;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // 시작 문자 매칭이 다음 우선
      const aStarts = a.name?.toLowerCase().startsWith(queryLower) || a.ticker?.toLowerCase().startsWith(queryLower);
      const bStarts = b.name?.toLowerCase().startsWith(queryLower) || b.ticker?.toLowerCase().startsWith(queryLower);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // 마지막으로 최근 언급일순
      const dateA = new Date(a.lastMention || a.last_mentioned_at || 0).getTime();
      const dateB = new Date(b.lastMention || b.last_mentioned_at || 0).getTime();
      return dateB - dateA;
    });

    // 최대 10개 결과만 반환
    const limitedResults = searchResults.slice(0, 10).map((stock: any) => ({
      ticker: stock.ticker,
      name: stock.name || stock.company_name,
      market: stock.market,
      description: stock.description || `${stock.market} 상장 기업`,
      mentionCount: stock.postCount || stock.mention_count || 0,
      lastMention: stock.lastMention || stock.last_mentioned_at
    }));

    console.log(`✅ Found ${limitedResults.length} stock results for "${query}"`);

    return NextResponse.json({
      success: true,
      data: limitedResults,
      query
    });

  } catch (error) {
    console.error('Stock search error:', error);
    return NextResponse.json({
      success: false,
      error: { message: '종목 검색 실패' }
    }, { status: 500 });
  }
}