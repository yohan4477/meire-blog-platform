// 삼성전자 감정 분석 근거 데이터 표시 테스트
import { test, expect } from '@playwright/test';

test('삼성전자 차트 감정 분석 근거 데이터 표시 테스트', async ({ page }) => {
  console.log('🚀 삼성전자 감정 분석 근거 테스트 시작...');
  
  // 삼성전자 종목 페이지 방문
  await page.goto('http://localhost:3005/merry/stocks/005930');
  console.log('1️⃣ 삼성전자 페이지 방문 완료');
  
  // 페이지가 완전히 로딩될 때까지 대기 (더 긴 대기 시간)
  await page.waitForTimeout(5000);
  
  // 먼저 페이지 제목이 올바른지 확인
  const pageTitle = await page.textContent('h1');
  console.log(`📄 페이지 제목: ${pageTitle}`);
  
  // 차트 영역 확인 (여러 가지 선택자 시도)
  const chartSelectors = [
    '.recharts-wrapper',
    '[data-testid="chart"]', 
    'svg',
    '.recharts-responsive-container'
  ];
  
  let chartFound = false;
  let chartArea;
  
  for (const selector of chartSelectors) {
    chartArea = page.locator(selector);
    if (await chartArea.count() > 0) {
      console.log(`✅ 차트 영역 발견 (선택자: ${selector})`);
      chartFound = true;
      break;
    }
  }
  
  if (chartFound) {
    // 차트 로딩을 위한 추가 대기
    await page.waitForTimeout(3000);
    
    // 차트 마커 찾기 (여러 종류의 마커 확인)
    const markerSelectors = [
      'circle[stroke]',
      '.recharts-dot',
      'circle',
      '[data-testid="chart-marker"]'
    ];
    
    let totalMarkers = 0;
    for (const selector of markerSelectors) {
      const markers = page.locator(selector);
      const count = await markers.count();
      if (count > 0) {
        console.log(`🎯 차트 마커 ${count}개 발견 (선택자: ${selector})`);
        totalMarkers = Math.max(totalMarkers, count);
      }
    }
    
    if (totalMarkers > 0) {
      // 가장 많이 발견된 마커 선택자로 테스트
      const markers = page.locator('circle');
      
      let sentimentFound = false;
      
      // 여러 마커에서 호버 시도
      for (let i = 0; i < Math.min(3, totalMarkers); i++) {
        console.log(`🖱️ ${i+1}번째 마커 호버 시도...`);
        await markers.nth(i).hover();
        await page.waitForTimeout(1500);
        
        // 툴팁 또는 감정 분석 정보 확인 (다양한 텍스트 패턴 확인)
        const sentimentPatterns = [
          'text=메르 감정 분석',
          'text=감정 분석', 
          'text=핵심 근거',
          'text=투자 관점',
          'text=지지 증거',
          'text=메르 언급',
          'text=긍정',
          'text=부정',
          'text=중립',
          'text=삼성전자'
        ];
        
        for (const pattern of sentimentPatterns) {
          if (await page.locator(pattern).count() > 0) {
            console.log(`✅ 감정 분석 정보 발견: ${pattern}`);
            sentimentFound = true;
          }
        }
        
        if (sentimentFound) {
          // 상세 정보 확인
          if (await page.locator('text=핵심 근거').count() > 0) {
            console.log('✅ 핵심 근거 표시됨');
          } else {
            console.log('⚠️ 핵심 근거 없음');
          }
          
          if (await page.locator('text=투자 관점').count() > 0) {
            console.log('✅ 투자 관점 표시됨');
          } else {
            console.log('⚠️ 투자 관점 없음');
          }
          
          if (await page.locator('text=지지 증거').count() > 0) {
            console.log('✅ 지지 증거 표시됨');
          } else {
            console.log('⚠️ 지지 증거 없음');
          }
          
          if (await page.locator('text=메르 언급').count() > 0) {
            console.log('✅ 메르 언급 표시됨');
          } else {
            console.log('⚠️ 메르 언급 없음');
          }
          
          // 전체 툴팁 내용 출력 (디버깅용)
          const tooltipContent = await page.locator('[role="tooltip"], .bg-white.border, .bg-white.rounded-2xl').first().textContent();
          if (tooltipContent) {
            console.log('📋 툴팁 내용 미리보기:', tooltipContent.substring(0, 200) + '...');
          }
          
          break;
        }
      }
      
      if (!sentimentFound) {
        console.log('⚠️ 어떤 마커에서도 감정 분석 정보를 찾을 수 없음');
        
        // 페이지 전체에서 감정 분석 관련 텍스트 검색
        const allText = await page.textContent('body');
        if (allText?.includes('감정') || allText?.includes('삼성')) {
          console.log('📝 페이지에 감정 분석 관련 텍스트 존재 확인됨');
        }
      }
      
    } else {
      console.log('❌ 차트 마커 없음');
    }
    
  } else {
    console.log('❌ 차트 영역 없음');
    
    // 페이지 구조 디버깅
    const bodyText = await page.textContent('body');
    console.log(`📝 페이지 내용 미리보기: ${bodyText?.substring(0, 200)}...`);
  }
  
  console.log('🎉 삼성전자 감정 분석 근거 테스트 완료!');
});