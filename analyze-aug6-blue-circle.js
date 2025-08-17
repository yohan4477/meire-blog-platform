const { chromium } = require('playwright');

async function analyzeAug6BlueCircle() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // 8월 6일 관련 로그만 필터링
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('2025-08-06') || 
        text.includes('[2025-08-06]') ||
        text.includes('🎨 Processing marker for 2025-08-06')) {
      console.log('🖥️ Aug 6:', text);
    }
  });
  
  try {
    console.log('🚀 삼성전자 1M 차트에서 8월 6일 분석...');
    await page.goto('http://localhost:3012/merry/stocks/005930', { waitUntil: 'networkidle' });
    
    console.log('📊 1M 기간 선택...');
    await page.locator('button:has-text("1M")').click();
    
    console.log('⏳ 데이터 로딩 대기...');
    await page.waitForTimeout(8000);
    
    console.log('\n📅 8월 6일 API 데이터 직접 조회...');
    
    // 브라우저에서 8월 6일 관련 API 데이터 확인
    const aug6Analysis = await page.evaluate(async () => {
      try {
        // Posts API 호출
        const postsResponse = await fetch('/api/merry/stocks/005930/posts?limit=100&offset=0&period=1mo');
        const postsData = await postsResponse.json();
        
        // Sentiment API 호출  
        const sentimentResponse = await fetch('/api/merry/stocks/005930/sentiments?period=1mo');
        const sentimentData = await sentimentResponse.json();
        
        // 8월 6일 관련 데이터 필터링
        const aug6Posts = postsData.data?.posts?.filter(post => 
          post.created_date?.startsWith('2025-08-06')
        ) || [];
        
        const aug6Sentiments = sentimentData.sentimentByDate?.['2025-08-06'] || null;
        
        return {
          date: '2025-08-06',
          posts: {
            count: aug6Posts.length,
            details: aug6Posts.map(post => ({
              id: post.id,
              title: post.title.substring(0, 50) + '...',
              created_date: post.created_date,
              ticker_mentioned: post.content?.includes('005930') || post.content?.includes('삼성전자')
            }))
          },
          sentiments: {
            exists: !!aug6Sentiments,
            postSentimentPairs: aug6Sentiments?.postSentimentPairs?.length || 0,
            sentiments: aug6Sentiments?.sentiments?.length || 0,
            details: aug6Sentiments?.postSentimentPairs?.map(pair => ({
              post_id: pair.post?.id,
              sentiment: pair.sentiment?.sentiment,
              confidence: pair.sentiment?.confidence
            })) || []
          }
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('\n📊 8월 6일 데이터 분석 결과:');
    console.log('포스트 개수:', aug6Analysis.posts.count);
    console.log('감정 분석 존재:', aug6Analysis.sentiments.exists);
    console.log('감정 쌍 개수:', aug6Analysis.sentiments.postSentimentPairs);
    
    if (aug6Analysis.posts.count > 0) {
      console.log('\n📝 8월 6일 포스트 목록:');
      aug6Analysis.posts.details.forEach((post, index) => {
        console.log(`  ${index + 1}. ID: ${post.id}, 제목: ${post.title}`);
        console.log(`     날짜: ${post.created_date}, 삼성전자 언급: ${post.ticker_mentioned}`);
      });
    }
    
    if (aug6Analysis.sentiments.exists) {
      console.log('\n🎯 8월 6일 감정 분석 상세:');
      aug6Analysis.sentiments.details.forEach((detail, index) => {
        console.log(`  ${index + 1}. 포스트 ID: ${detail.post_id}, 감정: ${detail.sentiment}, 신뢰도: ${detail.confidence}`);
      });
    } else {
      console.log('\n❌ 8월 6일 감정 분석 데이터 없음!');
      console.log('이것이 파란색 원이 표시되는 이유입니다.');
    }
    
    // 8월 6일 마커 색상 확인
    const markerColor = await page.evaluate(() => {
      // 8월 6일에 해당하는 마커 찾기 (대략적으로 오른쪽 끝 부근)
      const circles = document.querySelectorAll('circle[stroke]');
      const markers = [];
      
      circles.forEach((circle, index) => {
        const stroke = circle.getAttribute('stroke');
        const cx = parseFloat(circle.getAttribute('cx') || '0');
        markers.push({ index, stroke, x: cx });
      });
      
      // X 좌표 순으로 정렬
      markers.sort((a, b) => a.x - b.x);
      
      // 가장 오른쪽 마커들 (최근 날짜들)
      const recentMarkers = markers.slice(-5);
      
      return {
        totalMarkers: markers.length,
        recentMarkers: recentMarkers,
        blueMarkers: markers.filter(m => m.stroke === '#3742fa').length
      };
    });
    
    console.log('\n🎨 마커 색상 분석:');
    console.log('총 마커 개수:', markerColor.totalMarkers);
    console.log('파란색 마커 개수:', markerColor.blueMarkers);
    console.log('최근 5개 마커 색상:', markerColor.recentMarkers.map(m => m.stroke));
    
  } catch (error) {
    console.error('❌ 분석 오류:', error);
  } finally {
    await browser.close();
  }
}

analyzeAug6BlueCircle();