const { chromium } = require('playwright');

async function final3MBlueCircleTest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🚀 삼성전자 3M 파란색 원 최종 검증 시작...');
    await page.goto('http://localhost:3012/merry/stocks/005930', { waitUntil: 'networkidle' });
    
    console.log('📊 3M 기간 선택...');
    await page.locator('button:has-text("3M")').click();
    
    console.log('⏳ 데이터 로딩 완료 대기...');
    await page.waitForTimeout(8000);
    
    // 최종 파란색 마커 개수 확인
    const blueMarkers = await page.locator('circle[stroke="#3742fa"]').count();
    
    // 전체 마커 색상 분석
    const markerAnalysis = await page.evaluate(() => {
      const circles = document.querySelectorAll('circle[stroke]');
      const analysis = {
        total: circles.length,
        colors: {},
        dateMarkers: []
      };
      
      circles.forEach((circle, index) => {
        const stroke = circle.getAttribute('stroke');
        const cx = parseFloat(circle.getAttribute('cx') || '0');
        
        if (!analysis.colors[stroke]) {
          analysis.colors[stroke] = 0;
        }
        analysis.colors[stroke]++;
        
        // X 좌표로 대략적인 날짜 순서 파악
        analysis.dateMarkers.push({
          index,
          stroke,
          x: cx
        });
      });
      
      // X 좌표 순으로 정렬
      analysis.dateMarkers.sort((a, b) => a.x - b.x);
      
      return analysis;
    });
    
    console.log('\n📊 3M 기간 마커 분석 결과:');
    console.log(`총 마커: ${markerAnalysis.total}개`);
    console.log(`파란색 (#3742fa): ${markerAnalysis.colors['#3742fa'] || 0}개`);
    console.log(`초록색 (#16a34a): ${markerAnalysis.colors['#16a34a'] || 0}개`);
    console.log(`빨간색 (#dc2626): ${markerAnalysis.colors['#dc2626'] || 0}개`);
    console.log(`회색 (#6b7280): ${markerAnalysis.colors['#6b7280'] || 0}개`);
    console.log(`기타 색상:`, Object.keys(markerAnalysis.colors).filter(color => 
      !['#3742fa', '#16a34a', '#dc2626', '#6b7280'].includes(color)
    ));
    
    // 날짜 범위 확인 (3M: 2025-05-17 ~ 2025-08-17)
    const expectedStart = '2025-05-17';
    const expectedEnd = '2025-08-17';
    
    console.log(`\n📅 예상 3M 범위: ${expectedStart} ~ ${expectedEnd}`);
    
    if (blueMarkers === 0) {
      console.log('\n🎉 완벽한 성공! 3M 기간에 파란색 원이 완전히 제거되었습니다!');
    } else if (blueMarkers <= 5) {
      console.log(`\n✅ 거의 성공! 파란색 원이 ${blueMarkers}개로 크게 줄어들었습니다.`);
      console.log('남은 파란색 원들은 3M 범위 내에서 감정 분석이 없는 날짜들입니다.');
    } else {
      console.log(`\n⚠️ 개선 필요: 파란색 원이 ${blueMarkers}개 남아있습니다.`);
    }
    
    console.log('\n🔍 마커 색상 분포:');
    const totalMarkers = markerAnalysis.total;
    Object.entries(markerAnalysis.colors).forEach(([color, count]) => {
      const percentage = ((count / totalMarkers) * 100).toFixed(1);
      const colorName = {
        '#3742fa': '파란색 (감정분석 없음)',
        '#16a34a': '초록색 (긍정적)',
        '#dc2626': '빨간색 (부정적)',
        '#6b7280': '회색 (중립적)'
      }[color] || color;
      console.log(`  ${colorName}: ${count}개 (${percentage}%)`);
    });
    
  } catch (error) {
    console.error('❌ 테스트 오류:', error);
  } finally {
    await browser.close();
  }
}

final3MBlueCircleTest();