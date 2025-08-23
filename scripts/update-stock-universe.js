/**
 * 🔄 종목 리스트 자동 업데이트 시스템
 * 종목 데이터 변경시 자동으로 리스트 통계를 갱신
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class StockListUpdater {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(dbPath);
    this.db.configure("busyTimeout", 30000);
  }

  /**
   * 🚀 빠른 통계 업데이트 (주요 지표만)
   */
  async quickUpdate() {
    console.log('⚡ 종목 리스트 빠른 업데이트 시작...');
    const startTime = Date.now();

    try {
      // stock_list 테이블이 존재하는지 확인
      const tableExists = await this.checkTableExists('stock_list');
      
      if (!tableExists) {
        console.log('📊 stock_list 테이블이 없어서 생성합니다...');
        await this.createUniverseTable();
      }

      // 핵심 통계만 빠르게 업데이트
      const [
        totalStats,
        marketStats,
        postStats
      ] = await Promise.all([
        this.getTotalStocks(),
        this.getMarketBreakdown(),
        this.getPostStats()
      ]);

      const updateTime = Date.now();
      const calculationDuration = updateTime - startTime;

      // stock_universe 업데이트 또는 생성
      await this.upsertUniverseStats({
        total_stocks: totalStats.total,
        domestic_stocks: marketStats.domestic,
        us_stocks: marketStats.us,
        kospi_stocks: marketStats.kospi,
        kosdaq_stocks: marketStats.kosdaq,
        krx_stocks: marketStats.krx,
        nasdaq_stocks: marketStats.nasdaq,
        nyse_stocks: marketStats.nyse,
        total_posts: postStats.total,
        analyzed_posts: postStats.analyzed,
        merry_picks_count: totalStats.total,
        analysis_completion_rate: postStats.total > 0 ? Math.round((postStats.analyzed / postStats.total) * 100) : 0,
        calculation_duration_ms: calculationDuration,
        last_updated_at: new Date().toISOString(),
        data_source: 'auto_update_system'
      });

      console.log('✅ 종목 리스트 업데이트 완료:');
      console.log(`   📊 총 종목: ${totalStats.total}개`);
      console.log(`   🌏 국내/미국: ${marketStats.domestic}/${marketStats.us}개`);
      console.log(`   📝 포스트: ${postStats.analyzed}/${postStats.total}개 분석완료`);
      console.log(`   ⚡ 처리시간: ${calculationDuration}ms`);

      return {
        success: true,
        stats: {
          totalStocks: totalStats.total,
          domesticStocks: marketStats.domestic,
          usStocks: marketStats.us,
          totalPosts: postStats.total,
          analyzedPosts: postStats.analyzed
        },
        performanceMs: calculationDuration
      };

    } catch (error) {
      console.error('❌ 업데이트 실패:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.db.close();
    }
  }

  async checkTableExists(tableName) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `, [tableName], (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      });
    });
  }

  async createUniverseTable() {
    return new Promise((resolve, reject) => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS stock_list (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          total_stocks INTEGER NOT NULL DEFAULT 0,
          total_posts INTEGER NOT NULL DEFAULT 0,
          analyzed_posts INTEGER NOT NULL DEFAULT 0,
          domestic_stocks INTEGER NOT NULL DEFAULT 0,
          us_stocks INTEGER NOT NULL DEFAULT 0,
          kospi_stocks INTEGER NOT NULL DEFAULT 0,
          kosdaq_stocks INTEGER NOT NULL DEFAULT 0,
          krx_stocks INTEGER NOT NULL DEFAULT 0,
          nasdaq_stocks INTEGER NOT NULL DEFAULT 0,
          nyse_stocks INTEGER NOT NULL DEFAULT 0,
          merry_picks_count INTEGER NOT NULL DEFAULT 0,
          analysis_completion_rate REAL DEFAULT 0.0,
          last_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          data_source TEXT DEFAULT 'auto_created',
          calculation_duration_ms INTEGER DEFAULT 0
        )
      `, (err) => {
        if (err) reject(err);
        else {
          console.log('📊 stock_list 테이블 생성 완료');
          resolve(true);
        }
      });
    });
  }

  async getTotalStocks() {
    const result = await this.queryGet(`
      SELECT COUNT(*) as total
      FROM stocks 
      WHERE is_merry_mentioned = 1 AND mention_count > 0
    `);
    return { total: result.total || 0 };
  }

  async getMarketBreakdown() {
    const [domestic, us, kospi, kosdaq, krx, nasdaq, nyse] = await Promise.all([
      this.queryGet(`SELECT COUNT(*) as count FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0 
        AND market IN ('KOSPI', 'KOSDAQ', 'KRX')`),
      this.queryGet(`SELECT COUNT(*) as count FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0 
        AND market IN ('NASDAQ', 'NYSE')`),
      this.queryGet(`SELECT COUNT(*) as count FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0 AND market = 'KOSPI'`),
      this.queryGet(`SELECT COUNT(*) as count FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0 AND market = 'KOSDAQ'`),
      this.queryGet(`SELECT COUNT(*) as count FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0 AND market = 'KRX'`),
      this.queryGet(`SELECT COUNT(*) as count FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0 AND market = 'NASDAQ'`),
      this.queryGet(`SELECT COUNT(*) as count FROM stocks 
        WHERE is_merry_mentioned = 1 AND mention_count > 0 AND market = 'NYSE'`)
    ]);

    return {
      domestic: domestic.count || 0,
      us: us.count || 0,
      kospi: kospi.count || 0,
      kosdaq: kosdaq.count || 0,
      krx: krx.count || 0,
      nasdaq: nasdaq.count || 0,
      nyse: nyse.count || 0
    };
  }

  async getPostStats() {
    const [total, analyzed] = await Promise.all([
      this.queryGet('SELECT COUNT(*) as count FROM blog_posts'),
      this.queryGet('SELECT COUNT(DISTINCT post_id) as count FROM sentiments')
    ]);

    return {
      total: total.count || 0,
      analyzed: analyzed.count || 0
    };
  }

  async upsertUniverseStats(stats) {
    // 기존 레코드가 있는지 확인
    const existingRecord = await this.queryGet('SELECT id FROM stock_list WHERE id = 1');

    if (existingRecord) {
      // 업데이트
      return this.queryRun(`
        UPDATE stock_list SET
          total_stocks = ?,
          domestic_stocks = ?,
          us_stocks = ?,
          kospi_stocks = ?,
          kosdaq_stocks = ?,
          krx_stocks = ?,
          nasdaq_stocks = ?,
          nyse_stocks = ?,
          total_posts = ?,
          analyzed_posts = ?,
          merry_picks_count = ?,
          analysis_completion_rate = ?,
          last_updated_at = ?,
          data_source = ?,
          calculation_duration_ms = ?
        WHERE id = 1
      `, [
        stats.total_stocks,
        stats.domestic_stocks,
        stats.us_stocks,
        stats.kospi_stocks,
        stats.kosdaq_stocks,
        stats.krx_stocks,
        stats.nasdaq_stocks,
        stats.nyse_stocks,
        stats.total_posts,
        stats.analyzed_posts,
        stats.merry_picks_count,
        stats.analysis_completion_rate,
        stats.last_updated_at,
        stats.data_source,
        stats.calculation_duration_ms
      ]);
    } else {
      // 생성
      return this.queryRun(`
        INSERT INTO stock_list (
          id, total_stocks, domestic_stocks, us_stocks,
          kospi_stocks, kosdaq_stocks, krx_stocks,
          nasdaq_stocks, nyse_stocks, total_posts, analyzed_posts,
          merry_picks_count, analysis_completion_rate,
          last_updated_at, data_source, calculation_duration_ms
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        stats.total_stocks,
        stats.domestic_stocks,
        stats.us_stocks,
        stats.kospi_stocks,
        stats.kosdaq_stocks,
        stats.krx_stocks,
        stats.nasdaq_stocks,
        stats.nyse_stocks,
        stats.total_posts,
        stats.analyzed_posts,
        stats.merry_picks_count,
        stats.analysis_completion_rate,
        stats.last_updated_at,
        stats.data_source,
        stats.calculation_duration_ms
      ]);
    }
  }

  // 헬퍼 메서드들
  async queryGet(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });
  }

  async queryRun(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
}

// CLI에서 직접 실행시
if (require.main === module) {
  const updater = new StockUniverseUpdater();
  updater.quickUpdate().then((result) => {
    console.log('\n🚀 업데이트 결과:', result);
    process.exit(result.success ? 0 : 1);
  }).catch((error) => {
    console.error('💥 실행 오류:', error);
    process.exit(1);
  });
}

module.exports = StockListUpdater;