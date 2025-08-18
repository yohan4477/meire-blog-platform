-- 📊 Stock Universe 통계 및 메타데이터 관리 테이블
-- 유니버스 페이지의 모든 통계와 카테고리를 효율적으로 관리

DROP TABLE IF EXISTS stock_universe;

CREATE TABLE stock_universe (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 📈 전체 통계
    total_stocks INTEGER NOT NULL DEFAULT 0,
    total_posts INTEGER NOT NULL DEFAULT 0,
    analyzed_posts INTEGER NOT NULL DEFAULT 0,
    
    -- 🌏 지역별 통계
    domestic_stocks INTEGER NOT NULL DEFAULT 0,
    us_stocks INTEGER NOT NULL DEFAULT 0,
    other_stocks INTEGER NOT NULL DEFAULT 0,
    
    -- 🏪 시장별 통계
    kospi_stocks INTEGER NOT NULL DEFAULT 0,
    kosdaq_stocks INTEGER NOT NULL DEFAULT 0,
    krx_stocks INTEGER NOT NULL DEFAULT 0,
    nasdaq_stocks INTEGER NOT NULL DEFAULT 0,
    nyse_stocks INTEGER NOT NULL DEFAULT 0,
    
    -- 📊 감정 분석 통계
    positive_sentiment_count INTEGER NOT NULL DEFAULT 0,
    negative_sentiment_count INTEGER NOT NULL DEFAULT 0,
    neutral_sentiment_count INTEGER NOT NULL DEFAULT 0,
    
    -- 🎯 메르's Pick 통계
    merry_picks_count INTEGER NOT NULL DEFAULT 0,
    recent_mentions_30d INTEGER NOT NULL DEFAULT 0,
    active_stocks_count INTEGER NOT NULL DEFAULT 0,
    
    -- 📅 시간대별 통계
    posts_this_month INTEGER NOT NULL DEFAULT 0,
    posts_last_month INTEGER NOT NULL DEFAULT 0,
    new_stocks_this_month INTEGER NOT NULL DEFAULT 0,
    
    -- 🏆 성과 지표
    top_mentioned_ticker TEXT,
    most_analyzed_ticker TEXT,
    latest_addition_ticker TEXT,
    
    -- 🔄 메타데이터
    last_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_source TEXT DEFAULT 'automated_calculation',
    calculation_duration_ms INTEGER DEFAULT 0,
    
    -- 📊 추가 메트릭
    average_mentions_per_stock REAL DEFAULT 0.0,
    analysis_completion_rate REAL DEFAULT 0.0,
    universe_growth_rate REAL DEFAULT 0.0,
    
    -- 🔍 인덱스 및 성능 최적화
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 📊 Stock Universe Categories (카테고리별 종목 그룹)
DROP TABLE IF EXISTS stock_universe_categories;

CREATE TABLE stock_universe_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    category_name TEXT NOT NULL UNIQUE, -- 'AI반도체', '전기차', '바이오', etc.
    category_type TEXT NOT NULL,        -- 'sector', 'theme', 'size', 'performance'
    description TEXT,
    
    -- 📈 카테고리 통계
    stock_count INTEGER NOT NULL DEFAULT 0,
    total_mentions INTEGER NOT NULL DEFAULT 0,
    avg_sentiment_score REAL DEFAULT 0.0,
    
    -- 🎨 UI 표시
    display_order INTEGER DEFAULT 0,
    color_code TEXT DEFAULT '#3b82f6',
    icon_name TEXT DEFAULT 'TrendingUp',
    is_active BOOLEAN DEFAULT 1,
    
    -- 🔄 메타데이터
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 📊 Stock Universe Category Mappings (종목-카테고리 연결)
DROP TABLE IF EXISTS stock_universe_mappings;

CREATE TABLE stock_universe_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    ticker TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    
    -- 📊 매핑 메타데이터
    relevance_score REAL DEFAULT 1.0,    -- 카테고리와의 연관도 (0.0-1.0)
    is_primary BOOLEAN DEFAULT 0,        -- 주요 카테고리 여부
    
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES stock_universe_categories(id) ON DELETE CASCADE,
    UNIQUE(ticker, category_id)
);

-- 📊 인덱스 생성 (성능 최적화)
CREATE INDEX idx_stock_universe_updated ON stock_universe(last_updated_at);
CREATE INDEX idx_categories_type ON stock_universe_categories(category_type);
CREATE INDEX idx_categories_active ON stock_universe_categories(is_active, display_order);
CREATE INDEX idx_mappings_ticker ON stock_universe_mappings(ticker);
CREATE INDEX idx_mappings_category ON stock_universe_mappings(category_id);

-- 📊 초기 카테고리 데이터 삽입
INSERT INTO stock_universe_categories (
    category_name, category_type, description, display_order, color_code, icon_name
) VALUES 
    ('AI반도체', 'theme', 'AI 혁명의 핵심 반도체 기업들', 1, '#16a34a', 'Zap'),
    ('전기차', 'theme', '전기차 및 배터리 관련 기업들', 2, '#3b82f6', 'Car'),
    ('빅테크', 'theme', '글로벌 대형 기술기업', 3, '#8b5cf6', 'Monitor'),
    ('국내대형주', 'size', '한국 대표 대형주', 4, '#f59e0b', 'Building'),
    ('성장주', 'performance', '고성장 기대 종목들', 5, '#ef4444', 'TrendingUp'),
    ('배당주', 'performance', '안정적인 배당 수익 종목', 6, '#06b6d4', 'DollarSign'),
    ('바이오헬스', 'sector', '바이오 및 헬스케어', 7, '#10b981', 'Heart'),
    ('핀테크', 'theme', '금융기술 혁신 기업', 8, '#f97316', 'CreditCard');

-- 📊 초기 유니버스 데이터 (placeholder)
INSERT INTO stock_universe (
    total_stocks, total_posts, analyzed_posts,
    domestic_stocks, us_stocks,
    kospi_stocks, kosdaq_stocks, nasdaq_stocks, nyse_stocks,
    merry_picks_count, data_source
) VALUES (
    0, 0, 0,  -- 실제 계산으로 업데이트 예정
    0, 0,
    0, 0, 0, 0,
    0, 'initial_placeholder'
);

-- 📊 테이블 생성 완료 로그
SELECT 
    'Stock Universe tables created successfully!' as status,
    datetime('now') as created_at;