/**
 * 종목 description에서 맨 앞의 회사 이름 제거
 * 사용자 요구사항: "종목페이지에서 description 맨앞에 회사 이름 제거"
 */

const StockDB = require('../src/lib/stock-db-sqlite3');

class CompanyNameRemover {
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

  // description에서 회사명 제거 로직
  removeCompanyNameFromDescription(description, ticker) {
    if (!description) return description;
    
    // 회사명 매핑 (한국어와 영어 모두)
    const companyNames = {
      '005930': ['삼성전자(Samsung Electronics)', '삼성전자', 'Samsung Electronics'],
      '042660': ['한화오션(Hanwha Ocean)', '한화오션', 'Hanwha Ocean'],
      '267250': ['HD현대(HD Hyundai)', 'HD현대', 'HD Hyundai'],
      '010620': ['현대미포조선(Hyundai Mipo Dockyard)', '현대미포조선', 'Hyundai Mipo Dockyard'],
      '000660': ['SK하이닉스(SK Hynix)', 'SK하이닉스', 'SK Hynix'],
      '012450': ['한화에어로스페이스(Hanwha Aerospace)', '한화에어로스페이스', 'Hanwha Aerospace'],
      '066570': ['LG전자(LG Electronics)', 'LG전자', 'LG Electronics'],
      '272210': ['KCC(KCC Corporation)', 'KCC', 'KCC Corporation'],
      '373220': ['LG에너지솔루션(LG Energy Solution)', 'LG에너지솔루션', 'LG Energy Solution'],
      
      // 미국 종목
      'TSLA': ['테슬라(Tesla Inc.)', '테슬라', 'Tesla Inc.', 'Tesla'],
      'AAPL': ['애플(Apple Inc.)', '애플', 'Apple Inc.', 'Apple'],
      'MSFT': ['마이크로소프트(Microsoft Corporation)', '마이크로소프트', 'Microsoft Corporation', 'Microsoft'],
      'GOOGL': ['구글(Alphabet Inc.)', '구글', 'Alphabet Inc.', 'Alphabet', 'Google'],
      'META': ['메타(Meta Platforms Inc.)', '메타', 'Meta Platforms Inc.', 'Meta'],
      'AMZN': ['아마존(Amazon.com Inc.)', '아마존', 'Amazon.com Inc.', 'Amazon'],
      'NVDA': ['엔비디아(NVIDIA Corporation)', '엔비디아', 'NVIDIA Corporation', 'NVIDIA'],
      'INTC': ['인텔(Intel Corporation)', '인텔', 'Intel Corporation', 'Intel'],
      'LLY': ['일라이릴리(Eli Lilly and Company)', '일라이릴리', 'Eli Lilly and Company', 'Eli Lilly'],
      'UNH': ['유나이티드헬스그룹(UnitedHealth Group Inc.)', '유나이티드헬스그룹', 'UnitedHealth Group Inc.', 'UnitedHealth'],
      'JPM': ['JP모건체이스(JPMorgan Chase & Co.)', 'JP모건체이스', 'JPMorgan Chase & Co.', 'JP모건', 'JPMorgan'],
      'BAC': ['뱅크오브아메리카(Bank of America Corporation)', '뱅크오브아메리카', 'Bank of America Corporation', 'Bank of America'],
      'V': ['비자(Visa Inc.)', '비자', 'Visa Inc.', 'Visa'],
      'HD': ['홈데포(The Home Depot Inc.)', '홈데포', 'The Home Depot Inc.', 'Home Depot'],
      'MU': ['마이크론테크놀로지(Micron Technology Inc.)', '마이크론테크놀로지', 'Micron Technology Inc.', 'Micron'],
      'QCOM': ['퀄컴(QUALCOMM Incorporated)', '퀄컴', 'QUALCOMM Incorporated', 'QUALCOMM'],
      'NFLX': ['넷플릭스(Netflix Inc.)', '넷플릭스', 'Netflix Inc.', 'Netflix']
    };

    let cleanedDescription = description;
    
    // 해당 티커의 회사명들을 찾아서 제거
    const namesForTicker = companyNames[ticker] || [];
    
    for (const name of namesForTicker) {
      // 설명 맨 앞에 "회사명 - " 패턴이 있으면 제거
      const pattern = new RegExp(`^${name.replace(/[()]/g, '\\$&')}\\s*-\\s*`, 'i');
      cleanedDescription = cleanedDescription.replace(pattern, '');
    }
    
    // 일반적인 패턴도 제거 (회사명(영어명) - 패턴)
    cleanedDescription = cleanedDescription.replace(/^[^(]+\([^)]+\)\s*-\s*/, '');
    
    return cleanedDescription.trim();
  }

