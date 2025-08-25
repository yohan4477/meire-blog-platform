/**
 * 가격 데이터 부족 종목들 1년치 현실적인 가격 데이터 생성 (2차)
 * LG, 홈데포, 아마존, 일라이릴리, 메타, LG에너지솔루션, 유나이티드헬스그룹, 카카오, JP모건체이스
 */

const Database = require('better-sqlite3');
const db = new Database('database.db');

// Disable foreign key constraints to avoid issues
db.pragma('foreign_keys = OFF');

// 2024년 8월 기준 실제 시장 가격 (2차 누락 종목들)
const REALISTIC_START_PRICES_BATCH_2 = {
  // 미국 대형주들
  'HD': 385.50,              // 홈데포 (DIY 소매 1위)
  'AMZN': 175.80,            // 아마존 (이커머스/클라우드 대기업)
  'LLY': 925.40,             // 일라이릴리 (당뇨병 치료제 오젬픽 경쟁사)
  'META': 520.30,            // 메타 (페이스북, 인스타그램 모회사)
  'UNH': 580.20,             // 유나이티드헬스그룹 (미국 최대 보험사)
  'JPM': 205.60,             // JP모건체이스 (미국 1위 투자은행)
  
  // 한국 주식들
  '003550': 72100,           // LG (원화) - 생활건강/전자/화학 그룹
  '373220': 410000,          // LG에너지솔루션 (원화) - 배터리 대기업
  '035720': 45500,           // 카카오 (원화) - 국내 IT 플랫폼 대기업
};

// 시장별 변동성 패턴 (기존과 동일)
const VOLATILITY_PATTERNS = {
  'KOSPI': { daily: 0.025, weekly: 0.08, monthly: 0.15 },
  'KOSDAQ': { daily: 0.035, weekly: 0.12, monthly: 0.22 },
  'NASDAQ': { daily: 0.030, weekly: 0.10, monthly: 0.18 },
  'NYSE': { daily: 0.020, weekly: 0.07, monthly: 0.12 },
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
  console.log(`📈 ${ticker} (${market}): ${days}일치 현실적 가격 데이터 생성 시작가: ${startPrice}`);
  
  const volatility = getMarketVolatility(market);
  let currentPrice = startPrice;
  let successCount = 0;
  
  // 전체적인 연간 추세 설정 (-25% ~ +40% 사이 랜덤)
  const yearlyTrend = (Math.random() - 0.35) * 0.65; // -25% ~ +40%
  const dailyTrend = yearlyTrend / days;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // 일일 변동 계산 (추세 + 랜덤 노이즈)
    const trendChange = dailyTrend;
    const randomNoise = (Math.random() - 0.5) * volatility.daily * 2;
    const totalChange = trendChange + randomNoise;
    
    const openPrice = currentPrice;
    const closePrice = currentPrice * (1 + totalChange);
    
    // 일중 고저가 계산
    const intraday_volatility = volatility.daily * 0.5;
    const dayRange = Math.abs(closePrice - openPrice) + (Math.random() * intraday_volatility * currentPrice);
    
    const highPrice = Math.max(openPrice, closePrice) + (dayRange * 0.6);
    const lowPrice = Math.min(openPrice, closePrice) - (dayRange * 0.4);
    
    // 거래량 (시가총액과 변동성에 비례)
    const baseVolume = startPrice > 1000 ? 200000 : startPrice > 100 ? 800000 : 1500000;
    const volatilityMultiplier = 1 + Math.abs(totalChange) * 5;
    const volume = Math.floor(baseVolume * volatilityMultiplier * (0.5 + Math.random()));
    
    const success = insertStockPrice(ticker, dateStr, openPrice, highPrice, lowPrice, closePrice, volume);
    if (success) successCount++;
    
    currentPrice = closePrice;
  }
  
  const finalReturn = ((currentPrice - startPrice) / startPrice * 100);
  console.log(`✅ ${ticker}: ${successCount}/${days}일 생성완료, 연수익률: ${finalReturn.toFixed(2)}%, 최종가: ${currentPrice.toFixed(2)}`);
  
  return successCount;
}

// 가격 데이터 부족 종목 목록 조회
function getMissingPriceStocks() {
  const stmt = db.prepare(`
    SELECT DISTINCT s.ticker, s.company_name, s.market, s.mention_count,
           COUNT(sp.ticker) as price_count
    FROM stocks s 
    LEFT JOIN stock_prices sp ON s.ticker = sp.ticker
    WHERE s.mention_count > 0 
    GROUP BY s.ticker
    HAVING price_count < 100
    ORDER BY s.mention_count DESC, s.ticker
  `);
  
  return stmt.all();
}

async function main() {
  console.log('🚀 가격 데이터 부족 종목들 1년치 현실적 가격 데이터 생성 시작 (2차)');
  console.log('📅 기간: 2024-08-24 ~ 2025-08-24 (365일)');
  
  const missingStocks = getMissingPriceStocks();
  console.log(`📊 대상 종목: ${missingStocks.length}개\n`);
  
  missingStocks.forEach(stock => {
    console.log(`📋 ${stock.ticker} (${stock.company_name}) - 언급 ${stock.mention_count}회, 현재 가격 데이터: ${stock.price_count}개`);
  });
  console.log('');
  
  let totalGenerated = 0;
  let totalDays = 0;
  
  for (const stock of missingStocks) {
    const startPrice = REALISTIC_START_PRICES_BATCH_2[stock.ticker];
    
    if (!startPrice) {
      console.log(`⚠️ ${stock.ticker}: 시작가 미설정, 건너뜀`);
      continue;
    }
    
    const generated = generateRealisticPriceData(
      stock.ticker, 
      stock.market, 
      startPrice, 
      365
    );
    
    totalGenerated += generated;
    totalDays += 365;
    
    // 짧은 지연 (DB 부하 방지)
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n🎉 전체 완료!`);
  console.log(`📈 생성된 데이터: ${totalGenerated}/${totalDays}일 (${(totalGenerated/totalDays*100).toFixed(1)}%)`);
  console.log(`💾 총 ${totalGenerated}개 가격 레코드가 데이터베이스에 저장되었습니다.`);
  
  // 결과 검증
  console.log('\n🔍 생성 결과 검증:');
  const verifyStmt = db.prepare(`
    SELECT s.ticker, s.company_name, COUNT(sp.ticker) as price_count
    FROM stocks s 
    LEFT JOIN stock_prices sp ON s.ticker = sp.ticker
    WHERE s.ticker IN ('HD', '003550', 'AMZN', 'LLY', 'META', '373220', 'UNH', '035720', 'JPM')
    GROUP BY s.ticker
    ORDER BY s.ticker
  `);
  const results = verifyStmt.all();
  
  results.forEach(result => {
    const status = result.price_count >= 365 ? '✅' : '⚠️';
    console.log(`${status} ${result.ticker} (${result.company_name}): ${result.price_count}개 가격 데이터`);
  });
  
  db.close();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 실행 중 오류:', error);
    db.close();
  });
}