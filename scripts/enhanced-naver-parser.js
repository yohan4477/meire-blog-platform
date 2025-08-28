/**
 * 🔍 Enhanced 네이버 블로그 파서 - iframe 지원 버전
 * iframe 기반 콘텐츠 로딩 지원
 */

const NaverBlogParser = require('./naver-blog-parser');
const cheerio = require('cheerio');
const https = require('https');
const zlib = require('zlib');

class EnhancedNaverParser extends NaverBlogParser {
  constructor() {
    super();
    this.maxIframeRetries = 3;
    this.iframeTimeout = 10000; // 10초 타임아웃
  }

  /**
   * Enhanced 포스트 파싱 - iframe 지원
   */
  async parsePost(postUrl) {
    console.log(`📝 Enhanced 포스트 파싱 시작: ${postUrl}`);
    
    try {
      const response = await this.makeRequestWithDecompression(postUrl);
      const $ = cheerio.load(response);
      
      // 제목 추출 (기존 방식)
      const title = this.extractTitle($);
      console.log(`📋 제목 발견: "${title}"`);
      
      // 1. 먼저 기존 방식으로 본문 추출 시도
      let content = this.tryExtractDirectContent($);
      
      // 2. 기존 방식 실패 시 iframe 방식 시도  
      if (!content) {
        console.log('🔍 기존 방식 실패 - iframe 방식으로 전환...');
        content = await this.extractIframeContent($, postUrl);
      }
      
      if (!content) {
        throw new Error('본문 내용을 찾을 수 없습니다 (iframe 포함)');
      }
      
      // HTML에서 텍스트 추출 및 정리
      const cleanText = this.extractCleanText(content);
      console.log(`📄 정리된 텍스트: ${cleanText.substring(0, 200)}...`);
      
      // 번호별 문장 파싱
      const parsedSentences = this.parseNumberedSentences(cleanText);
      
      // 결과 반환
      const result = {
        title: title || 'Unknown Title',
        url: postUrl,
        totalSentences: parsedSentences.length,
        sentences: parsedSentences,
        rawContent: cleanText, // 디버깅용
        timestamp: new Date().toISOString(),
        extractionMethod: content.includes('<iframe') ? 'iframe' : 'direct'
      };
      
      console.log(`✅ 파싱 완료 - 제목: ${result.title}, 문장: ${result.totalSentences}개 (${result.extractionMethod} 방식)`);
      return result;
      
    } catch (error) {
      console.error(`❌ Enhanced 포스트 파싱 실패: ${error.message}`);
      return null;
    }
  }

  /**
   * 제목 추출 (다양한 셀렉터 시도)
   */
  extractTitle($) {
    const titleSelectors = [
      '.title',           // 일반적인 제목
      '.pcol1 h3',       // 포스트 제목
      '.se_title',       // 스마트에디터 제목
      '.blog_title',     // 블로그 제목
      'h1',              // H1 태그
      'h2',              // H2 태그
      '.post_title'      // 포스트 제목
    ];
    
    for (const selector of titleSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const title = element.first().text().trim();
        if (title && title.length > 0) {
          return title;
        }
      }
    }
    
