/**
 * 🚀 Stock Universe 데이터베이스 초기화 및 데이터 계산
 * stock_universe 테이블에 실제 통계 데이터를 계산하여 저장
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class StockUniverseInitializer {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(dbPath);
    this.db.configure("busyTimeout", 30000);
  }

  async initializeUniverse() {
    console.log('🚀 Stock Universe 초기화 시작...\n');

    try {
      // 1. 테이블 생성
      await this.createTables();

      // 2. 통계 계산 및 저장
      await this.calculateAndSaveStats();

      // 3. 카테고리 매핑
      await this.setupCategoryMappings();

      console.log('\n✅ Stock Universe 초기화 완료!');
      
    } catch (error) {
      console.error('❌ 초기화 실패:', error);
    } finally {
      this.db.close();
    }
  }

  async createTables() {
    console.log('📊 1. 테이블 생성 중...');
    
    const sqlPath = path.join(process.cwd(), 'scripts', 'create-stock-universe-table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // SQL 스크립트를 세미콜론으로 분할하여 각각 실행
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX') || statement.includes('INSERT INTO') || statement.includes('DROP TABLE')) {
        await this.runQuery(statement);
      }
    }

    console.log('   ✅ 테이블 생성 완료');
  }

  async calculateAndSaveStats() {
    console.log('📈 2. 통계 계산 중...');
    const startTime = Date.now();

    // 병렬로 모든 통계 계산
    const [
      totalStats,
      marketStats,
      sentimentStats,
      timeStats,
      topPerformers
    ] = await Promise.all([
      this.getTotalStats(),
      this.getMarketStats(), 
      this.getSentimentStats(),
      this.getTimeStats(),
      this.getTopPerformers()
    ]);

    const calculationTime = Date.now() - startTime;

    // stock_universe 테이블 업데이트
    const updateQuery = `
      UPDATE stock_universe SET
        total_stocks = ?,
        total_posts = ?,
        analyzed_posts = ?,
        domestic_stocks = ?,
        us_stocks = ?,
        kospi_stocks = ?,
        kosdaq_stocks = ?,
        krx_stocks = ?,
        nasdaq_stocks = ?,
        nyse_stocks = ?,
        positive_sentiment_count = ?,
        negative_sentiment_count = ?,
        neutral_sentiment_count = ?,
        merry_picks_count = ?,
        recent_mentions_30d = ?,
        posts_this_month = ?,
        posts_last_month = ?,
        top_mentioned_ticker = ?,
        most_analyzed_ticker = ?,
        average_mentions_per_stock = ?,
        analysis_completion_rate = ?,
        last_updated_at = datetime('now'),
        data_source = 'calculated_from_stocks_and_posts',
        calculation_duration_ms = ?
      WHERE id = 1
    `;

    await this.runQuery(updateQuery, [
      totalStats.totalStocks,
      totalStats.totalPosts,
      totalStats.analyzedPosts,
      marketStats.domestic,
      marketStats.us,
      marketStats.kospi,
      marketStats.kosdaq,
      marketStats.krx,
      marketStats.nasdaq,
      marketStats.nyse,
      sentimentStats.positive,
      sentimentStats.negative,
      sentimentStats.neutral,
      totalStats.merryPicks,
      timeStats.recent30d,
      timeStats.thisMonth,
      timeStats.lastMonth,
      topPerformers.topMentioned,
      topPerformers.mostAnalyzed,
      totalStats.avgMentions,
      totalStats.analysisRate,
      calculationTime
    ]);

    console.log('   📊 통계 업데이트 완료:');
    console.log(`      • 총 종목: ${totalStats.totalStocks}개`);
    console.log(`      • 국내/미국: ${marketStats.domestic}/${marketStats.us}개`);
    console.log(`      • 전체 포스트: ${totalStats.totalPosts}개`);
    console.log(`      • 분석 완료: ${totalStats.analyzedPosts}개 (${totalStats.analysisRate}%)`);
    console.log(`      • 계산 시간: ${calculationTime}ms`);
  }

  async setupCategoryMappings() {
    console.log('🎯 3. 카테고리 매핑 설정 중...');

    // 주요 종목들의 카테고리 매핑
    const mappings = [
      // AI반도체
      { ticker: '005930', category: 'AI반도체', primary: true },  // 삼성전자
      { ticker: 'NVDA', category: 'AI반도체', primary: true },   // 엔비디아
      
      // 전기차
      { ticker: 'TSLA', category: '전기차', primary: true },     // 테슬라
      
      // 빅테크
      { ticker: 'AAPL', category: '빅테크', primary: true },     // 애플
      { ticker: 'GOOGL', category: '빅테크', primary: true },    // 구글
      { ticker: 'MSFT', category: '빅테크', primary: true },     // 마이크로소프트
      { ticker: 'META', category: '빅테크', primary: true },     // 메타
      { ticker: 'AMZN', category: '빅테크', primary: true },     // 아마존
      
      // 국내대형주
      { ticker: '005930', category: '국내대형주', primary: false }, // 삼성전자
    ];

    for (const mapping of mappings) {
      try {
        const categoryId = await this.getCategoryId(mapping.category);
        if (categoryId) {
          await this.runQuery(`
            INSERT OR REPLACE INTO stock_universe_mappings 
            (ticker, category_id, is_primary, relevance_score)
            VALUES (?, ?, ?, ?)
          `, [mapping.ticker, categoryId, mapping.primary ? 1 : 0, 1.0]);
        }
      } catch (error) {
        console.warn(`   ⚠️ 매핑 실패: ${mapping.ticker} -> ${mapping.category}`);
      }
    }

    // 카테고리별 종목 수 업데이트
    await this.updateCategoryCounts();

    console.log('   ✅ 카테고리 매핑 완료');
  }

  // 유틸리티 메서드들
  async getTotalStats() {
    const [stockCount, postCount, analyzedCount, merryPicksCount] = await Promise.all([
      this.getQueryResult('SELECT COUNT(*) as count FROM stocks WHERE is_merry_mentioned = 1 AND mention_count > 0'),
      this.getQueryResult('SELECT COUNT(*) as count FROM blog_posts'),
      this.getQueryResult('SELECT COUNT(DISTINCT post_id) as count FROM sentiments'),
      this.getQueryResult('SELECT COUNT(*) as count FROM stocks WHERE is_merry_mentioned = 1 AND mention_count > 0')
    ]);

    const avgMentions = stockCount.count > 0 ? 
      (await this.getQueryResult('SELECT AVG(mention_count) as avg FROM stocks WHERE is_merry_mentioned = 1')).avg || 0 : 0;

    const analysisRate = postCount.count > 0 ? 
      Math.round((analyzedCount.count / postCount.count) * 100) : 0;

    return {
      totalStocks: stockCount.count,
      totalPosts: postCount.count,
      analyzedPosts: analyzedCount.count,
      merryPicks: merryPicksCount.count,
      avgMentions: Math.round(avgMentions * 10) / 10,
      analysisRate
    };
  }

  async getMarketStats() {
    const [domestic, us, kospi, kosdaq, krx, nasdaq, nyse] = await Promise.all([
      this.getQueryResult(`SELECT COUNT(*) as count FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0 
        AND market IN ('KOSPI', 'KOSDAQ', 'KRX')`),
      this.getQueryResult(`SELECT COUNT(*) as count FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0 
        AND market IN ('NASDAQ', 'NYSE')`),
      this.getQueryResult(`SELECT COUNT(*) as count FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0 AND market = 'KOSPI'`),
      this.getQueryResult(`SELECT COUNT(*) as count FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0 AND market = 'KOSDAQ'`),
      this.getQueryResult(`SELECT COUNT(*) as count FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0 AND market = 'KRX'`),
      this.getQueryResult(`SELECT COUNT(*) as count FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0 AND market = 'NASDAQ'`),
      this.getQueryResult(`SELECT COUNT(*) as count FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0 AND market = 'NYSE'`)
    ]);

    return {
      domestic: domestic.count,
      us: us.count,
      kospi: kospi.count,
      kosdaq: kosdaq.count,
      krx: krx.count,
      nasdaq: nasdaq.count,
      nyse: nyse.count
    };
  }

  async getSentimentStats() {
    const [positive, negative, neutral] = await Promise.all([
      this.getQueryResult(`SELECT COUNT(*) as count FROM sentiments WHERE sentiment = 'positive'`),
      this.getQueryResult(`SELECT COUNT(*) as count FROM sentiments WHERE sentiment = 'negative'`),
      this.getQueryResult(`SELECT COUNT(*) as count FROM sentiments WHERE sentiment = 'neutral'`)
    ]);

    return {
      positive: positive.count,
      negative: negative.count,
      neutral: neutral.count
    };
  }

  async getTimeStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const firstDayThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const firstDayLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDayLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];

    const [recent30d, thisMonth, lastMonth] = await Promise.all([
      this.getQueryResult(`SELECT COUNT(*) as count FROM blog_posts WHERE created_date >= '${thirtyDaysAgo}'`),
      this.getQueryResult(`SELECT COUNT(*) as count FROM blog_posts WHERE created_date >= '${firstDayThisMonth}'`),
      this.getQueryResult(`SELECT COUNT(*) as count FROM blog_posts 
        WHERE created_date >= '${firstDayLastMonth}' AND created_date <= '${lastDayLastMonth}'`)
    ]);

    return {
      recent30d: recent30d.count,
      thisMonth: thisMonth.count,
      lastMonth: lastMonth.count
    };
  }

  async getTopPerformers() {
    const [topMentioned, mostAnalyzed] = await Promise.all([
      this.getQueryResult(`SELECT ticker FROM stocks 
        WHERE is_merry_mentioned = 1 ORDER BY mention_count DESC LIMIT 1`),
      this.getQueryResult(`SELECT ticker, COUNT(*) as analysis_count FROM sentiments 
        GROUP BY ticker ORDER BY analysis_count DESC LIMIT 1`)
    ]);

    return {
      topMentioned: topMentioned?.ticker || null,
      mostAnalyzed: mostAnalyzed?.ticker || null
    };
  }

  async getCategoryId(categoryName) {
    const result = await this.getQueryResult(
      'SELECT id FROM stock_universe_categories WHERE category_name = ?',
      [categoryName]
    );
    return result?.id;
  }

  async updateCategoryCounts() {
    await this.runQuery(`
      UPDATE stock_universe_categories 
      SET stock_count = (
        SELECT COUNT(*) FROM stock_universe_mappings 
        WHERE category_id = stock_universe_categories.id
      ),
      updated_at = datetime('now')
    `);
  }

  // 데이터베이스 헬퍼 메서드들
  async runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  async getQueryResult(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

// 실행
const initializer = new StockUniverseInitializer();
initializer.initializeUniverse().catch(console.error);