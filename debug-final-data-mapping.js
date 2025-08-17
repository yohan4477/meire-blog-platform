const { chromium } = require('playwright');

async function debugFinalDataMapping() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // 콘솔 로그 필터링 (중요한 것만)
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('📈 Price data range') || 
        text.includes('🎨 Processing marker') ||
        text.includes('⚠️ No sentiment found')) {
      console.log('🖥️', text);
    }
  });
  
  try {
    console.log('🚀 삼성전자 페이지로 이동...');
    await page.goto('http://localhost:3012/merry/stocks/005930', { waitUntil: 'networkidle' });
    
    console.log('⏳ 페이지 로딩 대기...');
    await page.waitForTimeout(3000);
    
    console.log('📊 3M 기간 선택...');
    await page.locator('button:has-text("3M")').click();
    
    console.log('⏳ 데이터 맵핑 과정 관찰...');
    await page.waitForTimeout(8000);
    
    // 파란색 마커 최종 확인
    const finalCheck = await page.locator('circle[stroke="#3742fa"]').count();
    console.log(`\\n🔵 최종 파란색 마커 개수: ${finalCheck}개`);
    
    if (finalCheck === 0) {
      console.log('🎉 성공! 파란색 원이 모두 제거되었습니다!');
    } else {
      console.log('❌ 아직 파란색 원이 남아있습니다.');
    }
    
  } catch (error) {
    console.error('❌ 디버깅 오류:', error);
  } finally {
    await browser.close();
  }
}

debugFinalDataMapping();