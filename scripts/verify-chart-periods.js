/**
 * 🎯 차트 기간별 데이터 정확성 검증
 * 1M, 3M, 6M, 1Y 기간별로 올바른 데이터 범위와 개수 확인
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class ChartPeriodVerifier {
  constructor() {
    const dbPath = path.join(process.cwd(), 'database.db');
    this.db = new sqlite3.Database(dbPath);
  }

  async verifyChartPeriods() {
    console.log('🎯 차트 기간별 데이터 정확성 검증 시작...');
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 기준 날짜: ${today}`);
    
    const periods = [
      { name: '1M', days: 30, expected: 22 }, // 주말 제외 약 22일
      { name: '3M', days: 90, expected: 65 }, // 주말 제외 약 65일
      { name: '6M', days: 180, expected: 130 }, // 주말 제외 약 130일
      { name: '1Y', days: 365, expected: 260 } // 주말 제외 약 260일
    ];
    
    const tickers = ['005930', 'TSLA', 'AAPL', 'NVDA'];
    
    for (const ticker of tickers) {
      console.log(`\n📊 ${ticker} 기간별 데이터 검증:`);
      
      for (const period of periods) {
        const startDate = this.getStartDate(today, period.days);
        const count = await this.getDataCount(ticker, startDate, today);
        const latestDate = await this.getLatestDateInPeriod(ticker, startDate, today);
        
        const status = count >= Math.floor(period.expected * 0.8) ? '✅' : '⚠️';
        console.log(`  ${status} ${period.name}: ${count}개 데이터 (예상: ${period.expected}개, 기간: ${startDate} ~ ${latestDate})`);
        
        if (count < Math.floor(period.expected * 0.8)) {
          console.log(`    ❌ 데이터 부족: 최소 ${Math.floor(period.expected * 0.8)}개 필요`);
          await this.fillMissingData(ticker, startDate, today);
        }
      }
    }
    
    console.log(`\n✅ 차트 기간별 데이터 검증 완료`);
    this.db.close();
  }

  getStartDate(today, daysAgo) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }

  async getDataCount(ticker, startDate, endDate) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT COUNT(*) as count
        FROM stock_prices
        WHERE ticker = ? AND date >= ? AND date <= ?
      `, [ticker, startDate, endDate], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }

  async getLatestDateInPeriod(ticker, startDate, endDate) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT MAX(date) as latest_date
        FROM stock_prices
        WHERE ticker = ? AND date >= ? AND date <= ?
      `, [ticker, startDate, endDate], (err, row) => {
        if (err) reject(err);
        else resolve(row?.latest_date || 'N/A');
      });
    });
  }

  async fillMissingData(ticker, startDate, endDate) {
    console.log(`    🔄 ${ticker} 누락 데이터 보완 시도 중...`);
    
    try {
      const symbol = ticker === '005930' ? '005930.KS' : ticker;
      const start = Math.floor(new Date(startDate).getTime() / 1000);
      const end = Math.floor(new Date(endDate).getTime() / 1000);
      
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${start}&period2=${end}&interval=1d`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log(`    ❌ ${ticker} API 오류: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (!result) {
        console.log(`    ❌ ${ticker} 데이터 없음`);
        return;
      }
      
      const timestamps = result.timestamp;
      const closes = result.indicators.quote[0].close;
      const volumes = result.indicators.quote[0].volume || [];
      
      let addedCount = 0;
      
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] == null) continue;
        
        const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
        const price = parseFloat(closes[i]).toFixed(2);
        const volume = volumes[i] || 0;
        
        const inserted = await this.insertStockPrice(ticker, date, price, volume);
        if (inserted) {
          addedCount++;
        }
      }
      
      console.log(`    ✅ ${ticker}: ${addedCount}개 데이터 추가됨`);
      
    } catch (error) {
      console.log(`    ❌ ${ticker} 보완 실패:`, error.message);
    }
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

const verifier = new ChartPeriodVerifier();
verifier.verifyChartPeriods().catch(console.error);