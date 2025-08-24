-- Migration script to replace post_id with log_no in all tables
-- Created: 2025-08-24

-- 1. Update sentiments table
ALTER TABLE sentiments ADD COLUMN log_no TEXT;

UPDATE sentiments 
SET log_no = (SELECT log_no FROM blog_posts WHERE blog_posts.id = sentiments.post_id)
WHERE post_id IS NOT NULL;

-- Drop old index and create new ones
DROP INDEX IF EXISTS idx_sentiments_post_id;
DROP INDEX IF EXISTS idx_sentiments_post_ticker;
CREATE INDEX idx_sentiments_log_no ON sentiments(log_no);
CREATE INDEX idx_sentiments_log_ticker ON sentiments(log_no, ticker);

-- 2. Update stock_mentions_unified table
ALTER TABLE stock_mentions_unified ADD COLUMN log_no TEXT;

UPDATE stock_mentions_unified 
SET log_no = (SELECT log_no FROM blog_posts WHERE blog_posts.id = stock_mentions_unified.post_id)
WHERE post_id IS NOT NULL;

-- Drop old index and create new one
DROP INDEX IF EXISTS idx_unified_post_id;
CREATE INDEX idx_unified_log_no ON stock_mentions_unified(log_no);

-- 3. Update weekly_post_analysis table
ALTER TABLE weekly_post_analysis ADD COLUMN log_no TEXT;

UPDATE weekly_post_analysis 
SET log_no = (SELECT log_no FROM blog_posts WHERE blog_posts.id = weekly_post_analysis.post_id)
WHERE post_id IS NOT NULL;

-- 4. Update post_stock_sentiments table (if exists)
-- This table seems to already use log_no based on the analysis table

-- 5. Create new tables without post_id columns (for reference)
-- These would be the new table structures going forward

-- Note: After verifying the migration, you can drop the old post_id columns:
-- ALTER TABLE sentiments DROP COLUMN post_id;
-- ALTER TABLE stock_mentions_unified DROP COLUMN post_id;
-- ALTER TABLE weekly_post_analysis DROP COLUMN post_id;