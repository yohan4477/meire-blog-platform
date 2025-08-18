import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const resolvedParams = await params;
    const ticker = resolvedParams.ticker;
    console.log(`🔍 Fetching ALL posts for ticker: ${ticker} over 6 months`);

    // URL에서 period 파라미터 추출 (기본값: 6mo)
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '6mo';
    const cacheBuster = searchParams.get('t'); // 캐시 무력화용

    // 6개월간의 모든 포스트를 가져오기
    const allPosts = await findAllPostsByTicker(ticker, period);

    const response = NextResponse.json({
      success: true,
      data: {
        ticker,
        period,
        posts: allPosts,
        total: allPosts.length,
        fetchedAt: new Date().toISOString()
      }
    });

    // 캐시 제어 헤더 - 기본 캐시하되 요청시 무력화
    if (cacheBuster) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    } else {
      // 기본 30분 캐시
      response.headers.set('Cache-Control', 'public, max-age=1800, s-maxage=1800');
    }

    return response;

  } catch (error) {
    console.error('전체 포스트 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: { message: '전체 포스트 조회 실패' }
    }, { status: 500 });
  }
}

async function findAllPostsByTicker(ticker: string, period: string): Promise<any[]> {
  try {
    // 🚨 CLAUDE.md 준수: merry_mentioned_stocks 테이블만 사용, blog_posts 절대 금지
    const { performantDb } = require('@/lib/db-performance');
    let allPosts: any[] = [];
    
    try {
      // 시간 범위 계산
      const periodDays = period === '1mo' ? 30 : period === '3mo' ? 90 : period === '6mo' ? 180 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);
      const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      const endDateStr = new Date().toISOString().split('T')[0];
      
      console.log(`📅 Looking for mentions from ${startDateStr} to ${endDateStr} (${periodDays} days)`);
      
      // merry_mentioned_stocks 테이블에서 언급 정보 조회
      const mentionsQuery = `
        SELECT 
          id,
          ticker,
          post_id,
          mentioned_date,
          context,
          sentiment_score,
          mention_type,
          created_at
        FROM merry_mentioned_stocks 
        WHERE ticker = ?
          AND mentioned_date >= ?
          AND mentioned_date <= ?
        ORDER BY mentioned_date DESC
      `;
      
      const mentions = await performantDb.query(mentionsQuery, [ticker, startDateStr, endDateStr]);
      
      allPosts = mentions.map((mention: any) => ({
        id: mention.post_id || mention.id,
        title: `메르 포스트 #${mention.post_id} - ${ticker} 언급`,
        excerpt: mention.context || `${ticker} 관련 메르 포스트 언급`,
        created_date: mention.mentioned_date,
        views: 0, // merry_mentioned_stocks에는 없음
        category: mention.mention_type || '투자분석',
        sentiment_score: mention.sentiment_score,
        mention_context: mention.context,
        source: 'merry_mentioned_stocks'
      }));
      
      console.log(`📊 Found ${allPosts.length} mentions for ${ticker} in last ${periodDays} days from merry_mentioned_stocks`);
      
    } catch (dbError) {
      console.error('merry_mentioned_stocks query failed, falling back to JSON:', dbError);
      
      // DB 실패시 JSON 파일 fallback (기존 로직)
      const dataPath = path.join(process.cwd(), 'data', 'stock-mentions-count.json');
      
      if (fs.existsSync(dataPath)) {
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        const stockData = JSON.parse(fileContent);
        
        const stock = stockData.find((s: any) => s.ticker === ticker);
        if (stock && stock.recentPosts) {
          // 시간 범위 필터링
          const periodDays = period === '1mo' ? 30 : period === '3mo' ? 90 : 180;
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - periodDays);
          const cutoffTimestamp = cutoffDate.getTime();
          
          allPosts = stock.recentPosts
            .filter((post: any) => {
              const postDate = new Date(post.created_date);
              return postDate.getTime() >= cutoffTimestamp;
            })
            .map((post: any) => ({
              id: post.id,
              title: post.title,
              excerpt: post.excerpt || extractExcerpt(post.title, ticker),
              created_date: post.created_date,
              views: post.views || 0,
              category: post.category || '투자분석',
              source: 'json_fallback'
            }));
        }
      }
    }

    // 중복 제거 (ID 기준)
    const uniquePosts = allPosts.filter((post, index, self) => 
      index === self.findIndex(p => p.id === post.id)
    );

    console.log(`✅ Found ${uniquePosts.length} unique posts for ${ticker} over ${period}`);
    return uniquePosts;

  } catch (error) {
    console.error('전체 포스트 조회 실패:', error);
    return [];
  }
}

// CLAUDE.md 원칙: Dummy data 절대 금지 - 해당 함수 제거
// 실제 데이터가 없으면 빈 배열 반환하여 "정보 없음" 표시

function extractExcerpt(content: string, ticker: string): string {
  if (!content) return '';
  
  // ticker가 언급된 부분 주변의 텍스트를 추출
  const tickerIndex = content.toLowerCase().indexOf(ticker.toLowerCase());
  if (tickerIndex === -1) {
    return content.slice(0, 150) + '...';
  }
  
  const start = Math.max(0, tickerIndex - 50);
  const end = Math.min(content.length, tickerIndex + 150);
  
  let excerpt = content.slice(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';
  
  return excerpt;
}