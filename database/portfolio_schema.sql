-- 개인 포트폴리오 관리 시스템 데이터베이스 스키마
-- 기존 메르 블로그 플랫폼에 포트폴리오 관리 기능 추가

-- 사용자 테이블 (포트폴리오 소유자)
CREATE TABLE IF NOT EXISTS portfolio_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT TRUE,
  portfolio_public BOOLEAN DEFAULT FALSE COMMENT '포트폴리오 공개 여부',
  
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
) COMMENT='포트폴리오 사용자';

-- 포트폴리오 테이블 (사용자별 포트폴리오 정보)
CREATE TABLE IF NOT EXISTS portfolios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL COMMENT '포트폴리오 이름',
  description TEXT COMMENT '포트폴리오 설명',
  investment_goal ENUM('conservative', 'balanced', 'aggressive', 'custom') DEFAULT 'balanced' COMMENT '투자 목표',
  target_amount DECIMAL(15,2) COMMENT '목표 금액',
  currency VARCHAR(3) DEFAULT 'KRW' COMMENT '기준 통화',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (user_id) REFERENCES portfolio_users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) COMMENT='사용자 포트폴리오';

-- 주식 정보 테이블 (종목별 기본 정보)
CREATE TABLE IF NOT EXISTS stocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL UNIQUE COMMENT '종목 코드 (예: AAPL, 005930)',
  name VARCHAR(200) NOT NULL COMMENT '종목명',
  market VARCHAR(50) COMMENT '시장 (NASDAQ, NYSE, KOSPI, KOSDAQ)',
  country VARCHAR(3) DEFAULT 'US' COMMENT '국가 코드',
  currency VARCHAR(3) DEFAULT 'USD' COMMENT '거래 통화',
  sector VARCHAR(100) COMMENT '섹터',
  industry VARCHAR(100) COMMENT '업종',
  market_cap BIGINT COMMENT '시가총액',
  description TEXT COMMENT '기업 설명',
  logo_url VARCHAR(500) COMMENT '로고 이미지 URL',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  
  INDEX idx_symbol (symbol),
  INDEX idx_market (market),
  INDEX idx_sector (sector),
  INDEX idx_country (country)
) COMMENT='주식 종목 정보';

-- 포트폴리오 보유 종목 테이블
CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portfolio_id INT NOT NULL,
  stock_id INT NOT NULL,
  shares DECIMAL(20,8) NOT NULL COMMENT '보유 주식 수 (소수점 허용)',
  avg_purchase_price DECIMAL(15,4) NOT NULL COMMENT '평균 매수 가격',
  total_cost DECIMAL(15,2) NOT NULL COMMENT '총 매수 금액',
  first_purchase_date DATE NOT NULL COMMENT '최초 매수일',
  last_purchase_date DATE COMMENT '최근 매수일',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_portfolio_stock (portfolio_id, stock_id),
  INDEX idx_portfolio_id (portfolio_id),
  INDEX idx_stock_id (stock_id),
  INDEX idx_first_purchase_date (first_purchase_date)
) COMMENT='포트폴리오 보유 종목';

-- 거래 내역 테이블
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portfolio_id INT NOT NULL,
  stock_id INT NOT NULL,
  transaction_type ENUM('buy', 'sell') NOT NULL,
  shares DECIMAL(20,8) NOT NULL COMMENT '거래 주식 수',
  price DECIMAL(15,4) NOT NULL COMMENT '체결 가격',
  total_amount DECIMAL(15,2) NOT NULL COMMENT '총 거래 금액',
  commission DECIMAL(10,2) DEFAULT 0 COMMENT '수수료',
  notes TEXT COMMENT '거래 메모',
  transaction_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
  INDEX idx_portfolio_id (portfolio_id),
  INDEX idx_stock_id (stock_id),
  INDEX idx_transaction_date (transaction_date),
  INDEX idx_transaction_type (transaction_type)
) COMMENT='주식 거래 내역';

-- 실시간 주가 정보 테이블
CREATE TABLE IF NOT EXISTS stock_prices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  price DECIMAL(15,4) NOT NULL COMMENT '현재가',
  open_price DECIMAL(15,4) COMMENT '시가',
  high_price DECIMAL(15,4) COMMENT '고가',
  low_price DECIMAL(15,4) COMMENT '저가',
  volume BIGINT COMMENT '거래량',
  change_amount DECIMAL(15,4) COMMENT '변동 금액',
  change_percent DECIMAL(5,2) COMMENT '변동률 (%)',
  market_cap BIGINT COMMENT '시가총액',
  price_date DATE NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_stock_date (stock_id, price_date),
  INDEX idx_stock_id (stock_id),
  INDEX idx_price_date (price_date),
  INDEX idx_updated_at (updated_at)
) COMMENT='주식 가격 정보';

