// 8월 20일 포스트의 언급 종목 업데이트 스크립트
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// 8월 20일 포스트별 언급 종목 매핑
const postStockMentions = [
  {
    postId: 520,
    title: "트럼프 재집권과 미국 첨단산업 정책 변화 전망",
    date: "2025-08-20",
    stocks: [
      { ticker: "INTC", context: "정부 지원 확대 수혜 기업", sentiment: "positive" },
      { ticker: "TSLA", context: "경쟁사 대비 상대적 우위", sentiment: "positive" },
      { ticker: "XOM", context: "에너지 정책 수혜", sentiment: "positive" },
      { ticker: "PLTR", context: "정부 계약 확대", sentiment: "positive" }
    ]
  },
  {
    postId: 521,
    title: "중국 경기부양책과 글로벌 원자재 시장 영향",
    date: "2025-08-20",
    stocks: [
      { ticker: "005490", context: "철강 수요 증가 수혜", sentiment: "positive" },
      { ticker: "004020", context: "철강 관련 업종 호재", sentiment: "positive" },
      { ticker: "003470", context: "구리 수요 확대 수혜", sentiment: "positive" },
      { ticker: "096770", context: "유가 상승으로 정유업 수혜", sentiment: "positive" },
      { ticker: "010950", context: "정유 업종 호재", sentiment: "positive" },
      { ticker: "267250", context: "해상 물동량 증가 기대", sentiment: "positive" },
      { ticker: "042660", context: "조선업 추가 상승 여력", sentiment: "positive" }
    ]
  },
  {
    postId: 522,
    title: "메타버스 2.0 시대의 도래 - 애플 Vision Pro vs 메타 Quest 4",
    date: "2025-08-20",
    stocks: [
      { ticker: "AAPL", context: "프리미엄 VR 시장 선점", sentiment: "positive" },
      { ticker: "META", context: "대중화 시장 공략 및 메타버스 선도", sentiment: "positive" },
      { ticker: "NVDA", context: "VR/AR 칩셋 공급 독점", sentiment: "positive" },
      { ticker: "005930", context: "OLED 디스플레이 및 메모리 공급", sentiment: "positive" }
    ]
  }
];

console.log('🚀 Starting stock mentions update for August 20 posts...');

// 종목 언급 정보 삽입 함수
function insertStockMention(postId, postTitle, date, stock) {
  return new Promise((resolve, reject) => {
    // 먼저 중복 체크
    db.get(
      'SELECT id FROM merry_mentioned_stocks WHERE post_id = ? AND ticker = ?',
      [postId, stock.ticker],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          console.log(`⏭️ Stock mention ${stock.ticker} for post ${postId} already exists, skipping...`);
          resolve(false);
          return;
        }
        
        // 새 언급 정보 삽입
        const stmt = db.prepare(`
          INSERT INTO merry_mentioned_stocks 
          (post_id, ticker, mentioned_date, context, sentiment_score, mention_type)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        // 감정에 따른 점수 계산
        const sentimentScore = stock.sentiment === 'positive' ? 0.8 : 
                              stock.sentiment === 'negative' ? -0.6 : 0.0;
        
        stmt.run([
          postId,
          stock.ticker,
          date,
          stock.context,
          sentimentScore,
          stock.sentiment
        ], function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`✅ Added stock mention: ${stock.ticker} in post ${postId} (${postTitle})`);
            resolve(true);
          }
          stmt.finalize();
        });
      }
    );
  });
}

// stocks 테이블 업데이트 함수
function updateStocksTable(ticker, date) {
  return new Promise((resolve, reject) => {
    // 먼저 기존 종목 정보 확인
    db.get('SELECT * FROM stocks WHERE ticker = ?', [ticker], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row) {
        // 기존 종목 업데이트 (언급 횟수 증가, 최신 언급일 갱신)
        const newMentionCount = (row.mention_count || 0) + 1;
        
        db.run(`
          UPDATE stocks 
          SET mention_count = ?,
              last_mentioned_date = ?,
              is_merry_mentioned = 1
          WHERE ticker = ?
        `, [newMentionCount, date, ticker], (err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`📊 Updated ${ticker}: mention_count = ${newMentionCount}, last_mentioned = ${date}`);
            resolve(true);
          }
        });
      } else {
        console.log(`⚠️ Stock ${ticker} not found in stocks table, skipping update...`);
        resolve(false);
      }
    });
  });
}

// 모든 언급 정보 처리
async function processMentions() {
  let insertedCount = 0;
  let updatedStocksCount = 0;
  
  for (const post of postStockMentions) {
    console.log(`\n📄 Processing post ${post.postId}: ${post.title}`);
    
    for (const stock of post.stocks) {
      try {
        // 언급 정보 삽입
        const inserted = await insertStockMention(post.postId, post.title, post.date, stock);
        if (inserted) {
          insertedCount++;
          
          // stocks 테이블 업데이트
          const updated = await updateStocksTable(stock.ticker, post.date);
          if (updated) updatedStocksCount++;
        }
        
        // 잠시 대기 (DB 부하 방지)
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`❌ Error processing ${stock.ticker} for post ${post.postId}:`, error);
      }
    }
  }
  
  console.log(`\n✨ Successfully processed ${insertedCount} stock mentions!`);
  console.log(`📊 Updated ${updatedStocksCount} stocks in stocks table!`);
  
  // 최신 언급된 종목들 확인
  db.all(`
    SELECT ticker, mention_count, last_mentioned_date
    FROM stocks 
    WHERE is_merry_mentioned = 1
    ORDER BY last_mentioned_date DESC, mention_count ASC
    LIMIT 10
  `, [], (err, rows) => {
    if (err) {
      console.error('❌ Error fetching updated stocks:', err);
    } else {
      console.log('\n📈 Latest mentioned stocks (메르\'s Pick order):');
      rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.ticker}: ${row.mention_count}회 언급, 최근 ${row.last_mentioned_date}`);
      });
    }
    
    db.close();
    console.log('\n🎉 Stock mentions update completed!');
  });
}

processMentions();