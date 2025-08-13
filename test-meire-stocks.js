const { StockPriceService } = require('./src/services/StockPriceService');
const service = new StockPriceService();

async function test() {
  console.log('🚀 테스팅 메르s Pick 종목들...');
  const stocks = ['TSLA', '005930', 'NVDA', 'AAPL', '042660', '000660'];
  
  for (const ticker of stocks) {
    try {
      const result = await service.getStockPrice(ticker);
      const currency = result.price.currency === 'KRW' ? '₩' : '$';
      const price = result.price.currency === 'KRW' ? 
        result.price.price.toLocaleString() : 
        result.price.price.toFixed(2);
      console.log(`✅ ${ticker}: ${currency}${price} (${result.price.changePercent > 0 ? '+' : ''}${result.price.changePercent}%)`);
    } catch (error) {
      console.log(`❌ ${ticker}: 조회 실패`);
    }
  }
  
  console.log('\n📊 차트 데이터 준비 완료!');
}

test().catch(console.error);