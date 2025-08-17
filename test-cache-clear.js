const { chromium } = require('playwright');

async function testWithCacheClear() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    // 캐시 완전 무효화
    ignoreHTTPSErrors: true,
    bypassCSP: true
  });
  
  const page = await context.newPage();
  
  try {
    console.log('🚀 브라우저 캐시 무효화 및 새 세션으로 삼성전자 접근...');
    
    // 먼저 캐시 클리어
    await context.clearCookies();
    await context.clearPermissions();
    
    console.log('🌐 삼성전자 페이지로 이동...');
    await page.goto('http://localhost:3012/merry/stocks/005930', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('⏳ 페이지 로딩 대기...');
    await page.waitForTimeout(3000);
    
    console.log('📊 3M 기간 선택...');
    const threeMButton = page.locator('button:has-text("3M")');
    await threeMButton.click();
    
    console.log('⏳ 차트 및 API 재로딩 대기...');
    await page.waitForTimeout(8000); // 충분한 대기
    
    console.log('🔍 파란색 마커 재검색...');
    
    // 모든 파란색 변형 체크
    const blueMarkers = await page.locator('circle[stroke="#3742fa"], circle[stroke="#2563eb"], circle[stroke="blue"], circle[stroke="#0000ff"]').count();
    const allMarkers = await page.locator('circle[stroke]').count();
    
    console.log(`📊 파란색 마커 개수: ${blueMarkers}개`);
    console.log(`📊 전체 마커 개수: ${allMarkers}개`);
    
    // 색상별 분석
    const greenMarkers = await page.locator('circle[stroke="#16a34a"]').count();
    const redMarkers = await page.locator('circle[stroke="#dc2626"]').count(); 
    const grayMarkers = await page.locator('circle[stroke="#6b7280"]').count();
    
    console.log(`🟢 긍정 마커: ${greenMarkers}개`);
    console.log(`🔴 부정 마커: ${redMarkers}개`);
    console.log(`⚪ 중립 마커: ${grayMarkers}개`);
    console.log(`🔵 미분석 마커: ${blueMarkers}개`);
    
    if (blueMarkers === 0) {
      console.log('✅ 성공! 파란색 원이 모두 제거되었습니다!');
    } else {
      console.log('❌ 여전히 파란색 원이 남아있습니다.');
      
      // 실제 API 데이터 확인
      const postsApiData = await page.evaluate(async () => {
        const response = await fetch('/api/merry/stocks/005930/posts?limit=100&offset=0&period=3mo');
        return await response.json();
      });
      
      const sentimentApiData = await page.evaluate(async () => {
        const response = await fetch('/api/merry/stocks/005930/sentiments?period=3mo');
        return await response.json();
      });
      
      console.log(`📊 Posts API - 3M 기간 총 포스트: ${postsApiData.data?.total || 0}개`);
      console.log(`📊 Sentiment API - 분석된 날짜: ${Object.keys(sentimentApiData.sentimentByDate || {}).length}개`);
    }
    
    // 스크린샷 저장
    await page.screenshot({ 
      path: 'test-cache-cleared-3m.png',
      fullPage: true 
    });
    console.log('📸 캐시 클리어 후 스크린샷 저장: test-cache-cleared-3m.png');
    
  } catch (error) {
    console.error('❌ 테스트 오류:', error);
  } finally {
    await browser.close();
  }
}

testWithCacheClear();