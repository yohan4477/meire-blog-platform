/**
 * 포괄적 종목 추출 및 연결 시스템
 * 모든 블로그 포스트에서 종목 티커를 추출하고 merry mention DB에 연결
 * Claude AI 기반 감정 분석 결과 추가 및 차트 시스템 수정 (최근 6개월)
 */

const StockDB = require('../src/lib/stock-db-sqlite3');
const SentimentAnalyzer = require('../src/lib/sentiment-analyzer');

class ComprehensiveStockExtractor {
  constructor() {
    this.stockDB = null;
    this.sentimentAnalyzer = new SentimentAnalyzer();
    
    // 확장 가능한 종목 매핑 (티커 → 회사명/키워드)
    this.stockMappings = {
      // 한국 주식
      '005930': ['삼성전자', '삼성', '삼성디스플레이', '삼성바이오', '삼성반도체', 'Samsung'],
      '000660': ['SK하이닉스', 'SK하이닉스', 'SKH', 'SK Hynix'],
      '207940': ['삼성바이오로직스', '삼성바이오', 'Samsung Bio'],
      '006400': ['삼성SDI', '삼성 SDI'],
      '009150': ['삼성전기', '삼성 전기'],
      '028260': ['삼성물산', '삼성 물산'],
      '018260': ['삼성에스디에스', '삼성SDS', 'Samsung SDS'],
      '012330': ['현대모비스', '현대 모비스'],
      '051910': ['LG화학', 'LG 화학'],
      '373220': ['LG에너지솔루션', 'LG에너지', 'LG Energy'],
      '066570': ['LG전자', 'LG 전자'],
      '003550': ['LG', 'LG그룹'],
      '005380': ['현대차', '현대자동차'],
      '000270': ['기아', '기아자동차', 'KIA'],
      '035720': ['카카오', 'Kakao'],
      '035420': ['NAVER', '네이버'],
      '251270': ['넷마블', 'Netmarble'],
      '036570': ['엔씨소프트', 'NCsoft'],
      '068270': ['셀트리온', 'Celltrion'],
      '207940': ['삼성바이오로직스'],
      '326030': ['SK바이오팜', 'SK Bio'],
      '028300': ['HLB', 'HLB생명과학'],
      '086900': ['메디톡스', 'Medytox'],
      '302440': ['SK바이오사이언스', 'SK Bio Science'],
      
      // 미국 주식  
      'TSLA': ['테슬라', 'Tesla', '일론머스크'],
      'AAPL': ['애플', 'Apple', '아이폰', 'iPhone', '애플워치'],
      'NVDA': ['엔비디아', 'NVIDIA', '젠슨황', 'H100', 'AI칩'],
      'GOOGL': ['구글', 'Google', '알파벳', 'Alphabet'],
      'AMZN': ['아마존', 'Amazon', 'AWS'],
      'MSFT': ['마이크로소프트', 'Microsoft', '윈도우'],
      'META': ['메타', 'Meta', '페이스북', 'Facebook'],
      'NFLX': ['넷플릭스', 'Netflix'],
      'AMD': ['AMD', '라이젠', 'Ryzen'],
      'INTC': ['인텔', 'Intel'],
      'QCOM': ['퀄컴', 'Qualcomm'],
      'CRM': ['세일즈포스', 'Salesforce'],
      'ORCL': ['오라클', 'Oracle'],
      'IBM': ['IBM', '아이비엠'],
      'ADBE': ['어도비', 'Adobe'],
      'PYPL': ['페이팔', 'PayPal'],
      'DIS': ['디즈니', 'Disney'],
      'KO': ['코카콜라', 'Coca Cola'],
      'PFE': ['화이자', 'Pfizer'],
      'JNJ': ['존슨앤존슨', 'Johnson&Johnson'],
      'WMT': ['월마트', 'Walmart'],
      'V': ['비자', 'Visa'],
      'JPM': ['JP모건', 'JPMorgan'],
      'BAC': ['뱅크오브아메리카', 'Bank of America'],
      'XOM': ['엑손모빌', 'ExxonMobil'],
      'CVX': ['셰브론', 'Chevron'],
      'UNH': ['유나이티드헬스', 'UnitedHealth'],
      'HD': ['홈디포', 'Home Depot'],
      'PG': ['P&G', 'Procter&Gamble'],
      'LLY': ['일라이릴리', 'Eli Lilly'],
      
      // 대만/중국 주식
      'TSM': ['TSMC', '대만반도체', 'Taiwan Semiconductor'],
      'BABA': ['알리바바', 'Alibaba'],
      'PDD': ['PDD', '핀둬둬'],
      'BIDU': ['바이두', 'Baidu'],
      'JD': ['JD.com', '징동'],
      
      // 기타 주요 종목
      'ASML': ['ASML', '네덜란드'],
      'SAP': ['SAP', '독일'],
      'TM': ['도요타', 'Toyota'],
      'NVO': ['노보노디스크', 'Novo Nordisk'],
      'NESN': ['네슬레', 'Nestle']
    };
    
  }

