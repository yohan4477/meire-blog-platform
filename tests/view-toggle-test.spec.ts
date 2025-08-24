import { test, expect } from '@playwright/test';

test.describe('카드/리스트 뷰 토글 테스트', () => {
  test('뷰 토글 기능이 정상 작동하는지 확인', async ({ page }) => {
    console.log('🔄 뷰 토글 테스트 시작');
    
    const port = process.env.DEV_PORT || 3004;
    await page.goto(`http://localhost:${port}/merry`);
    
    // 페이지 로딩 완료 대기
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // 뷰 토글 버튼들이 있는지 확인
    const cardButton = page.locator('button:has-text("카드")');
    const listButton = page.locator('button:has-text("리스트")');
    
    await expect(cardButton).toBeVisible();
    await expect(listButton).toBeVisible();
    
    // 기본값은 카드 뷰 (default variant)
    await expect(cardButton).toHaveClass(/default/);
    await expect(listButton).toHaveClass(/outline/);
    
    // 포스트가 로딩될 때까지 대기
    await page.waitForSelector('.grid', { timeout: 10000 });
    
    console.log('✅ 카드 뷰 기본 상태 확인');
    
    // 리스트 뷰로 전환
    await listButton.click();
    
    // 버튼 상태 변경 확인
    await expect(listButton).toHaveClass(/default/);
    await expect(cardButton).toHaveClass(/outline/);
    
    // 리스트 뷰 레이아웃으로 변경되었는지 확인
    await page.waitForSelector('.space-y-4', { timeout: 5000 });
    
    // 리스트 아이템들이 표시되는지 확인 (제목과 날짜)
    const listItems = page.locator('.space-y-4 > div');
    const itemCount = await listItems.count();
    console.log(`📋 리스트 뷰 아이템: ${itemCount}개`);
    
    expect(itemCount).toBeGreaterThan(0);
    
    // 첫 번째 리스트 아이템 구조 확인
    const firstItem = listItems.first();
    await expect(firstItem.locator('h3')).toBeVisible(); // 제목
    await expect(firstItem.locator('text=/\\d{4}\\. \\d{1,2}\\. \\d{1,2}/')).toBeVisible(); // 날짜
    
    console.log('✅ 리스트 뷰 전환 확인');
    
    // 다시 카드 뷰로 전환
    await cardButton.click();
    
    // 버튼 상태 다시 변경 확인
    await expect(cardButton).toHaveClass(/default/);
    await expect(listButton).toHaveClass(/outline/);
    
    // 카드 뷰 레이아웃으로 되돌아왔는지 확인
    await page.waitForSelector('.grid', { timeout: 5000 });
    
    console.log('✅ 카드 뷰로 복귀 확인');
    
    console.log('🎉 뷰 토글 테스트 완료!');
  });
  
  test('하드코딩된 필터링이 제거되었는지 확인', async ({ page }) => {
    console.log('🚫 하드코딩 필터링 제거 확인 테스트');
    
    const port = process.env.DEV_PORT || 3004;
    
    // TSLA 종목 필터 테스트
    const teslaResponse = await page.request.get(`http://localhost:${port}/api/merry/posts?ticker=TSLA&limit=5`);
    expect(teslaResponse.status()).toBe(200);
    
    const teslaData = await teslaResponse.json();
    expect(teslaData.success).toBe(true);
    expect(teslaData.data.length).toBeGreaterThan(0);
    
    console.log(`✅ TSLA 필터 작동: ${teslaData.data.length}개 포스트 발견`);
    
    // Claude 요약이 포함되어 있는지 확인
    const hasClaudeSummary = teslaData.data.some((post: any) => post.claudeSummary);
    if (hasClaudeSummary) {
      console.log('✅ Claude 요약이 API 응답에 포함됨');
    } else {
      console.log('⚠️ Claude 요약이 일부 포스트에 없음 (정상 - 분석되지 않은 포스트)');
    }
    
    console.log('🎉 API 테스트 완료!');
  });
});