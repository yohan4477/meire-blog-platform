-- 주식 가격 데이터 스키마 (CLAUDE.md 요구사항 반영)
-- 1. 메르가 언급한 종목만 종가를 저장
-- 2. 6개월치 종가를 저장

-- 메르 언급 종목 테이블
CREATE TABLE IF NOT EXISTS merry_mentioned_stocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL UNIQUE COMMENT '종목 코드 (예: AAPL, 005930)',
  name VARCHAR(200) NOT NULL COMMENT '종목명',
  market VARCHAR(20) NOT NULL COMMENT '거래소 (KOSPI, NASDAQ, NYSE 등)',
  currency ENUM('USD', 'KRW', 'JPY') NOT NULL DEFAULT 'USD' COMMENT '통화',
  is_mentioned BOOLEAN DEFAULT TRUE COMMENT '메르 언급 여부 (TRUE: 저장, FALSE: 저장 중단)',
  first_mentioned_at DATETIME COMMENT '최초 언급 일시',
  last_mentioned_at DATETIME COMMENT '최근 언급 일시',
  mention_count INT DEFAULT 1 COMMENT '총 언급 횟수',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ticker (ticker),
  INDEX idx_is_mentioned (is_mentioned),
  INDEX idx_market (market),
  INDEX idx_last_mentioned (last_mentioned_at)
) COMMENT='메르가 언급한 종목만 관리';

-- 6개월치 종가 데이터 테이블
CREATE TABLE IF NOT EXISTS stock_daily_prices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL COMMENT '종목 코드',
  trade_date DATE NOT NULL COMMENT '거래일',
  close_price DECIMAL(15,4) NOT NULL COMMENT '종가',
  volume BIGINT DEFAULT 0 COMMENT '거래량',
  high_price DECIMAL(15,4) COMMENT '고가',
  low_price DECIMAL(15,4) COMMENT '저가',
  open_price DECIMAL(15,4) COMMENT '시가',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ticker) REFERENCES merry_mentioned_stocks(ticker) ON DELETE CASCADE,
  UNIQUE KEY unique_ticker_date (ticker, trade_date),
  INDEX idx_ticker_date (ticker, trade_date),
  INDEX idx_trade_date (trade_date)
) COMMENT='메르 언급 종목의 6개월치 일별 가격 데이터';

-- 메르 글-종목 언급 매핑 테이블
CREATE TABLE IF NOT EXISTS merry_post_stock_mentions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_no INT NOT NULL COMMENT '포스트 ID',
  ticker VARCHAR(20) NOT NULL COMMENT '종목 코드',
  mention_sentiment ENUM('positive', 'negative', 'neutral') DEFAULT 'neutral' COMMENT '언급 감정',
  mention_context TEXT COMMENT '언급 맥락 (메르 글에서 해당 종목이 언급된 문단)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (log_no) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (ticker) REFERENCES merry_mentioned_stocks(ticker) ON DELETE CASCADE,
  INDEX idx_log_no (log_no),
  INDEX idx_ticker (ticker),
  INDEX idx_sentiment (mention_sentiment)
) COMMENT='메르 글에서 종목 언급 상세 정보';

-- 6개월 이전 데이터 자동 삭제를 위한 이벤트 스케줄러
-- (MySQL 8.0+ 지원)
SET GLOBAL event_scheduler = ON;

DELIMITER $$
CREATE EVENT IF NOT EXISTS cleanup_old_stock_prices
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
  -- 6개월 이전 가격 데이터 삭제
  DELETE FROM stock_daily_prices 
  WHERE trade_date < DATE_SUB(CURDATE(), INTERVAL 6 MONTH);
  
  -- 언급되지 않은 종목의 최근 가격 데이터도 삭제 (저장 중단)
  DELETE sdp FROM stock_daily_prices sdp
  JOIN merry_mentioned_stocks mms ON sdp.ticker = mms.ticker
  WHERE mms.is_mentioned = FALSE;
END$$
DELIMITER ;

-- 초기 샘플 데이터
INSERT INTO merry_mentioned_stocks (ticker, name, market, currency, first_mentioned_at, last_mentioned_at) VALUES
('AAPL', 'Apple Inc.', 'NASDAQ', 'USD', '2024-08-01 10:00:00', '2025-01-10 15:30:00'),
('TSLA', 'Tesla, Inc.', 'NASDAQ', 'USD', '2024-09-15 14:20:00', '2025-01-08 09:45:00'),
('005930', '삼성전자', 'KOSPI', 'KRW', '2024-10-03 16:10:00', '2025-01-05 11:20:00'),
('NVDA', 'NVIDIA Corporation', 'NASDAQ', 'USD', '2024-11-12 13:45:00', '2024-12-28 10:15:00');

-- 샘플 포스트-종목 언급 매핑
INSERT INTO merry_post_stock_mentions (log_no, ticker, mention_sentiment, mention_context) 
SELECT p.id, 'AAPL', 'positive', '애플의 최신 AI 기능이 인상적이다. 장기적으로 성장 가능성이 높다고 본다.'
FROM posts p WHERE p.title LIKE '%투자에 대한 메르의 생각%' AND p.blog_type = 'merry';

INSERT INTO merry_post_stock_mentions (log_no, ticker, mention_sentiment, mention_context)
SELECT p.id, 'TSLA', 'neutral', '테슬라의 자율주행 기술은 혁신적이지만 아직 상용화까지는 시간이 필요해 보인다.'
FROM posts p WHERE p.title LIKE '%투자에 대한 메르의 생각%' AND p.blog_type = 'merry';

-- 샘플 가격 데이터 (최근 30일, 실제로는 API에서 가져올 예정)
INSERT INTO stock_daily_prices (ticker, trade_date, close_price, volume, high_price, low_price, open_price) VALUES
-- AAPL 샘플 데이터
('AAPL', '2025-01-10', 185.50, 45623000, 187.20, 184.10, 186.80),
('AAPL', '2025-01-09', 186.80, 38945000, 188.50, 185.30, 187.20),
('AAPL', '2025-01-08', 187.20, 42156000, 189.10, 186.50, 188.00),

-- TSLA 샘플 데이터  
('TSLA', '2025-01-10', 245.30, 28934000, 248.70, 243.80, 246.90),
('TSLA', '2025-01-09', 246.90, 31245000, 249.20, 244.50, 247.80),
('TSLA', '2025-01-08', 247.80, 29687000, 250.10, 245.20, 248.50);