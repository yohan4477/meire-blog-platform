-- Migration: 001 Weekly Reports System Schema
-- Description: Creates 7 core tables for Merry Weekly Report system
-- Date: 2025-01-21

-- 1. Weekly Reports Main Table
CREATE TABLE IF NOT EXISTS weekly_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_week DATE NOT NULL UNIQUE, -- YYYY-MM-DD format for week start (Monday)
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_insights JSON, -- Array of key insights
    total_posts INTEGER DEFAULT 0,
    category_distribution JSON, -- {category: count, ...}
    sentiment_overview JSON, -- {positive: 0.4, neutral: 0.3, negative: 0.3}
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    report_type TEXT DEFAULT 'weekly' CHECK (report_type IN ('weekly', 'monthly', 'special')),
    views INTEGER DEFAULT 0
);

-- 2. Geopolitical Events Analysis
CREATE TABLE IF NOT EXISTS geopolitical_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekly_report_id INTEGER NOT NULL,
    event_title TEXT NOT NULL,
    event_description TEXT NOT NULL,
    impact_level INTEGER CHECK (impact_level BETWEEN 1 AND 5), -- 1=low, 5=critical
    affected_regions JSON, -- Array of region codes
    market_impact_summary TEXT,
    related_posts JSON, -- Array of post IDs
    trend_direction TEXT CHECK (trend_direction IN ('positive', 'negative', 'neutral', 'mixed')),
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
);

-- 3. Economic Indicators Analysis
CREATE TABLE IF NOT EXISTS economic_indicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekly_report_id INTEGER NOT NULL,
    indicator_type TEXT NOT NULL, -- 'GDP', 'inflation', 'employment', 'interest_rates', etc.
    indicator_name TEXT NOT NULL,
    current_value DECIMAL(15,4),
    previous_value DECIMAL(15,4),
    change_percentage DECIMAL(5,2),
    analysis_summary TEXT NOT NULL,
    market_implications TEXT,
    related_posts JSON, -- Array of post IDs
    data_source TEXT,
    measurement_period TEXT, -- 'Q1 2024', 'December 2024', etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
);

-- 4. Currency Analysis
CREATE TABLE IF NOT EXISTS currency_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekly_report_id INTEGER NOT NULL,
    currency_pair TEXT NOT NULL, -- 'USD/KRW', 'EUR/USD', etc.
    current_rate DECIMAL(12,6),
    week_change_percentage DECIMAL(5,2),
    month_change_percentage DECIMAL(5,2),
    analysis_summary TEXT NOT NULL,
    key_drivers JSON, -- Array of key factors affecting the currency
    outlook TEXT CHECK (outlook IN ('bullish', 'bearish', 'neutral', 'volatile')),
    support_level DECIMAL(12,6),
    resistance_level DECIMAL(12,6),
    related_posts JSON, -- Array of post IDs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
);

-- 5. Stock & Industry Analysis
CREATE TABLE IF NOT EXISTS stock_industry_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekly_report_id INTEGER NOT NULL,
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('stock', 'industry', 'sector')),
    target_name TEXT NOT NULL, -- Stock ticker or industry name
    target_code TEXT, -- Stock ticker, industry code, etc.
    performance_summary TEXT NOT NULL,
    week_performance DECIMAL(5,2), -- Weekly percentage change
    month_performance DECIMAL(5,2), -- Monthly percentage change
    key_events JSON, -- Array of key events affecting this stock/industry
    outlook TEXT CHECK (outlook IN ('buy', 'hold', 'sell', 'watch')),
    risk_factors JSON, -- Array of risk factors
    opportunities JSON, -- Array of opportunities
    related_posts JSON, -- Array of post IDs
    mention_frequency INTEGER DEFAULT 0, -- How many times mentioned in posts this week
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
);

-- 6. Report Visualizations
CREATE TABLE IF NOT EXISTS report_visualizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekly_report_id INTEGER NOT NULL,
    visualization_type TEXT NOT NULL, -- 'chart', 'graph', 'heatmap', 'wordcloud', etc.
    title TEXT NOT NULL,
    description TEXT,
    data_config JSON NOT NULL, -- Chart.js config or similar
    visualization_data JSON NOT NULL, -- Actual data for the visualization
    chart_library TEXT DEFAULT 'recharts', -- 'recharts', 'chartjs', 'd3', etc.
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
);

-- 7. Report Subscriptions (for future notifications)
CREATE TABLE IF NOT EXISTS report_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_name TEXT,
    subscription_type TEXT DEFAULT 'weekly' CHECK (subscription_type IN ('weekly', 'monthly', 'special')),
    categories_filter JSON, -- Array of categories user is interested in
    delivery_method TEXT DEFAULT 'email' CHECK (delivery_method IN ('email', 'push', 'sms')),
    is_active BOOLEAN DEFAULT 1,
    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at DATETIME,
    notification_preferences JSON, -- Timing, frequency, etc.
    UNIQUE(user_email, subscription_type)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_weekly_reports_date ON weekly_reports(report_week);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_status ON weekly_reports(status);
CREATE INDEX IF NOT EXISTS idx_geopolitical_events_week ON geopolitical_events(weekly_report_id);
CREATE INDEX IF NOT EXISTS idx_economic_indicators_week ON economic_indicators(weekly_report_id);
CREATE INDEX IF NOT EXISTS idx_currency_analysis_week ON currency_analysis(weekly_report_id);
CREATE INDEX IF NOT EXISTS idx_stock_industry_week ON stock_industry_analysis(weekly_report_id);
CREATE INDEX IF NOT EXISTS idx_report_visualizations_week ON report_visualizations(weekly_report_id);
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_active ON report_subscriptions(is_active, subscription_type);

-- Weekly reports configuration
CREATE TABLE IF NOT EXISTS weekly_reports_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT UNIQUE NOT NULL,
    config_value JSON NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT OR REPLACE INTO weekly_reports_config (config_key, config_value, description) VALUES
('categories', '["세계정세", "매크로", "나라별", "환율", "종목", "산업"]', 'Available categories for post classification'),
('analysis_prompts', '{"세계정세": "Global geopolitical events and their market implications", "매크로": "Macroeconomic trends and indicators", "나라별": "Country-specific economic and political developments", "환율": "Currency movements and exchange rate analysis", "종목": "Individual stock analysis and performance", "산업": "Industry trends and sector analysis"}', 'AI analysis prompts for each category'),
('generation_schedule', '{"day_of_week": 1, "hour": 9, "timezone": "Asia/Seoul"}', 'When to auto-generate weekly reports (Monday 9AM KST)'),
('retention_policy', '{"weeks_to_keep": 52, "archive_after_weeks": 12}', 'Data retention and archival policy');