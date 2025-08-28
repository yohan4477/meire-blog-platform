const { test, expect } = require('@playwright/test');

test.describe('매크로 캘린더 테스트', () => {
  let openedPages = []; // 테스트 중 열린 페이지들 추적

  test.beforeEach(async ({ page }) => {
    // 캘린더 페이지로 이동
    await page.goto('http://localhost:3004/merry?tab=calendar');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    // 🧹 테스트 중 열린 모든 페이지 정리
    for (const openedPage of openedPages) {
      try {
        if (!openedPage.isClosed()) {
          await openedPage.close();
          console.log('✅ 테스트 페이지 정리 완료');
        }
      } catch (error) {
        console.log('⚠️ 페이지 정리 중 오류:', error.message);
      }
    }
    openedPages = []; // 배열 초기화
  });

  test('캘린더가 정상적으로 로드되는지 확인', async ({ page }) => {
    // 캘린더 헤더 확인
    await expect(page.locator('text=매크로 캘린더')).toBeVisible();
    
    // 현재 월 표시 확인
    await expect(page.locator('text=/\\d{4}년 \\d{1,2}월/')).toBeVisible();
    
    // 요일 헤더 확인
    const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
    for (const day of dayHeaders) {
      await expect(page.locator(`text=${day}`)).toBeVisible();
    }
  });

  test('연속 이벤트가 제대로 표시되는지 확인', async ({ page }) => {
    // 9월로 이동해서 로쉬 하샤나 연속 이벤트 확인
    const nextButton = page.locator('button').filter({ hasText: '▷' }).or(page.getByRole('button', { name: /next/i }));
    
    // 9월까지 이동 (현재가 8월이라고 가정)
    for (let i = 0; i < 2; i++) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }
    
    // 2025년 9월 확인
    await expect(page.locator('text=2025년 9월')).toBeVisible();
    
    // 로쉬 하샤나 이벤트 확인 (9월 22-24일)
    const eventElements = page.locator('.bg-purple-500').filter({ hasText: /로쉬 하샤나/ });
    
    // 연속 이벤트가 표시되는지 확인
    const startEvent = page.locator('text=로쉬 하샤나 시작');
    const endEvent = page.locator('text=로쉬 하샤나 종료');
    
    await expect(startEvent.first()).toBeVisible();
    await expect(endEvent.first()).toBeVisible();
  });

  test('이벤트 범례가 표시되는지 확인', async ({ page }) => {
    // 범례 항목들 확인
    const legendItems = [
      'FOMC',
      '중앙은행', 
      '실적',
      '경제지표',
      '유대인 일정'
    ];
    
    for (const item of legendItems) {
      await expect(page.locator(`text=${item}`)).toBeVisible();
    }
  });

  test('월 변경 버튼이 작동하는지 확인', async ({ page }) => {
    // 현재 월 확인
    const currentMonth = await page.locator('h3').filter({ hasText: /\d{4}년 \d{1,2}월/ }).textContent();
    
    // 다음 월로 이동
    await page.locator('button').filter({ hasText: '▷' }).or(page.getByRole('button', { name: /next/i })).click();
    await page.waitForTimeout(500);
    
    // 월이 변경되었는지 확인
    const newMonth = await page.locator('h3').filter({ hasText: /\d{4}년 \d{1,2}월/ }).textContent();
    expect(newMonth).not.toBe(currentMonth);
    
    // 오늘 버튼으로 돌아가기
    await page.locator('text=오늘').click();
    await page.waitForTimeout(500);
  });

  test('연속 이벤트 스타일링이 적용되는지 확인', async ({ page }) => {
    // 9월로 이동
    const nextButton = page.locator('button').filter({ hasText: '▷' }).or(page.getByRole('button', { name: /next/i }));
    for (let i = 0; i < 2; i++) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }
    
    // 연속 이벤트 요소들의 스타일 확인
    const purpleEvents = page.locator('.bg-purple-500');
    const eventCount = await purpleEvents.count();
    
    // 유대인 일정 이벤트가 존재하는지 확인
    expect(eventCount).toBeGreaterThan(0);
    
    // 연속 이벤트의 마진 스타일이 적용되었는지 확인
    const firstEvent = purpleEvents.first();
    const eventStyle = await firstEvent.getAttribute('style');
    
    // 마진이나 패딩 스타일이 적용되었는지 확인
    expect(eventStyle).toBeTruthy();
  });
});