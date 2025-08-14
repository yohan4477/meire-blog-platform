import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
const { getStockDB } = require('@/lib/stock-db-sqlite3');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const resolvedParams = await params;
    const ticker = resolvedParams.ticker;
    
    // URL 파라미터에서 페이지네이션 정보 추출
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    console.log(`🔍 Fetching posts for ${ticker}, limit: ${limit}, offset: ${offset}`);

    // 먼저 SQLite 데이터베이스에서 관련 포스트 조회 (페이지네이션 지원)
    let result = await findPostsByTickerFromDB(ticker, limit, offset);
    
    // SQLite에서 결과가 없으면 JSON 파일에서 fallback 조회
    if (result.total === 0) {
      result = await findPostsByTickerFromJSON(ticker, limit, offset);
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

async function findPostsByTickerFromDB(ticker: string, limit: number, offset: number) {
  try {
    const stockDB = getStockDB();
    await stockDB.connect();
    const result = await stockDB.getRelatedPosts(ticker, limit, offset);
    stockDB.close(); // 글로벌 인스턴스는 유지됨
    
    console.log(`📝 Found ${result.total} total posts for ${ticker} from database (showing ${result.posts.length})`);
    return result;
  } catch (error) {
    console.error('데이터베이스 조회 실패:', error);
    return {
      posts: [],
      total: 0,
      hasMore: false,
      limit,
      offset
    };
  }
}

async function findPostsByTickerFromJSON(ticker: string, limit: number, offset: number) {
  try {
    // JSON 파일에서 해당 종목의 recentPosts 확인
    const dataPath = path.join(process.cwd(), 'data', 'merry-stocks-clean.json');
    
    if (fs.existsSync(dataPath)) {
      const fileContent = fs.readFileSync(dataPath, 'utf8');
      const stockData = JSON.parse(fileContent);
      
      const stock = stockData.find((s: any) => s.ticker === ticker);
      if (stock && stock.recentPosts && stock.recentPosts.length > 0) {
        const allPosts = stock.recentPosts.map((post: any) => ({
          id: post.id,
          title: post.title,
          excerpt: post.excerpt || extractExcerpt(post.title, ticker),
          published_date: post.created_date || post.date,
          views: post.views || 0,
          category: post.category || '투자분석'
        }));
        
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