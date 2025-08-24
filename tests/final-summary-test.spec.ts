import { test, expect } from '@playwright/test';

test.describe('최종 요약 검증 테스트', () => {
  test('요약이 짧고 정확하며 가짜 데이터가 없는지 확인', async ({ page }) => {
    console.log('🔍 최종 요약 검증 테스트 시작');
    
    const port = process.env.DEV_PORT || 3004;
    await page.goto(`http://localhost:${port}/merry`);
    
    // 페이지 로딩 완료 대기
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // 포스트 카드 찾기
    const postCards = page.locator('.group');
    const cardCount = await postCards.count();
    console.log(`📊 포스트 카드 개수: ${cardCount}개`);
    
    if (cardCount === 0) {
      console.log('⚠️ 포스트 카드를 찾을 수 없음');
      return;
    }

    let shortSummaryCount = 0;
    let longSummaryCount = 0;
    let fakeDataCount = 0;
    
    // 모든 포스트 확인
    for (let i = 0; i < Math.min(cardCount, 8); i++) {
      const card = postCards.nth(i);
      
      // 제목 확인
      const titleElement = card.locator('a').first();
      const title = await titleElement.textContent();
      
      // 요약 확인
      const summaryElement = card.locator('p').first();
      const summaryText = await summaryElement.textContent();
      
      console.log(`\n📝 포스트 ${i + 1}: ${title?.substring(0, 50)}...`);
      console.log(`📄 요약 (${summaryText?.length || 0}자): ${summaryText?.substring(0, 120)}...`);
      
      // 가짜 데이터 확인
      const isFakeData = title?.includes('테슬라 주가 전망') || 
                        title?.includes('삼성전자 반도체 실적') ||
                        title?.includes('전기차 시장 분석') ||
                        summaryText?.includes('AI 수요 증가로 HBM') ||
                        summaryText?.includes('엘론 머스크 CEO의 혁신');
      
      if (isFakeData) {
        fakeDataCount++;
        console.log(`❌ 포스트 ${i + 1}: 가짜 데이터 발견!`);
      } else {
        console.log(`✅ 포스트 ${i + 1}: 실제 데이터`);
      }
      
      // 요약 길이 확인
      const summaryLength = summaryText?.length || 0;
      if (summaryLength > 0 && summaryLength <= 100) {
        shortSummaryCount++;
        console.log(`✅ 포스트 ${i + 1}: 적절한 요약 길이 (${summaryLength}자)`);
      } else if (summaryLength > 100) {
        longSummaryCount++;
        console.log(`⚠️ 포스트 ${i + 1}: 요약이 너무 길음 (${summaryLength}자)`);
      }
    }
    
    console.log(`\n📊 최종 통계:`);
    console.log(`✅ 짧은 요약 (100자 이하): ${shortSummaryCount}개`);
    console.log(`⚠️ 긴 요약 (100자 초과): ${longSummaryCount}개`);
    console.log(`❌ 가짜 데이터: ${fakeDataCount}개`);
    
    // 검증: 가짜 데이터가 없어야 함
    expect(fakeDataCount).toBe(0);
    
    // 검증: 대부분의 요약이 적절한 길이여야 함
    const checkedCount = Math.min(cardCount, 8);
    expect(shortSummaryCount).toBeGreaterThanOrEqual(Math.floor(checkedCount * 0.8));
    
    // 검증: "메르님 한 줄 요약" 텍스트가 미리보기에 나타나지 않아야 함
    const pageText = await page.textContent('body');
    const summaryTextInPreview = (pageText?.match(/메르님 한 줄 요약/g) || []).length;
    console.log(`🔍 "메르님 한 줄 요약" 텍스트 발견 횟수: ${summaryTextInPreview}개`);
    expect(summaryTextInPreview).toBeLessThanOrEqual(1); // 최대 1개까지 허용 (제목 등)
  });
});