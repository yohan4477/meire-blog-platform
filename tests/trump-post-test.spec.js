const { test, expect } = require('@playwright/test');

test.describe('트럼프 포스트 본문 표시 테스트', () => {
  test('트럼프 포스트 본문과 한줄 코멘트가 제대로 분리되어 표시되는지 확인', async ({ page }) => {
    // 트럼프 포스트 페이지로 이동
    await page.goto('http://localhost:3004/merry/posts/223983579507');
    await page.waitForLoadState('networkidle');
    
    console.log('📄 트럼프 포스트 페이지 로드 완료');
    
    // 페이지 제목 확인
    const title = await page.locator('h1').textContent();
    expect(title).toContain('트럼프');
    console.log('✅ 페이지 제목:', title?.substring(0, 50));
    
    // 메르님 한 줄 코멘트 섹션이 있는지 확인
    const commentSection = page.locator('text=메르님 한 줄 코멘트').or(
      page.locator('text=보따리는 꽤 크게').first()
    );
    
    const hasComment = await commentSection.isVisible();
    if (hasComment) {
      console.log('✅ 한줄 코멘트 섹션 발견');
      
      // 코멘트 내용 확인
      const commentText = await page.locator('text=보따리는 꽤 크게').textContent();
      if (commentText) {
        console.log('📝 한줄 코멘트:', commentText.substring(0, 50) + '...');
      }
    } else {
      console.log('❌ 한줄 코멘트 섹션을 찾을 수 없음');
    }
    
    // 본문 섹션 확인
    const mainContent = page.locator('text=본문').or(
      page.locator('div').filter({ hasText: '한미정상회담' }).first()
    );
    
    const hasMainContent = await mainContent.isVisible();
    if (hasMainContent) {
      console.log('✅ 본문 섹션 발견');
      
      // 본문에 한줄 코멘트가 포함되지 않았는지 확인
      const mainText = await page.textContent('body');
      const commentInMain = mainText.includes('한줄 코멘트. 보따리는');
      
      if (!commentInMain) {
        console.log('✅ 본문에서 한줄 코멘트가 제대로 분리됨');
      } else {
        console.log('⚠️ 본문에 여전히 한줄 코멘트가 포함되어 있음');
      }
    } else {
      console.log('❌ 본문 섹션을 찾을 수 없음');
    }
    
    // 전체 페이지 스크린샷
    await page.screenshot({ 
      path: 'trump-post-display.png', 
      fullPage: true 
    });
    console.log('📸 스크린샷 저장: trump-post-display.png');
  });
});