import { test, expect } from '@playwright/test';

test('범례 표시 간단 확인', async ({ page }) => {
  console.log('🧪 간단한 범례 테스트 시작');
  
  // Tesla 페이지로 이동
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  console.log('✅ Tesla 페이지 로드');
  
  // 페이지 완전 로딩 대기
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // 범례 텍스트들이 모두 표시되는지 확인
  const legendTexts = ['긍정', '부정', '중립', '메르 언급'];
  
  for (const text of legendTexts) {
    const element = page.locator('span', { hasText: text });
    const isVisible = await element.isVisible();
    console.log(`${text}: ${isVisible ? '✅ 표시됨' : '❌ 표시 안됨'}`);
  }
  
  // 색상 원들이 표시되는지 확인
  const colors = ['#16a34a', '#dc2626', '#6b7280', '#2563eb'];
  
  for (const color of colors) {
    const colorDiv = page.locator(`div[style*="border-color: ${color}"]`);
    const count = await colorDiv.count();
    console.log(`색상 ${color}: ${count}개 발견`);
  }
  
  // 스크린샷 촬영
  await page.screenshot({ path: 'test-results/legend-test-result.png', fullPage: true });
  console.log('📸 스크린샷 저장: test-results/legend-test-result.png');
  
  console.log('🎯 테스트 완료');
});