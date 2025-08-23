import { test, expect } from '@playwright/test';
import './setup/test-cleanup';

test('범례 요소 직접 검사 및 위치 분석', async ({ page }) => {
  console.log('🔍 범례 요소 직접 검사 시작');
  
  // Tesla 페이지로 이동
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  console.log('✅ Tesla 페이지 로드');
  
  // 페이지 완전 로딩 대기
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // 모든 텍스트 요소에서 '감정' 포함 요소 찾기
  const sentimentElements = await page.locator('text=/감정/').all();
  console.log(`📊 '감정' 포함 요소 ${sentimentElements.length}개 발견`);
  
  for (let i = 0; i < sentimentElements.length; i++) {
    const element = sentimentElements[i];
    const text = await element.textContent();
    const boundingBox = await element.boundingBox();
    const classList = await element.getAttribute('class');
    const parentHTML = await element.locator('..').innerHTML();
    
    console.log(`\n🎯 감정 요소 ${i + 1}:`);
    console.log(`  텍스트: "${text}"`);
    console.log(`  위치: x=${boundingBox?.x}, y=${boundingBox?.y}`);
    console.log(`  클래스: ${classList}`);
    console.log(`  부모 HTML: ${parentHTML.substring(0, 200)}...`);
  }
  
  // '긍정' 텍스트 포함 모든 요소 검사
  const positiveElements = await page.locator('text=/긍정/').all();
  console.log(`\n🟢 '긍정' 포함 요소 ${positiveElements.length}개 발견`);
  
  for (let i = 0; i < positiveElements.length; i++) {
    const element = positiveElements[i];
    const text = await element.textContent();
    const boundingBox = await element.boundingBox();
    const computedStyle = await element.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        textAlign: style.textAlign,
        justifyContent: style.justifyContent,
        display: style.display,
        position: style.position,
        left: style.left,
        right: style.right,
        margin: style.margin,
        padding: style.padding
      };
    });
    
    console.log(`\n🎯 긍정 요소 ${i + 1}:`);
    console.log(`  텍스트: "${text}"`);
    console.log(`  위치: x=${boundingBox?.x}, y=${boundingBox?.y}, width=${boundingBox?.width}`);
    console.log(`  스타일:`, computedStyle);
    
    // 부모 요소들도 확인
    const parent = element.locator('..');
    const parentStyle = await parent.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        textAlign: style.textAlign,
        justifyContent: style.justifyContent,
        display: style.display
      };
    });
    console.log(`  부모 스타일:`, parentStyle);
  }
  
  // 전체 페이지에서 범례 관련 모든 요소 스캔
  const legendElements = await page.locator('div:has-text("긍정"), span:has-text("긍정")').all();
  console.log(`\n📋 범례 관련 요소 ${legendElements.length}개 발견`);
  
  for (let i = 0; i < legendElements.length; i++) {
    const element = legendElements[i];
    const outerHTML = await element.evaluate(el => el.outerHTML);
    console.log(`\n📄 범례 요소 ${i + 1} HTML:`, outerHTML);
  }
  
  // 스크린샷 촬영
  await page.screenshot({ path: 'test-results/legend-inspect-result.png', fullPage: true });
  console.log('📸 스크린샷 저장: test-results/legend-inspect-result.png');
  
  console.log('🎯 범례 요소 검사 완료');
});