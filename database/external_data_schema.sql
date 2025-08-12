-- 공공데이터 및 외부 API 데이터 통합 스키마
-- 메르 블로그 플랫폼의 백엔드 API 설계 확장

-- 공공데이터 API 설정 테이블
CREATE TABLE IF NOT EXISTS public_api_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  api_name VARCHAR(100) NOT NULL UNIQUE COMMENT 'API 이름 (예: nps_investment, krx_market, fss_disclosure)',
  api_type ENUM('government', 'exchange', 'regulatory', 'financial') NOT NULL,
  base_url VARCHAR(500) NOT NULL COMMENT '기본 URL',
  api_key_required BOOLEAN DEFAULT TRUE,
  rate_limit_per_minute INT DEFAULT 60,
  rate_limit_per_day INT DEFAULT 1000,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_api_name (api_name),
  INDEX idx_api_type (api_type),
  INDEX idx_is_active (is_active)
) COMMENT='공공데이터 API 설정';

-- API 요청 로그 테이블 (rate limiting 및 모니터링용)
CREATE TABLE IF NOT EXISTS api_request_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  api_config_id INT NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  request_method ENUM('GET', 'POST', 'PUT', 'DELETE') DEFAULT 'GET',
  request_params JSON COMMENT '요청 파라미터',
  response_status INT COMMENT 'HTTP 응답 상태 코드',
  response_time_ms INT COMMENT '응답 시간 (밀리초)',
  error_message TEXT COMMENT '에러 메시지 (있는 경우)',
  cache_hit BOOLEAN DEFAULT FALSE COMMENT '캐시 히트 여부',
  request_ip VARCHAR(45) COMMENT '요청 IP',
  user_agent VARCHAR(500) COMMENT 'User Agent',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (api_config_id) REFERENCES public_api_configs(id) ON DELETE CASCADE,
  INDEX idx_api_config_id (api_config_id),
  INDEX idx_endpoint (endpoint),
  INDEX idx_response_status (response_status),
  INDEX idx_created_at (created_at),
  INDEX idx_cache_hit (cache_hit)
) COMMENT='API 요청 로그';

-- 국민연금 투자현황 데이터 테이블
CREATE TABLE IF NOT EXISTS nps_investment_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data_date DATE NOT NULL,
  fund_code VARCHAR(20) NOT NULL COMMENT '펀드 코드',
  fund_name VARCHAR(200) NOT NULL COMMENT '펀드명',
  stock_code VARCHAR(20) COMMENT '종목 코드',
  stock_name VARCHAR(200) COMMENT '종목명',
  shares BIGINT COMMENT '보유 주식 수',
  market_value DECIMAL(20,2) COMMENT '평가액 (원)',
  ratio DECIMAL(5,2) COMMENT '비중 (%)',
  change_from_prev DECIMAL(20,2) COMMENT '전 분기 대비 변동',
  sector VARCHAR(100) COMMENT '섹터',
  industry VARCHAR(100) COMMENT '업종',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_nps_holding (data_date, fund_code, stock_code),
  INDEX idx_data_date (data_date),
  INDEX idx_fund_code (fund_code),
  INDEX idx_stock_code (stock_code),
  INDEX idx_market_value (market_value),
  INDEX idx_sector (sector)
) COMMENT='국민연금 투자현황 데이터';

-- 한국거래소 시장 데이터 테이블
CREATE TABLE IF NOT EXISTS krx_market_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data_date DATE NOT NULL,
  market_type ENUM('KOSPI', 'KOSDAQ', 'KONEX') NOT NULL,
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(200) NOT NULL,
  closing_price DECIMAL(15,2) COMMENT '종가',
  opening_price DECIMAL(15,2) COMMENT '시가',
  high_price DECIMAL(15,2) COMMENT '고가',
  low_price DECIMAL(15,2) COMMENT '저가',
  volume BIGINT COMMENT '거래량',
  transaction_amount DECIMAL(20,2) COMMENT '거래대금',
  market_cap DECIMAL(20,2) COMMENT '시가총액',
  listed_shares BIGINT COMMENT '상장주식수',
  foreign_ownership_ratio DECIMAL(5,2) COMMENT '외국인 소유비율',
  institutional_ownership_ratio DECIMAL(5,2) COMMENT '기관 소유비율',
  individual_ownership_ratio DECIMAL(5,2) COMMENT '개인 소유비율',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_krx_data (data_date, market_type, stock_code),
  INDEX idx_data_date (data_date),
  INDEX idx_market_type (market_type),
  INDEX idx_stock_code (stock_code),
  INDEX idx_market_cap (market_cap),
  INDEX idx_volume (volume)
) COMMENT='한국거래소 시장 데이터';

