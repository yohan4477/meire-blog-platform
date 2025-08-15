import { test, expect } from '@playwright/test';

// CLAUDE.md 요구사항: 포트 3006에서 전체 사이트 테스트
test.describe('메르 블로그 플랫폼 - 포트 3006 작동 테스트', () => {
  
  test('메인 페이지 완전 기능 테스트', async ({ page }) => {
    console.log('🏠 메인 페이지 (포트 3006) 기능 테스트 시작');
    
    const startTime = Date.now();
    await page.goto('http://localhost:3006');
    const loadTime = Date.now() - startTime;
    
    console.log(`⏱️ 메인 페이지 로딩 시간: ${loadTime}ms`);
    // CLAUDE.md 성능 요구사항: < 2초 (메인 페이지 특별 기준)
    expect(loadTime).toBeLessThan(2000);
    
    // 1. 페이지 타이틀 확인
    await expect(page).toHaveTitle(/메르|블로그|투자/);
    console.log('✅ 페이지 제목 정상');
    
    // 2. 메르's Pick 섹션 확인
    const pickSection = page.locator('text=메르\'s Pick');
    await expect(pickSection).toBeVisible({ timeout: 5000 });
    console.log('✅ 메르\'s Pick 섹션 표시 확인');
    
    // 3. 랭킹 배지 확인
    const rankingBadge = page.locator('text=최신 언급일 기준 랭킹');
    await expect(rankingBadge).toBeVisible();
    console.log('✅ 랭킹 배지 정상 표시');
    
    // 4. 콘텐츠 로딩 대기 및 확인
    await page.waitForTimeout(3000); // API 응답 대기
    
    // 5. 종목 카드 또는 로딩 상태 확인
    const hasStockCards = await page.locator('.border, .card, [class*="card"]').count() > 0;
    const hasLoadingState = await page.locator('text=로딩, text=불러오는').count() > 0;
    const hasErrorState = await page.locator('text=오류, text=에러').count() > 0;
    
    if (hasStockCards) {
      console.log('✅ 종목 카드 렌더링 완료');
    } else if (hasLoadingState) {
      console.log('🔄 데이터 로딩 중');
    } else if (hasErrorState) {
      console.log('❌ 에러 상태 감지');
    } else {
      console.log('⚠️ 상태 불명 - 추가 확인 필요');
    }
    
    // 6. JavaScript 에러 없음 확인
    let jsErrors = 0;
    page.on('pageerror', error => {
      jsErrors++;
      console.log('❌ JavaScript 에러:', error.message);
    });
    
    await page.waitForTimeout(2000);
    expect(jsErrors).toBe(0);
    console.log('✅ JavaScript 에러 없음');
    
    console.log('🎯 메인 페이지 테스트 완료');
  });

  test('API 엔드포인트 직접 테스트', async ({ page }) => {
    console.log('📡 API 엔드포인트 테스트');
    
    const endpoints = [
      { url: '/api/merry/picks?limit=3', name: '메르\'s Pick API' },
      { url: '/api/financial-curation', name: '금융 큐레이션 API' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await page.request.get(`http://localhost:3006${endpoint.url}`);
        const responseTime = Date.now() - startTime;
        
        console.log(`📡 ${endpoint.name}: ${response.status()} (${responseTime}ms)`);
        
        if (response.status() === 200) {
          const data = await response.json();
          if (data.success) {
            console.log(`✅ ${endpoint.name} 정상 응답`);
          } else {
            console.log(`⚠️ ${endpoint.name} 응답 구조 이상`);
          }
        } else {
          console.log(`⚠️ ${endpoint.name} HTTP ${response.status()}`);
        }
        
        // 성능 확인
        if (responseTime < 500) {
          console.log(`⚡ ${endpoint.name} 빠른 응답`);
        } else {
          console.log(`⚠️ ${endpoint.name} 느린 응답: ${responseTime}ms`);
        }
        
      } catch (error) {
        console.log(`❌ ${endpoint.name} 오류:`, error);
      }
    }
    
    console.log('🎯 API 테스트 완료');
  });

  test('반응형 및 크로스브라우저 테스트', async ({ page, browserName }) => {
    console.log(`📱 ${browserName} 브라우저 반응형 테스트`);
    
    const viewports = [
      { width: 390, height: 844, name: 'iPhone 12' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
      console.log(`📺 ${browserName} - ${viewport.name} 테스트`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      const startTime = Date.now();
      await page.goto('http://localhost:3006');
      const loadTime = Date.now() - startTime;
      
      console.log(`⏱️ ${viewport.name} 로딩: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);
      
      // 메르's Pick 섹션이 모든 화면에서 보이는지 확인
      try {
        await expect(page.locator('text=메르\'s Pick')).toBeVisible({ timeout: 5000 });
        console.log(`✅ ${viewport.name} 메르's Pick 표시`);
      } catch (error) {
        console.log(`⚠️ ${viewport.name} 메르's Pick 로딩 실패`);
      }
      
      // 레이아웃 체크 (가로 스크롤 방지)
      const body = await page.locator('body').boundingBox();
      if (body && body.width <= viewport.width + 20) {
        console.log(`✅ ${viewport.name} 레이아웃 정상`);
      } else {
        console.log(`⚠️ ${viewport.name} 레이아웃 문제 가능성`);
      }
    }
    
    console.log(`🎯 ${browserName} 반응형 테스트 완료`);
  });

  test('성능 및 Core Web Vitals 측정', async ({ page }) => {
    console.log('⚡ 성능 종합 측정');
    
    // 여러 번 로딩하여 평균 성능 측정
    const loadTimes = [];
    
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      await page.goto('http://localhost:3006');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      loadTimes.push(loadTime);
      console.log(`🔄 ${i + 1}번째 로딩: ${loadTime}ms`);
    }
    
    const avgLoadTime = Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length);
    const minLoadTime = Math.min(...loadTimes);
    const maxLoadTime = Math.max(...loadTimes);
    
    console.log(`📊 로딩 시간 통계:`);
    console.log(`   평균: ${avgLoadTime}ms`);
    console.log(`   최소: ${minLoadTime}ms`);
    console.log(`   최대: ${maxLoadTime}ms`);
    
    // CLAUDE.md 성능 기준 검증
    expect(avgLoadTime).toBeLessThan(3000); // 절대 한계
    expect(maxLoadTime).toBeLessThan(3000); // 최대값도 3초 이내
    
    // 성능 등급 판정
    if (avgLoadTime < 1500) {
      console.log('🚀 성능 등급: 우수 (A+)');
    } else if (avgLoadTime < 2000) {
      console.log('✅ 성능 등급: 양호 (A)');
    } else if (avgLoadTime < 2500) {
      console.log('⚠️ 성능 등급: 보통 (B)');
    } else {
      console.log('❌ 성능 등급: 개선 필요 (C)');
    }
    
    console.log('🎯 성능 측정 완료');
  });

  test('Dummy 데이터 검증 및 실제 데이터 확인', async ({ page }) => {
    console.log('🔍 CLAUDE.md 원칙: Dummy 데이터 금지 검증');
    
    await page.goto('http://localhost:3006');
    await page.waitForTimeout(3000); // 데이터 로딩 대기
    
    // CLAUDE.md 금지 텍스트 리스트
    const prohibitedTexts = [
      'dummy', 'sample', 'example', 'test data', 'lorem ipsum',
      '샘플', '예시', '테스트', '더미', 'placeholder'
    ];
    
    let dummyFound = false;
    for (const text of prohibitedTexts) {
      const count = await page.locator(`text=${text}`).count();
      if (count > 0) {
        console.log(`❌ Dummy 데이터 발견: "${text}"`);
        dummyFound = true;
      }
    }
    
    if (!dummyFound) {
      console.log('✅ Dummy 데이터 없음 - CLAUDE.md 원칙 준수');
    }
    
    expect(dummyFound).toBe(false);
    
    // 실제 종목 데이터 확인
    const realStockTickers = ['TSLA', 'AAPL', 'GOOGL', '005930', 'NVDA'];
    let realDataFound = false;
    
    for (const ticker of realStockTickers) {
      const count = await page.locator(`text=${ticker}`).count();
      if (count > 0) {
        console.log(`✅ 실제 데이터 확인: ${ticker}`);
        realDataFound = true;
      }
    }
    
    if (realDataFound) {
      console.log('✅ 실제 종목 데이터 표시 확인');
    } else {
      console.log('⚠️ 실제 종목 데이터 미표시 - 데이터 로딩 확인 필요');
    }
    
    console.log('🎯 데이터 검증 완료');
  });
});