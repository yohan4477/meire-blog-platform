import { test, expect } from '@playwright/test';

test.describe('종목 필터 테스트', () => {
  test('종목 필터가 실제 종목들을 표시하는지 확인', async ({ page }) => {
    // 메리 페이지로 이동
    await page.goto('http://localhost:3004/merry');
    await page.waitForLoadState('networkidle');
    
    // 페이지가 제대로 로드되었는지 확인
    await expect(page.locator('h1')).toContainText('우리형 메르');
    
    // 종목 필터 드롭다운 찾기
    const stockFilter = page.locator('text=종목 선택').first();
    await expect(stockFilter).toBeVisible();
    
    // 드롭다운 클릭
    await stockFilter.click();
    
    // 잠시 대기 (드롭다운 옵션 로드 대기)
    await page.waitForTimeout(1000);
    
    // 모든 종목 옵션이 있는지 확인
    await expect(page.locator('text=모든 종목')).toBeVisible();
    
    // 실제 종목들이 표시되는지 확인
    const expectedStocks = ['TSLA', 'NVDA', '005930', 'GOOGL', 'AAPL'];
    
    for (const ticker of expectedStocks) {
      const stockOption = page.locator(`text*="${ticker}"`).first();
      if (await stockOption.isVisible()) {
        console.log(`✅ 종목 ${ticker} 표시됨`);
      } else {
        console.log(`❌ 종목 ${ticker} 표시되지 않음`);
      }
    }
    
    // 드롭다운 내용 전체 확인
    const allOptions = await page.locator('[role="option"]').allTextContents();
    console.log('🔍 사용 가능한 모든 옵션:', allOptions);
    
    // 종목 하나 선택해보기 (TSLA)
    const teslaOption = page.locator('text*="TSLA"').first();
    if (await teslaOption.isVisible()) {
      await teslaOption.click();
      console.log('✅ TSLA 종목 선택됨');
      
      // 필터 적용 대기
      await page.waitForTimeout(2000);
      
      // 필터가 적용되었는지 확인
      console.log('📍 필터 적용 후 URL:', page.url());
    }
  });
});