-- 금융감독원 공시 데이터 테이블
CREATE TABLE IF NOT EXISTS fss_disclosure_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  disclosure_id VARCHAR(50) NOT NULL UNIQUE COMMENT '공시 고유번호',
  company_code VARCHAR(20) NOT NULL COMMENT '회사 코드',
  company_name VARCHAR(200) NOT NULL COMMENT '회사명',
  disclosure_type VARCHAR(100) NOT NULL COMMENT '공시 유형',
  disclosure_title TEXT NOT NULL COMMENT '공시 제목',
  disclosure_content LONGTEXT COMMENT '공시 내용',
  disclosure_date DATETIME NOT NULL COMMENT '공시일시',
  submission_date DATETIME COMMENT '제출일시',
  keywords JSON COMMENT '키워드 (JSON 배열)',
  materiality_score DECIMAL(3,2) COMMENT '중요도 점수 (0.00-1.00)',
  sentiment_score DECIMAL(3,2) COMMENT '감정 점수 (-1.00~1.00)',
  market_impact_expected BOOLEAN DEFAULT FALSE COMMENT '시장 영향 예상 여부',
  document_url VARCHAR(1000) COMMENT '원본 문서 URL',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_disclosure_id (disclosure_id),
  INDEX idx_company_code (company_code),
  INDEX idx_disclosure_type (disclosure_type),
  INDEX idx_disclosure_date (disclosure_date),
  INDEX idx_materiality_score (materiality_score),
  INDEX idx_market_impact_expected (market_impact_expected)
) COMMENT='금융감독원 공시 데이터';

-- 외부 주식 API 데이터 캐시 테이블
CREATE TABLE IF NOT EXISTS external_stock_data_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data_source ENUM('yahoo_finance', 'alpha_vantage', 'finnhub', 'polygon') NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  data_type ENUM('price', 'financials', 'news', 'fundamentals', 'technicals') NOT NULL,
  data_content JSON NOT NULL COMMENT '캐시된 데이터 (JSON 형태)',
  request_params JSON COMMENT '요청 파라미터',
  cache_key VARCHAR(255) NOT NULL UNIQUE COMMENT '캐시 키',
  expires_at DATETIME NOT NULL COMMENT '만료 시간',
  hit_count INT DEFAULT 0 COMMENT '캐시 히트 횟수',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_data_source (data_source),
  INDEX idx_symbol (symbol),
  INDEX idx_data_type (data_type),
  INDEX idx_cache_key (cache_key),
  INDEX idx_expires_at (expires_at),
  INDEX idx_last_accessed_at (last_accessed_at)
) COMMENT='외부 주식 API 데이터 캐시';

-- 실시간 뉴스 및 공시 데이터 테이블
CREATE TABLE IF NOT EXISTS financial_news_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  news_id VARCHAR(100) NOT NULL UNIQUE COMMENT '뉴스 고유 ID',
  source VARCHAR(100) NOT NULL COMMENT '뉴스 소스',
  title TEXT NOT NULL,
  content LONGTEXT,
  summary TEXT COMMENT 'AI 생성 요약',
  author VARCHAR(200),
  published_at DATETIME NOT NULL,
  url VARCHAR(1000) NOT NULL,
  image_url VARCHAR(1000),
  related_symbols JSON COMMENT '관련 종목 심볼들 (JSON 배열)',
  categories JSON COMMENT '카테고리들 (JSON 배열)',
  sentiment_score DECIMAL(3,2) COMMENT '감정 점수 (-1.00~1.00)',
  importance_score DECIMAL(3,2) COMMENT '중요도 점수 (0.00-1.00)',
  market_impact_prediction JSON COMMENT '시장 영향 예측 (JSON)',
  language VARCHAR(10) DEFAULT 'ko' COMMENT '언어 코드',
  is_breaking_news BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_news_id (news_id),
  INDEX idx_source (source),
  INDEX idx_published_at (published_at),
  INDEX idx_sentiment_score (sentiment_score),
  INDEX idx_importance_score (importance_score),
  INDEX idx_is_breaking_news (is_breaking_news),
  INDEX idx_language (language)
) COMMENT='금융 뉴스 데이터';

