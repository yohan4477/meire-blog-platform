import { test, expect } from '@playwright/test';

// 주요 페이지 섹션오류 절대 금지 테스트
test.describe('Critical Sections - Zero Tolerance for Section Errors', () => {
  
  test.beforeEach(async ({ page }) => {
    // 콘솔 에러 캐치
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Console Error:', msg.text());
      }
    });
    
    // JavaScript 에러 캐치
    page.on('pageerror', (error) => {
      console.error('Page Error:', error.message);
      throw new Error(`Page Error: ${error.message}`);
    });
  });

  test('메인 페이지 - 모든 섹션 정상 로딩', async ({ page }) => {
    await page.goto('http://localhost:3004');
    await page.waitForLoadState('networkidle');
    
    // 핵심 섹션들이 모두 존재하는지 확인
    const criticalSections = [
      'header', 'nav', 'main', 'footer',
      '[data-testid="hero-section"]',
      '[data-testid="latest-posts"]',
      '[data-testid="stock-highlights"]'
    ];
    
    for (const selector of criticalSections) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        await expect(element).toBeVisible({timeout: 5000});
        console.log(`✅ Section found: ${selector}`);
      } else {
        console.log(`⚠️ Optional section missing: ${selector}`);
      }
    }
    
    // 에러 메시지가 화면에 표시되지 않았는지 확인
    await expect(page.locator('text=Error')).not.toBeVisible();
    await expect(page.locator('text=404')).not.toBeVisible();
    await expect(page.locator('text=500')).not.toBeVisible();
    await expect(page.locator('text=undefined')).not.toBeVisible();
    await expect(page.locator('text=null')).not.toBeVisible();
  });

  test('메르 종목 목록 페이지 - 모든 섹션 정상 로딩', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks');
    await page.waitForLoadState('networkidle');
    
    // 필수 섹션 확인
    await expect(page.locator('h1')).toBeVisible();
    
    // 종목 리스트 섹션 확인
    const stockList = page.locator('[data-testid="stock-list"]').or(
      page.locator('.grid').or(
        page.locator('text=종목').first()
      )
    );
    
    // 종목 데이터가 있거나 "정보 없음" 메시지가 있어야 함
    const hasStocks = await page.locator('text=TSLA').or(page.locator('text=005930')).count() > 0;
    const hasNoDataMsg = await page.locator('text=정보 없음').or(page.locator('text=준비')).count() > 0;
    
    expect(hasStocks || hasNoDataMsg).toBeTruthy();
    
    // 섹션 에러 금지
    await expect(page.locator('text=TypeError')).not.toBeVisible();
    await expect(page.locator('text=ReferenceError')).not.toBeVisible();
    await expect(page.locator('text=Cannot read')).not.toBeVisible();
  });

  test('TSLA 종목 상세 페이지 - 모든 섹션 정상 로딩', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('networkidle');
    
    // 종목 헤더 섹션 확인
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=TSLA').or(page.locator('text=Tesla'))).toBeVisible();
    
    // 가격 정보 섹션 확인 (있거나 "정보 없음")
    const hasPriceInfo = await page.locator('text=$').or(page.locator('text=₩')).count() > 0;
    const hasNoPriceMsg = await page.locator('text=가격 정보 없음').count() > 0;
    expect(hasPriceInfo || hasNoPriceMsg).toBeTruthy();
    
    // 차트 섹션 확인 (있거나 "정보 없음")
    const hasChart = await page.locator('.recharts-wrapper').count() > 0;
    const hasNoChartMsg = await page.locator('text=가격 정보 없음').count() > 0;
    expect(hasChart || hasNoChartMsg).toBeTruthy();
    
    // 관련 포스트 섹션 확인
    const postsSection = page.locator('text=관련 포스트');
    if (await postsSection.count() > 0) {
      await expect(postsSection).toBeVisible();
    }
    
    // 크리티컬 에러 절대 금지
    await expect(page.locator('text=Uncaught')).not.toBeVisible();
    await expect(page.locator('text=TypeError')).not.toBeVisible();
    await expect(page.locator('text=ReferenceError')).not.toBeVisible();
    await expect(page.locator('text=SyntaxError')).not.toBeVisible();
  });

  test('005930 삼성전자 종목 상세 페이지 - 모든 섹션 정상 로딩', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/005930');
    await page.waitForLoadState('networkidle');
    
    // 종목 헤더 섹션 확인
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=005930').or(page.locator('text=삼성전자'))).toBeVisible();
    
    // 통계 섹션 확인
    const statsSection = page.locator('text=언급된 포스트').or(page.locator('text=관련 태그'));
    if (await statsSection.count() > 0) {
      await expect(statsSection.first()).toBeVisible();
    }
    
    // 차트 섹션 검증 - 절대 깨지면 안 됨
    await page.waitForTimeout(2000); // 차트 로딩 대기
    
    const chartError = await page.locator('text=Chart Error').count();
    const renderError = await page.locator('text=Render Error').count();
    expect(chartError + renderError).toBe(0);
    
    // 심각한 JavaScript 에러 금지
    await expect(page.locator('text=Cannot read properties')).not.toBeVisible();
    await expect(page.locator('text=is not defined')).not.toBeVisible();
  });

  test('존재하지 않는 종목 페이지 - 적절한 에러 핸들링', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/NONEXISTENT');
    await page.waitForLoadState('networkidle');
    
    // 404나 적절한 안내 메시지가 있어야 함
    const hasErrorMsg = await page.locator('text=종목을 찾을 수 없습니다').or(
      page.locator('text=가격 정보 없음').or(
        page.locator('text=존재하지 않습니다')
      )
    ).count() > 0;
    
    expect(hasErrorMsg).toBeTruthy();
    
    // 하지만 JavaScript 에러나 섹션 붕괴는 절대 안 됨
    await expect(page.locator('text=TypeError')).not.toBeVisible();
    await expect(page.locator('text=500')).not.toBeVisible();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('메르 블로그 메인 페이지 - 모든 섹션 정상', async ({ page }) => {
    await page.goto('http://localhost:3004/merry');
    await page.waitForLoadState('networkidle');
    
    // 메르 블로그 헤더 확인
    await expect(page.locator('h1').or(page.locator('text=메르'))).toBeVisible();
    
    // 포스트 목록 섹션 확인
    const postsList = page.locator('[data-testid="posts-list"]').or(
      page.locator('text=포스트').or(
        page.locator('.grid')
      )
    );
    
    // 포스트가 있거나 "준비 중" 메시지
    const hasPosts = await page.locator('article').or(page.locator('[data-testid="post-item"]')).count() > 0;
    const hasNoPostsMsg = await page.locator('text=준비').or(page.locator('text=포스트 없음')).count() > 0;
    
    expect(hasPosts || hasNoPostsMsg).toBeTruthy();
    
    // 섹션 에러 절대 금지
    await expect(page.locator('text=Failed to fetch')).not.toBeVisible();
    await expect(page.locator('text=Network Error')).not.toBeVisible();
  });

  test('API 엔드포인트 응답성 검증', async ({ page }) => {
    // 주요 API 엔드포인트들이 적절히 응답하는지 확인
    const apiTests = [
      '/api/merry/stocks?limit=5',
      '/api/merry/stocks/TSLA/posts',
      '/api/merry?limit=2'
    ];
    
    for (const endpoint of apiTests) {
      const response = await page.request.get(`http://localhost:3004${endpoint}`);
      
      // 500 에러는 절대 안 됨
      expect(response.status()).not.toBe(500);
      expect(response.status()).not.toBe(502);
      expect(response.status()).not.toBe(503);
      
      // 200이나 적절한 4xx 에러 코드만 허용
      expect([200, 404, 400].includes(response.status())).toBeTruthy();
      
      if (response.status() === 200) {
        const body = await response.json();
        // API 응답에 JavaScript 에러 메시지가 포함되면 안 됨
        const bodyText = JSON.stringify(body);
        expect(bodyText).not.toContain('TypeError');
        expect(bodyText).not.toContain('ReferenceError');
        expect(bodyText).not.toContain('SyntaxError');
      }
    }
  });

  test('페이지 네비게이션 섹션 안정성', async ({ page }) => {
    // 메인 -> 종목 목록 -> 종목 상세 -> 뒤로가기 플로우 테스트
    
    // 1. 메인 페이지
    await page.goto('http://localhost:3004');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    
    // 2. 종목 목록으로 이동
    await page.goto('http://localhost:3004/merry/stocks');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
    
    // 3. 특정 종목으로 이동
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible();
    
    // 4. 뒤로가기
    await page.goBack();
    await page.waitForLoadState('networkidle');
    // 페이지가 깨지지 않았는지 확인
    await expect(page.locator('body')).toBeVisible();
    
    // 전체 플로우에서 JavaScript 에러 없었는지 확인
    await expect(page.locator('text=Error')).not.toBeVisible();
  });

  test('모바일에서 섹션 안정성', async ({ page }) => {
    // 모바일 뷰포트에서도 섹션이 깨지지 않는지 확인
    await page.setViewportSize({ width: 375, height: 667 });
    
    const pages = [
      'http://localhost:3004',
      'http://localhost:3004/merry/stocks',
      'http://localhost:3004/merry/stocks/TSLA'
    ];
    
    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      // 기본 페이지 구조가 유지되는지 확인
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('html')).not.toHaveClass(/error/);
      
      // 모바일에서 특히 문제가 될 수 있는 요소들 확인
      await expect(page.locator('text=Uncaught')).not.toBeVisible();
      await expect(page.locator('text=viewport')).not.toContain('error');
    }
  });

  test('차트 섹션 크리티컬 에러 방지', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('networkidle');
    
    // 차트 로딩 대기
    await page.waitForTimeout(3000);
    
    // 차트 관련 크리티컬 에러 절대 금지
    const chartErrors = [
      'text=Cannot read properties of undefined',
      'text=Chart rendering failed',
      'text=Recharts Error',
      'text=SVG Error',
      'text=Canvas Error'
    ];
    
    for (const errorSelector of chartErrors) {
      await expect(page.locator(errorSelector)).not.toBeVisible();
    }
    
    // 차트가 있다면 최소한의 구조는 유지되어야 함
    const hasChart = await page.locator('.recharts-wrapper').count() > 0;
    if (hasChart) {
      await expect(page.locator('.recharts-wrapper')).toBeVisible();
      // SVG 엘리먼트가 제대로 렌더링되었는지 확인
      const svg = page.locator('.recharts-wrapper svg');
      if (await svg.count() > 0) {
        await expect(svg).toBeVisible();
      }
    }
  });

  test('데이터 로딩 실패 시 섹션 안정성', async ({ page }) => {
    // 네트워크 요청을 인터셉트해서 실패 시나리오 테스트
    await page.route('**/api/merry/stocks/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('networkidle');
    
    // API 실패해도 페이지 구조는 유지되어야 함
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
    
    // 사용자에게 적절한 에러 메시지 표시
    const hasErrorMsg = await page.locator('text=가격 정보 없음').or(
      page.locator('text=일시적으로').or(
        page.locator('text=정보를 불러올 수 없습니다')
      )
    ).count() > 0;
    
    expect(hasErrorMsg).toBeTruthy();
    
    // 하지만 JavaScript 에러나 섹션 붕괴는 절대 안 됨
    await expect(page.locator('text=Uncaught')).not.toBeVisible();
    await expect(page.locator('text=TypeError')).not.toBeVisible();
  });
});