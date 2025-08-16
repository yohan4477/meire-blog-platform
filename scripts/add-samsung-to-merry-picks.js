const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const db = new sqlite3.Database(path.join(__dirname, '..', 'database.db'));

async function addSamsungToMerryPicks() {
  console.log('🚀 삼성전자를 메르\'s Pick에 추가 중...');

  try {
    // 먼저 삼성전자가 이미 있는지 확인
    const existing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM merry_mentioned_stocks WHERE ticker = ?',
        ['005930'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existing) {
      console.log('✅ 삼성전자는 이미 메르\'s Pick에 등록되어 있습니다.');
      
      // 최신 정보로 업데이트
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE merry_mentioned_stocks 
           SET mention_count = (
             SELECT COUNT(*) 
             FROM post_stock_sentiments 
             WHERE ticker = '005930'
           ),
           last_mentioned_at = (
             SELECT MAX(blog_posts.created_date)
             FROM post_stock_sentiments
             JOIN blog_posts ON blog_posts.id = post_stock_sentiments.post_id
             WHERE post_stock_sentiments.ticker = '005930'
           ),
           updated_at = CURRENT_TIMESTAMP
           WHERE ticker = '005930'`,
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      console.log('✅ 삼성전자 정보가 업데이트되었습니다.');
    } else {
      // 새로 추가
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO merry_mentioned_stocks 
           (ticker, company_name, market, mention_count, first_mentioned_at, last_mentioned_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            '005930',
            '삼성전자',
            'KOSPI',
            75,
            '2024-01-01',
            '2024-08-15'
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      console.log('✅ 삼성전자가 메르\'s Pick에 새로 추가되었습니다.');
    }

    // 결과 확인
    const result = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM merry_mentioned_stocks WHERE ticker = ?',
        ['005930'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    console.log('📊 삼성전자 정보:', result);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }

  db.close();
  console.log('✅ 작업 완료!');
}

// 실행
addSamsungToMerryPicks().catch(console.error);