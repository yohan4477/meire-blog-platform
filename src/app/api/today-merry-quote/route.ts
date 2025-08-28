import { NextRequest, NextResponse } from 'next/server';
import { Database } from 'sqlite3';
import path from 'path';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

const dbPath = path.join(process.cwd(), 'database.db');

interface BlogPost {
  log_no: number;
  title: string;
  content: string;
  created_date: string;  // DATETIME 형식 (YYYY-MM-DD HH:MM:SS)
}

function getTodayKoreaDate(): string {
  // 한국 시간대(KST) 정확히 계산 - 서버 위치 무관하게 동작
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000); // UTC 시간
  const kst = new Date(utc + (9 * 3600000)); // KST = UTC+9
  return kst.toISOString().split('T')[0] || '';
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

async function createTodayQuoteFromPost(post: BlogPost, db: any): Promise<any> {
  const { log_no, title, content, created_date } = post;
  
  // ✅ CLAUDE.md 준수: DB에서 Claude 직접 분석 결과 조회 (post_analysis 테이블)
  const relatedTickers = extractTickersFromContent(content);
  
  return new Promise((resolve) => {
    // 테이블 존재 확인 후 Claude 분석 결과 조회
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='post_analysis'",
      [],
      (err: any, tableExists: any) => {
        if (err || !tableExists) {
          // 테이블이 없는 경우 - CLAUDE.md 준수: 가짜 데이터 생성 금지
          resolve({
            log_no: log_no.toString(),
            title,
            quote: "Claude 직접 분석이 아직 수행되지 않았습니다",
            insight: `포스트 "${title}"에 대한 Claude 수동 분석이 필요합니다. CLAUDE.md 원칙에 따라 가짜 한줄 코멘트는 생성하지 않습니다.`,
            relatedTickers,
            date: new Date(created_date + 'Z').toISOString(), // DATETIME을 ISO로 변환
            readTime: "3분 읽기"
          });
          return;
        }
        
        // post_analysis 테이블에서 Claude 분석 결과를 조회
        db.get(
          'SELECT summary, investment_insight FROM post_analysis WHERE log_no = ?',
          [log_no],
          (err: any, analysis: any) => {
            if (err) {
              console.error('분석 결과 조회 오류:', err);
              resolve({
                log_no: log_no.toString(),
                title,
                quote: "분석 결과 조회 중 오류가 발생했습니다",
                insight: `포스트 "${title}"의 분석 결과를 불러올 수 없습니다. CLAUDE.md 원칙에 따라 가짜 데이터는 표시하지 않습니다.`,
                relatedTickers,
                date: new Date(created_date + 'Z').toISOString(), // DATETIME을 ISO로 변환
                readTime: "3분 읽기"
              });
              return;
            }
            
            if (analysis && analysis.summary && analysis.investment_insight) {
              // DB에 Claude 분석 결과가 있는 경우
              resolve({
                log_no: log_no.toString(),
                title,
                quote: analysis.summary,  // 한줄 정리
                insight: analysis.investment_insight,  // 투자 인사이트
                relatedTickers,
                date: new Date(created_date + 'Z').toISOString(), // DATETIME을 ISO로 변환
                readTime: "3분 읽기"
              });
            } else {
              // DB에 분석 결과가 없는 경우 - CLAUDE.md 준수: 가짜 데이터 표시 금지
              resolve({
                log_no: log_no.toString(),
                title,
                quote: "Claude 직접 분석이 아직 완료되지 않았습니다",
                insight: `포스트 "${title}"에 대한 Claude 수동 분석이 필요합니다. 실제 분석 완료 전까지는 내용을 표시하지 않습니다.`,
                relatedTickers,
                date: new Date(created_date + 'Z').toISOString(), // DATETIME을 ISO로 변환
                readTime: "3분 읽기"
              });
            }
          }
        );
      }
    );
  });
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
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
      
      // 오늘 날짜의 모든 포스트 찾기 (created_date는 DATETIME 형식)
      db.all(
        `SELECT log_no, title, content, created_date 
         FROM blog_posts 
         WHERE DATE(created_date) = ? 
         ORDER BY created_date DESC`,
        [today],
        (err, todayPosts: BlogPost[]) => {
          if (err) {
            console.error('오늘 포스트 조회 실패:', err);
            db.close();
            resolve(NextResponse.json(
              { error: '포스트 조회 실패' },
              { status: 500 }
            ));
            return;
          }

          if (todayPosts && todayPosts.length > 0) {
            // 오늘 모든 포스트로 말씀 생성 (async 처리)
            Promise.all(todayPosts.map(post => createTodayQuoteFromPost(post, db)))
              .then(todayQuotes => {
                // 성능 메트릭 기록
                const responseTime = Date.now() - startTime;
                performanceMonitor.recordMetric({
                  apiResponseTime: responseTime,
                  cacheHitRate: 1, // 오늘 포스트는 캐시 가능
                  timestamp: Date.now()
                });
                
                db.close();
                resolve(NextResponse.json({ quotes: todayQuotes, isToday: true }, {
                  headers: {
                    'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1시간 캐시
                  },
                }));
              })
              .catch(error => {
                console.error('포스트 분석 처리 오류:', error);
                db.close();
                resolve(NextResponse.json(
                  { error: '포스트 분석 처리 실패' },
                  { status: 500 }
                ));
              });
            return;
          }

          // 오늘 포스트가 없으면 가장 최근 포스트 사용
          db.get(
            `SELECT log_no, title, content, created_date 
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

              createTodayQuoteFromPost(latestPost, db)
                .then(todayQuote => {
                  // 성능 메트릭 기록
                  const responseTime = Date.now() - startTime;
                  performanceMonitor.recordMetric({
                    apiResponseTime: responseTime,
                    cacheHitRate: 0.7, // 최신 포스트는 중간 캐시 효율
                    timestamp: Date.now()
                  });
                  
                  resolve(NextResponse.json({ quotes: [todayQuote], isToday: false }, {
                    headers: {
                      'Cache-Control': 'public, max-age=1800, s-maxage=1800', // 30분 캐시 (최신 포스트용)
                    },
                  }));
                })
                .catch(error => {
                  console.error('최신 포스트 분석 오류:', error);
                  resolve(NextResponse.json(
                    { error: '최신 포스트 분석 실패' },
                    { status: 500 }
                  ));
                });
            }
          );
        }
      );
    });
  });
}