const { chromium } = require('playwright');

async function debugAug10BlueMarker() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🚀 8월 10일 파란색 마커 상세 분석...');
    await page.goto('http://localhost:3012/merry/stocks/005930', { waitUntil: 'networkidle' });
    
    console.log('📊 1M 기간 선택...');
    await page.locator('button:has-text("1M")').click();
    
    console.log('⏳ 데이터 로딩 대기...');
    await page.waitForTimeout(5000);
    
    // 8월 10일 관련 API 데이터 확인
    const aug10Analysis = await page.evaluate(async () => {
      try {
        // Posts API 호출
        const postsResponse = await fetch('/api/merry/stocks/005930/posts?limit=100&offset=0&period=1mo');
        const postsData = await postsResponse.json();
        
        // Sentiment API 호출  
        const sentimentResponse = await fetch('/api/merry/stocks/005930/sentiments?period=1mo');
        const sentimentData = await sentimentResponse.json();
        
        // Stock Price API 호출
        const stockResponse = await fetch('/api/stock-price?ticker=005930&period=1M');
        const stockData = await stockResponse.json();
        
        // 8월 10일 관련 데이터 필터링
        const aug10Posts = postsData.data?.posts?.filter(post => 
          post.created_date?.startsWith('2025-08-10')
        ) || [];
        
        const aug10Sentiments = sentimentData.sentimentByDate?.['2025-08-10'] || null;
        const aug10StockPrice = stockData.prices?.find(p => p.date === '2025-08-10') || null;
        
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
        
        // 차트 데이터 처리 시뮬레이션 (8월 10일)
        let aug10ChartPoint = null;
        if (aug10StockPrice) {
          const sentimentData = aug10Sentiments;
          const postsData = postsByDate['2025-08-10'] || [];
          
          const postSentimentPairs = sentimentData?.postSentimentPairs || [];
          const finalPosts = postSentimentPairs.length > 0 
            ? postSentimentPairs.map(pair => pair.post)
            : postsData;
          const finalSentiments = postSentimentPairs.length > 0 
            ? postSentimentPairs.map(pair => pair.sentiment).filter(s => s && s.sentiment)
            : [];
            
          aug10ChartPoint = {
            date: '2025-08-10',
            price: aug10StockPrice.price,
            sentiments: finalSentiments,
            posts: finalPosts,
            postSentimentPairs: postSentimentPairs
          };
          
          // 마커 표시 조건 검증
          const hasValidPosts = finalPosts && Array.isArray(finalPosts) && finalPosts.length > 0;
          const hasValidSentiments = finalSentiments && Array.isArray(finalSentiments) && finalSentiments.length > 0;
          const hasValidPairs = postSentimentPairs && Array.isArray(postSentimentPairs) && postSentimentPairs.length > 0;
          
          aug10ChartPoint.markerConditions = {
            hasValidPosts,
            hasValidSentiments,
            hasValidPairs,
            shouldShowMarker: hasValidPosts || hasValidSentiments || hasValidPairs
          };
        }
        
        return {
          aug10Posts,
          aug10Sentiments,
          aug10StockPrice,
          aug10ChartPoint,
          postsByDateKeys: Object.keys(postsByDate),
          allSentimentDates: Object.keys(sentimentData.sentimentByDate || {}),
          period1MData: {
            totalPosts: postsData.data?.total || 0,
            postsInPeriod: postsData.data?.posts?.length || 0,
            stockPricesInPeriod: stockData.prices?.length || 0
          }
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('\n📊 8월 10일 상세 분석:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n📝 Posts 분석:');
    console.log('8월 10일 포스트 개수:', aug10Analysis.aug10Posts?.length || 0);
    if (aug10Analysis.aug10Posts?.length > 0) {
      aug10Analysis.aug10Posts.forEach((post, index) => {
        console.log(`  ${index + 1}. ID: ${post.id}, 제목: ${post.title}`);
      });
    }
    
    console.log('\n🎯 Sentiments 분석:');
    console.log('8월 10일 감정 데이터 존재:', !!aug10Analysis.aug10Sentiments);
    if (aug10Analysis.aug10Sentiments) {
      console.log('  포스트-감정 쌍:', aug10Analysis.aug10Sentiments.postSentimentPairs?.length || 0);
      console.log('  감정 분석:', aug10Analysis.aug10Sentiments.sentiments?.length || 0);
    }
    
    console.log('\n📈 Stock Price 분석:');
    console.log('8월 10일 주가 데이터 존재:', !!aug10Analysis.aug10StockPrice);
    if (aug10Analysis.aug10StockPrice) {
      console.log('  가격:', aug10Analysis.aug10StockPrice.price);
    }
    
    console.log('\n🎨 차트 포인트 분석:');
    if (aug10Analysis.aug10ChartPoint) {
      console.log('8월 10일 차트 포인트:');
      console.log('  posts:', aug10Analysis.aug10ChartPoint.posts?.length || 0);
      console.log('  sentiments:', aug10Analysis.aug10ChartPoint.sentiments?.length || 0);
      console.log('  postSentimentPairs:', aug10Analysis.aug10ChartPoint.postSentimentPairs?.length || 0);
      
      if (aug10Analysis.aug10ChartPoint.markerConditions) {
        console.log('\n🔍 마커 표시 조건:');
        console.log('  hasValidPosts:', aug10Analysis.aug10ChartPoint.markerConditions.hasValidPosts);
        console.log('  hasValidSentiments:', aug10Analysis.aug10ChartPoint.markerConditions.hasValidSentiments);
        console.log('  hasValidPairs:', aug10Analysis.aug10ChartPoint.markerConditions.hasValidPairs);
        console.log('  마커 표시 여부:', aug10Analysis.aug10ChartPoint.markerConditions.shouldShowMarker);
      }
    }
    
    console.log('\n📋 전체 데이터 요약:');
    console.log('1M 기간 총 포스트:', aug10Analysis.period1MData?.totalPosts || 0);
    console.log('1M 기간 로드된 포스트:', aug10Analysis.period1MData?.postsInPeriod || 0);
    console.log('1M 기간 주가 데이터:', aug10Analysis.period1MData?.stockPricesInPeriod || 0);
    console.log('postsByDate 키 개수:', aug10Analysis.postsByDateKeys?.length || 0);
    console.log('감정 분석 날짜 개수:', aug10Analysis.allSentimentDates?.length || 0);
    
  } catch (error) {
    console.error('❌ 분석 오류:', error);
  } finally {
    await browser.close();
  }
}

debugAug10BlueMarker();