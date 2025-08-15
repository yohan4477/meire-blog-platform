-- Claude AI 기반 감정 분석 시스템을 위한 확장된 데이터베이스 스키마
-- 기존 post_stock_sentiments 테이블과 별도로 Claude AI 전용 테이블 생성

-- 1. Claude AI 감정 분석 결과 저장 테이블 생성
CREATE TABLE IF NOT EXISTS post_stock_sentiments_claude (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    
    -- 기본 감정 분석 정보
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    sentiment_score DECIMAL(4,3) NOT NULL DEFAULT 0.0, -- -1.0 to 1.0
    confidence DECIMAL(4,3) NOT NULL DEFAULT 0.0, -- 0.0 to 1.0
    
    -- Claude AI 분석 결과 (상세 정보)
    key_reasoning TEXT, -- 메르의 핵심 투자 논리 요약
    supporting_evidence TEXT, -- JSON: {positive_factors, negative_factors, neutral_factors}
    key_keywords TEXT, -- JSON: ["키워드1", "키워드2", ...]
    context_quotes TEXT, -- JSON: ["판단 근거 문장1", "문장2", ...]
    
    -- 투자 관점 정보
    investment_perspective TEXT, -- JSON: ["실적", "전망", "리스크", "기회", "밸류에이션"]
    investment_timeframe TEXT CHECK (investment_timeframe IN ('단기', '중기', '장기', '불명')),
    conviction_level TEXT CHECK (conviction_level IN ('높음', '보통', '낮음')),
    
    -- 메타데이터
    mention_context TEXT, -- 언급 맥락 (실적 발표, 뉴스 반응, 시장 분석 등)
    analysis_focus TEXT, -- 분석의 주요 초점
    uncertainty_factors TEXT, -- JSON: ["불확실 요소1", "요소2", ...]
    
    -- 시스템 정보
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    claude_model TEXT DEFAULT 'claude-3-sonnet-20240229',
    api_cost DECIMAL(10,6) DEFAULT 0.0,
    
    -- 외래키 및 유니크 제약
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    UNIQUE(post_id, ticker)
);

-- 2. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_claude_sentiments_post_id ON post_stock_sentiments_claude(post_id);
CREATE INDEX IF NOT EXISTS idx_claude_sentiments_ticker ON post_stock_sentiments_claude(ticker);
CREATE INDEX IF NOT EXISTS idx_claude_sentiments_sentiment ON post_stock_sentiments_claude(sentiment);
CREATE INDEX IF NOT EXISTS idx_claude_sentiments_analyzed_at ON post_stock_sentiments_claude(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_claude_sentiments_confidence ON post_stock_sentiments_claude(confidence);

-- 3. 분석 통계 테이블 생성
CREATE TABLE IF NOT EXISTS claude_analysis_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_date DATE NOT NULL,
    posts_analyzed INTEGER DEFAULT 0,
    sentiments_generated INTEGER DEFAULT 0,
    total_api_cost DECIMAL(10,6) DEFAULT 0.0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    average_confidence DECIMAL(4,3) DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(analysis_date)
);

-- 4. Claude API 사용 로그 테이블
CREATE TABLE IF NOT EXISTS claude_api_usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    ticker TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_cost DECIMAL(10,6),
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT 1,
    error_message TEXT,
    called_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE SET NULL
);

-- 5. 감정 분석 품질 메트릭 뷰 생성
CREATE VIEW IF NOT EXISTS claude_sentiment_quality_metrics AS
SELECT 
    DATE(analyzed_at) as analysis_date,
    COUNT(*) as total_analyses,
    AVG(confidence) as avg_confidence,
    COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) as positive_count,
    COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative_count,
    COUNT(CASE WHEN sentiment = 'neutral' THEN 1 END) as neutral_count,
    COUNT(CASE WHEN confidence >= 0.7 THEN 1 END) as high_confidence_count,
    COUNT(CASE WHEN confidence < 0.4 THEN 1 END) as low_confidence_count,
    SUM(api_cost) as daily_cost
FROM post_stock_sentiments_claude
GROUP BY DATE(analyzed_at)
ORDER BY analysis_date DESC;

-- 6. 종목별 감정 트렌드 뷰
CREATE VIEW IF NOT EXISTS claude_sentiment_trends_by_ticker AS
SELECT 
    ticker,
    COUNT(*) as total_mentions,
    AVG(confidence) as avg_confidence,
    AVG(sentiment_score) as avg_sentiment_score,
    COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) as positive_mentions,
    COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative_mentions,
    COUNT(CASE WHEN sentiment = 'neutral' THEN 1 END) as neutral_mentions,
    MAX(analyzed_at) as last_analysis,
    AVG(CASE WHEN investment_timeframe = '장기' THEN 1 ELSE 0 END) as long_term_focus_ratio
FROM post_stock_sentiments_claude
GROUP BY ticker
ORDER BY total_mentions DESC;

-- 7. 6개월치 감정 분석 데이터 조회 뷰
CREATE VIEW IF NOT EXISTS claude_sentiment_six_months AS
SELECT 
    pss.*,
    bp.title as post_title,
    bp.created_date as post_date,
    bp.excerpt as post_excerpt
FROM post_stock_sentiments_claude pss
JOIN blog_posts bp ON pss.post_id = bp.id
WHERE bp.created_date >= date('now', '-6 months')
ORDER BY bp.created_date DESC;

-- 8. 데이터 마이그레이션: 기존 데이터가 있다면 복사 (선택적)
-- INSERT INTO post_stock_sentiments_claude 
-- (post_id, ticker, sentiment, sentiment_score, confidence, analyzed_at)
-- SELECT 
--     post_id, 
--     ticker, 
--     sentiment, 
--     CASE 
--         WHEN sentiment = 'positive' THEN confidence 
--         WHEN sentiment = 'negative' THEN -confidence 
--         ELSE 0.0 
--     END as sentiment_score,
--     confidence, 
--     analyzed_at
-- FROM post_stock_sentiments
-- WHERE NOT EXISTS (
--     SELECT 1 FROM post_stock_sentiments_claude psc 
--     WHERE psc.post_id = post_stock_sentiments.post_id 
--     AND psc.ticker = post_stock_sentiments.ticker
-- );

-- 9. 유용한 쿼리 예시 (주석으로 남겨둠)

-- 특정 종목의 6개월 감정 트렌드
-- SELECT 
--     DATE(bp.created_date) as date,
--     pss.sentiment,
--     pss.confidence,
--     pss.key_reasoning,
--     bp.title
-- FROM post_stock_sentiments_claude pss
-- JOIN blog_posts bp ON pss.post_id = bp.id
-- WHERE pss.ticker = 'TSLA' 
--   AND bp.created_date >= date('now', '-6 months')
-- ORDER BY bp.created_date DESC;

-- 고신뢰도 투자 의견 조회
-- SELECT 
--     ticker,
--     sentiment,
--     confidence,
--     key_reasoning,
--     investment_timeframe,
--     conviction_level
-- FROM post_stock_sentiments_claude
-- WHERE confidence >= 0.8
-- ORDER BY confidence DESC;

-- 월별 감정 분석 통계
-- SELECT 
--     strftime('%Y-%m', analyzed_at) as month,
--     COUNT(*) as total_analyses,
--     AVG(confidence) as avg_confidence,
--     SUM(api_cost) as monthly_cost
-- FROM post_stock_sentiments_claude
-- GROUP BY strftime('%Y-%m', analyzed_at)
-- ORDER BY month DESC;