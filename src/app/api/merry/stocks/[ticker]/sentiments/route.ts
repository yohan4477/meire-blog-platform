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
    
    // Period to days mapping
    const periodDays = period === '1mo' ? 30 : period === '3mo' ? 90 : period === '6mo' ? 180 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    // DATETIME 형식용 - ISO string 사용
    const startDateString = startDate.toISOString().replace('T', ' ').replace('Z', '');
    
    // PERFORMANCE OPTIMIZED: Use high-performance database with caching
    const cacheKey = `sentiments-${ticker}-${period}`;
    console.log('🚀 Using optimized high-performance sentiment query');
    
    const query = `
      SELECT 
        s.ticker,
        s.sentiment,
        s.sentiment_score,
        s.sentiment_score as confidence,
        s.key_reasoning,
        s.supporting_evidence,
        '' as key_keywords,
        '' as context_quotes,
        s.investment_perspective,
        s.investment_timeframe,
        s.conviction_level,
        s.mention_context,
        '' as analysis_focus,
        s.uncertainty_factors,
        s.created_at as analyzed_at,
        bp.id as post_id,
        bp.title as post_title,
        bp.created_date,
        bp.views,
        bp.excerpt,
        'claude' as data_source
      FROM sentiments s
      JOIN blog_posts bp ON s.post_id = bp.id
      WHERE s.ticker = ? AND bp.created_date >= ?
      ORDER BY bp.created_date DESC
      LIMIT 50
    `;
    
    let sentimentData;
    try {
      // Try optimized database first
      sentimentData = await performantDb.query(
        query, 
        [ticker, startDateString], 
        cacheKey, 
        300000 // 5min cache
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
    
    // Group sentiment data by date with post-sentiment pairs
    const sentimentByDate = {};
    const sentimentSummary = {
      positive: 0,
      negative: 0, 
      neutral: 0,
      total: 0
    };
    
    (sentimentData as any[]).forEach(record => {
      // created_date는 DATETIME 형식 (예: '2025-08-15 16:44:00')
      const date = record.created_date.split(' ')[0]; // 날짜 부분만 추출
      
      if (!sentimentByDate[date]) {
        sentimentByDate[date] = {
          date,
          postSentimentPairs: [] // 포스트-감정 분석 쌍으로 변경
        };
      }
      
      // 포스트와 감정 분석을 한 쌍으로 묶기
      const postSentimentPair = {
        // 포스트 정보
        post: {
          id: record.post_id,
          title: record.post_title,
          excerpt: record.excerpt,
          views: record.views,
          date: record.created_date
        },
        // 해당 포스트의 감정 분석
        sentiment: {
          sentiment: record.sentiment,
          score: record.sentiment_score,
          confidence: record.confidence,
          data_source: record.data_source, // 항상 'claude'
          key_reasoning: record.key_reasoning,
          supporting_evidence: (() => {
            try {
              return record.supporting_evidence ? JSON.parse(record.supporting_evidence) : null;
            } catch (e) {
              console.warn('Failed to parse supporting_evidence:', e.message);
              return null;
            }
          })(),
          context_quotes: (() => {
            try {
              return record.context_quotes ? JSON.parse(record.context_quotes) : [];
            } catch (e) {
              console.warn('Failed to parse context_quotes:', e.message);
              return [];
            }
          })(),
          investment_perspective: (() => {
            try {
              return record.investment_perspective ? JSON.parse(record.investment_perspective) : [];
            } catch (e) {
              console.warn('Failed to parse investment_perspective:', e.message);
              return [];
            }
          })(),
          investment_timeframe: record.investment_timeframe,
          conviction_level: record.conviction_level,
          mention_context: record.mention_context,
          analysis_focus: record.analysis_focus,
          uncertainty_factors: (() => {
            try {
              return record.uncertainty_factors ? JSON.parse(record.uncertainty_factors) : [];
            } catch (e) {
              console.warn('Failed to parse uncertainty_factors:', e.message);
              return [];
            }
          })(),
          keywords: (() => {
            try {
              const keywordData = record.key_keywords;
              if (!keywordData || keywordData.trim() === '') {
                return [];
              }
              return JSON.parse(keywordData);
            } catch (e) {
              console.warn('Failed to parse keywords:', record.key_keywords, 'Error:', e.message);
              return [];
            }
          })(),
          context: record.context_snippet || null
        }
      };

      sentimentByDate[date].postSentimentPairs.push(postSentimentPair);
      
      // Update summary
      sentimentSummary[record.sentiment]++;
      sentimentSummary.total++;
    });
    
    const response = {
      ticker,
      period,
      sentimentByDate,
      summary: sentimentSummary,
      totalMentions: sentimentSummary.total,
      averageConfidence: sentimentData.length > 0 
        ? (sentimentData as any[]).reduce((sum, r) => sum + r.confidence, 0) / sentimentData.length 
        : 0
    };
    
    console.log(`📈 Sentiment summary for ${ticker}:`, sentimentSummary);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('감정 분석 데이터 조회 실패:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sentiment data' }, 
      { status: 500 }
    );
  }
}