const { chromium } = require('playwright');

async function debugPriceApiResponse() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🚀 삼성전자 페이지로 이동...');
    await page.goto('http://localhost:3012/merry/stocks/005930', { waitUntil: 'networkidle' });
    
    console.log('⏳ 페이지 로딩 대기...');
    await page.waitForTimeout(3000);
    
    console.log('📊 3M 기간 선택...');
    await page.locator('button:has-text("3M")').click();
    
    console.log('⏳ API 데이터 로딩 대기...');
    await page.waitForTimeout(5000);
    
    // 실제 API 응답 확인
    const apiData = await page.evaluate(async () => {
      try {
        // Stock Price API 호출
        const priceResponse = await fetch('/api/stock-price?ticker=005930&period=3M');
        const priceData = await priceResponse.json();
        
        // Posts API 호출
        const postsResponse = await fetch('/api/merry/stocks/005930/posts?limit=100&offset=0&period=3mo');
        const postsData = await postsResponse.json();
        
        // Sentiment API 호출
        const sentimentResponse = await fetch('/api/merry/stocks/005930/sentiments?period=3mo');
        const sentimentData = await sentimentResponse.json();
        
        return {
          priceData: {
            success: priceData.success,
            count: priceData.prices?.length || 0,
            dateRange: priceData.prices ? {
              start: priceData.prices[0]?.date,
              end: priceData.prices[priceData.prices.length - 1]?.date,
              first5: priceData.prices.slice(0, 5).map(p => p.date),
              last5: priceData.prices.slice(-5).map(p => p.date)
            } : null,
            period: priceData.period
          },
          postsData: {
            success: postsData.success,
            total: postsData.data?.total || 0,
            count: postsData.data?.posts?.length || 0,
            dateRange: postsData.data?.posts ? {
              start: postsData.data.posts[postsData.data.posts.length - 1]?.created_date?.split(' ')[0],
              end: postsData.data.posts[0]?.created_date?.split(' ')[0],
              first5: postsData.data.posts.slice(0, 5).map(p => p.created_date?.split(' ')[0]),
              last5: postsData.data.posts.slice(-5).map(p => p.created_date?.split(' ')[0])
            } : null
          },
          sentimentData: {
            totalDates: Object.keys(sentimentData.sentimentByDate || {}).length,
            analyzedMentions: sentimentData.analyzedMentions || 0,
            dateRange: Object.keys(sentimentData.sentimentByDate || {}).length > 0 ? {
              start: Object.keys(sentimentData.sentimentByDate || {}).sort()[0],
              end: Object.keys(sentimentData.sentimentByDate || {}).sort().slice(-1)[0]
            } : null
          }
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('\\n📈 Price API 분석:');
    console.log(`성공: ${apiData.priceData.success}`);
    console.log(`데이터 개수: ${apiData.priceData.count}개`);
    console.log(`기간: ${apiData.priceData.period}`);
    if (apiData.priceData.dateRange) {
      console.log(`날짜 범위: ${apiData.priceData.dateRange.start} ~ ${apiData.priceData.dateRange.end}`);
      console.log(`첫 5개 날짜: ${apiData.priceData.dateRange.first5.join(', ')}`);
      console.log(`마지막 5개 날짜: ${apiData.priceData.dateRange.last5.join(', ')}`);
    }
    
    console.log('\\n📝 Posts API 분석:');
    console.log(`성공: ${apiData.postsData.success}`);
    console.log(`총 포스트: ${apiData.postsData.total}개`);
    console.log(`로드된 포스트: ${apiData.postsData.count}개`);
    if (apiData.postsData.dateRange) {
      console.log(`날짜 범위: ${apiData.postsData.dateRange.start} ~ ${apiData.postsData.dateRange.end}`);
      console.log(`첫 5개 날짜: ${apiData.postsData.dateRange.first5.join(', ')}`);
      console.log(`마지막 5개 날짜: ${apiData.postsData.dateRange.last5.join(', ')}`);
    }
    
    console.log('\\n🎯 Sentiment API 분석:');
    console.log(`분석된 날짜: ${apiData.sentimentData.totalDates}개`);
    console.log(`분석된 언급: ${apiData.sentimentData.analyzedMentions}개`);
    if (apiData.sentimentData.dateRange) {
      console.log(`날짜 범위: ${apiData.sentimentData.dateRange.start} ~ ${apiData.sentimentData.dateRange.end}`);
    }
    
    // 3M 기간 계산 (2025-05-17 ~ 2025-08-17)
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    
    const expectedStart = threeMonthsAgo.toISOString().split('T')[0];
    const expectedEnd = today.toISOString().split('T')[0];
    
    console.log('\\n📅 예상 3M 범위:');
    console.log(`${expectedStart} ~ ${expectedEnd}`);
    
    // 범위 벗어남 확인
    if (apiData.priceData.dateRange) {
      const priceStart = new Date(apiData.priceData.dateRange.start);
      const expectedStartDate = new Date(expectedStart);
      
      if (priceStart < expectedStartDate) {
        console.log(`\\n❌ Price API 문제: 시작일이 3M 범위를 벗어남!`);
        console.log(`실제: ${apiData.priceData.dateRange.start}, 예상: ${expectedStart}`);
      } else {
        console.log(`\\n✅ Price API 날짜 범위 정상`);
      }
    }
    
  } catch (error) {
    console.error('❌ 디버깅 오류:', error);
  } finally {
    await browser.close();
  }
}

debugPriceApiResponse();