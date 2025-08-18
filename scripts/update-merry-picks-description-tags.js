/**
 * 메르's Pick 캐시에 종목 페이지의 description과 tags 복사
 * 사용자 요구사항: "종목페이지 description을 메르스 픽 description에 카피해, 태그도 카피해"
 */

const StockDB = require('../src/lib/stock-db-sqlite3');

class MerryPicksDescriptionUpdater {
  constructor() {
    this.stockDB = null;
    this.processedCount = 0;
    this.errorCount = 0;
  }

  async connect() {
    this.stockDB = new StockDB();
    await this.stockDB.connect();
    console.log('✅ Connected to database');
  }

  async close() {
    if (this.stockDB) {
      await this.stockDB.close();
      console.log('🔌 Database connection closed');
    }
  }

  async queryPromise(query, params = []) {
    return new Promise((resolve, reject) => {
      this.stockDB.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async updatePromise(query, params = []) {
    return new Promise((resolve, reject) => {
      this.stockDB.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  // 종목 페이지의 description과 tags를 메르's Pick 캐시에 복사
  async copyDescriptionAndTags() {
    console.log("\n📝 종목 페이지 → 메르's Pick 캐시 복사 시작...");
    
    // 1. stocks 테이블에서 description과 tags 조회
    const stocks = await this.queryPromise(`
      SELECT ticker, description, tags
      FROM stocks 
      WHERE is_merry_mentioned = 1 
        AND description IS NOT NULL 
        AND description != ''
      ORDER BY mention_count DESC
    `);

    console.log(`📊 복사할 종목 수: ${stocks.length}개`);

    // 2. merry_picks_cache 테이블에 description과 tags 컬럼이 있는지 확인
    try {
      await this.queryPromise(`SELECT description, tags FROM merry_picks_cache LIMIT 1`);
    } catch (error) {
      // 컬럼이 없으면 추가
      console.log('🔧 merry_picks_cache 테이블에 description, tags 컬럼 추가...');
      await this.updatePromise(`ALTER TABLE merry_picks_cache ADD COLUMN tags TEXT`);
      console.log('✅ tags 컬럼 추가 완료');
    }

    let updated = 0;
    for (const stock of stocks) {
      try {
        const ticker = stock.ticker;
        const description = stock.description;
        const tags = stock.tags;
        
        // merry_picks_cache 테이블의 description과 tags 업데이트
        const changes = await this.updatePromise(`
          UPDATE merry_picks_cache 
          SET 
            description = ?,
            tags = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE ticker = ?
        `, [description, tags, ticker]);

        if (changes > 0) {
          console.log(`✅ ${ticker}: description 및 tags 업데이트 완료`);
          console.log(`   📝 ${description.substring(0, 80)}...`);
          if (tags) {
            try {
              const parsedTags = JSON.parse(tags);
              console.log(`   🏷️ [${parsedTags.slice(0, 5).join(', ')}${parsedTags.length > 5 ? '...' : ''}]`);
            } catch (e) {
              console.log(`   🏷️ ${tags.substring(0, 50)}...`);
            }
          }
          updated++;
        } else {
          console.log(`⚠️ ${ticker}: merry_picks_cache에서 찾을 수 없음`);
        }
        
      } catch (error) {
        console.error(`❌ ${stock.ticker} 업데이트 실패:`, error);
        this.errorCount++;
      }
    }

    console.log(`\n✅ description과 tags 복사 완료: ${updated}개 종목`);
    return updated;
  }

  // 업데이트 결과 검증
  async validateUpdates() {
    console.log('\n🔍 업데이트 결과 검증...');
    
    const stats = await this.queryPromise(`
      SELECT 
        COUNT(*) as total_picks,
        COUNT(CASE WHEN description IS NOT NULL AND description != '' THEN 1 END) as with_description,
        COUNT(CASE WHEN tags IS NOT NULL AND tags != '' AND tags != 'null' THEN 1 END) as with_tags
      FROM merry_picks_cache
    `);

    const examples = await this.queryPromise(`
      SELECT ticker, company_name, description, tags
      FROM merry_picks_cache 
      WHERE description IS NOT NULL
      ORDER BY rank_position 
      LIMIT 5
    `);

    console.log('📊 업데이트 통계:');
    console.log(`  📈 전체 메르's Pick: ${stats[0].total_picks}개`);
    console.log(`  📝 설명 완료: ${stats[0].with_description}개`);
    console.log(`  🏷️ 태그 완료: ${stats[0].with_tags}개`);

    console.log('\n🔝 상위 5개 종목 예시:');
    examples.forEach((stock, idx) => {
      console.log(`  ${idx + 1}. ${stock.ticker} → ${stock.company_name}`);
      console.log(`     📝 ${stock.description ? stock.description.substring(0, 60) + '...' : '설명 없음'}`);
      if (stock.tags) {
        try {
          const tags = JSON.parse(stock.tags);
          console.log(`     🏷️ [${tags.slice(0, 3).join(', ')}] (${tags.length}개)`);
        } catch (e) {
          console.log(`     🏷️ ${stock.tags.substring(0, 30)}...`);
        }
      } else {
        console.log(`     🏷️ 태그 없음`);
      }
    });

    return stats[0];
  }

  // 메인 업데이트 프로세스
  async updateComplete() {
    console.log("🚀 메르's Pick description & tags 복사 시작...");
    
    try {
      // 1. description과 tags 복사
      const updated = await this.copyDescriptionAndTags();
      
      // 2. 결과 검증
      const stats = await this.validateUpdates();

      console.log("\\n🎯 메르's Pick description & tags 복사 성공!");
      console.log(`📊 업데이트된 종목: ${updated}개`);
      console.log(`📈 완료율: ${((stats.with_description / stats.total_picks) * 100).toFixed(1)}%`);
      
      return { updated, stats };

    } catch (error) {
      console.error("❌ 메르's Pick 업데이트 중 오류:", error);
      throw error;
    }
  }
}

async function main() {
  const updater = new MerryPicksDescriptionUpdater();
  
  try {
    await updater.connect();
    const result = await updater.updateComplete();
    
    console.log("\\n✅ 메르's Pick description & tags 복사 완료!");
    console.log('📈 다음: 웹사이트에서 변경사항 확인');
    return result;
    
  } catch (error) {
    console.error("💥 메르's Pick 업데이트 실패:", error);
    throw error;
  } finally {
    await updater.close();
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(result => {
      console.log("\\n🎉 메르's Pick description & tags 복사 성공");
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { MerryPicksDescriptionUpdater };