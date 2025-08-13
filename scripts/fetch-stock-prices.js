// 메르 언급 종목들의 6개월치 종가 데이터 수집 및 저장
const Database = require('better-sqlite3');
const path = require('path');

class StockPriceFetcher {
  constructor() {
    const dbPath = path.join(__dirname, '../database.db');
    this.db = new Database(dbPath);
  }

  // Yahoo Finance에서 6개월치 주가 데이터 가져오기
  async fetchStockPrices(ticker, isKoreanStock = false) {
    try {
      const symbol = isKoreanStock ? `${ticker}.KS` : ticker;
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const period1 = Math.floor(sixMonthsAgo.getTime() / 1000);
      const period2 = Math.floor(Date.now() / 1000);
      
      console.log(`📈 Fetching 6-month data for ${ticker} (${symbol})...`);
      
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (!result || !result.timestamp) {
        console.warn(`⚠️ No data found for ${ticker}`);
        return [];
      }

      const timestamps = result.timestamp;
      const quotes = result.indicators?.quote?.[0];
      
      if (!quotes) {
        console.warn(`⚠️ No quote data found for ${ticker}`);
        return [];
      }

      const pricesData = [];
      
      for (let i = 0; i < timestamps.length; i++) {
        const date = new Date(timestamps[i] * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        // 유효한 종가가 있는 데이터만 저장
        if (quotes.close[i] !== null && !isNaN(quotes.close[i])) {
          pricesData.push({
            date: dateStr,
            open: quotes.open[i] || null,
            high: quotes.high[i] || null,
            low: quotes.low[i] || null,
            close: quotes.close[i],
            volume: result.indicators?.quote?.[0]?.volume?.[i] || null,
            adjustedClose: result.indicators?.adjclose?.[0]?.adjclose?.[i] || quotes.close[i]
          });
        }
      }

      console.log(`✅ Fetched ${pricesData.length} price records for ${ticker}`);
      return pricesData;
      
    } catch (error) {
      console.error(`❌ Failed to fetch data for ${ticker}:`, error.message);
      return [];
    }
  }

  // 종가 데이터를 DB에 저장
  saveStockPrices(ticker, pricesData) {
    if (pricesData.length === 0) {
      console.warn(`⚠️ No price data to save for ${ticker}`);
      return;
    }

    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO stock_prices 
      (ticker, date, open_price, high_price, low_price, close_price, volume, adjusted_close)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((prices) => {
      for (const price of prices) {
        insert.run(
          ticker,
          price.date,
          price.open,
          price.high,
          price.low,
          price.close,
          price.volume,
          price.adjustedClose
        );
      }
    });

    try {
      insertMany(pricesData);
      console.log(`💾 Saved ${pricesData.length} price records for ${ticker}`);
      
      // 6개월 이전 데이터 자동 삭제 (CLAUDE.md 요구사항)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const deleteOld = this.db.prepare(`
        DELETE FROM stock_prices 
        WHERE ticker = ? AND date < ?
      `);
      
      const deletedCount = deleteOld.run(ticker, sixMonthsAgo.toISOString().split('T')[0]).changes;
      
      if (deletedCount > 0) {
        console.log(`🗑️ Deleted ${deletedCount} old records for ${ticker}`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to save data for ${ticker}:`, error);
    }
  }

  // 모든 메르 언급 종목의 종가 데이터 수집
  async fetchAllStockPrices() {
    console.log('🚀 Starting 6-month stock price data collection...');
    
    // 메르 언급 종목 목록 가져오기
    const stocks = this.db.prepare(`
      SELECT ticker, company_name_kr, market 
      FROM stocks 
      WHERE is_merry_mentioned = 1
      ORDER BY mention_count DESC
    `).all();
    
    console.log(`📊 Found ${stocks.length} Merry-mentioned stocks to process:`);
    stocks.forEach(stock => {
      console.log(`  - ${stock.ticker}: ${stock.company_name_kr} (${stock.market})`);
    });

    for (const stock of stocks) {
      const isKoreanStock = stock.market === 'KRX' || (stock.ticker.length === 6 && !isNaN(Number(stock.ticker)));
      
      console.log(`\n🔄 Processing ${stock.ticker} (${stock.company_name_kr})...`);
      
      const pricesData = await this.fetchStockPrices(stock.ticker, isKoreanStock);
      this.saveStockPrices(stock.ticker, pricesData);
      
      // API 제한을 피하기 위해 잠깐 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✅ Stock price data collection completed!');
    
    // 결과 요약
    const summary = this.db.prepare(`
      SELECT s.ticker, s.company_name_kr, COUNT(sp.id) as price_records,
             MIN(sp.date) as earliest_date, MAX(sp.date) as latest_date
      FROM stocks s
      LEFT JOIN stock_prices sp ON s.ticker = sp.ticker
      WHERE s.is_merry_mentioned = 1
      GROUP BY s.ticker
      ORDER BY price_records DESC
    `).all();
    
    console.log('\n📈 Data Collection Summary:');
    summary.forEach(item => {
      console.log(`  ${item.ticker} (${item.company_name_kr}): ${item.price_records} records (${item.earliest_date} to ${item.latest_date})`);
    });
  }

  close() {
    this.db.close();
  }
}

// 실행
async function main() {
  const fetcher = new StockPriceFetcher();
  
  try {
    await fetcher.fetchAllStockPrices();
  } catch (error) {
    console.error('❌ Error in main process:', error);
  } finally {
    fetcher.close();
  }
}

// 직접 실행될 때만 main 함수 호출
if (require.main === module) {
  main();
}

module.exports = StockPriceFetcher;