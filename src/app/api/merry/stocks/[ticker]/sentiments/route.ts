import { NextRequest, NextResponse } from 'next/server';

const StockDB = require('@/lib/stock-db-sqlite3');

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await context.params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '6mo';
    
    console.log(`📊 Fetching sentiment data for ${ticker} (${period})`);
    
    const stockDB = new StockDB();
    await stockDB.connect();
    
    // Period to days mapping
    const periodDays = period === '1mo' ? 30 : period === '3mo' ? 90 : 180;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    
    // Get sentiment data for the ticker within the time period
    const sentimentData = await new Promise((resolve, reject) => {
      stockDB.db.all(`
        SELECT 
          pss.ticker,
          pss.sentiment,
          pss.sentiment_score,
          pss.confidence,
          pss.keywords,
          pss.context_snippet,
          pss.analyzed_at,
          bp.id as post_id,
          bp.title as post_title,
          bp.created_date,
          bp.views,
          bp.excerpt
        FROM post_stock_sentiments pss
        JOIN blog_posts bp ON pss.post_id = bp.id
        WHERE pss.ticker = ? AND bp.created_date >= ?
        ORDER BY bp.created_date DESC
      `, [ticker, startTimestamp], (err, rows) => {
        if (err) {
          console.error('Sentiment query failed:', err);
          reject(err);
        } else {
          console.log(`✅ Found ${rows?.length || 0} sentiment records for ${ticker}`);
          resolve(rows || []);
        }
      });
    });
    
    stockDB.close();
    
    // Group sentiment data by date and sentiment type
    const sentimentByDate = {};
    const sentimentSummary = {
      positive: 0,
      negative: 0, 
      neutral: 0,
      total: 0
    };
    
    (sentimentData as any[]).forEach(record => {
      // created_date는 이미 Unix timestamp (초 단위)이므로 1000을 곱하지 않음
      const date = new Date(record.created_date).toISOString().split('T')[0];
      
      if (!sentimentByDate[date]) {
        sentimentByDate[date] = {
          date,
          sentiments: [],
          posts: []
        };
      }
      
      sentimentByDate[date].sentiments.push({
        sentiment: record.sentiment,
        score: record.sentiment_score,
        confidence: record.confidence,
        keywords: JSON.parse(record.keywords || '{}'),
        context: record.context_snippet
      });
      
      sentimentByDate[date].posts.push({
        id: record.post_id,
        title: record.post_title,
        excerpt: record.excerpt,
        views: record.views,
        date: record.created_date
      });
      
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