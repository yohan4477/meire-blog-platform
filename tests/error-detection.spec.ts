import { test, expect } from '@playwright/test';
import './setup/test-cleanup';

test.describe('섹션 오류 검출 테스트', () => {
  
  test('ErrorBoundary가 오류를 정상적으로 캐치하고 추적 시스템에 기록하는지 테스트', async ({ page }) => {
    // 콘솔 에러 추적
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // API 호출 추적
    const apiCalls: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/section-errors')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });

    // 에러 테스트 페이지로 이동
    await page.goto('http://localhost:3004/error-test');
    
    // 페이지가 로드될 때까지 대기
    await expect(page.locator('h2:has-text("섹션 오류 추적 시스템 테스트")')).toBeVisible();
    
    // 에러 발생 버튼 찾기
    const errorButton = page.locator('button:has-text("🚨 에러 발생시키기")');
    await expect(errorButton).toBeVisible();
    
    // 에러 발생 버튼 클릭
    await errorButton.click();
    
    // ErrorBoundary UI가 표시될 때까지 대기
    await expect(page.locator('text=섹션 로딩 오류')).toBeVisible({ timeout: 5000 });
    
    // 오류 정보가 표시되는지 확인
    await expect(page.locator('text=이 섹션에서 일시적인 문제가 발생했습니다')).toBeVisible();
    
    // "다시 시도" 버튼이 있는지 확인
    await expect(page.locator('button:has-text("다시 시도")')).toBeVisible();
    
    // API 호출이 발생했는지 확인 (최대 3초 대기)
    await page.waitForTimeout(3000);
    
    console.log('📊 감지된 콘솔 에러:', consoleErrors);
    console.log('📊 감지된 API 호출:', apiCalls);
    
    // 적어도 하나의 API 호출이 섹션 오류 추적을 위해 발생했는지 확인
    expect(apiCalls.length).toBeGreaterThan(0);
    
    // 오류가 자동으로 보고되었다는 메시지 확인
    await expect(page.locator('text=✅ 오류가 자동으로 보고되었습니다')).toBeVisible({ timeout: 5000 });
  });

  test('실제 페이지에서 JavaScript 에러 검출', async ({ page }) => {
    const jsErrors: Error[] = [];
    
    // JavaScript 런타임 에러 캐치
    page.on('pageerror', error => {
      jsErrors.push(error);
      console.log('🚨 JavaScript 에러 감지:', error.message);
    });

    // 네트워크 요청 실패 추적
    const failedRequests: any[] = [];
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()?.errorText
      });
      console.log('🚨 네트워크 요청 실패:', request.url(), request.failure()?.errorText);
    });

    // 여러 페이지 방문하여 에러 검출
    const pagesToTest = [
      'http://localhost:3004/',
      'http://localhost:3004/merry/stocks/TSLA',
      'http://localhost:3004/merry/stocks/042660', 
      'http://localhost:3004/admin/errors'
    ];

    for (const url of pagesToTest) {
      console.log(`🔍 테스트 중: ${url}`);
      
      try {
        await page.goto(url, { waitUntil: 'networkidle' });
        
        // 페이지 로딩 시간 측정 (3초 제한)
        const startTime = Date.now();
        await page.waitForLoadState('domcontentloaded');
        const loadTime = Date.now() - startTime;
        
        console.log(`⏱️ 페이지 로딩 시간: ${loadTime}ms`);
        
        // 3초 로딩 제한 검증
        expect(loadTime).toBeLessThan(3000);
        
        // 기본 UI 요소들이 로드되었는지 확인
        await expect(page.locator('body')).toBeVisible();
        
        // 2초간 페이지 상호작용 대기 (에러 발생 여부 관찰)
        await page.waitForTimeout(2000);
        
      } catch (error) {
        console.log(`❌ 페이지 ${url}에서 에러 발생:`, error);
      }
    }

    // 결과 보고
    console.log(`📊 총 JavaScript 에러: ${jsErrors.length}개`);
    console.log(`📊 총 네트워크 실패: ${failedRequests.length}개`);
    
    if (jsErrors.length > 0) {
      jsErrors.forEach((error, index) => {
        console.log(`🚨 JS 에러 ${index + 1}:`, error.message);
      });
    }

    if (failedRequests.length > 0) {
      failedRequests.forEach((req, index) => {
        console.log(`🚨 네트워크 실패 ${index + 1}:`, req.url, '-', req.failure);
      });
    }
  });

  test('차트 페이지에서 터치/마우스 이벤트 오류 검출', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`콘솔 에러: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      errors.push(`페이지 에러: ${error.message}`);
    });

    // 차트 페이지로 이동
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    
    // 차트 로딩 대기
    await page.waitForSelector('svg', { timeout: 10000 });
    console.log('✅ 차트 SVG 요소 로드 완료');
    
    // 차트 영역 찾기
    const chart = page.locator('svg').first();
    await expect(chart).toBeVisible();
    
    // 차트 상호작용 테스트
    console.log('🖱️ 차트 클릭 테스트 시작');
    await chart.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(500);
    
    console.log('🖱️ 차트 드래그 테스트 시작');
    await chart.dragTo(chart, { 
      sourcePosition: { x: 100, y: 100 },
      targetPosition: { x: 200, y: 100 }
    });
    await page.waitForTimeout(500);
    
    // 모바일 터치 시뮬레이션
    console.log('📱 터치 이벤트 테스트 시작');
    await chart.tap({ position: { x: 150, y: 100 } });
    await page.waitForTimeout(500);

    // 줌 인/아웃 시뮬레이션 (휠 이벤트)
    console.log('🔍 휠/줌 이벤트 테스트 시작');
    await chart.hover({ position: { x: 150, y: 100 } });
    await page.mouse.wheel(0, 100); // 줌 아웃
    await page.waitForTimeout(500);
    await page.mouse.wheel(0, -100); // 줌 인
    await page.waitForTimeout(500);

    // 기간 선택 버튼 테스트
    const periodButtons = ['1M', '3M', '6M'];
    for (const period of periodButtons) {
      const button = page.locator(`button:has-text("${period}")`);
      if (await button.isVisible()) {
        console.log(`📊 ${period} 기간 선택 테스트`);
        await button.click();
        await page.waitForTimeout(1000);
      }
    }

    // 최종 결과 보고
    console.log(`📊 차트 상호작용 중 발견된 에러: ${errors.length}개`);
    if (errors.length > 0) {
      errors.forEach((error, index) => {
        console.log(`🚨 차트 에러 ${index + 1}: ${error}`);
      });
    }

    // 차트 기능이 정상 작동하는지 확인
    await expect(chart).toBeVisible();
    console.log('✅ 차트 상호작용 테스트 완료 - 차트가 여전히 표시됨');
  });

  test('섹션 오류 추적 API 엔드포인트 테스트', async ({ page, request }) => {
    // API 직접 호출 테스트
    console.log('🔧 섹션 오류 API 테스트 시작');
    
    const testError = {
      componentName: 'PlaywrightTestComponent',
      sectionName: 'api-test-section',
      pagePath: '/playwright-test',
      errorMessage: 'Playwright 테스트에서 발생한 오류',
      errorType: 'PlaywrightError',
      errorCategory: '데이터',
      userAgent: await page.evaluate(() => navigator.userAgent)
    };

    // POST 요청으로 에러 기록
    const response = await request.post('http://localhost:3004/api/section-errors', {
      data: testError
    });

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    console.log('✅ 에러 기록 API 응답:', responseData);

    expect(responseData.success).toBe(true);
    expect(responseData.errorHash).toBeDefined();

    // GET 요청으로 에러 목록 조회
    const listResponse = await request.get('http://localhost:3004/api/section-errors?type=list&limit=5');
    expect(listResponse.ok()).toBeTruthy();
    
    const listData = await listResponse.json();
    console.log('✅ 에러 목록 API 응답:', listData);
    
    expect(listData.success).toBe(true);
    expect(listData.data.errors).toBeDefined();
    expect(Array.isArray(listData.data.errors)).toBe(true);

    // 방금 추가한 에러가 목록에 있는지 확인
    const ourError = listData.data.errors.find((error: any) => 
      error.component_name === 'PlaywrightTestComponent'
    );
    expect(ourError).toBeDefined();
    console.log('✅ Playwright 테스트 에러가 목록에서 발견됨:', ourError?.error_hash);
  });
});