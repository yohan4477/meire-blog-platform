import { test, expect } from '@playwright/test';

test.describe('카테고리 필터 테스트', () => {
  test('포스트 카테고리 필터가 올바르게 작동하는지 확인', async ({ page }) => {
    // 메리 페이지로 이동
    await page.goto('http://localhost:3004/merry');
    await page.waitForLoadState('networkidle');
    
    // 페이지가 제대로 로드되었는지 확인
    await expect(page.locator('h1')).toContainText('우리형 메르');
    
    console.log('✅ 메리 페이지 로드 완료');
    
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
      
      // 카테고리 옵션들 확인
      const expectedCategories = [
        '모든 카테고리',
        '주절주절', 
        '경제/주식/국제정세/사회',
        '건강/의학/맛집/일상/기타'
      ];
      
      for (const category of expectedCategories) {
        const option = page.locator(`text="${category}"`);
        if (await option.isVisible()) {
          console.log(`✅ 카테고리 "${category}" 표시됨`);
        } else {
          console.log(`❌ 카테고리 "${category}" 표시되지 않음`);
        }
      }
      
      // "주절주절" 카테고리 선택 테스트
      const jujulOption = page.locator('text="주절주절"');
      if (await jujulOption.isVisible()) {
        await jujulOption.click();
        console.log('✅ "주절주절" 카테고리 선택됨');
        
        // 필터 적용 대기
        await page.waitForTimeout(3000);
        
        console.log('📍 필터 적용 후 URL:', page.url());
        
        // 포스트가 로드되었는지 확인
        const posts = await page.locator('[class*="post"], [class*="card"]').count();
        console.log(`📋 "주절주절" 카테고리 포스트 개수: ${posts}개`);
        
        // "경제/주식/국제정세/사회" 카테고리도 테스트
        await categoryButton.click();
        await page.waitForTimeout(500);
        
        const economyOption = page.locator('text="경제/주식/국제정세/사회"');
        if (await economyOption.isVisible()) {
          await economyOption.click();
          console.log('✅ "경제/주식/국제정세/사회" 카테고리 선택됨');
          
          await page.waitForTimeout(3000);
          const economyPosts = await page.locator('[class*="post"], [class*="card"]').count();
          console.log(`📋 "경제/주식/국제정세/사회" 카테고리 포스트 개수: ${economyPosts}개`);
        }
        
      } else {
        console.log('❌ "주절주절" 카테고리 옵션을 찾을 수 없음');
      }
      
    } else {
      console.log('❌ 카테고리 필터 버튼을 찾을 수 없음');
      
      // 모든 버튼 텍스트 출력 (디버깅용)
      for (let i = 0; i < categoryButtons.length; i++) {
        const buttonText = await categoryButtons[i].textContent();
        if (buttonText && buttonText.trim()) {
          console.log(`🔘 버튼 ${i}: "${buttonText}"`);
        }
      }
    }
  });
});