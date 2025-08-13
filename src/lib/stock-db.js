// SQLite 종가 데이터베이스 유틸리티
const Database = require('better-sqlite3');
const path = require('path');

class StockDB {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = new Database(dbPath);
  }

  // 메르 언급 종목 목록 가져오기 (최근 언급일 순)
  getMerryMentionedStocks(limit = 10) {
    const query = `
      SELECT s.ticker, s.company_name, s.company_name_kr, s.market, 
             s.currency, s.mention_count, s.last_mentioned_date,
             COUNT(sp.id) as price_data_count
      FROM stocks s
      LEFT JOIN stock_prices sp ON s.ticker = sp.ticker
      WHERE s.is_merry_mentioned = 1
      GROUP BY s.ticker
      ORDER BY s.last_mentioned_date DESC
      LIMIT ?
    `;
    return this.db.prepare(query).all(limit);
  }

  // 특정 종목의 6개월치 종가 데이터 가져오기
  getStockPrices(ticker, months = 6) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - months);
    
    const query = `
      SELECT ticker, date, open_price, high_price, low_price, close_price, volume
      FROM stock_prices
      WHERE ticker = ? AND date >= ?
      ORDER BY date ASC
    `;
    
    return this.db.prepare(query).all(ticker, sixMonthsAgo.toISOString().split('T')[0]);
  }

  // 종가 데이터 저장 (6개월치)
  saveStockPrices(ticker, pricesData) {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO stock_prices 
      (ticker, date, open_price, high_price, low_price, close_price, volume, adjusted_close)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((prices) => {
      for (const price of prices) {
        insert.run(
          ticker,
          price.date,
          price.open || null,
          price.high || null,
          price.low || null,
          price.close,
          price.volume || null,
          price.adjustedClose || price.close
        );
      }
    });

    insertMany(pricesData);
    
    // 6개월 이전 데이터 자동 삭제 (CLAUDE.md 요구사항)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    this.db.prepare(`
      DELETE FROM stock_prices 
      WHERE ticker = ? AND date < ?
    `).run(ticker, sixMonthsAgo.toISOString().split('T')[0]);
    
    console.log(`💾 ${ticker} 종가 데이터 ${pricesData.length}개 저장 완료`);
  }

  // 메르 언급 날짜 가져오기 (차트 마커용)
  getMerryMentions(ticker) {
    const query = `
      SELECT mentioned_date, mention_type, sentiment_score
      FROM merry_mentioned_stocks
      WHERE ticker = ?
      ORDER BY mentioned_date DESC
    `;
    return this.db.prepare(query).all(ticker);
  }

  // 종목이 메르 언급 종목인지 확인
  isMerryMentionedStock(ticker) {
    const result = this.db.prepare(`
      SELECT is_merry_mentioned FROM stocks WHERE ticker = ?
    `).get(ticker);
    
    return result?.is_merry_mentioned === 1;
  }

  // 데이터베이스 연결 종료
  close() {
    this.db.close();
  }
}

module.exports = StockDB;