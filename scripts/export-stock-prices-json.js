// SQLite DB에서 종가 데이터를 JSON 파일로 내보내기
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function exportStockPricesToJson() {
  const dbPath = path.join(__dirname, '../database.db');
  const db = new Database(dbPath);
  
  console.log('📊 Exporting stock price data to JSON...');
  
  try {
    // 모든 메르 언급 종목의 종가 데이터 가져오기
    const query = `
      SELECT 
        s.ticker,
        s.company_name_kr,
        s.market,
        sp.date,
        sp.close_price,
        sp.volume
      FROM stocks s
      JOIN stock_prices sp ON s.ticker = sp.ticker
      WHERE s.is_merry_mentioned = 1
      ORDER BY s.ticker, sp.date ASC
    `;
    
    const allPrices = db.prepare(query).all();
    
    // 종목별로 그룹화
    const stockPricesData = {};
    
    allPrices.forEach(row => {
      if (!stockPricesData[row.ticker]) {
        stockPricesData[row.ticker] = {
          ticker: row.ticker,
          companyName: row.company_name_kr,
          market: row.market,
          prices: []
        };
      }
      
      stockPricesData[row.ticker].prices.push({
        date: row.date,
        price: parseFloat(row.close_price),
        volume: row.volume
      });
    });
    
    // JSON 파일로 저장
    const outputPath = path.join(__dirname, '../data/stock-prices.json');
    
    // data 폴더가 없으면 생성
    const dataDir = path.dirname(outputPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(stockPricesData, null, 2), 'utf8');
    
    console.log(`✅ Stock price data exported to: ${outputPath}`);
    
    // 요약 통계
    const stocks = Object.keys(stockPricesData);
    console.log(`📈 Exported data for ${stocks.length} stocks:`);
    
    stocks.forEach(ticker => {
      const data = stockPricesData[ticker];
      const priceCount = data.prices.length;
      const earliestDate = data.prices[0]?.date;
      const latestDate = data.prices[priceCount - 1]?.date;
      
      console.log(`  - ${ticker} (${data.companyName}): ${priceCount} records (${earliestDate} to ${latestDate})`);
    });
    
  } catch (error) {
    console.error('❌ Error exporting stock prices:', error);
  } finally {
    db.close();
  }
}

// 실행
if (require.main === module) {
  exportStockPricesToJson();
}

module.exports = exportStockPricesToJson;