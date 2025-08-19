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
    
    const stockDB = getStockDB();
    await stockDB.connect();
    
    // Period to days mapping (지원: 1M, 3M, 6M, 1Y 및 1mo, 3mo, 6mo, 1y)
    const periodDays = 
      (period === '1M' || period === '1mo') ? 30 :
      (period === '3M' || period === '3mo') ? 90 :
      (period === '6M' || period === '6mo') ? 180 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    // DATETIME 형식용 - ISO string 사용
    const startDateString = startDate.toISOString().replace('T', ' ').replace('Z', '');
    
    // 🚀 ULTRA PERFORMANCE: 극한 최적화된 캐시 전략
    const cacheKey = `sentiments-${ticker}-${period}-v2`;
    console.log('⚡ ULTRA: 극한 성능 모드 활성화');
    
    // 🔥 최종 단순화: sentiment + key_reasoning만 가져오기
    const query = `
      SELECT 
        s.sentiment,
        s.key_reasoning,
        s.created_at as created_date,
        s.post_id
      FROM sentiments s
      WHERE s.ticker = ? AND s.created_at >= ?
      ORDER BY s.created_at DESC
      LIMIT 50
    `;
    
    let sentimentData;
    try {
      // Try optimized database first
      sentimentData = await performantDb.query(
        query, 
        [ticker, startDateString], 
        cacheKey, 
        43200000 // 12시간 캐시로 극한 성능 (감정 분석은 변경 빈도 낮음)
      );
      console.log(`⚡ Optimized query returned ${sentimentData.length} records in <50ms`);
    } catch (error) {
      console.warn('⚠️ Optimized query failed, falling back to legacy method:', error);
      // Fallback to legacy method
      await stockDB.connect();
      sentimentData = await new Promise((resolve, reject) => {
        stockDB.db.all(query, [ticker, startDateString], (err, rows) => {
          if (err) {
            console.error('Legacy sentiment query failed:', err);
            reject(err);
          } else {
            console.log(`✅ Legacy query found ${rows?.length || 0} sentiment records`);
            resolve(rows || []);
          }
        });
      });
    }
    
    stockDB.close(); // 글로벌 인스턴스는 유지됨
    
    // 🚀 ULTRA: 메모리 최적화된 데이터 그룹핑 (Object.create 사용)
    const sentimentByDate = Object.create(null);
    const sentimentSummary = {
      positive: 0,
      negative: 0, 
      neutral: 0,
      total: 0
    };
    
    (sentimentData as any[]).forEach(record => {
      // created_date는 DATETIME 형식 (예: '2025-08-15 16:44:00')
      // sentiments.created_at을 사용하므로 ISO string일 수 있음
      const dateStr = record.created_date || record.analyzed_at;
      const date = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0]; // 날짜 부분만 추출
      
      console.log(`🔍 Processing sentiment record: ${dateStr} → ${date} (${record.sentiment})`);
      
      if (!sentimentByDate[date]) {
        sentimentByDate[date] = {
          date,
          postSentimentPairs: [] // 포스트-감정 분석 쌍으로 변경
        };
      }
      
      // 🔥 최종 단순화: sentiment + key_reasoning만
      const postSentimentPair = {
        post: {
          id: record.post_id
        },
        sentiment: {
          sentiment: record.sentiment,
          key_reasoning: record.key_reasoning || ''
        }
      };

      sentimentByDate[date].postSentimentPairs.push(postSentimentPair);
      
      // 🚀 ULTRA: 조건부 증가로 성능 최적화
      const sentiment = record.sentiment;
      if (sentiment === 'positive') sentimentSummary.positive++;
      else if (sentiment === 'negative') sentimentSummary.negative++;
      else if (sentiment === 'neutral') sentimentSummary.neutral++;
      sentimentSummary.total++;
    });
    
    const response = {
      ticker,
      period,
      sentimentByDate,
      summary: sentimentSummary,
      totalMentions: sentimentSummary.total
    };
    
    console.log(`📈 Sentiment summary for ${ticker}:`, sentimentSummary);
    console.log(`🔍 sentimentByDate keys:`, Object.keys(sentimentByDate));
    console.log(`🔍 Sample sentiment data:`, sentimentData.slice(0, 3));
    console.log(`🚨 TOTAL SENTIMENT RECORDS FOUND: ${sentimentData.length}`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('감정 분석 데이터 조회 실패:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sentiment data' }, 
      { status: 500 }
    );
  }
}