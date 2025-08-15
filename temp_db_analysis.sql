-- 데이터베이스 테이블별 상세 분석 스크립트

-- 1. 블로그 관련 테이블
SELECT '=== BLOG_POSTS ===' as section;
SELECT COUNT(*) as total_records FROM blog_posts;
SELECT 'Schema:' as info; 
PRAGMA table_info(blog_posts);
SELECT 'Sample:' as info;
SELECT id, title, created_date, views, category FROM blog_posts ORDER BY created_date DESC LIMIT 3;

SELECT '=== MERRY_TAGS ===' as section;
SELECT COUNT(*) as total_records FROM merry_tags;
PRAGMA table_info(merry_tags);
SELECT * FROM merry_tags LIMIT 5;

SELECT '=== MERRY_POST_TAGS ===' as section;
SELECT COUNT(*) as total_records FROM merry_post_tags;
PRAGMA table_info(merry_post_tags);
SELECT * FROM merry_post_tags LIMIT 5;

SELECT '=== MERRY_COMMENTS ===' as section;
SELECT COUNT(*) as total_records FROM merry_comments;
PRAGMA table_info(merry_comments);

SELECT '=== MERRY_LIKES ===' as section;
SELECT COUNT(*) as total_records FROM merry_likes;
PRAGMA table_info(merry_likes);

-- 2. 주식 관련 테이블
SELECT '=== STOCK_MENTIONS_UNIFIED (NEW) ===' as section;
SELECT COUNT(*) as total_records FROM stock_mentions_unified;
PRAGMA table_info(stock_mentions_unified);
SELECT ticker, company_name_kr, mentioned_date, mention_type FROM stock_mentions_unified ORDER BY mentioned_date DESC LIMIT 5;

SELECT '=== STOCK_PRICES ===' as section;
SELECT COUNT(*) as total_records FROM stock_prices;
PRAGMA table_info(stock_prices);
SELECT ticker, date, close_price FROM stock_prices ORDER BY date DESC LIMIT 5;

SELECT '=== POST_STOCK_SENTIMENTS ===' as section;
SELECT COUNT(*) as total_records FROM post_stock_sentiments;
PRAGMA table_info(post_stock_sentiments);
SELECT ticker, sentiment, confidence FROM post_stock_sentiments LIMIT 5;

-- 3. 분석 시스템 테이블
SELECT '=== CAUSAL_CHAINS ===' as section;
SELECT COUNT(*) as total_records FROM causal_chains;
PRAGMA table_info(causal_chains);

SELECT '=== CAUSAL_STEPS ===' as section;
SELECT COUNT(*) as total_records FROM causal_steps;
PRAGMA table_info(causal_steps);

-- 4. 시스템 관리 테이블
SELECT '=== SECTION_ERRORS ===' as section;
SELECT COUNT(*) as total_records FROM section_errors;
PRAGMA table_info(section_errors);

SELECT '=== ERROR_SOLUTIONS ===' as section;
SELECT COUNT(*) as total_records FROM error_solutions;
PRAGMA table_info(error_solutions);

-- 5. 사용자 관련 테이블
SELECT '=== USER_PROFILES ===' as section;
SELECT COUNT(*) as total_records FROM user_profiles;
PRAGMA table_info(user_profiles);

SELECT '=== USER_HOLDINGS ===' as section;
SELECT COUNT(*) as total_records FROM user_holdings;
PRAGMA table_info(user_holdings);