const { chromium } = require('playwright');

async function debugActualBrowserApi() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // 네트워크 요청 모니터링
  const apiRequests = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('/api/stock-price') && response.url().includes('005930')) {
      try {
        const responseData = await response.json();
        console.log('\\n🌐 실제 브라우저에서 받은 Stock Price API 응답:');
        console.log(`URL: ${response.url()}`);
        console.log(`Status: ${response.status()}`);
        console.log(`성공: ${responseData.success}`);
        console.log(`기간: ${responseData.period}`);
        console.log(`가격 데이터 개수: ${responseData.prices?.length || 0}개`);
        
        if (responseData.prices && responseData.prices.length > 0) {
          const dates = responseData.prices.map(p => p.date);
          console.log(`날짜 범위: ${dates[0]} ~ ${dates[dates.length - 1]}`);
          console.log(`첫 10개 날짜: ${dates.slice(0, 10).join(', ')}`);
          console.log(`마지막 10개 날짜: ${dates.slice(-10).join(', ')}`);
          
          // 3M 범위 밖 날짜 찾기
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];
          
          const outsideDates = dates.filter(date => date < threeMonthsAgoStr);
          if (outsideDates.length > 0) {
            console.log(`\\n❌ 3M 범위 밖 날짜 발견 (${outsideDates.length}개):`);
            console.log(outsideDates.slice(0, 10).join(', '));
          } else {
            console.log(`\\n✅ 모든 날짜가 3M 범위 내에 있음`);
          }
        }
      } catch (error) {
        console.log(`❌ 응답 파싱 오류: ${error.message}`);
      }
    }
  });
  
  try {
    console.log('🚀 삼성전자 페이지로 이동...');
    await page.goto('http://localhost:3012/merry/stocks/005930', { waitUntil: 'networkidle' });
    
    console.log('⏳ 페이지 로딩 대기...');
    await page.waitForTimeout(3000);
    
    console.log('📊 3M 기간 선택...');
    await page.locator('button:has-text("3M")').click();
    
    console.log('⏳ API 호출 및 응답 대기...');
    await page.waitForTimeout(8000);
    
    console.log('\\n📋 모든 API 요청 목록:');
    apiRequests.forEach((req, index) => {
      console.log(`${index + 1}. ${req.method} ${req.url}`);
    });
    
    // 차트에 표시된 실제 데이터 범위 확인
    const chartDataRange = await page.evaluate(() => {
      // Recharts에서 실제로 렌더링된 데이터 확인
      const circles = document.querySelectorAll('circle[stroke]');
      const markerPositions = [];
      
      circles.forEach(circle => {
        const cx = parseFloat(circle.getAttribute('cx') || circle.getAttribute('x') || '0');
        markerPositions.push(cx);
      });
      
      markerPositions.sort((a, b) => a - b);
      
      return {
        totalMarkers: circles.length,
        positionRange: markerPositions.length > 0 ? {
          min: markerPositions[0],
          max: markerPositions[markerPositions.length - 1]
        } : null
      };
    });
    
    console.log('\\n📊 차트 마커 분석:');
    console.log(`총 마커 개수: ${chartDataRange.totalMarkers}개`);
    if (chartDataRange.positionRange) {
      console.log(`X 좌표 범위: ${chartDataRange.positionRange.min} ~ ${chartDataRange.positionRange.max}`);
    }
    
  } catch (error) {
    console.error('❌ 디버깅 오류:', error);
  } finally {
    await browser.close();
  }
}

debugActualBrowserApi();