const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// TSMC 관련 감정 분석 데이터 (Claude 기반 직접 분석)
const tsmcSentiments = [
  {
    post_id: 513,
    ticker: 'TSM',
    sentiment: 'positive',
    sentiment_score: 0.7,
    key_reasoning: 'AI 칩 시장 급성장으로 TSMC 파운드리 사업 강화 전망',
    supporting_evidence: 'AI 칩 시장 성장과 삼성전자, TSMC, 엔비디아 경쟁 구도',
    investment_perspective: '파운드리 시장 선도 지위로 AI 붐 수혜',
    investment_timeframe: '중장기',
    conviction_level: 'high',
    uncertainty_factors: '경쟁 심화, 지정학적 리스크',
    mention_context: 'AI 반도체 시장 전환점'
  },
  {
    post_id: 12,
    ticker: 'TSM',
    sentiment: 'neutral',
    sentiment_score: 0.1,
    key_reasoning: '대만 정부 지분 7% 보유로 정부-민간 하이브리드 구조',
    supporting_evidence: '1987년 공기업 설립, 1992년 민영화 후 정부 대주주 유지',
    investment_perspective: '정부 지원과 규제 리스크 공존',
    investment_timeframe: '장기',
    conviction_level: 'medium',
    uncertainty_factors: '트럼프 관세 정책, 대만 지정학적 위험',
    mention_context: '대만 상호관세와 TSMC 정부 관계'
  },
  {
    post_id: 5,
    ticker: 'TSM',
    sentiment: 'negative',
    sentiment_score: -0.4,
    key_reasoning: '트럼프 인텔 CEO 사임 요구로 반도체 업계 정치적 리스크',
    supporting_evidence: '인텔 CEO 이해상충 지적, 미국 반도체 정책 불확실성',
    investment_perspective: '미국 반도체 보호주의 정책 리스크',
    investment_timeframe: '단기',
    conviction_level: 'medium',
    uncertainty_factors: '트럼프 정책 방향성, 미중 갈등',
    mention_context: '트럼프 인텔 CEO 사임 요구'
  },
  {
    post_id: 11,
    ticker: 'TSM',
    sentiment: 'positive',
    sentiment_score: 0.6,
    key_reasoning: '삼성전자 vs TSMC 경쟁에서 상대적 우위 유지',
    supporting_evidence: '삼성전자 3나노 수율 문제로 TSMC 시장 지위 공고화',
    investment_perspective: '경쟁사 기술 문제로 시장 점유율 확대',
    investment_timeframe: '중기',
    conviction_level: 'high',
    uncertainty_factors: '삼성전자 기술 개선, 미국 파운드리 투자',
    mention_context: '삼성전자 애플칩 수주와 트럼프 관세'
  },
  {
    post_id: 34,
    ticker: 'TSM',
    sentiment: 'positive',
    sentiment_score: 0.8,
    key_reasoning: '삼성전자 3나노 수율 실패로 TSMC 기술 우위 확실',
    supporting_evidence: '삼성 3나노 수율 문제, TSMC 파운드리 기술 격차 확대',
    investment_perspective: '기술 우위로 고객사 이탈 방지 및 점유율 확대',
    investment_timeframe: '중장기',
    conviction_level: 'high',
    uncertainty_factors: '삼성전자 수율 개선 가능성',
    mention_context: '삼성전자 vs TSMC 3나노 기술 경쟁'
  }
];

// 감정 분석 데이터 삽입
function insertTSMCSentiments() {
  const stmt = db.prepare(`
    INSERT INTO sentiments (
      post_id, ticker, sentiment, sentiment_score,
      key_reasoning, supporting_evidence, investment_perspective,
      investment_timeframe, conviction_level, uncertainty_factors,
      mention_context, analysis_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))
  `);

  tsmcSentiments.forEach(sentiment => {
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
        console.log(`✅ TSMC sentiment analysis added for post ${sentiment.post_id} - ${sentiment.sentiment}`);
      }
    });
  });

  stmt.finalize();
}

// stocks 테이블에 TSMC 정보 업데이트
function updateTSMCStockInfo() {
  // TSMC가 stocks 테이블에 있는지 확인하고 업데이트
  db.run(`
    INSERT OR REPLACE INTO stocks (
      ticker, company_name, market, sector, industry, description,
      mention_count, analyzed_count, 
      first_mentioned_date, last_mentioned_date
    ) VALUES (
      'TSM', 'TSMC', 'NYSE', 'Technology', 'Semiconductors',
      '세계 최대 반도체 파운드리 기업, AI 칩 생산의 핵심 업체',
      ?, ?,
      (SELECT MIN(created_date) FROM blog_posts WHERE id IN (513, 12, 5, 11, 34)),
      (SELECT MAX(created_date) FROM blog_posts WHERE id IN (513, 12, 5, 11, 34))
    )
  `, [5, 5], (err) => {
    if (err) {
      console.error('Error updating TSMC stock info:', err);
    } else {
      console.log('✅ TSMC stock information updated');
    }
  });
}

// 실행
console.log('🚀 Starting TSMC sentiment analysis...');
insertTSMCSentiments();

setTimeout(() => {
  updateTSMCStockInfo();
  
  // 결과 확인
  db.all(`
    SELECT COUNT(*) as count 
    FROM sentiments 
    WHERE ticker = 'TSM'
  `, (err, rows) => {
    if (!err && rows[0]) {
      console.log(`\n📊 Total sentiments for TSM: ${rows[0].count}`);
    }
    
    // 감정 분포 확인
    db.all(`
      SELECT sentiment, COUNT(*) as count
      FROM sentiments 
      WHERE ticker = 'TSM'
      GROUP BY sentiment
    `, (err, rows) => {
      if (!err) {
        console.log('\n📈 TSMC 감정 분석 결과:');
        rows.forEach(row => {
          const emoji = row.sentiment === 'positive' ? '😊' : 
                       row.sentiment === 'negative' ? '😟' : '😐';
          console.log(`  ${emoji} ${row.sentiment}: ${row.count}개`);
        });
      }
      
      db.close();
      console.log('\n✅ TSMC sentiment analysis complete!');
    });
  });
}, 1000);