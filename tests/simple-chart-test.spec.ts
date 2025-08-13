import { test, expect } from '@playwright/test';

test('TSLA 차트 간단 검증', async ({ page }) => {
  console.log('🚀 TSLA 간단 차트 테스트 시작...');
  
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  await page.waitForLoadState('networkidle');
  
  // 콘솔 로그 캐치
  page.on('console', (msg) => {
    if (msg.text().includes('🔍') || msg.text().includes('Chart Data Debug') || msg.text().includes('Render condition')) {
      console.log(`브라우저 콘솔: ${msg.text()}`);
    }
  });
  
  // 5초 대기
  await page.waitForTimeout(5000);
  
  // 페이지 제목 확인
  const title = await page.locator('h1').textContent();
  console.log(`📊 페이지 제목: ${title}`);
  
  // 다양한 에러 메시지 확인
  const connectionError = await page.locator('text=Bloomberg Terminal 연결 오류').isVisible();
  const loadError = await page.locator('text=Bloomberg Terminal 차트를 불러올 수 없습니다').isVisible();
  const generalError = await page.locator('text=차트 오류').isVisible();
  
  console.log(`❌ 연결 에러: ${connectionError ? '있음' : '없음'}`);
  console.log(`❌ 로딩 에러: ${loadError ? '있음' : '없음'}`);
  console.log(`❌ 일반 에러: ${generalError ? '있음' : '없음'}`);
  
  // 로딩 메시지 확인
  const isLoading = await page.locator('text=Bloomberg Terminal 데이터 준비 중').isVisible();
  console.log(`⏳ 로딩 상태: ${isLoading ? '있음' : '없음'}`);
  
  // SVG 요소 개수
  const svgCount = await page.locator('svg').count();
  console.log(`🎯 SVG 요소 수: ${svgCount}`);
  
  // Recharts 컨테이너 확인
  const rechartCount = await page.locator('.recharts-wrapper').count();
  console.log(`📈 Recharts 컨테이너 수: ${rechartCount}`);
  
  // 메인 차트 SVG 확인
  if (rechartCount > 0) {
    const mainChart = await page.locator('.recharts-wrapper svg').first().isVisible();
    console.log(`📊 메인 차트 가시성: ${mainChart}`);
    
    if (mainChart) {
      // 차트 내부 요소들 확인
      const lines = await page.locator('.recharts-line, path[stroke]').count();
      console.log(`📈 차트 라인 수: ${lines}`);
      
      const texts = await page.locator('svg text').count();
      console.log(`📝 축 텍스트 수: ${texts}`);
      
      const circles = await page.locator('circle').count();
      console.log(`🔵 원형 요소 수: ${circles}`);
    }
  }
  
  console.log('✅ 간단 차트 테스트 완료!');
});