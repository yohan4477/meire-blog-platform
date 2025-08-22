import { NextRequest, NextResponse } from 'next/server';
import { Database } from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.db');

interface BlogPost {
  id: number;
  title: string;
  content: string;
  created_date: string;
}

function getTodayKoreaDate(): string {
  // 한국 시간 기준으로 오늘 날짜 계산
  const kstOffset = 9 * 60; // 한국은 UTC+9
  const now = new Date();
  const kstTime = new Date(now.getTime() + (kstOffset * 60 * 1000));
  return kstTime.toISOString().split('T')[0];
}

function extractTickersFromContent(content: string): string[] {
  const tickers: string[] = [];
  
  // 미국 주식 티커 패턴 (대문자 3-5자리)
  const usTickerMatches = content.match(/\b[A-Z]{3,5}\b/g);
  if (usTickerMatches) {
    // 실제 알려진 티커만 필터링
    const knownTickers = ['TSLA', 'AAPL', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX'];
    usTickerMatches.forEach(ticker => {
      if (knownTickers.includes(ticker) && !tickers.includes(ticker)) {
        tickers.push(ticker);
      }
    });
  }
  
  // 한국 주식 티커 패턴 (6자리 숫자)
  const krTickerMatches = content.match(/\b\d{6}\b/g);
  if (krTickerMatches) {
    // 실제 알려진 한국 주식 코드만 필터링
    const knownKrTickers = ['005930', '000660', '035420', '051910', '068270'];
    krTickerMatches.forEach(ticker => {
      if (knownKrTickers.includes(ticker) && !tickers.includes(ticker)) {
        tickers.push(ticker);
      }
    });
  }
  
  return tickers;
}

function createTodayQuoteFromPost(post: BlogPost) {
  const { id, title, content, created_date } = post;
  
  // 오늘의 포스트 기준으로 메르님 말씀 생성
  let quote = "";
  let insight = "";
  
  if (title.includes("SMR") || title.includes("원자로")) {
    quote = "기존 원전, SMR, MMR은 각각 장단점이 있으니 상황에 따라 활용될 것이며, 재활용 기술이 도입되면 방사능 폐기물이 재사용 가능한 핵연료로 바뀔 수 있습니다.";
    insight = "오클로(Oklo)는 사용후 핵연료를 재활용하는 MMR(마이크로 모듈 원자로) 기술로 주목받고 있으며, 트럼프 정부의 원전 정책 지원으로 2027년 상업 운영이 성공할지가 관건입니다. 다만 기술의 어려움과 아직 상용화되지 않은 점은 리스크 요소로 고려해야 합니다.";
  } else if (title.includes("포트폴리오")) {
    quote = "주식은 비정상적으로 사람들의 심리가 한쪽으로 쏠리면서, 현실보다 과하게 시장이 반응할 때 투자기회가 생기는 경우가 있습니다.";
    insight = "조선업의 노란봉투법 영향, 은 투자의 44% 수익률, 그리고 국장 개별주 단타 성공 사례를 통해 다양한 투자 전략의 중요성을 보여줍니다. 특히 남들이 공포로 도망칠 때 차별화된 수익을 얻을 수 있는 것이 주식 투자의 매력입니다.";
  } else if (title.includes("미장") && title.includes("로쉬 하샤나")) {
    quote = "70% 확률로 적중하는 'Sell on Rosh Hashanah, buy on Yom Kippur' 전략은 미장 투자에서 고려할 만한 계절성 패턴입니다.";
    insight = "유대인의 신년 명절인 로쉬 하샤나(9월 22-24일) 전후로 미장에서 매도 압력이 나타나고, 욤 키푸르(10월 1-2일) 이후 반등하는 패턴이 통계적으로 유의미합니다. 2000년 이후 24년간 70% 확률로 이 패턴이 나타났으며, 올해도 주목해볼 만합니다.";
  } else {
    // 기본 메시지
    quote = "투자는 근본적 분석과 시장 심리를 동시에 고려하여 신중하게 접근해야 합니다.";
    insight = "오늘도 메르님의 깊이 있는 투자 인사이트를 통해 시장을 이해하고 현명한 투자 결정을 내리는 데 도움이 되기를 바랍니다.";
  }
  
  const relatedTickers = extractTickersFromContent(content);
  
  return {
    id: id.toString(),
    title,
    quote,
    insight,
    relatedTickers,
    date: created_date,
    readTime: "3분 읽기"
  };
}

export async function GET(request: NextRequest) {
  return new Promise((resolve) => {
    const db = new Database(dbPath, (err) => {
      if (err) {
        console.error('데이터베이스 연결 실패:', err);
        resolve(NextResponse.json(
          { error: '데이터베이스 연결 실패' },
          { status: 500 }
        ));
        return;
      }

      const today = getTodayKoreaDate();
      
      // 오늘 날짜의 포스트 먼저 찾기
      db.get(
        `SELECT id, title, content, created_date 
         FROM blog_posts 
         WHERE DATE(created_date) = ? 
         ORDER BY created_date DESC 
         LIMIT 1`,
        [today],
        (err, todayPost: BlogPost | undefined) => {
          if (err) {
            console.error('오늘 포스트 조회 실패:', err);
            db.close();
            resolve(NextResponse.json(
              { error: '포스트 조회 실패' },
              { status: 500 }
            ));
            return;
          }

          if (todayPost) {
            // 오늘 포스트가 있으면 해당 포스트로 응답
            const todayQuote = createTodayQuoteFromPost(todayPost);
            db.close();
            resolve(NextResponse.json(todayQuote, {
              headers: {
                'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1시간 캐시
              },
            }));
            return;
          }

          // 오늘 포스트가 없으면 가장 최근 포스트 사용
          db.get(
            `SELECT id, title, content, created_date 
             FROM blog_posts 
             ORDER BY created_date DESC 
             LIMIT 1`,
            [],
            (err, latestPost: BlogPost | undefined) => {
              db.close();
              
              if (err) {
                console.error('최신 포스트 조회 실패:', err);
                resolve(NextResponse.json(
                  { error: '포스트 조회 실패' },
                  { status: 500 }
                ));
                return;
              }

              if (!latestPost) {
                resolve(NextResponse.json(
                  { error: '포스트를 찾을 수 없음' },
                  { status: 404 }
                ));
                return;
              }

              const todayQuote = createTodayQuoteFromPost(latestPost);
              resolve(NextResponse.json(todayQuote, {
                headers: {
                  'Cache-Control': 'public, max-age=1800, s-maxage=1800', // 30분 캐시 (최신 포스트용)
                },
              }));
            }
          );
        }
      );
    });
  });
}