-- AI 분석 리포트 테이블
CREATE TABLE IF NOT EXISTS ai_analysis_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  agent_type ENUM('goldman_sachs', 'bloomberg', 'blackrock', 'robinhood') NOT NULL,
  analysis_type ENUM('stock_analysis', 'market_outlook', 'portfolio_optimization', 'ux_recommendation') NOT NULL,
  title VARCHAR(200) NOT NULL,
  summary TEXT NOT NULL COMMENT '분석 요약',
  content LONGTEXT NOT NULL COMMENT '상세 분석 내용',
  recommendation ENUM('strong_buy', 'buy', 'hold', 'sell', 'strong_sell') COMMENT '투자 의견',
  target_price DECIMAL(15,4) COMMENT '목표가',
  confidence_score DECIMAL(3,2) COMMENT '신뢰도 (0.00-1.00)',
  key_metrics JSON COMMENT '주요 지표들 (JSON 형태)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME COMMENT '리포트 만료일',
  
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
  INDEX idx_stock_id (stock_id),
  INDEX idx_agent_type (agent_type),
  INDEX idx_analysis_type (analysis_type),
  INDEX idx_created_at (created_at),
  INDEX idx_expires_at (expires_at)
) COMMENT='AI 에이전트 분석 리포트';

-- 포트폴리오 성과 스냅샷 테이블 (일간 성과 추적)
CREATE TABLE IF NOT EXISTS portfolio_performance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portfolio_id INT NOT NULL,
  total_value DECIMAL(15,2) NOT NULL COMMENT '총 평가 금액',
  total_cost DECIMAL(15,2) NOT NULL COMMENT '총 매수 금액',
  total_gain_loss DECIMAL(15,2) NOT NULL COMMENT '총 손익',
  total_return_percent DECIMAL(8,4) NOT NULL COMMENT '총 수익률 (%)',
  daily_change DECIMAL(15,2) COMMENT '일간 변동 금액',
  daily_change_percent DECIMAL(5,2) COMMENT '일간 변동률 (%)',
  cash_balance DECIMAL(15,2) DEFAULT 0 COMMENT '현금 잔고',
  snapshot_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
  UNIQUE KEY unique_portfolio_date (portfolio_id, snapshot_date),
  INDEX idx_portfolio_id (portfolio_id),
  INDEX idx_snapshot_date (snapshot_date)
) COMMENT='포트폴리오 성과 스냅샷';

-- 국민연금 성과 데이터 테이블 (비교 기준)
CREATE TABLE IF NOT EXISTS nps_performance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fund_type VARCHAR(50) NOT NULL COMMENT '펀드 유형 (적극투자, 안정추구 등)',
  return_1m DECIMAL(5,2) COMMENT '1개월 수익률',
  return_3m DECIMAL(5,2) COMMENT '3개월 수익률',
  return_6m DECIMAL(5,2) COMMENT '6개월 수익률',
  return_1y DECIMAL(5,2) COMMENT '1년 수익률',
  return_3y DECIMAL(5,2) COMMENT '3년 수익률',
  return_5y DECIMAL(5,2) COMMENT '5년 수익률',
  return_since_inception DECIMAL(5,2) COMMENT '설정 이후 수익률',
  aum DECIMAL(20,2) COMMENT '운용 자산 규모',
  data_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_fund_date (fund_type, data_date),
  INDEX idx_fund_type (fund_type),
  INDEX idx_data_date (data_date)
) COMMENT='국민연금 성과 데이터';

-- 포트폴리오 AI 추천 테이블
CREATE TABLE IF NOT EXISTS portfolio_recommendations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portfolio_id INT NOT NULL,
  recommendation_type ENUM('rebalancing', 'stock_pick', 'risk_management', 'diversification') NOT NULL,
  agent_type ENUM('goldman_sachs', 'bloomberg', 'blackrock') NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  action_required BOOLEAN DEFAULT FALSE COMMENT '액션 필요 여부',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  expected_impact DECIMAL(5,2) COMMENT '예상 영향도 (%)',
  suggested_actions JSON COMMENT '제안 액션들 (JSON 형태)',
  status ENUM('pending', 'applied', 'ignored', 'expired') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME COMMENT '추천 만료일',
  applied_at DATETIME COMMENT '적용일',
  
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
  INDEX idx_portfolio_id (portfolio_id),
  INDEX idx_recommendation_type (recommendation_type),
  INDEX idx_agent_type (agent_type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) COMMENT='포트폴리오 AI 추천';

-- 사용자 알림 테이블
CREATE TABLE IF NOT EXISTS user_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('price_alert', 'portfolio_update', 'ai_recommendation', 'system_notice') NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500) COMMENT '클릭 시 이동할 URL',
  metadata JSON COMMENT '추가 데이터 (JSON 형태)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME COMMENT '읽은 시간',
  
  FOREIGN KEY (user_id) REFERENCES portfolio_users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
) COMMENT='사용자 알림';

