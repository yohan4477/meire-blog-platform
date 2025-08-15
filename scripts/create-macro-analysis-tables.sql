-- 메르 매크로 트렌드 분석을 위한 데이터베이스 스키마
-- 2025-08-14 생성

-- 1. 매크로 이벤트 테이블 (지정학적/경제적 사건)
CREATE TABLE IF NOT EXISTS macro_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_title TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('geopolitical', 'economic', 'natural', 'technological')),
    event_category TEXT, -- 전쟁, 제재, 무역분쟁, 금리결정 등
    event_description TEXT,
    event_date DATE,
    severity_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0-1.0
    impact_regions TEXT, -- JSON array of affected regions
    source_urls TEXT, -- JSON array of source URLs
    extracted_from_post_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (extracted_from_post_id) REFERENCES blog_posts(id) ON DELETE SET NULL
);

-- 2. 논리 체인 테이블 (메르의 연결고리 분석)
CREATE TABLE IF NOT EXISTS causal_chains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chain_title TEXT NOT NULL,
    chain_description TEXT,
    source_post_id INTEGER NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0-1.0
    prediction_horizon TEXT CHECK (prediction_horizon IN ('1w', '1m', '3m', '6m', '1y')),
    investment_thesis TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
);

-- 3. 논리 체인 단계 테이블 (원인-결과 연결고리)
CREATE TABLE IF NOT EXISTS causal_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chain_id INTEGER NOT NULL,
    step_order INTEGER NOT NULL,
    step_type TEXT CHECK (step_type IN ('trigger', 'intermediate', 'outcome')),
    step_description TEXT NOT NULL,
    affected_entity TEXT, -- 국가, 기업, 섹터, 원자재 등
    entity_type TEXT CHECK (entity_type IN ('country', 'company', 'sector', 'commodity', 'currency')),
    impact_direction TEXT CHECK (impact_direction IN ('positive', 'negative', 'neutral')),
    confidence_score DECIMAL(3,2) DEFAULT 0.5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chain_id) REFERENCES causal_chains(id) ON DELETE CASCADE
);

-- 4. 주식 연관성 테이블
CREATE TABLE IF NOT EXISTS stock_correlations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chain_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    company_name TEXT,
    correlation_type TEXT CHECK (correlation_type IN ('direct', 'supplier', 'competitor', 'sector')),
    expected_impact TEXT CHECK (expected_impact IN ('strong_positive', 'positive', 'neutral', 'negative', 'strong_negative')),
    impact_probability DECIMAL(3,2) DEFAULT 0.5,
    reasoning TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chain_id) REFERENCES causal_chains(id) ON DELETE CASCADE
);

-- 5. 메르 예측 추적 테이블
CREATE TABLE IF NOT EXISTS merry_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chain_id INTEGER NOT NULL,
    prediction_text TEXT NOT NULL,
    prediction_type TEXT CHECK (prediction_type IN ('price_target', 'trend_direction', 'timing', 'event_outcome')),
    predicted_ticker TEXT,
    target_value DECIMAL(10,2), -- 목표가 또는 수치
    target_date DATE,
    confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'failed', 'expired')),
    actual_outcome TEXT,
    accuracy_score DECIMAL(3,2), -- 실제 결과 대비 정확도
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chain_id) REFERENCES causal_chains(id) ON DELETE CASCADE
);

-- 6. 시장 반응 추적 테이블
CREATE TABLE IF NOT EXISTS market_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER,
    ticker TEXT NOT NULL,
    price_before DECIMAL(10,4),
    price_after DECIMAL(10,4),
    price_change_percent DECIMAL(6,3),
    volume_change_percent DECIMAL(6,3),
    reaction_date DATE NOT NULL,
    time_to_reaction INTEGER, -- 이벤트 후 반응까지 시간(시간 단위)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES macro_events(id) ON DELETE SET NULL
);

