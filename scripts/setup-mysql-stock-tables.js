// EC2 MySQL에 차트용 종가 데이터베이스 테이블 생성
const mysql2 = require('mysql2/promise');

async function setupStockTables() {
  const connection = await mysql2.createConnection({
    host: '52.78.76.193',
    user: 'meire',
    password: 'meire2025!@#',
    database: 'meire_blog',
    port: 3306
  });

  console.log('🔧 EC2 MySQL에 종가 차트용 테이블 생성 중...');

  try {
    // 1. 종목 기본 정보 테이블
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS stocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL UNIQUE,
        company_name VARCHAR(255) NOT NULL,
        company_name_kr VARCHAR(255),
        market VARCHAR(50),
        currency VARCHAR(10) DEFAULT 'USD',
        sector VARCHAR(100),
        industry VARCHAR(100),
        is_merry_mentioned BOOLEAN DEFAULT FALSE,
        first_mentioned_date DATETIME,
        last_mentioned_date DATETIME,
        mention_count INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ticker (ticker),
        INDEX idx_merry_mentioned (is_merry_mentioned),
        INDEX idx_last_mentioned_date (last_mentioned_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. 6개월치 종가 데이터 테이블
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS stock_prices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        date DATE NOT NULL,
        open_price DECIMAL(12,4),
        high_price DECIMAL(12,4),
        low_price DECIMAL(12,4),
        close_price DECIMAL(12,4) NOT NULL,
        volume BIGINT,
        adjusted_close DECIMAL(12,4),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_ticker_date (ticker, date),
        INDEX idx_ticker (ticker),
        INDEX idx_date (date),
        FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. 메르 언급 종목 상세 정보 테이블
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS merry_mentioned_stocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        post_id INT,
        mentioned_date DATETIME NOT NULL,
        mention_type ENUM('positive', 'negative', 'neutral') DEFAULT 'neutral',
        context TEXT,
        sentiment_score DECIMAL(3,2),
        is_featured BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ticker (ticker),
        INDEX idx_mentioned_date (mentioned_date),
        INDEX idx_post_id (post_id),
        FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ 테이블 생성 완료!');

    // 실제 메르 언급 종목 데이터 삽입 (CLAUDE.md 원칙: 더미 데이터 금지)
    const stocksData = [
      ['005930', 'Samsung Electronics', '삼성전자', 'KRX', 'KRW', true, 73, '2025-08-09'],
      ['TSLA', 'Tesla Inc', '테슬라', 'NASDAQ', 'USD', true, 42, '2025-08-09'],
      ['042660', 'Hanwha Ocean', '한화오션', 'KRX', 'KRW', true, 29, '2025-08-11'],
      ['267250', 'HD Hyundai', 'HD현대', 'KRX', 'KRW', true, 23, '2025-08-11'],
      ['INTC', 'Intel Corporation', '인텔', 'NASDAQ', 'USD', true, 7, '2025-08-09']
    ];

    for (const stock of stocksData) {
      await connection.execute(`
        INSERT IGNORE INTO stocks 
        (ticker, company_name, company_name_kr, market, currency, is_merry_mentioned, mention_count, last_mentioned_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, stock);
    }

    // 메르 언급 정보 삽입
    const mentionsData = [
      ['042660', '2025-08-11', 'positive', true],
      ['267250', '2025-08-11', 'positive', true],
      ['005930', '2025-08-09', 'positive', true],
      ['INTC', '2025-08-09', 'neutral', true],
      ['TSLA', '2025-08-09', 'positive', true]
    ];

    for (const mention of mentionsData) {
      await connection.execute(`
        INSERT IGNORE INTO merry_mentioned_stocks 
        (ticker, mentioned_date, mention_type, is_featured) 
        VALUES (?, ?, ?, ?)
      `, mention);
    }

    console.log('✅ 메르 언급 종목 데이터 삽입 완료!');

    // 생성 결과 확인
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'meire_blog' 
      AND TABLE_NAME IN ('stocks', 'stock_prices', 'merry_mentioned_stocks')
      ORDER BY TABLE_NAME
    `);
    
    console.log('📊 생성된 종가 테이블:', tables.map(t => t.TABLE_NAME).join(', '));
    
    // 종목 데이터 확인
    const [stocks] = await connection.execute(`
      SELECT ticker, company_name_kr, mention_count, last_mentioned_date 
      FROM stocks 
      ORDER BY last_mentioned_date DESC
    `);
    
    console.log('🎯 메르 언급 종목:');
    stocks.forEach(stock => {
      console.log(`  - ${stock.ticker}: ${stock.company_name_kr} (${stock.mention_count}회, ${stock.last_mentioned_date?.toISOString().split('T')[0]})`);
    });

  } catch (error) {
    console.error('❌ 테이블 생성 실패:', error);
  } finally {
    await connection.end();
  }
}

setupStockTables();