import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const db = new Database('database.db');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    
    // 종목 정보 + 분석 개수 + 최신 가격 정보 + 감정 분석 포함 쿼리
    const stmt = db.prepare(`
      SELECT 
        s.ticker,
        s.company_name as name,
        s.market,
        s.description,
        s.tags,
        s.sector,
        MAX(s.mention_count) as mention_count,
        MAX(s.last_mentioned_date) as last_mentioned_date,
        COUNT(DISTINCT psa.id) as analyzed_count,
        sp.close_price as current_price,
        sp.date as price_date,
        sp_prev.close_price as prev_price,
        -- 가중 평균 감정 점수 계산 (최근 분석과 높은 신뢰도에 가중치)
        COALESCE(
          (SELECT 
            SUM(sentiment_score * confidence) / SUM(confidence)
          FROM (
            SELECT sentiment_score, confidence
            FROM post_stock_analysis
            WHERE ticker = s.ticker
            ORDER BY analyzed_at DESC
            LIMIT 5
          )), 0) as weighted_sentiment_score,
        -- 최근 3개 분석의 주도적 감정
        (SELECT GROUP_CONCAT(sentiment)
         FROM (
           SELECT sentiment
           FROM post_stock_analysis
           WHERE ticker = s.ticker
           ORDER BY analyzed_at DESC
           LIMIT 3
         )) as recent_sentiments
      FROM stocks s
      LEFT JOIN post_stock_analysis psa ON s.ticker = psa.ticker
      LEFT JOIN stock_prices sp ON s.ticker = sp.ticker 
        AND sp.date = (SELECT MAX(date) FROM stock_prices WHERE ticker = s.ticker)
      LEFT JOIN stock_prices sp_prev ON s.ticker = sp_prev.ticker 
        AND sp_prev.date = (SELECT MAX(date) FROM stock_prices WHERE ticker = s.ticker AND date < sp.date)
      WHERE s.mention_count > 0
      GROUP BY s.ticker
      ORDER BY MAX(s.last_mentioned_date) DESC, MAX(s.mention_count) DESC
      LIMIT ? OFFSET ?
    `);
    
    const stocks = stmt.all(limit, offset);
    
    // 총 개수 조회 - 중복 제거
    const countStmt = db.prepare('SELECT COUNT(DISTINCT ticker) as total FROM stocks WHERE mention_count > 0');
    const { total } = countStmt.get() as { total: number };
    
    // 완전한 데이터 변환 - 태그, 설명, 분석 개수, 가격 정보 포함
    const formattedStocks = stocks.map((stock: any) => {
      // 유연한 태그 파싱 (JSON 배열 또는 콤마 구분 문자열 지원)
      let parsedTags = [];
      try {
        if (stock.tags) {
          // JSON 배열 형태인지 확인
          if (stock.tags.startsWith('[') && stock.tags.endsWith(']')) {
            parsedTags = JSON.parse(stock.tags);
          } else {
            // 콤마로 구분된 문자열 처리
            parsedTags = stock.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
          }
        }
      } catch (error) {
        console.warn(`태그 파싱 실패 for ${stock.ticker}:`, stock.tags);
        // 콤마로 구분된 문자열로 다시 시도
        try {
          parsedTags = stock.tags ? stock.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : [];
        } catch (e) {
          parsedTags = [];
        }
      }

      // 가격 변동률 계산 (한국 주식은 소수점 없이)
      let priceChange = null;
      let priceChangePercent = null;
      if (stock.current_price && stock.prev_price) {
        const change = stock.current_price - stock.prev_price;
        const changePercent = ((change / stock.prev_price) * 100);
        const isKoreanStock = (['KOSPI', 'KOSDAQ', 'KRX'].includes(stock.market) || stock.ticker?.length === 6);
        
        if (isKoreanStock) {
          // 한국 주식: 원 단위, 소수점 없음
          priceChange = change > 0 ? `+${Math.round(change)}` : `${Math.round(change)}`;
        } else {
          // 해외 주식: 달러 단위, 소수점 2자리
          priceChange = change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
        }
        priceChangePercent = change > 0 ? `+${changePercent.toFixed(2)}%` : `${changePercent.toFixed(2)}%`;
      }
      
      // 감정 결정 로직
      let finalSentiment = 'neutral';
      
      if (stock.recent_sentiments) {
        // 최근 3개 분석의 감정 분포를 확인
        const sentiments = stock.recent_sentiments.split(',');
        const sentimentCount = {
          positive: sentiments.filter(s => s === 'positive').length,
          negative: sentiments.filter(s => s === 'negative').length,
          neutral: sentiments.filter(s => s === 'neutral').length
        };
        
        // 가중 평균 점수 기반 결정
        if (stock.weighted_sentiment_score > 0.3) {
          finalSentiment = 'positive';
        } else if (stock.weighted_sentiment_score < -0.3) {
          finalSentiment = 'negative';
        } else {
          // 점수가 중립 범위일 때는 최근 감정 다수결로 보조 판단
          if (sentimentCount.positive > sentimentCount.negative && sentimentCount.positive > sentimentCount.neutral) {
            finalSentiment = 'positive';
          } else if (sentimentCount.negative > sentimentCount.positive && sentimentCount.negative > sentimentCount.neutral) {
            finalSentiment = 'negative';
          } else {
            finalSentiment = 'neutral';
          }
        }
      }
      
      return {
        ticker: stock.ticker,
        name: stock.name || stock.ticker,
        company_name: stock.name || stock.ticker,
        market: stock.market || (stock.ticker.length === 6 ? 'KRX' : 'NASDAQ'),
        description: stock.description || `${stock.name || stock.ticker} 종목 정보`,
        sector: stock.sector || '',
        mention_count: stock.mention_count,
        mentions: stock.mention_count,
        analyzed_count: stock.analyzed_count || 0,
        last_mentioned_at: stock.last_mentioned_date,
        last_mentioned_date: stock.last_mentioned_date,
        // 실제 가격 정보 (한국 주식은 정수로)
        currentPrice: stock.current_price ? (
          (['KOSPI', 'KOSDAQ', 'KRX'].includes(stock.market) || stock.ticker?.length === 6) ? 
          Math.round(stock.current_price) : 
          parseFloat(stock.current_price.toFixed(2))
        ) : null,
        priceChange: priceChangePercent || null,
        priceChangeAmount: priceChange || null,
        priceDate: stock.price_date || null,
        currency: (['KOSPI', 'KOSDAQ', 'KRX'].includes(stock.market) || stock.ticker?.length === 6) ? 'KRW' : 'USD',
        tags: Array.isArray(parsedTags) ? parsedTags : [],
        sentiment: finalSentiment,
        sentimentScore: stock.weighted_sentiment_score || 0
      };
    });
    
    return NextResponse.json({
      success: true,
      data: {
        stocks: formattedStocks,
        total,
        page,
        limit,
        hasMore: offset + limit < total
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300', // 5분 캐시
      }
    });
    
  } catch (error) {
    console.error('종목 조회 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: { 
        message: '종목 데이터 조회 실패', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
}