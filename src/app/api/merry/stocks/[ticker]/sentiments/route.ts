import { NextRequest, NextResponse } from 'next/server';

const { getStockDB } = require('@/lib/stock-db-sqlite3');
import { performantDb } from '@/lib/db-performance';

// 티커 매핑 테이블 - 잘못된 티커를 올바른 티커로 수정
const TICKER_MAPPING: Record<string, string> = {
  'OCLR': 'OKLO', // Oklo Inc - 잘못된 티커 OCLR을 올바른 OKLO로 매핑
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: rawTicker } = await context.params;
    let ticker = rawTicker.toUpperCase();
    
    // 티커 매핑 확인 및 변경
    const originalTicker = ticker;
    if (TICKER_MAPPING[ticker]) {
      ticker = TICKER_MAPPING[ticker];
      console.log(`🔄 Sentiments API Ticker mapping: ${originalTicker} → ${ticker}`);
    }
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '6mo';
    
    console.log(`📊 Fetching sentiment data for ${ticker} (${period})`);
    
    // 🚨 stock-page-requirements.md 준수: 허용된 4개 테이블만 사용
    // 허용 테이블: stocks, stock_prices, blog_posts, post_stock_sentiments
    
    // Period to days mapping
    const periodDays = 
      (period === '1M' || period === '1mo') ? 30 :
      (period === '3M' || period === '3mo') ? 90 :
      (period === '6M' || period === '6mo') ? 180 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const startDateString = startDate.toISOString().replace('T', ' ').replace('Z', '');
    
    // 🔥 post_stock_analysis 테이블에서 감정 분석 데이터 조회 (stock-page-requirements.md 준수)
    const query = `
      SELECT 
        psa.sentiment,
        psa.sentiment_score,
        psa.reasoning as key_reasoning,
        psa.analyzed_at,
        psa.log_no,
        psa.confidence,
        bp.title as post_title,
        bp.created_date,
        DATE(bp.created_date) as date_key
      FROM post_stock_analysis psa
      LEFT JOIN blog_posts bp ON psa.log_no = bp.log_no
      WHERE psa.ticker = ? AND psa.analyzed_at >= ?
      ORDER BY bp.created_date DESC
      LIMIT 100
    `;
    
    const cacheKey = `sentiments-${ticker}-${period}-v4`;
    let sentimentData: any[] = [];
    
    try {
      sentimentData = await performantDb.query(
        query, 
        [ticker, startDateString], 
        cacheKey, 
        300000 // 5분 캐시
      );
      console.log(`⚡ Found ${sentimentData.length} sentiment records for ${ticker}`);
    } catch (error) {
      console.error('💥 post_stock_analysis 테이블 조회 실패:', error);
      
      // 🚨 명확한 문제 표시 - stock-page-requirements.md 위반 상황
      if (error instanceof Error && error.message.includes('no such table')) {
        console.error('🚨 CRITICAL: post_stock_analysis 테이블이 존재하지 않음 - stock-page-requirements.md 위반');
        return NextResponse.json({
          error: 'post_stock_analysis 테이블이 존재하지 않음',
          code: 'TABLE_NOT_FOUND', 
          message: 'stock-page-requirements.md에서 요구하는 post_stock_analysis 테이블이 데이터베이스에 없습니다.'
        }, { status: 500 });
      }
      
      // 다른 오류도 명확히 표시
      return NextResponse.json({
        error: '감정 분석 데이터 조회 실패',
        code: 'SENTIMENT_QUERY_FAILED',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
    
    // 🚨 데이터 없음을 명확히 표시 - stock-page-requirements.md 위반 상황
    if (sentimentData.length === 0) {
      console.warn(`📊 INFO: ${ticker}에 대한 감정 분석 데이터 없음 - post_stock_analysis 테이블에서 해당 종목 데이터 없음`);
      return NextResponse.json({
        ticker,
        period,
        sentimentByDate: {},
        summary: { positive: 0, negative: 0, neutral: 0, total: 0 },
        totalMentions: 0,
        averageConfidence: 0,
        success: true
      });
    }
    
    // 📊 날짜별 감정 분석 데이터 그룹화 (stock-page-requirements.md 요구사항)
    const sentimentByDate: { [date: string]: any } = {};
    const summary = { positive: 0, negative: 0, neutral: 0, total: 0 };
    
    sentimentData.forEach(record => {
      const dateKey = record.date_key; // DATE(bp.published_date) 사용
      
      if (!sentimentByDate[dateKey]) {
        sentimentByDate[dateKey] = {
          date: dateKey,
          sentiments: [],
          posts: []
        };
      }
      
      // 감정 분석 데이터 추가 (요구사항 구조)
      sentimentByDate[dateKey].sentiments.push({
        sentiment: record.sentiment,
        score: parseFloat(record.sentiment_score || '0'),
        confidence: parseFloat(record.confidence || '0.8'),
        reasoning: record.key_reasoning || '',
        keywords: {
          positive: [],
          negative: [],
          neutral: []
        }
      });
      
      // 포스트 정보 추가
      sentimentByDate[dateKey].posts.push({
        id: record.log_no,
        title: record.post_title || '',
        date: record.created_date
      });
      
      // 요약 통계 집계
      if (record.sentiment === 'positive') summary.positive++;
      else if (record.sentiment === 'negative') summary.negative++;
      else if (record.sentiment === 'neutral') summary.neutral++;
      summary.total++;
    });
    
    // 평균 신뢰도 계산
    const avgConfidence = sentimentData.length > 0 
      ? sentimentData.reduce((sum, item) => sum + parseFloat(item.confidence || '0.8'), 0) / sentimentData.length
      : 0;
    
    console.log(`✅ Processed ${sentimentData.length} sentiment records for ${ticker} (${period})`);
    console.log(`📈 Summary: positive=${summary.positive}, negative=${summary.negative}, neutral=${summary.neutral}`);
    
    return NextResponse.json({
      success: true,
      data: {
        ticker,
        period,
        sentimentByDate,
        summary,
        totalMentions: summary.total,
        averageConfidence: Math.round(avgConfidence * 100) / 100
      }
    });
    
  } catch (error) {
    console.error('감정 분석 데이터 조회 실패:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sentiment data' }, 
      { status: 500 }
    );
  }
}