-- 포트폴리오 설정 테이블
CREATE TABLE IF NOT EXISTS portfolio_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portfolio_id INT NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
  UNIQUE KEY unique_portfolio_setting (portfolio_id, setting_key),
  INDEX idx_portfolio_id (portfolio_id),
  INDEX idx_setting_key (setting_key)
) COMMENT='포트폴리오 개별 설정';

-- 샘플 데이터 삽입

-- 샘플 사용자
INSERT INTO portfolio_users (username, email, password_hash, display_name) VALUES 
('meire', 'meire@example.com', '$2b$10$samplehash123', '메르'),
('investor1', 'investor1@example.com', '$2b$10$samplehash456', '투자자1');

-- 샘플 주식 데이터
INSERT INTO stocks (symbol, name, market, country, currency, sector, industry) VALUES 
('AAPL', 'Apple Inc.', 'NASDAQ', 'US', 'USD', 'Technology', 'Consumer Electronics'),
('MSFT', 'Microsoft Corporation', 'NASDAQ', 'US', 'USD', 'Technology', 'Software'),
('GOOGL', 'Alphabet Inc.', 'NASDAQ', 'US', 'USD', 'Technology', 'Internet Services'),
('TSLA', 'Tesla Inc.', 'NASDAQ', 'US', 'USD', 'Consumer Cyclical', 'Auto Manufacturers'),
('NVDA', 'NVIDIA Corporation', 'NASDAQ', 'US', 'USD', 'Technology', 'Semiconductors'),
('005930', '삼성전자', 'KOSPI', 'KR', 'KRW', 'Technology', 'Semiconductors'),
('000660', 'SK하이닉스', 'KOSPI', 'KR', 'KRW', 'Technology', 'Semiconductors'),
('035420', 'NAVER', 'KOSPI', 'KR', 'KRW', 'Technology', 'Internet Services');

-- 샘플 포트폴리오
INSERT INTO portfolios (user_id, name, description, investment_goal, target_amount) VALUES 
(1, '메르의 성장 포트폴리오', 'AI와 기술주 중심의 성장 투자 포트폴리오', 'aggressive', 100000000),
(1, '메르의 안정 포트폴리오', '배당주와 대형주 중심의 안정적 포트폴리오', 'conservative', 50000000);

-- 샘플 보유 종목
INSERT INTO portfolio_holdings (portfolio_id, stock_id, shares, avg_purchase_price, total_cost, first_purchase_date) VALUES 
(1, 1, 10.5, 180.50, 1894.25, '2024-01-15'),
(1, 2, 8.0, 385.75, 3086.00, '2024-02-01'),
(1, 4, 3.2, 245.30, 784.96, '2024-03-10'),
(1, 5, 2.8, 520.80, 1458.24, '2024-04-05');

-- 샘플 거래 내역
INSERT INTO transactions (portfolio_id, stock_id, transaction_type, shares, price, total_amount, transaction_date) VALUES 
(1, 1, 'buy', 5.0, 175.20, 876.00, '2024-01-15'),
(1, 1, 'buy', 5.5, 185.80, 1021.90, '2024-02-20'),
(1, 2, 'buy', 8.0, 385.75, 3086.00, '2024-02-01'),
(1, 4, 'buy', 3.2, 245.30, 784.96, '2024-03-10'),
(1, 5, 'buy', 2.8, 520.80, 1458.24, '2024-04-05');

-- 샘플 주가 데이터 (현재)
INSERT INTO stock_prices (stock_id, price, open_price, high_price, low_price, volume, change_amount, change_percent, price_date) VALUES 
(1, 185.25, 183.50, 186.80, 182.90, 45623000, 2.15, 1.17, CURDATE()),
(2, 412.30, 408.75, 414.50, 407.20, 28945000, 5.85, 1.44, CURDATE()),
(4, 248.67, 245.80, 251.20, 244.50, 52387000, -2.33, -0.93, CURDATE()),
(5, 520.15, 518.50, 525.80, 515.30, 38274000, -0.65, -0.12, CURDATE());

-- 샘플 국민연금 성과 데이터
INSERT INTO nps_performance (fund_type, return_1m, return_3m, return_6m, return_1y, return_3y, return_5y, data_date) VALUES 
('적극투자형', 2.1, 5.8, 12.3, 18.7, 8.9, 7.2, CURDATE()),
('안정추구형', 0.8, 2.3, 4.9, 7.8, 4.2, 3.8, CURDATE()),
('중도리스크형', 1.5, 4.1, 8.6, 13.2, 6.5, 5.5, CURDATE());