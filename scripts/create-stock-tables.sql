-- 차트 종가 데이터를 위한 테이블 생성 스크립트
-- CLAUDE.md 요구사항: 6개월치 차트 데이터, 메르 언급 종목만 저장

-- 1. 종목 기본 정보 테이블
CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    company_name_kr TEXT,
    market TEXT, -- NASDAQ, NYSE, KRX
    currency TEXT DEFAULT 'USD',
    sector TEXT,
    industry TEXT,
    is_merry_mentioned BOOLEAN DEFAULT 0, -- 메르 언급 여부
    first_mentioned_date DATETIME, -- 첫 언급일
    last_mentioned_date DATETIME, -- 최근 언급일
    mention_count INTEGER DEFAULT 0, -- 총 언급 횟수
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 6개월치 종가 데이터 테이블 (메르 언급 종목만)
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
);

-- 3. 메르 언급 종목 상세 정보 테이블
CREATE TABLE IF NOT EXISTS merry_mentioned_stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    post_id INTEGER,
    mentioned_date DATETIME NOT NULL, -- 언급된 날짜
    mention_type TEXT, -- positive, negative, neutral
    context TEXT, -- 언급 맥락
    sentiment_score DECIMAL(3,2), -- -1.0 ~ 1.0
    is_featured BOOLEAN DEFAULT 0, -- 메르's Pick 대상 여부
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE SET NULL
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_stocks_ticker ON stocks(ticker);
CREATE INDEX IF NOT EXISTS idx_stocks_merry_mentioned ON stocks(is_merry_mentioned);
CREATE INDEX IF NOT EXISTS idx_stocks_last_mentioned_date ON stocks(last_mentioned_date);

CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker ON stock_prices(ticker);
CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON stock_prices(date);
CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker_date ON stock_prices(ticker, date);

CREATE INDEX IF NOT EXISTS idx_merry_mentioned_ticker ON merry_mentioned_stocks(ticker);
CREATE INDEX IF NOT EXISTS idx_merry_mentioned_date ON merry_mentioned_stocks(mentioned_date);
CREATE INDEX IF NOT EXISTS idx_merry_mentioned_post_id ON merry_mentioned_stocks(post_id);

-- 샘플 데이터 삽입 (CLAUDE.md 원칙: 실제 데이터만 사용, 더미 데이터 금지)
-- 메르가 실제로 언급한 종목들만 추가

INSERT OR IGNORE INTO stocks (ticker, company_name, company_name_kr, market, currency, is_merry_mentioned, mention_count) VALUES
('005930', 'Samsung Electronics', '삼성전자', 'KRX', 'KRW', 1, 73),
('TSLA', 'Tesla Inc', '테슬라', 'NASDAQ', 'USD', 1, 42),
('042660', 'Hanwha Ocean', '한화오션', 'KRX', 'KRW', 1, 29),
('267250', 'HD Hyundai', 'HD현대', 'KRX', 'KRW', 1, 23),
('INTC', 'Intel Corporation', '인텔', 'NASDAQ', 'USD', 1, 7);

-- 메르 언급 정보 추가 (실제 데이터 기준)
INSERT OR IGNORE INTO merry_mentioned_stocks (ticker, mentioned_date, mention_type, is_featured) VALUES
('042660', '2025-08-11', 'positive', 1),
('267250', '2025-08-11', 'positive', 1),  
('005930', '2025-08-09', 'positive', 1),
('INTC', '2025-08-09', 'neutral', 1),
('TSLA', '2025-08-09', 'positive', 1);