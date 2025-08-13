/**
 * 주식 가격 서비스 간단 테스트
 */

import { StockPriceService } from '../services/StockPriceService';

async function testStockPrices() {
  console.log('🧪 주식 가격 서비스 테스트 시작\n');
  
  const service = new StockPriceService();
  
  const testStocks = [
    { ticker: '005930', name: '삼성전자', expectedMin: 30000, expectedMax: 150000 },
    { ticker: '000660', name: 'SK하이닉스', expectedMin: 50000, expectedMax: 300000 },
    { ticker: 'AAPL', name: '애플', expectedMin: 100, expectedMax: 400 },
    { ticker: 'TSLA', name: '테슬라', expectedMin: 150, expectedMax: 500 }
  ];

  let successCount = 0;
  let totalTests = testStocks.length;

  for (const stock of testStocks) {
    try {
      console.log(`📈 ${stock.name}(${stock.ticker}) 테스트 중...`);
      const startTime = Date.now();
      
      const result = await service.getStockPrice(stock.ticker, true);
      const responseTime = Date.now() - startTime;
      
      const currency = result.price.currency === 'KRW' ? '₩' : '$';
      const price = result.price.currency === 'KRW' ? 
        result.price.price.toLocaleString() : 
        result.price.price.toFixed(2);
      
      console.log(`   ✅ 현재가: ${currency}${price}`);
      console.log(`   📊 변동률: ${result.price.changePercent.toFixed(2)}%`);
      console.log(`   📈 거래량: ${result.price.volume.toLocaleString()}`);
      console.log(`   ⏱️  응답시간: ${responseTime}ms`);
      console.log(`   💾 캐시: ${result.cached ? '사용됨' : '신규 조회'}`);
      console.log(`   🏢 시장: ${result.price.market}`);
      console.log(`   🔍 데이터 소스: ${result.price.source}`);
      
      // 가격 범위 검증
      const priceInRange = result.price.price >= stock.expectedMin && result.price.price <= stock.expectedMax;
      if (priceInRange) {
        console.log(`   ✅ 가격 범위 검증: 통과 (${stock.expectedMin.toLocaleString()} ~ ${stock.expectedMax.toLocaleString()})`);
      } else {
        console.log(`   ⚠️  가격 범위 경고: 예상 범위를 벗어남 (${stock.expectedMin.toLocaleString()} ~ ${stock.expectedMax.toLocaleString()})`);
      }
      
      // 검증 결과
      if (result.validation) {
        const confidencePercent = (result.validation.confidence * 100).toFixed(1);
        console.log(`   🔍 검증 결과: ${result.validation.isValid ? '✅ 유효' : '❌ 의심'} (신뢰도: ${confidencePercent}%)`);
        
        if (result.validation.warnings.length > 0) {
          console.log(`   ⚠️  경고사항: ${result.validation.warnings.join(', ')}`);
        }
      }
      
      // 기본 검증
      if (result.price.price > 0 && result.price.currency && result.price.market) {
        successCount++;
        console.log(`   🎉 테스트 성공!`);
      } else {
        console.log(`   ❌ 테스트 실패: 필수 데이터 누락`);
      }
      
    } catch (error) {
      console.error(`   ❌ ${stock.name} 테스트 실패:`, error instanceof Error ? error.message : error);
    }
    
    console.log(''); // 빈 줄
  }
  
  // 배치 조회 테스트
  console.log('🔄 배치 조회 테스트...');
  try {
    const batchTickers = ['005930', '000660', 'AAPL'];
    const batchStartTime = Date.now();
    const batchResults = await service.getMultipleStocks(batchTickers, false);
    const batchResponseTime = Date.now() - batchStartTime;
    
    const successfulBatch = Object.keys(batchResults).length;
    console.log(`   ✅ ${successfulBatch}/${batchTickers.length}개 종목 동시 조회 성공`);
    console.log(`   ⏱️  총 응답시간: ${batchResponseTime}ms`);
    console.log(`   📊 평균 응답시간: ${Math.round(batchResponseTime / batchTickers.length)}ms/종목`);
    
    // 배치 결과 출력
    Object.entries(batchResults).forEach(([ticker, result]) => {
      const currency = result.price.currency === 'KRW' ? '₩' : '$';
      const price = result.price.currency === 'KRW' ? 
        result.price.price.toLocaleString() : 
        result.price.price.toFixed(2);
      console.log(`     ${ticker}: ${currency}${price}`);
    });
    
  } catch (error) {
    console.error('   ❌ 배치 조회 실패:', error);
  }
  
  console.log('');
  
  // 캐시 테스트
  console.log('💾 캐시 성능 테스트...');
  try {
    const cacheTicker = '005930';
    
    // 첫 번째 호출 (캐시 없음)
    const firstCall = await service.getStockPrice(cacheTicker);
    
    // 두 번째 호출 (캐시 사용)
    const secondCall = await service.getStockPrice(cacheTicker);
    
    console.log(`   첫 번째 호출: ${firstCall.responseTime}ms (캐시: ${firstCall.cached})`);
    console.log(`   두 번째 호출: ${secondCall.responseTime}ms (캐시: ${secondCall.cached})`);
    
    if (secondCall.cached && secondCall.responseTime < firstCall.responseTime) {
      const speedup = Math.round((firstCall.responseTime / secondCall.responseTime) * 100) / 100;
      console.log(`   ✅ 캐시 성능 향상: ${speedup}배 빨라짐`);
    }
    
  } catch (error) {
    console.error('   ❌ 캐시 테스트 실패:', error);
  }
  
  // 캐시 통계
  const stats = service.getCacheStats();
  console.log(`   📊 캐시 통계: ${stats.size}개 항목 저장됨`);
  
  console.log('');
  
  // 최종 결과
  console.log('📊 테스트 결과 요약:');
  console.log(`   성공: ${successCount}/${totalTests}개 종목`);
  console.log(`   성공률: ${Math.round((successCount / totalTests) * 100)}%`);
  
  if (successCount === totalTests) {
    console.log('   🎉 모든 테스트 통과! 주식 가격 서비스가 정상 작동합니다.');
  } else {
    console.log('   ⚠️  일부 테스트 실패. 로그를 확인해주세요.');
  }
  
  console.log('\n✅ 테스트 완료');
}

// 스크립트 실행
if (require.main === module) {
  testStockPrices().catch(error => {
    console.error('❌ 테스트 실행 중 오류:', error);
    process.exit(1);
  });
}

export default testStockPrices;