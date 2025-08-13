import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// CLAUDE.md 요구사항: 메르's Pick - 최근 언급 순서로 표시
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '8');
    const cacheBuster = searchParams.get('t');

    console.log(`⭐ Fetching Merry's picks (limit: ${limit})`);

    // 메르가 최근에 언급한 종목들을 가져오기
    const picks = await getMerryPicks(limit);

    const response = NextResponse.json({
      success: true,
      data: {
        picks,
        total: picks.length,
        fetchedAt: new Date().toISOString()
      }
    });

    // CLAUDE.md 성능 요구사항: 캐싱을 통한 빠른 로딩 (<500ms)
    if (cacheBuster) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
    } else {
      // 5분 캐시 (메인 페이지 로딩 성능을 위해)
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    }

    return response;

  } catch (error) {
    console.error('메르 Pick 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: { message: '메르 Pick 조회 실패' }
    }, { status: 500 });
  }
}

async function getMerryPicks(limit: number): Promise<any[]> {
  try {
    // 1. 기존 stock-mentions-count.json에서 데이터 가져오기
    const dataPath = path.join(process.cwd(), 'data', 'stock-mentions-count.json');
    
    if (!fs.existsSync(dataPath)) {
      console.log('⚠️ Stock mentions data file not found');
      return [];
    }

    const fileContent = fs.readFileSync(dataPath, 'utf8');
    const stockData = JSON.parse(fileContent);

    // 2. CLAUDE.md 요구사항에 따라 처리
    const picks = stockData
      .filter((stock: any) => {
        // 메르가 언급한 종목만 (is_mentioned = true)
        return stock.ticker && stock.name && stock.postCount > 0;
      })
      .map((stock: any) => {
        // 최근 언급일 계산 (recentPosts에서 가장 최근 날짜)
        let lastMentionedAt = new Date().toISOString();
        if (stock.recentPosts && stock.recentPosts.length > 0) {
          const dates = stock.recentPosts
            .map((post: any) => new Date(post.created_date).getTime())
            .filter((time: number) => !isNaN(time));
          
          if (dates.length > 0) {
            lastMentionedAt = new Date(Math.max(...dates)).toISOString();
          }
        }

        // 현재가 정보 (있는 경우)
        let currentPrice = null;
        let priceChange = null;
        
        if (stock.currentPrice && stock.currentPrice > 0) {
          currentPrice = stock.currentPrice;
        }
        
        if (stock.priceChange) {
          priceChange = stock.priceChange;
        }

        // 감정 분석 (간단한 휴리스틱)
        let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
        if (priceChange) {
          if (priceChange.startsWith('+')) sentiment = 'positive';
          else if (priceChange.startsWith('-')) sentiment = 'negative';
        }

        return {
          ticker: stock.ticker,
          name: stock.name,
          market: stock.market || 'UNKNOWN',
          currency: stock.currency || 'USD',
          last_mentioned_at: lastMentionedAt,
          mention_count: stock.postCount || stock.mentions || 1,
          current_price: currentPrice,
          price_change: priceChange,
          sentiment
        };
      })
      // 3. 최recent 언급 순서로 정렬 (CLAUDE.md 핵심 요구사항)
      .sort((a: any, b: any) => {
        const dateA = new Date(a.last_mentioned_at).getTime();
        const dateB = new Date(b.last_mentioned_at).getTime();
        
        // 최근 언급일 기준 내림차순
        if (dateB !== dateA) {
          return dateB - dateA;
        }
        
        // 같은 날이면 언급 횟수로 비교
        return b.mention_count - a.mention_count;
      })
      // 4. 제한된 개수만 반환
      .slice(0, limit);

    console.log(`⭐ Found ${picks.length} Merry's picks (sorted by recent mentions)`);
    
    // 로그로 순서 확인
    picks.forEach((pick: any, index: number) => {
      console.log(`  ${index + 1}. ${pick.name} (${pick.ticker}) - ${pick.last_mentioned_at.split('T')[0]}, ${pick.mention_count}번 언급`);
    });

    return picks;

  } catch (error) {
    console.error('메르 Pick 데이터 처리 실패:', error);
    // CLAUDE.md 원칙: 실제 데이터 없으면 빈 배열
    return [];
  }
}

// 데이터베이스 연동을 위한 미래 확장 함수
async function getMerryPicksFromDB(limit: number): Promise<any[]> {
  try {
    // 향후 merry_mentioned_stocks 테이블에서 데이터 가져오기
    // const db = getStockMentionDB();
    // const picks = db.prepare(`
    //   SELECT * FROM merry_mentioned_stocks 
    //   WHERE is_mentioned = TRUE 
    //   ORDER BY last_mentioned_at DESC, mention_count DESC
    //   LIMIT ?
    // `).all(limit);
    
    // return picks;
    
    // 현재는 JSON 파일 사용
    return [];
  } catch (error) {
    console.error('DB에서 메르 Pick 조회 실패:', error);
    return [];
  }
}