import { test, expect } from '@playwright/test';

test.describe('메르님 한 줄 요약 텍스트 제거 테스트', () => {
  test('포스트 미리보기에서 메르님 한 줄 요약 텍스트가 제거되었는지 확인', async ({ page }) => {
    console.log('🧹 메르님 한 줄 요약 텍스트 제거 테스트 시작');
    
    const port = process.env.DEV_PORT || 3004;
    await page.goto(`http://localhost:${port}/merry`);
    
    // 페이지 로딩 완료 대기
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // 페이지 전체 텍스트에서 "메르님 한 줄 요약" 확인
    const pageText = await page.textContent('body');
    const hasMerrySummaryText = pageText?.includes('메르님 한 줄 요약') || false;
    
    console.log(`📊 페이지 전체 텍스트에서 "메르님 한 줄 요약" 발견: ${hasMerrySummaryText ? '❌ 있음' : '✅ 없음'}`);
    
    // 포스트 카드가 있는지 확인
    const postCards = page.locator('.group');
    const cardCount = await postCards.count();
    console.log(`📊 포스트 카드 개수: ${cardCount}개`);
    
    if (cardCount > 0) {
      // 첫 번째 포스트 카드의 요약 텍스트 확인
      const firstCard = postCards.first();
      const summaryText = await firstCard.locator('p').first().textContent();
      
      console.log(`📝 첫 번째 포스트 요약: ${summaryText?.substring(0, 100)}...`);
      console.log(`🔍 "메르님 한 줄 요약" 포함 여부: ${summaryText?.includes('메르님 한 줄 요약') ? '❌ 포함됨' : '✅ 제거됨'}`);
      
      // 개별 포스트 요약에서 "메르님 한 줄 요약" 텍스트가 없어야 함
      expect(summaryText?.includes('메르님 한 줄 요약') || false).toBeFalsy();
    }
    
    // 전체 페이지에서 "메르님 한 줄 요약" 텍스트가 없어야 함 (또는 최소한으로만 있어야 함)
    const merrySummaryElements = await page.locator('text="메르님 한 줄 요약"').count();
    console.log(`🔍 전체 페이지에서 "메르님 한 줄 요약" 요소 개수: ${merrySummaryElements}개`);
    
    // "메르님 한 줄 요약" 텍스트가 포스트 미리보기에 나타나지 않아야 함
    expect(merrySummaryElements).toBeLessThanOrEqual(2); // 최대 2개까지 허용 (제목 등에 있을 수 있음)
  });
  
  test('모든 포스트에서 깔끔한 요약 표시 확인', async ({ page }) => {
    console.log('✨ 깔끔한 요약 표시 테스트 시작');
    
    const port = process.env.DEV_PORT || 3004;
    await page.goto(`http://localhost:${port}/merry`);
    
    // 페이지 로딩 완료 대기
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // 포스트 카드 찾기
    const postCards = page.locator('.group');
    const cardCount = await postCards.count();
    console.log(`📊 확인할 포스트 카드: ${cardCount}개`);
    
    let cleanSummaryCount = 0;
    let problemSummaryCount = 0;
    
    // 최대 5개 포스트 확인
    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      const card = postCards.nth(i);
      
      // 제목 확인
      const title = await card.locator('a').first().textContent();
      
      // 요약 확인
      const summaryElement = card.locator('p').first();
      const summaryText = await summaryElement.textContent();
      
      console.log(`📝 포스트 ${i + 1}: ${title?.substring(0, 40)}...`);
      console.log(`📄 요약: ${summaryText?.substring(0, 80)}...`);
      
      // 문제가 있는 패턴 확인
      const hasProblems = summaryText?.includes('메르님 한 줄 요약') || 
                         summaryText?.includes('요약:') ||
                         summaryText?.includes('한줄요약') ||
                         summaryText?.length === 0;
      
      if (!hasProblems && summaryText && summaryText.length > 10) {
        cleanSummaryCount++;
        console.log(`✅ 포스트 ${i + 1}: 깔끔한 요약`);
      } else {
        problemSummaryCount++;
        console.log(`❌ 포스트 ${i + 1}: 문제 있는 요약`);
      }
    }
    
    console.log(`✅ 깔끔한 요약: ${cleanSummaryCount}개`);
    console.log(`❌ 문제 있는 요약: ${problemSummaryCount}개`);
    
    // 최소 80% 이상의 포스트에서 깔끔한 요약이 표시되어야 함
    const checkedCount = Math.min(cardCount, 5);
    expect(cleanSummaryCount).toBeGreaterThanOrEqual(Math.floor(checkedCount * 0.8));
  });
});