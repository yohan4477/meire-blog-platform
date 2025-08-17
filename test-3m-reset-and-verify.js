const { chromium } = require('playwright');

async function test3MResetAndVerify() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // 콘솔 로그 모니터링 (새로운 날짜 필터링 로그 포함)
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🔧 Date filter') || 
        text.includes('🔧 Filtered prices') ||
        text.includes('🔧 Date range') ||
        text.includes('⚠️ No sentiment found') ||
        text.includes('🎨 Processing marker')) {
      console.log('🖥️', text);
    }
  });
  
  try {
    console.log('🚀 삼성전자 페이지로 이동...');
    await page.goto('http://localhost:3012/merry/stocks/005930', { waitUntil: 'networkidle' });
    
    console.log('⏳ 초기 로딩 대기...');
    await page.waitForTimeout(2000);
    
    console.log('🔄 페이지 새로고침으로 수정된 코드 적용...');
    await page.reload({ waitUntil: 'networkidle' });
    
    console.log('📊 3M 기간 선택...');
    await page.locator('button:has-text("3M")').click();
    
    console.log('⏳ 새로운 필터링 로직 적용 대기...');
    await page.waitForTimeout(10000);
    
    // 파란색 마커 최종 개수 확인
    const blueMarkers = await page.locator('circle[stroke="#3742fa"]').count();
    console.log(`\n🔵 파란색 마커 개수: ${blueMarkers}개`);
    
    if (blueMarkers === 0) {
      console.log('🎉 성공! 파란색 원이 모두 제거되었습니다!');
    } else {
      console.log('❌ 아직 파란색 원이 남아있습니다.');
      
      // 실제 마커들의 위치와 색상 분석
      const markerAnalysis = await page.evaluate(() => {
        const circles = document.querySelectorAll('circle[stroke]');
        const analysis = {
          total: circles.length,
          colors: {}
        };
        
        circles.forEach(circle => {
          const stroke = circle.getAttribute('stroke');
          if (!analysis.colors[stroke]) {
            analysis.colors[stroke] = 0;
          }
          analysis.colors[stroke]++;
        });
        
        return analysis;
      });
      
      console.log('📊 마커 색상 분석:', markerAnalysis);
    }
    
  } catch (error) {
    console.error('❌ 테스트 오류:', error);
  } finally {
    await browser.close();
  }
}

test3MResetAndVerify();