import { test, expect } from '@playwright/test';

test.describe('필터 디버그 테스트', () => {
  test('페이지 구조 및 필터 요소 확인', async ({ page }) => {
    // 콘솔 로그 캡처
    page.on('console', msg => {
      console.log(`🖥️ Browser: ${msg.text()}`);
    });

    // 메리 페이지로 이동
    await page.goto('http://localhost:3004/merry');
    await page.waitForLoadState('networkidle');
    
    // 페이지가 제대로 로드되었는지 확인
    await expect(page.locator('h1')).toContainText('우리형 메르');
    
    // 필터 섹션 확인
    const filterSection = page.locator('[class*="filter"]', { hasText: '필터' }).first();
    if (await filterSection.isVisible()) {
      console.log('✅ 필터 섹션 발견됨');
    } else {
      console.log('❌ 필터 섹션을 찾을 수 없음');
    }
    
    // Select 컴포넌트들 찾기
    const selects = await page.locator('select, [role="combobox"], [data-testid*="select"]').all();
    console.log(`🔍 Select 컴포넌트 개수: ${selects.length}`);
    
    // 모든 button 요소 확인 (Select의 trigger가 button일 수 있음)
    const buttons = await page.locator('button').all();
    console.log(`🔘 Button 요소 개수: ${buttons.length}`);
    
    for (let i = 0; i < buttons.length; i++) {
      const buttonText = await buttons[i].textContent();
      if (buttonText && (buttonText.includes('기간') || buttonText.includes('종목') || buttonText.includes('전체'))) {
        console.log(`🎯 필터 관련 버튼 발견: "${buttonText}"`);
        
        // 클릭해서 옵션 확인
        try {
          await buttons[i].click();
          await page.waitForTimeout(500);
          
          const options = await page.locator('[role="option"]').allTextContents();
          console.log(`📋 옵션들: ${options.join(', ')}`);
          
          // ESC로 드롭다운 닫기
          await page.keyboard.press('Escape');
        } catch (error) {
          console.log(`⚠️ 버튼 클릭 실패: ${error.message}`);
        }
      }
    }
    
    // 5초 대기 후 다시 확인 (API 로딩 대기)
    await page.waitForTimeout(5000);
    console.log('⏰ 5초 후 재확인...');
    
    const buttonsAfter = await page.locator('button').all();
    for (let i = 0; i < buttonsAfter.length; i++) {
      const buttonText = await buttonsAfter[i].textContent();
      if (buttonText && (buttonText.includes('기간') || buttonText.includes('종목') || buttonText.includes('전체') || buttonText.includes('선택'))) {
        console.log(`🎯 5초 후 필터 관련 버튼: "${buttonText}"`);
      }
    }
  });
});