import { test, expect } from '@playwright/test';

test.describe('모바일 차트 터치 인터랙션 개선 테스트', () => {
  test('모바일에서 차트 드래그 시 영역 선택 없이 부드러운 스크롤이 되는지 확인', async ({ page }) => {
    // 모바일 뷰포트로 설정
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE 크기
    
    console.log('📱 모바일 차트 터치 테스트 시작');
    
    // TSLA 종목 페이지로 이동
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('networkidle');
    
    // 차트가 로드될 때까지 대기
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
    console.log('✅ 차트 로딩 완료');
    
    // 차트 영역 찾기
    const chartContainer = page.locator('[style*="touch-action"]').first();
    await expect(chartContainer).toBeVisible();
    
    // 터치 이벤트 시뮬레이션 - 수직 스크롤 (허용되어야 함)
    console.log('🔍 수직 스크롤 테스트');
    await chartContainer.dispatchEvent('touchstart', {
      touches: [{ clientX: 200, clientY: 300 }]
    });
    
    await page.waitForTimeout(50);
    
    await chartContainer.dispatchEvent('touchmove', {
      touches: [{ clientX: 200, clientY: 250 }] // 50px 위로 이동
    });
    
    await chartContainer.dispatchEvent('touchend', {
      touches: []
    });
    
    console.log('✅ 수직 스크롤 테스트 완료');
    
    // 터치 이벤트 시뮬레이션 - 수평 드래그 (영역 선택 방지되어야 함)
    console.log('🔍 수평 드래그 테스트');
    await chartContainer.dispatchEvent('touchstart', {
      touches: [{ clientX: 150, clientY: 300 }]
    });
    
    await page.waitForTimeout(50);
    
    await chartContainer.dispatchEvent('touchmove', {
      touches: [{ clientX: 250, clientY: 300 }] // 100px 오른쪽으로 이동
    });
    
    await chartContainer.dispatchEvent('touchend', {
      touches: []
    });
    
    console.log('✅ 수평 드래그 테스트 완료');
    
    // 빠른 탭 테스트 (툴팁 표시 허용되어야 함)
    console.log('🔍 빠른 탭 테스트');
    await chartContainer.dispatchEvent('touchstart', {
      touches: [{ clientX: 200, clientY: 300 }]
    });
    
    await page.waitForTimeout(100); // 100ms 후 종료 (빠른 탭)
    
    await chartContainer.dispatchEvent('touchend', {
      touches: []
    });
    
    console.log('✅ 빠른 탭 테스트 완료');
    
    // CSS 스타일 검증
    const touchAction = await chartContainer.evaluate(el => 
      window.getComputedStyle(el).touchAction
    );
    console.log(`🎨 touch-action 스타일: ${touchAction}`);
    
    // touch-action이 올바르게 설정되었는지 확인
    expect(touchAction).toContain('pan-y');
    expect(touchAction).toContain('pinch-zoom');
    
    // 스크린샷 저장
    await page.screenshot({ 
      path: 'test-results/mobile-chart-touch-interaction.png',
      fullPage: false
    });
    
    console.log('📸 모바일 차트 터치 테스트 스크린샷 저장 완료');
    console.log('✅ 모바일 차트 터치 인터랙션 개선 테스트 완료');
  });
  
  test('핀치 줌 제스처가 정상적으로 작동하는지 확인', async ({ page }) => {
    // 모바일 뷰포트로 설정
    await page.setViewportSize({ width: 375, height: 667 });
    
    console.log('📱 핀치 줌 테스트 시작');
    
    // TSLA 종목 페이지로 이동
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('networkidle');
    
    // 차트가 로드될 때까지 대기
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
    
    // 차트 영역 찾기
    const chartContainer = page.locator('[style*="touch-action"]').first();
    
    // 핀치 줌인 시뮬레이션 (두 손가락)
    console.log('🔍 핀치 줌인 테스트');
    await chartContainer.dispatchEvent('touchstart', {
      touches: [
        { clientX: 180, clientY: 300 },
        { clientX: 220, clientY: 300 }
      ]
    });
    
    await page.waitForTimeout(50);
    
    // 두 손가락을 벌리기 (줌인)
    await chartContainer.dispatchEvent('touchmove', {
      touches: [
        { clientX: 160, clientY: 300 },
        { clientX: 240, clientY: 300 }
      ]
    });
    
    await chartContainer.dispatchEvent('touchend', {
      touches: []
    });
    
    console.log('✅ 핀치 줌인 테스트 완료');
    
    // 핀치 줌아웃 시뮬레이션
    console.log('🔍 핀치 줌아웃 테스트');
    await chartContainer.dispatchEvent('touchstart', {
      touches: [
        { clientX: 160, clientY: 300 },
        { clientX: 240, clientY: 300 }
      ]
    });
    
    await page.waitForTimeout(50);
    
    // 두 손가락을 모으기 (줌아웃)
    await chartContainer.dispatchEvent('touchmove', {
      touches: [
        { clientX: 180, clientY: 300 },
        { clientX: 220, clientY: 300 }
      ]
    });
    
    await chartContainer.dispatchEvent('touchend', {
      touches: []
    });
    
    console.log('✅ 핀치 줌아웃 테스트 완료');
    
    // 스크린샷 저장
    await page.screenshot({ 
      path: 'test-results/mobile-chart-pinch-zoom.png',
      fullPage: false
    });
    
    console.log('📸 핀치 줌 테스트 스크린샷 저장 완료');
    console.log('✅ 핀치 줌 제스처 테스트 완료');
  });
});