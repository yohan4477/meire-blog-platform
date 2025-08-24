import { test, expect } from '@playwright/test';

test.describe('메르님 한줄 요약 Feature Verification', () => {
  // 테스트 후 정리
  test.afterEach(async ({ page }, testInfo) => {
    if (!page.isClosed()) {
      await page.close();
      console.log('✅ 테스트 페이지 정리 완료');
    }
  });

  test('메르님 한줄 요약이 포스트 카드에 표시되는지 확인', async ({ page }) => {
    console.log('🧪 메르님 한줄 요약 테스트 시작');

    // 메르 페이지 방문
    await page.goto('http://localhost:3004/merry');
    
    // 페이지 로딩 완료 대기
    await page.waitForSelector('.grid', { timeout: 10000 });
    
    // 첫 번째 포스트 카드 선택
    const firstCard = page.locator('.grid > .group').first();
    await expect(firstCard).toBeVisible();
    
    // 카드 내용 확인
    const cardContent = firstCard.locator('p.text-muted-foreground');
    await expect(cardContent).toBeVisible();
    
    // 내용이 "..."가 아닌 실제 요약 내용인지 확인
    const contentText = await cardContent.textContent();
    console.log('📝 포스트 카드 내용:', contentText);
    
    // 내용이 비어있지 않고 "..."만 있는 것이 아님을 확인
    expect(contentText).toBeTruthy();
    expect(contentText?.trim()).not.toBe('...');
    expect(contentText?.length).toBeGreaterThan(10);
    
    console.log('✅ 메르님 한줄 요약 표시 확인 완료');
  });

  test('여러 포스트의 요약이 모두 로딩되는지 확인', async ({ page }) => {
    console.log('🧪 다중 포스트 요약 테스트 시작');

    await page.goto('http://localhost:3004/merry');
    await page.waitForSelector('.grid', { timeout: 10000 });
    
    // 모든 포스트 카드의 내용 확인
    const cards = page.locator('.grid > .group');
    const cardCount = await cards.count();
    console.log(`📊 로딩된 포스트 카드 수: ${cardCount}`);
    
    // 최소 3개 카드의 내용 확인
    const checkCount = Math.min(cardCount, 3);
    for (let i = 0; i < checkCount; i++) {
      const card = cards.nth(i);
      const content = card.locator('p.text-muted-foreground');
      const text = await content.textContent();
      
      console.log(`📝 카드 ${i + 1} 내용: ${text?.substring(0, 100)}...`);
      
      // 각 카드의 내용이 유의미한지 확인
      expect(text).toBeTruthy();
      expect(text?.trim()).not.toBe('...');
    }
    
    console.log('✅ 다중 포스트 요약 확인 완료');
  });

  test('API 데이터가 올바르게 로딩되는지 확인', async ({ page }) => {
    console.log('🔗 API 연동 테스트 시작');

    // API 응답 확인
    const apiResponse = await page.request.get('http://localhost:3004/api/merry/posts?limit=10&offset=0');
    expect(apiResponse.status()).toBe(200);
    
    const apiData = await apiResponse.json();
    console.log('📊 API 응답 데이터:', {
      success: apiData.success,
      dataLength: apiData.data?.length,
      firstPostTitle: apiData.data?.[0]?.title?.substring(0, 50)
    });
    
    // API 응답이 올바른 구조인지 확인
    expect(apiData.success).toBe(true);
    expect(apiData.data).toBeDefined();
    expect(Array.isArray(apiData.data)).toBe(true);
    expect(apiData.data.length).toBeGreaterThan(0);
    
    // 첫 번째 포스트에 content 필드가 있는지 확인
    const firstPost = apiData.data[0];
    expect(firstPost.content).toBeDefined();
    expect(typeof firstPost.content).toBe('string');
    expect(firstPost.content.length).toBeGreaterThan(0);
    
    console.log('✅ API 데이터 확인 완료');
  });
});