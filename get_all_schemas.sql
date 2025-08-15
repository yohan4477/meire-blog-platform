-- 모든 테이블의 스키마 정보 추출 스크립트
.mode column
.headers on
.width 30 50

-- 각 테이블별 스키마 정보 조회
SELECT '### blog_posts' as table_name;
PRAGMA table_info(blog_posts);

SELECT '### merry_tags' as table_name;
PRAGMA table_info(merry_tags);

SELECT '### merry_post_tags' as table_name;
PRAGMA table_info(merry_post_tags);

SELECT '### merry_comments' as table_name;
PRAGMA table_info(merry_comments);

SELECT '### merry_likes' as table_name;
PRAGMA table_info(merry_likes);

SELECT '### stock_mentions_unified' as table_name;
PRAGMA table_info(stock_mentions_unified);

SELECT '### stock_prices' as table_name;
PRAGMA table_info(stock_prices);

SELECT '### stocks' as table_name;
PRAGMA table_info(stocks);

SELECT '### merry_mentioned_stocks' as table_name;
PRAGMA table_info(merry_mentioned_stocks);

SELECT '### post_stock_sentiments' as table_name;
PRAGMA table_info(post_stock_sentiments);

SELECT '### causal_chains' as table_name;
PRAGMA table_info(causal_chains);

SELECT '### causal_steps' as table_name;
PRAGMA table_info(causal_steps);

SELECT '### stock_correlations' as table_name;
PRAGMA table_info(stock_correlations);

SELECT '### merry_predictions' as table_name;
PRAGMA table_info(merry_predictions);

SELECT '### market_reactions' as table_name;
PRAGMA table_info(market_reactions);

SELECT '### section_errors' as table_name;
PRAGMA table_info(section_errors);

SELECT '### error_solutions' as table_name;
PRAGMA table_info(error_solutions);

SELECT '### notification_history' as table_name;
PRAGMA table_info(notification_history);

SELECT '### merry_analysis_config' as table_name;
PRAGMA table_info(merry_analysis_config);

SELECT '### user_profiles' as table_name;
PRAGMA table_info(user_profiles);

SELECT '### user_holdings' as table_name;
PRAGMA table_info(user_holdings);

SELECT '### macro_events' as table_name;
PRAGMA table_info(macro_events);

SELECT '### supply_chain_mappings' as table_name;
PRAGMA table_info(supply_chain_mappings);