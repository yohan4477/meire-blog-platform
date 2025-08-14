import { test, expect } from '@playwright/test';

/**
 * 차트 툴팁 안정성 테스트
 * 커서 이동 시 툴팁이 너무 쉽게 사라지는 문제 검증
 */

test.describe('차트 툴팁 안정성 테스트', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForSelector('.recharts-wrapper');
    await page.waitForTimeout(2000); // 차트 완전 로딩 대기
  });

  test('마커 호버 시 툴팁이 안정적으로 표시되는지 확인', async ({ page }) => {
    // 파란색 마커 찾기
    const blueMarkers = page.locator('circle[stroke="#2563eb"][fill="none"]');
    const markerCount = await blueMarkers.count();
    
    if (markerCount > 0) {
      const firstMarker = blueMarkers.first();
      
      // 마커 위치 정보 가져오기
      const markerBox = await firstMarker.boundingBox();
      if (!markerBox) return;
      
      const centerX = markerBox.x + markerBox.width / 2;
      const centerY = markerBox.y + markerBox.height / 2;
      
      // 마커 중앙으로 마우스 이동
      await page.mouse.move(centerX, centerY);
      await page.waitForTimeout(500);
      
      // 툴팁 표시 확인
      const tooltip = page.locator('text=메르의 언급');
      await expect(tooltip).toBeVisible({ timeout: 2000 });
      
      console.log(`✅ 툴팁이 마커 호버 시 정상 표시됨`);
    }
  });

  test('마커 근처에서 작은 마우스 움직임 시 툴팁 지속성 테스트', async ({ page }) => {
    const blueMarkers = page.locator('circle[stroke="#2563eb"][fill="none"]');
    const markerCount = await blueMarkers.count();
    
    if (markerCount > 0) {
      const firstMarker = blueMarkers.first();
      const markerBox = await firstMarker.boundingBox();
      if (!markerBox) return;
      
      const centerX = markerBox.x + markerBox.width / 2;
      const centerY = markerBox.y + markerBox.height / 2;
      
      // 마커 중앙으로 이동하여 툴팁 표시
      await page.mouse.move(centerX, centerY);
      await page.waitForTimeout(300);
      
      // 툴팁 표시 확인
      const tooltip = page.locator('text=메르의 언급');
      await expect(tooltip).toBeVisible();
      
      // 마커 근처에서 작은 움직임 (5픽셀씩)
      const movements = [
        { x: centerX + 2, y: centerY },
        { x: centerX - 2, y: centerY },
        { x: centerX, y: centerY + 2 },
        { x: centerX, y: centerY - 2 },
        { x: centerX + 1, y: centerY + 1 },
      ];
      
      for (const move of movements) {
        await page.mouse.move(move.x, move.y);
        await page.waitForTimeout(100);
        
        // 각 움직임 후에도 툴팁이 유지되는지 확인
        try {
          await expect(tooltip).toBeVisible({ timeout: 1000 });
          console.log(`✅ 작은 움직임 후에도 툴팁 유지: (${move.x}, ${move.y})`);
        } catch (error) {
          console.log(`❌ 툴팁 사라짐 at: (${move.x}, ${move.y})`);
          throw error;
        }
      }
    }
  });

  test('툴팁 표시 지속 시간 측정', async ({ page }) => {
    const blueMarkers = page.locator('circle[stroke="#2563eb"][fill="none"]');
    const markerCount = await blueMarkers.count();
    
    if (markerCount > 0) {
      const firstMarker = blueMarkers.first();
      const markerBox = await firstMarker.boundingBox();
      if (!markerBox) return;
      
      const centerX = markerBox.x + markerBox.width / 2;
      const centerY = markerBox.y + markerBox.height / 2;
      
      // 마커에 호버 시작
      const startTime = Date.now();
      await page.mouse.move(centerX, centerY);
      
      // 툴팁 표시까지 시간 측정
      const tooltip = page.locator('text=메르의 언급');
      await expect(tooltip).toBeVisible({ timeout: 2000 });
      const showTime = Date.now() - startTime;
      
      console.log(`📊 툴팁 표시 시간: ${showTime}ms`);
      expect(showTime).toBeLessThan(1000); // 1초 이내 표시
      
      // 마커에서 멀리 이동
      await page.mouse.move(centerX + 100, centerY + 100);
      
      // 툴팁 사라질 때까지 대기 및 시간 측정
      const hideStartTime = Date.now();
      await expect(tooltip).not.toBeVisible({ timeout: 3000 });
      const hideTime = Date.now() - hideStartTime;
      
      console.log(`📊 툴팁 숨김 시간: ${hideTime}ms`);
      expect(hideTime).toBeLessThan(2000); // 2초 이내 숨김
    }
  });

  test('마커 경계에서 마우스 움직임 테스트', async ({ page }) => {
    const blueMarkers = page.locator('circle[stroke="#2563eb"][fill="none"]');
    const markerCount = await blueMarkers.count();
    
    if (markerCount > 0) {
      const firstMarker = blueMarkers.first();
      const markerBox = await firstMarker.boundingBox();
      if (!markerBox) return;
      
      const centerX = markerBox.x + markerBox.width / 2;
      const centerY = markerBox.y + markerBox.height / 2;
      const radius = 8; // 마커 반지름 + 여유
      
      // 마커 중앙에서 시작
      await page.mouse.move(centerX, centerY);
      await page.waitForTimeout(300);
      
      const tooltip = page.locator('text=메르의 언급');
      await expect(tooltip).toBeVisible();
      
      // 마커 경계 주변 움직임 테스트
      const boundaryPoints = [
        { x: centerX + radius, y: centerY },     // 오른쪽
        { x: centerX - radius, y: centerY },     // 왼쪽  
        { x: centerX, y: centerY + radius },     // 아래
        { x: centerX, y: centerY - radius },     // 위
        { x: centerX + radius * 0.7, y: centerY + radius * 0.7 }, // 대각선
      ];
      
      for (let i = 0; i < boundaryPoints.length; i++) {
        const point = boundaryPoints[i];
        await page.mouse.move(point.x, point.y);
        await page.waitForTimeout(200);
        
        // 경계 지점에서도 툴팁 상태 확인
        const isVisible = await tooltip.isVisible();
        console.log(`📍 경계점 ${i + 1}: (${Math.round(point.x)}, ${Math.round(point.y)}) - 툴팁: ${isVisible ? '표시' : '숨김'}`);
      }
    }
  });

  test('연속적인 마커 호버 테스트', async ({ page }) => {
    const blueMarkers = page.locator('circle[stroke="#2563eb"][fill="none"]');
    const markerCount = await blueMarkers.count();
    
    if (markerCount >= 2) {
      // 처음 두 개 마커 테스트
      for (let i = 0; i < Math.min(2, markerCount); i++) {
        const marker = blueMarkers.nth(i);
        const markerBox = await marker.boundingBox();
        if (!markerBox) continue;
        
        const centerX = markerBox.x + markerBox.width / 2;
        const centerY = markerBox.y + markerBox.height / 2;
        
        // 마커로 이동
        await page.mouse.move(centerX, centerY);
        await page.waitForTimeout(500);
        
        // 툴팁 확인
        const tooltip = page.locator('text=메르의 언급');
        await expect(tooltip).toBeVisible({ timeout: 2000 });
        
        console.log(`✅ 마커 ${i + 1} 툴팁 정상 표시`);
        
        // 마커에서 벗어나기
        await page.mouse.move(centerX + 50, centerY + 50);
        await page.waitForTimeout(300);
      }
    }
  });
});