import { test, expect } from '@playwright/test';

// CLAUDE.md 요구사항: 전체 사이트 Playwright 테스트 - 3초 로딩 제한 엄격 준수
test.describe('메르 블로그 플랫폼 전체 사이트 테스트', () => {
  
  test.beforeEach(async ({ page }) => {
    // 모든 테스트 전에 콘솔 에러 모니터링
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ 콘솔 에러 발견:', msg.text());
      }
    });
  });

  test('메인 페이지 (/) 전체 기능 및 성능 검증', async ({ page }) => {
    console.log('🏠 메인 페이지 종합 테스트 시작');
    
    const startTime = Date.now();
    await page.goto('http://localhost:3004');
    const loadTime = Date.now() - startTime;
    
    // CLAUDE.md 성능 요구사항: 메인 페이지 < 2초 (특별 기준)
    console.log(`⏱️ 메인 페이지 로딩 시간: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(2000);
    
    // 1. 기본 페이지 구조 확인
    await expect(page.locator('h1, h2').first()).toBeVisible();
    console.log('✅ 메인 제목 표시 확인');
    
    // 2. 메르's Pick 섹션 존재 및 기능 확인
    await expect(page.locator('text=메르\'s Pick')).toBeVisible();
    await expect(page.locator('text=최신 언급일 기준 랭킹')).toBeVisible();
    console.log('✅ 메르\'s Pick 섹션 정상 표시');
    
    // 3. 종목 카드들 로딩 확인
    const stockCards = page.locator('[data-testid="stock-card"]').or(
      page.locator('.border').filter({ hasText: /[A-Z0-9]{3,6}/ })
    );
    await page.waitForTimeout(1000); // 데이터 로딩 대기
    const cardCount = await stockCards.count();
    console.log(`📊 메르's Pick 종목 카드 수: ${cardCount}개`);
    
    if (cardCount > 0) {
      // 첫 번째 종목 카드 상세 검증
      const firstCard = stockCards.first();
      await expect(firstCard).toBeVisible();
      console.log('✅ 종목 카드 정상 렌더링');
    }
    
    // 4. 실제 데이터 vs Dummy 데이터 검증 (CLAUDE.md 원칙)
    const dummyTexts = [
      'dummy', 'sample', 'example', 'test data', '샘플', '예시', '테스트'
    ];
    
    for (const dummyText of dummyTexts) {
      const dummyExists = await page.locator(`text=${dummyText}`).count() > 0;
      if (dummyExists) {
        console.log(`⚠️ Dummy 데이터 발견: "${dummyText}"`);
      }
      expect(dummyExists).toBe(false);
    }
    console.log('✅ Dummy 데이터 없음 - 실제 데이터만 표시');
    
    console.log('🎯 메인 페이지 테스트 완료');
  });

  test('메르\'s Pick API 및 데이터 연동 검증', async ({ page }) => {
    console.log('📡 메르\'s Pick API 연동 테스트');
    
    // 1. API 엔드포인트 직접 테스트
    const startTime = Date.now();
    const response = await page.request.get('http://localhost:3004/api/merry/picks?limit=5');
    const apiTime = Date.now() - startTime;
    
    console.log(`⚡ API 응답 시간: ${apiTime}ms`);
    expect(response.status()).toBe(200);
    expect(apiTime).toBeLessThan(500); // CLAUDE.md 요구사항
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.picks).toBeInstanceOf(Array);
    
    console.log(`📊 API 반환 종목 수: ${data.data.picks.length}개`);
    
    // 2. 데이터 구조 검증
    if (data.data.picks.length > 0) {
      const firstPick = data.data.picks[0];
      expect(firstPick).toHaveProperty('ticker');
      expect(firstPick).toHaveProperty('name');
      expect(firstPick).toHaveProperty('last_mentioned_at');
      expect(firstPick).toHaveProperty('description');
      
      console.log(`✅ 첫 번째 종목: ${firstPick.name} (${firstPick.ticker})`);
      console.log(`📅 최근 언급일: ${firstPick.last_mentioned_at.split('T')[0]}`);
      console.log(`📝 설명: ${firstPick.description?.substring(0, 50)}...`);
    }
    
    // 3. 캐시 헤더 확인
    const headers = response.headers();
    console.log('📋 응답 헤더 Cache-Control:', headers['cache-control']);
    
    console.log('🎯 API 연동 테스트 완료');
  });

  test('종목 상세 페이지 (/merry/stocks/[ticker]) 테스트', async ({ page }) => {
    console.log('📈 종목 상세 페이지 테스트');
    
    // 테스트할 종목들 (실제 데이터 있는 종목)
    const testTickers = ['TSLA', 'AAPL', 'GOOGL'];
    
    for (const ticker of testTickers) {
      console.log(`🔍 ${ticker} 종목 페이지 테스트`);
      
      const startTime = Date.now();
      const response = await page.goto(`http://localhost:3004/merry/stocks/${ticker}`);
      const loadTime = Date.now() - startTime;
      
      // CLAUDE.md 성능 요구사항: < 3초 (절대 한계)
      console.log(`⏱️ ${ticker} 페이지 로딩: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);
      
      if (response && response.status() === 200) {
        // 종목 정보 표시 확인
        await expect(page.locator(`text=${ticker}`)).toBeVisible();
        console.log(`✅ ${ticker} 종목 정보 표시`);
        
        // 차트 영역 확인 (있는 경우)
        const chartExists = await page.locator('.recharts-wrapper, .chart-container, canvas').count() > 0;
        if (chartExists) {
          console.log(`📊 ${ticker} 차트 렌더링 확인`);
        }
        
        // 에러 메시지 확인
        const errorExists = await page.locator('text=에러, text=오류, text=실패').count() > 0;
        expect(errorExists).toBe(false);
        
      } else {
        console.log(`⚠️ ${ticker} 페이지 접근 불가 - 404 또는 다른 오류`);
      }
    }
    
    console.log('🎯 종목 상세 페이지 테스트 완료');
  });

  test('전체 API 엔드포인트 헬스체크', async ({ page }) => {
    console.log('🔧 API 엔드포인트 전체 헬스체크');
    
    const endpoints = [
      { url: '/api/merry/picks', name: '메르\'s Pick' },
      { url: '/api/financial-curation', name: '금융 큐레이션' },
      { url: '/api/merry/stocks/TSLA', name: 'TSLA 종목 정보' },
      { url: '/api/merry/stocks/TSLA/posts', name: 'TSLA 관련 포스트' },
      { url: '/api/merry/stocks/TSLA/sentiments', name: 'TSLA 감정 분석' }
    ];
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      const response = await page.request.get(`http://localhost:3004${endpoint.url}`);
      const responseTime = Date.now() - startTime;
      
      console.log(`📡 ${endpoint.name}: ${response.status()} (${responseTime}ms)`);
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('success');
        console.log(`✅ ${endpoint.name} API 정상`);
      } else if (response.status() === 404) {
        console.log(`⚠️ ${endpoint.name} API 없음 (404)`);
      } else {
        console.log(`❌ ${endpoint.name} API 오류: ${response.status()}`);
      }
      
      // 모든 API는 1초 이내 응답 목표
      if (responseTime > 1000) {
        console.log(`⚠️ ${endpoint.name} 응답 시간 길음: ${responseTime}ms`);
      }
    }
    
    console.log('🎯 API 헬스체크 완료');
  });

  test('반응형 및 모바일 환경 테스트', async ({ page }) => {
    console.log('📱 반응형 및 모바일 환경 테스트');
    
    // 다양한 화면 크기 테스트
    const viewports = [
      { width: 390, height: 844, name: 'iPhone 12' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
      console.log(`📺 ${viewport.name} (${viewport.width}x${viewport.height}) 테스트`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      const startTime = Date.now();
      await page.goto('http://localhost:3004');
      const loadTime = Date.now() - startTime;
      
      console.log(`⏱️ ${viewport.name} 로딩: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);
      
      // 메르's Pick 섹션이 모든 화면에서 보이는지 확인
      await expect(page.locator('text=메르\'s Pick')).toBeVisible();
      
      // 레이아웃 깨짐 확인 (가로 스크롤 없어야 함)
      const bodyWidth = await page.locator('body').boundingBox();
      if (bodyWidth) {
        expect(bodyWidth.width).toBeLessThanOrEqual(viewport.width + 20); // 20px 여유
      }
      
      console.log(`✅ ${viewport.name} 반응형 정상`);
    }
    
    console.log('🎯 반응형 테스트 완료');
  });

  test('성능 종합 검증 및 Core Web Vitals', async ({ page }) => {
    console.log('⚡ 성능 종합 검증');
    
    // 메인 페이지 성능 측정
    const startTime = Date.now();
    await page.goto('http://localhost:3004');
    
    // LCP (Largest Contentful Paint) 시뮬레이션
    await page.waitForLoadState('networkidle');
    const totalLoadTime = Date.now() - startTime;
    
    console.log(`🎯 전체 로딩 시간: ${totalLoadTime}ms`);
    
    // CLAUDE.md 성능 기준 검증
    expect(totalLoadTime).toBeLessThan(3000); // 절대 한계
    
    if (totalLoadTime < 1500) {
      console.log('🚀 우수한 성능 (1.5초 이내)');
    } else if (totalLoadTime < 2000) {
      console.log('✅ 양호한 성능 (2초 이내)');
    } else {
      console.log('⚠️ 성능 개선 필요 (2초 초과)');
    }
    
    // 이미지 로딩 확인
    const images = page.locator('img');
    const imageCount = await images.count();
    console.log(`🖼️ 이미지 수: ${imageCount}개`);
    
    // JavaScript 에러 없음 확인
    let jsErrors = 0;
    page.on('pageerror', error => {
      jsErrors++;
      console.log('❌ JavaScript 에러:', error.message);
    });
    
    await page.waitForTimeout(2000); // 2초 대기
    expect(jsErrors).toBe(0);
    
    console.log('🎯 성능 검증 완료');
  });
});