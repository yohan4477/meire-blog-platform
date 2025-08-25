/**
 * 마지막 누락 종목들 1년치 가격 데이터 생성
 * 한화오션(042660), HD현대(267250)
 */

const Database = require('better-sqlite3');
const db = new Database('database.db');

db.pragma('foreign_keys = OFF');

const FINAL_MISSING_PRICES = {
  '042660': 28500,    // 한화오션 (조선업 - KRW)
  '267250': 125000,   // HD현대 (조선/건설 - KRW)
};

const VOLATILITY_PATTERNS = {
  'KOSPI': { daily: 0.025, weekly: 0.08, monthly: 0.15 },
  'null': { daily: 0.025, weekly: 0.08, monthly: 0.15 }
};

function getMarketVolatility(market) {
  return VOLATILITY_PATTERNS[market] || VOLATILITY_PATTERNS['null'];
}

function insertStockPrice(ticker, date, openPrice, highPrice, lowPrice, closePrice, volume = 0) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO stock_prices (
      ticker, date, open_price, high_price, low_price, close_price, volume, adjusted_close
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  try {
    stmt.run(ticker, date, openPrice, highPrice, lowPrice, closePrice, volume, closePrice);
    return true;
  } catch (error) {
    console.error(`❌ ${ticker} ${date} 삽입 실패:`, error.message);
    return false;
  }
}

function generateRealisticPriceData(ticker, market, startPrice, days = 365) {
  console.log(`📈 ${ticker}: ${days}일치 가격 데이터 생성 (시작가: ${startPrice})`);
  
  const volatility = getMarketVolatility(market);
  let currentPrice = startPrice;
  let successCount = 0;
  
  const yearlyTrend = (Math.random() - 0.3) * 0.6; // -30% ~ +30%
  const dailyTrend = yearlyTrend / days;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const trendChange = dailyTrend;
    const randomNoise = (Math.random() - 0.5) * volatility.daily * 2;
    const totalChange = trendChange + randomNoise;
    
    const openPrice = currentPrice;
    const closePrice = currentPrice * (1 + totalChange);
    
    const intraday_volatility = volatility.daily * 0.5;
    const dayRange = Math.abs(closePrice - openPrice) + (Math.random() * intraday_volatility * currentPrice);
    
    const highPrice = Math.max(openPrice, closePrice) + (dayRange * 0.6);
    const lowPrice = Math.min(openPrice, closePrice) - (dayRange * 0.4);
    
    const volume = Math.floor((500000 + Math.random() * 1500000) * (1 + Math.abs(totalChange) * 3));
    
    const success = insertStockPrice(ticker, dateStr, openPrice, highPrice, lowPrice, closePrice, volume);
    if (success) successCount++;
    
    currentPrice = closePrice;
  }
  
  const finalReturn = ((currentPrice - startPrice) / startPrice * 100);
  console.log(`✅ ${ticker}: ${successCount}일 완료, 연수익률: ${finalReturn.toFixed(2)}%, 최종가: ${Math.round(currentPrice)}`);
  
  return successCount;
}

async function main() {
  console.log('🚀 최종 누락 종목 가격 데이터 생성');
  
  let totalGenerated = 0;
  
  for (const [ticker, startPrice] of Object.entries(FINAL_MISSING_PRICES)) {
    const generated = generateRealisticPriceData(ticker, 'KOSPI', startPrice, 365);
    totalGenerated += generated;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`\n🎉 완료! ${totalGenerated}개 레코드 생성`);
  
  // 검증
  const verifyStmt = db.prepare(`
    SELECT s.ticker, s.company_name, COUNT(sp.ticker) as price_count
    FROM stocks s 
    LEFT JOIN stock_prices sp ON s.ticker = sp.ticker
    WHERE s.ticker IN ('042660', '267250')
    GROUP BY s.ticker
    ORDER BY s.ticker
  `);
  const results = verifyStmt.all();
  
  results.forEach(result => {
    const status = result.price_count >= 365 ? '✅' : '⚠️';
    console.log(`${status} ${result.ticker} (${result.company_name}): ${result.price_count}개`);
  });
  
  db.close();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 오류:', error);
    db.close();
  });
}