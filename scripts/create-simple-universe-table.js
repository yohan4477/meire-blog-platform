/**
 * 🚀 Simple Stock Universe Table Creation
 * Creates stock_universe table with minimal operations to avoid database locks
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function createSimpleUniverseTable() {
  console.log('📊 Simple stock_universe 테이블 생성 시작...');
  
  const dbPath = path.join(process.cwd(), 'database.db');
  const db = new sqlite3.Database(dbPath);
  
  // 최대 대기 시간 설정
  db.configure("busyTimeout", 60000);
  
  return new Promise((resolve, reject) => {
    // 단순하게 테이블만 생성
    db.run(`
      CREATE TABLE IF NOT EXISTS stock_universe (
        id INTEGER PRIMARY KEY DEFAULT 1,
        total_stocks INTEGER NOT NULL DEFAULT 0,
        domestic_stocks INTEGER NOT NULL DEFAULT 0,
        us_stocks INTEGER NOT NULL DEFAULT 0,
        total_posts INTEGER NOT NULL DEFAULT 0,
        analyzed_posts INTEGER NOT NULL DEFAULT 0,
        analysis_completion_rate REAL DEFAULT 0.0,
        last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_source TEXT DEFAULT 'manual_creation',
        calculation_duration_ms INTEGER DEFAULT 0
      )
    `, (err) => {
      if (err) {
        console.error('❌ 테이블 생성 실패:', err);
        db.close();
        reject(err);
        return;
      }
      
      console.log('✅ stock_universe 테이블 생성 완료');
      
      // 기본 레코드 삽입
      db.run(`
        INSERT OR REPLACE INTO stock_universe (
          id, total_stocks, domestic_stocks, us_stocks, 
          total_posts, analyzed_posts, analysis_completion_rate,
          last_updated_at, data_source
        ) VALUES (1, 0, 0, 0, 0, 0, 0.0, datetime('now'), 'initial_placeholder')
      `, (err2) => {
        db.close();
        if (err2) {
          console.error('❌ 기본 레코드 삽입 실패:', err2);
          reject(err2);
        } else {
          console.log('✅ 기본 레코드 삽입 완료');
          resolve(true);
        }
      });
    });
  });
}

// 실행
createSimpleUniverseTable()
  .then(() => {
    console.log('🚀 Simple Universe 테이블 생성 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 생성 실패:', error);
    process.exit(1);
  });