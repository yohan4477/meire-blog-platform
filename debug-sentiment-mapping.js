const { chromium } = require('playwright');

async function debugSentimentMapping() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // 콘솔 로그 캡처
  page.on('console', msg => {
    if (msg.text().includes('🚀 Sentiment result') || 
        msg.text().includes('📅') || 
        msg.text().includes('🎨 Processing marker') ||
        msg.text().includes('🔍 Valid sentiment')) {
      console.log('📋 Console:', msg.text());
    }
  });
  
  try {
    console.log('🚀 삼성전자 페이지로 이동...');
    await page.goto('http://localhost:3012/merry/stocks/005930', { waitUntil: 'networkidle' });
    
    console.log('⏳ 페이지 로딩 대기...');
    await page.waitForTimeout(3000);
    
    console.log('📊 3M 기간 선택...');
    await page.locator('button:has-text("3M")').click();
    
    console.log('⏳ 차트 및 감정 데이터 로딩 대기...');
    await page.waitForTimeout(8000); // 더 긴 대기 시간
    
    // API 응답 확인
    const sentimentApiResponse = await page.evaluate(async () => {
      const response = await fetch('/api/merry/stocks/005930/sentiments?period=3mo');
      return await response.json();
    });
    
    console.log('\n📊 감정 API 응답 요약:');
    console.log(`총 날짜: ${Object.keys(sentimentApiResponse.sentimentByDate).length}`);
    console.log(`분석된 포스트: ${sentimentApiResponse.summary.total}`);
    console.log('날짜별 포스트 수:');
    
    Object.entries(sentimentApiResponse.sentimentByDate).forEach(([date, data]) => {
      console.log(`  ${date}: ${data.postSentimentPairs?.length || 0}개 포스트`);
    });
    
    // 차트 데이터 확인
    const chartData = await page.evaluate(() => {
      // 차트 컴포넌트에서 priceData 확인
      const chartElement = document.querySelector('[data-testid="stock-chart"]') || document.querySelector('.recharts-wrapper');
      if (!chartElement) return null;
      
      // 마커들의 날짜 정보 추출
      const markers = document.querySelectorAll('circle[stroke]');
      const markerDates = [];
      markers.forEach(marker => {
        const x = marker.getAttribute('x') || marker.getAttribute('cx');
        if (x) {
          // x 좌표에서 날짜 추정 (정확한 방법은 아니지만 디버깅용)
          markerDates.push(x);
        }
      });
      
      return {
        totalMarkers: markers.length,
        markerPositions: markerDates
      };
    });
    
    console.log('\n📈 차트 데이터:');
    console.log(`표시된 마커 수: ${chartData?.totalMarkers || 0}`);
    
  } catch (error) {
    console.error('❌ 디버깅 오류:', error);
  } finally {
    await browser.close();
  }
}

debugSentimentMapping();