-- 7. 사용자 프로필 테이블 (개인화)
CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    risk_tolerance TEXT DEFAULT 'medium' CHECK (risk_tolerance IN ('conservative', 'medium', 'aggressive')),
    investment_horizon TEXT DEFAULT '1y' CHECK (investment_horizon IN ('1m', '3m', '6m', '1y', '5y+')),
    sectors_of_interest TEXT, -- JSON array
    regions_of_interest TEXT, -- JSON array
    notification_preferences TEXT, -- JSON object
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. 사용자 보유 종목 테이블
CREATE TABLE IF NOT EXISTS user_holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    ticker TEXT NOT NULL,
    shares DECIMAL(10,4),
    avg_cost DECIMAL(10,4),
    current_value DECIMAL(12,2),
    portfolio_weight DECIMAL(5,2),
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- 9. 공급망 매핑 테이블
CREATE TABLE IF NOT EXISTS supply_chain_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_entity TEXT NOT NULL, -- 공급원 (국가, 지역, 기업)
    source_type TEXT CHECK (source_type IN ('country', 'region', 'company', 'port')),
    target_entity TEXT NOT NULL, -- 공급 대상
    target_type TEXT CHECK (target_type IN ('country', 'region', 'company', 'sector')),
    commodity TEXT, -- 공급 품목
    supply_percentage DECIMAL(5,2), -- 공급 비중 %
    criticality_score DECIMAL(3,2) DEFAULT 0.5, -- 중요도 점수
    vulnerability_factors TEXT, -- JSON array of risk factors
    alternative_suppliers TEXT, -- JSON array of alternatives
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. 알림 이력 테이블
CREATE TABLE IF NOT EXISTS notification_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    notification_type TEXT CHECK (notification_type IN ('prediction', 'market_move', 'portfolio_alert', 'news')),
    title TEXT NOT NULL,
    content TEXT,
    urgency_level TEXT DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    related_chain_id INTEGER,
    related_ticker TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (related_chain_id) REFERENCES causal_chains(id) ON DELETE SET NULL
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_macro_events_date ON macro_events(event_date);
CREATE INDEX IF NOT EXISTS idx_macro_events_type ON macro_events(event_type);
CREATE INDEX IF NOT EXISTS idx_causal_chains_post_id ON causal_chains(source_post_id);
CREATE INDEX IF NOT EXISTS idx_causal_steps_chain_id ON causal_steps(chain_id);
CREATE INDEX IF NOT EXISTS idx_stock_correlations_ticker ON stock_correlations(ticker);
CREATE INDEX IF NOT EXISTS idx_merry_predictions_ticker ON merry_predictions(predicted_ticker);
CREATE INDEX IF NOT EXISTS idx_merry_predictions_status ON merry_predictions(status);
CREATE INDEX IF NOT EXISTS idx_market_reactions_ticker ON market_reactions(ticker);
CREATE INDEX IF NOT EXISTS idx_market_reactions_date ON market_reactions(reaction_date);
CREATE INDEX IF NOT EXISTS idx_user_holdings_user_id ON user_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_supply_chain_source ON supply_chain_mappings(source_entity);
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification_history(user_id);

-- 초기 데이터 삽입
INSERT OR IGNORE INTO user_profiles (user_id, risk_tolerance, investment_horizon, sectors_of_interest, regions_of_interest) VALUES 
('default', 'medium', '1y', '["technology", "energy", "materials"]', '["asia", "north_america", "europe"]');

-- 샘플 공급망 매핑 데이터
INSERT OR IGNORE INTO supply_chain_mappings (source_entity, source_type, target_entity, target_type, commodity, supply_percentage, criticality_score) VALUES 
('China', 'country', 'Global', 'region', 'Rare Earth Metals', 85.0, 0.95),
('Taiwan', 'country', 'Global', 'region', 'Semiconductors', 65.0, 0.98),
('Russia', 'country', 'Europe', 'region', 'Natural Gas', 45.0, 0.90),
('Ukraine', 'country', 'Global', 'region', 'Wheat', 25.0, 0.70),
('Suez Canal', 'port', 'Global', 'region', 'Shipping Route', 15.0, 0.85);

-- 메르 분석 관련 초기 설정
CREATE TABLE IF NOT EXISTS merry_analysis_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO merry_analysis_config (config_key, config_value, description) VALUES 
('analysis_depth', '3', '논리 체인 분석 깊이 (최대 단계 수)'),
('confidence_threshold', '0.6', '예측 신뢰도 최소 임계값'),
('notification_frequency', '1h', '알림 빈도 (분, h, d 단위)'),
('market_reaction_window', '72', '시장 반응 추적 시간 (시간 단위)'),
('auto_analysis_enabled', 'true', '새 포스트 자동 분석 여부');