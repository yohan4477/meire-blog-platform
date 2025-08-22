/**
 * 🎯 최신 종가 데이터 업데이트
 * 누락된 최신 날짜 종가 데이터를 Yahoo Finance API로 가져와서 업데이트
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class StockPriceUpdater {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(dbPath);
  }

  async updateLatestPrices() {
    console.log('🎯 최신 종가 데이터 업데이트 시작...');
    
    // 업데이트할 주요 종목들
    const tickers = [
      { ticker: '005930', symbol: '005930.KS' }, // 삼성전자
      { ticker: 'TSLA', symbol: 'TSLA' },
      { ticker: 'AAPL', symbol: 'AAPL' },
      { ticker: 'NVDA', symbol: 'NVDA' },
      { ticker: 'GOOGL', symbol: 'GOOGL' },
      { ticker: 'MSFT', symbol: 'MSFT' },
      { ticker: 'INTC', symbol: 'INTC' }  // 인텔 추가
    ];
    
    for (const stock of tickers) {
      console.log(`\n📊 ${stock.ticker} 최신 데이터 확인 중...`);
      await this.updateStockData(stock.ticker, stock.symbol);
    }
    
    console.log(`\n✅ 모든 종목 최신 데이터 업데이트 완료`);
    this.db.close();
  }

  async updateStockData(ticker, symbol) {
    try {
      // 현재 DB에서 최신 날짜 확인
      const latestDate = await this.getLatestDate(ticker);
      console.log(`  📅 ${ticker} 최신 DB 날짜: ${latestDate}`);
      
      // Yahoo Finance에서 최신 2주치 데이터 가져오기
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${Math.floor((Date.now() - 14 * 24 * 60 * 60 * 1000) / 1000)}&period2=${Math.floor(Date.now() / 1000)}&interval=1d`;
      
      console.log(`  🌐 ${ticker} Yahoo Finance 데이터 요청 중...`);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log(`  ❌ ${ticker} API 응답 오류: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      
      if (!data.chart?.result?.[0]) {
        console.log(`  ❌ ${ticker} 데이터 구조 오류`);
        return;
      }
      
      const result = data.chart.result[0];
      const timestamps = result.timestamp;
      const closes = result.indicators.quote[0].close;
      const volumes = result.indicators.quote[0].volume;
      
      let newDataCount = 0;
      
      // 새로운 데이터만 추가
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] == null) continue;
        
        const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
        const price = parseFloat(closes[i]).toFixed(2);
        const volume = volumes[i] || 0;
        
        // 이미 있는 날짜는 스킵
        if (date <= latestDate) continue;
        
        const inserted = await this.insertStockPrice(ticker, date, price, volume);
        if (inserted) {
          console.log(`    ✅ ${date}: ${price} (추가됨)`);
          newDataCount++;
        }
      }
      
      console.log(`  📈 ${ticker}: ${newDataCount}개 새로운 데이터 추가됨`);
      
    } catch (error) {
      console.error(`  ❌ ${ticker} 업데이트 오류:`, error.message);
    }
  }

  async getLatestDate(ticker) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT MAX(date) as latest_date
        FROM stock_prices
        WHERE ticker = ?
      `, [ticker], (err, row) => {
        if (err) reject(err);
        else resolve(row?.latest_date || '2024-01-01');
      });
    });
  }

  async insertStockPrice(ticker, date, price, volume) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR REPLACE INTO stock_prices (ticker, date, close_price, volume)
        VALUES (?, ?, ?, ?)
      `, [ticker, date, price, volume], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }
}

const updater = new StockPriceUpdater();
updater.updateLatestPrices().catch(console.error);