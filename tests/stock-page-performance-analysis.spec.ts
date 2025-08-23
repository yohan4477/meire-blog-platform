import { test, expect } from '@playwright/test';
import './setup/test-cleanup';

test('종목 페이지 구성별 로딩 타임 분석', async ({ page }) => {
  console.log('📊 종목 페이지 성능 분석 시작...');
  
  const measurements: Record<string, number> = {};
  
  // 페이지 로딩 시작
  const pageStartTime = Date.now();
  
  // 네트워크 요청 모니터링 설정
  const apiResponses: Record<string, number> = {};
  
  page.on('response', response => {
    const url = response.url();
    const responseTime = Date.now();
    
    if (url.includes('/api/merry/stocks/TSLA')) {
      apiResponses['stock_info'] = responseTime;
    } else if (url.includes('/api/stock-price')) {
      apiResponses['stock_price'] = responseTime;
    } else if (url.includes('/api/merry/stocks/TSLA/posts')) {
      apiResponses['related_posts'] = responseTime;
    } else if (url.includes('/api/merry/stocks/TSLA/sentiments')) {
      apiResponses['sentiment_analysis'] = responseTime;
    }
  });
  
  // Tesla 페이지로 이동
  console.log('🚀 Tesla 페이지 로딩 시작...');
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  
  // 페이지 기본 로딩 대기
  await page.waitForLoadState('networkidle');
  const pageLoadTime = Date.now() - pageStartTime;
  measurements['전체_페이지_로딩'] = pageLoadTime;
  
  console.log(`⏱️ 전체 페이지 로딩: ${pageLoadTime}ms`);
  
  // 1. 종목 헤더 섹션 체크
  console.log('📈 종목 헤더 섹션 분석...');
  const headerStartTime = Date.now();
  
  // 종목 이름이 표시되기까지 대기
  await page.waitForSelector('text=테슬라', { timeout: 10000 });
  await page.waitForSelector('text=TSLA', { timeout: 5000 });
  
  // 현재가 정보가 표시되기까지 대기
  try {
    await page.waitForSelector('[data-testid="current-price"], .current-price, text=/\\$[0-9]/', { timeout: 5000 });
  } catch (e) {
    console.log('⚠️ 현재가 표시 대기 타임아웃');
  }
  
  const headerLoadTime = Date.now() - headerStartTime;
  measurements['종목_헤더_섹션'] = headerLoadTime;
  console.log(`📊 종목 헤더 섹션: ${headerLoadTime}ms`);
  
  // 2. 차트 섹션 체크
  console.log('📈 차트 섹션 분석...');
  const chartStartTime = Date.now();
  
  // 차트 컨테이너가 표시되기까지 대기 (더 구체적인 선택자 사용)
  try {
    await page.waitForSelector('.recharts-wrapper', { timeout: 15000 });
    console.log('✅ Recharts wrapper found');
  } catch (e) {
    console.log('⚠️ Recharts wrapper not found, trying ResponsiveContainer');
    await page.waitForSelector('[class*="ResponsiveContainer"]', { timeout: 10000 });
  }
  
  // 차트 데이터 로딩 완료 대기 (Line 요소가 렌더링될 때까지)
  await page.waitForFunction(() => {
    // Recharts의 Line 요소를 찾기
    const lineElements = document.querySelectorAll('.recharts-line, .recharts-line-curve');
    const svgElements = document.querySelectorAll('svg');
    console.log(`Found ${lineElements.length} line elements, ${svgElements.length} SVG elements`);
    return lineElements.length > 0 || svgElements.length > 0;
  }, { timeout: 15000 });
  
  const chartLoadTime = Date.now() - chartStartTime;
  measurements['차트_섹션'] = chartLoadTime;
  console.log(`📈 차트 섹션: ${chartLoadTime}ms`);
  
  // 3. 감정 분석 마커 체크
  console.log('🎯 감정 분석 마커 분석...');
  const sentimentStartTime = Date.now();
  
  // 감정 분석 마커들이 표시되기까지 대기 (ReferenceDot 요소)
  try {
    // Recharts의 ReferenceDot 요소 대기 (더 정확한 선택자)
    await page.waitForSelector('.recharts-reference-dot, circle[stroke]', { timeout: 8000 });
    
    // 마커 개수 확인 (다양한 선택자로 확인)
    const referenceDots = await page.locator('.recharts-reference-dot').count();
    const circleMarkers = await page.locator('circle[stroke]').count();
    const totalMarkers = Math.max(referenceDots, circleMarkers);
    
    console.log(`🔵 차트에서 발견된 마커 개수: ${totalMarkers}개 (reference-dot: ${referenceDots}, circles: ${circleMarkers})`);
    
    // 마커가 하나도 없으면 차트 데이터 확인
    if (totalMarkers === 0) {
      const hasData = await page.evaluate(() => {
        const dataElements = document.querySelectorAll('[data-testid*="chart"], .recharts-line-dots circle');
        return dataElements.length;
      });
      console.log(`📊 차트 데이터 요소: ${hasData}개 발견`);
    }
    
  } catch (e) {
    console.log('⚠️ 감정 분석 마커 로딩 타임아웃 - 마커가 없을 수 있음');
    
    // 마커가 없어도 차트 자체가 로딩되었는지 확인
    const svgExists = await page.locator('svg').count() > 0;
    console.log(`📈 차트 SVG 존재 여부: ${svgExists}`);
  }
  
  const sentimentLoadTime = Date.now() - sentimentStartTime;
  measurements['감정_분석_마커'] = sentimentLoadTime;
  console.log(`🎯 감정 분석 마커: ${sentimentLoadTime}ms`);
  
  // 4. 관련 포스트 섹션 체크
  console.log('📝 관련 포스트 섹션 분석...');
  const postsStartTime = Date.now();
  
  // 관련 포스트가 표시되기까지 대기
  try {
    await page.waitForSelector('[data-testid="related-posts"], .related-posts, text=관련 포스트', { timeout: 5000 });
    
    // 포스트 항목들이 로딩되기까지 대기
    await page.waitForSelector('.post-item, [class*="post"]', { timeout: 3000 });
    
    const postCount = await page.locator('.post-item, [class*="post"]').count();
    console.log(`📄 로딩된 관련 포스트 개수: ${postCount}개`);
    
  } catch (e) {
    console.log('⚠️ 관련 포스트 로딩 타임아웃');
  }
  
  const postsLoadTime = Date.now() - postsStartTime;
  measurements['관련_포스트_섹션'] = postsLoadTime;
  console.log(`📝 관련 포스트 섹션: ${postsLoadTime}ms`);
  
  // 5. API 응답 시간 분석
  console.log('🌐 API 응답 시간 분석...');
  
  // 추가 API 호출을 위해 페이지 새로고침
  const apiTestStartTime = Date.now();
  const apiTimings: Record<string, number> = {};
  
  // API 응답 시간 측정을 위한 네트워크 리스너
  page.on('response', response => {
    const url = response.url();
    const now = Date.now();
    
    if (url.includes('/api/merry/stocks/TSLA') && !url.includes('posts') && !url.includes('sentiments')) {
      apiTimings['종목_정보_API'] = now - apiTestStartTime;
    } else if (url.includes('/api/stock-price?ticker=TSLA')) {
      apiTimings['주가_차트_API'] = now - apiTestStartTime;
    } else if (url.includes('/api/merry/stocks/TSLA/sentiments')) {
      apiTimings['감정_분석_API'] = now - apiTestStartTime;
    } else if (url.includes('/api/merry/stocks/TSLA/posts')) {
      apiTimings['관련_포스트_API'] = now - apiTestStartTime;
    }
  });
  
  // 페이지 새로고침으로 API 호출 측정
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  // 결과 출력
  console.log('\n📊 === 종목 페이지 성능 분석 결과 ===');
  console.log('⏱️ 섹션별 로딩 시간:');
  
  for (const [section, time] of Object.entries(measurements)) {
    const status = time > 3000 ? '🔴' : time > 1500 ? '🟡' : '🟢';
    console.log(`  ${status} ${section}: ${time}ms`);
  }
  
  console.log('\n🌐 API 응답 시간:');
  for (const [api, time] of Object.entries(apiTimings)) {
    const status = time > 500 ? '🔴' : time > 200 ? '🟡' : '🟢';
    console.log(`  ${status} ${api}: ${time}ms`);
  }
  
  // 성능 기준 검증
  console.log('\n🎯 성능 기준 검증:');
  const totalTime = measurements['전체_페이지_로딩'];
  if (totalTime > 3000) {
    console.log(`🔴 FAIL: 전체 로딩시간 ${totalTime}ms > 3초 기준 위반!`);
  } else {
    console.log(`🟢 PASS: 전체 로딩시간 ${totalTime}ms < 3초 기준 만족`);
  }
  
  // 병목 지점 분석
  console.log('\n🔍 병목 지점 분석:');
  const sortedMeasurements = Object.entries(measurements)
    .sort(([,a], [,b]) => b - a);
  
  console.log('⚠️ 가장 느린 섹션들:');
  sortedMeasurements.slice(0, 3).forEach(([section, time], index) => {
    console.log(`  ${index + 1}. ${section}: ${time}ms`);
  });
  
  // 스크린샷 저장
  await page.screenshot({ 
    path: 'test-results/stock-page-performance-analysis.png', 
    fullPage: true 
  });
  
  console.log('\n✅ 성능 분석 완료! 스크린샷 저장됨.');
});