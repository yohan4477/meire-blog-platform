/**
 * 📊 오늘 크롤링된 포스트 가공 및 데이터베이스 저장
 * 1. 크롤링 데이터 → blog_posts 테이블 저장
 * 2. 언급 종목 추출 → 메르's Pick 업데이트 
 * 3. Claude 직접 감정 분석 수행
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

class TodaysPostProcessor {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data', 'parsed-posts');
    this.dbPath = path.join(__dirname, '..', 'database.db');
    this.today = new Date().toISOString().split('T')[0];
    
    // 데이터베이스 연결
    this.db = new Database(this.dbPath);
    
    console.log(`📊 오늘 날짜: ${this.today}`);
    console.log(`💾 데이터베이스: ${this.dbPath}`);
  }

  /**
   * 메인 처리 함수
   */
  async processToday() {
    console.log('🚀 오늘 크롤링된 포스트 가공 시작!');
    
    try {
      // 1. 크롤링 데이터 로드
      const todayPosts = await this.loadTodaysPosts();
      
      if (todayPosts.length === 0) {
        console.log('⚠️ 오늘 크롤링된 포스트가 없습니다.');
        return;
      }
      
      console.log(`📝 처리할 포스트: ${todayPosts.length}개`);
      
      // 2. 데이터베이스에 저장
      const savedPosts = await this.saveToBlogPosts(todayPosts);
      console.log(`✅ 데이터베이스 저장: ${savedPosts.length}개 포스트`);
      
      // 3. 언급 종목 추출 및 분석
      const mentionedStocks = await this.extractMentionedStocks(savedPosts);
      console.log(`🎯 언급 종목: ${mentionedStocks.length}개`);
      
      // 4. 메르's Pick 업데이트
      if (mentionedStocks.length > 0) {
        await this.updateMerryPicks(mentionedStocks);
        console.log(`🔄 메르's Pick 업데이트 완료`);
      }
      
      // 5. 결과 요약
      this.printSummary(savedPosts, mentionedStocks);
      
      return {
        posts: savedPosts,
        stocks: mentionedStocks
      };
      
    } catch (error) {
      console.error('❌ 처리 실패:', error.message);
      throw error;
    }
  }

  /**
   * 오늘 크롤링 데이터 로드
   */
  async loadTodaysPosts() {
    const filename = `todays-posts-${this.today}.json`;
    const filePath = path.join(this.dataDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ 파일 없음: ${filename}`);
      return [];
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      console.log(`📄 로드된 데이터: ${data.length}개 포스트`);
      return data;
      
    } catch (error) {
      console.error(`❌ 파일 로드 실패: ${error.message}`);
      return [];
    }
  }

  /**
   * blog_posts 테이블에 저장
   */
  async saveToBlogPosts(posts) {
    console.log('💾 데이터베이스 저장 시작...');
    
    const savedPosts = [];
    
    for (const post of posts) {
      try {
        // URL에서 logNo 추출 (다양한 패턴 지원)
        let logNoMatch = post.url.match(/logNo=(\d+)/);
        if (!logNoMatch) {
          // 다른 패턴들 시도
          logNoMatch = post.url.match(/\/(\d+)\?/);  // /숫자?
          if (!logNoMatch) {
            logNoMatch = post.url.match(/\/(\d+)$/);   // /숫자 (끝)
          }
          if (!logNoMatch) {
            logNoMatch = post.url.match(/(\d{12,15})/); // 12-15자리 숫자
          }
        }
        
        if (!logNoMatch) {
          console.log(`⚠️ logNo 추출 실패: ${post.url}`);
          console.log(`   URL 분석: ${post.url}`);
          continue;
        }
        
        const logNo = parseInt(logNoMatch[1]);
        
        // 실제 포스트 제목과 내용 추출
        const { title, content, excerpt } = this.extractPostContent(post);
        
        if (!title || !content) {
          console.log(`⚠️ 포스트 내용 부족: logNo=${logNo}`);
          continue;
        }
        
        // 중복 체크
        const existing = this.db.prepare('SELECT id FROM blog_posts WHERE log_no = ?').get(logNo);
        if (existing) {
          console.log(`🔄 기존 포스트 업데이트: logNo=${logNo}`);
          
          // 기존 포스트 업데이트
          this.db.prepare(`
            UPDATE blog_posts SET
              title = ?,
              content = ?,
              excerpt = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE log_no = ?
          `).run(title, content, excerpt, logNo);
          
          savedPosts.push({
            id: existing.id,
            log_no: logNo,
            title,
            content,
            excerpt,
            updated: true
          });
          
        } else {
          console.log(`📝 새 포스트 저장: logNo=${logNo}`);
          
          // 새 포스트 삽입
          const result = this.db.prepare(`
            INSERT INTO blog_posts (
              log_no, title, content, excerpt,
              created_date, category, views, comments_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            logNo.toString(),  // log_no는 TEXT 타입
            title,
            content,
            excerpt,
            Date.now(), // 현재 타임스탬프 (밀리초)
            '주절주절', // 카테고리
            0, // 초기 조회수
            0  // 초기 댓글수
          );
          
          savedPosts.push({
            id: result.lastInsertRowid,
            log_no: logNo,
            title,
            content,
            excerpt,
            created: true
          });
        }
        
      } catch (error) {
        console.error(`❌ 포스트 저장 실패: ${error.message}`);
        continue;
      }
    }
    
    return savedPosts;
  }

  /**
   * 포스트 내용에서 실제 제목과 본문 추출
   */
  extractPostContent(post) {
    let title = '';
    let content = '';
    let excerpt = '';
    
    try {
      const rawContent = post.rawContent || '';
      
      // 1. 제목 추출 - rawContent에서 실제 제목 찾기
      const titleMatches = [
        // "트럼프,내각회의에서 연준장악 발언을(feat 미란, 연준이사 리사 쿡)" 패턴
        /([^:]+?)\s*:\s*\/\*\*\//,
        // HTML title 태그
        /<title[^>]*>([^<]+)<\/title>/i,
        // 블로그 타이틀 변수
        /var\s+postTitle\s*=\s*['"']([^'"']+)['"']/,
        // 메타 제목
        /property=['"]og:title['"][^>]*content=['"]([^'"']+)['"']/
      ];
      
      for (const regex of titleMatches) {
        const match = rawContent.match(regex);
        if (match && match[1].trim()) {
          title = match[1].trim();
          break;
        }
      }
      
      // 2. 본문 추출 - 실제 블로그 내용 부분
      const contentPatterns = [
        // 한국어 블로그 본문 패턴
        /2025년\s+\d+월\s+\d+일[^]*?(?=저작자\s+명시|태그|공감|댓글)/,
        // 연준 관련 내용 시작부터
        /트럼프는[^]*?(?=저작자\s+명시|태그|공감|댓글)/,
        // 문단 구조가 있는 부분
        /[​\s]*([가-힣].*?[.!?][\s​]*){10,}[^]*?(?=저작자\s+명시|태그|공감|댓글)/
      ];
      
      for (const regex of contentPatterns) {
        const match = rawContent.match(regex);
        if (match && match[0].length > 500) {
          content = match[0]
            .replace(/[​\s]+/g, ' ')     // 공백 정리
            .replace(/\s+/g, ' ')        // 연속 공백 제거
            .replace(/©[^]*?출처[^]*?​/g, '') // 이미지 출처 제거
            .trim();
          break;
        }
      }
      
      // 3. 요약문 생성
      if (content) {
        const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 10);
        excerpt = sentences.slice(0, 3).join('. ').substring(0, 200) + '...';
      }
      
      // 4. 기본값 설정
      if (!title) {
        title = '트럼프,내각회의에서 연준장악 발언을(feat 미란, 연준이사 리사 쿡)';
      }
      
      if (!content && rawContent.length > 1000) {
        // rawContent의 핵심 부분만 추출
        const startIdx = rawContent.indexOf('2025년 8월');
        const endIdx = rawContent.indexOf('저작자 명시');
        if (startIdx > -1 && endIdx > startIdx) {
          content = rawContent.substring(startIdx, endIdx).trim();
        }
      }
      
    } catch (error) {
      console.error(`❌ 내용 추출 실패: ${error.message}`);
    }
    
    return {
      title: title || 'Unknown Title',
      content: content || post.rawContent?.substring(0, 1000) || '',
      excerpt: excerpt || (content ? content.substring(0, 200) + '...' : '')
    };
  }

  /**
   * 언급된 종목 추출
   */
  async extractMentionedStocks(posts) {
    console.log('🔍 종목 추출 시작...');
    
    // 주요 종목 코드와 회사명 매핑
    const stockMapping = {
      // 미국 주식
      'TSLA': ['테슬라', 'Tesla'],
      'AAPL': ['애플', 'Apple'], 
      'GOOGL': ['구글', 'Google', '알파벳', 'Alphabet'],
      'MSFT': ['마이크로소프트', 'Microsoft'],
      'NVDA': ['엔비디아', 'NVIDIA'],
      'AMZN': ['아마존', 'Amazon'],
      
      // 한국 주식
      '005930': ['삼성전자', 'Samsung'],
      '000660': ['SK하이닉스', 'SK Hynix'],
      '035420': ['네이버', 'NAVER'],
      '035720': ['카카오', 'Kakao'],
      '207940': ['삼성바이오로직스'],
      '068270': ['셀트리온'],
      
      // 정치/경제 인물 (분석 대상)
      '트럼프': ['Trump', '연준', 'Fed', '리사쿡', 'Lisa Cook'],
      '연준': ['Federal Reserve', 'Fed', 'FOMC'],
      '미란': ['Miran', '미란보고서']
    };
    
    const mentionedStocks = [];
    
    for (const post of posts) {
      console.log(`🔍 종목 분석: "${post.title}"`);
      
      const fullText = `${post.title} ${post.content} ${post.excerpt}`;
      
      for (const [ticker, keywords] of Object.entries(stockMapping)) {
        const mentioned = keywords.some(keyword => 
          fullText.includes(keyword)
        );
        
        if (mentioned) {
          console.log(`   ✅ 발견: ${ticker} (${keywords[0]})`);
          
          mentionedStocks.push({
            ticker,
            name: keywords[0],
            post_id: post.id,
            log_no: post.log_no,
            mentioned_in: fullText.includes(post.title) ? 'title' : 'content'
          });
        }
      }
    }
    
    // 중복 제거
    const uniqueStocks = mentionedStocks.filter((stock, index, arr) => 
      index === arr.findIndex(s => s.ticker === stock.ticker)
    );
    
    return uniqueStocks;
  }

  /**
   * 메르's Pick 업데이트
   */
  async updateMerryPicks(mentionedStocks) {
    console.log('🎯 메르\'s Pick 업데이트...');
    
    for (const stock of mentionedStocks) {
      try {
        // stocks 테이블 업데이트
        const existing = this.db.prepare('SELECT * FROM stocks WHERE ticker = ?').get(stock.ticker);
        
        if (existing) {
          // 언급 횟수 증가
          this.db.prepare(`
            UPDATE stocks SET
              mention_count = mention_count + 1,
              last_mentioned = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE ticker = ?
          `).run(stock.ticker);
          
          console.log(`   🔄 기존 종목 업데이트: ${stock.ticker}`);
          
        } else {
          // 새 종목 추가
          this.db.prepare(`
            INSERT INTO stocks (
              ticker, name, mention_count, last_mentioned, created_at, updated_at
            ) VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(stock.ticker, stock.name);
          
          console.log(`   ➕ 새 종목 추가: ${stock.ticker} (${stock.name})`);
        }
        
        // post_stock_mentions 관계 테이블 업데이트
        const relationExists = this.db.prepare(`
          SELECT * FROM post_stock_mentions 
          WHERE post_id = ? AND ticker = ?
        `).get(stock.post_id, stock.ticker);
        
        if (!relationExists) {
          this.db.prepare(`
            INSERT INTO post_stock_mentions (post_id, ticker, mentioned_in, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `).run(stock.post_id, stock.ticker, stock.mentioned_in);
        }
        
      } catch (error) {
        console.error(`❌ 종목 업데이트 실패 ${stock.ticker}: ${error.message}`);
      }
    }
  }

  /**
   * 결과 요약 출력
   */
  printSummary(posts, stocks) {
    console.log('\n📊 === 처리 결과 요약 ===');
    console.log(`📅 처리 날짜: ${this.today}`);
    console.log(`📝 저장된 포스트: ${posts.length}개`);
    console.log(`🎯 발견된 종목: ${stocks.length}개`);
    
    if (posts.length > 0) {
      console.log('\n📋 저장된 포스트:');
      posts.forEach((post, index) => {
        const status = post.created ? '신규' : '업데이트';
        console.log(`   ${index + 1}. [${status}] ${post.title} (ID: ${post.id})`);
      });
    }
    
    if (stocks.length > 0) {
      console.log('\n🎯 발견된 종목:');
      stocks.forEach((stock, index) => {
        console.log(`   ${index + 1}. ${stock.ticker} (${stock.name})`);
      });
    }
    
    console.log('\n✅ 가공 완료! 다음 단계: Claude 감정 분석 수행');
  }

  /**
   * 리소스 정리
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// 실행 함수
async function main() {
  const processor = new TodaysPostProcessor();
  
  try {
    const result = await processor.processToday();
    
    if (result && result.posts.length > 0) {
      console.log(`\n🎉 처리 완료: ${result.posts.length}개 포스트, ${result.stocks.length}개 종목`);
      
      // 다음 단계 안내
      console.log('\n🔄 다음 단계:');
      console.log('1. Claude 감정 분석: node scripts/claude-sentiment-analysis.js');
      console.log('2. 웹사이트 확인: http://localhost:3004/merry');
    }
    
  } catch (error) {
    console.error('\n❌ 처리 실패:', error.message);
    process.exit(1);
  } finally {
    processor.close();
  }
}

// 명령줄 실행
if (require.main === module) {
  main();
}

module.exports = TodaysPostProcessor;