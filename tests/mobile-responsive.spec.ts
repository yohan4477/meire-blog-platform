import { test, expect } from '@playwright/test';

test.describe('모바일 반응형 테스트', () => {
  // 모바일 디바이스 설정
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE 크기
  });

  test('메인 페이지 모바일 반응형 확인', async ({ page }) => {
    await page.goto('http://localhost:3005');
    
    // 페이지 로딩 대기
    await page.waitForLoadState('networkidle');
    
    // 스크린샷 촬영 (전체 페이지)
    await page.screenshot({ 
      path: 'test-results/mobile-main-page.png',
      fullPage: true 
    });
    
    // 제목이 화면에 맞게 표시되는지 확인
    const title = page.locator('h1').first();
    await expect(title).toBeVisible();
    
    // 플랫폼 설명이 제대로 표시되는지 확인
    const description = page.locator('text=요르가 말아주는 주식 분석 플랫폼');
    await expect(description).toBeVisible();
    
    // 메르's Pick 섹션 확인
    const merryPick = page.locator('text=메르\'s Pick');
    await expect(merryPick).toBeVisible();
    
    // 버튼들이 제대로 표시되는지 확인
    const blogButton = page.locator('text=메르 블로그').first();
    const stockButton = page.locator('text=종목 분석').first();
    
    await expect(blogButton).toBeVisible();
    await expect(stockButton).toBeVisible();
    
    console.log('✅ 메인 페이지 모바일 반응형 테스트 완료');
  });

  test('메르\'s Pick 모바일 반응형 확인', async ({ page }) => {
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');
    
    // 메르's Pick 카드들 확인
    const stockCards = page.locator('[class*="group p-4 rounded-lg border"]');
    const cardCount = await stockCards.count();
    
    console.log(`📊 발견된 종목 카드 수: ${cardCount}`);
    
    if (cardCount > 0) {
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = stockCards.nth(i);
        await expect(card).toBeVisible();
        
        // 종목명이 보이는지 확인
        const stockName = card.locator('h3').first();
        await expect(stockName).toBeVisible();
        
        // 가격 정보가 보이는지 확인 (있는 경우)
        const priceInfo = card.locator('text=/[₩$]/').first();
        if (await priceInfo.count() > 0) {
          await expect(priceInfo).toBeVisible();
        }
        
        console.log(`✅ 종목 카드 ${i + 1} 모바일 표시 정상`);
      }
    }
    
    // 메르's Pick 스크린샷
    const merryPickSection = page.locator('text=메르\'s Pick').locator('..').locator('..');
    await merryPickSection.screenshot({ 
      path: `test-results/mobile-merry-pick.png` 
    });
  });

  test('종목 상세 페이지 모바일 확인', async ({ page }) => {
    // TSLA 페이지로 이동
    await page.goto('http://localhost:3005/merry/stocks/TSLA');
    await page.waitForLoadState('networkidle');
    
    // 차트가 모바일에서 제대로 표시되는지 확인
    const chart = page.locator('svg').first();
    await expect(chart).toBeVisible();
    
    // 종목 정보가 제대로 표시되는지 확인
    const stockInfo = page.locator('text=TSLA');
    await expect(stockInfo).toBeVisible();
    
    // 가격 정보 확인
    const priceInfo = page.locator('text=/\\$/');
    await expect(priceInfo.first()).toBeVisible();
    
    // 차트 영역 스크린샷
    await page.screenshot({ 
      path: 'test-results/mobile-stock-detail.png',
      fullPage: true 
    });
    
    console.log('✅ 종목 상세 페이지 모바일 반응형 테스트 완료');
  });

  test('긴 텍스트 오버플로우 확인', async ({ page }) => {
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');
    
    // 긴 종목명이나 설명이 화면 밖으로 나가지 않는지 확인
    const textElements = page.locator('h3, p, span').filter({ hasText: /.{20,}/ });
    const count = await textElements.count();
    
    console.log(`📝 긴 텍스트 요소 수: ${count}`);
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = textElements.nth(i);
      const box = await element.boundingBox();
      
      if (box) {
        // 요소가 뷰포트 너비를 넘지 않는지 확인
        expect(box.x + box.width).toBeLessThanOrEqual(375 + 20); // 20px 여유
        
        const text = await element.textContent();
        console.log(`✅ 텍스트 "${text?.substring(0, 30)}..." 오버플로우 없음`);
      }
    }
  });

  test('버튼과 링크 터치 영역 확인', async ({ page }) => {
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');
    
    // 모든 버튼과 링크의 터치 영역이 충분한지 확인 (최소 44px)
    const clickableElements = page.locator('button, a, [role="button"]');
    const count = await clickableElements.count();
    
    console.log(`🔘 클릭 가능한 요소 수: ${count}`);
    
    for (let i = 0; i < Math.min(count, 15); i++) {
      const element = clickableElements.nth(i);
      const box = await element.boundingBox();
      
      if (box) {
        // 최소 터치 영역 44px x 44px 권장
        const minTouchSize = 40; // 약간 여유를 둠
        
        if (box.height < minTouchSize || box.width < minTouchSize) {
          const text = await element.textContent();
          console.warn(`⚠️ 터치 영역 부족: "${text?.substring(0, 20)}" (${box.width}x${box.height})`);
        } else {
          console.log(`✅ 터치 영역 충분: ${box.width}x${box.height}`);
        }
      }
    }
  });
});

test.describe('다양한 모바일 디바이스 테스트', () => {
  const devices = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'Galaxy S8', width: 360, height: 740 },
    { name: 'iPad Mini', width: 768, height: 1024 }
  ];

  devices.forEach(device => {
    test(`${device.name} (${device.width}x${device.height}) 반응형 테스트`, async ({ page }) => {
      // 디바이스 크기 설정
      await page.setViewportSize({ width: device.width, height: device.height });
      
      await page.goto('http://localhost:3005');
      await page.waitForLoadState('networkidle');
      
      // 기본 요소들이 표시되는지 확인
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('text=메르\'s Pick')).toBeVisible();
      
      // 스크린샷 촬영
      await page.screenshot({ 
        path: `test-results/mobile-${device.name.replace(/\s+/g, '-').toLowerCase()}.png`,
        fullPage: true 
      });
      
      console.log(`✅ ${device.name} 반응형 테스트 완료`);
    });
  });
});