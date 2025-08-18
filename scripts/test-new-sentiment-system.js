/**
 * 새로운 근거 기반 감정 분석 시스템 테스트
 */

const SentimentAnalyzer = require('../src/lib/sentiment-analyzer.js');

async function testNewSentimentSystem() {
  console.log('🎯 새로운 근거 기반 감정 분석 시스템 테스트');
  
  const analyzer = new SentimentAnalyzer();
  
  // 테스트 케이스들
  const testCases = [
    {
      ticker: '005930',
      stockName: '삼성전자',
      text: '삼성전자가 애플로부터 23조원 규모의 AI6 칩 대량 생산 계약을 체결했다. 이는 파운드리 사업의 큰 전환점이 될 것으로 전망된다.'
    },
    {
      ticker: 'TSLA',
      stockName: '테슬라',
      text: '테슬라가 중국에서 판매량이 급격히 감소하고 있으며, 경쟁사들의 공격적인 가격 정책으로 시장 점유율이 하락하고 있다.'
    },
    {
      ticker: '267250',
      stockName: 'HD현대',
      text: 'HD현대가 정부의 K-조선 프로젝트에 선정되어 5조원 규모의 정부 지원을 받게 되었다. 이는 친환경 선박 기술 개발에 큰 도움이 될 전망이다.'
    },
    {
      ticker: 'NVDA',
      stockName: '엔비디아',
      text: '엔비디아가 신제품 RTX 5090을 출시하며 AI 컴퓨팅 시장에서의 기술적 우위를 더욱 확고히 했다. 시장 점유율 확대가 예상된다.'
    },
    {
      ticker: 'INTC',
      stockName: '인텔',
      text: '인텔이 신제품 출시 지연과 기술적 결함으로 인해 대규모 리콜을 실시했다. 이로 인한 손실이 클 것으로 예상된다.'
    }
  ];
  
  console.log('\n📊 테스트 결과:');
  console.log('='.repeat(60));
  
  for (const testCase of testCases) {
    const result = await analyzer.analyzeWithReasoning(
      testCase.text, 
      testCase.ticker, 
      testCase.stockName
    );
    
    const sentimentEmoji = result.sentiment === 'positive' ? '📈' 
      : result.sentiment === 'negative' ? '📉' : '📊';
    
    console.log(`\n${sentimentEmoji} ${testCase.stockName} (${testCase.ticker})`);
    console.log(`감정: ${result.sentiment} (신뢰도: ${(result.confidence * 100).toFixed(0)}%)`);
    console.log(`근거: ${result.key_reasoning}`);
    console.log(`원문: ${testCase.text.substring(0, 100)}...`);
    console.log('-'.repeat(50));
  }
  
  console.log('\n✅ 테스트 완료!');
  console.log('🎯 주요 개선사항:');
  console.log('• 키워드 카운팅 → 비즈니스 임팩트 기반 분석');
  console.log('• 모호한 점수 → 명확한 근거 제시');
  console.log('• 일반적 키워드 → 구체적 비즈니스 영향 분석');
}

// 테스트 실행
testNewSentimentSystem().catch(console.error);