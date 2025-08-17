const { chromium } = require('playwright');

async function checkAug6AfterCacheClear() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-http-cache', '--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    bypassCSP: true,
    ignoreHTTPSErrors: true,
    // 캐시 완전 비활성화
    extraHTTPHeaders: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  
  const page = await context.newPage();
  
  // 콘솔 로그 캡처
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('2025-08-06') || text.includes('Processing marker')) {
      console.log('🖥️', text);
    }
  });
  
  try {
    console.log('🚀 캐시 클리어 후 8월 6일 확인...');
    
    // 강제 새로고침으로 페이지 로드
    await page.goto('http://localhost:3012/merry/stocks/005930', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('⏳ 페이지 완전 로딩 대기...');
    await page.waitForTimeout(3000);
    
    console.log('🔄 강제 새로고침 (Ctrl+Shift+R)...');
    await page.keyboard.press('Control+Shift+R');
    await page.waitForTimeout(5000);
    
    console.log('📊 1M 기간 선택...');
    await page.locator('button:has-text("1M")').click();
    
    console.log('⏳ 차트 데이터 로딩 대기...');
    await page.waitForTimeout(8000);
    
    // API 직접 호출로 8월 6일 데이터 확인
    const aug6Data = await page.evaluate(async () => {
      try {
        // 캐시 버스터 추가
        const timestamp = Date.now();
        
        // Posts API 호출 (캐시 무효화)
        const postsResponse = await fetch(`/api/merry/stocks/005930/posts?limit=100&offset=0&period=1mo&t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        const postsData = await postsResponse.json();
        
        // Sentiment API 호출 (캐시 무효화)
        const sentimentResponse = await fetch(`/api/merry/stocks/005930/sentiments?period=1mo&t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        const sentimentData = await sentimentResponse.json();
        
        // Stock Price API 호출 (캐시 무효화)
        const stockResponse = await fetch(`/api/stock-price?ticker=005930&period=1M&t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        const stockData = await stockResponse.json();
        
        // 8월 6일 데이터 추출
        const aug6Posts = postsData.data?.posts?.filter(p => 
          p.created_date?.startsWith('2025-08-06')
        ) || [];
        
        const aug6Sentiments = sentimentData.sentimentByDate?.['2025-08-06'] || null;
        const aug6Stock = stockData.prices?.find(p => p.date === '2025-08-06') || null;
        
        // postsByDate 재구성
        const postsByDate = {};
        if (postsData.data?.posts) {
          postsData.data.posts.forEach(post => {
            const dateStr = post.created_date.split(' ')[0];
            if (!postsByDate[dateStr]) {
              postsByDate[dateStr] = [];
            }
            postsByDate[dateStr].push(post);
          });
        }
        
        return {
          aug6Posts,
          aug6PostsFromMapping: postsByDate['2025-08-06'] || [],
          aug6Sentiments,
          aug6Stock,
          allDates: Object.keys(postsByDate),
          totalPosts: postsData.data?.posts?.length || 0
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('\n📊 8월 6일 데이터 (캐시 클리어 후):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Posts API에서 8월 6일:', aug6Data.aug6Posts?.length || 0, '개');
    console.log('postsByDate 매핑에서 8월 6일:', aug6Data.aug6PostsFromMapping?.length || 0, '개');
    console.log('Sentiment API에서 8월 6일:', aug6Data.aug6Sentiments ? 'EXISTS' : 'NOT EXISTS');
    console.log('Stock Price에서 8월 6일:', aug6Data.aug6Stock ? 'EXISTS' : 'NOT EXISTS');
    console.log('전체 포스트 개수:', aug6Data.totalPosts);
    console.log('포스트가 있는 날짜들:', aug6Data.allDates);
    
    // 차트에서 실제 마커 개수 확인
    const markerInfo = await page.evaluate(() => {
      const circles = document.querySelectorAll('circle[stroke]');
      const markers = [];
      
      circles.forEach((circle) => {
        const stroke = circle.getAttribute('stroke');
        const cx = parseFloat(circle.getAttribute('cx') || '0');
        const cy = parseFloat(circle.getAttribute('cy') || '0');
        
        markers.push({
          stroke,
          x: cx,
          y: cy,
          isBlue: stroke === '#3742fa'
        });
      });
      
      // X 좌표 순으로 정렬
      markers.sort((a, b) => a.x - b.x);
      
      return {
        total: markers.length,
        blueCount: markers.filter(m => m.isBlue).length,
        colors: markers.reduce((acc, m) => {
          acc[m.stroke] = (acc[m.stroke] || 0) + 1;
          return acc;
        }, {})
      };
    });
    
    console.log('\n🎨 차트 마커 상태:');
    console.log('총 마커 개수:', markerInfo.total);
    console.log('파란색 마커 개수:', markerInfo.blueCount);
    console.log('색상 분포:', markerInfo.colors);
    
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await browser.close();
  }
}

checkAug6AfterCacheClear();