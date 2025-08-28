/**
 * 📱 모바일 네이버 블로그 크롤러
 * m.blog.naver.com 접근 시도로 더 간단한 HTML 구조 활용
 */

const cheerio = require('cheerio');
const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

class MobileNaverCrawler {
  constructor() {
    this.blogId = 'ranto28';
    this.mobileBaseUrl = 'https://m.blog.naver.com';
    this.desktopBaseUrl = 'https://blog.naver.com';
    
    // 출처 표기 패턴들
    this.sourcePatterns = [
      /@[a-zA-Z가-힣0-9_]+/g,           // @사용자명
      /네이버\s*블로그/g,                  // 네이버 블로그
      /출처\s*[:：]\s*[^\n]+/g,          // 출처: xxx
      /\[출처\][^\n]*/g,                 // [출처]xxx
      /참고\s*[:：]\s*[^\n]+/g,          // 참고: xxx
      /\*\s*출처[^\n]*/g,               // * 출처xxx
      /ⓒ[^\n]*/g,                      // 저작권 표시
      /Copyright[^\n]*/gi,              // Copyright
      /All rights reserved[^\n]*/gi     // All rights reserved
    ];

    // 번호 패턴 (1. 2. 3. 형태)
    this.numberPattern = /^\s*(\d+)\.\s*/;
  }

  /**
   * 최신 포스트 크롤링 (다중 접근 시도)
   */
  async crawlLatestPost() {
    console.log('📱 모바일 네이버 블로그 크롤링 시작!');
    
    const attempts = [
      // 1. 모바일 블로그 메인
      () => this.tryMobileBlog(),
      
      // 2. 특정 포스트 직접 접근 (알려진 최신)
      () => this.tryKnownPost('223984718208'),
      () => this.tryKnownPost('223983579507'), 
      () => this.tryKnownPost('223981242384'),
      
      // 3. RSS 피드 시도
      () => this.tryRssFeed()
    ];
    
    for (const attempt of attempts) {
      try {
        const result = await attempt();
        if (result && result.length > 0) {
          return result;
        }
      } catch (error) {
        console.log(`⚠️ 시도 실패: ${error.message}`);
      }
    }
    
    console.log('❌ 모든 시도 실패');
    return [];
  }

  /**
   * 모바일 블로그 접근 시도
   */
  async tryMobileBlog() {
    console.log('📱 모바일 블로그 메인 페이지 시도...');
    
    const mobileUrl = `${this.mobileBaseUrl}/${this.blogId}`;
    const response = await this.makeRequest(mobileUrl);
    const $ = cheerio.load(response);
    
    console.log(`📄 모바일 페이지 응답: ${response.length} 문자`);
    
    // 모바일에서 포스트 링크 찾기
    const postLinks = this.findMobilePostLinks($);
    
    if (postLinks.length > 0) {
      console.log(`🔍 모바일에서 포스트 ${postLinks.length}개 발견`);
      
      // 첫 번째 포스트 파싱 시도
      const firstPost = postLinks[0];
      const result = await this.parsePost(firstPost.url, firstPost.title);
      
      return result ? [result] : [];
    }
    
    return [];
  }

  /**
   * 알려진 포스트 ID로 직접 접근
   */
  async tryKnownPost(logNo) {
    console.log(`🎯 알려진 포스트 직접 접근: ${logNo}`);
    
    // 여러 URL 패턴 시도
    const urls = [
      `${this.mobileBaseUrl}/${this.blogId}/${logNo}`,
      `${this.desktopBaseUrl}/PostView.naver?blogId=${this.blogId}&logNo=${logNo}`,
      `https://blog.naver.com/PostView.nhn?blogId=${this.blogId}&logNo=${logNo}`
    ];
    
    for (const url of urls) {
      try {
        console.log(`🔗 시도: ${url}`);
        const result = await this.parsePost(url);
        
        if (result && result.totalSentences > 0) {
          console.log(`✅ 성공: ${result.title} - ${result.totalSentences}개 문장`);
          return [result];
        }
      } catch (error) {
        console.log(`❌ 실패: ${error.message}`);
      }
    }
    
    return [];
  }

