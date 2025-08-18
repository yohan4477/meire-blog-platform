import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { performantDb } from '@/lib/db-performance';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const resolvedParams = await params;
    const ticker = resolvedParams.ticker;
    
    // URL 파라미터에서 페이지네이션 및 기간 정보 추출
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const offset = parseInt(searchParams.get('offset') || '0');
    const period = searchParams.get('period') || '6mo'; // 기간 파라미터 추가
    
    console.log(`🔍 Fetching posts for ${ticker}, period: ${period}, limit: ${limit}, offset: ${offset}`);

    // 먼저 SQLite 데이터베이스에서 관련 포스트 조회 (기간 필터링 포함)
    let result = await findPostsByTickerFromDB(ticker, limit, offset, period);
    
    // SQLite에서 결과가 없으면 JSON 파일에서 fallback 조회
    if (result.total === 0) {
      result = await findPostsByTickerFromJSON(ticker, limit, offset, period);
    }

    return NextResponse.json({
      success: true,
      data: {
        ticker,
        posts: result.posts,
        total: result.total,
        hasMore: result.hasMore,
        limit: result.limit,
        offset: result.offset
      }
    });

  } catch (error) {
    console.error('종목별 포스트 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: { message: '종목별 포스트 조회 실패' }
    }, { status: 500 });
  }
}

async function findPostsByTickerFromDB(ticker: string, limit: number, offset: number, period: string = '6mo') {
  try {
    // 기간 계산 (Stock Price API와 통일된 로직)
    const endDate = new Date();
    const startDate = new Date();
    
    // Stock Price API와 통일된 기간 처리 (1M, 3M, 6M, 1Y 표준 사용)
    switch (period.toLowerCase()) {
      case '1y':
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case '6m':
      case '6mo':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '3m':
      case '3mo':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '1m':
      case '1mo':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 6);
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`📅 Posts date range filter: ${startDateStr} ~ ${endDateStr} (period: ${period})`);
    
    // 🔥 4개 DB 최적화: merry_mentioned_stocks 테이블 직접 사용
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM merry_mentioned_stocks 
      WHERE ticker = ?
        AND mentioned_date >= ?
        AND mentioned_date <= ?
    `;
    const countResult = await performantDb.query(countQuery, [ticker, startDateStr, endDateStr]);
    const total = countResult[0]?.total || 0;
    
    // 🚀 최적화된 JOIN 쿼리: 한 번에 모든 데이터 가져오기
    const optimizedQuery = `
      SELECT 
        -- 언급 정보
        m.id as mention_id,
        m.mentioned_date,
        m.context as mention_context,
        m.sentiment_score,
        m.mention_type,
        
        -- 실제 포스트 정보
        b.id as post_id,
        b.title,
        b.excerpt,
        b.views,
        b.created_date as blog_created_date,
        b.category,
        
        -- 계산된 필드
        DATE(m.mentioned_date) as date_key
        
      FROM merry_mentioned_stocks m
      LEFT JOIN blog_posts b ON m.post_id = b.id
      WHERE m.ticker = ?
        AND m.mentioned_date >= ?
        AND m.mentioned_date <= ?
      ORDER BY m.mentioned_date DESC 
      LIMIT ? OFFSET ?
    `;
    
    const startTime = Date.now();
    const mentions = await performantDb.query(
      optimizedQuery, 
      [ticker, startDateStr, endDateStr, limit, offset],
      `posts-optimized-${ticker}-${period}`, // 캐시 키
      300000 // 5분 캐시
    );
    const queryTime = Date.now() - startTime;
    
    const hasMore = (offset + limit) < total;
    
    console.log(`⚡ Optimized query completed in ${queryTime}ms for ${ticker}: ${mentions.length}/${total} posts`);
    
    // 🚀 향상된 데이터 매핑: 실제 포스트 정보 포함
    return {
      posts: mentions.map(row => ({
        // 기본 포스트 정보 (실제 블로그 데이터)
        id: row.post_id || row.mention_id,
        title: row.title || `메르 포스트 #${row.post_id} - ${ticker} 언급`,
        excerpt: row.excerpt || row.mention_context || `${ticker} 관련 메르 포스트`,
        views: row.views || 0,
        category: row.category || row.mention_type || '투자분석',
        
        // 날짜 정보
        created_date: row.blog_created_date || row.mentioned_date,
        mentioned_date: row.mentioned_date,
        date: row.date_key, // YYYY-MM-DD 형식
        
        // 언급 메타데이터
        mention_context: row.mention_context,
        sentiment_score: row.sentiment_score,
        mention_type: row.mention_type,
        
        // 성능 디버깅 정보
        _performance: {
          query_time_ms: queryTime,
          from_cache: queryTime < 10,
          optimization: "JOIN with blog_posts"
        }
      })),
      total,
      hasMore,
      limit,
      offset,
      performance: {
        query_time_ms: queryTime,
        optimization: "JOIN with blog_posts table",
        cache_duration: "5 minutes"
      }
    };
  } catch (error) {
    console.error('merry_mentioned_stocks 조회 실패:', error);
    return {
      posts: [],
      total: 0,
      hasMore: false,
      limit,
      offset
    };
  }
}

