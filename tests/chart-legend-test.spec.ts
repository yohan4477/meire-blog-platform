import { test, expect } from '@playwright/test';
import './setup/test-cleanup';

test('차트 범례 항상 중앙 표시 확인', async ({ page }) => {
  console.log('🧪 차트 범례 테스트 시작');
  
  // 여러 종목에서 테스트
  const tickers = ['TSLA', '005930', 'AAPL', 'NVDA'];
  
  for (const ticker of tickers) {
    console.log(`\n📊 ${ticker} 종목 테스트 중...`);
    
    // 종목 페이지로 이동
    await page.goto(`http://localhost:3004/merry/stocks/${ticker}`);
    console.log(`✅ ${ticker} 페이지 로드 완료`);
    
    // 차트가 로드될 때까지 대기
    await page.waitForSelector('[data-testid="chart-container"], .recharts-wrapper', { 
      timeout: 10000 
    });
    await page.waitForTimeout(2000); // 차트 완전 로딩 대기
    
    // 범례 컨테이너 확인
    const legendContainer = page.locator('div').filter({ 
      hasText: '긍정부정중립메르 언급' 
    }).first();
    
    // 범례가 존재하는지 확인
    await expect(legendContainer).toBeVisible();
    console.log(`✅ ${ticker}: 범례 컨테이너 표시됨`);
    
    // 중앙 정렬 확인 (text-center 클래스)
    const centerAlignedDiv = legendContainer.locator('div.text-center');
    await expect(centerAlignedDiv).toBeVisible();
    console.log(`✅ ${ticker}: 중앙 정렬 확인됨`);
    
    // 각 범례 항목 확인
    const legendItems = [
      { color: '#16a34a', text: '긍정' },
      { color: '#dc2626', text: '부정' },
      { color: '#6b7280', text: '중립' },
      { color: '#2563eb', text: '메르 언급' }
    ];
    
    for (const item of legendItems) {
      // 색상 원 확인
      const colorCircle = page.locator(`div[style*="border-color: ${item.color}"]`);
      await expect(colorCircle).toBeVisible();
      
      // 텍스트 라벨 확인
      const textLabel = page.locator('span', { hasText: item.text });
      await expect(textLabel).toBeVisible();
      
      console.log(`  ✅ ${item.text}: 색상(${item.color}) 및 텍스트 확인됨`);
    }
    
    // 다른 시간 범위로 전환해도 범례가 유지되는지 확인
    const timeRanges = ['1M', '3M', '6M', '1Y'];
    for (const timeRange of timeRanges) {
      const timeButton = page.locator('button', { hasText: timeRange });
      if (await timeButton.isVisible()) {
        await timeButton.click();
        await page.waitForTimeout(1000); // 차트 업데이트 대기
        
        // 범례가 여전히 표시되는지 확인
        await expect(legendContainer).toBeVisible();
        console.log(`  ✅ ${timeRange} 전환 후에도 범례 유지됨`);
      }
    }
    
    console.log(`🎯 ${ticker} 모든 테스트 통과!`);
  }
  
  console.log('\n🎉 모든 종목에서 범례가 항상 중앙에 표시됨을 확인!');
});

test('범례 표시 조건 독립성 확인', async ({ page }) => {
  console.log('🔍 범례 독립성 테스트 시작');
  
  // 감정 데이터가 적은 종목도 테스트 (예: 새로운 종목)
  const testTickers = ['TSLA', '267250']; // HD현대는 감정 데이터가 적을 수 있음
  
  for (const ticker of testTickers) {
    console.log(`\n📊 ${ticker} 독립성 테스트 중...`);
    
    await page.goto(`http://localhost:3004/merry/stocks/${ticker}`);
    await page.waitForSelector('.recharts-wrapper', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // 범례가 감정 데이터 유무와 관계없이 항상 표시되는지 확인
    const legendContainer = page.locator('div').filter({ 
      hasText: '긍정부정중립메르 언급' 
    }).first();
    
    await expect(legendContainer).toBeVisible();
    console.log(`✅ ${ticker}: 데이터 상관없이 범례 표시됨`);
    
    // 범례가 중앙에 있는지 확인
    const centerDiv = legendContainer.locator('div.text-center');
    await expect(centerDiv).toBeVisible();
    console.log(`✅ ${ticker}: 중앙 정렬 유지됨`);
  }
  
  console.log('🎯 범례가 데이터 조건과 독립적으로 항상 표시됨을 확인!');
});