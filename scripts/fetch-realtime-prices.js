const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// 주요 종목 리스트
const stocks = [
  { ticker: '005930', symbol: '005930.KS', name: '삼성전자' },
  { ticker: 'TSLA', symbol: 'TSLA', name: '테슬라' },
  { ticker: 'NVDA', symbol: 'NVDA', name: '엔비디아' },
  { ticker: 'AAPL', symbol: 'AAPL', name: '애플' },
  { ticker: 'GOOGL', symbol: 'GOOGL', name: '구글' },
  { ticker: 'MSFT', symbol: 'MSFT', name: '마이크로소프트' },
  { ticker: 'META', symbol: 'META', name: '메타' },
  { ticker: 'AMZN', symbol: 'AMZN', name: '아마존' },
  { ticker: '373220', symbol: '373220.KS', name: 'LG에너지솔루션' },
  { ticker: '003550', symbol: '003550.KS', name: 'LG' },
  { ticker: 'INTC', symbol: 'INTC', name: '인텔' },
  { ticker: 'LLY', symbol: 'LLY', name: '일라이릴리' },
  { ticker: 'UNH', symbol: 'UNH', name: '유나이티드헬스' },
  { ticker: 'TSM', symbol: 'TSM', name: 'TSMC' },
  { ticker: '035420', symbol: '035420.KS', name: '네이버' },
  { ticker: '035720', symbol: '035720.KS', name: '카카오' },
  { ticker: 'V', symbol: 'V', name: '비자' },
  { ticker: 'JPM', symbol: 'JPM', name: 'JP모건' },
  { ticker: 'HD', symbol: 'HD', name: '홈디포' },
  { ticker: 'SAP', symbol: 'SAP', name: 'SAP' }
];

// Yahoo Finance에서 실시간 가격 가져오기
async function fetchStockPrice(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch ${symbol}: ${response.status}`);
      return null;
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
        
        return {
          price: currentPrice,
          previousClose: previousClose,
          change: changeAmount,
          changePercent: `${changeSign}${changePercent}%`,
          currency: currency,
          marketTime: marketTime.toISOString()
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error fetching ${symbol}:`, error.message);
    return null;
  }
}

// 모든 종목 가격 가져오기
async function fetchAllPrices() {
  console.log('🚀 Starting real-time price fetch from Yahoo Finance...\n');
  
  const results = [];
  
  for (const stock of stocks) {
    console.log(`📊 Fetching ${stock.name} (${stock.symbol})...`);
    const priceData = await fetchStockPrice(stock.symbol);
    
    if (priceData) {
      const isKorean = stock.ticker.length === 6 && !isNaN(Number(stock.ticker));
      const displayPrice = isKorean 
        ? Math.round(priceData.price).toLocaleString() 
        : priceData.price.toFixed(2);
      
      console.log(`✅ ${stock.name}: ${priceData.currency === 'KRW' ? '₩' : '$'}${displayPrice} (${priceData.changePercent})`);
      
      results.push({
        ticker: stock.ticker,
        name: stock.name,
        price: priceData.price,
        change: priceData.change,
        changePercent: priceData.changePercent,
        currency: priceData.currency,
        marketTime: priceData.marketTime
      });
      
      // 데이터베이스에 저장 (stock_prices 테이블)
      const today = new Date().toISOString().split('T')[0];
      db.run(`
        INSERT OR REPLACE INTO stock_prices (ticker, date, close_price, volume)
        VALUES (?, ?, ?, ?)
      `, [stock.ticker, today, priceData.price, 0], (err) => {
        if (err) {
          console.error(`Error saving price for ${stock.ticker}:`, err);
        }
      });
      
    } else {
      console.log(`⚠️ ${stock.name}: No price data available`);
    }
    
    // API 제한 방지를 위한 딜레이
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

// 실행
fetchAllPrices().then(results => {
  console.log('\n📈 =========================');
  console.log('📊 Final Price Summary:');
  console.log('=========================\n');
  
  // 한국 주식
  console.log('🇰🇷 Korean Stocks:');
  results.filter(r => r.currency === 'KRW').forEach(stock => {
    console.log(`  ${stock.name}: ₩${Math.round(stock.price).toLocaleString()} (${stock.changePercent})`);
  });
  
  console.log('\n🇺🇸 US Stocks:');
  results.filter(r => r.currency === 'USD').forEach(stock => {
    console.log(`  ${stock.name}: $${stock.price.toFixed(2)} (${stock.changePercent})`);
  });
  
  console.log('\n✅ Price fetch complete!');
  
  // 데이터베이스 닫기
  setTimeout(() => {
    db.close();
    process.exit(0);
  }, 1000);
}).catch(error => {
  console.error('Fatal error:', error);
  db.close();
  process.exit(1);
});