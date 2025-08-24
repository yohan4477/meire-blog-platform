import { test, expect } from '@playwright/test';

test.describe('메리 페이지 포스트 링크 테스트', () => {
  test('포스트 링크가 log_no로 제대로 작동하는지 확인', async ({ page }) => {
    // 메리 페이지로 이동
    await page.goto('http://localhost:3004/merry');
    
    // 페이지 로딩 대기
    await page.waitForLoadState('networkidle');
    
    // 제목 확인
    await expect(page.locator('h1')).toContainText('우리형 메르');
    
    // 첫 번째 포스트 링크 찾기
    const firstPostLink = page.locator('a[href*="/merry/posts/"]').first();
    await expect(firstPostLink).toBeVisible();
    
    // 링크 href 속성 확인 (log_no가 포함되어 있는지)
    const href = await firstPostLink.getAttribute('href');
    console.log('첫 번째 포스트 링크:', href);
    
    // href가 숫자로만 구성된 log_no를 포함하는지 확인
    expect(href).toMatch(/\/merry\/posts\/\d+/);
    
    // 포스트 제목 가져오기
    const postTitle = await firstPostLink.textContent();
    console.log('포스트 제목:', postTitle);
    
    // 첫 번째 포스트 클릭
    await firstPostLink.click();
    
    // 포스트 상세 페이지로 이동했는지 확인
    await page.waitForLoadState('networkidle');
    
    // URL이 올바른 log_no로 변경되었는지 확인
    expect(page.url()).toMatch(/\/merry\/posts\/\d+/);
    
    // 포스트 상세 페이지의 제목이 로딩되었는지 확인
    await expect(page.locator('h1')).toBeVisible();
    
    console.log('✅ 포스트 링크 테스트 성공: log_no 기반 라우팅이 정상적으로 작동');
  });
  
  test('여러 포스트 링크 테스트', async ({ page }) => {
    // 메리 페이지로 이동
    await page.goto('http://localhost:3004/merry');
    await page.waitForLoadState('networkidle');
    
    // 모든 포스트 링크 찾기
    const postLinks = page.locator('a[href*="/merry/posts/"]');
    const linkCount = await postLinks.count();
    
    console.log(`총 ${linkCount}개의 포스트 링크 발견`);
    expect(linkCount).toBeGreaterThan(0);
    
    // 처음 3개 링크의 href 확인
    for (let i = 0; i < Math.min(3, linkCount); i++) {
      const link = postLinks.nth(i);
      const href = await link.getAttribute('href');
      console.log(`링크 ${i + 1}: ${href}`);
      
      // log_no 형식인지 확인 (숫자로만 구성)
      expect(href).toMatch(/\/merry\/posts\/\d+/);
    }
    
    console.log('✅ 모든 포스트 링크가 log_no 형식으로 올바르게 설정됨');
  });
});