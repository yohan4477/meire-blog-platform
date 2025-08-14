/**
 * 감정 분석 실행 스크립트
 * 
 * 사용법:
 * node scripts/analyze-sentiment.js [limit]
 * 
 * 예시:
 * node scripts/analyze-sentiment.js 50  # 최근 50개 포스트 분석
 * node scripts/analyze-sentiment.js     # 기본 100개 포스트 분석
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SentimentAnalyzer = require('../src/lib/sentiment-analyzer');

async function main() {
  console.log('🚀 감정 분석 시스템 시작...\n');
  
  const limit = parseInt(process.argv[2]) || 100;
  console.log(`📊 최대 ${limit}개 포스트를 분석합니다.\n`);
  
  const analyzer = new SentimentAnalyzer();
  
  try {
    const startTime = Date.now();
    
    // 배치 분석 실행
    const results = await analyzer.analyzeAllPosts(limit);
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n🎉 감정 분석 완료!');
    console.log(`⏱️  소요 시간: ${duration}초`);
    console.log(`📈 분석된 종목 언급: ${results.length}개`);
    
    // 결과 요약
    const sentimentCounts = results.reduce((acc, result) => {
      acc[result.sentiment] = (acc[result.sentiment] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 감정 분석 결과 요약:');
    console.log(`   긍정적: ${sentimentCounts.positive || 0}개`);
    console.log(`   부정적: ${sentimentCounts.negative || 0}개`);
    console.log(`   중립적: ${sentimentCounts.neutral || 0}개`);
    
    // 종목별 요약
    const tickerCounts = results.reduce((acc, result) => {
      acc[result.ticker] = (acc[result.ticker] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n🏢 종목별 언급 횟수:');
    Object.entries(tickerCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([ticker, count]) => {
        console.log(`   ${ticker}: ${count}개`);
      });
    
  } catch (error) {
    console.error('❌ 감정 분석 실패:', error);
    process.exit(1);
  }
}

// 특정 종목의 감정 분석 결과 조회 함수
async function checkSentiment(ticker) {
  console.log(`🔍 ${ticker} 종목의 감정 분석 결과 조회...\n`);
  
  const analyzer = new SentimentAnalyzer();
  
  try {
    const results = await analyzer.getSentimentByTicker(ticker, 10);
    
    if (results.length === 0) {
      console.log(`⚠️ ${ticker} 종목에 대한 감정 분석 결과가 없습니다.`);
      return;
    }
    
    console.log(`📊 ${ticker} 최근 ${results.length}개 포스트 감정 분석:`);
    console.log('-'.repeat(80));
    
    results.forEach((result, index) => {
      const date = new Date(result.post_date).toLocaleDateString('ko-KR');
      const scoreDisplay = result.sentiment_score > 0 ? `+${result.sentiment_score}` : result.sentiment_score;
      
      console.log(`${index + 1}. ${result.title.slice(0, 40)}...`);
      console.log(`   📅 ${date} | 감정: ${result.sentiment} (${scoreDisplay}) | 신뢰도: ${result.confidence}`);
      console.log(`   💬 "${result.context_snippet.slice(0, 100)}..."`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 감정 분석 결과 조회 실패:', error);
  }
}

// 명령행 인수 처리
if (process.argv.includes('--check') || process.argv.includes('-c')) {
  const ticker = process.argv[process.argv.indexOf('--check') + 1] || process.argv[process.argv.indexOf('-c') + 1];
  if (!ticker) {
    console.error('❌ 종목 코드를 입력하세요. 예: node scripts/analyze-sentiment.js --check TSLA');
    process.exit(1);
  }
  checkSentiment(ticker.toUpperCase());
} else {
  main();
}