import { performantDb } from './db-performance';

/**
 * 실제 blog_posts 테이블에서 직접 종목 언급 횟수를 계산하는 함수
 * merry_mentioned_stocks 테이블의 부정확한 데이터 대신 실제 포스트 내용 기반으로 계산
 */
export async function getRealStockMentions(limit: number = 10): Promise<any[]> {
  const cacheKey = `real-stock-mentions-${limit}`;
  
  // 실제 blog_posts에서 직접 계산하는 쿼리
  const query = `
    WITH stock_mentions AS (
      SELECT 
        ticker,
        company_name,
        COUNT(*) as mention_count,
        MAX(created_date) as last_mentioned_at
      FROM (
        SELECT 
          'TSLA' as ticker,
          '테슬라' as company_name,
          created_date
        FROM blog_posts 
        WHERE (content LIKE '%테슬라%' OR content LIKE '%TSLA%' OR title LIKE '%테슬라%' OR title LIKE '%TSLA%')
        
        UNION ALL
        
        SELECT 
          '005930' as ticker,
          '삼성전자' as company_name,
          created_date
        FROM blog_posts 
        WHERE (content LIKE '%삼성전자%' OR content LIKE '%005930%' OR title LIKE '%삼성전자%' OR title LIKE '%005930%')
        
        UNION ALL
        
        SELECT 
          'INTC' as ticker,
          '인텔' as company_name,
          created_date
        FROM blog_posts 
        WHERE (content LIKE '%인텔%' OR content LIKE '%INTC%' OR title LIKE '%인텔%' OR title LIKE '%INTC%')
        
        UNION ALL
        
        SELECT 
          'LLY' as ticker,
          '일라이릴리' as company_name,
          created_date
        FROM blog_posts 
        WHERE (content LIKE '%일라이릴리%' OR content LIKE '%LLY%' OR content LIKE '%Eli Lilly%' OR title LIKE '%일라이릴리%' OR title LIKE '%LLY%')
        
        UNION ALL
        
        SELECT 
          'UNH' as ticker,
          '유나이티드헬스케어' as company_name,
          created_date
        FROM blog_posts 
        WHERE (content LIKE '%유나이티드헬스케어%' OR content LIKE '%UNH%' OR content LIKE '%UnitedHealth%' OR title LIKE '%유나이티드헬스케어%' OR title LIKE '%UNH%')
        
        UNION ALL
        
        SELECT 
          'NVDA' as ticker,
          '엔비디아' as company_name,
          created_date
        FROM blog_posts 
        WHERE (content LIKE '%엔비디아%' OR content LIKE '%NVDA%' OR content LIKE '%NVIDIA%' OR title LIKE '%엔비디아%' OR title LIKE '%NVDA%')
        
        UNION ALL
        
        SELECT 
          'AAPL' as ticker,
          '애플' as company_name,
          created_date
        FROM blog_posts 
        WHERE (content LIKE '%애플%' OR content LIKE '%AAPL%' OR content LIKE '%Apple%' OR content LIKE '%아이폰%' OR title LIKE '%애플%' OR title LIKE '%AAPL%' OR title LIKE '%아이폰%')
        
        UNION ALL
        
        SELECT 
          'GOOGL' as ticker,
          '구글' as company_name,
          created_date
        FROM blog_posts 
        WHERE (content LIKE '%구글%' OR content LIKE '%GOOGL%' OR content LIKE '%Google%' OR content LIKE '%알파벳%' OR title LIKE '%구글%' OR title LIKE '%GOOGL%')
        
        UNION ALL
        
        SELECT 
          'MSFT' as ticker,
          '마이크로소프트' as company_name,
          created_date
        FROM blog_posts 
        WHERE (content LIKE '%마이크로소프트%' OR content LIKE '%MSFT%' OR content LIKE '%Microsoft%' OR title LIKE '%마이크로소프트%' OR title LIKE '%MSFT%')
        
        UNION ALL
        
        SELECT 
          'AMZN' as ticker,
          '아마존' as company_name,
          created_date
        FROM blog_posts 
        WHERE (content LIKE '%아마존%' OR content LIKE '%AMZN%' OR content LIKE '%Amazon%' OR title LIKE '%아마존%' OR title LIKE '%AMZN%')
        
        UNION ALL
        
        SELECT 
          'META' as ticker,
          '메타' as company_name,
          created_date
        FROM blog_posts 
        WHERE (content LIKE '%메타%' OR content LIKE '%META%' OR content LIKE '%페이스북%' OR content LIKE '%Facebook%' OR title LIKE '%메타%' OR title LIKE '%META%' OR title LIKE '%페이스북%')
        
        UNION ALL
        
        SELECT 
          '042660' as ticker,
          '한화오션' as company_name,
          created_date
        FROM blog_posts 
        WHERE (content LIKE '%한화오션%' OR content LIKE '%042660%' OR content LIKE '%한화시스템%' OR title LIKE '%한화오션%' OR title LIKE '%042660%')
        
        UNION ALL
        
        SELECT 
          '267250' as ticker,
          'HD현대' as company_name,
          created_date
        FROM blog_posts 
        WHERE (content LIKE '%HD현대%' OR content LIKE '%267250%' OR content LIKE '%현대중공업%' OR title LIKE '%HD현대%' OR title LIKE '%267250%')
        
        UNION ALL
        
        SELECT 
          '010620' as ticker,
          '현대미포조선' as company_name,
          created_date
        FROM blog_posts 
        WHERE (content LIKE '%현대미포조선%' OR content LIKE '%010620%' OR content LIKE '%미포조선%' OR title LIKE '%현대미포조선%' OR title LIKE '%010620%')
      ) stock_matches
      GROUP BY ticker, company_name
    )
    SELECT 
      sm.ticker,
      sm.company_name,
      sm.mention_count,
      sm.last_mentioned_at,
      COALESCE(sentiment_count.analyzed_count, 0) as analyzed_count,
      CASE 
        WHEN LENGTH(sm.ticker) = 6 AND sm.ticker GLOB '[0-9]*' THEN 'KOSPI'
        ELSE 'NASDAQ'
      END as market,
      CASE 
        WHEN sm.ticker = 'TSLA' THEN '일론 머스크가 이끄는 전기차와 자율주행 기술의 글로벌 선도기업'
        WHEN sm.ticker = 'INTC' THEN '세계 최대의 반도체 칩 제조업체, CPU 및 데이터센터 솔루션 전문'
        WHEN sm.ticker = 'LLY' THEN '미국의 글로벌 제약회사, 당뇨병 치료제 및 비만 치료제 선도기업'
        WHEN sm.ticker = 'UNH' THEN '미국 최대 건강보험 회사, 헬스케어 서비스 및 보험 솔루션 제공'
        WHEN sm.ticker = 'NVDA' THEN '세계 최대 GPU 제조업체, AI 가속기 및 그래픽 카드 선도기업'
        WHEN sm.ticker = 'AAPL' THEN '아이폰, 맥북을 제조하는 세계 최대 기술기업'
        WHEN sm.ticker = 'GOOGL' THEN '검색엔진과 클라우드 서비스를 제공하는 알파벳의 모회사'
        WHEN sm.ticker = 'MSFT' THEN '윈도우 운영체제와 오피스를 제공하는 글로벌 소프트웨어 기업'
        WHEN sm.ticker = 'AMZN' THEN '전자상거래와 클라우드 서비스를 제공하는 글로벌 기업'
        WHEN sm.ticker = 'META' THEN '페이스북, 인스타그램을 운영하는 소셜미디어 플랫폼 기업'
        WHEN sm.ticker = '005930' THEN '세계 최대 메모리 반도체 및 스마트폰 제조업체'
        WHEN sm.ticker = '042660' THEN '대한민국의 대표적인 조선 및 해양플랜트 전문기업'
        WHEN sm.ticker = '267250' THEN '국내 대표 이차전지 소재 전문기업, 배터리 양극재 선도기업'
        WHEN sm.ticker = '010620' THEN '국내 중형 조선업체, 특수선박 및 해양구조물 전문'
        ELSE sm.company_name || ' 관련 기업'
      END as description,
      CASE 
        WHEN sm.ticker = 'TSLA' THEN '[\"전기차\", \"자율주행\", \"AI\", \"배터리\", \"미래차\"]'
        WHEN sm.ticker = 'INTC' THEN '[\"반도체\", \"CPU\", \"데이터센터\", \"AI\", \"서버\"]'
        WHEN sm.ticker = 'LLY' THEN '[\"제약\", \"당뇨병\", \"비만치료\", \"헬스케어\", \"바이오\"]'
        WHEN sm.ticker = 'UNH' THEN '[\"건강보험\", \"헬스케어\", \"의료\", \"보험\", \"미국주식\"]'
        WHEN sm.ticker = 'NVDA' THEN '[\"GPU\", \"AI\", \"반도체\", \"게임\", \"데이터센터\"]'
        WHEN sm.ticker = 'AAPL' THEN '[\"아이폰\", \"애플\", \"기술주\", \"소비재\", \"디바이스\"]'
        WHEN sm.ticker = 'GOOGL' THEN '[\"검색\", \"광고\", \"클라우드\", \"AI\", \"빅테크\"]'
        WHEN sm.ticker = 'MSFT' THEN '[\"소프트웨어\", \"클라우드\", \"윈도우\", \"오피스\", \"AI\"]'
        WHEN sm.ticker = 'AMZN' THEN '[\"전자상거래\", \"AWS\", \"클라우드\", \"물류\", \"소매\"]'
        WHEN sm.ticker = 'META' THEN '[\"소셜미디어\", \"메타버스\", \"VR\", \"광고\", \"플랫폼\"]'
        WHEN sm.ticker = '005930' THEN '[\"반도체\", \"메모리\", \"스마트폰\", \"삼성\", \"기술주\"]'
        WHEN sm.ticker = '042660' THEN '[\"조선\", \"해양플랜트\", \"방산\", \"에너지\", \"중공업\"]'
        WHEN sm.ticker = '267250' THEN '[\"이차전지\", \"배터리\", \"소재\", \"친환경\", \"신에너지\"]'
        WHEN sm.ticker = '010620' THEN '[\"조선\", \"특수선박\", \"해양\", \"중공업\", \"수출\"]'
        ELSE '[\"기타\", \"투자\"]'
      END as tags
    FROM stock_mentions sm
    LEFT JOIN (
      SELECT 
        ticker, 
        COUNT(DISTINCT post_id) as analyzed_count
      FROM post_stock_analysis 
      GROUP BY ticker
    ) sentiment_count ON sm.ticker = sentiment_count.ticker
    WHERE sm.mention_count > 0
    ORDER BY sm.mention_count DESC, sm.last_mentioned_at DESC 
    LIMIT ?
  `;
  
  return performantDb.query(query, [limit], cacheKey, 30000); // 30초 캐시
}