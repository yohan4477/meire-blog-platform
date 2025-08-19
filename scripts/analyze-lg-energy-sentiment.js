const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// LG에너지솔루션 관련 감정 분석 데이터
const lgEnergySentiments = [
  {
    post_id: 514,
    ticker: '373220',
    sentiment: 'positive',
    sentiment_score: 0.7,
    key_reasoning: '4680 배터리와 고체 배터리 기술 개발로 경쟁 우위 확보',
    supporting_evidence: 'LG에너지솔루션, BYD 등 배터리 업체들의 기술 경쟁 가속화',
    investment_perspective: '기술 혁신으로 시장 선도 가능성',
    investment_timeframe: '중장기',
    conviction_level: 'high',
    uncertainty_factors: '중국 업체들의 추격',
    mention_context: '전기차 배터리 기술 혁신과 투자 전략'
  },
  {
    post_id: 54,
    ticker: '373220',
    sentiment: 'negative',
    sentiment_score: -0.6,
    key_reasoning: '중국 CATL 나트륨 배터리 위협, 가격 경쟁력 압박',
    supporting_evidence: 'CATL 나트륨 배터리 2025년 12월 출시 예정, LFP 대비 24% 낮은 가격',
    investment_perspective: '기술 전환 압박과 수익성 하락 우려',
    investment_timeframe: '단기',
    conviction_level: 'medium',
    uncertainty_factors: 'CATL 기술 실제 성능, 한국 업체 대응력',
    mention_context: '나트륨 배터리 기술 위협'
  },
  {
    post_id: 309,
    ticker: '373220',
    sentiment: 'neutral',
    sentiment_score: 0,
    key_reasoning: '현대차 메타플랜트 LG에너지 합작 배터리셀 공장 구축',
    supporting_evidence: '미국 조지아주 메타플랜트 내 배터리셀 공장 준공',
    investment_perspective: '미국 현지 생산 확대로 IRA 대응',
    investment_timeframe: '중기',
    conviction_level: 'medium',
    uncertainty_factors: '트럼프 관세 정책 변화',
    mention_context: '현대차 메타플랜트 준공'
  },
  {
    post_id: 378,
    ticker: '373220',
    sentiment: 'neutral',
    sentiment_score: 0.1,
    key_reasoning: 'IRA 대응 미국 공장으로 북미 시장 경쟁력 확보',
    supporting_evidence: 'LG에너지솔루션 미국 공장 진행, 2030년 SIB 상용화 목표',
    investment_perspective: '현지화 전략으로 시장 방어',
    investment_timeframe: '중장기',
    conviction_level: 'medium',
    uncertainty_factors: '중국 자원 의존도, 거린메이 합작 리스크',
    mention_context: '이차전지 업체 미국 진출'
  },
  {
    post_id: 467,
    ticker: '373220',
    sentiment: 'positive',
    sentiment_score: 0.5,
    key_reasoning: '미국 리쇼어링 수혜로 현지 생산 확대',
    supporting_evidence: '미국 리쇼어링 정책으로 한국 기업 미국 투자 확대',
    investment_perspective: '양질의 일자리 창출과 시장 점유율 증대',
    investment_timeframe: '장기',
    conviction_level: 'high',
    uncertainty_factors: '미국 정책 지속성',
    mention_context: '리쇼어링과 한국 기업 미국 진출'
  }
];

// 감정 분석 데이터 삽입
function insertSentiments() {
  const stmt = db.prepare(`
    INSERT INTO sentiments (
      post_id, ticker, sentiment, sentiment_score,
      key_reasoning, supporting_evidence, investment_perspective,
      investment_timeframe, conviction_level, uncertainty_factors,
      mention_context, analysis_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))
  `);

  lgEnergySentiments.forEach(sentiment => {
    stmt.run([
      sentiment.post_id,
      sentiment.ticker,
      sentiment.sentiment,
      sentiment.sentiment_score,
      sentiment.key_reasoning,
      sentiment.supporting_evidence,
      sentiment.investment_perspective,
      sentiment.investment_timeframe,
      sentiment.conviction_level,
      sentiment.uncertainty_factors,
      sentiment.mention_context
    ], (err) => {
      if (err) {
        console.error(`Error inserting sentiment for post ${sentiment.post_id}:`, err);
      } else {
        console.log(`✅ Sentiment analysis added for post ${sentiment.post_id} - ${sentiment.sentiment}`);
      }
    });
  });

  stmt.finalize();
}

// analyzed_count 업데이트
function updateAnalyzedCount() {
  db.run(`
    UPDATE stocks 
    SET analyzed_count = (
      SELECT COUNT(DISTINCT post_id) 
      FROM sentiments 
      WHERE ticker = '373220'
    )
    WHERE ticker = '373220'
  `, (err) => {
    if (err) {
      console.error('Error updating analyzed_count:', err);
    } else {
      console.log('✅ Updated analyzed_count for LG에너지솔루션');
    }
  });
}

// 실행
console.log('🚀 Starting LG에너지솔루션 sentiment analysis...');
insertSentiments();

setTimeout(() => {
  updateAnalyzedCount();
  
  // 결과 확인
  db.all(`
    SELECT COUNT(*) as count 
    FROM sentiments 
    WHERE ticker = '373220'
  `, (err, rows) => {
    if (!err && rows[0]) {
      console.log(`\n📊 Total sentiments for 373220: ${rows[0].count}`);
    }
    
    db.close();
    console.log('\n✅ LG에너지솔루션 sentiment analysis complete!');
  });
}, 1000);