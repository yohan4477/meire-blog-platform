// 8월 20일 포스트 감정 분석 스크립트
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// 8월 20일 포스트별 감정 분석 데이터
const sentimentAnalysis = [
  // 포스트 520: 트럼프 재집권과 미국 첨단산업 정책 변화 전망
  {
    post_id: 520,
    ticker: "INTC",
    sentiment: "positive",
    sentiment_score: 0.8,
    confidence: 0.9,
    key_reasoning: "트럼프 정부의 CHIPS Act 지속 추진과 정부 지원 확대로 인텔이 직접적 수혜를 받을 것으로 전망됨",
    context_snippet: "인텔에 대한 정부 지원 확대 가능성",
    created_at: "2025-08-20 09:15:00"
  },
  {
    post_id: 520,
    ticker: "TSLA",
    sentiment: "positive",
    sentiment_score: 0.7,
    confidence: 0.8,
    key_reasoning: "IRA 전기차 세액공제 축소에도 불구하고 경쟁사 대비 상대적 우위 확보로 오히려 유리한 환경",
    context_snippet: "테슬라에게는 오히려 유리한 환경 조성",
    created_at: "2025-08-20 09:15:00"
  },
  // 포스트 521: 중국 경기부양책과 글로벌 원자재 시장 영향
  {
    post_id: 521,
    ticker: "267250",
    sentiment: "positive",
    sentiment_score: 0.8,
    confidence: 0.9,
    key_reasoning: "중국 경기부양책으로 해상 물동량 증가 기대되어 조선업에 추가 호재",
    context_snippet: "해상 물동량 증가 기대",
    created_at: "2025-08-20 14:20:00"
  },
  {
    post_id: 521,
    ticker: "042660",
    sentiment: "positive",
    sentiment_score: 0.8,
    confidence: 0.9,
    key_reasoning: "중국의 대규모 인프라 투자로 조선업 호재가 지속되며 추가 상승 여력 보유",
    context_snippet: "조선업 추가 상승 여력",
    created_at: "2025-08-20 14:20:00"
  },
  // 포스트 522: 메타버스 2.0 시대의 도래
  {
    post_id: 522,
    ticker: "AAPL",
    sentiment: "positive",
    sentiment_score: 0.8,
    confidence: 0.9,
    key_reasoning: "Vision Pro 2세대로 프리미엄 VR 시장 선점하며 생태계 확장 효과 기대",
    context_snippet: "프리미엄 VR 시장 선점",
    created_at: "2025-08-20 17:45:00"
  },
  {
    post_id: 522,
    ticker: "META",
    sentiment: "positive",
    sentiment_score: 0.9,
    confidence: 0.9,
    key_reasoning: "Quest 4로 대중화 시장 공략하며 메타버스 퍼스트무버로서 광고 플랫폼 확장 기대",
    context_snippet: "대중화 시장 공략 및 메타버스 선도",
    created_at: "2025-08-20 17:45:00"
  },
  {
    post_id: 522,
    ticker: "NVDA",
    sentiment: "positive",
    sentiment_score: 0.9,
    confidence: 0.9,
    key_reasoning: "VR/AR 칩셋 공급 독점과 클라우드 렌더링 서비스로 메타버스 인프라 선점",
    context_snippet: "VR/AR 칩셋 공급 독점",
    created_at: "2025-08-20 17:45:00"
  },
  {
    post_id: 522,
    ticker: "005930",
    sentiment: "positive",
    sentiment_score: 0.7,
    confidence: 0.8,
    key_reasoning: "OLED 디스플레이와 메모리 반도체 공급으로 VR 시장 성장에 따른 수혜 기대",
    context_snippet: "OLED 디스플레이 및 메모리 공급",
    created_at: "2025-08-20 17:45:00"
  }
];

console.log('🚀 Starting sentiment analysis for August 20 posts...');