  /**
   * RSS 피드 시도
   */
  async tryRssFeed() {
    console.log('📡 RSS 피드 시도...');
    
    const rssUrl = `https://rss.blog.naver.com/${this.blogId}.xml`;
    
    try {
      const response = await this.makeRequest(rssUrl);
      console.log(`📄 RSS 응답: ${response.length} 문자`);
      
      // RSS에서 최신 포스트 링크 추출
      const links = this.parseRssLinks(response);
      
      if (links.length > 0) {
        console.log(`🔍 RSS에서 포스트 ${links.length}개 발견`);
        
        // 첫 번째 포스트 파싱 시도
        const firstPost = links[0];
        const result = await this.parsePost(firstPost.url, firstPost.title);
        
        return result ? [result] : [];
      }
    } catch (error) {
      console.log(`❌ RSS 피드 실패: ${error.message}`);
    }
    
    return [];
  }

  /**
   * 모바일 페이지에서 포스트 링크 찾기
   */
  findMobilePostLinks($) {
    const links = [];
    
    // 모바일 포스트 링크 셀렉터들
    const selectors = [
      'a[href*="m.blog.naver.com"]',
      'a[href*="blog.naver.com"]',
      '.post_item a',
      '.list_post a',
      '.blog_list a'
    ];
    
    for (const selector of selectors) {
      $(selector).each((i, element) => {
        const href = $(element).attr('href');
        const title = $(element).text().trim();
        
        if (href && href.includes(this.blogId)) {
          links.push({ url: href, title });
        }
      });
    }
    
    return links;
  }

  /**
   * RSS에서 포스트 링크 파싱
   */
  parseRssLinks(rssContent) {
    const links = [];
    
    try {
      const $ = cheerio.load(rssContent, { xmlMode: true });
      
      $('item').each((i, item) => {
        const title = $(item).find('title').text();
        const link = $(item).find('link').text();
        
        if (title && link) {
          links.push({ title, url: link });
        }
      });
    } catch (error) {
      console.log(`⚠️ RSS 파싱 오류: ${error.message}`);
    }
    
    return links;
  }

  /**
   * 포스트 내용 파싱
   */
  async parsePost(postUrl, knownTitle = null) {
    console.log(`📝 포스트 파싱: ${postUrl}`);
    
    try {
      const response = await this.makeRequest(postUrl);
      const $ = cheerio.load(response);
      
      // 제목 추출
      const title = knownTitle || this.extractTitle($);
      console.log(`📋 제목: "${title}"`);
      
      // 여러 방식으로 본문 추출 시도
      let content = null;
      
      // 1. 모바일 특화 셀렉터
      if (postUrl.includes('m.blog.naver.com')) {
        content = this.tryMobileContentExtraction($);
      }
      
      // 2. 일반 데스크톱 셀렉터
      if (!content) {
        content = this.tryDesktopContentExtraction($);
      }
      
      // 3. 전체 페이지 텍스트에서 번호 패턴 찾기
      if (!content || content.trim().length < 100) {
        console.log('🔍 전체 페이지에서 번호 패턴 검색...');
        const fullText = $.text();
        
        // 번호 패턴이 있는지 확인
        if (fullText.match(/\d+\.\s+[가-힣\w]/)) {
          content = fullText;
          console.log('✅ 전체 페이지에서 번호 패턴 발견');
        }
      }
      
      if (!content) {
        throw new Error('본문 내용을 찾을 수 없습니다');
      }
      
      // 텍스트 정리 및 파싱
      const cleanText = this.extractCleanText(content);
      const sentences = this.parseNumberedSentences(cleanText);
      
      const result = {
        title: title || 'Unknown Title',
        url: postUrl,
        totalSentences: sentences.length,
        sentences,
        rawContent: cleanText.substring(0, 500) + '...', // 축약
        timestamp: new Date().toISOString(),
        extractionMethod: postUrl.includes('m.blog.naver.com') ? 'mobile' : 'desktop'
      };
      
      console.log(`✅ 파싱 완료 - 제목: ${result.title}, 문장: ${result.totalSentences}개`);
      return result;
      
    } catch (error) {
      console.error(`❌ 포스트 파싱 실패: ${error.message}`);
      return null;
    }
  }

  /**
   * 모바일 콘텐츠 추출
   */
  tryMobileContentExtraction($) {
    const mobileSelectors = [
      '.post_wrap .post_content',
      '.blog_content',
      '.post_body',
      '#postContent',
      '.se_textView',
      '.se_component'
    ];
    
    for (const selector of mobileSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const content = element.html() || element.text();
        if (content && content.trim().length > 50) {
          console.log(`✅ 모바일 콘텐츠 추출: ${selector}`);
          return content;
        }
      }
    }
    
