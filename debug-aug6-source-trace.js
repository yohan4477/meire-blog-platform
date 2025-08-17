const { chromium } = require('playwright');

async function debugAug6SourceTrace() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // 상세한 로그 캡처
  page.on('console', msg => {
    const text = msg.text();
    console.log('🖥️', text);
  });
  
  try {
    console.log('🚀 8월 6일 데이터 소스 추적...');
    await page.goto('http://localhost:3012/merry/stocks/005930', { waitUntil: 'networkidle' });
    
    console.log('📊 1M 기간 선택...');
    await page.locator('button:has-text("1M")').click();
    
    console.log('⏳ 데이터 로딩 대기...');
    await page.waitForTimeout(5000);
    
    // 브라우저에서 실제 데이터 소스 추적
    const sourceTrace = await page.evaluate(async () => {
      try {
        // Stock Price API 데이터
        const stockPriceResponse = await fetch('/api/stock-price?ticker=005930&period=1M');
        const stockPriceData = await stockPriceResponse.json();
        
        // Posts API 데이터  
        const postsResponse = await fetch('/api/merry/stocks/005930/posts?limit=100&offset=0&period=1mo');
        const postsData = await postsResponse.json();
        
        // Sentiments API 데이터
        const sentimentResponse = await fetch('/api/merry/stocks/005930/sentiments?period=1mo');
        const sentimentData = await sentimentResponse.json();
        
        // 8월 6일 관련 데이터 추출
        const aug6StockPrice = stockPriceData.prices?.find(p => p.date === '2025-08-06') || null;
        const aug6Posts = postsData.data?.posts?.filter(p => p.created_date?.startsWith('2025-08-06')) || [];
        const aug6Sentiments = sentimentData.sentimentByDate?.['2025-08-06'] || null;
        
        // postsByDate 시뮬레이션
        const postsByDate = {};
        if (postsData.data?.posts) {
          postsData.data.posts.forEach(post => {
            const dateStr = post.created_date.split(' ')[0];
            if (!postsByDate[dateStr]) {
              postsByDate[dateStr] = [];
            }
            postsByDate[dateStr].push(post);
          });
        }
        
        // 차트 데이터 처리 시뮬레이션
        let aug6ChartPoint = null;
        if (aug6StockPrice) {
          const sentimentData = aug6Sentiments;
          const postsData = postsByDate['2025-08-06'] || [];
          
          const postSentimentPairs = sentimentData?.postSentimentPairs || [];
          const finalPosts = postSentimentPairs.length > 0 
            ? postSentimentPairs.map(pair => pair.post)
            : postsData;
          const finalSentiments = postSentimentPairs.length > 0 
            ? postSentimentPairs.map(pair => pair.sentiment).filter(s => s && s.sentiment)
            : [];
            
          aug6ChartPoint = {
            date: '2025-08-06',
            price: aug6StockPrice.price,
            sentiments: finalSentiments,
            posts: finalPosts,
            postSentimentPairs: postSentimentPairs
          };
        }
        
        return {
          aug6StockPrice: aug6StockPrice,
          aug6PostsFromAPI: aug6Posts,
          aug6PostsFromMapping: postsByDate['2025-08-06'] || [],
          aug6Sentiments: aug6Sentiments,
          aug6ChartPoint: aug6ChartPoint,
          postsByDateKeys: Object.keys(postsByDate),
          totalPostsInPeriod: postsData.data?.posts?.length || 0
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('\n📊 8월 6일 데이터 소스 추적 결과:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n📈 Stock Price API:');
    console.log('8월 6일 주가 데이터:', sourceTrace.aug6StockPrice ? 'EXISTS' : 'NOT EXISTS');
    if (sourceTrace.aug6StockPrice) {
      console.log('  가격:', sourceTrace.aug6StockPrice.price);
    }
    
    console.log('\n📝 Posts API:');
    console.log('8월 6일 직접 필터링:', sourceTrace.aug6PostsFromAPI.length, '개');
    console.log('8월 6일 postsByDate 매핑:', sourceTrace.aug6PostsFromMapping.length, '개');
    console.log('전체 1M 기간 포스트:', sourceTrace.totalPostsInPeriod, '개');
    console.log('postsByDate 키:', sourceTrace.postsByDateKeys);
    
    console.log('\n🎯 Sentiments API:');
    console.log('8월 6일 감정 데이터:', sourceTrace.aug6Sentiments ? 'EXISTS' : 'NOT EXISTS');
    if (sourceTrace.aug6Sentiments) {
      console.log('  포스트-감정 쌍:', sourceTrace.aug6Sentiments.postSentimentPairs?.length || 0);
      console.log('  감정 분석:', sourceTrace.aug6Sentiments.sentiments?.length || 0);
    }
    
    console.log('\n🎨 차트 데이터 처리:');
    if (sourceTrace.aug6ChartPoint) {
      console.log('8월 6일 차트 포인트 생성됨:');
      console.log('  posts:', sourceTrace.aug6ChartPoint.posts?.length || 0);
      console.log('  sentiments:', sourceTrace.aug6ChartPoint.sentiments?.length || 0);
      console.log('  postSentimentPairs:', sourceTrace.aug6ChartPoint.postSentimentPairs?.length || 0);
      
      // 마커 표시 조건 확인
      const hasValidPosts = sourceTrace.aug6ChartPoint.posts && Array.isArray(sourceTrace.aug6ChartPoint.posts) && sourceTrace.aug6ChartPoint.posts.length > 0;
      const hasValidSentiments = sourceTrace.aug6ChartPoint.sentiments && Array.isArray(sourceTrace.aug6ChartPoint.sentiments) && sourceTrace.aug6ChartPoint.sentiments.length > 0;
      const hasValidPairs = sourceTrace.aug6ChartPoint.postSentimentPairs && Array.isArray(sourceTrace.aug6ChartPoint.postSentimentPairs) && sourceTrace.aug6ChartPoint.postSentimentPairs.length > 0;
      
      console.log('\n🔍 마커 표시 조건 검증:');
      console.log('  hasValidPosts:', hasValidPosts);
      console.log('  hasValidSentiments:', hasValidSentiments);
      console.log('  hasValidPairs:', hasValidPairs);
      console.log('  마커 표시 여부:', hasValidPosts || hasValidSentiments || hasValidPairs);
    } else {
      console.log('8월 6일 차트 포인트 생성되지 않음 (주가 데이터 없음)');
    }
    
  } catch (error) {
    console.error('❌ 분석 오류:', error);
  } finally {
    await browser.close();
  }
}

debugAug6SourceTrace();