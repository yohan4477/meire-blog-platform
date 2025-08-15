const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function checkSentimentTable() {
  const db = await open({
    filename: './database.db',
    driver: sqlite3.Database
  });
  
  try {
    // 테이블 존재 여부 확인
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='post_stock_sentiments'
    `);
    
    if (tables.length === 0) {
      console.log('❌ post_stock_sentiments 테이블이 존재하지 않습니다.');
      
      // 모든 테이블 목록 출력
      const allTables = await db.all(`
        SELECT name FROM sqlite_master WHERE type='table'
      `);
      console.log('📋 존재하는 테이블들:');
      allTables.forEach(table => console.log(`  - ${table.name}`));
      
    } else {
      console.log('✅ post_stock_sentiments 테이블이 존재합니다.');
      
      // 테이블 구조 확인
      const schema = await db.all('PRAGMA table_info(post_stock_sentiments)');
      console.log('\n📊 테이블 구조:');
      schema.forEach(col => {
        console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
      
      // 데이터 개수 확인
      const count = await db.get('SELECT COUNT(*) as count FROM post_stock_sentiments');
      console.log(`\n📈 저장된 감정 분석 데이터: ${count.count}개`);
      
      if (count.count > 0) {
        // 샘플 데이터 확인
        const samples = await db.all(`
          SELECT ticker, sentiment, confidence, context_snippet
          FROM post_stock_sentiments 
          LIMIT 5
        `);
        console.log('\n🎯 샘플 데이터:');
        samples.forEach(sample => {
          console.log(`  ${sample.ticker}: ${sample.sentiment} (신뢰도: ${(sample.confidence * 100).toFixed(0)}%)`);
          console.log(`    컨텍스트: ${sample.context_snippet?.substring(0, 100)}...`);
        });
      }
    }
    
  } catch (error) {
    console.error('데이터베이스 검사 오류:', error);
  } finally {
    await db.close();
  }
}

checkSentimentTable().catch(console.error);