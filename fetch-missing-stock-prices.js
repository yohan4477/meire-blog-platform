/**
 * 1년치 주식 가격 데이터 수집 스크립트
 * 가격 정보가 없는 모든 종목에 대해 1년치 데이터를 수집합니다.
 */

const Database = require('better-sqlite3');
const db = new Database('database.db');

// Yahoo Finance 스타일 API 시뮬레이션 함수 (실제로는 Claude가 수동으로 데이터를 입력)
async function fetchStockPriceData(ticker, market, days = 365) {
  console.log(`📈 ${ticker} (${market}) - ${days}일치 가격 데이터 요청`);
  
  // 실제 데이터는 Claude가 수동으로 입력해야 함
  // 이 스크립트는 구조만 제공하고 실제 데이터 입력은 별도 작업 필요
  
  return null; // Claude 수동 입력 대기
}

// 가격 정보 없는 종목 목록 조회
function getMissingPriceStocks() {
  const stmt = db.prepare(`
    SELECT DISTINCT s.ticker, s.company_name, s.market, s.mention_count
    FROM stocks s 
    LEFT JOIN stock_prices sp ON s.ticker = sp.ticker
    WHERE s.mention_count > 0 AND sp.ticker IS NULL
    ORDER BY s.mention_count DESC, s.ticker
  `);
  
  return stmt.all();
}

// 주식 가격 데이터 삽입
function insertStockPrice(ticker, date, openPrice, highPrice, lowPrice, closePrice, volume = 0) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO stock_prices (
      ticker, date, open_price, high_price, low_price, close_price, volume, adjusted_close
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  try {
    stmt.run(ticker, date, openPrice, highPrice, lowPrice, closePrice, volume, closePrice);
    console.log(`✅ ${ticker} ${date}: ${closePrice}`);
    return true;
  } catch (error) {
    console.error(`❌ ${ticker} ${date} 삽입 실패:`, error.message);
    return false;
  }
}

// 메인 실행 함수
async function main() {
  console.log('🚀 가격 정보 없는 종목들의 1년치 데이터 수집 시작');
  
  const missingStocks = getMissingPriceStocks();
  console.log(`📊 가격 정보 없는 종목: ${missingStocks.length}개`);
  
  console.log('\n📋 가격 정보 없는 종목 목록:');
  missingStocks.forEach((stock, index) => {
    console.log(`${index + 1}. ${stock.ticker} (${stock.company_name}) - ${stock.market} - 언급 ${stock.mention_count}회`);
  });
  
  console.log('\n⚠️ 주의: 실제 가격 데이터는 Claude가 수동으로 다음 함수들을 사용해서 입력해야 합니다:');
  console.log('- insertStockPrice(ticker, date, open, high, low, close, volume)');
  console.log('\n예시:');
  console.log('insertStockPrice("MP", "2025-08-22", 45.20, 46.50, 44.80, 45.90, 1234567);');
  console.log('insertStockPrice("TM", "2025-08-22", 180.50, 182.30, 179.90, 181.75, 987654);');
  
  return missingStocks;
}

// 수동 데이터 입력을 위한 헬퍼 함수들
global.insertStockPrice = insertStockPrice;
global.getMissingStocks = getMissingPriceStocks;

// 특정 기간의 더미 데이터 생성 (테스트용)
function generateDummyPriceData(ticker, startPrice, days = 30) {
  console.log(`🧪 ${ticker}에 대한 ${days}일치 테스트 데이터 생성`);
  
  let currentPrice = startPrice;
  const results = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // 랜덤 변동 (-5% ~ +5%)
    const changePercent = (Math.random() - 0.5) * 0.1; // -5% ~ +5%
    const dailyChange = currentPrice * changePercent;
    
    const openPrice = currentPrice;
    const closePrice = currentPrice + dailyChange;
    const highPrice = Math.max(openPrice, closePrice) * (1 + Math.random() * 0.02);
    const lowPrice = Math.min(openPrice, closePrice) * (1 - Math.random() * 0.02);
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    
    const success = insertStockPrice(ticker, dateStr, openPrice, highPrice, lowPrice, closePrice, volume);
    if (success) {
      results.push({ date: dateStr, close: closePrice });
    }
    
    currentPrice = closePrice;
  }
  
  console.log(`✅ ${ticker}: ${results.length}일치 데이터 생성 완료`);
  return results;
}

global.generateDummyPriceData = generateDummyPriceData;

if (require.main === module) {
  main().then(missingStocks => {
    console.log(`\n🎯 총 ${missingStocks.length}개 종목의 가격 데이터 수집이 필요합니다.`);
    console.log('\n🔧 사용 방법:');
    console.log('1. 이 스크립트를 실행하여 목록 확인');
    console.log('2. Claude가 각 종목의 실제 가격 데이터를 수동으로 insertStockPrice() 함수로 입력');
    console.log('3. 또는 테스트용으로 generateDummyPriceData() 사용');
    
    db.close();
  }).catch(error => {
    console.error('❌ 실행 중 오류 발생:', error);
    db.close();
  });
}

module.exports = { getMissingPriceStocks, insertStockPrice, generateDummyPriceData };