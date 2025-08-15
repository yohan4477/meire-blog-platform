import { NextRequest, NextResponse } from 'next/server';

// CLAUDE.md 요구사항: 메르's Pick - 최신 언급일 기준 랭킹 (절대 준수)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '8');
    const cacheBuster = searchParams.get('t');

    console.log(`⭐ Fetching Merry's picks from DB (limit: ${limit})`);

    // 실시간 데이터베이스에서 메르가 최근에 언급한 종목들을 가져오기
    const picks = await getMerryPicksFromDB(limit);

    const response = NextResponse.json({
      success: true,
      data: {
        picks,
        total: picks.length,
        fetchedAt: new Date().toISOString()
      }
    });

    // CLAUDE.md 캐시 무효화 요구사항: 실시간 업데이트 지원
    if (cacheBuster) {
      // 캐시 버스터 파라미터 있을 때: 완전 캐시 무효화
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      console.log('🔄 Cache invalidated due to cache buster parameter');
    } else {
      // 기본: 짧은 캐시 (30초) - 실시간성과 성능의 균형
      response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30, must-revalidate');
      console.log('⚡ Short cache applied (30s)');
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

// 종목 정보 매핑 (회사 소개 포함)
const STOCK_INFO_MAP: Record<string, any> = {
  '005930': {
    name: '삼성전자',
    market: 'KOSPI',
    currency: 'KRW',
    description: '글로벌 메모리 반도체와 스마트폰 분야를 선도하는 대한민국 대표 기술기업'
  },
  'TSLA': {
    name: '테슬라',
    market: 'NASDAQ',
    currency: 'USD',
    description: '일론 머스크가 이끄는 전기차와 자율주행 기술의 글로벌 선도기업'
  },
  '042660': {
    name: '한화오션',
    market: 'KOSPI',
    currency: 'KRW',
    description: 'LNG선과 해양플랜트 건조 기술을 보유한 대한민국 조선업계 선두기업'
  },
  'AAPL': {
    name: '애플',
    market: 'NASDAQ',
    currency: 'USD',
    description: '아이폰과 맥을 통해 글로벌 IT 생태계를 구축한 미국 대표 기술기업'
  },
  '267250': {
    name: 'HD현대',
    market: 'KOSPI',
    currency: 'KRW',
    description: '조선·해양플랜트·건설기계 분야의 글로벌 종합 중공업 기업'
  },
  'NVDA': {
    name: '엔비디아',
    market: 'NASDAQ',
    currency: 'USD',
    description: 'AI와 게이밍용 GPU 시장을 선도하는 미국 반도체 설계 전문기업'
  },
  'GOOGL': {
    name: '구글',
    market: 'NASDAQ',
    currency: 'USD',
    description: '검색엔진과 클라우드 서비스로 글로벌 인터넷 생태계를 주도하는 기술기업'
  },
  'SK하이닉스': {
    name: 'SK하이닉스',
    market: 'KOSPI',
    currency: 'KRW',
    description: 'HBM과 D램 등 메모리 반도체 분야의 글로벌 선두 기업'
  },
  'BRK': {
    name: '버크셔 헤서웨이',
    market: 'NYSE',
    currency: 'USD',
    description: '워런 버핏이 이끄는 세계 최대 규모의 가치투자 지주회사'
  },
  'TSM': {
    name: 'TSMC',
    market: 'NYSE',
    currency: 'USD',
    description: '애플과 엔비디아 칩을 생산하는 세계 최대 반도체 파운드리 기업'
  },
  'MSFT': {
    name: '마이크로소프트',
    market: 'NASDAQ',
    currency: 'USD',
    description: '윈도우와 오피스로 시작해 클라우드와 AI 분야로 확장한 글로벌 기술기업'
  },
  'META': {
    name: '메타',
    market: 'NASDAQ',
    currency: 'USD',
    description: '페이스북과 인스타그램을 운영하며 메타버스 기술을 개발하는 소셜미디어 기업'
  },
  'INTC': {
    name: '인텔',
    market: 'NASDAQ',
    currency: 'USD',
    description: 'PC와 서버용 프로세서 시장을 오랫동안 주도해온 미국 반도체 기업'
  },
  'AMD': {
    name: 'AMD',
    market: 'NASDAQ',
    currency: 'USD',
    description: 'CPU와 GPU 시장에서 인텔과 엔비디아에 도전하는 미국 반도체 설계기업'
  },
  'LLY': {
    name: '일라이릴리',
    market: 'NYSE',
    currency: 'USD',
    description: '당뇨병과 비만 치료제 분야를 선도하는 미국 제약회사'
  },
  'UNH': {
    name: '유나이티드헬스그룹',
    market: 'NYSE',
    currency: 'USD',
    description: '미국 최대 규모의 의료보험 및 헬스케어 서비스 기업'
  }
};

// 종목명 매핑 (한글명과 영문명 포함)
const TICKER_NAME_MAP: Record<string, string[]> = {
  '005930': ['삼성전자', '삼성', 'Samsung'],
  'TSLA': ['테슬라', 'Tesla'],
  '042660': ['한화오션', '한화'],
  'AAPL': ['애플', 'Apple'],
  '267250': ['HD현대', '현대'],
  'NVDA': ['엔비디아', 'NVIDIA', 'Nvidia'],
  'GOOGL': ['구글', 'Google', '알파벳', 'Alphabet'],
  'SK하이닉스': ['SK하이닉스', 'SK하이닉스'],
  'BRK': ['버크셔', '버크셔헤서웨이', 'Berkshire'],
  'TSM': ['TSMC', '대만세미'],
  'MSFT': ['마이크로소프트', 'Microsoft'],
  'META': ['메타', 'Meta', '페이스북'],
  'INTC': ['인텔', 'Intel'],
  'AMD': ['AMD', 'Advanced Micro Devices'],
  'LLY': ['일라이릴리', '릴리', 'Eli Lilly'],
  'UNH': ['유나이티드헬스', '유나이티드헬스그룹', 'UnitedHealth']
};

async function getMerryPicksFromDB(limit: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const sqlite3 = require('sqlite3').verbose();
      const path = require('path');
      const dbPath = path.join(process.cwd(), 'database.db');
      
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err: any) => {
        if (err) {
          console.error('DB 연결 실패:', err);
          resolve([]);
          return;
        }
        
        // 최근 90일 내 포스트에서 종목 언급 검색
        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
        const query = `
          SELECT id, title, content, excerpt, created_date 
          FROM blog_posts 
          WHERE created_date >= ? 
          ORDER BY created_date DESC
        `;
        
        db.all(query, [ninetyDaysAgo], (err: any, recentPosts: any[]) => {
          if (err) {
            console.error('DB 쿼리 오류:', err);
            db.close();
            resolve([]);
            return;
          }

        console.log(`📊 Found ${recentPosts.length} recent posts to analyze for stock mentions`);

        // 각 종목별 최신 언급일과 언급 횟수 계산
        const stockMentions: Record<string, any> = {};

        for (const post of recentPosts) {
          const content = (post.title + ' ' + (post.content || '') + ' ' + (post.excerpt || '')).toLowerCase();
          
          // 각 종목에 대해 언급 여부 확인
          for (const [ticker, names] of Object.entries(TICKER_NAME_MAP)) {
            const isMatchingTicker = ticker.toLowerCase();
            const isMatchingNames = names.some(name => 
              content.includes(name.toLowerCase()) ||
              content.includes(isMatchingTicker)
            );

            if (isMatchingNames || content.includes(isMatchingTicker)) {
              if (!stockMentions[ticker]) {
                stockMentions[ticker] = {
                  ticker,
                  mentions: [],
                  count: 0
                };
              }
              
              stockMentions[ticker].mentions.push({
                post_id: post.id,
                title: post.title,
                created_date: post.created_date
              });
              stockMentions[ticker].count++;
            }
          }
        }

        // CLAUDE.md 요구사항: 최신 언급일 기준으로 정렬
        const picks = Object.values(stockMentions)
          .filter((stock: any) => stock.count > 0) // 언급된 종목만
          .map((stock: any) => {
            // 가장 최근 언급일 계산
            const latestMention = Math.max(...stock.mentions.map((m: any) => m.created_date));
            const stockInfo = STOCK_INFO_MAP[stock.ticker] || {
              name: stock.ticker,
              market: 'UNKNOWN',
              currency: 'USD',
              description: '회사 정보 준비 중'
            };

            // 유효한 날짜인지 확인
            const lastMentionDate = new Date(latestMention);
            const lastMentionISO = isNaN(lastMentionDate.getTime()) 
              ? new Date().toISOString() 
              : lastMentionDate.toISOString();

            return {
              ticker: stock.ticker,
              name: stockInfo.name,
              market: stockInfo.market,
              currency: stockInfo.currency,
              last_mentioned_at: lastMentionISO,
              mention_count: stock.count,
              current_price: null, // 실시간 가격은 별도 API에서 처리
              price_change: null,
              sentiment: 'neutral',
              description: stockInfo.description
            };
          })
          .sort((a: any, b: any) => {
            // CLAUDE.md 핵심 요구사항: 최신 언급일 기준 내림차순
            const dateA = new Date(a.last_mentioned_at).getTime();
            const dateB = new Date(b.last_mentioned_at).getTime();
            
            if (dateB !== dateA) {
              return dateB - dateA;
            }
            
            // 같은 날이면 언급 횟수로 비교
            return b.mention_count - a.mention_count;
          })
          .slice(0, limit);

        console.log(`⭐ Found ${picks.length} Merry's picks (sorted by latest mentions)`);
        
        // 로그로 순서 확인
        picks.forEach((pick: any, index: number) => {
          const date = pick.last_mentioned_at.split('T')[0];
          console.log(`  ${index + 1}. ${pick.name} (${pick.ticker}) - ${date}, ${pick.mention_count}번 언급`);
        });

          db.close();
          resolve(picks);
        });
      });

    } catch (error) {
      console.error('DB에서 메르 Pick 조회 실패:', error);
      // CLAUDE.md 원칙: 실제 데이터 없으면 빈 배열
      resolve([]);
    }
  });
}