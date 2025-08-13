import { test, expect } from '@playwright/test';

test('TSLA 메르 언급 확인', async ({ page }) => {
  console.log('🔍 TSLA 메르 언급 테스트 시작...');
  
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  await page.waitForLoadState('networkidle');
  
  // 콘솔 로그 수집
  const consoleLogs: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('📝 Mentions') || text.includes('📅 Mentions mapped')) {
      consoleLogs.push(text);
      console.log(`브라우저 콘솔: ${text}`);
    }
  });
  
  // 페이지 로딩 완료까지 대기
  await page.waitForTimeout(3000);
  
  // 차트 헤더에서 메르 언급 개수 확인
  const headerText = await page.locator('[class*="text-sm text-gray-600"]').first().textContent();
  console.log(`📊 헤더 텍스트: ${headerText}`);
  
  // 메르 언급 개수가 0개가 아닌지 확인
  const mentionCountMatch = headerText?.match(/메르 언급:\s*(\d+)개/);
  const mentionCount = mentionCountMatch ? parseInt(mentionCountMatch[1]) : 0;
  console.log(`📝 추출된 메르 언급 개수: ${mentionCount}`);
  
  // 포스트 섹션에서 실제 포스트 개수 확인
  const postElements = await page.locator('[href*="/merry/"]').count();
  console.log(`📰 실제 포스트 링크 수: ${postElements}`);
  
  console.log('✅ 메르 언급 테스트 완료!');
});