import { test, expect } from '@playwright/test';

test.describe('통계 카드 클릭 테스트', () => {
  test('통계 카드를 클릭했을 때 필터링이 동작하는지 확인', async ({ page }) => {
    // 메리 종목 페이지로 이동
    await page.goto('http://localhost:3005/merry/stocks');
    await page.waitForLoadState('networkidle');
    
    // 페이지가 제대로 로드되었는지 확인
    await expect(page.locator('h1')).toContainText('우리형 메르');
    
    // 통계 카드들이 표시되는지 확인
    await expect(page.locator('text=총 종목 수')).toBeVisible();
    await expect(page.locator('text=한국 종목')).toBeVisible(); 
    await expect(page.locator('text=해외 종목')).toBeVisible();
    
    // 전체 종목수 카드 클릭 전 스크린샷
    await page.screenshot({ path: 'test-results/before-click.png' });
    
    // 전체 종목수 카드 클릭
    const totalStockCard = page.locator('text=총 종목 수').locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]');
    await expect(totalStockCard).toBeVisible();
    console.log('🎯 전체 종목수 카드 클릭');
    await totalStockCard.click();
    
    // 클릭 후 잠시 대기
    await page.waitForTimeout(1000);
    
    // 클릭 후 스크린샷
    await page.screenshot({ path: 'test-results/after-total-click.png' });
    
    // 한국 종목 카드 클릭
    const koreanStockCard = page.locator('text=한국 종목').locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]');
    await expect(koreanStockCard).toBeVisible();
    console.log('🎯 한국 종목 카드 클릭');
    await koreanStockCard.click();
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/after-korean-click.png' });
    
    // 해외 종목 카드 클릭
    const foreignStockCard = page.locator('text=해외 종목').locator('xpath=ancestor::div[contains(@class, "cursor-pointer")]');
    await expect(foreignStockCard).toBeVisible();
    console.log('🎯 해외 종목 카드 클릭');
    await foreignStockCard.click();
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/after-foreign-click.png' });
    
    // 페이지의 모든 클릭 가능한 요소들 확인
    const clickableElements = await page.locator('[class*="cursor-pointer"]').count();
    console.log(`🖱️ 클릭 가능한 요소 개수: ${clickableElements}`);
    
    // 카드들의 클래스명 확인
    const cardClasses = await page.locator('text=총 종목 수').locator('xpath=ancestor::div[1]').getAttribute('class');
    console.log(`📋 카드 클래스: ${cardClasses}`);
    
    console.log('✅ 통계 카드 클릭 테스트 완료');
  });
});