function getTickerSearchTerms(ticker: string): string[] {
  const searchMap: Record<string, string[]> = {
    'TSLA': ['테슬라', 'TSLA', 'Tesla'],
    '005930': ['삼성전자', '005930', '삼성'],
    'INTC': ['인텔', 'INTC', 'Intel'],
    'LLY': ['일라이릴리', 'LLY', 'Eli Lilly', '릴리'],
    'UNH': ['유나이티드헬스케어', 'UNH', 'UnitedHealth', '유나이티드헬스'],
    'NVDA': ['엔비디아', 'NVDA', 'NVIDIA'],
    'AAPL': ['애플', 'AAPL', 'Apple', '아이폰'],
    'GOOGL': ['구글', 'GOOGL', 'Google', '알파벳'],
    'MSFT': ['마이크로소프트', 'MSFT', 'Microsoft', '마소'],
    'AMZN': ['아마존', 'AMZN', 'Amazon'],
    'META': ['메타', 'META', '페이스북', 'Facebook'],
    '042660': ['한화오션', '042660', '한화시스템'],
    '267250': ['HD현대', '267250', '현대중공업'],
    '010620': ['현대미포조선', '010620', '미포조선']
  };
  
  return searchMap[ticker] || [ticker];
}

async function findPostsByTickerFromJSON(ticker: string, limit: number, offset: number, period: string = '6mo') {
  try {
    // 기간 계산 (DB 함수와 동일한 로직)
    const endDate = new Date();
    const startDate = new Date();
    
    // Stock Price API와 통일된 기간 처리 (1M, 3M, 6M, 1Y 표준 사용)
    switch (period.toLowerCase()) {
      case '1y':
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case '6m':
      case '6mo':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '3m':
      case '3mo':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '1m':
      case '1mo':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 6);
    }
    
    // JSON 파일에서 해당 종목의 recentPosts 확인
    const dataPath = path.join(process.cwd(), 'data', 'merry-stocks-clean.json');
    
    if (fs.existsSync(dataPath)) {
      const fileContent = fs.readFileSync(dataPath, 'utf8');
      const stockData = JSON.parse(fileContent);
      
      const stock = stockData.find((s: any) => s.ticker === ticker);
      if (stock && stock.recentPosts && stock.recentPosts.length > 0) {
        const allPosts = stock.recentPosts
          .map((post: any) => ({
            id: post.id,
            title: post.title,
            excerpt: post.excerpt || extractExcerpt(post.title, ticker),
            published_date: post.created_date || post.date,
            views: post.views || 0,
            category: post.category || '투자분석'
          }))
          .filter((post: any) => {
            // 기간 필터링 적용
            const postDate = new Date(post.published_date);
            return postDate >= startDate && postDate <= endDate;
          });
        
        const total = allPosts.length;
        const posts = allPosts.slice(offset, offset + limit);
        const hasMore = (offset + limit) < total;
        
        console.log(`📝 Found ${total} total posts for ${ticker} from JSON file (showing ${posts.length})`);
        
        return {
          posts,
          total,
          hasMore,
          limit,
          offset
        };
      }
    }

    // JSON 파일에 데이터가 없으면 빈 결과 반환
    console.log(`⚠️ No posts found for ${ticker} in JSON file`);
    return {
      posts: [],
      total: 0,
      hasMore: false,
      limit,
      offset
    };

  } catch (error) {
    console.error('JSON 파일 조회 실패:', error);
    return {
      posts: [],
      total: 0,
      hasMore: false,
      limit,
      offset
    };
  }
}

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

// CLAUDE.md 원칙: Dummy data 절대 금지 - 해당 함수 제거
// 실제 데이터가 없으면 빈 배열을 반환하여 "정보 없음" 표시