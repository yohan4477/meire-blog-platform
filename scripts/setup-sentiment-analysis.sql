-- 포스트별 종목별 감정 분석 테이블 생성
CREATE TABLE IF NOT EXISTS post_stock_sentiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    sentiment_score DECIMAL(4,3) NOT NULL, -- -1.0 to 1.0 range
    confidence DECIMAL(4,3) NOT NULL, -- 0.0 to 1.0 range
    keywords TEXT, -- JSON array of relevant keywords
    context_snippet TEXT, -- Text snippet that influenced sentiment
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE,
    UNIQUE(post_id, ticker)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_post_stock_sentiments_post_id ON post_stock_sentiments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_stock_sentiments_ticker ON post_stock_sentiments(ticker);
CREATE INDEX IF NOT EXISTS idx_post_stock_sentiments_sentiment ON post_stock_sentiments(sentiment);
CREATE INDEX IF NOT EXISTS idx_post_stock_sentiments_score ON post_stock_sentiments(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_post_stock_sentiments_analyzed_at ON post_stock_sentiments(analyzed_at);

-- 기존 merry_mentioned_stocks 테이블 업데이트 (post_id 연결)
-- 나중에 실제 포스트와 연결하는 스크립트에서 사용