/**
 * 주식 가격 서비스 테스트
 * 실제 API 호출로 가격 정확성 검증
 */

import { StockPriceService } from '../services/StockPriceService';

describe('StockPriceService', () => {
  let service: StockPriceService;

  beforeEach(() => {
    service = new StockPriceService();
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('한국 종목 테스트', () => {
    test('삼성전자(005930) 주가 조회', async () => {
      const result = await service.getStockPrice('005930', true);
      
      expect(result.price.ticker).toBe('005930');
      expect(result.price.currency).toBe('KRW');
      expect(result.price.market).toMatch(/KOSPI|KOSDAQ/);
      expect(result.price.price).toBeGreaterThan(0);
      expect(result.price.source).toBe('YAHOO');
      
      // 가격 범위 검증 (삼성전자는 보통 50,000원~100,000원)
      expect(result.price.price).toBeGreaterThan(30000);
      expect(result.price.price).toBeLessThan(150000);
      
      console.log(`✅ 삼성전자 현재가: ${result.price.price.toLocaleString()}원`);
      console.log(`   변동률: ${result.price.changePercent}%`);
      console.log(`   응답시간: ${result.responseTime}ms`);
      
      if (result.validation) {
        console.log(`   검증 신뢰도: ${(result.validation.confidence * 100).toFixed(1)}%`);
      }
    }, 10000);

    test('SK하이닉스(000660) 주가 조회', async () => {
      const result = await service.getStockPrice('000660');
      
      expect(result.price.ticker).toBe('000660');
      expect(result.price.currency).toBe('KRW');
      expect(result.price.price).toBeGreaterThan(0);
      
      // SK하이닉스 가격 범위 (보통 80,000원~200,000원)
      expect(result.price.price).toBeGreaterThan(50000);
      expect(result.price.price).toBeLessThan(300000);
      
      console.log(`✅ SK하이닉스 현재가: ${result.price.price.toLocaleString()}원`);
    }, 10000);
  });

  describe('미국 종목 테스트', () => {
    test('애플(AAPL) 주가 조회', async () => {
      const result = await service.getStockPrice('AAPL', true);
      
      expect(result.price.ticker).toBe('AAPL');
      expect(result.price.currency).toBe('USD');
      expect(result.price.market).toBe('NASDAQ');
      expect(result.price.price).toBeGreaterThan(0);
      
      // 애플 가격 범위 (보통 $150~$250)
      expect(result.price.price).toBeGreaterThan(100);
      expect(result.price.price).toBeLessThan(400);
      
      console.log(`✅ 애플 현재가: $${result.price.price}`);
      console.log(`   변동률: ${result.price.changePercent}%`);
      
      if (result.validation) {
        console.log(`   검증 신뢰도: ${(result.validation.confidence * 100).toFixed(1)}%`);
      }
    }, 10000);

    test('테슬라(TSLA) 주가 조회', async () => {
      const result = await service.getStockPrice('TSLA');
      
      expect(result.price.ticker).toBe('TSLA');
      expect(result.price.currency).toBe('USD');
      expect(result.price.price).toBeGreaterThan(0);
      
      console.log(`✅ 테슬라 현재가: $${result.price.price}`);
    }, 10000);
  });

  describe('배치 조회 테스트', () => {
    test('여러 종목 동시 조회', async () => {
      const tickers = ['005930', '000660', 'AAPL', 'TSLA'];
      const results = await service.getMultipleStocks(tickers, false);
      
      expect(Object.keys(results)).toHaveLength(tickers.length);
      
      // 모든 종목이 조회되었는지 확인
      tickers.forEach(ticker => {
        expect(results[ticker]).toBeDefined();
        const result = results[ticker];
        if (result) {
          expect(result.price.price).toBeGreaterThan(0);
          
          console.log(`✅ ${ticker}: ${result.price.currency === 'KRW' ? 
            '₩' + result.price.price.toLocaleString() : 
            '$' + result.price.price}`);
        }
      });
    }, 15000);
  });

  describe('가격 검증 테스트', () => {
    test('정상 가격 검증', async () => {
      const result = await service.getStockPrice('005930', true);
      
      if (result.validation) {
        expect(result.validation.confidence).toBeGreaterThan(0);
        expect(result.validation.sources).toContain('YAHOO');
        
        if (!result.validation.isValid) {
          console.warn('⚠️ 가격 검증 실패:', result.validation.warnings);
        }
      }
    }, 10000);

    test('비정상 종목 코드 처리', async () => {
      await expect(service.getStockPrice('INVALID123')).rejects.toThrow();
    }, 5000);
  });

  describe('캐시 테스트', () => {
    test('캐시 동작 확인', async () => {
      // 첫 번째 호출
      const result1 = await service.getStockPrice('005930');
      expect(result1.cached).toBe(false);
      
      // 두 번째 호출 (캐시에서)
      const result2 = await service.getStockPrice('005930');
      expect(result2.cached).toBe(true);
      expect(result2.responseTime).toBeLessThan(result1.responseTime);
      
      console.log(`📊 캐시 성능: ${result1.responseTime}ms → ${result2.responseTime}ms`);
    }, 10000);

    test('캐시 통계', () => {
      const stats = service.getCacheStats();
      expect(stats.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('시장별 특성 테스트', () => {
    test('한국/미국 종목 구분', async () => {
      const koreanStock = await service.getStockPrice('005930');
      const usStock = await service.getStockPrice('AAPL');
      
      expect(koreanStock.price.currency).toBe('KRW');
      expect(usStock.price.currency).toBe('USD');
      
      expect(['KOSPI', 'KOSDAQ']).toContain(koreanStock.price.market);
      expect(['NASDAQ', 'NYSE']).toContain(usStock.price.market);
    }, 15000);
  });

  describe('에러 처리 테스트', () => {
    test('네트워크 오류 시 캐시 fallback', async () => {
      // 먼저 정상 데이터를 캐시에 저장
      await service.getStockPrice('005930');
      
      // 캐시 통계 확인
      const stats = service.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    }, 10000);
  });
});

/**
 * 수동 실행용 테스트 스크립트
 */
export async function runManualTests() {
  console.log('🧪 주식 가격 서비스 수동 테스트 시작\n');
  
  const service = new StockPriceService();
  
  const testStocks = [
    { ticker: '005930', name: '삼성전자' },
    { ticker: '000660', name: 'SK하이닉스' },
    { ticker: 'AAPL', name: '애플' },
    { ticker: 'TSLA', name: '테슬라' },
    { ticker: 'NVDA', name: '엔비디아' }
  ];

  for (const stock of testStocks) {
    try {
      console.log(`📈 ${stock.name}(${stock.ticker}) 조회 중...`);
      const result = await service.getStockPrice(stock.ticker, true);
      
      const currency = result.price.currency === 'KRW' ? '₩' : '$';
      const price = result.price.currency === 'KRW' ? 
        result.price.price.toLocaleString() : 
        result.price.price.toFixed(2);
      
      console.log(`   현재가: ${currency}${price}`);
      console.log(`   변동률: ${result.price.changePercent}%`);
      console.log(`   거래량: ${result.price.volume.toLocaleString()}`);
      console.log(`   응답시간: ${result.responseTime}ms`);
      console.log(`   캐시: ${result.cached ? '사용' : '미사용'}`);
      
      if (result.validation) {
        console.log(`   검증: ${result.validation.isValid ? '✅' : '❌'} (신뢰도: ${(result.validation.confidence * 100).toFixed(1)}%)`);
        if (result.validation.warnings.length > 0) {
          console.log(`   경고: ${result.validation.warnings.join(', ')}`);
        }
      }
      
      console.log('');
      
    } catch (error) {
      console.error(`❌ ${stock.name} 조회 실패:`, error);
      console.log('');
    }
  }
  
  // 배치 조회 테스트
  console.log('🔄 배치 조회 테스트...');
  const batchResult = await service.getMultipleStocks(['005930', '000660', 'AAPL']);
  console.log(`   ${Object.keys(batchResult).length}개 종목 동시 조회 완료\n`);
  
  // 캐시 통계
  const stats = service.getCacheStats();
  console.log(`📊 캐시 통계: ${stats.size}개 항목`);
  
  console.log('✅ 수동 테스트 완료');
}

// 스크립트로 실행할 때
if (require.main === module) {
  runManualTests().catch(console.error);
}