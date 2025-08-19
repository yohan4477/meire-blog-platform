const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// TSMC 가격 정보 가져오기
async function fetchTSMCPrice() {
  try {
    console.log('📊 TSMC (TSM) 실시간 가격 정보 가져오는 중...');
    
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/TSM';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (result?.meta) {
      const currentPrice = result.meta.regularMarketPrice;
      const previousClose = result.meta.chartPreviousClose || result.meta.regularMarketPreviousClose;
      const currency = result.meta.currency;
      const marketTime = new Date(result.meta.regularMarketTime * 1000);
      
      if (currentPrice && previousClose) {
        const changeAmount = currentPrice - previousClose;
        const changePercent = ((changeAmount / previousClose) * 100).toFixed(2);
        const changeSign = changeAmount >= 0 ? '+' : '';
        
        const priceInfo = {
          ticker: 'TSM',
          name: 'TSMC',
          price: currentPrice,
          previousClose: previousClose,
          change: changeAmount,
          changePercent: `${changeSign}${changePercent}%`,
          currency: currency,
          marketTime: marketTime.toISOString()
        };
        
        console.log(`✅ TSMC: $${currentPrice.toFixed(2)} (${priceInfo.changePercent})`);
        console.log(`📈 가격 정보:`, priceInfo);
        
        // 데이터베이스에 저장
        const today = new Date().toISOString().split('T')[0];
        db.run(`
          INSERT OR REPLACE INTO stock_prices (ticker, date, close_price, volume)
          VALUES (?, ?, ?, ?)
        `, ['TSM', today, currentPrice, 0], (err) => {
          if (err) {
            console.error('Error saving TSMC price:', err);
          } else {
            console.log('✅ TSMC 가격 정보 데이터베이스 저장 완료');
          }
        });
        
        return priceInfo;
      }
    }
    
    throw new Error('Invalid price data structure');
  } catch (error) {
    console.error('❌ TSMC 가격 정보 가져오기 실패:', error.message);
    return null;
  }
}

// 실행
fetchTSMCPrice().then(priceInfo => {
  if (priceInfo) {
    console.log('\n🎯 TSMC 가격 정보 가져오기 완료!');
    console.log('==================================');
    console.log(`종목: ${priceInfo.name} (${priceInfo.ticker})`);
    console.log(`현재가: $${priceInfo.price.toFixed(2)}`);
    console.log(`변동: ${priceInfo.changePercent}`);
    console.log(`통화: ${priceInfo.currency}`);
    console.log(`시간: ${new Date(priceInfo.marketTime).toLocaleString('ko-KR')}`);
  } else {
    console.log('❌ TSMC 가격 정보를 가져오지 못했습니다.');
  }
  
  setTimeout(() => {
    db.close();
    process.exit(priceInfo ? 0 : 1);
  }, 1000);
}).catch(error => {
  console.error('Fatal error:', error);
  db.close();
  process.exit(1);
});