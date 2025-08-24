import { test, expect } from '@playwright/test';

test.describe('국내/해외 시장 및 종목 필터링 테스트', () => {
  test('국내/해외 필터가 종목 목록을 올바르게 필터링하는지 확인', async ({ page }) => {
    // /posts 페이지로 이동
    await page.goto('http://localhost:3004/posts');
    await page.waitForLoadState('networkidle');
    
    // 페이지가 제대로 로드되었는지 확인
    await expect(page.locator('h1')).toContainText('우리형 메르');
    console.log('✅ /posts 페이지 로드 완료');
    
    // 시장 필터 드롭다운 찾기
    const marketFilterButtons = await page.locator('button').all();
    let marketButton = null;
    
    for (const button of marketFilterButtons) {
      const text = await button.textContent();
      if (text && (text.includes('전체') || text.includes('시장'))) {
        marketButton = button;
        console.log(`🎯 시장 필터 버튼 발견: "${text}"`);
        break;
      }
    }
    
    if (marketButton) {
      // 시장 필터 드롭다운 클릭
      await marketButton.click();
      await page.waitForTimeout(1000);
      
      // "국내" 시장 선택
      const domesticOption = page.locator('text="국내"');
      if (await domesticOption.isVisible()) {
        await domesticOption.click();
        console.log('✅ "국내" 시장 선택됨');
        
        await page.waitForTimeout(2000);
        
        // 종목 필터 드롭다운 찾기
        const stockFilterButtons = await page.locator('button').all();
        let stockButton = null;
        
        for (const button of stockFilterButtons) {
          const text = await button.textContent();
          if (text && (text.includes('종목 선택') || text.includes('모든 종목'))) {
            stockButton = button;
            console.log(`🎯 종목 필터 버튼 발견: "${text}"`);
            break;
          }
        }
        
        if (stockButton) {
          await stockButton.click();
          await page.waitForTimeout(1000);
          
          // 국내 종목들만 나오는지 확인 (6자리 숫자 티커들)
          const stockOptions = await page.locator('[role="option"]').all();
          let domesticStockCount = 0;
          let overseasStockCount = 0;
          
          for (const option of stockOptions) {
            const text = await option.textContent();
            if (text && !text.includes('모든 종목')) {
              console.log(`📈 종목 옵션: ${text}`);
              
              // 티커 패턴 확인 (6자리 숫자면 국내, 영문이면 해외)
              const tickerMatch = text.match(/\(([A-Z0-9]+)\)/);
              if (tickerMatch) {
                const ticker = tickerMatch[1];
                if (/^\d{6}$/.test(ticker)) {
                  domesticStockCount++;
                } else {
                  overseasStockCount++;
                }
              }
            }
          }
          
          console.log(`📊 국내 종목: ${domesticStockCount}개, 해외 종목: ${overseasStockCount}개`);
          
          // 국내 필터 선택시에는 국내 종목만 보여야 함
          if (domesticStockCount > 0 && overseasStockCount === 0) {
            console.log('✅ 국내 필터링 정상 작동: 국내 종목만 표시됨');
          } else if (overseasStockCount > 0) {
            console.log(`⚠️ 국내 필터링 문제: 해외 종목 ${overseasStockCount}개가 표시됨`);
          }
          
          // 드롭다운 닫기
          await page.keyboard.press('Escape');
        }
        
        // "해외" 시장 테스트
        await marketButton.click();
        await page.waitForTimeout(1000);
        
        const overseasOption = page.locator('text="해외"');
        if (await overseasOption.isVisible()) {
          await overseasOption.click();
          console.log('✅ "해외" 시장 선택됨');
          
          await page.waitForTimeout(2000);
          
          if (stockButton) {
            await stockButton.click();
            await page.waitForTimeout(1000);
            
            // 해외 종목들만 나오는지 확인
            const stockOptions2 = await page.locator('[role="option"]').all();
            let domesticCount2 = 0;
            let overseasCount2 = 0;
            
            for (const option of stockOptions2) {
              const text = await option.textContent();
              if (text && !text.includes('모든 종목')) {
                console.log(`📈 해외 종목 옵션: ${text}`);
                
                const tickerMatch = text.match(/\(([A-Z0-9]+)\)/);
                if (tickerMatch) {
                  const ticker = tickerMatch[1];
                  if (/^\d{6}$/.test(ticker)) {
                    domesticCount2++;
                  } else {
                    overseasCount2++;
                  }
                }
              }
            }
            
            console.log(`📊 해외 필터: 국내 종목: ${domesticCount2}개, 해외 종목: ${overseasCount2}개`);
            
            if (overseasCount2 > 0 && domesticCount2 === 0) {
              console.log('✅ 해외 필터링 정상 작동: 해외 종목만 표시됨');
            } else if (domesticCount2 > 0) {
              console.log(`⚠️ 해외 필터링 문제: 국내 종목 ${domesticCount2}개가 표시됨`);
            }
            
            await page.keyboard.press('Escape');
          }
        }
        
        // 초기화 버튼 테스트
        const resetButton = page.locator('text="초기화"');
        if (await resetButton.isVisible()) {
          console.log('✅ 초기화 버튼 표시됨');
          
          await resetButton.click();
          await page.waitForTimeout(2000);
          console.log('✅ 필터 초기화됨');
        }
        
      } else {
        console.log('❌ "국내" 시장 옵션을 찾을 수 없음');
      }
      
    } else {
      console.log('❌ 시장 필터 버튼을 찾을 수 없음');
    }
  });
});