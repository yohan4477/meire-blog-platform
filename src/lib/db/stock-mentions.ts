// 메르 언급 주식 관리 라이브러리
// CLAUDE.md 요구사항: 메르가 언급한 종목만 저장, 6개월치 데이터

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

interface StockMention {
  id?: number;
  ticker: string;
  name: string;
  market: string;
  currency: string;
  is_mentioned: boolean;
  first_mentioned_at?: string;
  last_mentioned_at?: string;
  mention_count: number;
}

interface StockPrice {
  ticker: string;
  trade_date: string;
  close_price: number;
  volume?: number;
  high_price?: number;
  low_price?: number;
  open_price?: number;
}

interface PostMention {
  log_no: number;
  ticker: string;
  mention_sentiment: 'positive' | 'negative' | 'neutral';
  mention_context?: string;
}

export class StockMentionDB {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(process.cwd(), 'database', 'stock_mentions.db');
    
    // 디렉토리 생성
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.initializeSchema();
  }

  private initializeSchema() {
    const schemaPath = path.join(process.cwd(), 'database', 'sqlite_stock_schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // SQL 문을 개별적으로 실행
      const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
      
      statements.forEach((stmt) => {
        try {
          this.db.exec(stmt);
        } catch (error) {
          // 이미 존재하는 테이블 등은 무시
          console.log(`Schema statement skipped: ${(error as Error).message.substring(0, 50)}...`);
        }
      });

      console.log('📊 Stock mention database schema initialized');
    }
  }

  // 메르가 언급한 종목 추가/업데이트
  addOrUpdateMentionedStock(stock: StockMention): void {
    const stmt = this.db.prepare(`
      INSERT INTO merry_mentioned_stocks (ticker, name, market, currency, is_mentioned, first_mentioned_at, last_mentioned_at, mention_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(ticker) DO UPDATE SET
        name = excluded.name,
        market = excluded.market,
        currency = excluded.currency,
        is_mentioned = excluded.is_mentioned,
        last_mentioned_at = excluded.last_mentioned_at,
        mention_count = mention_count + 1,
        updated_at = CURRENT_TIMESTAMP
    `);

    const now = new Date().toISOString();
    stmt.run(
      stock.ticker,
      stock.name,
      stock.market,
      stock.currency,
      stock.is_mentioned ? 1 : 0,
      stock.first_mentioned_at || now,
      stock.last_mentioned_at || now,
      stock.mention_count
    );
  }

  // 메르가 언급한 종목 목록 조회
  getMentionedStocks(): StockMention[] {
    const stmt = this.db.prepare(`
      SELECT * FROM merry_mentioned_stocks 
      WHERE is_mentioned = TRUE
      ORDER BY last_mentioned_at DESC
    `);
    
    return stmt.all() as StockMention[];
  }

  // 특정 종목의 6개월치 가격 데이터 저장
  saveStockPrices(prices: StockPrice[]): void {
    if (prices.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO stock_daily_prices (ticker, trade_date, close_price, volume, high_price, low_price, open_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(ticker, trade_date) DO UPDATE SET
        close_price = excluded.close_price,
        volume = excluded.volume,
        high_price = excluded.high_price,
        low_price = excluded.low_price,
        open_price = excluded.open_price,
        updated_at = CURRENT_TIMESTAMP
    `);

    const transaction = this.db.transaction((priceList: StockPrice[]) => {
      for (const price of priceList) {
        stmt.run(
          price.ticker,
          price.trade_date,
          price.close_price,
          price.volume || 0,
          price.high_price || null,
          price.low_price || null,
          price.open_price || null
        );
      }
    });

    transaction(prices);
  }

  // 특정 종목의 6개월치 가격 데이터 조회
  getStockPrices(ticker: string, days: number = 180): StockPrice[] {
    const stmt = this.db.prepare(`
      SELECT * FROM stock_daily_prices 
      WHERE ticker = ? AND trade_date >= DATE('now', '-${days} days')
      ORDER BY trade_date ASC
    `);
    
    const results = stmt.all(ticker) as StockPrice[];
    
    // CLAUDE.md 원칙: 실제 데이터가 없으면 빈 배열 반환 (dummy data 금지)
    console.log(`📊 Found ${results.length} price records for ${ticker} (${days} days)`);
    return results;
  }

  // 메르 글-종목 언급 기록
  recordPostMention(mention: PostMention): void {
    const stmt = this.db.prepare(`
      INSERT INTO merry_post_stock_mentions (log_no, ticker, mention_sentiment, mention_context)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      mention.log_no,
      mention.ticker,
      mention.mention_sentiment,
      mention.mention_context || null
    );
  }

  // 특정 종목이 언급된 포스트 조회
  getPostMentions(ticker: string): PostMention[] {
    const stmt = this.db.prepare(`
      SELECT * FROM merry_post_stock_mentions 
      WHERE ticker = ?
      ORDER BY created_at DESC
    `);
    
    return stmt.all(ticker) as PostMention[];
  }

  // 6개월 이전 데이터 정리
  cleanupOldData(): void {
    const stmt = this.db.prepare(`
      DELETE FROM stock_daily_prices 
      WHERE trade_date < DATE('now', '-6 months')
    `);
    
    const result = stmt.run();
    console.log(`🧹 Cleaned up ${result.changes} old stock price records`);
  }

  // 언급되지 않은 종목의 데이터 정리
  cleanupUnmentionedStocks(): void {
    const stmt = this.db.prepare(`
      DELETE FROM stock_daily_prices 
      WHERE ticker IN (
        SELECT ticker FROM merry_mentioned_stocks 
        WHERE is_mentioned = FALSE
      )
    `);
    
    const result = stmt.run();
    console.log(`🧹 Cleaned up ${result.changes} unmentioned stock records`);
  }

  // 데이터베이스 연결 종료
  close(): void {
    this.db.close();
  }
}

// 싱글톤 인스턴스
let stockDB: StockMentionDB | null = null;

export function getStockMentionDB(): StockMentionDB {
  if (!stockDB) {
    stockDB = new StockMentionDB();
  }
  return stockDB;
}

export function closeStockMentionDB(): void {
  if (stockDB) {
    stockDB.close();
    stockDB = null;
  }
}