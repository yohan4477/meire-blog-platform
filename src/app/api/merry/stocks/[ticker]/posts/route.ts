import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { performantDb } from '@/lib/db-performance';

// 티커 매핑 테이블 - 잘못된 티커를 올바른 티커로 수정
const TICKER_MAPPING: Record<string, string> = {
  'OCLR': 'OKLO', // Oklo Inc - 잘못된 티커 OCLR을 올바른 OKLO로 매핑
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const resolvedParams = await params;
    let ticker = resolvedParams.ticker.toUpperCase();
    
    // 티커 매핑 확인 및 변경
    const originalTicker = ticker;
    if (TICKER_MAPPING[ticker]) {
      ticker = TICKER_MAPPING[ticker];
      console.log(`🔄 Posts API Ticker mapping: ${originalTicker} → ${ticker}`);
    }
    
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
    // 🚨 stock-page-requirements.md 준수: 허용된 4개 테이블만 사용
    // 허용 테이블: stocks, stock_prices, blog_posts, post_stock_analysis
    
    // 기간 계산
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period.toLowerCase()) {
      case '1y': case '1year': startDate.setFullYear(endDate.getFullYear() - 1); break;
      case '6m': case '6mo': startDate.setMonth(endDate.getMonth() - 6); break;
      case '3m': case '3mo': startDate.setMonth(endDate.getMonth() - 3); break;
      case '1m': case '1mo': startDate.setMonth(endDate.getMonth() - 1); break;
      default: startDate.setMonth(endDate.getMonth() - 6);
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`📅 Posts date range filter: ${startDateStr} ~ ${endDateStr} (period: ${period})`);
    
    // 🔥 수정: 감정 분석 여부와 관계없이 모든 언급된 포스트를 가져오기
    // ticker와 회사명으로 blog_posts에서 직접 검색
    const tickerNameMap: Record<string, string[]> = {
      'OKLO': ['오클로', 'OKLO', 'Oklo'],
      '005930': ['삼성전자', '삼성', 'Samsung'],
      'TSLA': ['테슬라', 'Tesla'],
      'CEG': ['CEG', 'Constellation Energy', '컨스텔레이션', '컨스털레이션', '컨스텔레이션에너지', '컨스털레이션에너지'],
      // 필요시 추가
    };
    
    const searchTerms = tickerNameMap[ticker] || [ticker];
    const likeConditions = searchTerms.map(() => 
      '(bp.title LIKE ? OR bp.content LIKE ? OR bp.excerpt LIKE ?)'
    ).join(' OR ');
    
    const searchParams: any[] = [];
    searchTerms.forEach(term => {
      searchParams.push(`%${term}%`, `%${term}%`, `%${term}%`);
    });
    
    // 개수 조회 - blog_posts에서 직접
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM blog_posts bp
      WHERE (${likeConditions})
        AND bp.created_date >= ?
        AND bp.created_date <= ?
    `;
    
    let total = 0;
    try {
      const countResult = await performantDb.query(
        countQuery, 
        [...searchParams, startDateStr, endDateStr]
      );
      total = countResult[0]?.total || 0;
    } catch (error) {
      console.error('💥 blog_posts 조회 실패:', error);
      throw error;
    }
    
    // 메인 쿼리 - LEFT JOIN으로 감정 분석 데이터는 있으면 가져오고 없어도 포스트는 표시
    const optimizedQuery = `
      SELECT 
        bp.log_no,
        bp.title,
        bp.excerpt,
        bp.views,
        bp.created_date,
        bp.category,
        psa.sentiment,
        psa.reasoning as key_reasoning,
        psa.confidence
      FROM blog_posts bp
      LEFT JOIN post_stock_analysis psa 
        ON bp.log_no = psa.log_no 
        AND psa.ticker = ?
      WHERE (${likeConditions})
        AND bp.created_date >= ?
        AND bp.created_date <= ?
      ORDER BY bp.created_date DESC 
      LIMIT ? OFFSET ?
    `;
    
    const posts = await performantDb.query(
      optimizedQuery, 
      [ticker, ...searchParams, startDateStr, endDateStr, limit, offset],
      `posts-all-${ticker}-${period}`,
      300000
    );
    
    const hasMore = (offset + limit) < total;
    
    console.log(`⚡ Found ${posts.length}/${total} posts for ${ticker} (${period})`);
    
    return {
      posts: posts.map(row => ({
        id: row.log_no,
        title: row.title,
        excerpt: row.excerpt || `${ticker} 관련 포스트`,
        views: row.views || 0,
        category: row.category || '투자분석',
        created_date: row.created_date,
        sentiment: row.sentiment,
        key_reasoning: row.key_reasoning,
        confidence: row.confidence
      })),
      total,
      hasMore,
      limit,
      offset
    };
  } catch (error) {
    console.error('💥 post_stock_analysis 조회 실패:', error);
    
    // 🚨 문제를 명확히 표시
    if (error instanceof Error && error.message.includes('no such table')) {
      throw new Error('post_stock_analysis 테이블이 존재하지 않음 - stock-page-requirements.md 위반');
    }
    
    throw error;
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
    'CEG': ['CEG', 'Constellation Energy', '컨스텔레이션', '컨스털레이션', '컨스텔레이션에너지', '컨스털레이션에너지'],
    'OKLO': ['오클로', 'OKLO', 'Oklo'],
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