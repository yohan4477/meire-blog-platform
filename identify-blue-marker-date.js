const { chromium } = require('playwright');

async function identifyBlueMarkerDate() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🚀 1M 삼성전자 차트에서 파란색 마커 정확한 날짜 식별...');
    await page.goto('http://localhost:3012/merry/stocks/005930', { waitUntil: 'networkidle' });
    
    console.log('📊 1M 기간 선택...');
    await page.locator('button:has-text("1M")').click();
    
    console.log('⏳ 데이터 로딩 완료 대기...');
    await page.waitForTimeout(8000);
    
    // 파란색 마커의 정확한 위치와 날짜 확인
    const blueMarkerInfo = await page.evaluate(() => {
      // 모든 마커 수집
      const circles = document.querySelectorAll('circle[stroke]');
      const markers = [];
      
      circles.forEach((circle, index) => {
        const stroke = circle.getAttribute('stroke');
        const cx = parseFloat(circle.getAttribute('cx') || '0');
        const cy = parseFloat(circle.getAttribute('cy') || '0');
        
        markers.push({
          index,
          stroke,
          x: cx,
          y: cy,
          isBlue: stroke === '#3742fa'
        });
      });
      
      // X 좌표 순으로 정렬
      markers.sort((a, b) => a.x - b.x);
      
      // 파란색 마커들만 필터링
      const blueMarkers = markers.filter(m => m.isBlue);
      
      // 차트 데이터와 매핑하여 날짜 추정
      // 1M 기간은 대략 21개 데이터 포인트
      const totalMarkers = markers.length;
      const startDate = new Date('2025-07-17');
      const endDate = new Date('2025-08-14');
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      const estimatedDates = markers.map((marker, idx) => {
        const ratio = idx / (totalMarkers - 1);
        const estimatedDay = Math.floor(ratio * totalDays);
        const estimatedDate = new Date(startDate);
        estimatedDate.setDate(startDate.getDate() + estimatedDay);
        
        return {
          ...marker,
          estimatedDate: estimatedDate.toISOString().split('T')[0],
          ratio
        };
      });
      
      return {
        totalMarkers,
        blueMarkerCount: blueMarkers.length,
        allMarkers: estimatedDates,
        blueMarkers: estimatedDates.filter(m => m.isBlue),
        colorDistribution: markers.reduce((acc, marker) => {
          acc[marker.stroke] = (acc[marker.stroke] || 0) + 1;
          return acc;
        }, {})
      };
    });
    
    console.log('\n🎨 마커 분석 결과:');
    console.log(`총 마커: ${blueMarkerInfo.totalMarkers}개`);
    console.log(`파란색 마커: ${blueMarkerInfo.blueMarkerCount}개`);
    
    console.log('\n🎯 색상 분포:');
    Object.entries(blueMarkerInfo.colorDistribution).forEach(([color, count]) => {
      const colorName = {
        '#3742fa': '파란색 (분석중)',
        '#16a34a': '초록색 (긍정)',
        '#dc2626': '빨간색 (부정)',
        '#6b7280': '회색 (중립)'
      }[color] || color;
      console.log(`  ${colorName}: ${count}개`);
    });
    
    if (blueMarkerInfo.blueMarkers.length > 0) {
      console.log('\n🔵 파란색 마커 위치:');
      blueMarkerInfo.blueMarkers.forEach((marker, index) => {
        console.log(`  ${index + 1}. 추정 날짜: ${marker.estimatedDate}, X좌표: ${marker.x.toFixed(1)}, Y좌표: ${marker.y.toFixed(1)}`);
      });
    }
    
    console.log('\n📅 모든 마커 날짜 순서:');
    blueMarkerInfo.allMarkers.forEach((marker, index) => {
      const colorName = {
        '#3742fa': '🔵',
        '#16a34a': '🟢', 
        '#dc2626': '🔴',
        '#6b7280': '⚫'
      }[marker.stroke] || '❓';
      
      console.log(`  ${index + 1}. ${marker.estimatedDate} ${colorName} (X: ${marker.x.toFixed(1)})`);
    });
    
    // 8월 6일 주변 날짜 특별 확인
    const aug6Nearby = blueMarkerInfo.allMarkers.filter(m => 
      m.estimatedDate >= '2025-08-04' && m.estimatedDate <= '2025-08-08'
    );
    
    if (aug6Nearby.length > 0) {
      console.log('\n🎯 8월 6일 주변 마커들:');
      aug6Nearby.forEach(marker => {
        const colorName = {
          '#3742fa': '🔵 파란색',
          '#16a34a': '🟢 초록색', 
          '#dc2626': '🔴 빨간색',
          '#6b7280': '⚫ 회색'
        }[marker.stroke] || '❓ 알 수 없음';
        
        console.log(`  ${marker.estimatedDate}: ${colorName}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 분석 오류:', error);
  } finally {
    await browser.close();
  }
}

identifyBlueMarkerDate();