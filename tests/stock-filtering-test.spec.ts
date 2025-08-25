import { test, expect } from '@playwright/test';

test.describe('메르 종목 리스트 필터링 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks');
    
    // 페이지 로딩 대기
    await expect(page.locator('[data-testid="stock-card"], .empty-state, .loading-state').first()).toBeVisible({ timeout: 10000 });
  });

  test('통계 카드 클릭 필터링 테스트', async ({ page }) => {
    // 총 종목 수 카드 클릭 테스트
    const totalCard = page.locator('div').filter({ hasText: /총 종목 수/ }).first();
    await expect(totalCard).toBeVisible();
    
    await totalCard.click();
    await page.waitForTimeout(1000); // 필터링 처리 대기
    
    // 모든 종목이 표시되는지 확인
    const stockCards = page.locator('[data-testid="stock-card"]');
    await expect(stockCards.first()).toBeVisible({ timeout: 5000 });
    
    console.log('✅ 총 종목 수 카드 클릭 테스트 통과');

    // 한국 종목 카드 클릭 테스트
    const koreanCard = page.locator('div').filter({ hasText: /한국 종목/ }).first();
    await expect(koreanCard).toBeVisible();
    
    await koreanCard.click();
    await page.waitForTimeout(2000); // 필터링 및 API 호출 대기
    
    // 한국 종목만 표시되는지 확인
    const koreanStocks = page.locator('[data-testid="stock-card"]');
    if (await koreanStocks.count() > 0) {
      // 한국 시장 마커가 있는지 확인
      const marketBadges = koreanStocks.locator('.market-badge, [class*="bg-blue"]');
      await expect(marketBadges.first()).toBeVisible({ timeout: 3000 });
      console.log('✅ 한국 종목 필터링 테스트 통과');
    } else {
      console.log('ℹ️ 한국 종목이 없어 빈 상태 확인');
      await expect(page.locator('.empty-state, .text-center').filter({ hasText: /조건에 맞는 종목이 없습니다|종목이 없습니다/ })).toBeVisible();
    }

    // 해외 종목 카드 클릭 테스트
    const foreignCard = page.locator('div').filter({ hasText: /해외 종목/ }).first();
    await expect(foreignCard).toBeVisible();
    
    await foreignCard.click();
    await page.waitForTimeout(2000); // 필터링 및 API 호출 대기
    
    // 해외 종목만 표시되는지 확인
    const foreignStocks = page.locator('[data-testid="stock-card"]');
    if (await foreignStocks.count() > 0) {
      // 해외 시장 마커가 있는지 확인 (NASDAQ, NYSE 등)
      const marketBadges = foreignStocks.locator('.market-badge, [class*="bg-purple"], [class*="bg-indigo"]');
      await expect(marketBadges.first()).toBeVisible({ timeout: 3000 });
      console.log('✅ 해외 종목 필터링 테스트 통과');
    } else {
      console.log('ℹ️ 해외 종목이 없어 빈 상태 확인');
      await expect(page.locator('.empty-state, .text-center').filter({ hasText: /조건에 맞는 종목이 없습니다|종목이 없습니다/ })).toBeVisible();
    }
  });

  test('드롭다운 필터 테스트', async ({ page }) => {
    // 지역 필터 드롭다운 테스트
    const regionSelect = page.locator('select, [role="combobox"]').filter({ hasText: /전체 지역|지역 선택/ }).or(
      page.locator('button').filter({ hasText: /전체 지역/ })
    );
    
    if (await regionSelect.count() > 0) {
      await regionSelect.first().click();
      await page.waitForTimeout(500);
      
      // 국내 옵션 클릭
      const domesticOption = page.locator('[role="option"], option').filter({ hasText: /국내/ });
      if (await domesticOption.count() > 0) {
        await domesticOption.first().click();
        await page.waitForTimeout(2000); // API 호출 대기
        
        // 필터 적용 확인
        const activeFilters = page.locator('.active-filters, [class*="bg-secondary"]');
        if (await activeFilters.count() > 0) {
          console.log('✅ 지역 필터 드롭다운 테스트 통과');
        }
      }
    }
  });

  test('검색 기능 테스트', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="검색"], input[placeholder*="종목명"]');
    await expect(searchInput).toBeVisible();
    
    // 검색어 입력
    await searchInput.fill('TSLA');
    await page.waitForTimeout(2000); // 검색 처리 대기
    
    // 검색 결과 확인
    const searchResults = page.locator('[data-testid="stock-card"]');
    const resultCount = await searchResults.count();
    
    if (resultCount > 0) {
      // TSLA가 포함된 결과가 있는지 확인
      const tslaCard = searchResults.filter({ hasText: /TSLA|테슬라/ });
      await expect(tslaCard.first()).toBeVisible({ timeout: 3000 });
      console.log('✅ 검색 기능 테스트 통과');
    } else {
      console.log('ℹ️ TSLA 검색 결과가 없음');
    }
    
    // 검색어 지우기
    await searchInput.clear();
    await page.waitForTimeout(1000);
  });

  test('필터 초기화 테스트', async ({ page }) => {
    // 먼저 필터를 적용
    const koreanCard = page.locator('div').filter({ hasText: /한국 종목/ }).first();
    await koreanCard.click();
    await page.waitForTimeout(1000);
    
    // 필터 초기화 버튼 찾기 및 클릭
    const resetButton = page.locator('button').filter({ hasText: /필터 초기화|초기화/ });
    if (await resetButton.count() > 0) {
      await resetButton.first().click();
      await page.waitForTimeout(2000); // 초기화 처리 대기
      
      // 모든 종목이 다시 표시되는지 확인
      const allStocks = page.locator('[data-testid="stock-card"]');
      await expect(allStocks.first()).toBeVisible({ timeout: 5000 });
      console.log('✅ 필터 초기화 테스트 통과');
    }
  });
});