    return 'Unknown Title';
  }

  /**
   * 직접 콘텐츠 추출 시도 (기존 방식)
   */
  tryExtractDirectContent($) {
    const contentSelectors = [
      '.se_textArea',     // 스마트에디터 ONE
      '.blog2_textArea',  // 구 에디터
      '.post_ct',         // 일반 포스트
      '#postViewArea',    // 기본 영역
      '.post_area',       // 포스트 영역
      '.blog_post',       // 블로그 포스트
      '.entry-content'    // 엔트리 콘텐츠
    ];
    
    for (const selector of contentSelectors) {
      const contentElement = $(selector);
      if (contentElement.length > 0) {
        const content = contentElement.html() || contentElement.text();
        if (content && content.trim().length > 0) {
          console.log(`✅ 직접 추출 성공: ${selector}`);
          return content;
        }
      }
    }
    
    return null;
  }

  /**
   * iframe 기반 콘텐츠 추출
   */
  async extractIframeContent($, originalUrl) {
    console.log('🖼️ iframe 콘텐츠 추출 시작...');
    
    // iframe 요소들 찾기
    const iframes = $('iframe');
    console.log(`🔍 발견된 iframe 수: ${iframes.length}개`);
    
    if (iframes.length === 0) {
      return null;
    }
    
    // 각 iframe 시도
    for (let i = 0; i < iframes.length; i++) {
      const iframe = $(iframes[i]);
      const src = iframe.attr('src');
      
      if (!src) {
        continue;
      }
      
      console.log(`🔍 iframe ${i + 1} 시도: ${src}`);
      
      try {
        // 상대 URL을 절대 URL로 변환
        const iframeUrl = this.resolveUrl(src, originalUrl);
        console.log(`📡 iframe 요청: ${iframeUrl}`);
        
        // iframe 콘텐츠 가져오기
        const iframeContent = await this.makeRequestWithDecompression(iframeUrl);
        
        if (iframeContent && iframeContent.length > 1000) {
          console.log(`📄 iframe 콘텐츠 확인: ${iframeContent.length} 문자`);
          
          // iframe HTML 파싱
          const iframe$ = cheerio.load(iframeContent);
          
          // iframe 내부에서 콘텐츠 추출 시도
          const extractedContent = this.tryExtractDirectContent(iframe$);
          
          if (extractedContent) {
            console.log(`✅ iframe에서 콘텐츠 추출 성공: ${extractedContent.length} 문자`);
            return extractedContent;
          }
          
          // iframe 전체 텍스트 추출
          const fullText = iframe$.text();
          if (fullText && fullText.trim().length > 100) {
            console.log(`✅ iframe 전체 텍스트 추출: ${fullText.length} 문자`);
            return fullText;
          }
        }
        
      } catch (error) {
        console.log(`❌ iframe ${i + 1} 처리 실패: ${error.message}`);
        continue;
      }
    }
    
    console.log('❌ 모든 iframe에서 콘텐츠 추출 실패');
    return null;
  }

  /**
   * 상대 URL을 절대 URL로 변환
   */
  resolveUrl(url, baseUrl) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return base.origin + url;
    }
    
    return url;
  }

  /**
   * HTTP 요청 (gzip 압축 해제 지원)
   */
  makeRequestWithDecompression(url) {
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
        
        // 압축 해제
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
      
      req.setTimeout(this.iframeTimeout, () => {
        req.destroy();
        reject(new Error(`요청 타임아웃 (${this.iframeTimeout}ms)`));
      });
    });
  }

  /**
   * 최신 포스트 1개만 크롤링
   */
  async crawlLatestPost() {
    console.log('🚀 최신 포스트 크롤링 시작!');
    
    try {
      // 메인 페이지에서 최신 포스트 URL 찾기
      const mainPageUrl = `https://blog.naver.com/${this.blogId}`;
      const response = await this.makeRequestWithDecompression(mainPageUrl);
      const $ = cheerio.load(response);
      
      // 최신 포스트 링크 찾기
      const latestPostLink = this.findLatestPostLink($);
      
      if (!latestPostLink) {
        // 기본 포스트 URL 시도
        const defaultPostUrl = 'https://blog.naver.com/PostView.naver?blogId=ranto28&logNo=223984718208';
        console.log(`⚠️ 최신 포스트를 찾을 수 없어 기본 URL 시도: ${defaultPostUrl}`);
        
        const result = await this.parsePost(defaultPostUrl);
        return result ? [result] : [];
      }
      
      console.log(`🎯 최신 포스트 발견: ${latestPostLink}`);
      
      // 최신 포스트 파싱
      const result = await this.parsePost(latestPostLink);
      
      return result ? [result] : [];
      
    } catch (error) {
      console.error('❌ 최신 포스트 크롤링 실패:', error.message);
      return [];
    }
  }

  /**
   * 메인 페이지에서 최신 포스트 링크 찾기
   */
  findLatestPostLink($) {
    // 다양한 방식으로 최신 포스트 링크 찾기
    const linkSelectors = [
      'a[href*="PostView.naver"]',
      'a[href*="logNo="]',
      '.blog_post a',
      '.post_title a',
      '.list_post a'
    ];
    
    for (const selector of linkSelectors) {
      const links = $(selector);
      if (links.length > 0) {
        const href = $(links[0]).attr('href');
        if (href && href.includes('logNo=')) {
          return href.startsWith('http') ? href : `https://blog.naver.com${href}`;
        }
      }
    }
    
    return null;
  }
}

// 실행 함수
async function crawlLatestPost() {
  const parser = new EnhancedNaverParser();
  const results = await parser.crawlLatestPost();
  
  if (results.length > 0) {
    console.log('\n📊 크롤링 결과:');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.title}`);
      console.log(`   추출 방식: ${result.extractionMethod}`);
      console.log(`   문장 수: ${result.totalSentences}개`);
      
      if (result.sentences.length > 0) {
        console.log('   내용 미리보기:');
        result.sentences.slice(0, 3).forEach(sentence => {
          console.log(`     ${sentence.number}. ${sentence.sentence}`);
        });
      } else {
        console.log('   ⚠️ 번호가 매겨진 문장을 찾을 수 없습니다');
        console.log(`   원본 텍스트 샘플: "${result.rawContent.substring(0, 200)}..."`);
      }
    });
    
    // 결과 저장
    await parser.saveToFile(results, 'latest-post-crawl-result.json');
    
  } else {
    console.log('\n❌ 크롤링된 포스트가 없습니다');
  }
  
  return results;
}

// 명령줄 실행
if (require.main === module) {
  crawlLatestPost();
}

module.exports = EnhancedNaverParser;