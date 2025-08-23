import { test, expect } from '@playwright/test';
import './setup/test-cleanup';

/**
 * 종목 페이지 요구사항 상세 테스트
 * 기준: CLAUDE.md의 "📊 종목 분석 화면" 요구사항
 */

test.describe('종목 페이지 요구사항 테스트', () => {
  
  test.beforeEach(async ({ page }) => {
    // 개발 서버가 실행 중인지 확인
    await page.goto('http://localhost:3004');
    await expect(page).toHaveTitle(/요르의 투자 블로그|Meire Blog/i);
  });

  test('TSLA 종목 페이지 로딩 및 기본 정보 표시', async ({ page }) => {
    // TSLA 종목 페이지로 이동
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    
    // 페이지 로딩 시간 측정 (3초 이내)
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // 3초 이내 로딩
    
    // 기본 종목 정보 확인
    await expect(page.locator('h1')).toContainText('테슬라');
    await expect(page.locator('text=TSLA')).toBeVisible();
    await expect(page.locator('text=NASDAQ')).toBeVisible();
    
    // 현재가 정보 표시 확인
    const priceElement = page.locator('text=/$|₩/');
    await expect(priceElement).toBeVisible();
  });

  test('한화오션(042660) 종목 페이지 테스트', async ({ page }) => {
    // 한화오션 종목 페이지로 이동
    await page.goto('http://localhost:3004/merry/stocks/042660');
    
    // 한국 주식 정보 확인
    await expect(page.locator('h1')).toContainText('한화오션');
    await expect(page.locator('text=042660')).toBeVisible();
    await expect(page.locator('text=KOSPI')).toBeVisible();
  });

  test('차트 로딩 및 렌더링 테스트', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    
    // 차트 렌더링 시간 측정 (1.5초 이내)
    const chartStartTime = Date.now();
    await page.waitForSelector('.recharts-wrapper', { timeout: 5000 });
    const chartRenderTime = Date.now() - chartStartTime;
    expect(chartRenderTime).toBeLessThan(1500); // 1.5초 이내 차트 렌더링
    
    // 차트 기본 구성 요소 확인
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
    await expect(page.locator('text=주가')).toBeVisible();
    
    // 차트 상호작용 지연 테스트 (<100ms)
    const interactionStartTime = Date.now();
    await page.hover('.recharts-wrapper');
    const interactionTime = Date.now() - interactionStartTime;
    expect(interactionTime).toBeLessThan(100); // 100ms 이내 상호작용
  });

  test('시간 범위 변경 기능 테스트 (1M/3M/6M)', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForSelector('.recharts-wrapper');
    
    // 1M 버튼 클릭
    await page.click('button:has-text("1M")');
    await page.waitForTimeout(500); // 데이터 로딩 대기
    await expect(page.locator('text=최근 1M')).toBeVisible();
    
    // 3M 버튼 클릭  
    await page.click('button:has-text("3M")');
    await page.waitForTimeout(500);
    await expect(page.locator('text=최근 3M')).toBeVisible();
    
    // 6M 버튼 클릭 (기본값)
    await page.click('button:has-text("6M")');
    await page.waitForTimeout(500);
    await expect(page.locator('text=최근 6M')).toBeVisible();
  });

  test('메르 언급 포스트 마커 표시 테스트', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForSelector('.recharts-wrapper');
    
    // 차트에서 파란색 빈 원(메르 언급 마커) 확인 (작은 크기)
    const blueMarkers = page.locator('circle[stroke="#2563eb"][fill="none"]');
    const markerCount = await blueMarkers.count();
    console.log(`📍 Found ${markerCount} post markers on chart`);
    
    // 최소 1개 이상의 마커가 있어야 함
    expect(markerCount).toBeGreaterThan(0);
    
    // 마커에 마우스 hover 시 툴팁 표시
    if (markerCount > 0) {
      await blueMarkers.first().hover();
      await expect(page.locator('text=메르의 언급')).toBeVisible();
    }
  });

  test('마커 클릭 시 포스트 정보 팝업 테스트', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForSelector('.recharts-wrapper');
    
    // 파란색 빈 원 마커 클릭 (작은 크기)
    const blueMarkers = page.locator('circle[stroke="#2563eb"][fill="none"]');
    const markerCount = await blueMarkers.count();
    
    if (markerCount > 0) {
      await blueMarkers.first().click();
      
      // Sheet 팝업이 열리는지 확인
      await expect(page.locator('text=메르의 포스트 상세정보')).toBeVisible();
      await expect(page.locator('text=닫기')).toBeVisible();
      await expect(page.locator('text=전체 포스트 보기')).toBeVisible();
      
      // 팝업 닫기
      await page.click('text=닫기');
      await expect(page.locator('text=메르의 포스트 상세정보')).not.toBeVisible();
    }
  });

  test('관련 포스트 섹션 표시 테스트', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    
    // 관련 포스트 섹션 확인
    await expect(page.locator('text=관련 포스트')).toBeVisible();
    
    // blog_posts DB에서 가져온 실제 포스트 데이터 확인
    const postCards = page.locator('a[href^="/merry/"]');
    const postCount = await postCards.count();
    console.log(`📝 Found ${postCount} related posts from blog_posts DB`);
    
    // 포스트가 있다면 첫 번째 포스트 클릭 테스트
    if (postCount > 0) {
      const firstPost = postCards.first();
      await expect(firstPost).toBeVisible();
      await expect(firstPost.locator('text=/.*/')).toBeVisible(); // 제목 있음
    }
  });

  test('반응형 디자인 테스트 (모바일)', async ({ page }) => {
    // 모바일 뷰포트로 설정
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    
    // 모바일에서 차트 표시 확인
    await page.waitForSelector('.recharts-wrapper');
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
    
    // 터치 조작 시뮬레이션
    await page.touchscreen.tap(200, 300);
    await page.waitForTimeout(100);
  });

  test('에러 상태 처리 테스트', async ({ page }) => {
    // 존재하지 않는 종목으로 테스트
    await page.goto('http://localhost:3004/merry/stocks/INVALID');
    
    // 에러 메시지 표시 확인
    await expect(page.locator('text=종목을 찾을 수 없습니다')).toBeVisible();
    await expect(page.locator('text=종목 목록으로 돌아가기')).toBeVisible();
  });

  test('성능 요구사항 검증', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    
    // 전체 로딩 시간 측정
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.recharts-wrapper');
    const totalLoadTime = Date.now() - startTime;
    
    console.log(`⏱️  Total loading time: ${totalLoadTime}ms`);
    expect(totalLoadTime).toBeLessThan(3000); // 3초 이내
    
    // API 응답 시간 모니터링
    const apiResponseTimes: number[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const timing = response.timing();
        apiResponseTimes.push(timing.responseEnd);
      }
    });
    
    // 1M 버튼 클릭으로 API 호출 트리거
    await page.click('button:has-text("1M")');
    await page.waitForTimeout(1000);
    
    // API 응답 시간 검증 (500ms 이내)
    if (apiResponseTimes.length > 0) {
      const maxApiTime = Math.max(...apiResponseTimes);
      console.log(`🚀 Max API response time: ${maxApiTime}ms`);
      expect(maxApiTime).toBeLessThan(500); // 500ms 이내
    }
  });

  test('blog_posts DB 연동 검증', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    
    // 네트워크 요청 모니터링
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/posts')) {
        apiCalls.push(request.url());
      }
    });
    
    await page.waitForLoadState('networkidle');
    
    // blog_posts DB 호출 확인
    expect(apiCalls.length).toBeGreaterThan(0);
    console.log(`🗄️  blog_posts API calls: ${apiCalls.length}`);
    
    // 실제 데이터 표시 확인 (더미 데이터 없음)
    const noDummyData = page.locator('text=/예시|샘플|dummy|fake/i');
    expect(await noDummyData.count()).toBe(0);
  });
});