#!/usr/bin/env node

/**
 * 1년치 실제 주식 데이터 수집 스크립트
 * 메르 언급 종목들의 1년치 종가 데이터를 실제 API에서 가져와서 DB에 저장
 * CLAUDE.md 원칙: 가짜 데이터 절대 금지, 실제 API 데이터만 사용
 */

const StockDB = require('../src/lib/stock-db-sqlite3');
const yahooFinance = require('yahoo-finance2').default;

class StockDataFetcher {
  constructor() {
    this.stockDB = new StockDB();
    
    // 메르 언급 종목들 (실제 데이터만)
    this.targetStocks = [
      { ticker: 'TSLA', name: '테슬라', market: 'US' },
      { ticker: '005930.KS', name: '삼성전자', market: 'KRX' },
      { ticker: 'INTC', name: '인텔', market: 'US' },
      { ticker: 'AAPL', name: '애플', market: 'US' },
      { ticker: 'NVDA', name: '엔비디아', market: 'US' },
      { ticker: 'GOOGL', name: '구글', market: 'US' },
      { ticker: 'MSFT', name: '마이크로소프트', market: 'US' }
    ];
  }

  async fetchHistoricalData() {
    console.log('🚀 1년치 실제 주식 데이터 수집 시작...');
    console.log('📅 기간: 2024-08-15 ~ 2025-08-15 (365일)');
    
    await this.stockDB.connect();
    
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    
    console.log(`📊 수집 기간: ${oneYearAgo.toISOString().split('T')[0]} ~ ${now.toISOString().split('T')[0]}`);
    
    for (const stock of this.targetStocks) {
      try {
        console.log(`\n📈 ${stock.name} (${stock.ticker}) 데이터 수집 중...`);
        
        // Yahoo Finance에서 1년치 데이터 가져오기
        const result = await yahooFinance.historical(stock.ticker, {
          period1: oneYearAgo,
          period2: now,
          interval: '1d'
        });
        
        if (!result || result.length === 0) {
          console.warn(`⚠️ ${stock.ticker}: 데이터를 찾을 수 없습니다`);
          continue;
        }
        
        console.log(`✅ ${stock.ticker}: ${result.length}개 데이터 수집 완료`);
        
        // DB에 저장
        let savedCount = 0;
        for (const data of result) {
          const dateStr = data.date.toISOString().split('T')[0];
          const price = data.close;
          
          if (price && price > 0) {
            await this.saveStockPrice(stock.ticker.replace('.KS', ''), dateStr, price, data.volume || 0);
            savedCount++;
          }
        }
        
        console.log(`💾 ${stock.ticker}: ${savedCount}개 레코드 저장 완료`);
        
        // API 호출 제한을 위한 딜레이
        await this.delay(1000);
        
      } catch (error) {
        console.error(`❌ ${stock.ticker} 데이터 수집 실패:`, error.message);
      }
    }
    
    await this.stockDB.close();
    console.log('\n🎉 1년치 실제 주식 데이터 수집 완료!');
  }

  async saveStockPrice(ticker, date, price, volume) {
    return new Promise((resolve, reject) => {
      this.stockDB.db.run(`
        INSERT OR REPLACE INTO stock_prices 
        (ticker, date, close_price, volume, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [ticker, date, price, volume], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkDataCoverage() {
    console.log('\n📊 데이터 커버리지 확인...');
    await this.stockDB.connect();
    
    for (const stock of this.targetStocks) {
      const ticker = stock.ticker.replace('.KS', '');
      
      const result = await new Promise((resolve, reject) => {
        this.stockDB.db.get(`
          SELECT 
            COUNT(*) as total_days,
            MIN(date) as earliest_date,
            MAX(date) as latest_date
          FROM stock_prices 
          WHERE ticker = ?
        `, [ticker], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      console.log(`📈 ${stock.name} (${ticker}): ${result.total_days}일 (${result.earliest_date} ~ ${result.latest_date})`);
    }
    
    await this.stockDB.close();
  }
}

// 실행
async function main() {
  const fetcher = new StockDataFetcher();
  
  try {
    // 현재 데이터 상태 확인
    await fetcher.checkDataCoverage();
    
    // 1년치 실제 데이터 수집
    await fetcher.fetchHistoricalData();
    
    // 최종 데이터 확인
    await fetcher.checkDataCoverage();
    
  } catch (error) {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = StockDataFetcher;