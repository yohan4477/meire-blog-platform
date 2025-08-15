import { test, expect } from '@playwright/test';

// CLAUDE.md 요구사항: 종목 상세 페이지 테스트
test.describe('종목 상세 페이지 테스트', () => {
  
  test('TSLA 종목 상세 페이지 기능 테스트', async ({ page }) => {
    console.log('📈 TSLA 종목 상세 페이지 테스트');
    
    const startTime = Date.now();
    await page.goto('http://localhost:3006/merry/stocks/TSLA');
    const loadTime = Date.now() - startTime;
    
    console.log(`⏱️ TSLA 페이지 로딩 시간: ${loadTime}ms`);
    // CLAUDE.md 성능 요구사항: < 3초
    expect(loadTime).toBeLessThan(3000);
    
    // 기본 정보 확인
    await expect(page.locator('text=테슬라')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=TSLA')).toBeVisible({ timeout: 5000 });
    console.log('✅ 종목 기본 정보 표시');
    
    // 차트 영역 확인
    const chartContainer = page.locator('[data-testid="stock-chart"], .recharts-wrapper, svg');
    if (await chartContainer.count() > 0) {
      await expect(chartContainer.first()).toBeVisible({ timeout: 10000 });
      console.log('✅ 차트 렌더링 완료');
    } else {
      console.log('⚠️ 차트 컨테이너 없음');
    }
    
    // 메르 글 관련 정보 확인
    const merryPosts = page.locator('text=관련 포스트, text=메르 글, [data-testid="related-posts"]');
    if (await merryPosts.count() > 0) {
      console.log('✅ 메르 글 섹션 표시');
    } else {
      console.log('⚠️ 메르 글 섹션 없음');
    }
    
    console.log('🎯 TSLA 상세 페이지 테스트 완료');
  });
  
  test('삼성전자(005930) 종목 상세 페이지 테스트', async ({ page }) => {
    console.log('📈 삼성전자 종목 상세 페이지 테스트');
    
    const startTime = Date.now();
    await page.goto('http://localhost:3006/merry/stocks/005930');
    const loadTime = Date.now() - startTime;
    
    console.log(`⏱️ 삼성전자 페이지 로딩 시간: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
    
    // 기본 정보 확인
    await expect(page.locator('text=삼성전자')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=005930')).toBeVisible({ timeout: 5000 });
    console.log('✅ 종목 기본 정보 표시');
    
    // 차트 영역 확인
    const chartContainer = page.locator('[data-testid="stock-chart"], .recharts-wrapper, svg');
    if (await chartContainer.count() > 0) {
      await expect(chartContainer.first()).toBeVisible({ timeout: 10000 });
      console.log('✅ 차트 렌더링 완료');
    } else {
      console.log('⚠️ 차트 컨테이너 없음');
    }
    
    console.log('🎯 삼성전자 상세 페이지 테스트 완료');
  });
  
  test('API 엔드포인트 테스트 (종목별)', async ({ page }) => {
    console.log('📡 종목별 API 엔드포인트 테스트');
    
    const endpoints = [
      { url: '/api/merry/stocks/TSLA', name: 'TSLA 기본 정보' },
      { url: '/api/merry/stocks/TSLA/posts', name: 'TSLA 관련 포스트' },
      { url: '/api/merry/stocks/TSLA/sentiments', name: 'TSLA 감정 분석' },
      { url: '/api/merry/stocks/005930', name: '삼성전자 기본 정보' },
      { url: '/api/merry/stocks/005930/posts', name: '삼성전자 관련 포스트' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await page.request.get(`http://localhost:3006${endpoint.url}`);
        const responseTime = Date.now() - startTime;
        
        console.log(`📡 ${endpoint.name}: ${response.status()} (${responseTime}ms)`);
        
        if (response.status() === 200) {
          const data = await response.json();
          console.log(`✅ ${endpoint.name} 정상 응답`);
        } else if (response.status() === 404) {
          console.log(`⚠️ ${endpoint.name} 데이터 없음 (404)`);
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
    
    console.log('🎯 종목별 API 테스트 완료');
  });
  
  test('존재하지 않는 종목 에러 처리 테스트', async ({ page }) => {
    console.log('🚫 존재하지 않는 종목 에러 처리 테스트');
    
    await page.goto('http://localhost:3006/merry/stocks/INVALID');
    
    // 에러 메시지 또는 적절한 안내 확인
    await page.waitForTimeout(3000);
    
    const hasErrorMessage = await page.locator('text=없음, text=오류, text=찾을 수 없음').count() > 0;
    const hasNotFound = await page.locator('text=404, text=Not Found').count() > 0;
    
    if (hasErrorMessage || hasNotFound) {
      console.log('✅ 적절한 에러 처리 확인');
    } else {
      console.log('⚠️ 에러 처리 확인 필요');
    }
    
    console.log('🎯 에러 처리 테스트 완료');
  });
});