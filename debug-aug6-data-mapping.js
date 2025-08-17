const { chromium } = require('playwright');

async function debugAug6DataMapping() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // 더 자세한 로그 캡처
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('8월') || 
        text.includes('2025-08-06') ||
        text.includes('posts count') ||
        text.includes('postsByDate') ||
        text.includes('Processing marker for 2025-08-06')) {
      console.log('🖥️', text);
    }
  });
  
  try {
    console.log('🚀 8월 6일 데이터 매핑 과정 상세 분석...');
    await page.goto('http://localhost:3012/merry/stocks/005930', { waitUntil: 'networkidle' });
    
    console.log('📊 1M 기간 선택...');
    await page.locator('button:has-text("1M")').click();
    
    console.log('⏳ 데이터 로딩 및 매핑 과정 관찰...');
    await page.waitForTimeout(8000);
    
    // 브라우저에서 postsByDate 데이터 구조 직접 확인
    const dataMapping = await page.evaluate(async () => {
      try {
        // Posts API 호출
        const postsResponse = await fetch('/api/merry/stocks/005930/posts?limit=100&offset=0&period=1mo');
        const postsData = await postsResponse.json();
        
        console.log('🔍 Posts API Response:', {
          success: postsData.success,
          total: postsData.data?.total,
          postsCount: postsData.data?.posts?.length,
          firstFewPosts: postsData.data?.posts?.slice(0, 3)?.map(p => ({
            id: p.id,
            title: p.title.substring(0, 50),
            date: p.created_date
          }))
        });
        
        // postsByDate 객체 생성 로직 시뮬레이션
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
        
        console.log('📅 PostsByDate structure:', {
          totalDates: Object.keys(postsByDate).length,
          dates: Object.keys(postsByDate),
          aug6Posts: postsByDate['2025-08-06'] || 'No posts for Aug 6'
        });
        
        return {
          apiResponse: {
            success: postsData.success,
            total: postsData.data?.total || 0,
            postsCount: postsData.data?.posts?.length || 0
          },
          postsByDate: postsByDate,
          aug6Specific: {
            exists: !!postsByDate['2025-08-06'],
            count: postsByDate['2025-08-06']?.length || 0,
            posts: postsByDate['2025-08-06'] || []
          }
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('\n📊 데이터 매핑 결과:');
    console.log('API 응답 성공:', dataMapping.apiResponse.success);
    console.log('총 포스트 수:', dataMapping.apiResponse.total);
    console.log('로드된 포스트 수:', dataMapping.apiResponse.postsCount);
    console.log('전체 날짜 수:', Object.keys(dataMapping.postsByDate).length);
    
    console.log('\n📅 8월 6일 특정 분석:');
    console.log('8월 6일 데이터 존재:', dataMapping.aug6Specific.exists);
    console.log('8월 6일 포스트 개수:', dataMapping.aug6Specific.count);
    
    if (dataMapping.aug6Specific.posts.length > 0) {
      console.log('8월 6일 포스트 목록:');
      dataMapping.aug6Specific.posts.forEach((post, index) => {
        console.log(`  ${index + 1}. ID: ${post.id}, 제목: ${post.title.substring(0, 50)}`);
      });
    }
    
    // 1M 기간 내 모든 날짜 확인
    const allDates = Object.keys(dataMapping.postsByDate).sort();
    console.log('\n📋 1M 기간 내 포스트가 있는 모든 날짜:');
    allDates.forEach(date => {
      const count = dataMapping.postsByDate[date].length;
      console.log(`  ${date}: ${count}개 포스트`);
    });
    
  } catch (error) {
    console.error('❌ 분석 오류:', error);
  } finally {
    await browser.close();
  }
}

debugAug6DataMapping();