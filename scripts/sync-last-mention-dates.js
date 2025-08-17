const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 종목별 검색 키워드 매핑
const tickerSearchMap = {
  'TSLA': ['테슬라', 'TSLA', 'Tesla'],
  '005930': ['삼성전자', '005930', '삼성'],
  'INTC': ['인텔', 'INTC', 'Intel'],
  'LLY': ['일라이릴리', 'LLY', 'Eli Lilly', '릴리'],
  'UNH': ['유나이티드헬스케어', 'UNH', 'UnitedHealth', '유나이티드헬스'],
  'NVDA': ['엔비디아', 'NVDA', 'NVIDIA'],
  'AAPL': ['애플', 'AAPL', 'Apple', '아이폰'],
  'GOOGL': ['구글', 'GOOGL', 'Google', '알파벳'],
  'MSFT': ['마이크로소프트', 'MSFT', 'Microsoft', '마소'],
  'AMZN': ['아마존', 'AMZN', 'Amazon'],
  'META': ['메타', 'META', '페이스북', 'Facebook'],
  '042660': ['한화오션', '042660', '한화시스템'],
  '267250': ['HD현대', '267250', '현대중공업'],
  '010620': ['현대미포조선', '010620', '미포조선']
};

async function syncLastMentionDates() {
  const dbPath = path.join(process.cwd(), 'database.db');
  const db = new sqlite3.Database(dbPath);

  console.log('🔄 실제 포스트 데이터 기반으로 last_mentioned_at 동기화 시작...');

  for (const [ticker, searchTerms] of Object.entries(tickerSearchMap)) {
    try {
      // 해당 종목이 언급된 가장 최신 포스트 날짜 찾기
      const whereClause = searchTerms.map(term => 
        `(content LIKE '%${term}%' OR title LIKE '%${term}%')`
      ).join(' OR ');

      const query = `
        SELECT MAX(created_date) as latest_mention
        FROM blog_posts 
        WHERE ${whereClause}
      `;

      const result = await new Promise((resolve, reject) => {
        db.get(query, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (result && result.latest_mention) {
        // merry_mentioned_stocks 테이블 업데이트
        const updateQuery = `
          UPDATE merry_mentioned_stocks 
          SET last_mentioned_at = ?
          WHERE ticker = ?
        `;

        await new Promise((resolve, reject) => {
          db.run(updateQuery, [result.latest_mention, ticker], function(err) {
            if (err) reject(err);
            else resolve(this);
          });
        });

        console.log(`✅ ${ticker}: ${result.latest_mention}`);
      } else {
        console.log(`⚠️ ${ticker}: 언급 없음`);
      }

    } catch (error) {
      console.error(`❌ ${ticker} 처리 중 오류:`, error);
    }
  }

  // 결과 확인
  console.log('\n📊 업데이트 결과 확인:');
  const finalQuery = `
    SELECT ticker, last_mentioned_at, mention_count 
    FROM merry_mentioned_stocks 
    ORDER BY last_mentioned_at DESC 
    LIMIT 10
  `;

  const finalResult = await new Promise((resolve, reject) => {
    db.all(finalQuery, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.table(finalResult);

  db.close();
  console.log('✅ last_mentioned_at 동기화 완료!');
}

syncLastMentionDates().catch(console.error);