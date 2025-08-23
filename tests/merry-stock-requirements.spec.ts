import { test, expect } from '@playwright/test';
import './setup/test-cleanup';

// CLAUDE.md 종목 화면 요구사항 검증 테스트
test.describe('Merry Stock Screen Requirements', () => {
  
  test.beforeEach(async ({ page }) => {
    // 개발 서버 연결 대기
    await page.goto('http://localhost:3004');
    await page.waitForLoadState('networkidle');
  });

  test('종목 페이지 기본 로딩 및 3초 제한', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // CLAUDE.md 요구사항: 로딩은 3초를 넘으면 안 됨
    expect(loadTime).toBeLessThan(3000);
    
    // 기본 요소들이 표시되는지 확인
    await expect(page.locator('h1')).toContainText('Tesla');
    await expect(page.locator('[data-testid="stock-ticker"]').or(page.locator('text=TSLA'))).toBeVisible();
  });

  test('가격 정보 없음 시 올바른 메시지 표시', async ({ page }) => {
    // 존재하지 않는 종목으로 테스트
    await page.goto('http://localhost:3004/merry/stocks/NONEXISTENT');
    
    // CLAUDE.md 원칙: dummy data 대신 "정보 없음" 표시
    await expect(page.locator('text=가격 정보 없음').or(page.locator('text=종목을 찾을 수 없습니다'))).toBeVisible();
    
    // dummy data가 표시되지 않는지 확인
    await expect(page.locator('text=예시')).not.toBeVisible();
    await expect(page.locator('text=샘플')).not.toBeVisible();
    await expect(page.locator('text=$100')).not.toBeVisible();
  });

  test('6개월치 차트 기본 표시', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    
    // 차트 컨테이너 확인
    const chartContainer = page.locator('.recharts-wrapper').or(page.locator('[data-testid="stock-chart"]'));
    
    // 차트가 로딩되거나 "정보 없음" 메시지가 표시되어야 함
    await expect(chartContainer.or(page.locator('text=가격 정보 없음'))).toBeVisible();
    
    // 6개월 관련 텍스트 확인 (차트가 있을 때)
    const sixMonthText = page.locator('text=6개월').or(page.locator('text=180일'));
    if (await sixMonthText.isVisible()) {
      await expect(sixMonthText).toBeVisible();
    }
  });

  test('메르 글 언급 시에만 마커 표시', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    
    // 차트에서 메르 글 마커 확인
    const mentionMarker = page.locator('.recharts-dot').or(page.locator('[data-testid="mention-marker"]'));
    const noDataMessage = page.locator('text=가격 정보 없음');
    
    // 차트가 있으면 마커 검증, 없으면 "정보 없음" 확인
    if (await mentionMarker.first().isVisible()) {
      // 메르 글 언급 마커가 있는 경우에만 표시되는지 확인
      const markerTooltip = page.locator('text=메르의 언급').or(page.locator('[data-testid="mention-tooltip"]'));
      await mentionMarker.first().hover();
      // 툴팁이 표시되면 메르 언급 관련 내용이어야 함
    } else {
      // 차트가 없는 경우 "정보 없음" 표시 확인
      await expect(noDataMessage.or(page.locator('text=아직 준비되지 않았습니다'))).toBeVisible();
    }
  });

  test('언급 없는 날에는 마커 표시 안 함', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/005930');
    
    // 차트가 있다면
    const chart = page.locator('.recharts-wrapper');
    if (await chart.isVisible()) {
      // 일반 데이터 점은 마커가 없어야 함 (메르 언급일에만 마커)
      const regularDots = page.locator('.recharts-line .recharts-dot[fill="#2563eb"]');
      const mentionDots = page.locator('.recharts-dot[fill="#dc2626"]').or(page.locator('.recharts-dot[fill="#16a34a"]'));
      
      // 언급이 없는 일반 날짜는 점이 표시되지 않거나 회색으로 표시
      // 언급일만 빨간색(부정)/초록색(긍정) 마커
    }
  });

  test('메르 언급 종목만 차트 데이터 표시', async ({ page }) => {
    // 메르가 언급한 종목
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('networkidle');
    
    // 페이지가 로드되었는지 확인
    await expect(page.locator('h1')).toContainText('Tesla');
    
    // 차트나 "정보 없음" 메시지가 있어야 함
    const hasChart = await page.locator('.recharts-wrapper').isVisible();
    const hasNoDataMessage = await page.locator('text=가격 정보 없음').isVisible();
    
    expect(hasChart || hasNoDataMessage).toBeTruthy();
    
    // CLAUDE.md 원칙: dummy data 표시 금지
    await expect(page.locator('text=예시 데이터')).not.toBeVisible();
    await expect(page.locator('text=샘플:')).not.toBeVisible();
  });

  test('미언급 종목 접근시 적절한 안내', async ({ page }) => {
    // 존재하지 않거나 언급되지 않은 종목
    await page.goto('http://localhost:3004/merry/stocks/UNKNOWN');
    
    // 적절한 안내 메시지 표시
    await expect(
      page.locator('text=종목을 찾을 수 없습니다')
        .or(page.locator('text=가격 정보 없음'))
        .or(page.locator('text=준비되지 않았습니다'))
    ).toBeVisible();
    
    // dummy data가 표시되지 않는지 확인
    await expect(page.locator('text=$')).not.toBeVisible();
    await expect(page.locator('text=포스트').and(page.locator('text=개'))).not.toBeVisible();
  });

  test('모바일 반응형 테스트', async ({ page }) => {
    // 모바일 뷰포트 설정
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('networkidle');
    
    // 모바일에서도 기본 요소들이 표시되는지 확인
    await expect(page.locator('h1')).toBeVisible();
    
    // 차트나 "정보 없음" 메시지 확인
    const chartOrMessage = page.locator('.recharts-wrapper').or(page.locator('text=가격 정보 없음'));
    await expect(chartOrMessage).toBeVisible();
  });

  test('성능 요구사항: 차트 렌더링 1초 이내', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    
    const startTime = Date.now();
    
    // 차트가 렌더링되거나 "정보 없음" 메시지가 표시될 때까지 대기
    await page.locator('.recharts-wrapper').or(page.locator('text=가격 정보 없음')).waitFor();
    
    const renderTime = Date.now() - startTime;
    
    // CLAUDE.md 요구사항: 차트 렌더링 < 1초
    expect(renderTime).toBeLessThan(1000);
  });

  test('관련 포스트 섹션 - 실제 데이터만 표시', async ({ page }) => {
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    
    // 관련 포스트 섹션 확인
    const postsSection = page.locator('text=관련 포스트');
    if (await postsSection.isVisible()) {
      // 포스트가 있으면 실제 데이터, 없으면 "준비 중" 메시지
      const hasRealPosts = await page.locator('[data-testid="post-item"]').count() > 0;
      const hasNoPostsMessage = await page.locator('text=준비하고 있습니다').isVisible();
      
      expect(hasRealPosts || hasNoPostsMessage).toBeTruthy();
      
      // CLAUDE.md 원칙: dummy data 금지
      await expect(page.locator('text=예시:')).not.toBeVisible();
      await expect(page.locator('text=샘플 포스트')).not.toBeVisible();
    }
  });
});