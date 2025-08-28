const { test, expect } = require('@playwright/test');

test.describe('캘린더 연속 이벤트 시각적 확인', () => {
  test('캘린더 연속 이벤트 스크린샷으로 확인', async ({ page }) => {
    // 캘린더 페이지로 이동
    await page.goto('http://localhost:3004/merry?tab=calendar');
    await page.waitForLoadState('networkidle');
    
    // 캘린더가 로드될 때까지 기다리기
    await expect(page.locator('text=매크로 캘린더')).toBeVisible();
    
    // 9월로 이동해서 연속 이벤트 확인
    console.log('📅 9월로 이동 중...');
    
    // 다음 버튼 찾기 (여러 방식으로 시도)
    const nextButtons = [
      page.locator('svg[class*="lucide-chevron-right"]').locator('..'),
      page.locator('button').filter({ has: page.locator('svg') }).nth(1),
      page.getByRole('button').nth(2)
    ];
    
    let nextButton = null;
    for (const btn of nextButtons) {
      try {
        await btn.waitFor({ timeout: 2000 });
        nextButton = btn;
        console.log('✅ 다음 버튼 찾음');
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (nextButton) {
      // 현재 월 확인
      const currentMonthText = await page.locator('h3').textContent();
      console.log('현재 월:', currentMonthText);
      
      // 9월이 될 때까지 클릭
      for (let i = 0; i < 12; i++) {
        const monthText = await page.locator('h3').textContent();
        if (monthText && monthText.includes('9월')) {
          console.log('✅ 9월 도달');
          break;
        }
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // 연속 이벤트 요소들 찾기
    const purpleEvents = page.locator('.bg-purple-500');
    const eventCount = await purpleEvents.count();
    console.log(`🟣 보라색 이벤트 개수: ${eventCount}`);
    
    // 각 이벤트의 스타일 정보 출력
    for (let i = 0; i < eventCount; i++) {
      const event = purpleEvents.nth(i);
      const text = await event.textContent();
      const style = await event.getAttribute('style');
      console.log(`이벤트 ${i + 1}: "${text}", 스타일: ${style}`);
    }
    
    // 전체 캘린더 스크린샷
    await page.screenshot({ 
      path: 'calendar-continuous-events.png', 
      fullPage: true 
    });
    console.log('📸 캘린더 스크린샷 저장: calendar-continuous-events.png');
    
    // 캘린더 영역만 스크린샷
    const calendarGrid = page.locator('.grid.grid-cols-7').last();
    await calendarGrid.screenshot({ 
      path: 'calendar-grid-only.png' 
    });
    console.log('📸 캘린더 그리드 스크린샷 저장: calendar-grid-only.png');
    
    // DOM 구조 분석
    const gridItems = page.locator('.grid.grid-cols-7 > div');
    const itemCount = await gridItems.count();
    console.log(`📊 캘린더 셀 개수: ${itemCount}`);
    
    // 연속 이벤트가 있는 셀들의 정보 출력
    for (let i = 0; i < itemCount; i++) {
      const cell = gridItems.nth(i);
      const hasEvent = await cell.locator('.bg-purple-500').count() > 0;
      if (hasEvent) {
        const dayText = await cell.locator('div').first().textContent();
        const eventElements = cell.locator('.bg-purple-500');
        const eventTexts = [];
        
        const eventCount = await eventElements.count();
        for (let j = 0; j < eventCount; j++) {
          const eventText = await eventElements.nth(j).textContent();
          eventTexts.push(eventText);
        }
        
        console.log(`📅 ${dayText}일: [${eventTexts.join(', ')}]`);
      }
    }
  });
  
  test('연속 이벤트 마진 및 패딩 값 확인', async ({ page }) => {
    await page.goto('http://localhost:3004/merry?tab=calendar');
    await page.waitForLoadState('networkidle');
    
    // 9월로 이동
    const nextButton = page.locator('svg[class*="lucide-chevron-right"]').locator('..').first();
    
    try {
      for (let i = 0; i < 12; i++) {
        const monthText = await page.locator('h3').textContent();
        if (monthText && monthText.includes('9월')) break;
        await nextButton.click();
        await page.waitForTimeout(300);
      }
    } catch (e) {
      console.log('월 이동 중 오류:', e.message);
    }
    
    // 연속 이벤트의 computed style 확인
    const purpleEvents = page.locator('.bg-purple-500');
    const eventCount = await purpleEvents.count();
    
    console.log('=== 연속 이벤트 스타일 분석 ===');
    
    for (let i = 0; i < eventCount; i++) {
      const event = purpleEvents.nth(i);
      const text = await event.textContent();
      
      // JavaScript로 computed style 가져오기
      const styles = await event.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          marginLeft: computed.marginLeft,
          marginRight: computed.marginRight,
          paddingLeft: computed.paddingLeft,
          paddingRight: computed.paddingRight,
          borderRadius: computed.borderRadius,
          position: computed.position,
          zIndex: computed.zIndex,
          width: computed.width,
          left: computed.left,
          right: computed.right
        };
      });
      
      console.log(`이벤트 "${text}":`, styles);
    }
  });
});