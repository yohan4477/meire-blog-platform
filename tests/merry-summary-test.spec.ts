import { test, expect } from '@playwright/test';

test.describe('메르 포스트 한줄 정리 테스트', () => {
  let openedPages: any[] = [];

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
    openedPages = [];
  });

  test('모든 메르 포스트에서 한줄 정리 표시 확인', async ({ page }) => {
    console.log('🧪 메르 포스트 한줄 정리 테스트 시작');
    
    const port = process.env.DEV_PORT || 3004;
    await page.goto(`http://localhost:${port}/merry`);
    
    // 페이지 로딩 대기
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // 포스트 카드들이 로딩될 때까지 대기 (.group 클래스를 가진 Card 컴포넌트)
    const postCards = page.locator('.group.hover\\:shadow-lg');
    await expect(postCards.first()).toBeVisible({ timeout: 15000 });
    
    const cardCount = await postCards.count();
    console.log(`📊 발견된 포스트 카드: ${cardCount}개`);
    
    if (cardCount === 0) {
      console.log('⚠️ 포스트 카드를 찾을 수 없음');
      return;
    }
    
    // 각 포스트 카드의 요약 내용 확인
    let summaryCount = 0;
    let emptySummaryCount = 0;
    
    for (let i = 0; i < Math.min(cardCount, 10); i++) {
      const card = postCards.nth(i);
      
      // 카드 제목 확인 (CardTitle 안의 Link)
      const titleElement = card.locator('a').first(); 
      const title = await titleElement.textContent();
      
      // 요약 텍스트 확인 (text-muted-foreground line-clamp-3 클래스)
      const summaryElement = card.locator('p.text-muted-foreground.mb-4.line-clamp-3');
      const summaryText = await summaryElement.textContent();
      
      console.log(`📝 포스트 ${i + 1}: ${title?.substring(0, 30)}...`);
      console.log(`📄 요약: ${summaryText?.substring(0, 100)}...`);
      
      if (summaryText && summaryText.trim().length > 10) {
        summaryCount++;
      } else {
        emptySummaryCount++;
        console.log(`⚠️ 포스트 ${i + 1}: 요약이 비어있거나 너무 짧음`);
      }
    }
    
    console.log(`✅ 요약이 있는 포스트: ${summaryCount}개`);
    console.log(`❌ 요약이 부족한 포스트: ${emptySummaryCount}개`);
    
    // 최소 80% 이상의 포스트에서 적절한 요약이 표시되어야 함
    expect(summaryCount).toBeGreaterThanOrEqual(Math.floor(Math.min(cardCount, 10) * 0.8));
  });
  
  test('새로 추가된 포스트들 요약 확인', async ({ page }) => {
    console.log('🆕 새로 추가된 포스트 요약 테스트');
    
    const port = process.env.DEV_PORT || 3004;
    await page.goto(`http://localhost:${port}/merry`);
    
    // 페이지 로딩 대기
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // 최신 포스트들 (상위 3개) 확인
    const postCards = page.locator('.group.hover\\:shadow-lg');
    await expect(postCards.first()).toBeVisible({ timeout: 15000 });
    
    const cardCount = await postCards.count();
    console.log(`📊 총 포스트 수: ${cardCount}개`);
    
    // 상위 3개 포스트 확인
    for (let i = 0; i < Math.min(3, cardCount); i++) {
      const card = postCards.nth(i);
      
      const titleElement = card.locator('a').first();
      const title = await titleElement.textContent();
      
      const summaryElement = card.locator('p.text-muted-foreground.mb-4.line-clamp-3');
      const summaryText = await summaryElement.textContent();
      
      console.log(`🆕 최신 포스트 ${i + 1}: ${title?.substring(0, 40)}...`);
      console.log(`📝 요약 길이: ${summaryText?.length || 0}자`);
      console.log(`📄 요약 내용: ${summaryText?.substring(0, 120)}...`);
      
      // 새로 추가된 포스트들도 적절한 요약을 가져야 함
      expect(summaryText?.trim().length || 0).toBeGreaterThan(20);
    }
  });
});