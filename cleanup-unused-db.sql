-- 데이터베이스 정리 스크립트
-- 실행 전 백업 권장!

-- 1. 백업 테이블들 삭제
DROP TABLE IF EXISTS merry_mentioned_stocks_backup;
DROP TABLE IF EXISTS merry_mentioned_stocks_backup_1755446805471;

-- 2. 사용하지 않는 테이블들 (코드에서 참조 없음)
DROP TABLE IF EXISTS claude_api_usage_log;
DROP TABLE IF EXISTS errors_basic;
DROP TABLE IF EXISTS errors_detail;
DROP TABLE IF EXISTS merry_analysis_config;
DROP TABLE IF EXISTS merry_post_tags;
DROP TABLE IF EXISTS merry_tags;
DROP TABLE IF EXISTS stock_correlations;
DROP VIEW IF EXISTS stock_summary;
DROP TABLE IF EXISTS blog_posts_content;
DROP VIEW IF EXISTS blog_posts_meta;
DROP VIEW IF EXISTS stock_stats_view;

-- 3. FTS 관련 테이블들 (전문 검색 미사용시)
-- DROP TABLE IF EXISTS blog_posts_fts;
-- DROP TABLE IF EXISTS blog_posts_fts_config;
-- DROP TABLE IF EXISTS blog_posts_fts_data;
-- DROP TABLE IF EXISTS blog_posts_fts_docsize;
-- DROP TABLE IF EXISTS blog_posts_fts_idx;

-- 4. sentiments 테이블 최적화 (사용하지 않는 컬럼 제거)
CREATE TABLE sentiments_optimized AS 
SELECT 
  id,
  post_id,
  ticker,
  sentiment,
  sentiment_score,
  key_reasoning,
  analysis_date,
  created_at
FROM sentiments;

DROP TABLE sentiments;
ALTER TABLE sentiments_optimized RENAME TO sentiments;

-- 인덱스 재생성
CREATE INDEX idx_sentiments_post_id ON sentiments(post_id);
CREATE INDEX idx_sentiments_ticker ON sentiments(ticker);
CREATE INDEX idx_sentiments_post_ticker ON sentiments(post_id, ticker);

-- 5. stocks 테이블 최적화 (사용하지 않는 컬럼 제거)
CREATE TABLE stocks_optimized AS 
SELECT 
  ticker,
  company_name,
  market,
  mention_count,
  first_mentioned_date,
  last_mentioned_date,
  is_merry_mentioned,
  description,
  tags,
  sector,
  industry,
  created_at,
  updated_at
FROM stocks;

DROP TABLE stocks;
ALTER TABLE stocks_optimized RENAME TO stocks;

-- 6. VACUUM으로 디스크 공간 회수
VACUUM;