  // stocks 테이블의 description 업데이트
  async updateStocksDescriptions() {
    console.log('\n📝 stocks 테이블 description 회사명 제거 시작...');
    
    const stocks = await this.queryPromise(`
      SELECT ticker, description
      FROM stocks 
      WHERE is_merry_mentioned = 1 
        AND description IS NOT NULL 
        AND description != ''
      ORDER BY mention_count DESC
    `);

    console.log(`📊 업데이트할 종목 수: ${stocks.length}개`);

    let updated = 0;
    for (const stock of stocks) {
      try {
        const originalDescription = stock.description;
        const cleanedDescription = this.removeCompanyNameFromDescription(originalDescription, stock.ticker);
        
        if (originalDescription !== cleanedDescription) {
          await this.updatePromise(`
            UPDATE stocks 
            SET 
              description = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE ticker = ?
          `, [cleanedDescription, stock.ticker]);

          console.log(`✅ ${stock.ticker}: 회사명 제거 완료`);
          console.log(`   이전: ${originalDescription.substring(0, 60)}...`);
          console.log(`   이후: ${cleanedDescription.substring(0, 60)}...`);
          updated++;
        } else {
          console.log(`⚪ ${stock.ticker}: 변경 불필요`);
        }
        
      } catch (error) {
        console.error(`❌ ${stock.ticker} 업데이트 실패:`, error);
        this.errorCount++;
      }
    }

    console.log(`\n✅ stocks 테이블 업데이트 완료: ${updated}개 종목`);
    return updated;
  }

  // merry_picks_cache 테이블의 description 업데이트
  async updateMerryPicksDescriptions() {
    console.log('\n📝 merry_picks_cache 테이블 description 회사명 제거 시작...');
    
    const picks = await this.queryPromise(`
      SELECT ticker, description
      FROM merry_picks_cache 
      WHERE description IS NOT NULL 
        AND description != ''
      ORDER BY rank_position
    `);

    console.log(`📊 업데이트할 메르's Pick 수: ${picks.length}개`);

    let updated = 0;
    for (const pick of picks) {
      try {
        const originalDescription = pick.description;
        const cleanedDescription = this.removeCompanyNameFromDescription(originalDescription, pick.ticker);
        
        if (originalDescription !== cleanedDescription) {
          await this.updatePromise(`
            UPDATE merry_picks_cache 
            SET 
              description = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE ticker = ?
          `, [cleanedDescription, pick.ticker]);

          console.log(`✅ ${pick.ticker}: 회사명 제거 완료`);
          console.log(`   이전: ${originalDescription.substring(0, 60)}...`);
          console.log(`   이후: ${cleanedDescription.substring(0, 60)}...`);
          updated++;
        } else {
          console.log(`⚪ ${pick.ticker}: 변경 불필요`);
        }
        
      } catch (error) {
        console.error(`❌ ${pick.ticker} 업데이트 실패:`, error);
        this.errorCount++;
      }
    }

    console.log(`\n✅ merry_picks_cache 테이블 업데이트 완료: ${updated}개 종목`);
    return updated;
  }

  // 업데이트 결과 검증
  async validateUpdates() {
    console.log('\n🔍 업데이트 결과 검증...');
    
    const stocksExamples = await this.queryPromise(`
      SELECT ticker, description
      FROM stocks 
      WHERE is_merry_mentioned = 1 AND description IS NOT NULL
      ORDER BY mention_count DESC 
      LIMIT 5
    `);

    const picksExamples = await this.queryPromise(`
      SELECT ticker, description
      FROM merry_picks_cache 
      WHERE description IS NOT NULL
      ORDER BY rank_position 
      LIMIT 5
    `);

    console.log('\n📊 stocks 테이블 상위 5개 예시:');
    stocksExamples.forEach((stock, idx) => {
      console.log(`  ${idx + 1}. ${stock.ticker}`);
      console.log(`     📝 ${stock.description.substring(0, 80)}...`);
    });

    console.log('\n📊 merry_picks_cache 테이블 상위 5개 예시:');
    picksExamples.forEach((pick, idx) => {
      console.log(`  ${idx + 1}. ${pick.ticker}`);
      console.log(`     📝 ${pick.description.substring(0, 80)}...`);
    });

    return { stocksCount: stocksExamples.length, picksCount: picksExamples.length };
  }

  // 메인 업데이트 프로세스
  async updateComplete() {
    console.log("🚀 description 회사명 제거 시작...");
    
    try {
      // 1. stocks 테이블 업데이트
      const stocksUpdated = await this.updateStocksDescriptions();
      
      // 2. merry_picks_cache 테이블 업데이트
      const picksUpdated = await this.updateMerryPicksDescriptions();
      
      // 3. 결과 검증
      const validation = await this.validateUpdates();

      console.log("\n🎯 description 회사명 제거 성공!");
      console.log(`📊 stocks 테이블 업데이트: ${stocksUpdated}개`);
      console.log(`📊 merry_picks_cache 테이블 업데이트: ${picksUpdated}개`);
      
      return { stocksUpdated, picksUpdated, validation };

    } catch (error) {
      console.error("❌ description 회사명 제거 중 오류:", error);
      throw error;
    }
  }
}

async function main() {
  const remover = new CompanyNameRemover();
  
  try {
    await remover.connect();
    const result = await remover.updateComplete();
    
    console.log("\n✅ description 회사명 제거 완료!");
    console.log('📈 다음: 웹사이트에서 변경사항 확인');
    return result;
    
  } catch (error) {
    console.error("💥 description 회사명 제거 실패:", error);
    throw error;
  } finally {
    await remover.close();
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(result => {
      console.log("\n🎉 description 회사명 제거 성공");
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { CompanyNameRemover };