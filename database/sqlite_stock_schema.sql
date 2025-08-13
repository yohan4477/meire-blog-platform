-- 메르 언급 주식 종목 스키마 (SQLite 버전)
-- CLAUDE.md 요구사항: 메르가 언급한 종목만 저장, 6개월치 데이터

-- 메르 언급 종목 테이블
CREATE TABLE IF NOT EXISTS merry_mentioned_stocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker VARCHAR(20) NOT NULL UNIQUE, -- 종목 코드 (예: AAPL, 005930)
  name VARCHAR(200) NOT NULL, -- 종목명
  market VARCHAR(20) NOT NULL, -- 거래소 (KOSPI, NASDAQ, NYSE 등)
  currency VARCHAR(3) NOT NULL DEFAULT 'USD', -- 통화 (USD, KRW, JPY)
  is_mentioned BOOLEAN DEFAULT TRUE, -- 메르 언급 여부 (TRUE: 저장, FALSE: 저장 중단)
  first_mentioned_at DATETIME, -- 최초 언급 일시
  last_mentioned_at DATETIME, -- 최근 언급 일시
  mention_count INTEGER DEFAULT 1, -- 총 언급 횟수
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6개월치 종가 데이터 테이블
CREATE TABLE IF NOT EXISTS stock_daily_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker VARCHAR(20) NOT NULL, -- 종목 코드
  trade_date DATE NOT NULL, -- 거래일
  close_price REAL NOT NULL, -- 종가
  volume INTEGER DEFAULT 0, -- 거래량
  high_price REAL, -- 고가
  low_price REAL, -- 저가
  open_price REAL, -- 시가
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticker) REFERENCES merry_mentioned_stocks(ticker) ON DELETE CASCADE,
  UNIQUE(ticker, trade_date)
);

-- 메르 글-종목 언급 매핑 테이블
CREATE TABLE IF NOT EXISTS merry_post_stock_mentions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL, -- 포스트 ID
  ticker VARCHAR(20) NOT NULL, -- 종목 코드
  mention_sentiment VARCHAR(10) DEFAULT 'neutral', -- 언급 감정 (positive, negative, neutral)
  mention_context TEXT, -- 언급 맥락 (메르 글에서 해당 종목이 언급된 문단)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticker) REFERENCES merry_mentioned_stocks(ticker) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ticker ON merry_mentioned_stocks(ticker);
CREATE INDEX IF NOT EXISTS idx_is_mentioned ON merry_mentioned_stocks(is_mentioned);
CREATE INDEX IF NOT EXISTS idx_market ON merry_mentioned_stocks(market);
CREATE INDEX IF NOT EXISTS idx_last_mentioned ON merry_mentioned_stocks(last_mentioned_at);

CREATE INDEX IF NOT EXISTS idx_ticker_date ON stock_daily_prices(ticker, trade_date);
CREATE INDEX IF NOT EXISTS idx_trade_date ON stock_daily_prices(trade_date);

CREATE INDEX IF NOT EXISTS idx_post_mentions_post_id ON merry_post_stock_mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_mentions_ticker ON merry_post_stock_mentions(ticker);
CREATE INDEX IF NOT EXISTS idx_post_mentions_sentiment ON merry_post_stock_mentions(mention_sentiment);

-- 실제 데이터가 없을 때를 위한 빈 상태 확인용
-- CLAUDE.md 원칙: Dummy data 절대 금지
-- 데이터가 없으면 "정보 없음" 표시를 위해 빈 테이블 유지

-- 6개월 이전 데이터 정리를 위한 뷰 (실제 정리는 별도 스크립트에서)
CREATE VIEW IF NOT EXISTS outdated_stock_prices AS
SELECT * FROM stock_daily_prices 
WHERE trade_date < DATE('now', '-6 months');