  async connect() {
    this.stockDB = new StockDB();
    await this.stockDB.connect();
    console.log('✅ Connected to database');
  }

  async close() {
    if (this.stockDB) {
      await this.stockDB.close();
      console.log('🔌 Database connection closed');
    }
  }

  async queryPromise(query, params = []) {
    return new Promise((resolve, reject) => {
      this.stockDB.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async updatePromise(query, params = []) {
    return new Promise((resolve, reject) => {
      this.stockDB.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  // 최근 6개월 포스트 가져오기
  async getRecentPosts() {
    console.log('📅 최근 6개월 포스트 가져오기...');
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
    const startDate = sixMonthsAgo.toISOString().replace('T', ' ').replace('Z', '');
    
    const posts = await this.queryPromise(`
      SELECT id, title, content, excerpt, created_date, views
      FROM blog_posts 
      WHERE created_date >= ?
      ORDER BY created_date DESC
    `, [startDate]);

    console.log(`📊 최근 6개월 포스트: ${posts.length}개`);
    return posts;
  }

  // 포스트에서 종목 추출
  extractStocksFromPost(post) {
    const { id, title, content, excerpt } = post;
    const fullText = `${title} ${content || ''} ${excerpt || ''}`.toLowerCase();
    const foundStocks = [];
    
    // 각 종목에 대해 키워드 매칭
    for (const [ticker, keywords] of Object.entries(this.stockMappings)) {
      let mentionCount = 0;
      const matchedKeywords = [];
      
      for (const keyword of keywords) {
        const regex = new RegExp(keyword.toLowerCase(), 'gi');
        const matches = (fullText.match(regex) || []).length;
        if (matches > 0) {
          mentionCount += matches;
          matchedKeywords.push(keyword);
        }
      }
      
      // 종목이 언급되었으면 추가
      if (mentionCount > 0) {
        foundStocks.push({
          ticker,
          mentionCount,
          keywords: matchedKeywords,
          context: this.extractContext(fullText, matchedKeywords)
        });
      }
    }
    
    return foundStocks;
  }

  // 컨텍스트 추출 (언급 주변 텍스트)
  extractContext(text, keywords) {
    for (const keyword of keywords) {
      const index = text.toLowerCase().indexOf(keyword.toLowerCase());
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + keyword.length + 50);
        return text.substring(start, end).trim();
      }
    }
    return '';
  }

  // Claude AI 기반 감정 분석 수행
  async analyzeSentiment(post, stockInfo) {
    const { title, content, excerpt } = post;
    const { ticker } = stockInfo;
    
    // 종목명 가져오기
    const stockNames = this.stockMappings[ticker] || [ticker];
    const stockName = stockNames[0];
    
    // Claude AI 감정 분석 실행
    const fullText = `${title}\n\n${content || excerpt || ''}`;
    const analysis = await this.sentimentAnalyzer.analyzeWithClaudeAI(fullText, ticker, stockName);
    
    return {
      sentiment: analysis.sentiment,
      score: analysis.score,
      reasoning: analysis.context?.substring(0, 200) || `${ticker} 관련 Claude AI 분석`,
      confidence: analysis.confidence,
      context: analysis.context
    };
  }

  // merry_mentioned_stocks에 추가
  async addToMerryMentioned(postId, ticker, stockInfo, createdDate) {
    try {
      // 이미 존재하는지 확인
      const existing = await this.queryPromise(`
        SELECT id FROM merry_mentioned_stocks 
        WHERE ticker = ? AND post_id = ?
      `, [ticker, postId]);

      if (existing.length > 0) {
        return false; // 이미 존재함
      }

      // 새로 추가
      await this.updatePromise(`
        INSERT INTO merry_mentioned_stocks (
          ticker, post_id, mentioned_date, mention_type, context,
          is_featured, created_at, mention_count, last_mentioned_at,
          mention_count_1m, mention_count_3m, mention_count_6m, mention_count_total
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
      `, [
        ticker,
        postId,
        createdDate,
        'post_content',
        stockInfo.context.substring(0, 200),
        0, // is_featured
        stockInfo.mentionCount,
        createdDate, // last_mentioned_at
        1, 1, 1, 1 // 기본 카운트들
      ]);

      return true; // 새로 추가됨
    } catch (error) {
      console.warn(`  ⚠️ merry_mentioned_stocks 추가 실패: ${ticker} - ${error.message}`);
      return false;
    }
  }

  // sentiments에 추가
  async addSentimentAnalysis(postId, ticker, post, stockInfo) {
    try {
      // 이미 존재하는지 확인
      const existing = await this.queryPromise(`
        SELECT id FROM sentiments 
        WHERE ticker = ? AND post_id = ?
      `, [ticker, postId]);

      if (existing.length > 0) {
        return false; // 이미 존재함
      }

      // Claude AI 기반 감정 분석 수행
      const analysis = await this.analyzeSentiment(post, stockInfo);

      // sentiments 테이블 형식에 맞춰 추가
      await this.updatePromise(`
        INSERT INTO sentiments (
          post_id, ticker, sentiment, sentiment_score,
          key_reasoning, supporting_evidence, investment_perspective,
          investment_timeframe, conviction_level, mention_context,
          uncertainty_factors, analysis_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'), CURRENT_TIMESTAMP)
      `, [
        postId,
        ticker,
        analysis.sentiment,
        analysis.score,
        analysis.reasoning,
        JSON.stringify(['Claude AI 기반 감정 분석']),
        JSON.stringify(['종목별 투자 전망', '시장 동향 분석']),
        'medium_term',
        'moderate',
        analysis.context?.substring(0, 200) || stockInfo.context.substring(0, 200),
        JSON.stringify(['시장 변동성', '정책 변화'])
      ]);

      return true; // 새로 추가됨
    } catch (error) {
      console.warn(`  ⚠️ sentiments 추가 실패: ${ticker} - ${error.message}`);
      return false;
    }
  }

  // stocks 테이블에 종목 정보 추가/업데이트
  async ensureStockExists(ticker) {
    try {
      // 종목이 이미 존재하는지 확인
      const existing = await this.queryPromise(`
        SELECT ticker FROM stocks WHERE ticker = ?
      `, [ticker]);

      if (existing.length > 0) {
        return false; // 이미 존재함
      }

      // 새 종목 추가
      const keywords = this.stockMappings[ticker] || [ticker];
      const companyName = keywords[0];

      await this.updatePromise(`
        INSERT INTO stocks (
          ticker, company_name, description, tags,
          mention_count_1m, mention_count_3m, mention_count_6m, mention_count_total,
          sentiment_count_1m, sentiment_count_3m, sentiment_count_6m, sentiment_count_total,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        ticker,
        companyName,
        `${companyName} 관련 투자 분석 및 시장 동향`,
        JSON.stringify(['투자', '분석', '주식']),
        0, 0, 0, 0, // mention counts
        0, 0, 0, 0  // sentiment counts
      ]);

      console.log(`  ✅ 새 종목 추가: ${ticker} (${companyName})`);
      return true; // 새로 추가됨
    } catch (error) {
      console.warn(`  ⚠️ stocks 테이블 추가 실패: ${ticker} - ${error.message}`);
      return false;
    }
  }

  // stocks 테이블 카운트 업데이트
  async updateStockCounts(ticker) {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      const startDate30 = thirtyDaysAgo.toISOString().replace('T', ' ').replace('Z', '');
      const startDate90 = ninetyDaysAgo.toISOString().replace('T', ' ').replace('Z', '');
      const startDate180 = oneEightyDaysAgo.toISOString().replace('T', ' ').replace('Z', '');

      // Mention counts
      const [count1m, count3m, count6m, countTotal] = await Promise.all([
        this.queryPromise(`
          SELECT COUNT(*) as count 
          FROM merry_mentioned_stocks mms
          INNER JOIN blog_posts bp ON mms.post_id = bp.id
          WHERE mms.ticker = ? AND bp.created_date >= ?
        `, [ticker, startDate30]),
        
        this.queryPromise(`
          SELECT COUNT(*) as count 
          FROM merry_mentioned_stocks mms
          INNER JOIN blog_posts bp ON mms.post_id = bp.id
          WHERE mms.ticker = ? AND bp.created_date >= ?
        `, [ticker, startDate90]),
        
        this.queryPromise(`
          SELECT COUNT(*) as count 
          FROM merry_mentioned_stocks mms
          INNER JOIN blog_posts bp ON mms.post_id = bp.id
          WHERE mms.ticker = ? AND bp.created_date >= ?
        `, [ticker, startDate180]),
        
        this.queryPromise(`
          SELECT COUNT(*) as count 
          FROM merry_mentioned_stocks 
          WHERE ticker = ?
        `, [ticker])
      ]);

      // Sentiment counts
      const [sentCount1m, sentCount3m, sentCount6m, sentCountTotal] = await Promise.all([
        this.queryPromise(`
          SELECT COUNT(*) as count 
          FROM sentiments s
          INNER JOIN blog_posts bp ON s.post_id = bp.id
          WHERE s.ticker = ? AND bp.created_date >= ?
        `, [ticker, startDate30]),
        
        this.queryPromise(`
          SELECT COUNT(*) as count 
          FROM sentiments s
          INNER JOIN blog_posts bp ON s.post_id = bp.id
          WHERE s.ticker = ? AND bp.created_date >= ?
        `, [ticker, startDate90]),
        
        this.queryPromise(`
          SELECT COUNT(*) as count 
          FROM sentiments s
          INNER JOIN blog_posts bp ON s.post_id = bp.id
          WHERE s.ticker = ? AND bp.created_date >= ?
        `, [ticker, startDate180]),
        
        this.queryPromise(`
          SELECT COUNT(*) as count 
          FROM sentiments 
          WHERE ticker = ?
        `, [ticker])
      ]);

      const counts = {
        mention_1m: count1m[0].count,
        mention_3m: count3m[0].count,
        mention_6m: count6m[0].count,
        mention_total: countTotal[0].count,
        sentiment_1m: sentCount1m[0].count,
        sentiment_3m: sentCount3m[0].count,
        sentiment_6m: sentCount6m[0].count,
        sentiment_total: sentCountTotal[0].count
      };

      // stocks 테이블 업데이트
      await this.updatePromise(`
        UPDATE stocks 
        SET 
          mention_count_1m = ?,
          mention_count_3m = ?,
          mention_count_6m = ?,
          mention_count_total = ?,
          sentiment_count_1m = ?,
          sentiment_count_3m = ?,
          sentiment_count_6m = ?,
          sentiment_count_total = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE ticker = ?
      `, [
        counts.mention_1m, counts.mention_3m, counts.mention_6m, counts.mention_total,
        counts.sentiment_1m, counts.sentiment_3m, counts.sentiment_6m, counts.sentiment_total,
        ticker
      ]);

      return counts;
    } catch (error) {
      console.warn(`  ⚠️ ${ticker} 카운트 업데이트 실패: ${error.message}`);
      return null;
    }
  }

  // 메인 실행
  async extractAndConnectAllStocks() {
    console.log('🚀 포괄적 종목 추출 및 연결 시작...');
    
    const stats = {
      totalPosts: 0,
      stocksFound: 0,
      newMentions: 0,
      newSentiments: 0,
      newStocks: 0,
      stockBreakdown: {}
    };

    try {
      // 1. 최근 6개월 포스트 가져오기
      const posts = await this.getRecentPosts();
      stats.totalPosts = posts.length;

      console.log(`\n📝 ${posts.length}개 포스트에서 종목 추출 시작...`);

      // 2. 각 포스트에서 종목 추출 및 처리
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const progress = `(${i + 1}/${posts.length})`;
        
        console.log(`\n🔍 ${progress} 포스트 ID ${post.id} 처리 중...`);
        console.log(`  제목: ${post.title.substring(0, 60)}...`);

        // 종목 추출
        const foundStocks = this.extractStocksFromPost(post);
        
        if (foundStocks.length > 0) {
          stats.stocksFound++;
          console.log(`  📊 발견된 종목: ${foundStocks.length}개`);

          // 각 종목 처리
          for (const stockInfo of foundStocks) {
            const { ticker } = stockInfo;
            
            if (!stats.stockBreakdown[ticker]) {
              stats.stockBreakdown[ticker] = 0;
            }
            stats.stockBreakdown[ticker]++;

            console.log(`    🎯 ${ticker} 처리 중...`);

            // stocks 테이블에 종목 추가 (없는 경우)
            const isNewStock = await this.ensureStockExists(ticker);
            if (isNewStock) {
              stats.newStocks++;
            }

            // merry_mentioned_stocks에 추가
            const isNewMention = await this.addToMerryMentioned(
              post.id, ticker, stockInfo, post.created_date
            );
            if (isNewMention) {
              stats.newMentions++;
              console.log(`      ✅ 새 언급 추가: ${ticker}`);
            }

            // Claude AI 감정 분석 추가
            console.log(`      🤖 Claude AI 감정 분석 중: ${ticker}...`);
            const isNewSentiment = await this.addSentimentAnalysis(
              post.id, ticker, post, stockInfo
            );
            if (isNewSentiment) {
              stats.newSentiments++;
              console.log(`      ✅ Claude AI 감정 분석 완료: ${ticker}`);
            }
          }
        } else {
          console.log(`  📊 발견된 종목: 0개`);
        }

        // 진행률 표시 (10개마다)
        if ((i + 1) % 10 === 0) {
          console.log(`\n📈 진행률: ${i + 1}/${posts.length} (${((i + 1) / posts.length * 100).toFixed(1)}%)`);
        }
      }

      // 3. 모든 종목의 카운트 업데이트
      console.log(`\n🔢 종목별 카운트 업데이트 중...`);
      const uniqueStocks = Object.keys(stats.stockBreakdown);
      
      for (const ticker of uniqueStocks) {
        console.log(`  📊 ${ticker} 카운트 업데이트...`);
        const counts = await this.updateStockCounts(ticker);
        
        if (counts) {
          console.log(`    1M: ${counts.sentiment_1m}/${counts.mention_1m}`);
          console.log(`    3M: ${counts.sentiment_3m}/${counts.mention_3m}`);
          console.log(`    6M: ${counts.sentiment_6m}/${counts.mention_6m}`);
        }
      }

      // 4. 최종 결과 출력
      console.log(`\n🎯 포괄적 종목 추출 및 연결 완료!`);
      console.log(`📊 최종 통계:`);
      console.log(`  처리된 포스트: ${stats.totalPosts}개`);
      console.log(`  종목 발견 포스트: ${stats.stocksFound}개`);
      console.log(`  새로 추가된 언급: ${stats.newMentions}개`);
      console.log(`  새로 추가된 감정 분석: ${stats.newSentiments}개`);
      console.log(`  새로 추가된 종목: ${stats.newStocks}개`);
      console.log(`  발견된 고유 종목: ${uniqueStocks.length}개`);

      console.log(`\n📈 종목별 언급 횟수:`);
      const sortedStocks = Object.entries(stats.stockBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20); // 상위 20개만

      sortedStocks.forEach(([ticker, count], idx) => {
        const companyName = this.stockMappings[ticker]?.[0] || ticker;
        console.log(`  ${idx + 1}. ${ticker} (${companyName}): ${count}회`);
      });

      return {
        success: true,
        stats,
        processedStocks: uniqueStocks
      };

    } catch (error) {
      console.error('❌ 포괄적 종목 추출 중 오류:', error);
      throw error;
    }
  }
}

async function main() {
  const extractor = new ComprehensiveStockExtractor();
  
  try {
    await extractor.connect();
    const result = await extractor.extractAndConnectAllStocks();
    
    console.log('\n✅ 포괄적 종목 추출 및 연결 완료!');
    console.log('📈 다음: 웹사이트에서 업데이트된 차트들 확인');
    return result;
    
  } catch (error) {
    console.error('💥 포괄적 종목 추출 실패:', error);
    throw error;
  } finally {
    await extractor.close();
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(result => {
      console.log('\n🎉 포괄적 종목 추출 성공');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { ComprehensiveStockExtractor };