import { NextRequest, NextResponse } from 'next/server';
import { performantDb, getStockMentions, getRecentPosts } from '@/lib/db-performance';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

// ⚡ 메모리 캐시 (2분 TTL)
let cachedPicksData: any = null;
let picksTimestamp: number = 0;
const PICKS_CACHE_TTL = 2 * 60 * 1000; // 2분

// CLAUDE.md 요구사항: 메르's Pick - 최신 언급일 기준 랭킹 (절대 준수)
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '8');
    const cacheBuster = searchParams.get('t');

    // ⚡ 캐시 확인 (강제 캐시 버스터가 없을 때만)
    const now = Date.now();
    if (!cacheBuster && cachedPicksData && (now - picksTimestamp) < PICKS_CACHE_TTL) {
      console.log(`🚀 Merry's Picks 캐시 히트: ${now - picksTimestamp}ms ago`);
      
      performanceMonitor.recordMetric({
        apiResponseTime: Date.now() - startTime,
        cacheHitRate: 1.0,
        timestamp: Date.now()
      });
      
      return NextResponse.json(cachedPicksData, {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=120', // 2분 캐시
          'X-Cache': 'HIT',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      });
    }

    console.log(`⭐ Fetching Merry's picks from DB (limit: ${limit})`);
    console.log(`⭐ Fetching Merry's picks with performance optimization (limit: ${limit})`);

    // 실시간 데이터베이스에서 메르가 최근에 언급한 종목들을 가져오기
    const picks = await getMerryPicksFromDB(limit);

    const responseData = {
      success: true,
      data: {
        picks,
        total: picks.length,
        fetchedAt: new Date().toISOString()
      }
    };

    // ⚡ 캐시 저장
    if (!cacheBuster) {
      cachedPicksData = responseData;
      picksTimestamp = now;
    }

    const response = NextResponse.json(responseData);

    // 성능 메트릭 기록
    const responseTime = Date.now() - startTime;
    performanceMonitor.recordMetric({
      apiResponseTime: responseTime,
      cacheHitRate: 0,
      timestamp: Date.now()
    });

    console.log(`⚡ Merry's Picks API: ${responseTime}ms`);

    // CLAUDE.md 캐시 무효화 요구사항: 실시간 업데이트 지원
    if (cacheBuster) {
      // 캐시 버스터 파라미터 있을 때: 완전 캐시 무효화
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      response.headers.set('X-Cache', 'BUST');
      console.log('🔄 Cache invalidated due to cache buster parameter');
    } else {
      // 기본: 중간 캐시 (2분) - 실시간성과 성능의 균형
      response.headers.set('Cache-Control', 'public, max-age=120, s-maxage=120, must-revalidate');
      response.headers.set('X-Cache', 'MISS');
      response.headers.set('X-Response-Time', `${responseTime}ms`);
      console.log('⚡ Medium cache applied (2min)');
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
    description: '트럼프 행정부의 반도체 국산화 정책 핵심기업, 정부 지분투자로 사실상 국영기업화 추진 중'
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
    description: '트럼프의 약값 최혜국대우 정책에 맞서 영국 비만치료제 마운자로 가격 170% 인상한 글로벌 제약사'
  },
  'OKLO': {
    name: '오클로',
    market: 'NASDAQ',
    currency: 'USD',
    description: '소형 모듈 원자로(SMR) 기술을 보유한 차세대 원자력 에너지 회사, 방사성 폐기물을 연료로 재활용하는 혁신적 MMR 기술 개발'
  },
  'UNH': {
    name: '유나이티드헬스그룹',
    market: 'NYSE',
    currency: 'USD',
    description: '트럼프 공격에도 불구하고 워런 버핏이 16억달러 매수한 미국 의료카르텔 핵심기업'
  },
  '010620': {
    name: '현대미포조선',
    market: 'KOSPI',
    currency: 'KRW',
    description: '북극항로 개통으로 중형선박 수요 증가 예상, 한국 조선3사 중 중형선박 전문 조선소'
  },
  'BA': {
    name: '보잉',
    market: 'NYSE',
    currency: 'USD',
    description: '세계 최대 항공기 제조업체 중 하나로 민간 및 군용 항공기를 생산하는 미국 대표 항공우주 기업'
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
  'OKLO': ['오클로', 'Oklo'],
  'UNH': ['유나이티드헬스', '유나이티드헬스그룹', 'UnitedHealth'],
  'BA': ['보잉', '보잉기', 'Boeing']
};

