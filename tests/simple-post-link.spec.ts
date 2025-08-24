import { test, expect } from '@playwright/test';

test.describe('간단한 포스트 링크 테스트', () => {
  test('포스트 링크 클릭 동작 확인', async ({ page }) => {
    // 메리 페이지로 이동
    await page.goto('http://localhost:3004/merry');
    await page.waitForLoadState('networkidle');
    
    // 페이지가 제대로 로드되었는지 확인
    await expect(page.locator('h1')).toContainText('우리형 메르');
    
    // 첫 번째 포스트 링크 찾기
    const firstPostLink = page.locator('a[href*="/merry/posts/"]').first();
    await expect(firstPostLink).toBeVisible();
    
    // 링크의 href 값 출력
    const href = await firstPostLink.getAttribute('href');
    console.log('🔗 클릭할 링크:', href);
    
    // 포스트 제목 출력
    const title = await firstPostLink.textContent();
    console.log('📝 포스트 제목:', title);
    
    // 현재 URL 확인
    console.log('📍 클릭 전 URL:', page.url());
    
    // 링크 클릭
    await firstPostLink.click();
    
    // 잠시 대기 후 URL 확인
    await page.waitForTimeout(3000);
    console.log('📍 클릭 후 URL:', page.url());
    
    // 포스트 상세 페이지가 로딩되었는지 확인
    if (page.url().includes('/merry/posts/')) {
      console.log('✅ 포스트 상세 페이지로 이동 성공');
      
      // 상세 페이지의 제목이 있는지 확인
      const detailTitle = await page.locator('h1').textContent();
      console.log('📋 상세 페이지 제목:', detailTitle);
    } else {
      console.log('❌ 포스트 상세 페이지로 이동 실패');
      
      // 현재 페이지의 내용 확인
      const currentTitle = await page.locator('h1').textContent();
      console.log('🔍 현재 페이지 제목:', currentTitle);
    }
  });
});