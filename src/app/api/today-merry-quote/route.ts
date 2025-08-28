import { NextRequest, NextResponse } from 'next/server';
import { Database } from 'sqlite3';
import path from 'path';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

const dbPath = path.join(process.cwd(), 'database.db');

// ⚡ 메모리 캐시 (5분 TTL)
let cachedQuoteData: any = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5분

// 🚀 DB 연결 풀링 최적화
let dbConnection: Database | null = null;

function getDbConnection(): Promise<Database> {
  return new Promise((resolve, reject) => {
    if (dbConnection) {
      return resolve(dbConnection);
    }
    
    const db = new Database(dbPath, (err) => {
      if (err) {
        reject(err);
      } else {
        // 성능 최적화 PRAGMA 설정
        db.serialize(() => {
          db.run("PRAGMA journal_mode = WAL;");
          db.run("PRAGMA synchronous = NORMAL;");
          db.run("PRAGMA cache_size = 10000;");
          db.run("PRAGMA temp_store = MEMORY;");
        });
        dbConnection = db;
        resolve(db);
      }
    });
  });
}

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
  
  try {
    // ⚡ 캐시 확인 (5분 TTL)
    const now = Date.now();
    if (cachedQuoteData && (now - cacheTimestamp) < CACHE_TTL) {
      console.log(`🚀 캐시 히트: ${now - cacheTimestamp}ms ago`);
      
      performanceMonitor.recordMetric({
        apiResponseTime: Date.now() - startTime,
        cacheHitRate: 1.0,
        timestamp: Date.now()
      });
      
      return NextResponse.json(cachedQuoteData, {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300', // 5분 캐시
          'X-Cache': 'HIT'
        }
      });
    }

    // 🚀 DB 연결 최적화
    const db = await getDbConnection();
    const today = getTodayKoreaDate();
    
    // Promise 기반으로 변환하여 성능 최적화
    const result = await new Promise<any>((resolve, reject) => {
      // 오늘 날짜의 모든 포스트 찾기 (인덱스 활용)
      db.all(
        `SELECT log_no, title, content, created_date 
         FROM blog_posts 
         WHERE DATE(created_date) = ? 
         ORDER BY created_date DESC LIMIT 5`,
        [today],
        async (err, todayPosts: BlogPost[]) => {
          if (err) {
            reject(err);
            return;
          }

          try {
            if (todayPosts && todayPosts.length > 0) {
              // 병렬 처리로 성능 최적화
              const todayQuotes = await Promise.all(
                todayPosts.map(post => createTodayQuoteFromPost(post, db))
              );
              
              resolve({ quotes: todayQuotes, isToday: true });
            } else {
              // 캐시된 최신 포스트 조회
              db.get(
                `SELECT log_no, title, content, created_date 
                 FROM blog_posts 
                 ORDER BY created_date DESC 
                 LIMIT 1`,
                [],
                async (err, latestPost: BlogPost | undefined) => {
                  if (err) {
                    reject(err);
                    return;
                  }

                  if (!latestPost) {
                    resolve({ quotes: [], isToday: false });
                    return;
                  }

                  try {
                    const todayQuote = await createTodayQuoteFromPost(latestPost, db);
                    resolve({ quotes: [todayQuote], isToday: false });
                  } catch (error) {
                    reject(error);
                  }
                }
              );
            }
          } catch (error) {
            reject(error);
          }
        }
      );
    });

    // ⚡ 캐시 저장
    cachedQuoteData = result;
    cacheTimestamp = now;

    // 성능 메트릭 기록
    const responseTime = Date.now() - startTime;
    performanceMonitor.recordMetric({
      apiResponseTime: responseTime,
      cacheHitRate: 0,
      timestamp: Date.now()
    });

    console.log(`⚡ Today Merry Quote API: ${responseTime}ms`);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300', // 5분 캐시
        'X-Cache': 'MISS',
        'X-Response-Time': `${responseTime}ms`
      }
    });

  } catch (error) {
    console.error('Today Merry Quote API 에러:', error);
    
    return NextResponse.json(
      { error: 'API 처리 실패', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}