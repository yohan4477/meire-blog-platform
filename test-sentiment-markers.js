const { chromium } = require('playwright');

async function testSentimentMarkers() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('🔍 TSM 감정 마커 색상 테스트 시작...');
  
  try {
    // 6M 기간으로 테스트 (새로 생성된 감정 데이터 확인)
    await page.goto('http://localhost:3016/merry/stocks/TSM?period=6M');
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(5000); // 데이터 로딩 완료 대기
    
    // 감정별 마커 색상 확인
    const greenMarkers = await page.locator('circle[stroke="#16a34a"]').count(); // 긍정 (초록)
    const redMarkers = await page.locator('circle[stroke="#dc2626"]').count();   // 부정 (빨강)
    const grayMarkers = await page.locator('circle[stroke="#6b7280"]').count();  // 중립 (회색)
    const blueMarkers = await page.locator('circle[stroke="#2563eb"]').count();  // 기본 (파랑)
    
    console.log(`🎨 감정 마커 색상 분포:`);
    console.log(`  🟢 긍정 (초록): ${greenMarkers}개 (예상: 1개)`);
    console.log(`  🔴 부정 (빨강): ${redMarkers}개 (예상: 2개)`);  
    console.log(`  ⚫ 중립 (회색): ${grayMarkers}개 (예상: 9개)`);
    console.log(`  🔵 기본 (파랑): ${blueMarkers}개 (mention only)`);
    
    const totalSentimentMarkers = greenMarkers + redMarkers + grayMarkers;
    console.log(`📊 총 감정 마커: ${totalSentimentMarkers}개 (예상: 12개)`);
    
    if (totalSentimentMarkers >= 10) {
      console.log('✅ 감정 분석 마커 색상 시스템 정상 작동!');
    } else {
      console.log('❌ 감정 분석 마커 색상 시스템 문제 있음');
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  } finally {
    await browser.close();
  }
}

testSentimentMarkers();