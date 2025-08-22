/**
 * 🎯 모든 종목 주가 데이터 업데이트 스크립트
 * 
 * 기능:
 * - stocks 테이블의 모든 고유 종목 가져오기
 * - 각 종목별 1년치 주가 데이터 수집 및 저장
 * - 중복 제거 및 데이터 무결성 보장
 * - 실시간 진행상황 표시
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class StockPriceUpdater {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'database.db');
    this.db = null;
    this.updatedCount = 0;
    this.errorCount = 0;
    this.skippedCount = 0;
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ 데이터베이스 연결 실패:', err.message);
          reject(err);
        } else {
          console.log('✅ SQLite 데이터베이스 연결 성공');
          resolve();
        }
      });
    });
  }

  async getAllUniqueStocks() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT DISTINCT ticker, company_name
        FROM stocks 
        WHERE ticker IS NOT NULL AND ticker != ''
        ORDER BY ticker
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async fetchStockPrice(ticker, period = '1Y') {
    try {
      const url = `http://localhost:3004/api/stock-price?ticker=${ticker}&period=${period}`;
      console.log(`📈 ${ticker} 주가 데이터 요청: ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok && data.success && data.data?.length > 0) {
        console.log(`✅ ${ticker}: ${data.data.length}개 가격 데이터 수신 성공`);
        return { success: true, data: data.data, count: data.data.length };
      } else {
        console.log(`⚠️ ${ticker}: 데이터 없음 또는 오류 - ${data.message || '알 수 없는 오류'}`);
        return { success: false, error: data.message || 'No data available' };
      }
    } catch (error) {
      console.error(`❌ ${ticker} 가격 데이터 요청 실패:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async updateAllStockPrices() {
    try {
      console.log('🚀 모든 종목 주가 데이터 업데이트 시작...\n');
      
      // 1. 모든 고유 종목 가져오기
      const stocks = await this.getAllUniqueStocks();
      console.log(`📊 업데이트할 종목 수: ${stocks.length}개\n`);
      
      // 2. 각 종목별 순차적 업데이트 (API 호출 제한 고려)
      for (let i = 0; i < stocks.length; i++) {
        const stock = stocks[i];
        const progress = `[${i + 1}/${stocks.length}]`;
        
        console.log(`${progress} 📈 ${stock.ticker} (${stock.company_name}) 업데이트 중...`);
        
        try {
          // 3. 주가 데이터 가져오기 (1년치)
          const priceResult = await this.fetchStockPrice(stock.ticker, '1Y');
          
          if (priceResult.success) {
            this.updatedCount++;
            console.log(`${progress} ✅ ${stock.ticker} 업데이트 완료 (${priceResult.count}개 데이터)\n`);
          } else {
            this.skippedCount++;
            console.log(`${progress} ⏭️ ${stock.ticker} 스킵됨: ${priceResult.error}\n`);
          }
          
          // 4. API 호출 간격 조절 (Rate Limiting 방지)
          if (i < stocks.length - 1) {
            await this.sleep(1000); // 1초 대기
          }
          
        } catch (error) {
          this.errorCount++;
          console.error(`${progress} ❌ ${stock.ticker} 업데이트 실패:`, error.message, '\n');
        }
      }
      
    } catch (error) {
      console.error('❌ 전체 업데이트 프로세스 실패:', error);
      throw error;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 주가 데이터 업데이트 완료 요약');
    console.log('='.repeat(60));
    console.log(`✅ 성공: ${this.updatedCount}개 종목`);
    console.log(`⏭️ 스킵: ${this.skippedCount}개 종목`);
    console.log(`❌ 실패: ${this.errorCount}개 종목`);
    console.log(`📈 총 처리: ${this.updatedCount + this.skippedCount + this.errorCount}개 종목`);
    console.log('='.repeat(60));
    
    // 성공률 계산
    const totalProcessed = this.updatedCount + this.skippedCount + this.errorCount;
    const successRate = totalProcessed > 0 ? ((this.updatedCount / totalProcessed) * 100).toFixed(1) : 0;
    console.log(`🎯 성공률: ${successRate}%`);
    
    if (this.updatedCount > 0) {
      console.log('\n💡 업데이트된 종목들의 최신 차트를 확인하려면:');
      console.log('   http://localhost:3004/merry/stocks/[TICKER] 에서 확인 가능');
    }
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            console.error('❌ 데이터베이스 연결 종료 실패:', err.message);
          } else {
            console.log('✅ 데이터베이스 연결 종료 완료');
          }
          resolve();
        });
      });
    }
  }
}

// 스크립트 실행
async function main() {
  const updater = new StockPriceUpdater();
  
  try {
    await updater.init();
    await updater.updateAllStockPrices();
    await updater.printSummary();
    
  } catch (error) {
    console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
    process.exit(1);
    
  } finally {
    await updater.close();
    console.log('\n🏁 주가 업데이트 스크립트 종료\n');
  }
}

// Node.js에서 직접 실행시에만 main 함수 호출
if (require.main === module) {
  main();
}

module.exports = StockPriceUpdater;