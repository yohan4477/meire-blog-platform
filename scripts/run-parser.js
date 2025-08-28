/**
 * 🚀 네이버 블로그 파서 실행 스크립트
 * 사용법: node scripts/run-parser.js [옵션]
 */

const NaverBlogParser = require('./naver-blog-parser');

async function main() {
  console.log('🚀 네이버 블로그 (ranto28) 파싱 시작!\n');

  const parser = new NaverBlogParser();

  try {
    // 실제 파싱 실행 (최대 3개 포스트)
    const results = await parser.run({
      maxPosts: 3,
      saveResults: true,
      testMode: false
    });

    console.log('\n📊 최종 결과:');
    console.log(`✅ 파싱 성공: ${results.length}개 포스트`);
    
    if (results.length > 0) {
      console.log('\n📝 파싱된 포스트들:');
      results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.title}`);
        console.log(`   문장 수: ${result.totalSentences}개`);
        console.log(`   URL: ${result.url}`);
        
        // 처음 2개 문장만 미리보기로 표시
        if (result.sentences.length > 0) {
          console.log('   미리보기:');
          result.sentences.slice(0, 2).forEach(sentence => {
            console.log(`     ${sentence.number}. ${sentence.sentence.substring(0, 50)}${sentence.sentence.length > 50 ? '...' : ''}`);
          });
        }
      });
    }

  } catch (error) {
    console.error('❌ 파싱 실행 실패:', error.message);
    process.exit(1);
  }
}

// 실행
if (require.main === module) {
  main();
}