// 차트용 종가 데이터베이스 테이블 생성 스크립트
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');
const db = new Database(dbPath);

console.log('🔧 종가 차트용 데이터베이스 테이블 생성 중...');

try {
  // 1. 종목 기본 정보 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL UNIQUE,
      company_name TEXT NOT NULL,
      company_name_kr TEXT,
      market TEXT,
      currency TEXT DEFAULT 'USD',
      sector TEXT,
      industry TEXT,
      is_merry_mentioned BOOLEAN DEFAULT 0,
      first_mentioned_date DATETIME,
      last_mentioned_date DATETIME,
      mention_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. 종가 데이터 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      date DATE NOT NULL,
      open_price DECIMAL(12,4),
      high_price DECIMAL(12,4),
      low_price DECIMAL(12,4),
      close_price DECIMAL(12,4) NOT NULL,
      volume BIGINT,
      adjusted_close DECIMAL(12,4),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE,
      UNIQUE(ticker, date)
    )
  `);

  // 3. 메르 언급 종목 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS merry_mentioned_stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      post_id INTEGER,
      mentioned_date DATETIME NOT NULL,
      mention_type TEXT,
      context TEXT,
      sentiment_score DECIMAL(3,2),
      is_featured BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE SET NULL
    )
  `);

  // 인덱스 생성
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_stocks_ticker ON stocks(ticker)',
    'CREATE INDEX IF NOT EXISTS idx_stocks_merry_mentioned ON stocks(is_merry_mentioned)',
    'CREATE INDEX IF NOT EXISTS idx_stocks_last_mentioned_date ON stocks(last_mentioned_date)',
    'CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker ON stock_prices(ticker)',
    'CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON stock_prices(date)',
    'CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker_date ON stock_prices(ticker, date)',
    'CREATE INDEX IF NOT EXISTS idx_merry_mentioned_ticker ON merry_mentioned_stocks(ticker)',
    'CREATE INDEX IF NOT EXISTS idx_merry_mentioned_date ON merry_mentioned_stocks(mentioned_date)',
    'CREATE INDEX IF NOT EXISTS idx_merry_mentioned_post_id ON merry_mentioned_stocks(post_id)'
  ];

  indexes.forEach(index => db.exec(index));

  // 실제 메르 언급 종목 데이터 삽입 (CLAUDE.md 원칙: 더미 데이터 금지)
  const insertStock = db.prepare(`
    INSERT OR IGNORE INTO stocks 
    (ticker, company_name, company_name_kr, market, currency, is_merry_mentioned, mention_count, last_mentioned_date) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const stocksData = [
    ['005930', 'Samsung Electronics', '삼성전자', 'KRX', 'KRW', 1, 73, '2025-08-09'],
    ['TSLA', 'Tesla Inc', '테슬라', 'NASDAQ', 'USD', 1, 42, '2025-08-09'],
    ['042660', 'Hanwha Ocean', '한화오션', 'KRX', 'KRW', 1, 29, '2025-08-11'],
    ['267250', 'HD Hyundai', 'HD현대', 'KRX', 'KRW', 1, 23, '2025-08-11'],
    ['INTC', 'Intel Corporation', '인텔', 'NASDAQ', 'USD', 1, 7, '2025-08-09']
  ];

  stocksData.forEach(stock => insertStock.run(...stock));

  // 메르 언급 정보 삽입
  const insertMention = db.prepare(`
    INSERT OR IGNORE INTO merry_mentioned_stocks 
    (ticker, mentioned_date, mention_type, is_featured) 
    VALUES (?, ?, ?, ?)
  `);

  const mentionsData = [
    ['042660', '2025-08-11', 'positive', 1],
    ['267250', '2025-08-11', 'positive', 1],
    ['005930', '2025-08-09', 'positive', 1],
    ['INTC', '2025-08-09', 'neutral', 1],
    ['TSLA', '2025-08-09', 'positive', 1]
  ];

  mentionsData.forEach(mention => insertMention.run(...mention));

  console.log('✅ 종가 차트용 데이터베이스 테이블 생성 완료!');
  
  // 생성된 테이블 확인
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('📊 생성된 테이블:', tables.map(t => t.name).join(', '));
  
  // 종목 데이터 확인
  const stocks = db.prepare("SELECT ticker, company_name_kr, mention_count, last_mentioned_date FROM stocks ORDER BY last_mentioned_date DESC").all();
  console.log('🎯 메르 언급 종목:');
  stocks.forEach(stock => {
    console.log(`  - ${stock.ticker}: ${stock.company_name_kr} (${stock.mention_count}회, ${stock.last_mentioned_date})`);
  });

} catch (error) {
  console.error('❌ 데이터베이스 테이블 생성 실패:', error);
} finally {
  db.close();
}