// 최신 포스트 감정 분석 스크립트 (CLAUDE.md 기반)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// CLAUDE.md 기반 감정 분석 규칙
// - Claude가 직접 포스트 내용을 읽고 논리적으로 감정 판단
// - 키워드 매칭이 아닌 문맥과 의도 파악
// - 투자 관점에서의 긍정/부정/중립 판단

const sentimentAnalysis = [
  // Post 516: 글로벌 반도체 공급망 재편
  {
    post_id: 516,
    ticker: '005930', // 삼성전자
    sentiment: 'positive',
    sentiment_score: 0.7,
    key_reasoning: 'HBM 시장 진입과 파운드리 2위 수성으로 성장 기회 확대'
  },
  {
    post_id: 516,
    ticker: 'TSM', // TSMC
    sentiment: 'positive',
    sentiment_score: 0.9,
    key_reasoning: '3나노 공정 양산과 기술 리더십으로 시장 지배력 강화'
  },
  {
    post_id: 516,
    ticker: 'INTC', // 인텔
    sentiment: 'neutral',
    sentiment_score: 0.0,
    key_reasoning: '파운드리 진출은 긍정적이나 아직 갈 길이 멀다는 평가'
  },
  {
    post_id: 516,
    ticker: 'NVDA', // NVIDIA (간접 언급)
    sentiment: 'positive',
    sentiment_score: 0.8,
    key_reasoning: 'SK하이닉스와의 HBM 파트너십으로 AI 칩 경쟁력 강화'
  },
  
  // Post 517: 헬스케어 AI 혁명
  {
    post_id: 517,
    ticker: 'LLY', // 일라이릴리
    sentiment: 'positive',
    sentiment_score: 0.85,
    key_reasoning: 'AI 활용 신약 개발로 시간과 비용 획기적 단축, 알츠하이머 치료제 돌파구'
  },
  {
    post_id: 517,
    ticker: 'UNH', // 유나이티드헬스케어
    sentiment: 'positive',
    sentiment_score: 0.75,
    key_reasoning: 'AI로 보험 심사와 의료 서비스 혁신, 예측 분석 통한 질병 예방'
  },
  {
    post_id: 517,
    ticker: 'GOOGL', // 구글
    sentiment: 'positive',
    sentiment_score: 0.8,
    key_reasoning: 'DeepMind의 AlphaFold로 제약 산업 혁명, 신약 개발 게임 체인저'
  },
  {
    post_id: 517,
    ticker: 'META', // 메타
    sentiment: 'positive',
    sentiment_score: 0.7,
    key_reasoning: 'ESMFold 오픈소스 공개로 AI 플랫폼 가치 상승'
  },
  
  // Post 518: 전기차 시장
  {
    post_id: 518,
    ticker: 'TSLA', // 테슬라
    sentiment: 'neutral',
    sentiment_score: 0.1,
    key_reasoning: '글로벌 리더 지위 유지하나 중국 기업들의 거센 추격 직면'
  },
  {
    post_id: 518,
    ticker: 'AAPL', // 애플
    sentiment: 'negative',
    sentiment_score: -0.6,
    key_reasoning: '전기차 프로젝트 포기로 시장 진입 실패'
  },
  
  // Post 519: 조선업 슈퍼사이클
  {
    post_id: 519,
    ticker: '267250', // HD현대
    sentiment: 'positive',
    sentiment_score: 0.9,
    key_reasoning: 'LNG선과 컨테이너선 수주 독식, 2027년까지 수주 잔량 확보'
  },
  {
    post_id: 519,
    ticker: '042660', // 한화오션
    sentiment: 'positive',
    sentiment_score: 0.85,
    key_reasoning: '턴어라운드 성공, 포트폴리오 다각화로 수익성 개선'
  },
  {
    post_id: 519,
    ticker: '010620', // 현대미포조선
    sentiment: 'positive',
    sentiment_score: 0.8,
    key_reasoning: '중형선 시장 장악, PC선과 중형 컨테이너선 독보적 위치'
  }
];

// 감정 분석 데이터 삽입
async function insertSentiment(sentiment) {
  return new Promise((resolve, reject) => {
    // 먼저 기존 데이터 삭제
    db.run(
      "DELETE FROM sentiments WHERE post_id = ? AND ticker = ?",
      [sentiment.post_id, sentiment.ticker],
      (err) => {
        if (err) {
          console.error(`❌ Error deleting old sentiment:`, err);
          reject(err);
          return;
        }
        
        // 새 데이터 삽입
        const query = `
          INSERT INTO sentiments 
          (post_id, ticker, sentiment, sentiment_score,
           key_reasoning, created_at, analysis_date)
          VALUES (?, ?, ?, ?, ?, datetime('now'), date('now'))
        `;
        
        db.run(query, [
          sentiment.post_id,
          sentiment.ticker,
          sentiment.sentiment,
          sentiment.sentiment_score,
          sentiment.key_reasoning
        ], function(err) {
          if (err) {
            console.error(`❌ Error inserting sentiment:`, err);
            reject(err);
          } else {
            console.log(`✅ Analyzed: Post ${sentiment.post_id} - ${sentiment.ticker} (${sentiment.sentiment})`);
            resolve(this.lastID);
          }
        });
      }
    );
  });
}

// 캐시 테이블 비우기
async function clearCache() {
  return new Promise((resolve, reject) => {
    const tables = [
      'merry_picks_cache',
      'merry_sentiment_cache',
      'merry_posts_cache'
    ];
    
    let completed = 0;
    tables.forEach(table => {
      db.run(`DELETE FROM ${table}`, (err) => {
        if (err && !err.message.includes('no such table')) {
          console.error(`⚠️ Error clearing ${table}:`, err.message);
        } else if (!err) {
          console.log(`🗑️ Cleared cache: ${table}`);
        }
        completed++;
        if (completed === tables.length) {
          resolve();
        }
      });
    });
  });
}

// 메인 실행
async function main() {
  console.log('🚀 Starting sentiment analysis for recent posts (CLAUDE.md based)...\n');
  
  try {
    // 감정 분석 수행
    for (const sentiment of sentimentAnalysis) {
      await insertSentiment(sentiment);
    }
    
    console.log(`\n✨ Successfully analyzed ${sentimentAnalysis.length} stock mentions!`);
    
    // 캐시 비우기
    console.log('\n🧹 Clearing cache tables...');
    await clearCache();
    
    // 분석 결과 확인
    console.log('\n📊 Sentiment Analysis Summary:');
    db.all(
      `SELECT 
        s.ticker,
        COUNT(*) as mentions,
        AVG(CASE WHEN s.sentiment = 'positive' THEN 1 
                 WHEN s.sentiment = 'negative' THEN -1 
                 ELSE 0 END) as avg_sentiment,
        GROUP_CONCAT(DISTINCT s.sentiment) as sentiments
       FROM sentiments s
       WHERE s.post_id IN (516, 517, 518, 519)
       GROUP BY s.ticker
       ORDER BY mentions DESC`,
      [],
      (err, rows) => {
        if (err) {
          console.error('Error fetching summary:', err);
        } else {
          rows.forEach(row => {
            const sentimentIcon = 
              row.avg_sentiment > 0.5 ? '🟢' :
              row.avg_sentiment < -0.5 ? '🔴' : '🔵';
            console.log(`  ${sentimentIcon} ${row.ticker}: ${row.mentions} mentions (${row.sentiments})`);
          });
        }
        
        console.log('\n✅ All tasks completed! Cache cleared, ready for reload.');
        db.close();
      }
    );
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    db.close();
    process.exit(1);
  }
}

// 실행
main();