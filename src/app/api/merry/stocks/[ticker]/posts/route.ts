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
    console.log(`🔍 Fetching posts related to ticker: ${ticker}`);

    // 먼저 메르 포스트 데이터베이스에서 해당 종목이 언급된 포스트들을 찾기
    const relatedPosts = await findPostsByTicker(ticker);

    return NextResponse.json({
      success: true,
      data: {
        ticker,
        posts: relatedPosts,
        total: relatedPosts.length
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

async function findPostsByTicker(ticker: string): Promise<any[]> {
  try {
    // 먼저 stock-mentions-count.json 파일에서 해당 종목의 recentPosts 확인
    const dataPath = path.join(process.cwd(), 'data', 'stock-mentions-count.json');
    
    if (fs.existsSync(dataPath)) {
      const fileContent = fs.readFileSync(dataPath, 'utf8');
      const stockData = JSON.parse(fileContent);
      
      const stock = stockData.find((s: any) => s.ticker === ticker);
      if (stock && stock.recentPosts && stock.recentPosts.length > 0) {
        console.log(`📝 Found ${stock.recentPosts.length} recent posts for ${ticker} from JSON file`);
        
        // recentPosts 데이터를 API 형식에 맞게 변환
        return stock.recentPosts.map((post: any) => ({
          id: post.id,
          title: post.title,
          excerpt: post.excerpt || extractExcerpt(post.title, ticker),
          created_date: post.created_date || post.date,
          views: post.views || 0,
          category: post.category || '투자분석'
        }));
      }
    }

    // JSON 파일에 데이터가 없으면 SQLite 데이터베이스 시도
    const dbPath = path.join(process.cwd(), 'database.db');
    
    if (!fs.existsSync(dbPath)) {
      console.error('데이터베이스 파일이 존재하지 않습니다:', dbPath);
      // CLAUDE.md 원칙: Dummy data 사용 금지, 실제 데이터 없으면 빈 배열
      console.log(`⚠️ No database file found for ${ticker}, returning empty array`);
      return [];
    }

    try {
      // better-sqlite3 동적 import 시도
      const Database = (await import('better-sqlite3')).default;
      const db = Database(dbPath, { readonly: true });
      
      // 메르 블로그 포스트에서 해당 ticker가 언급된 포스트들을 찾기
      const posts = db.prepare(`
        SELECT id, title, content, created_date, views, category
        FROM merry_posts 
        WHERE content LIKE ? OR title LIKE ?
        ORDER BY created_date DESC
        LIMIT 20
      `).all(`%${ticker}%`, `%${ticker}%`);

      db.close();

      // 결과 가공
      const processedPosts = posts.map((post: any) => ({
        id: post.id,
        title: post.title,
        excerpt: extractExcerpt(post.content, ticker),
        created_date: post.created_date,
        views: post.views || 0,
        category: post.category || '일반'
      }));

      console.log(`📝 Found ${processedPosts.length} posts mentioning ${ticker} from database`);
      return processedPosts;
    } catch (dbError) {
      console.error('데이터베이스 조회 실패:', dbError);
      // CLAUDE.md 원칙: Dummy data 사용 금지, 실제 데이터 없으면 빈 배열
      console.log(`⚠️ Database query failed for ${ticker}, returning empty array`);
      return [];
    }

  } catch (error) {
    console.error('종목별 포스트 조회 실패:', error);
    // CLAUDE.md 원칙: Dummy data 사용 금지, 실제 데이터 없으면 빈 배열
    console.log(`⚠️ Error occurred while fetching posts for ${ticker}, returning empty array`);
    return [];
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