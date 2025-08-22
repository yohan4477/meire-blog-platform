-- 메르 주간보고 시스템 - 7개 핵심 테이블 스키마
-- Created: 2025-08-21
-- Phase 1 Implementation

-- 1. 주간보고서 메타데이터 테이블
CREATE TABLE IF NOT EXISTS weekly_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    report_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    title TEXT,
    summary TEXT,
    insights TEXT,
    total_posts INTEGER DEFAULT 0,
    total_stock_mentions INTEGER DEFAULT 0,
    generated_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(week_start_date, week_end_date)
);

-- 2. 주간 포스트 분석 테이블
CREATE TABLE IF NOT EXISTS weekly_post_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekly_report_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    post_title TEXT NOT NULL,
    post_date DATETIME NOT NULL,
    post_category TEXT,
    word_count INTEGER,
    stock_mentions_count INTEGER DEFAULT 0,
    sentiment_score DECIMAL(3,2),
    market_impact_score DECIMAL(3,2),
    key_themes TEXT, -- JSON format
    extracted_insights TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
);

-- 3. 카테고리별 분석 테이블  
CREATE TABLE IF NOT EXISTS weekly_category_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekly_report_id INTEGER NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('세계정세', '매크로', '환율', '종목', '산업')),
    post_count INTEGER DEFAULT 0,
    total_word_count INTEGER DEFAULT 0,
    avg_sentiment_score DECIMAL(3,2),
    key_insights TEXT,
    top_keywords TEXT, -- JSON format
    trend_analysis TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE,
    UNIQUE(weekly_report_id, category)
);

-- 4. 주간 종목 트렌드 테이블
CREATE TABLE IF NOT EXISTS weekly_stock_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekly_report_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    company_name TEXT,
    mention_count INTEGER DEFAULT 0,
    avg_sentiment_score DECIMAL(3,2),
    price_change_percent DECIMAL(5,2),
    volume_change_percent DECIMAL(5,2),
    trend_category TEXT CHECK (trend_category IN ('상승', '하락', '보합', '주목')),
    key_events TEXT,
    analyst_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
);

-- 5. AI 인사이트 테이블
CREATE TABLE IF NOT EXISTS weekly_ai_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekly_report_id INTEGER NOT NULL,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('market_outlook', 'sector_analysis', 'risk_assessment', 'opportunity_highlight')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence_score DECIMAL(3,2),
    supporting_posts TEXT, -- JSON format with post_ids
    data_sources TEXT,
    priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
);

-- 6. 주간 지표 집계 테이블
CREATE TABLE IF NOT EXISTS weekly_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekly_report_id INTEGER NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(12,4) NOT NULL,
    metric_unit TEXT,
    previous_week_value DECIMAL(12,4),
    change_percent DECIMAL(5,2),
    benchmark_value DECIMAL(12,4),
    trend_direction TEXT CHECK (trend_direction IN ('up', 'down', 'stable')),
    interpretation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE,
    UNIQUE(weekly_report_id, metric_name)
);

-- 7. 주간보고서 구독 및 알림 테이블
CREATE TABLE IF NOT EXISTS weekly_report_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL, -- 향후 사용자 시스템과 연결
    email TEXT,
    notification_type TEXT NOT NULL DEFAULT 'email' CHECK (notification_type IN ('email', 'push', 'webhook')),
    is_active BOOLEAN DEFAULT 1,
    categories TEXT, -- JSON format, 관심 카테고리
    stock_tickers TEXT, -- JSON format, 관심 종목
    frequency TEXT DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'daily', 'monthly')),
    last_sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_weekly_reports_date_range ON weekly_reports(week_start_date, week_end_date);
CREATE INDEX IF NOT EXISTS idx_weekly_post_analysis_report_date ON weekly_post_analysis(weekly_report_id, post_date);
CREATE INDEX IF NOT EXISTS idx_weekly_category_analysis_category ON weekly_category_analysis(weekly_report_id, category);
CREATE INDEX IF NOT EXISTS idx_weekly_stock_trends_ticker ON weekly_stock_trends(weekly_report_id, ticker);
CREATE INDEX IF NOT EXISTS idx_weekly_ai_insights_type ON weekly_ai_insights(weekly_report_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_weekly_metrics_metric_name ON weekly_metrics(weekly_report_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_weekly_subscriptions_user ON weekly_report_subscriptions(user_id, is_active);

-- 트리거 생성 (자동 업데이트)
CREATE TRIGGER IF NOT EXISTS update_weekly_reports_timestamp
    AFTER UPDATE ON weekly_reports
    FOR EACH ROW
    BEGIN
        UPDATE weekly_reports SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_weekly_subscriptions_timestamp
    AFTER UPDATE ON weekly_report_subscriptions
    FOR EACH ROW
    BEGIN
        UPDATE weekly_report_subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;