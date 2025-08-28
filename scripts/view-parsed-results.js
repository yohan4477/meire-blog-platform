/**
 * 📄 파싱 결과 뷰어
 * 파싱된 JSON 파일들을 이쁘게 콘솔에 출력
 */

const fs = require('fs');
const path = require('path');

class ParsedResultsViewer {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data', 'parsed-posts');
  }

  /**
   * 모든 파싱 결과 파일 표시
   */
  async viewAll() {
    console.log('📋 네이버 블로그 파싱 결과 뷰어\n');
    
    try {
      const files = fs.readdirSync(this.dataDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      if (jsonFiles.length === 0) {
        console.log('❌ 파싱 결과 파일이 없습니다.');
        return;
      }
      
      console.log(`📁 발견된 파일: ${jsonFiles.length}개\n`);
      
      for (const file of jsonFiles) {
        await this.viewFile(file);
        console.log('\n' + '='.repeat(80) + '\n');
      }
      
    } catch (error) {
      console.error('❌ 파일 읽기 실패:', error.message);
    }
  }

  /**
   * 특정 파일 내용 표시
   */
  async viewFile(filename) {
    const filePath = path.join(this.dataDir, filename);
    
    try {
      console.log(`📄 파일: ${filename}`);
      console.log(`📍 경로: ${filePath}`);
      
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // 파일 유형별 처리
      if (filename.includes('demo-results')) {
        this.viewDemoResults(data);
      } else if (filename.includes('latest-post-crawl')) {
        this.viewCrawlResults(data);
      } else if (Array.isArray(data)) {
        this.viewPostArray(data);
      } else {
        this.viewGenericData(data);
      }
      
    } catch (error) {
      console.error(`❌ ${filename} 파싱 실패:`, error.message);
    }
  }

  /**
   * 데모 결과 표시
   */
  viewDemoResults(data) {
    console.log(`⏰ 생성일: ${new Date(data.timestamp).toLocaleString('ko-KR')}\n`);
    
    // 테스트 1
    if (data.test1) {
      console.log('📱 테스트 1: ' + data.test1.title);
      console.log('   원본 HTML 길이:', data.test1.originalHtml.length, '문자');
      console.log('   정리된 텍스트:', `"${data.test1.cleanText}"`);
      console.log('   추출된 문장:', data.test1.sentences.length, '개');
      
      data.test1.sentences.forEach(sentence => {
        console.log(`   ${sentence.number}. ${sentence.sentence}`);
      });
      console.log();
    }
    
    // 테스트 2
    if (data.test2) {
      console.log('📱 테스트 2: ' + data.test2.title);
      console.log('   원본 HTML 길이:', data.test2.originalHtml.length, '문자');
      console.log('   정리된 텍스트:', `"${data.test2.cleanText}"`);
      console.log('   추출된 문장:', data.test2.sentences.length, '개');
      
      data.test2.sentences.forEach(sentence => {
        console.log(`   ${sentence.number}. ${sentence.sentence}`);
      });
    }
  }

  /**
   * 크롤링 결과 표시
   */
  viewCrawlResults(data) {
    if (Array.isArray(data)) {
      console.log(`📊 크롤링된 포스트: ${data.length}개\n`);
      
      data.forEach((post, index) => {
        console.log(`${index + 1}. ${post.title || 'Unknown Title'}`);
        console.log(`   URL: ${post.url}`);
        console.log(`   추출 방식: ${post.extractionMethod || 'unknown'}`);
        console.log(`   문장 수: ${post.totalSentences || 0}개`);
        console.log(`   생성일: ${new Date(post.timestamp).toLocaleString('ko-KR')}`);
        
        if (post.sentences && post.sentences.length > 0) {
          console.log('   📝 추출된 문장:');
          post.sentences.forEach(sentence => {
            console.log(`     ${sentence.number}. ${sentence.sentence}`);
          });
        } else {
          console.log('   ⚠️  번호 문장 없음');
          if (post.rawContent) {
            console.log(`   📄 원본 텍스트 샘플: "${post.rawContent.substring(0, 100)}..."`);
          }
        }
        console.log();
      });
    }
  }

  /**
   * 포스트 배열 표시
   */
  viewPostArray(data) {
    console.log(`📊 포스트 배열: ${data.length}개 항목\n`);
    
    data.forEach((item, index) => {
      console.log(`${index + 1}. ${JSON.stringify(item, null, 2)}`);
    });
  }

  /**
   * 일반 데이터 표시
   */
  viewGenericData(data) {
    console.log('📄 일반 데이터:\n');
    console.log(JSON.stringify(data, null, 2));
  }

  /**
   * 특정 파일만 보기
   */
  async viewSpecific(filename) {
    console.log(`🔍 특정 파일 보기: ${filename}\n`);
    await this.viewFile(filename);
  }

  /**
   * 통계 요약
   */
  async showSummary() {
    console.log('📊 파싱 결과 통계 요약\n');
    
    try {
      const files = fs.readdirSync(this.dataDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      let totalPosts = 0;
      let totalSentences = 0;
      let successfulParsing = 0;
      
      for (const file of jsonFiles) {
        const filePath = path.join(this.dataDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        if (file.includes('demo-results')) {
          if (data.test1 && data.test1.sentences) {
            totalPosts++;
            totalSentences += data.test1.sentences.length;
            if (data.test1.sentences.length > 0) successfulParsing++;
          }
          if (data.test2 && data.test2.sentences) {
            totalPosts++;
            totalSentences += data.test2.sentences.length;
            if (data.test2.sentences.length > 0) successfulParsing++;
          }
        } else if (Array.isArray(data)) {
          data.forEach(post => {
            totalPosts++;
            if (post.sentences) {
              totalSentences += post.sentences.length;
              if (post.sentences.length > 0) successfulParsing++;
            }
          });
        }
      }
      
      console.log(`📄 총 파일 수: ${jsonFiles.length}개`);
      console.log(`📝 총 포스트 수: ${totalPosts}개`);
      console.log(`✅ 성공적 파싱: ${successfulParsing}개`);
      console.log(`🔢 총 문장 수: ${totalSentences}개`);
      console.log(`📈 성공률: ${totalPosts > 0 ? Math.round((successfulParsing / totalPosts) * 100) : 0}%`);
      
    } catch (error) {
      console.error('❌ 통계 생성 실패:', error.message);
    }
  }
}

// 명령줄 실행
async function main() {
  const viewer = new ParsedResultsViewer();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 사용법:');
    console.log('  node view-parsed-results.js                 # 모든 결과 보기');
    console.log('  node view-parsed-results.js --summary       # 통계 요약');
    console.log('  node view-parsed-results.js demo-results.json  # 특정 파일');
    console.log();
    
    await viewer.viewAll();
  } else if (args[0] === '--summary') {
    await viewer.showSummary();
  } else {
    await viewer.viewSpecific(args[0]);
  }
}

if (require.main === module) {
  main();
}

module.exports = ParsedResultsViewer;