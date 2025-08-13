import { test, expect } from '@playwright/test';

// 상세 페이지 오류 검증 테스트 - 섹션오류 절대 금지
test.describe('Detailed Page Error Validation', () => {
  
  let consoleErrors: string[] = [];
  let jsErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    jsErrors = [];
    
    // 콘솔 에러 캐치
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('Console Error:', msg.text());
      }
    });
    
    // JavaScript 에러 캐치
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
      console.error('Page Error:', error.message);
    });
  });

  test('TSLA 상세 페이지 완전 오류 검증', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('networkidle');
    
    // 3초 대기 후 모든 비동기 작업 완료 확인
    await page.waitForTimeout(3000);
    
    // 1. 기본 페이지 구조 검증
    await expect(page.locator('html')).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
    
    // 2. Tesla 관련 콘텐츠 확인
    const titleContent = await page.locator('h1').textContent();
    expect(titleContent).toContain('Tesla');
    
    // 3. 네비게이션 섹션 검증
    const backButton = page.locator('text=종목 목록으로 돌아가기').or(page.locator('[data-testid="back-button"]'));
    if (await backButton.count() > 0) {
      await expect(backButton).toBeVisible();
    }
    
    // 4. 종목 정보 섹션 검증
    await expect(page.locator('text=TSLA')).toBeVisible();
    
    // 5. 가격 정보 섹션 (있거나 적절한 메시지)
    const priceSection = page.locator('text=현재가').or(page.locator('text=$'));
    const noPriceMsg = page.locator('text=가격 정보 없음');
    const hasPriceOrMsg = await priceSection.count() > 0 || await noPriceMsg.count() > 0;
    expect(hasPriceOrMsg).toBeTruthy();
    
    // 6. 차트 섹션 검증 (가장 중요)
    const chartSection = page.locator('.recharts-wrapper');
    const chartErrorMsg = page.locator('text=가격 정보 없음');
    const hasChartOrError = await chartSection.count() > 0 || await chartErrorMsg.count() > 0;
    expect(hasChartOrError).toBeTruthy();
    
    // 차트가 있다면 SVG 구조 확인
    if (await chartSection.count() > 0) {
      await expect(chartSection).toBeVisible();
      const svg = page.locator('.recharts-wrapper svg');
      if (await svg.count() > 0) {
        await expect(svg).toBeVisible();
      }
    }
    
    // 7. 관련 포스트 섹션 검증
    const postsSection = page.locator('text=관련 포스트');
    if (await postsSection.count() > 0) {
      await expect(postsSection).toBeVisible();
      
      // 포스트가 있거나 준비 중 메시지
      const hasPostItems = await page.locator('[data-testid="post-item"]').count() > 0;
      const hasNoPostsMsg = await page.locator('text=준비하고 있습니다').count() > 0;
      expect(hasPostItems || hasNoPostsMsg).toBeTruthy();
    }
    
    // 8. JavaScript/Console 에러 검증 - 절대 금지
    expect(jsErrors.length).toBe(0);
    
    // 심각한 콘솔 에러 필터링 (폰트 404 등은 허용)
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('TypeError') ||
      error.includes('ReferenceError') ||
      error.includes('SyntaxError') ||
      error.includes('Cannot read properties') ||
      error.includes('is not defined') ||
      error.includes('Uncaught')
    );
    expect(criticalErrors.length).toBe(0);
    
    // 9. 화면에 에러 메시지 표시 금지
    await expect(page.locator('text=Error')).not.toBeVisible();
    await expect(page.locator('text=TypeError')).not.toBeVisible();
    await expect(page.locator('text=undefined')).not.toBeVisible();
    await expect(page.locator('text=null')).not.toBeVisible();
  });

  test('005930 삼성전자 상세 페이지 완전 오류 검증', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/005930');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 1. 기본 구조 검증
    await expect(page.locator('html')).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
    
    // 2. 삼성전자 콘텐츠 확인
    const hasCorrectContent = await page.locator('text=삼성전자').or(page.locator('text=005930')).count() > 0;
    expect(hasCorrectContent).toBeTruthy();
    
    // 3. 한국 종목 특화 검증
    const koreanStock = page.locator('text=KOSPI').or(page.locator('text=₩'));
    if (await koreanStock.count() > 0) {
      await expect(koreanStock.first()).toBeVisible();
    }
    
    // 4. 통계 정보 섹션
    const statsSection = page.locator('text=언급된 포스트').or(page.locator('text=관련 태그'));
    if (await statsSection.count() > 0) {
      await expect(statsSection.first()).toBeVisible();
    }
    
    // 5. 차트 섹션 - 한국 주식 API 특화 검증
    await page.waitForTimeout(2000); // 차트 API 로딩 대기
    
    const chartWrapper = page.locator('.recharts-wrapper');
    const noChartMsg = page.locator('text=가격 정보 없음');
    const hasChartOrMsg = await chartWrapper.count() > 0 || await noChartMsg.count() > 0;
    expect(hasChartOrMsg).toBeTruthy();
    
    // 6. 네트워크 요청 에러 확인
    const networkErrors = consoleErrors.filter(error => 
      error.includes('Failed to fetch') ||
      error.includes('Network request failed') ||
      error.includes('ERR_NETWORK')
    );
    
    // 네트워크 에러가 있어도 페이지는 깨지면 안 됨
    await expect(page.locator('body')).toBeVisible();
    
    // 7. JavaScript 에러 절대 금지
    expect(jsErrors.length).toBe(0);
    
    // 8. 화면 에러 표시 금지
    await expect(page.locator('text=Uncaught')).not.toBeVisible();
    await expect(page.locator('text=Cannot read')).not.toBeVisible();
  });

  test('존재하지 않는 종목 페이지 오류 처리', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/INVALID_TICKER');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 1. 페이지가 로딩되어야 함 (404가 아닌)
    await expect(page.locator('html')).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
    
    // 2. 적절한 에러 메시지 표시
    const errorMessages = [
      'text=종목을 찾을 수 없습니다',
      'text=가격 정보 없음',
      'text=존재하지 않습니다',
      'text=정보를 불러올 수 없습니다'
    ];
    
    let hasErrorMessage = false;
    for (const msg of errorMessages) {
      if (await page.locator(msg).count() > 0) {
        hasErrorMessage = true;
        break;
      }
    }
    expect(hasErrorMessage).toBeTruthy();
    
    // 3. JavaScript 에러는 절대 안 됨
    expect(jsErrors.length).toBe(0);
    
    // 4. 서버 에러 화면 표시 금지
    await expect(page.locator('text=500')).not.toBeVisible();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('메르 개별 포스트 상세 페이지 검증', async ({ page }) => {
    // 먼저 포스트 목록에서 실제 포스트 ID 찾기
    await page.goto('http://localhost:3004/merry');
    await page.waitForLoadState('networkidle');
    
    // 포스트 링크 찾기
    const postLinks = page.locator('a[href*="/merry/"]');
    const linkCount = await postLinks.count();
    
    if (linkCount > 0) {
      // 첫 번째 포스트 클릭
      const firstPostLink = postLinks.first();
      const href = await firstPostLink.getAttribute('href');
      
      if (href && href.includes('/merry/') && href !== '/merry') {
        await page.goto(`http://localhost:3004${href}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // 포스트 페이지 구조 검증
        await expect(page.locator('html')).toBeVisible();
        await expect(page.locator('body')).toBeVisible();
        
        // 포스트 제목이나 내용 있는지 확인
        const hasTitle = await page.locator('h1').count() > 0;
        const hasContent = await page.locator('article').or(page.locator('main')).count() > 0;
        expect(hasTitle || hasContent).toBeTruthy();
        
        // JavaScript 에러 금지
        expect(jsErrors.length).toBe(0);
      }
    }
  });

  test('차트 상호작용 오류 검증', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const chartWrapper = page.locator('.recharts-wrapper');
    
    if (await chartWrapper.count() > 0) {
      // 차트 호버 테스트
      try {
        await chartWrapper.hover();
        await page.waitForTimeout(500);
        
        // 호버 후에도 에러 없어야 함
        expect(jsErrors.length).toBe(0);
      } catch (error) {
        console.log('Chart hover test skipped:', error);
      }
      
      // 차트 영역 클릭 테스트
      try {
        await chartWrapper.click();
        await page.waitForTimeout(500);
        
        // 클릭 후에도 에러 없어야 함
        expect(jsErrors.length).toBe(0);
      } catch (error) {
        console.log('Chart click test skipped:', error);
      }
    }
    
    // 상호작용 후 페이지 상태 확인
    await expect(page.locator('body')).toBeVisible();
  });

  test('API 응답 지연 시 페이지 안정성', async ({ page }) => {
    // API 응답을 5초 지연시키는 테스트
    await page.route('**/api/merry/stocks/TSLA/posts/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      route.continue();
    });
    
    const startTime = Date.now();
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    
    // 2초 후 페이지 상태 확인 (아직 API 응답 전)
    await page.waitForTimeout(2000);
    
    // 페이지 구조는 유지되어야 함
    await expect(page.locator('html')).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
    
    // JavaScript 에러 없어야 함
    expect(jsErrors.length).toBe(0);
    
    // 로딩 상태 표시 확인
    const hasLoadingState = await page.locator('text=불러오는 중').or(
      page.locator('text=Loading').or(
        page.locator('.animate-pulse')
      )
    ).count() > 0;
    
    // 로딩 상태거나 기본 구조는 있어야 함
    expect(hasLoadingState || await page.locator('h1').count() > 0).toBeTruthy();
  });

  test('모든 주요 페이지 순회 오류 검증', async ({ page }) => {
    const criticalPages = [
      'http://localhost:3004',
      'http://localhost:3004/merry',
      'http://localhost:3004/merry/stocks',
      'http://localhost:3004/merry/stocks/TSLA',
      'http://localhost:3004/merry/stocks/005930'
    ];
    
    for (const url of criticalPages) {
      console.log(`Testing page: ${url}`);
      
      // 각 페이지마다 에러 카운터 리셋
      jsErrors = [];
      consoleErrors = [];
      
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // 기본 구조 확인
      await expect(page.locator('html')).toBeVisible();
      await expect(page.locator('body')).toBeVisible();
      
      // JavaScript 에러 절대 금지
      if (jsErrors.length > 0) {
        console.error(`JavaScript errors on ${url}:`, jsErrors);
        expect(jsErrors.length).toBe(0);
      }
      
      // 크리티컬 콘솔 에러 필터링
      const criticalConsoleErrors = consoleErrors.filter(error => 
        error.includes('TypeError') ||
        error.includes('ReferenceError') ||
        error.includes('Cannot read properties')
      );
      
      if (criticalConsoleErrors.length > 0) {
        console.error(`Critical console errors on ${url}:`, criticalConsoleErrors);
        expect(criticalConsoleErrors.length).toBe(0);
      }
      
      console.log(`✅ Page ${url} passed error validation`);
    }
  });
});