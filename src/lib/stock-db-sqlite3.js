// sqlite3를 사용한 종가 데이터베이스 유틸리티
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class StockDB {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = null;
    this.isConnected = false;
  }

  // DB 연결
  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(path.join(process.cwd(), 'database.db'), (err) => {
        if (err) {
          console.error('SQLite3 연결 실패:', err);
          reject(err);
        } else {
          this.isConnected = true;
          resolve();
        }
      });
    });
  }

  // 메르 언급 종목인지 확인
  async isMerryMentionedStock(ticker) {
    if (!this.isConnected) await this.connect();
    
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT is_merry_mentioned 
        FROM stocks 
        WHERE ticker = ?
      `, [ticker], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row?.is_merry_mentioned === 1);
        }
      });
    });
  }

  // 종목 정보 가져오기
  async getStockInfo(ticker) {
    if (!this.isConnected) await this.connect();
    
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT ticker, company_name_kr, market, currency, is_merry_mentioned
        FROM stocks 
        WHERE ticker = ?
      `, [ticker], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 6개월치 종가 데이터 가져오기
  async getStockPrices(ticker, period = '6m') {
    if (!this.isConnected) await this.connect();
    
    // 기간 계산
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '6m':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '3m':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '1m':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '1w':
        startDate.setDate(endDate.getDate() - 7);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 6);
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT date, close_price, volume
        FROM stock_prices 
        WHERE ticker = ? AND date >= ? AND date <= ?
        ORDER BY date ASC
      `, [ticker, startDateStr, endDateStr], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  // 메르 언급 날짜 가져오기 (차트 마커용)
  async getMerryMentions(ticker) {
    if (!this.isConnected) await this.connect();
    
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT mentioned_date, mention_type, sentiment_score
        FROM merry_mentioned_stocks
        WHERE ticker = ?
        ORDER BY mentioned_date DESC
      `, [ticker], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  // 모든 메르 언급 종목 목록 가져오기
  async getMerryMentionedStocks(limit = 10) {
    if (!this.isConnected) await this.connect();
    
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT s.ticker, s.company_name, s.company_name_kr, s.market, 
               s.currency, s.mention_count, s.last_mentioned_date,
               COUNT(sp.id) as price_data_count
        FROM stocks s
        LEFT JOIN stock_prices sp ON s.ticker = sp.ticker
        WHERE s.is_merry_mentioned = 1
        GROUP BY s.ticker
        ORDER BY s.last_mentioned_date DESC
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  // DB 연결 종료
  close() {
    if (this.db && this.isConnected) {
      this.db.close((err) => {
        if (err) {
          console.error('SQLite3 연결 종료 실패:', err);
        } else {
          this.isConnected = false;
          console.log('📪 SQLite3 연결 종료');
        }
      });
    }
  }
}

module.exports = StockDB;