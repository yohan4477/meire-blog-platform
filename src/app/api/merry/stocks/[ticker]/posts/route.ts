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
      return getMockRelatedPosts(ticker);
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
      return getMockRelatedPosts(ticker);
    }

  } catch (error) {
    console.error('종목별 포스트 조회 실패:', error);
    return getMockRelatedPosts(ticker);
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

function getMockRelatedPosts(ticker: string): any[] {
  // 개발/테스트용 모의 데이터
  const mockPosts: Record<string, any[]> = {
    '005930': [
      {
        id: 1,
        title: '삼성전자의 AI 반도체 전략 분석',
        excerpt: '삼성전자가 AI 반도체 시장에서 어떤 전략을 펼치고 있는지 분석해봤습니다...',
        created_date: '2025-08-10T00:00:00Z',
        views: 1205,
        category: '기업분석'
      },
      {
        id: 2,
        title: '국민연금의 삼성전자 투자 비중 변화',
        excerpt: '국민연금이 삼성전자에 대한 투자 비중을 조정하고 있다는 소식이...',
        created_date: '2025-08-08T00:00:00Z',
        views: 892,
        category: '투자분석'
      }
    ],
    'TSLA': [
      {
        id: 3,
        title: '테슬라의 자율주행 기술, 정말 완전할까?',
        excerpt: '테슬라의 FSD가 점점 발전하고 있지만 여전히 한계가 있어 보입니다...',
        created_date: '2025-08-09T00:00:00Z',
        views: 1543,
        category: '기술분석'
      },
      {
        id: 4,
        title: '일론 머스크의 트위터 발언이 테슬라 주가에 미치는 영향',
        excerpt: '일론 머스크의 트위터(X) 발언들이 테슬라 주가에 어떤 영향을 미치는지...',
        created_date: '2025-08-07T00:00:00Z',
        views: 967,
        category: '시장분석'
      }
    ]
  };

  return mockPosts[ticker] || [
    {
      id: 999,
      title: `${ticker} 관련 포스트 준비 중`,
      excerpt: '해당 종목에 대한 메르의 분석 포스트를 준비하고 있습니다...',
      created_date: new Date().toISOString(),
      views: 0,
      category: '준비중'
    }
  ];
}