-- 기업 재무제표 데이터 테이블
CREATE TABLE IF NOT EXISTS company_financials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  company_name VARCHAR(200) NOT NULL,
  report_type ENUM('annual', 'quarterly') NOT NULL,
  fiscal_year INT NOT NULL,
  fiscal_quarter INT COMMENT '분기 (1,2,3,4)',
  report_date DATE NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- 손익계산서 주요 항목
  revenue DECIMAL(20,2) COMMENT '매출액',
  gross_profit DECIMAL(20,2) COMMENT '매출총이익',
  operating_income DECIMAL(20,2) COMMENT '영업이익',
  net_income DECIMAL(20,2) COMMENT '당기순이익',
  ebitda DECIMAL(20,2) COMMENT 'EBITDA',
  
  -- 재무상태표 주요 항목
  total_assets DECIMAL(20,2) COMMENT '총자산',
  total_liabilities DECIMAL(20,2) COMMENT '총부채',
  total_equity DECIMAL(20,2) COMMENT '총자본',
  cash_and_equivalents DECIMAL(20,2) COMMENT '현금및현금성자산',
  
  -- 현금흐름표 주요 항목
  operating_cash_flow DECIMAL(20,2) COMMENT '영업현금흐름',
  investing_cash_flow DECIMAL(20,2) COMMENT '투자현금흐름',
  financing_cash_flow DECIMAL(20,2) COMMENT '재무현금흐름',
  
  -- 주요 재무비율
  pe_ratio DECIMAL(8,2) COMMENT 'PER',
  pb_ratio DECIMAL(8,2) COMMENT 'PBR',
  roe DECIMAL(5,2) COMMENT 'ROE (%)',
  roa DECIMAL(5,2) COMMENT 'ROA (%)',
  debt_to_equity DECIMAL(8,2) COMMENT '부채비율',
  current_ratio DECIMAL(8,2) COMMENT '유동비율',
  
  raw_data JSON COMMENT '원본 재무 데이터 (JSON)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_financial_report (symbol, report_type, fiscal_year, fiscal_quarter),
  INDEX idx_symbol (symbol),
  INDEX idx_report_type (report_type),
  INDEX idx_fiscal_year (fiscal_year),
  INDEX idx_report_date (report_date),
  INDEX idx_pe_ratio (pe_ratio),
  INDEX idx_roe (roe)
) COMMENT='기업 재무제표 데이터';

-- API 응답 캐시 설정 테이블
CREATE TABLE IF NOT EXISTS cache_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cache_key_pattern VARCHAR(200) NOT NULL UNIQUE COMMENT '캐시 키 패턴',
  cache_duration_seconds INT NOT NULL COMMENT '캐시 지속 시간 (초)',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_cache_key_pattern (cache_key_pattern),
  INDEX idx_is_active (is_active)
) COMMENT='캐시 설정';

-- API 성능 메트릭 테이블
CREATE TABLE IF NOT EXISTS api_performance_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  api_endpoint VARCHAR(500) NOT NULL,
  metric_date DATE NOT NULL,
  total_requests INT DEFAULT 0,
  successful_requests INT DEFAULT 0,
  failed_requests INT DEFAULT 0,
  avg_response_time_ms DECIMAL(8,2) DEFAULT 0,
  max_response_time_ms INT DEFAULT 0,
  min_response_time_ms INT DEFAULT 0,
  cache_hit_rate DECIMAL(5,2) DEFAULT 0 COMMENT '캐시 히트율 (%)',
  error_rate DECIMAL(5,2) DEFAULT 0 COMMENT '에러율 (%)',
  throughput_per_minute DECIMAL(8,2) DEFAULT 0 COMMENT '분당 처리량',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_endpoint_date (api_endpoint, metric_date),
  INDEX idx_api_endpoint (api_endpoint),
  INDEX idx_metric_date (metric_date),
  INDEX idx_error_rate (error_rate),
  INDEX idx_cache_hit_rate (cache_hit_rate)
) COMMENT='API 성능 메트릭';

-- 초기 공공데이터 API 설정 데이터
INSERT INTO public_api_configs (api_name, api_type, base_url, description, rate_limit_per_minute, rate_limit_per_day) VALUES 
('nps_investment', 'government', 'https://apis.data.go.kr/1160100/service/GetNpsPblicFundInvstDtlsService', '국민연금 투자현황 데이터', 300, 10000),
('krx_market', 'exchange', 'https://apis.data.go.kr/1160100/service/GetKrxListedInfoService', '한국거래소 상장종목 정보', 600, 20000),
('fss_disclosure', 'regulatory', 'https://opendart.fss.or.kr/api', '금융감독원 전자공시 시스템', 1000, 30000),
('yahoo_finance', 'financial', 'https://query1.finance.yahoo.com/v8/finance/chart', 'Yahoo Finance API', 2000, 100000),
('alpha_vantage', 'financial', 'https://www.alphavantage.co/query', 'Alpha Vantage API', 500, 10000);

-- 초기 캐시 설정 데이터
INSERT INTO cache_settings (cache_key_pattern, cache_duration_seconds, description) VALUES 
('nps_investment:*', 3600, '국민연금 투자 데이터 - 1시간 캐시'),
('krx_market:daily:*', 1800, '한국거래소 일일 데이터 - 30분 캐시'),
('stock_price:*', 300, '주식 가격 데이터 - 5분 캐시'),
('company_financials:*', 86400, '기업 재무제표 - 1일 캐시'),
('financial_news:*', 900, '금융 뉴스 - 15분 캐시'),
('fss_disclosure:*', 1800, '공시 정보 - 30분 캐시');