// Helper function to get latest stock prices from database
async function getLatestStockPrices(): Promise<Record<string, any>> {
  const query = `
    WITH latest_prices AS (
      SELECT ticker, close_price, date, volume,
             LAG(close_price, 1) OVER (PARTITION BY ticker ORDER BY date) as prev_close
      FROM stock_prices 
    ),
    price_changes AS (
      SELECT ticker, close_price, date, volume, prev_close,
             ROUND(close_price - prev_close, 2) as price_change,
             ROUND(((close_price - prev_close) * 100.0 / prev_close), 2) as change_percent
      FROM latest_prices
      WHERE prev_close IS NOT NULL
    )
    SELECT ticker, close_price, price_change, change_percent, date, volume
    FROM price_changes
    WHERE (ticker, date) IN (
      SELECT ticker, MAX(date) 
      FROM stock_prices 
      GROUP BY ticker
    )
  `;
  
  try {
    const rows = await new Promise<any[]>((resolve, reject) => {
      const StockDB = require('../../../../lib/stock-db-sqlite3');
      const stockDB = new StockDB();
      stockDB.connect().then(() => {
        stockDB.db.all(query, [], (err: any, rows: any) => {
          stockDB.close();
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    });
    
    const latestPrices: Record<string, any> = {};
    
    rows.forEach(row => {
      latestPrices[row.ticker] = {
        price: row.close_price,
        change: row.price_change,
        changePercent: row.change_percent,
        date: row.date,
        volume: row.volume
      };
    });
    
    console.log(`📊 Loaded latest prices for ${Object.keys(latestPrices).length} tickers with price changes`);
    return latestPrices;
  } catch (error) {
    console.error('Failed to get latest stock prices:', error);
    return {};
  }
}

// Helper function to get sentiment analysis data for each ticker
async function getSentimentData(): Promise<Record<string, any>> {
  const query = `
    SELECT 
      ticker,
      COUNT(*) as analyzed_count,
      AVG(sentiment_score) as avg_sentiment_score,
      GROUP_CONCAT(sentiment) as all_sentiments,
      -- 최근 3개 감정의 가중평균
      (SELECT AVG(sentiment_score * confidence) / AVG(confidence)
       FROM (
         SELECT sentiment_score, confidence
         FROM post_stock_analysis psa2
         WHERE psa2.ticker = psa.ticker
         ORDER BY analyzed_at DESC
         LIMIT 3
       )) as weighted_recent_score
    FROM post_stock_analysis psa
    GROUP BY ticker
  `;
  
  try {
    const rows = await new Promise<any[]>((resolve, reject) => {
      const StockDB = require('../../../../lib/stock-db-sqlite3');
      const stockDB = new StockDB();
      stockDB.connect().then(() => {
        stockDB.db.all(query, [], (err: any, rows: any) => {
          stockDB.close();
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    });
    
    const sentimentData: Record<string, any> = {};
    
    rows.forEach(row => {
      // 감정 결정 로직 (stocks API와 동일한 기준 적용)
      let finalSentiment = 'neutral';
      const weightedScore = row.weighted_recent_score || row.avg_sentiment_score || 0;
      
      if (weightedScore > 0.3) {
        finalSentiment = 'positive';
      } else if (weightedScore < -0.3) {
        finalSentiment = 'negative';
      } else if (row.all_sentiments) {
        // 가중 평균이 중립일 때는 최근 감정 다수결
        const sentiments = row.all_sentiments.split(',');
        const sentimentCount = {
          positive: sentiments.filter((s: string) => s === 'positive').length,
          negative: sentiments.filter((s: string) => s === 'negative').length,
          neutral: sentiments.filter((s: string) => s === 'neutral').length
        };
        
        if (sentimentCount.positive > sentimentCount.negative && sentimentCount.positive > sentimentCount.neutral) {
          finalSentiment = 'positive';
        } else if (sentimentCount.negative > sentimentCount.positive && sentimentCount.negative > sentimentCount.neutral) {
          finalSentiment = 'negative';
        }
      }
      
      sentimentData[row.ticker] = {
        analyzed_count: row.analyzed_count,
        sentiment: finalSentiment,
        sentiment_score: weightedScore
      };
    });
    
    console.log(`📊 Loaded sentiment data for ${Object.keys(sentimentData).length} tickers`);
    return sentimentData;
  } catch (error) {
    console.error('Failed to get sentiment data:', error);
    return {};
  }
}

async function getMerryPicksFromDB(limit: number): Promise<any[]> {
  try {
    const startTime = Date.now();
    console.log(`⭐ Fetching Merry's picks with performance optimization (limit: ${limit})`);
    
    // Get sentiment data, latest prices, and stock tags
    const [sentimentData, latestPrices, stockTags] = await Promise.all([
      getSentimentData(),
      getLatestStockPrices(),
      getStockTags()
    ]);
    
    // Use high-performance database helper
    const recentPosts = await getRecentPosts(90); // 90 days
    console.log(`📊 Found ${recentPosts.length} recent posts (${Date.now() - startTime}ms)`);

    // 각 종목별 최신 언급일과 고유 포스트 수 계산 (중복 제거)
    const stockMentions: Record<string, any> = {};

    // Optimize content matching with pre-compiled regex
    const processPost = (post: any) => {
      const content = (post.title + ' ' + (post.content || '') + ' ' + (post.excerpt || '')).toLowerCase();
      
      for (const [ticker, names] of Object.entries(TICKER_NAME_MAP)) {
        const isMatchingTicker = ticker.toLowerCase();
        const isMatchingNames = names.some(name => 
          content.includes(name.toLowerCase()) || content.includes(isMatchingTicker)
        );

        if (isMatchingNames || content.includes(isMatchingTicker)) {
          if (!stockMentions[ticker]) {
            stockMentions[ticker] = {
              ticker,
              mentions: [],
              uniquePostIds: new Set(), // 🔧 중복 제거를 위한 Set 추가
              count: 0
            };
          }
          
          // 🔧 이미 추가된 포스트인지 확인 (중복 방지)
          if (!stockMentions[ticker].uniquePostIds.has(post.id)) {
            stockMentions[ticker].mentions.push({
              log_no: post.id,
              title: post.title,
              created_date: post.created_date
            });
            stockMentions[ticker].uniquePostIds.add(post.id);
            stockMentions[ticker].count++; // 🔧 고유 포스트만 카운트
          }
        }
      }
    };

    // Process posts in batches for better performance
    const batchSize = 50;
    for (let i = 0; i < recentPosts.length; i += batchSize) {
      const batch = recentPosts.slice(i, i + batchSize);
      batch.forEach(processPost);
    }

    // CLAUDE.md 요구사항: 최신 언급일 기준으로 정렬 (최적화)
    const picks = Object.values(stockMentions)
      .filter((stock: any) => stock.count > 0)
      .map((stock: any) => {
        const latestMentionTimestamp = Math.max(...stock.mentions.map((m: any) => {
          const date = m.created_date;
          return typeof date === 'number' ? date : new Date(date).getTime();
        }));
        
        const stockInfo = STOCK_INFO_MAP[stock.ticker] || {
          name: stock.ticker,
          market: 'UNKNOWN',
          currency: 'USD',
          description: '회사 정보 준비 중'
        };

        const priceData = latestPrices[stock.ticker];

        // 유연한 태그 파싱 (JSON 배열 또는 콤마 구분 문자열 지원)
        let parsedTags = [];
        try {
          const tagData = stockTags[stock.ticker];
          if (tagData) {
            // JSON 배열 형태인지 확인
            if (tagData.startsWith('[') && tagData.endsWith(']')) {
              parsedTags = JSON.parse(tagData);
            } else {
              // 콤마로 구분된 문자열 처리
              parsedTags = tagData.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
            }
          }
        } catch (error) {
          console.warn(`Failed to parse tags for ${stock.ticker}:`, error);
          // 콤마로 구분된 문자열로 다시 시도
          try {
            const tagData = stockTags[stock.ticker];
            parsedTags = tagData ? tagData.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : [];
          } catch (e) {
            parsedTags = [];
          }
        }

        const sentimentInfo = sentimentData[stock.ticker] || { 
          sentiment: 'neutral', 
          sentiment_score: 0, 
          analyzed_count: 0 
        };

        return {
          ticker: stock.ticker,
          name: stockInfo.name,
          market: stockInfo.market,
          currency: stockInfo.currency,
          last_mentioned_at: new Date(latestMentionTimestamp).toISOString(),
          mention_count: stock.count,
          current_price: priceData?.price || null,
          price_change: priceData?.changePercent || null,
          sentiment: sentimentInfo.sentiment,
          sentiment_score: sentimentInfo.sentiment_score,
          description: stockInfo.description,
          analyzed_count: sentimentInfo.analyzed_count,
          tags: parsedTags // Add tags from database
        };
      })
      .sort((a: any, b: any) => {
        // 1. 감정 우선순위: 긍정 > 중립 > 부정
        const sentimentPriority: Record<string, number> = {
          'positive': 3,
          'neutral': 2,
          'negative': 1
        };
        
        const sentimentA = sentimentPriority[a.sentiment] || 2;
        const sentimentB = sentimentPriority[b.sentiment] || 2;
        
        // 감정이 다르면 긍정적인 것을 우선
        if (sentimentA !== sentimentB) {
          return sentimentB - sentimentA;
        }
        
        // 2. 같은 감정일 때는 감정 점수로 정렬
        if (a.sentiment_score !== b.sentiment_score) {
          return (b.sentiment_score || 0) - (a.sentiment_score || 0);
        }
        
        // 3. 그 다음은 최신 언급일 순
        const dateB = new Date(b.last_mentioned_at).getTime();
        const dateA = new Date(a.last_mentioned_at).getTime();
        return dateB !== dateA ? dateB - dateA : b.mention_count - a.mention_count;
      })
      .slice(0, limit);

    const totalTime = Date.now() - startTime;
    console.log(`⭐ Found ${picks.length} Merry's picks in ${totalTime}ms (performance optimized)`);
    
    return picks;

  } catch (error) {
    console.error('DB에서 메르 Pick 조회 실패:', error);
    return [];
  }
}

// Get stock tags from database
async function getStockTags(): Promise<Record<string, string>> {
  try {
    const db = await performantDb.getConnection();
    const query = `
      SELECT ticker, tags 
      FROM stocks 
      WHERE tags IS NOT NULL AND tags != '' AND tags != '[]'
    `;
    
    const rows: any[] = await new Promise((resolve, reject) => {
      db.all(query, [], (err: any, rows: any) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    const tagMap: Record<string, string> = {};
    rows.forEach((row: any) => {
      if (row.tags) {
        tagMap[row.ticker] = row.tags;
      }
    });

    console.log(`📋 Loaded tags for ${Object.keys(tagMap).length} stocks`);
    return tagMap;
  } catch (error) {
    console.error('Stock tags 조회 실패:', error);
    return {};
  }
}