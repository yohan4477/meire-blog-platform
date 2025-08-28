/**
 * 🚀 최적화된 관련 포스트 API
 * JOIN을 활용한 실제 포스트 데이터 포함
 */

import { NextRequest, NextResponse } from 'next/server';
import { performantDb } from '@/lib/db-performance';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const resolvedParams = await params;
    const ticker = resolvedParams.ticker;
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const offset = parseInt(searchParams.get('offset') || '0');
    const period = searchParams.get('period') || '6M';
    
    // 기간 계산
    const endDate = new Date();
    const startDate = new Date();
    const periodDays = 
      (period === '1M' || period === '1mo') ? 30 :
      (period === '3M' || period === '3mo') ? 90 :
      (period === '6M' || period === '6mo') ? 180 : 365;
    startDate.setDate(startDate.getDate() - periodDays);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`🚀 Optimized posts query for ${ticker} (${period}): ${startDateStr} ~ ${endDateStr}`);
    
    // 🔥 최적화된 JOIN 쿼리: 한 번에 모든 데이터 가져오기
    const optimizedQuery = `
      SELECT 
        -- 언급 정보
        m.id as mention_id,
        m.mentioned_date,
        m.context as mention_context,
        m.sentiment_score,
        m.mention_type,
        
        -- 실제 포스트 정보
        b.id as log_no,
        b.title,
        b.excerpt,
        b.views,
        b.created_date as blog_created_date,
        b.category,
        
        -- 계산된 필드
        DATE(m.mentioned_date) as date_key
        
      FROM merry_mentioned_stocks m
      LEFT JOIN blog_posts b ON m.log_no = b.id
      WHERE m.ticker = ?
        AND m.mentioned_date >= ?
        AND m.mentioned_date <= ?
      ORDER BY m.mentioned_date DESC 
      LIMIT ? OFFSET ?
    `;
    
    const startTime = Date.now();
    const results = await performantDb.query(
      optimizedQuery, 
      [ticker, startDateStr, endDateStr, limit, offset],
      `posts-optimized-${ticker}-${period}`, // 캐시 키
      300000 // 5분 캐시 (포스트는 자주 변경되지 않음)
    );
    const queryTime = Date.now() - startTime;
    
    // 총 개수 조회 (캐시됨)
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM merry_mentioned_stocks 
      WHERE ticker = ? AND mentioned_date >= ? AND mentioned_date <= ?
    `;
    const countResult = await performantDb.query(countQuery, [ticker, startDateStr, endDateStr]);
    const total = countResult[0]?.total || 0;
    
    // 데이터 가공
    const posts = results.map(row => ({
      // 기본 포스트 정보
      id: row.log_no || row.mention_id,
      title: row.title || `메르 포스트 #${row.log_no} - ${ticker} 언급`,
      excerpt: row.excerpt || row.mention_context || `${ticker} 관련 메르 포스트`,
      views: row.views || 0,
      category: row.category || '투자분석',
      
      // 날짜 정보
      created_date: row.blog_created_date || row.mentioned_date,
      mentioned_date: row.mentioned_date,
      date: row.date_key, // YYYY-MM-DD 형식
      
      // 메타데이터
      mention_context: row.mention_context,
      sentiment_score: row.sentiment_score,
      mention_type: row.mention_type,
      
      // 성능 정보
      _performance: {
        query_time_ms: queryTime,
        from_cache: queryTime < 10
      }
    }));
    
    const hasMore = (offset + limit) < total;
    
    console.log(`⚡ Optimized query completed in ${queryTime}ms for ${ticker}: ${results.length}/${total} posts`);
    
    return NextResponse.json({
      success: true,
      data: {
        ticker,
        posts,
        total,
        hasMore,
        limit,
        offset,
        performance: {
          query_time_ms: queryTime,
          optimization: "JOIN with blog_posts table",
          cache_duration: "5 minutes"
        }
      }
    });

  } catch (error) {
    console.error('최적화된 종목별 포스트 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: { message: '종목별 포스트 조회 실패', details: error instanceof Error ? error.message : 'Unknown error' }
    }, { status: 500 });
  }
}