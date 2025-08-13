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
    // 먼저 stock-mentions-count.json에서 기본 정보 확인
    const dataPath = path.join(process.cwd(), 'data', 'stock-mentions-count.json');
    const allPosts: any[] = [];
    
    if (fs.existsSync(dataPath)) {
      const fileContent = fs.readFileSync(dataPath, 'utf8');
      const stockData = JSON.parse(fileContent);
      
      const stock = stockData.find((s: any) => s.ticker === ticker);
      if (stock) {
        console.log(`📊 Found stock ${ticker} with ${stock.postCount} total mentions`);
        
        // recentPosts를 먼저 추가
        if (stock.recentPosts && stock.recentPosts.length > 0) {
          allPosts.push(...stock.recentPosts.map((post: any) => ({
            id: post.id,
            title: post.title,
            excerpt: post.excerpt || extractExcerpt(post.title, ticker),
            created_date: post.created_date,
            views: post.views || 0,
            category: post.category || '투자분석'
          })));
        }

        // 6개월 범위 계산
        const sixMonthsAgo = new Date();
        const periodDays = period === '6mo' ? 180 : period === '1y' ? 365 : 180;
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - periodDays);
        const sixMonthsAgoTimestamp = sixMonthsAgo.getTime();

        console.log(`📅 Looking for posts from ${sixMonthsAgo.toISOString()} to now (${periodDays} days)`);

        // 더 많은 포스트를 찾기 위해 추가 데이터 소스 확인
        // 1. 다른 주식 데이터에서도 해당 ticker가 언급된 포스트 찾기
        stockData.forEach((otherStock: any) => {
          if (otherStock.recentPosts) {
            otherStock.recentPosts.forEach((post: any) => {
              // 중복 방지
              const alreadyExists = allPosts.some(p => p.id === post.id);
              if (!alreadyExists) {
                // 포스트 내용에서 현재 ticker 언급 확인
                const mentionsTicker = post.title?.toLowerCase().includes(ticker.toLowerCase()) ||
                                     post.excerpt?.toLowerCase().includes(ticker.toLowerCase()) ||
                                     (ticker === '005930' && (
                                       post.title?.toLowerCase().includes('삼성전자') ||
                                       post.excerpt?.toLowerCase().includes('삼성전자')
                                     )) ||
                                     (ticker === 'TSLA' && (
                                       post.title?.toLowerCase().includes('테슬라') ||
                                       post.excerpt?.toLowerCase().includes('테슬라')
                                     ));

                if (mentionsTicker) {
                  // 6개월 범위 내 체크
                  const postDate = new Date(post.created_date);
                  if (postDate.getTime() >= sixMonthsAgoTimestamp) {
                    allPosts.push({
                      id: post.id,
                      title: post.title,
                      excerpt: post.excerpt || extractExcerpt(post.title, ticker),
                      created_date: post.created_date,
                      views: post.views || 0,
                      category: post.category || '투자분석'
                    });
                  }
                }
              }
            });
          }
        });

        // 실제 데이터만 사용 - CLAUDE.md 원칙: dummy data 절대 금지
        console.log(`📊 Using only real data: ${allPosts.length} posts found for ${ticker}`);
      }
    }

    // 날짜순 정렬 (최신순)
    allPosts.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());

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