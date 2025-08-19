const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// TSMC 관련 포스트들을 stock_mentions_unified에 추가
const tsmcMentions = [
  {
    ticker: 'TSM',
    company_name: 'TSMC',
    company_name_kr: 'TSMC',
    market: 'NYSE',
    currency: 'USD',
    sector: 'Technology',
    industry: 'Semiconductors',
    post_id: 513,
    mentioned_date: '2025-08-17 09:00:00',
    mention_type: 'positive',
    context: 'AI 칩 시장 급성장으로 TSMC 파운드리 사업 강화 전망',
    sentiment_score: 0.7,
    is_featured: 1
  },
  {
    ticker: 'TSM',
    company_name: 'TSMC',
    company_name_kr: 'TSMC',
    market: 'NYSE',
    currency: 'USD',
    sector: 'Technology',
    industry: 'Semiconductors',
    post_id: 12,
    mentioned_date: '2025-08-07 00:10:00',
    mention_type: 'neutral',
    context: '대만 정부 지분 7% 보유로 정부-민간 하이브리드 구조',
    sentiment_score: 0.1,
    is_featured: 1
  },
  {
    ticker: 'TSM',
    company_name: 'TSMC',
    company_name_kr: 'TSMC',
    market: 'NYSE',
    currency: 'USD',
    sector: 'Technology',
    industry: 'Semiconductors',
    post_id: 5,
    mentioned_date: '2025-08-10 00:32:30',
    mention_type: 'negative',
    context: '트럼프 인텔 CEO 사임 요구로 반도체 업계 정치적 리스크',
    sentiment_score: -0.4,
    is_featured: 0
  },
  {
    ticker: 'TSM',
    company_name: 'TSMC',
    company_name_kr: 'TSMC',
    market: 'NYSE',
    currency: 'USD',
    sector: 'Technology',
    industry: 'Semiconductors',
    post_id: 11,
    mentioned_date: '2025-08-05 11:00:00',
    mention_type: 'positive',
    context: '삼성전자 vs TSMC 경쟁에서 상대적 우위 유지',
    sentiment_score: 0.6,
    is_featured: 1
  },
  {
    ticker: 'TSM',
    company_name: 'TSMC',
    company_name_kr: 'TSMC',
    market: 'NYSE',
    currency: 'USD',
    sector: 'Technology',
    industry: 'Semiconductors',
    post_id: 34,
    mentioned_date: '2025-07-29 21:10:00',
    mention_type: 'positive',
    context: '삼성전자 3나노 수율 실패로 TSMC 기술 우위 확실',
    sentiment_score: 0.8,
    is_featured: 1
  }
];

// 데이터 삽입 함수
function insertTSMCMentions() {
  // 기존 TSMC 데이터 삭제
  db.run('DELETE FROM stock_mentions_unified WHERE ticker = ?', ['TSM'], (err) => {
    if (err) {
      console.error('Error deleting existing TSMC data:', err);
      return;
    }
    console.log('✅ 기존 TSMC 데이터 삭제 완료');
    
    // 새 데이터 삽입
    const stmt = db.prepare(`
      INSERT INTO stock_mentions_unified (
        ticker, company_name, company_name_kr, market, currency,
        sector, industry, post_id, mentioned_date, mention_type,
        context, sentiment_score, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    tsmcMentions.forEach(mention => {
      stmt.run([
        mention.ticker,
        mention.company_name,
        mention.company_name_kr,
        mention.market,
        mention.currency,
        mention.sector,
        mention.industry,
        mention.post_id,
        mention.mentioned_date,
        mention.mention_type,
        mention.context,
        mention.sentiment_score,
        mention.is_featured
      ], (err) => {
        if (err) {
          console.error(`Error inserting mention for post ${mention.post_id}:`, err);
        } else {
          console.log(`✅ TSMC mention added for post ${mention.post_id} - ${mention.mention_type}`);
        }
      });
    });

    stmt.finalize();
  });
}

// 가격 데이터도 추가 (6개월치 모의 데이터)
function insertTSMCPriceData() {
  console.log('📈 TSMC 6개월 가격 데이터 생성 중...');
  
  const today = new Date();
  const priceData = [];
  
  // 6개월(180일) 가격 데이터 생성
  for (let i = 180; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // 베이스 가격 $240 주변에서 변동
    const basePrice = 240;
    const variation = (Math.random() - 0.5) * 20; // -10 ~ +10 변동
    const price = Math.max(220, Math.min(260, basePrice + variation));
    const volume = Math.floor(Math.random() * 50000000) + 10000000; // 1천만~6천만
    
    priceData.push({
      ticker: 'TSM',
      date: date.toISOString().split('T')[0],
      close_price: Math.round(price * 100) / 100,
      volume: volume
    });
  }
  
  // 오늘 실제 가격 설정
  priceData[priceData.length - 1].close_price = 241.41;
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO stock_prices (ticker, date, close_price, volume)
    VALUES (?, ?, ?, ?)
  `);
  
  priceData.forEach(data => {
    stmt.run([data.ticker, data.date, data.close_price, data.volume], (err) => {
      if (err) {
        console.error(`Error inserting price for ${data.date}:`, err);
      }
    });
  });
  
  stmt.finalize();
  console.log(`✅ TSMC 6개월 가격 데이터 ${priceData.length}개 추가 완료`);
}

// 실행
console.log('🔧 TSMC 차트 데이터 수정 시작...');
insertTSMCMentions();

setTimeout(() => {
  insertTSMCPriceData();
  
  setTimeout(() => {
    // 결과 확인
    db.all(`
      SELECT COUNT(*) as count 
      FROM stock_mentions_unified 
      WHERE ticker = 'TSM'
    `, (err, rows) => {
      if (!err && rows[0]) {
        console.log(`\n📊 stock_mentions_unified에 추가된 TSMC 언급: ${rows[0].count}개`);
      }
      
      db.all(`
        SELECT COUNT(*) as count 
        FROM stock_prices 
        WHERE ticker = 'TSM'
      `, (err, rows) => {
        if (!err && rows[0]) {
          console.log(`📈 stock_prices에 추가된 TSMC 가격 데이터: ${rows[0].count}개`);
        }
        
        db.close();
        console.log('\n✅ TSMC 차트 데이터 수정 완료!');
        console.log('🌐 이제 http://localhost:3014/merry/stocks/TSM 에서 차트를 확인할 수 있습니다.');
      });
    });
  }, 1000);
}, 1000);