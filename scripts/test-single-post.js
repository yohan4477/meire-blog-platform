/**
 * 🔍 네이버 블로그 단일 포스트 크롤링 테스트
 * ranto28 블로그에서 가장 최근 포스트 1개 크롤링
 */

const NaverBlogParser = require('./naver-blog-parser');
const https = require('https');
const zlib = require('zlib');

async function testSinglePost() {
  console.log('🔍 네이버 블로그 ranto28 최신 포스트 크롤링 시작!\n');
  
  const parser = new NaverBlogParser();
  
  try {
    // 1. 먼저 블로그 메인 페이지에서 최신 포스트 찾기
    console.log('📋 블로그 메인 페이지 접근 시도...');
    const mainPageUrl = 'https://blog.naver.com/ranto28';
    
    const response = await makeRequest(mainPageUrl);
    console.log(`✅ 메인 페이지 응답 받음 (${response.length} bytes)`);
    
    // 응답 일부만 확인 (디버깅용)
    console.log('\n📄 응답 내용 샘플 (처음 500자):');
    console.log(response.substring(0, 500));
    console.log('...\n');
    
    // 2. 실제 포스트 HTML 구조 분석
    console.log('🎯 테스트용 포스트 HTML 구조 분석...');
    
    const testUrl = 'https://blog.naver.com/PostView.naver?blogId=ranto28&logNo=223984718208';
    console.log(`\n🔍 포스트 HTML 가져오기: ${testUrl}`);
    
    try {
      const postHtml = await makeRequest(testUrl);
      console.log(`✅ 포스트 HTML 응답 받음 (${postHtml.length} 문자)`);
      
      // HTML 구조 분석을 위해 cheerio로 파싱
      const cheerio = require('cheerio');
      const $ = cheerio.load(postHtml);
      
      console.log('\n🔍 HTML 구조 분석:');
      
      // 가능한 제목 셀렉터들 확인
      const titleSelectors = ['.pcol1 .blog2_series_title', '.se_title', '.pcol1 h3', 'h3', '.title', '.post_title', '.blog_title'];
      console.log('\n📝 제목 찾기:');
      titleSelectors.forEach(selector => {
        const element = $(selector);
        if (element.length > 0) {
          console.log(`   ✅ ${selector}: "${element.first().text().trim()}"`);
        } else {
          console.log(`   ❌ ${selector}: 없음`);
        }
      });
      
      // 가능한 본문 셀렉터들 확인
      const contentSelectors = ['.se_textArea', '.blog2_textArea', '.post_ct', '#postViewArea', '.post_area', '.blog_post', '.entry-content'];
      console.log('\n📄 본문 찾기:');
      contentSelectors.forEach(selector => {
        const element = $(selector);
        if (element.length > 0) {
          const content = element.html() || element.text();
          console.log(`   ✅ ${selector}: ${content.length}자 (샘플: "${content.substring(0, 100).replace(/\n/g, ' ').trim()}...")`);
        } else {
          console.log(`   ❌ ${selector}: 없음`);
        }
      });
      
      // iframe 확인 (네이버 블로그는 때로 iframe을 사용)
      const iframes = $('iframe');
      console.log(`\n🖼️  iframe 개수: ${iframes.length}개`);
      iframes.each((index, element) => {
        const src = $(element).attr('src');
        console.log(`   iframe ${index + 1}: ${src}`);
      });
      
      // 전체 HTML 구조 샘플
      console.log('\n📄 HTML 구조 샘플:');
      console.log($('body').html().substring(0, 1000));
      console.log('...\n');
      
    } catch (error) {
      console.log(`❌ HTML 분석 실패: ${error.message}`);
    }
    
    console.log('\n⚠️  모든 테스트 URL에서 파싱이 실패했습니다.');
    
  } catch (error) {
    console.error('❌ 크롤링 테스트 실패:', error.message);
  }
}

// HTTP 요청 헬퍼 (더 상세한 에러 처리)
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    console.log(`📡 요청: ${url}`);
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      }
    };

    const req = https.get(url, options, (res) => {
      console.log(`📊 응답 상태: ${res.statusCode} ${res.statusMessage}`);
      console.log(`📋 Content-Type: ${res.headers['content-type']}`);
      console.log(`📋 Content-Encoding: ${res.headers['content-encoding']}`);
      
      let responseStream = res;
      
      // gzip 압축 해제
      if (res.headers['content-encoding'] === 'gzip') {
        console.log('🔄 gzip 압축 해제 중...');
        responseStream = res.pipe(zlib.createGunzip());
      } else if (res.headers['content-encoding'] === 'deflate') {
        console.log('🔄 deflate 압축 해제 중...');
        responseStream = res.pipe(zlib.createInflate());
      } else if (res.headers['content-encoding'] === 'br') {
        console.log('🔄 brotli 압축 해제 중...');
        responseStream = res.pipe(zlib.createBrotliDecompress());
      }

      let data = '';

      responseStream.on('data', (chunk) => {
        data += chunk.toString('utf8');
      });

      responseStream.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ 응답 데이터 수신 완료 (${data.length} 문자)`);
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}\n응답 내용: ${data.substring(0, 200)}...`));
        }
      });
      
      responseStream.on('error', (err) => {
        console.error('📡 응답 스트림 에러:', err.message);
        reject(err);
      });
    });

    req.on('error', (err) => {
      console.error(`📡 요청 에러:`, err.message);
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('요청 타임아웃 (10초)'));
    });
  });
}

// 실행
if (require.main === module) {
  testSinglePost();
}

module.exports = { testSinglePost };