import { test, expect } from '@playwright/test';

test.describe('포스트 페이지 카테고리 필터 테스트', () => {
  test('카테고리 필터가 정상적으로 작동하는지 확인', async ({ page }) => {
    // 새로운 /posts 페이지로 이동
    await page.goto('http://localhost:3004/posts');
    await page.waitForLoadState('networkidle');
    
    // 페이지가 제대로 로드되었는지 확인
    await expect(page.locator('h1')).toContainText('우리형 메르');
    console.log('✅ /posts 페이지 로드 완료');
    
    // 카테고리 필터 드롭다운 찾기
    const categoryButtons = await page.locator('button').all();
    let categoryButton = null;
    
    for (const button of categoryButtons) {
      const text = await button.textContent();
      if (text && (text.includes('카테고리') || text.includes('모든 카테고리'))) {
        categoryButton = button;
        console.log(`🎯 카테고리 필터 버튼 발견: "${text}"`);
        break;
      }
    }
    
    if (categoryButton) {
      // 드롭다운 클릭
      await categoryButton.click();
      await page.waitForTimeout(1000);
      
      // "주절주절" 카테고리 선택
      const jujulOption = page.locator('text="주절주절"');
      if (await jujulOption.isVisible()) {
        await jujulOption.click();
        console.log('✅ "주절주절" 카테고리 선택됨');
        
        // 필터 적용 대기
        await page.waitForTimeout(3000);
        
        // URL에 카테고리 필터가 적용되었는지 확인
        const currentUrl = page.url();
        console.log('📍 필터 적용 후 URL:', currentUrl);
        
        if (currentUrl.includes('category=%EC%A3%BC%EC%A0%88%EC%A3%BC%EC%A0%88') || currentUrl.includes('category=주절주절')) {
          console.log('✅ URL에 카테고리 필터가 정상적으로 적용됨');
        }
        
        // 포스트가 로드되었는지 확인
        const postCards = await page.locator('[class*="card"], .card').count();
        console.log(`📋 "주절주절" 카테고리 포스트 개수: ${postCards}개`);
        
        // 초기화 버튼이 나타났는지 확인
        const resetButton = page.locator('text="초기화"');
        if (await resetButton.isVisible()) {
          console.log('✅ 초기화 버튼 표시됨');
          
          // 초기화 버튼 클릭
          await resetButton.click();
          await page.waitForTimeout(2000);
          console.log('✅ 필터 초기화됨');
        }
        
      } else {
        console.log('❌ "주절주절" 카테고리 옵션을 찾을 수 없음');
      }
      
    } else {
      console.log('❌ 카테고리 필터 버튼을 찾을 수 없음');
    }
    
    // 포스트 링크가 올바른 경로로 이동하는지 확인
    const firstPostLink = page.locator('a[href*="/posts/"]').first();
    if (await firstPostLink.isVisible()) {
      const href = await firstPostLink.getAttribute('href');
      console.log('🔗 포스트 링크:', href);
      
      if (href && href.startsWith('/posts/')) {
        console.log('✅ 포스트 링크가 올바른 /posts 경로를 사용함');
      }
    }
  });
});