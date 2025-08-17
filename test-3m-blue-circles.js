const { chromium } = require('playwright');

async function test3MBlueCircles() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🚀 삼성전자 페이지로 이동...');
    await page.goto('http://localhost:3012/merry/stocks/005930', { waitUntil: 'networkidle' });
    
    console.log('⏳ 페이지 로딩 대기...');
    await page.waitForTimeout(3000);
    
    console.log('📊 3M 기간 선택...');
    // 3M 버튼 클릭
    const threeMButton = page.locator('button:has-text("3M")');
    await threeMButton.click();
    
    console.log('⏳ 차트 로딩 및 애니메이션 대기...');
    await page.waitForTimeout(5000);
    
    console.log('🔍 파란색 마커 검색 중...');
    
    // 파란색 마커 찾기 - 여러 가능한 파란색 값들
    const blueMarkers = await page.locator('circle[stroke="#3742fa"], circle[stroke="#2563eb"], circle[stroke="blue"], circle[stroke="#0000ff"]').count();
    
    console.log(`📊 파란색 마커 개수: ${blueMarkers}개`);
    
    // 모든 마커 개수 확인
    const allMarkers = await page.locator('circle[stroke]').count();
    console.log(`📊 전체 마커 개수: ${allMarkers}개`);
    
    // 색상별 마커 개수 확인
    const greenMarkers = await page.locator('circle[stroke="#16a34a"]').count(); // 긍정
    const redMarkers = await page.locator('circle[stroke="#dc2626"]').count();   // 부정
    const grayMarkers = await page.locator('circle[stroke="#6b7280"]').count();  // 중립
    
    console.log(`🟢 긍정 마커 (초록): ${greenMarkers}개`);
    console.log(`🔴 부정 마커 (빨강): ${redMarkers}개`);
    console.log(`⚪ 중립 마커 (회색): ${grayMarkers}개`);
    console.log(`🔵 미분석 마커 (파랑): ${blueMarkers}개`);
    
    // 마커들의 실제 색상 값들 확인
    const markerColors = await page.evaluate(() => {
      const circles = document.querySelectorAll('circle[stroke]');
      const colors = [];
      circles.forEach(circle => {
        const stroke = circle.getAttribute('stroke');
        if (stroke && stroke !== '#ffffff') { // 흰색 테두리 제외
          colors.push(stroke);
        }
      });
      return [...new Set(colors)]; // 중복 제거
    });
    
    console.log('🎨 발견된 마커 색상들:', markerColors);
    
    if (blueMarkers > 0) {
      console.log('❌ 파란색 원이 아직 남아있습니다!');
      
      // 파란색 마커의 위치와 데이터 확인
      const blueMarkerData = await page.evaluate(() => {
        const blueCircles = document.querySelectorAll('circle[stroke="#3742fa"], circle[stroke="#2563eb"], circle[stroke="blue"], circle[stroke="#0000ff"]');
        const data = [];
        blueCircles.forEach((circle, index) => {
          data.push({
            index,
            x: circle.getAttribute('cx') || circle.getAttribute('x'),
            y: circle.getAttribute('cy') || circle.getAttribute('y'),
            stroke: circle.getAttribute('stroke'),
            strokeWidth: circle.getAttribute('stroke-width')
          });
        });
        return data;
      });
      
      console.log('🔵 파란색 마커 상세 정보:', blueMarkerData);
    } else {
      console.log('✅ 파란색 원이 모두 제거되었습니다!');
    }
    
    // 스크린샷 저장
    await page.screenshot({ 
      path: 'test-3m-markers.png',
      fullPage: true 
    });
    console.log('📸 스크린샷 저장: test-3m-markers.png');
    
  } catch (error) {
    console.error('❌ 테스트 오류:', error);
  } finally {
    await browser.close();
  }
}

test3MBlueCircles();