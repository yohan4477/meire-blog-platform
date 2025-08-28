/**
 * 📝 네이버 블로그 파싱 스크립트 (blog.naver.com/ranto28)
 * F12 Network + Document 방식 활용
 * 
 * 요구사항:
 * - 1.~2.~3.~ 번호가 있는 문장 추출
 * - 빈 문장 제거
 * - 출처 표기(@xx, "네이버 블로그" 등) 제거
 * - Claude 직접 분석 준수 (CLAUDE.md 원칙)
 */

const cheerio = require('cheerio');
const https = require('https');
const fs = require('fs');
const path = require('path');

class NaverBlogParser {
  constructor() {
    this.blogId = 'ranto28';
    this.baseUrl = 'https://blog.naver.com';
    
    // 출처 표기 패턴들 (정규표현식)
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
   * 블로그 포스트 목록 가져오기 (F12 Network 방식 시뮬레이션)
   */
  async getPostList(page = 1) {
    console.log(`📋 ${this.blogId} 블로그 포스트 목록 조회 중... (페이지: ${page})`);
    
    try {
      // 실제 F12 Network에서 확인되는 API 엔드포인트 호출
      const listUrl = `${this.baseUrl}/PostTitleListAsync.naver?blogId=${this.blogId}&currentPage=${page}&categoryNo=0&countPerPage=10`;
      
      const response = await this.makeRequest(listUrl);
      const $ = cheerio.load(response);
      
      const posts = [];
      
      // 포스트 링크 추출
      $('.wrap_blog_title a').each((index, element) => {
        const href = $(element).attr('href');
        const title = $(element).text().trim();
        
        if (href && title) {
          const postId = this.extractPostId(href);
          if (postId) {
            posts.push({
              postId,
              title,
              url: `${this.baseUrl}/PostView.naver?blogId=${this.blogId}&logNo=${postId}`
            });
          }
        }
      });
      
      console.log(`✅ 포스트 ${posts.length}개 발견`);
      return posts;
      
    } catch (error) {
      console.error('❌ 포스트 목록 조회 실패:', error.message);
      return [];
    }
  }

  /**
   * 개별 포스트 내용 파싱
   */
  async parsePost(postUrl) {
    console.log(`📝 포스트 파싱 시작: ${postUrl}`);
    
    try {
      const response = await this.makeRequest(postUrl);
      const $ = cheerio.load(response);
      
      // 제목 추출
      const title = $('.pcol1 .blog2_series_title, .se_title, .pcol1 h3').first().text().trim();
      
      // 본문 내용 추출 (여러 가능한 셀렉터 시도)
      let content = '';
      const contentSelectors = [
        '.se_textArea', // 스마트에디터 ONE
        '.blog2_textArea', // 구 에디터
        '.post_ct', // 일반 포스트
        '#postViewArea' // 기본 영역
      ];
      
      for (const selector of contentSelectors) {
        const contentElement = $(selector);
        if (contentElement.length > 0) {
          content = contentElement.html() || contentElement.text();
          break;
        }
      }
      
      if (!content) {
        throw new Error('본문 내용을 찾을 수 없습니다');
      }
      
      // HTML에서 텍스트 추출 및 정리
      const cleanText = this.extractCleanText(content);
      
      // 번호별 문장 파싱
      const parsedSentences = this.parseNumberedSentences(cleanText);
      
      // 결과 반환
      const result = {
        title: title || 'Unknown Title',
        url: postUrl,
        totalSentences: parsedSentences.length,
        sentences: parsedSentences,
        rawContent: cleanText, // 디버깅용
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ 파싱 완료 - 제목: ${result.title}, 문장: ${result.totalSentences}개`);
      return result;
      
    } catch (error) {
      console.error(`❌ 포스트 파싱 실패: ${error.message}`);
      return null;
    }
  }

  /**
   * HTML에서 깨끗한 텍스트 추출
   */
  extractCleanText(html) {
    const $ = cheerio.load(html);
    
    // HTML 태그 제거하고 텍스트만 추출
    let text = $.text();
    
    // 출처 표기 제거
    for (const pattern of this.sourcePatterns) {
      text = text.replace(pattern, '');
    }
    
    // 연속된 공백 및 개행 정리
    text = text
      .replace(/\s+/g, ' ') // 연속 공백을 하나로
      .replace(/\n\s*\n/g, '\n') // 연속 개행 정리
      .trim();
    
    return text;
  }

  /**
   * 번호별 문장 파싱 (핵심 로직) - 완전히 새로운 접근
   */
  parseNumberedSentences(text) {
    console.log('🔍 번호별 문장 파싱 시작...');
    console.log('📝 입력 텍스트:', JSON.stringify(text, null, 2));
    
    const sentences = [];
    
    // 전역 매칭으로 모든 번호 패턴을 찾기
    const globalNumberPattern = /(\d+)\.\s*([^0-9]*?)(?=\d+\.\s|$)/gs;
    let match;
    
    while ((match = globalNumberPattern.exec(text)) !== null) {
      const number = parseInt(match[1]);
      let content = match[2].trim();
      
      // 내용 정리: 불필요한 공백과 개행 제거
      content = content
        .replace(/\s+/g, ' ') // 연속 공백을 하나로
        .replace(/\n\s*/g, ' ') // 개행을 공백으로
        .trim();
      
      if (content && content.length > 0) {
        sentences.push({
          number: number,
          sentence: content
        });
        
        console.log(`✅ 발견: ${number}. ${content}`);
      }
    }
    
    // 위 방법이 실패하면 라인별 처리 시도
    if (sentences.length === 0) {
      console.log('🔄 라인별 처리로 재시도...');
      
      const lines = text.split(/\r?\n/);
      let currentNumber = null;
      let currentContent = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
          continue; // 빈 줄 스킵
        }
        
        // 번호 패턴 체크
        const numberMatch = trimmedLine.match(/^(\d+)\.\s*(.*)$/);
        
        if (numberMatch) {
          // 이전 문장이 있으면 저장
          if (currentNumber && currentContent.trim()) {
            sentences.push({
              number: currentNumber,
              sentence: currentContent.trim()
            });
          }
          
          // 새로운 번호 시작
          currentNumber = parseInt(numberMatch[1]);
          currentContent = numberMatch[2];
          
        } else if (currentNumber && trimmedLine) {
          // 현재 번호의 연속 내용
          currentContent += ' ' + trimmedLine;
        }
      }
      
      // 마지막 문장 처리
      if (currentNumber && currentContent.trim()) {
        sentences.push({
          number: currentNumber,
          sentence: currentContent.trim()
        });
      }
    }
    
    console.log(`✅ 번호별 문장 ${sentences.length}개 추출완료`);
    
    // 번호 순서대로 정렬
    sentences.sort((a, b) => a.number - b.number);
    
    return sentences;
  }

  /**
   * HTTP 요청 헬퍼
   */
  makeRequest(url) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      };

      https.get(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * URL에서 포스트 ID 추출
   */
  extractPostId(url) {
    const match = url.match(/logNo=(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * 결과를 JSON 파일로 저장
   */
  async saveToFile(data, filename = null) {
    const outputDir = path.join(__dirname, '..', 'data', 'parsed-posts');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = filename || `parsed-${Date.now()}.json`;
    const filePath = path.join(outputDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 결과 저장완료: ${filePath}`);
    
    return filePath;
  }

  /**
   * 메인 실행 함수
   */
  async run(options = {}) {
    const {
      maxPosts = 5,
      saveResults = true,
      testMode = false
    } = options;

    console.log('🚀 네이버 블로그 파싱 시작!');
    console.log(`📝 블로그: ${this.blogId}`);
    console.log(`🎯 최대 포스트 수: ${maxPosts}`);

    try {
      // 1. 포스트 목록 가져오기
      const posts = await this.getPostList(1);
      
      if (posts.length === 0) {
        console.log('❌ 파싱할 포스트가 없습니다');
        return;
      }

      // 2. 지정된 수만큼만 처리
      const targetPosts = posts.slice(0, maxPosts);
      const results = [];

      // 3. 각 포스트 파싱
      for (let i = 0; i < targetPosts.length; i++) {
        const post = targetPosts[i];
        console.log(`\n📖 [${i + 1}/${targetPosts.length}] ${post.title}`);
        
        const parsed = await this.parsePost(post.url);
        if (parsed) {
          results.push(parsed);
        }

        // API 부하 방지를 위한 딜레이
        if (i < targetPosts.length - 1) {
          console.log('⏳ 2초 대기...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // 4. 결과 저장
      if (saveResults && results.length > 0) {
        await this.saveToFile(results, `naver-blog-${this.blogId}-${Date.now()}.json`);
      }

      // 5. 결과 요약
      console.log('\n📊 파싱 결과 요약:');
      console.log(`✅ 성공: ${results.length}개`);
      console.log(`❌ 실패: ${targetPosts.length - results.length}개`);
      
      results.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.title} - ${result.totalSentences}개 문장`);
      });

      return results;

    } catch (error) {
      console.error('❌ 파싱 프로세스 실패:', error);
      return [];
    }
  }
}

// 테스트 실행 함수
async function testParser() {
  console.log('🧪 네이버 블로그 파서 테스트 시작...\n');

  const parser = new NaverBlogParser();
  
  // 테스트용 샘플 텍스트 (실제 블로그 형식 시뮬레이션)
  const sampleText = `
    1. 오늘은 테슬라에 대해 이야기해보겠습니다.
    
    2. 테슬라의 주가가 최근 상승세를 보이고 있어요.
    
    3. 이는 전기차 시장의 성장과 관련이 있습니다.
    @네이버블로그 출처: 어디서든
    
    4. 앞으로도 지켜볼 필요가 있겠네요.
    
    ⓒ 2024 All rights reserved
  `;

  console.log('📝 샘플 텍스트:');
  console.log(sampleText);
  console.log('\n🔍 파싱 결과:');
  
  const parsed = parser.parseNumberedSentences(parser.extractCleanText(sampleText));
  console.log(JSON.stringify(parsed, null, 2));
  
  console.log('\n✅ 테스트 완료!');
}

// 명령줄 실행
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    testParser();
  } else {
    const parser = new NaverBlogParser();
    
    const maxPosts = parseInt(args.find(arg => arg.startsWith('--max='))?.replace('--max=', '')) || 3;
    const saveResults = !args.includes('--no-save');
    
    parser.run({
      maxPosts,
      saveResults,
      testMode: args.includes('--test')
    });
  }
}

module.exports = NaverBlogParser;