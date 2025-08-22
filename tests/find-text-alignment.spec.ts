import { test, expect } from '@playwright/test';

test('해당 문구가 있는 요소의 정렬 확인', async ({ page }) => {
  console.log('🔍 특정 문구 요소 검사 시작');
  
  // Tesla 페이지로 이동
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  console.log('✅ Tesla 페이지 로드');
  
  // 페이지 완전 로딩 대기
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // "차트의 원을 클릭하면 메르의 분석과 관련 포스트 정보를 확인할 수 있습니다" 텍스트 찾기
  const targetText = page.locator('text=차트의 원을 클릭하면').first();
  
  if (await targetText.count() > 0) {
    console.log('🎯 목표 텍스트 발견!');
    
    const boundingBox = await targetText.boundingBox();
    const computedStyle = await targetText.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        textAlign: style.textAlign,
        justifyContent: style.justifyContent,
        display: style.display,
        position: style.position,
        left: style.left,
        right: style.right,
        margin: style.margin,
        padding: style.padding,
        width: style.width
      };
    });
    
    console.log(`📍 위치: x=${boundingBox?.x}, y=${boundingBox?.y}, width=${boundingBox?.width}`);
    console.log(`🎨 스타일:`, computedStyle);
    
    // 부모 요소들도 확인
    const parent = targetText.locator('..');
    const parentStyle = await parent.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        textAlign: style.textAlign,
        justifyContent: style.justifyContent,
        display: style.display,
        alignItems: style.alignItems
      };
    });
    console.log(`👨‍👩‍👧‍👦 부모 스타일:`, parentStyle);
    
    // 할아버지 요소도 확인
    const grandParent = parent.locator('..');
    const grandParentStyle = await grandParent.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        textAlign: style.textAlign,
        justifyContent: style.justifyContent,
        display: style.display,
        alignItems: style.alignItems
      };
    });
    console.log(`🧓 할아버지 스타일:`, grandParentStyle);
    
    // 해당 요소의 HTML도 출력
    const outerHTML = await targetText.evaluate(el => el.outerHTML);
    console.log(`📄 요소 HTML:`, outerHTML.substring(0, 300));
    
  } else {
    console.log('❌ 목표 텍스트를 찾을 수 없습니다');
    
    // 비슷한 텍스트들을 찾아보기
    const similarTexts = await page.getByText('클릭하면').all();
    console.log(`🔍 "클릭하면" 포함 텍스트 ${similarTexts.length}개 발견`);
    
    for (let i = 0; i < Math.min(similarTexts.length, 5); i++) {
      const text = await similarTexts[i].textContent();
      console.log(`  ${i + 1}: "${text}"`);
    }
  }
  
  // 스크린샷 촬영
  await page.screenshot({ path: 'test-results/text-alignment-check.png', fullPage: true });
  console.log('📸 스크린샷 저장: test-results/text-alignment-check.png');
  
  console.log('🎯 텍스트 정렬 검사 완료');
});