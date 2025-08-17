const { chromium } = require('playwright');

async function debugChartDataMapping() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // 콘솔 로그 캡처
  page.on('console', msg => {
    if (msg.text().includes('🚀') || 
        msg.text().includes('📅') || 
        msg.text().includes('🎨') ||
        msg.text().includes('🔍') ||
        msg.text().includes('⚠️') ||
        msg.text().includes('✅') ||
        msg.text().includes('❌')) {
      console.log('🖥️ Browser:', msg.text());
    }
  });
  
  try {
    console.log('🚀 삼성전자 페이지로 이동...');
    await page.goto('http://localhost:3012/merry/stocks/005930', { waitUntil: 'networkidle' });
    
    console.log('⏳ 페이지 로딩 대기...');
    await page.waitForTimeout(3000);
    
    console.log('📊 3M 기간 선택...');
    await page.locator('button:has-text("3M")').click();
    
    console.log('⏳ 차트 및 데이터 로딩 대기...');
    await page.waitForTimeout(8000);
    
    // 브라우저에서 실제 데이터 구조 분석
    const chartDataAnalysis = await page.evaluate(() => {
      // 차트 데이터에 접근 (React DevTools 없이)
      const chartWrapper = document.querySelector('.recharts-wrapper');
      if (!chartWrapper) {
        return { error: 'Chart not found' };
      }
      
      // 마커 분석
      const circles = document.querySelectorAll('circle[stroke]');
      const markerData = [];
      
      circles.forEach((circle, index) => {
        const stroke = circle.getAttribute('stroke');
        const cx = circle.getAttribute('cx') || circle.getAttribute('x');
        const cy = circle.getAttribute('cy') || circle.getAttribute('y');
        
        if (stroke && stroke !== '#ffffff') {
          markerData.push({
            index,
            stroke,
            x: cx,
            y: cy,
            strokeWidth: circle.getAttribute('stroke-width')
          });
        }
      });
      
      // 색상별 그룹화
      const colorGroups = {};
      markerData.forEach(marker => {
        if (!colorGroups[marker.stroke]) {
          colorGroups[marker.stroke] = [];
        }
        colorGroups[marker.stroke].push(marker);
      });
      
      return {
        totalMarkers: markerData.length,
        colorGroups: colorGroups,
        blueMarkers: colorGroups['#3742fa']?.length || 0,
        greenMarkers: colorGroups['#16a34a']?.length || 0,
        redMarkers: colorGroups['#dc2626']?.length || 0,
        grayMarkers: colorGroups['#6b7280']?.length || 0
      };
    });
    
    console.log('\\n📊 차트 데이터 분석:');
    console.log(`총 마커: ${chartDataAnalysis.totalMarkers}개`);
    console.log(`파란색 마커: ${chartDataAnalysis.blueMarkers}개`);
    console.log(`초록색 마커: ${chartDataAnalysis.greenMarkers}개`);
    console.log(`빨간색 마커: ${chartDataAnalysis.redMarkers}개`);
    console.log(`회색 마커: ${chartDataAnalysis.grayMarkers}개`);
    
    // API 데이터와 대조 분석
    const apiComparison = await page.evaluate(async () => {
      try {
        // Posts API 호출
        const postsResponse = await fetch('/api/merry/stocks/005930/posts?limit=100&offset=0&period=3mo');
        const postsData = await postsResponse.json();
        
        // Sentiment API 호출  
        const sentimentResponse = await fetch('/api/merry/stocks/005930/sentiments?period=3mo');
        const sentimentData = await sentimentResponse.json();
        
        // Stock Price API 호출
        const priceResponse = await fetch('/api/stock-price?ticker=005930&period=3M');
        const priceData = await priceResponse.json();
        
        return {
          posts: {
            total: postsData.data?.total || 0,
            count: postsData.data?.posts?.length || 0,
            dates: postsData.data?.posts?.map(p => p.created_date.split(' ')[0]) || []
          },
          sentiments: {
            totalDates: Object.keys(sentimentData.sentimentByDate || {}).length,
            analyzedMentions: sentimentData.analyzedMentions || 0,
            dates: Object.keys(sentimentData.sentimentByDate || {})
          },
          prices: {
            count: priceData.prices?.length || 0,
            dateRange: priceData.prices ? {
              start: priceData.prices[0]?.date,
              end: priceData.prices[priceData.prices.length - 1]?.date
            } : null
          }
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('\\n🌐 API 데이터 비교:');
    console.log(`📝 Posts: ${apiComparison.posts.total}개 총, ${apiComparison.posts.count}개 로드`);
    console.log(`🎯 Sentiments: ${apiComparison.sentiments.totalDates}개 날짜, ${apiComparison.sentiments.analyzedMentions}개 분석`);
    console.log(`📈 Prices: ${apiComparison.prices.count}개 가격 데이터`);
    
    if (apiComparison.prices.dateRange) {
      console.log(`📅 가격 데이터 범위: ${apiComparison.prices.dateRange.start} ~ ${apiComparison.prices.dateRange.end}`);
    }
    
    // 데이터 매핑 불일치 확인
    const unmappedDates = apiComparison.posts.dates.filter(postDate => 
      !apiComparison.sentiments.dates.includes(postDate)
    );
    
    if (unmappedDates.length > 0) {
      console.log(`\\n⚠️ 감정 분석이 없는 포스트 날짜 ${unmappedDates.length}개:`);
      unmappedDates.slice(0, 10).forEach(date => console.log(`  - ${date}`));
    }
    
  } catch (error) {
    console.error('❌ 디버깅 오류:', error);
  } finally {
    await browser.close();
  }
}

debugChartDataMapping();