    return null;
  }

  /**
   * 데스크톱 콘텐츠 추출  
   */
  tryDesktopContentExtraction($) {
    const desktopSelectors = [
      '.se_textArea',
      '.blog2_textArea', 
      '.post_ct',
      '#postViewArea',
      '.post_area',
      '.blog_post'
    ];
    
    for (const selector of desktopSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const content = element.html() || element.text();
        if (content && content.trim().length > 50) {
          console.log(`✅ 데스크톱 콘텐츠 추출: ${selector}`);
          return content;
        }
      }
    }
    
    return null;
  }

  /**
   * 제목 추출
   */
  extractTitle($) {
    const titleSelectors = [
      '.post_title',
      '.blog_title', 
      '.se_title',
      'h1',
      'h2',
      '.title',
      '#title'
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
   * 텍스트 정리
   */
  extractCleanText(content) {
    const $ = cheerio.load(content);
    let text = $.text();
    
    // 출처 표기 제거
    for (const pattern of this.sourcePatterns) {
      text = text.replace(pattern, '');
    }
    
    // 공백 정리
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    return text;
  }

  /**
   * 번호별 문장 파싱
   */
  parseNumberedSentences(text) {
    console.log('🔍 번호별 문장 파싱 시작...');
    console.log('📝 입력 텍스트 샘플:', text.substring(0, 300) + '...');
    
    const sentences = [];
    
    // 전역 매칭으로 번호 패턴 찾기
    const globalPattern = /(\d+)\.\s*([^\d]*?)(?=\d+\.\s|$)/gs;
    let match;
    
    while ((match = globalPattern.exec(text)) !== null) {
      const number = parseInt(match[1]);
      let content = match[2].trim();
      
      // 내용 정리
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*/g, ' ')
        .trim();
      
      if (content && content.length > 3) {
        sentences.push({
          number: number,
          sentence: content
        });
        
        console.log(`✅ 발견: ${number}. ${content.substring(0, 50)}...`);
      }
    }
    
    // 번호 순서대로 정렬
    sentences.sort((a, b) => a.number - b.number);
    
    console.log(`✅ 총 ${sentences.length}개 번호 문장 추출`);
    return sentences;
  }

  /**
   * HTTP 요청 (gzip 지원)
   */
  makeRequest(url) {
    return new Promise((resolve, reject) => {
      console.log(`📡 요청: ${url}`);
      
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive'
        }
      };

      const req = https.get(url, options, (res) => {
        console.log(`📊 응답: ${res.statusCode} ${res.statusMessage}`);
        
        let responseStream = res;
        
        // 압축 해제
        if (res.headers['content-encoding'] === 'gzip') {
          responseStream = res.pipe(zlib.createGunzip());
        } else if (res.headers['content-encoding'] === 'deflate') {
          responseStream = res.pipe(zlib.createInflate());
        } else if (res.headers['content-encoding'] === 'br') {
          responseStream = res.pipe(zlib.createBrotliDecompress());
        }

        let data = '';
        responseStream.on('data', (chunk) => {
          data += chunk.toString('utf8');
        });

        responseStream.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`✅ 데이터 수신: ${data.length} 문자`);
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
        
        responseStream.on('error', reject);
      });

      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('요청 타임아웃 (15초)'));
      });
    });
  }

  /**
   * 결과 저장
   */
  async saveResult(data) {
    const outputDir = path.join(__dirname, '..', 'data', 'parsed-posts');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `mobile-crawl-${Date.now()}.json`;
    const filePath = path.join(outputDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 결과 저장: ${filePath}`);
    
    return filePath;
  }
}

// 실행
async function main() {
  const crawler = new MobileNaverCrawler();
  const results = await crawler.crawlLatestPost();
  
  if (results.length > 0) {
    console.log('\n📊 최종 결과:');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.title}`);
      console.log(`   방식: ${result.extractionMethod}`);
      console.log(`   문장 수: ${result.totalSentences}개`);
      
      if (result.sentences.length > 0) {
        console.log('   내용:');
        result.sentences.slice(0, 5).forEach(sentence => {
          console.log(`     ${sentence.number}. ${sentence.sentence}`);
        });
      } else {
        console.log(`   원본 텍스트: ${result.rawContent}`);
      }
    });
    
    await crawler.saveResult(results);
    
  } else {
    console.log('\n❌ 크롤링 결과 없음');
  }
}

if (require.main === module) {
  main();
}

module.exports = MobileNaverCrawler;