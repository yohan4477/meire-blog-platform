const { chromium } = require('playwright');

async function checkBlueCirclesCurrent() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 콘솔 로그 캡처
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Processing marker') || text.includes('sentiments') || text.includes('posts')) {
      console.log('🖥️', text);
    }
  });
  
  try {
    console.log('🚀 삼성전자 1M 차트 파란색 원 확인...');
    
    await page.goto('http://localhost:3012/merry/stocks/005930', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('⏳ 페이지 로딩 대기...');
    await page.waitForTimeout(3000);
    
    console.log('📊 1M 기간 선택...');
    await page.locator('button:has-text("1M")').click();
    
    console.log('⏳ 차트 데이터 로딩 대기...');
    await page.waitForTimeout(5000);
    
    // 현재 차트의 모든 마커 분석
    const markerAnalysis = await page.evaluate(() => {
      const circles = document.querySelectorAll('circle[stroke]');
      const markers = [];
      
      circles.forEach((circle, index) => {
        const stroke = circle.getAttribute('stroke');
        const cx = parseFloat(circle.getAttribute('cx') || '0');
        const cy = parseFloat(circle.getAttribute('cy') || '0');
        const fill = circle.getAttribute('fill');
        
        // 부모 요소에서 데이터 찾기
        let parentData = null;
        let currentElement = circle.parentElement;
        while (currentElement && !parentData) {
          if (currentElement.getAttribute('data-testid')) {
            parentData = currentElement.getAttribute('data-testid');
            break;
          }
          currentElement = currentElement.parentElement;
        }
        
        markers.push({
          index,
          stroke,
          fill,
          x: cx,
          y: cy,
          isBlue: stroke === '#3742fa',
          isGreen: stroke === '#16a34a',
          isRed: stroke === '#dc2626',
          parentData
        });
      });
      
      // X 좌표 순으로 정렬 (시간순)
      markers.sort((a, b) => a.x - b.x);
      
      return {
        total: markers.length,
        blueMarkers: markers.filter(m => m.isBlue),
        greenMarkers: markers.filter(m => m.isGreen),
        redMarkers: markers.filter(m => m.isRed),
        colorDistribution: markers.reduce((acc, m) => {
          acc[m.stroke] = (acc[m.stroke] || 0) + 1;
          return acc;
        }, {}),
        allMarkers: markers
      };
    });
    
    console.log('\n🎨 차트 마커 분석 결과:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('총 마커 개수:', markerAnalysis.total);
    console.log('파란색 마커 개수:', markerAnalysis.blueMarkers.length);
    console.log('초록색 마커 개수:', markerAnalysis.greenMarkers.length);
    console.log('빨간색 마커 개수:', markerAnalysis.redMarkers.length);
    console.log('색상 분포:', markerAnalysis.colorDistribution);
    
    if (markerAnalysis.blueMarkers.length > 0) {
      console.log('\n🔵 파란색 마커 상세 정보:');
      markerAnalysis.blueMarkers.forEach((marker, index) => {
        console.log(`  ${index + 1}. X: ${marker.x.toFixed(1)}, Y: ${marker.y.toFixed(1)}, Fill: ${marker.fill}`);
      });
      
      // 파란색 마커에 호버해서 툴팁 확인
      for (let i = 0; i < Math.min(2, markerAnalysis.blueMarkers.length); i++) {
        const blueMarker = markerAnalysis.blueMarkers[i];
        console.log(`\n🔍 파란색 마커 ${i + 1} 툴팁 확인...`);
        
        // 해당 위치의 circle 엘리먼트 찾기
        const markerElement = page.locator(`circle[stroke="#3742fa"]`).nth(i);
        await markerElement.hover();
        await page.waitForTimeout(1000);
        
        // 툴팁 내용 확인
        const tooltipInfo = await page.evaluate(() => {
          const tooltips = document.querySelectorAll('[role="tooltip"], .recharts-tooltip-wrapper, .recharts-default-tooltip');
          let tooltipText = '';
          
          tooltips.forEach(tooltip => {
            if (tooltip.style.display !== 'none' && tooltip.offsetHeight > 0) {
              tooltipText += tooltip.textContent || '';
            }
          });
          
          return tooltipText.trim();
        });
        
        console.log(`  툴팁 내용: "${tooltipInfo}"`);
      }
    }
    
    // API에서 현재 데이터 확인
    const apiData = await page.evaluate(async () => {
      try {
        const timestamp = Date.now();
        
        // Posts API 호출
        const postsResponse = await fetch(`/api/merry/stocks/005930/posts?limit=100&period=1mo&t=${timestamp}`);
        const postsData = await postsResponse.json();
        
        // Sentiments API 호출
        const sentimentsResponse = await fetch(`/api/merry/stocks/005930/sentiments?period=1mo&t=${timestamp}`);
        const sentimentsData = await sentimentsResponse.json();
        
        // 날짜별 데이터 매핑
        const postsByDate = {};
        if (postsData.data?.posts) {
          postsData.data.posts.forEach(post => {
            const date = post.created_date.split(' ')[0];
            if (!postsByDate[date]) postsByDate[date] = [];
            postsByDate[date].push(post);
          });
        }
        
        return {
          totalPosts: postsData.data?.posts?.length || 0,
          postDates: Object.keys(postsByDate),
          sentimentDates: Object.keys(sentimentsData.sentimentByDate || {}),
          sentimentSummary: sentimentsData.summary || {}
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('\n📊 API 데이터 확인:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('총 포스트 개수:', apiData.totalPosts);
    console.log('포스트가 있는 날짜:', apiData.postDates);
    console.log('감정분석이 있는 날짜:', apiData.sentimentDates);
    console.log('감정분석 요약:', apiData.sentimentSummary);
    
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await browser.close();
  }
}

checkBlueCirclesCurrent();