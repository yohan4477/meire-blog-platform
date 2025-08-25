import { test, expect } from '@playwright/test';

test.describe('한국 주식 원화 표시 테스트', () => {
  test('한국 주식 종목 페이지에서 원화(₩)로 표시되는지 확인', async ({ page }) => {
    // 한국 주식 종목들 리스트 - 6자리 숫자인 종목들
    const koreanStocks = [
      { ticker: '005930', name: '삼성전자' },
      { ticker: '003550', name: 'LG' }
    ];

    for (const stock of koreanStocks) {
      console.log(`\n🧪 Testing Korean stock: ${stock.ticker} (${stock.name})`);
      
      // 종목 페이지로 이동
      await page.goto(`http://localhost:3004/merry/stocks/${stock.ticker}`);
      await page.waitForLoadState('networkidle');
      
      // 페이지 로딩 확인
      await expect(page.locator('h1')).toBeVisible();
      
      // 현재가 영역 찾기
      const priceSection = page.locator('[class*="text-2xl"]:has-text("₩")');
      
      // 원화 심볼(₩)이 있는지 확인
      const hasWonSymbol = await priceSection.count() > 0;
      
      if (hasWonSymbol) {
        console.log(`✅ ${stock.ticker}: 원화 심볼(₩) 표시 확인됨`);
        
        // 현재가 텍스트 추출
        const priceText = await priceSection.first().textContent();
        console.log(`💰 ${stock.ticker} 현재가: ${priceText}`);
        
        // 원화 심볼이 포함되어 있는지 확인
        expect(priceText).toContain('₩');
      } else {
        // 달러 심볼이 있는지 확인 (잘못 표시된 경우)
        const dollarSection = page.locator('[class*="text-2xl"]:has-text("$")');
        const hasDollarSymbol = await dollarSection.count() > 0;
        
        if (hasDollarSymbol) {
          const priceText = await dollarSection.first().textContent();
          console.log(`❌ ${stock.ticker}: 달러로 잘못 표시됨 - ${priceText}`);
          throw new Error(`한국 주식 ${stock.ticker}이 달러($)로 표시되고 있습니다: ${priceText}`);
        } else {
          console.log(`⚠️ ${stock.ticker}: 가격 정보 없음`);
        }
      }
      
      // 페이지 스크린샷 저장
      await page.screenshot({ 
        path: `test-results/korean-stock-${stock.ticker}-currency.png`,
        fullPage: false
      });
      
      console.log(`📸 Screenshot saved for ${stock.ticker}`);
    }
    
    console.log('\\n✅ 한국 주식 원화 표시 테스트 완료');
  });
  
  test('미국 주식은 달러($)로 표시되는지 확인', async ({ page }) => {
    const usStocks = [
      { ticker: 'TSLA', name: '테슬라' },
      { ticker: 'GOOGL', name: '구글' }
    ];

    for (const stock of usStocks) {
      console.log(`\n🧪 Testing US stock: ${stock.ticker} (${stock.name})`);
      
      // 종목 페이지로 이동
      await page.goto(`http://localhost:3004/merry/stocks/${stock.ticker}`);
      await page.waitForLoadState('networkidle');
      
      // 페이지 로딩 확인
      await expect(page.locator('h1')).toBeVisible();
      
      // 현재가 영역 찾기
      const priceSection = page.locator('[class*="text-2xl"]:has-text("$")');
      
      // 달러 심볼($)이 있는지 확인
      const hasDollarSymbol = await priceSection.count() > 0;
      
      if (hasDollarSymbol) {
        console.log(`✅ ${stock.ticker}: 달러 심볼($) 표시 확인됨`);
        
        // 현재가 텍스트 추출
        const priceText = await priceSection.first().textContent();
        console.log(`💰 ${stock.ticker} 현재가: ${priceText}`);
        
        // 달러 심볼이 포함되어 있는지 확인
        expect(priceText).toContain('$');
      } else {
        console.log(`⚠️ ${stock.ticker}: 가격 정보 없음`);
      }
      
      await page.screenshot({ 
        path: `test-results/us-stock-${stock.ticker}-currency.png`,
        fullPage: false
      });
    }
    
    console.log('\\n✅ 미국 주식 달러 표시 테스트 완료');
  });
});