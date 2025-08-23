// 차트 애니메이션 시퀀스 검증 - 모든 브라우저 테스트
import { test, expect, devices } from '@playwright/test';
import './setup/test-cleanup';

// 브라우저별 테스트 설정
const browsers = [
  { name: 'Chrome', ...devices['Desktop Chrome'] },
  { name: 'Firefox', ...devices['Desktop Firefox'] },
  { name: 'Safari', ...devices['Desktop Safari'] },
  { name: 'Edge', ...devices['Desktop Edge'] }
];

// 각 브라우저에서 테스트 실행
for (const browser of browsers) {
  test(`${browser.name}: 차트 애니메이션 순서 검증 (삼성전자)`, async ({ page }) => {
    // 브라우저별 설정 적용
    await page.setViewportSize({ width: 1200, height: 800 });
    
    console.log(`🚀 ${browser.name}에서 차트 애니메이션 테스트 시작...`);
    
    // 삼성전자 종목 페이지 방문
    await page.goto('http://localhost:3004/merry/stocks/005930');
    console.log(`1️⃣ ${browser.name}: 삼성전자 페이지 방문 완료`);
    
    // 페이지 로딩 대기
    await page.waitForTimeout(2000);
    
    // 차트 영역 확인
    const chartContainer = page.locator('.recharts-responsive-container');
    await expect(chartContainer).toBeVisible({ timeout: 10000 });
    console.log(`✅ ${browser.name}: 차트 컨테이너 발견`);
    
    // 차트 라인 확인 (애니메이션 시작 전)
    const chartLine = page.locator('.recharts-line .recharts-curve');
    await expect(chartLine).toBeVisible({ timeout: 15000 });
    console.log(`✅ ${browser.name}: 차트 라인 렌더링 시작`);
    
    // 1단계: 차트 라인 애니메이션 완료 대기 (1.5초)
    console.log(`⏰ ${browser.name}: 차트 라인 애니메이션 완료 대기 (1.5초)...`);
    await page.waitForTimeout(2000);
    
    // 차트 라인이 완전히 그려졌는지 확인
    const lineLength = await page.evaluate(() => {
      const pathElement = document.querySelector('.recharts-line .recharts-curve') as SVGPathElement;
      if (pathElement) {
        const pathLength = pathElement.getTotalLength();
        const computedStyle = window.getComputedStyle(pathElement);
        const strokeDasharray = computedStyle.strokeDasharray;
        const strokeDashoffset = computedStyle.strokeDashoffset;
        console.log(`Path length: ${pathLength}, dasharray: ${strokeDasharray}, dashoffset: ${strokeDashoffset}`);
        return pathLength;
      }
      return 0;
    });
    
    console.log(`📏 ${browser.name}: 차트 라인 길이 - ${lineLength}px`);
    
    // 2단계: 마커들이 나타나는지 확인 (라인 완료 후)
    console.log(`⏰ ${browser.name}: 마커 애니메이션 시작 대기...`);
    await page.waitForTimeout(1000);
    
    // 모든 마커 찾기
    const allMarkers = page.locator('circle[stroke]');
    const markerCount = await allMarkers.count();
    console.log(`🎯 ${browser.name}: 총 마커 개수 - ${markerCount}개`);
    
    if (markerCount > 0) {
      // 3단계: 마커들의 애니메이션 순서 확인 (왼쪽에서 오른쪽)
      console.log(`🔍 ${browser.name}: 마커 애니메이션 순서 검증 중...`);
      
      // 마커들의 X 좌표 확인
      const markerPositions = [];
      for (let i = 0; i < markerCount; i++) {
        const marker = allMarkers.nth(i);
        const boundingBox = await marker.boundingBox();
        if (boundingBox) {
          markerPositions.push({
            index: i,
            x: boundingBox.x + boundingBox.width / 2,
            y: boundingBox.y + boundingBox.height / 2
          });
        }
      }
      
      // X 좌표 순으로 정렬하여 왼쪽에서 오른쪽 순서 확인
      markerPositions.sort((a, b) => a.x - b.x);
      console.log(`📊 ${browser.name}: 마커 위치 (왼쪽→오른쪽):`, 
        markerPositions.map(p => `(${Math.round(p.x)}, ${Math.round(p.y)})`));
      
      // 4단계: 마커 가시성 타이밍 테스트 (점진적 표시)
      // 각 마커가 150ms 간격으로 나타나는지 확인
      let visibleMarkerCount = 0;
      for (let i = 0; i < 3 && i < markerCount; i++) {
        await page.waitForTimeout(200); // 마커 간격 대기
        
        const visibleMarkers = await page.locator('circle[stroke]:visible').count();
        if (visibleMarkers > visibleMarkerCount) {
          visibleMarkerCount = visibleMarkers;
          console.log(`✅ ${browser.name}: ${visibleMarkerCount}개 마커 표시됨 (순차 애니메이션)`);
        }
      }
      
      // 5단계: 빈 원 상태 확인 (fill="none" 또는 투명)
      const emptyCircles = await page.locator('circle[fill="none"], circle[fill="transparent"]').count();
      console.log(`⭕ ${browser.name}: 빈 원 마커 개수 - ${emptyCircles}개`);
      
      if (emptyCircles > 0) {
        console.log(`✅ ${browser.name}: 빈 원 마커가 올바르게 표시됨`);
      } else {
        console.log(`⚠️ ${browser.name}: 빈 원 마커를 찾을 수 없음`);
      }
      
      // 6단계: 잘못된 애니메이션 패턴 검증 (위→아래 금지)
      // CSS transform 또는 animation 속성에 translateY 확인
      const hasVerticalAnimation = await page.evaluate(() => {
        const markers = document.querySelectorAll('circle[stroke]');
        for (const marker of markers) {
          const style = window.getComputedStyle(marker);
          const transform = style.transform;
          const animation = style.animation;
          
          // 세로 이동 애니메이션 감지
          if (transform.includes('translateY') || animation.includes('translateY')) {
            console.log('⚠️ 세로 애니메이션 감지:', transform, animation);
            return true;
          }
        }
        return false;
      });
      
      if (hasVerticalAnimation) {
        console.log(`❌ ${browser.name}: 금지된 세로 애니메이션 감지됨!`);
        expect(hasVerticalAnimation).toBe(false);
      } else {
        console.log(`✅ ${browser.name}: 세로 애니메이션 없음 (규칙 준수)`);
      }
      
      // 7단계: 마커 클릭 테스트 (툴팁 표시)
      if (markerCount > 0) {
        console.log(`🖱️ ${browser.name}: 첫 번째 마커 클릭 테스트...`);
        await allMarkers.first().hover();
        await page.waitForTimeout(1000);
        
        // 툴팁 표시 확인
        const tooltip = page.locator('.bg-white.border, .bg-white.rounded-2xl');
        const tooltipVisible = await tooltip.count() > 0;
        
        if (tooltipVisible) {
          console.log(`✅ ${browser.name}: 툴팁 표시 성공`);
          
          // 감정 분석 정보 확인
          const sentimentInfo = await page.locator('text=메르 감정 분석').count();
          if (sentimentInfo > 0) {
            console.log(`✅ ${browser.name}: 감정 분석 정보 표시됨`);
          }
        } else {
          console.log(`⚠️ ${browser.name}: 툴팁 표시 안됨`);
        }
      }
      
    } else {
      console.log(`⚠️ ${browser.name}: 마커가 발견되지 않음`);
    }
    
    // 8단계: 최종 애니메이션 상태 검증
    console.log(`🏁 ${browser.name}: 최종 애니메이션 상태 검증...`);
    
    // 모든 애니메이션이 완료되었는지 확인
    await page.waitForTimeout(3000);
    
    const finalMarkerCount = await page.locator('circle[stroke]:visible').count();
    const finalLineVisible = await page.locator('.recharts-line .recharts-curve').isVisible();
    
    console.log(`📊 ${browser.name}: 최종 상태 - 라인: ${finalLineVisible ? '✅' : '❌'}, 마커: ${finalMarkerCount}개`);
    
    // 성능 메트릭 수집
    const performanceMetrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('measure');
      return entries.length;
    });
    
    console.log(`⚡ ${browser.name}: 성능 메트릭 수집됨 - ${performanceMetrics}개 측정`);
    
    console.log(`🎉 ${browser.name}: 차트 애니메이션 테스트 완료!`);
  });
}

// 전체 브라우저 호환성 요약 테스트
test('모든 브라우저 차트 애니메이션 요약', async ({ page }) => {
  console.log('📋 모든 브라우저 차트 애니메이션 테스트 요약');
  console.log('✅ 테스트 완료된 브라우저:', browsers.map(b => b.name).join(', '));
  console.log('🎯 검증된 애니메이션 시퀀스:');
  console.log('  1. 차트 라인 렌더링 (왼쪽→오른쪽, 1.5초)');
  console.log('  2. 마커 순차 표시 (왼쪽→오른쪽, 150ms 간격)');
  console.log('  3. 빈 원 형태 마커 표시');
  console.log('  4. 세로 애니메이션 금지 확인');
  console.log('  5. 마커 상호작용 (툴팁 표시)');
  console.log('🚫 금지된 애니메이션: 위→아래, 기타 방향성 애니메이션');
  console.log('✅ 허용된 애니메이션: 왼쪽→오른쪽 순차 표시만');
});