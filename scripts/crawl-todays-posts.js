/**
 * 📅 오늘 생성된 네이버 블로그 포스트 크롤링
 * RSS 피드를 통해 오늘 날짜의 포스트들을 찾고 크롤링
 */

const EnhancedNaverParser = require('./enhanced-naver-parser');
const cheerio = require('cheerio');
const https = require('https');
const zlib = require('zlib');

class TodaysPostCrawler extends EnhancedNaverParser {
  constructor() {
    super();
    this.today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    console.log(`🗓️ 오늘 날짜: ${this.today}`);
  }

  /**
   * 오늘 포스트들 크롤링
   */
  async crawlTodaysPosts() {
    console.log('📅 오늘 생성된 포스트 크롤링 시작!');
    
    try {
      // 1. RSS 피드에서 오늘 포스트들 찾기
      const todayPosts = await this.getTodaysPostsFromRSS();
      
      if (todayPosts.length === 0) {
        console.log('⚠️ 오늘 생성된 포스트가 없습니다.');
        return [];
      }
      
      console.log(`🎯 오늘 포스트 ${todayPosts.length}개 발견:`);
      todayPosts.forEach((post, index) => {
        console.log(`   ${index + 1}. ${post.title} (${post.pubDate})`);
      });
      
      // 2. 각 포스트 크롤링
      const results = [];
      
      for (let i = 0; i < todayPosts.length; i++) {
        const post = todayPosts[i];
        console.log(`\n📝 [${i + 1}/${todayPosts.length}] "${post.title}" 크롤링 중...`);
        
        try {
          const parsed = await this.parsePost(post.url, post.title);
          
          if (parsed) {
            // RSS에서 가져온 추가 정보 포함
            parsed.pubDate = post.pubDate;
            parsed.description = post.description;
            parsed.rssTitle = post.title;
            results.push(parsed);
            
            console.log(`✅ 성공 - 문장 ${parsed.totalSentences}개 추출`);
          } else {
            console.log(`❌ 파싱 실패`);
          }
          
        } catch (error) {
          console.log(`❌ 크롤링 실패: ${error.message}`);
        }
        
        // API 부하 방지 딜레이
        if (i < todayPosts.length - 1) {
          console.log('⏳ 2초 대기...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // 3. 결과 저장
      if (results.length > 0) {
        const filename = `todays-posts-${this.today}.json`;
        await this.saveToFile(results, filename);
        console.log(`\n💾 결과 저장: ${filename}`);
      }
      
      // 4. 결과 요약
      console.log('\n📊 오늘 포스트 크롤링 결과:');
      console.log(`✅ 성공: ${results.length}개 / 총 ${todayPosts.length}개`);
      console.log(`📈 성공률: ${Math.round((results.length / todayPosts.length) * 100)}%`);
      
      let totalSentences = 0;
      results.forEach((result, index) => {
        totalSentences += result.totalSentences;
        console.log(`\n${index + 1}. ${result.title}`);
        console.log(`   발행일: ${result.pubDate}`);
        console.log(`   문장 수: ${result.totalSentences}개`);
        console.log(`   추출 방식: ${result.extractionMethod}`);
        
        if (result.sentences.length > 0) {
          console.log('   📝 번호 문장들:');
          result.sentences.forEach(sentence => {
            console.log(`     ${sentence.number}. ${sentence.sentence}`);
          });
        } else {
          console.log('   ⚠️ 번호 문장 없음');
        }
      });
      
      console.log(`\n🔢 총 추출된 문장: ${totalSentences}개`);
      
      return results;
      
    } catch (error) {
      console.error('❌ 오늘 포스트 크롤링 실패:', error.message);
      return [];
    }
  }

  /**
   * RSS 피드에서 오늘 포스트들 추출
   */
  async getTodaysPostsFromRSS() {
    console.log('📡 RSS 피드에서 오늘 포스트 검색 중...');
    
    const rssUrl = `https://rss.blog.naver.com/${this.blogId}.xml`;
    
    try {
      const response = await this.makeRequestWithDecompression(rssUrl);
      console.log(`📄 RSS 데이터: ${response.length} 문자`);
      
      const $ = cheerio.load(response, { xmlMode: true });
      const todayPosts = [];
      
      $('item').each((index, item) => {
        const title = $(item).find('title').text().trim();
        const link = $(item).find('link').text().trim();
        const description = $(item).find('description').text().trim();
        const pubDate = $(item).find('pubDate').text().trim();
        
        if (title && link && pubDate) {
          // 날짜 파싱 및 오늘 날짜와 비교
          const postDate = this.parseRSSDate(pubDate);
          
          if (postDate === this.today) {
            todayPosts.push({
              title,
              url: link,
              description,
              pubDate,
              parsedDate: postDate
            });
            
            console.log(`🔍 오늘 포스트 발견: ${title} (${postDate})`);
          } else {
            console.log(`📅 다른 날짜 포스트: ${title} (${postDate})`);
          }
        }
      });
      
      console.log(`✅ RSS에서 오늘 포스트 ${todayPosts.length}개 발견`);
      return todayPosts;
      
    } catch (error) {
      console.error('❌ RSS 피드 접근 실패:', error.message);
      
      // RSS 실패 시 최신 포스트들 시도
      console.log('🔄 최신 포스트들로 대체 시도...');
      return await this.getLatestPostsAsFallback();
    }
  }

  /**
   * RSS 날짜 파싱 (여러 형식 지원)
   */
  parseRSSDate(rssDate) {
    try {
      // RSS 날짜 형식: "Tue, 27 Aug 2025 10:30:00 +0900"
      const date = new Date(rssDate);
      
      if (isNaN(date.getTime())) {
        console.log(`⚠️ 날짜 파싱 실패: ${rssDate}`);
        return null;
      }
      
      // YYYY-MM-DD 형식으로 변환 (한국 시간 기준)
      const koreanDate = new Date(date.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
      return koreanDate.toISOString().split('T')[0];
      
    } catch (error) {
      console.log(`⚠️ 날짜 변환 오류: ${rssDate} - ${error.message}`);
      return null;
    }
  }

  /**
   * RSS 실패 시 최신 포스트들로 대체
   */
  async getLatestPostsAsFallback() {
    console.log('🔄 RSS 대체: 최신 포스트들 확인...');
    
    try {
      // 모바일 버전에서 최신 포스트들 가져오기
      const mobileUrl = `https://m.blog.naver.com/${this.blogId}`;
      const response = await this.makeRequestWithDecompression(mobileUrl);
      const $ = cheerio.load(response);
      
      const posts = [];
      
      // 모바일 페이지에서 포스트 링크들 추출
      $('a[href*="m.blog.naver.com"]').each((index, element) => {
        const href = $(element).attr('href');
        const title = $(element).text().trim();
        
        if (href && title && href.includes(this.blogId) && title.length > 5) {
          posts.push({
            title,
            url: href,
            description: '',
            pubDate: new Date().toISOString(), // 오늘로 가정
            parsedDate: this.today
          });
        }
      });
      
      // 중복 제거 및 상위 3개만
      const uniquePosts = posts
        .filter((post, index, self) => 
          index === self.findIndex(p => p.url === post.url)
        )
        .slice(0, 3);
      
      console.log(`📱 모바일에서 ${uniquePosts.length}개 포스트 발견 (오늘 포스트로 가정)`);
      
      return uniquePosts;
      
    } catch (error) {
      console.error('❌ 대체 방법도 실패:', error.message);
      return [];
    }
  }
}

// 실행 함수
async function main() {
  const crawler = new TodaysPostCrawler();
  
  console.log('🚀 오늘의 네이버 블로그 포스트 크롤러 시작!\n');
  
  const results = await crawler.crawlTodaysPosts();
  
  if (results.length === 0) {
    console.log('\n😔 오늘 크롤링된 포스트가 없습니다.');
    console.log('   - RSS 피드에 오늘 날짜 포스트가 없거나');
    console.log('   - 모든 포스트의 크롤링이 실패했을 가능성');
  } else {
    console.log(`\n🎉 오늘 ${results.length}개 포스트 크롤링 완료!`);
  }
  
  return results;
}

// 명령줄 실행
if (require.main === module) {
  main();
}

module.exports = TodaysPostCrawler;