// 감정 분석 데이터 삽입 함수
function insertSentimentAnalysis(data) {
  return new Promise((resolve, reject) => {
    // 먼저 중복 체크
    db.get(
      'SELECT id FROM sentiments WHERE post_id = ? AND ticker = ?',
      [data.post_id, data.ticker],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          console.log(`⏭️ Sentiment for ${data.ticker} in post ${data.post_id} already exists, skipping...`);
          resolve(false);
          return;
        }
        
        // 새 감정 분석 삽입 (CLAUDE.md 기준 스키마)
        const stmt = db.prepare(`
          INSERT INTO sentiments 
          (post_id, ticker, sentiment, sentiment_score, key_reasoning, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([
          data.post_id,
          data.ticker,
          data.sentiment,
          data.sentiment_score,
          data.key_reasoning,
          data.created_at
        ], function(err) {
          if (err) {
            reject(err);
          } else {
            const emoji = data.sentiment === 'positive' ? '🟢' : 
                         data.sentiment === 'negative' ? '🔴' : '🔵';
            console.log(`✅ ${emoji} Analyzed: Post ${data.post_id} - ${data.ticker} (${data.sentiment})`);
            resolve(true);
          }
          stmt.finalize();
        });
      }
    );
  });
}

// 모든 감정 분석 처리
async function processSentimentAnalysis() {
  let insertedCount = 0;
  const sentimentSummary = {};
  
  for (const data of sentimentAnalysis) {
    try {
      const inserted = await insertSentimentAnalysis(data);
      if (inserted) {
        insertedCount++;
        
        // 요약 통계 업데이트
        if (!sentimentSummary[data.ticker]) {
          sentimentSummary[data.ticker] = { positive: 0, negative: 0, neutral: 0, total: 0 };
        }
        sentimentSummary[data.ticker][data.sentiment]++;
        sentimentSummary[data.ticker].total++;
      }
      
      // 잠시 대기 (DB 부하 방지)
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`❌ Error processing sentiment for ${data.ticker} in post ${data.post_id}:`, error);
    }
  }
  
  console.log(`\n✨ Successfully analyzed ${insertedCount} stock sentiments for August 20!`);
  
  // 캐시 테이블 클리어
  console.log('\n🧹 Clearing cache tables...');
  await new Promise((resolve) => {
    db.run('DELETE FROM merry_picks_cache', (err) => {
      if (err) {
        console.error('❌ Error clearing cache:', err);
      } else {
        console.log('🗑️ Cleared cache: merry_picks_cache');
      }
      resolve();
    });
  });
  
  // 감정 분석 요약
  console.log('\n📊 August 20 Sentiment Analysis Summary:');
  Object.entries(sentimentSummary).forEach(([ticker, stats]) => {
    const emoji = stats.positive > stats.negative ? '🟢' : 
                  stats.negative > stats.positive ? '🔴' : '🔵';
    const mainSentiment = stats.positive > stats.negative ? 'positive' :
                         stats.negative > stats.positive ? 'negative' : 'neutral';
    console.log(`  ${emoji} ${ticker}: ${stats.total} mentions (${mainSentiment})`);
  });
  
  // 최신 감정 분석 결과 확인
  db.all(`
    SELECT ticker, sentiment, COUNT(*) as count, AVG(sentiment_score) as avg_score
    FROM sentiments 
    WHERE created_at >= '2025-08-20'
    GROUP BY ticker, sentiment
    ORDER BY ticker, sentiment
  `, [], (err, rows) => {
    if (err) {
      console.error('❌ Error fetching sentiment summary:', err);
    } else {
      console.log('\n📈 August 20 Detailed Sentiment Breakdown:');
      let currentTicker = '';
      rows.forEach(row => {
        if (currentTicker !== row.ticker) {
          currentTicker = row.ticker;
          console.log(`\n  ${row.ticker}:`);
        }
        const emoji = row.sentiment === 'positive' ? '🟢' : 
                     row.sentiment === 'negative' ? '🔴' : '🔵';
        console.log(`    ${emoji} ${row.sentiment}: ${row.count}회 (점수: ${(row.avg_score || 0).toFixed(1)})`);
      });
    }
    
    db.close();
    console.log('\n🎉 August 20 sentiment analysis completed! Cache cleared, ready for reload.');
  });
}

processSentimentAnalysis();