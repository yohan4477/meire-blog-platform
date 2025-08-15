-- 종목 테이블 통합 스크립트 (stocks + merry_mentioned_stocks)
-- 작성일: 2025-08-15
-- 목적: 두 개의 분리된 테이블을 하나의 통합 테이블로 병합

-- 1. 통합 테이블 생성
DROP TABLE IF EXISTS stock_mentions_unified;

CREATE TABLE stock_mentions_unified (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 기본 종목 정보 (기존 stocks 테이블)
    ticker TEXT NOT NULL,
    company_name TEXT NOT NULL,
    company_name_kr TEXT,
    market TEXT,
    currency TEXT DEFAULT 'USD',
    sector TEXT,
    industry TEXT,
    
    -- 언급 정보 (기존 merry_mentioned_stocks 테이블)
    post_id INTEGER,
    mentioned_date DATETIME,
    mention_type TEXT,
    context TEXT,
    sentiment_score DECIMAL(3,2),
    is_featured BOOLEAN DEFAULT 0,
    
    -- 메타 정보
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 외래키 제약조건
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE SET NULL
);

-- 인덱스 생성
CREATE INDEX idx_unified_ticker ON stock_mentions_unified(ticker);
CREATE INDEX idx_unified_mentioned_date ON stock_mentions_unified(mentioned_date);
CREATE INDEX idx_unified_post_id ON stock_mentions_unified(post_id);
CREATE INDEX idx_unified_market ON stock_mentions_unified(market);

-- 2. 데이터 마이그레이션: 언급된 종목들을 기준으로 통합
INSERT INTO stock_mentions_unified (
    ticker, company_name, company_name_kr, market, currency, sector, industry,
    post_id, mentioned_date, mention_type, context, sentiment_score, is_featured,
    created_at, updated_at
)
SELECT 
    s.ticker,
    s.company_name,
    s.company_name_kr,
    s.market,
    s.currency,
    s.sector,
    s.industry,
    m.post_id,
    m.mentioned_date,
    m.mention_type,
    m.context,
    m.sentiment_score,
    m.is_featured,
    s.created_at,
    s.updated_at
FROM stocks s
INNER JOIN merry_mentioned_stocks m ON s.ticker = m.ticker;

-- 3. 언급되지 않은 종목도 포함 (기본 레코드로 추가)
INSERT INTO stock_mentions_unified (
    ticker, company_name, company_name_kr, market, currency, sector, industry,
    post_id, mentioned_date, mention_type, context, sentiment_score, is_featured,
    created_at, updated_at
)
SELECT 
    s.ticker,
    s.company_name,
    s.company_name_kr,
    s.market,
    s.currency,
    s.sector,
    s.industry,
    NULL,  -- post_id
    NULL,  -- mentioned_date
    NULL,  -- mention_type
    NULL,  -- context
    NULL,  -- sentiment_score
    0,     -- is_featured
    s.created_at,
    s.updated_at
FROM stocks s
WHERE s.ticker NOT IN (
    SELECT DISTINCT ticker 
    FROM merry_mentioned_stocks 
    WHERE ticker IS NOT NULL
);

-- 4. 통계 정보를 위한 뷰 생성 (기존 stocks 테이블 기능 대체)
CREATE VIEW stock_summary AS
SELECT 
    ticker,
    company_name,
    company_name_kr,
    market,
    currency,
    sector,
    industry,
    COUNT(CASE WHEN mentioned_date IS NOT NULL THEN 1 END) as mention_count,
    MIN(mentioned_date) as first_mentioned_date,
    MAX(mentioned_date) as last_mentioned_date,
    CASE WHEN COUNT(CASE WHEN mentioned_date IS NOT NULL THEN 1 END) > 0 THEN 1 ELSE 0 END as is_merry_mentioned
FROM stock_mentions_unified
GROUP BY ticker, company_name, company_name_kr, market, currency, sector, industry;

-- 5. 데이터 검증 쿼리
SELECT 'Data Validation Results' as title;

SELECT 'Original stocks count:' as check_type, COUNT(*) as count FROM stocks;
SELECT 'Original mentions count:' as check_type, COUNT(*) as count FROM merry_mentioned_stocks;
SELECT 'Unified table count:' as check_type, COUNT(*) as count FROM stock_mentions_unified;
SELECT 'Unified table with mentions:' as check_type, COUNT(*) as count FROM stock_mentions_unified WHERE mentioned_date IS NOT NULL;
SELECT 'Summary view count:' as check_type, COUNT(*) as count FROM stock_summary;

-- 6. 통합 테이블 샘플 데이터 확인
SELECT 'Sample unified data:' as title;
SELECT ticker, company_name_kr, post_id, mentioned_date, mention_type 
FROM stock_mentions_unified 
ORDER BY mentioned_date DESC NULLS LAST
LIMIT 10;