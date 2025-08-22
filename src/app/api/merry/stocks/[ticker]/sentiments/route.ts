import { NextRequest, NextResponse } from 'next/server';

const { getStockDB } = require('@/lib/stock-db-sqlite3');
import { performantDb } from '@/lib/db-performance';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await context.params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '6mo';
    
    console.log(`📊 Fetching sentiment data for ${ticker} (${period})`);
    
    // 🚨 stock-page-requirements.md 준수: 허용된 4개 테이블만 사용
    // 허용 테이블: stocks, stock_prices, blog_posts, post_stock_analysis
    
    // Period to days mapping
    const periodDays = 
      (period === '1M' || period === '1mo') ? 30 :
      (period === '3M' || period === '3mo') ? 90 :
      (period === '6M' || period === '6mo') ? 180 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const startDateString = startDate.toISOString().replace('T', ' ').replace('Z', '');
    
    // 🔥 post_stock_analysis 테이블에서 감정 분석 데이터 조회
    const query = `
      SELECT 
        psa.sentiment,
        psa.reasoning as key_reasoning,
        psa.analyzed_at as created_date,
        psa.post_id,
        bp.title as post_title
      FROM post_stock_analysis psa
      LEFT JOIN blog_posts bp ON psa.post_id = bp.id
      WHERE psa.ticker = ? AND psa.analyzed_at >= ?
      ORDER BY psa.analyzed_at DESC
      LIMIT 50
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
      console.error(`🚨 WARNING: ${ticker}에 대한 감정 분석 데이터 없음 - post_stock_analysis 테이블 비어있음`);
      return NextResponse.json({
        ticker,
        period,
        sentimentByDate: {},
        summary: { positive: 0, negative: 0, neutral: 0, total: 0 },
        totalMentions: 0,
        warning: 'post_stock_analysis 테이블에 감정 분석 데이터가 없습니다',
        message: 'stock-page-requirements.md 요구사항을 충족하려면 감정 분석 데이터가 필요합니다'
      });
    }
    
    // 간단한 데이터 그룹핑
    const sentimentByDate: any = {};
    const sentimentSummary = { positive: 0, negative: 0, neutral: 0, total: 0 };
    
    sentimentData.forEach(record => {
      const dateStr = record.created_date || record.analyzed_at;
      const date = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
      
      if (!sentimentByDate[date]) {
        sentimentByDate[date] = {
          date,
          postSentimentPairs: []
        };
      }
      
      sentimentByDate[date].postSentimentPairs.push({
        post: { 
          id: record.post_id,
          title: record.post_title || ''
        },
        sentiment: {
          sentiment: record.sentiment,
          reasoning: record.key_reasoning || ''
        }
      });
      
      // 집계
      if (record.sentiment === 'positive') sentimentSummary.positive++;
      else if (record.sentiment === 'negative') sentimentSummary.negative++;
      else if (record.sentiment === 'neutral') sentimentSummary.neutral++;
      sentimentSummary.total++;
    });
    
    console.log(`📈 Found ${sentimentData.length} sentiment records for ${ticker} (${period})`);
    
    return NextResponse.json({
      ticker,
      period,
      sentimentByDate,
      summary: sentimentSummary,
      totalMentions: sentimentSummary.total
    });
    
  } catch (error) {
    console.error('감정 분석 데이터 조회 실패:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sentiment data' }, 
      { status: 500 }
    );
  }
}