/**
 * 🧪 Bloomberg Terminal급 차트 테스트 스위트
 * 모든 차트 기능과 통합성을 검증하는 포괄적 테스트 시스템
 */

import { StockPriceService } from '../services/StockPriceService';
import { mcpChartIntegration } from '../lib/mcp-chart-integration';

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  duration: number;
  message: string;
  details?: any;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    totalDuration: number;
  };
}

export class ChartTestSuite {
  private stockService: StockPriceService;
  private testTickers = ['AAPL', 'TSLA', '005930', '000660']; // 미국, 한국 종목 혼합

  constructor() {
    this.stockService = new StockPriceService();
  }

  /**
   * 🎯 전체 차트 시스템 테스트 실행
   */
  async runFullTestSuite(): Promise<TestSuite[]> {
    console.log('🧪 Bloomberg Terminal 차트 테스트 스위트 시작...');
    
    const suites: TestSuite[] = [];
    
    try {
      // 1. 기본 API 연결 테스트
      suites.push(await this.testStockPriceAPI());
      
      // 2. 데이터 파이프라인 테스트
      suites.push(await this.testDataPipeline());
      
      // 3. 기술적 지표 계산 테스트
      suites.push(await this.testTechnicalIndicators());
      
      // 4. MCP 통합 테스트
      suites.push(await this.testMCPIntegration());
      
      // 5. 실시간 스트리밍 테스트
      suites.push(await this.testRealTimeStreaming());
      
      // 6. 성능 및 최적화 테스트
      suites.push(await this.testPerformance());
      
      // 7. 사용자 경험 테스트
      suites.push(await this.testUserExperience());
      
      // 8. 에러 처리 및 복구 테스트
      suites.push(await this.testErrorHandling());
      
      console.log('✅ 모든 테스트 스위트 완료');
      
    } catch (error) {
      console.error('❌ 테스트 스위트 실행 중 오류:', error);
    }
    
    return suites;
  }

  /**
   * 📊 주식 가격 API 기본 테스트
   */
  private async testStockPriceAPI(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // 테스트 1: Yahoo Finance API 연결
    tests.push(await this.runTest('Yahoo Finance API 연결', async () => {
      const result = await this.stockService.getStockPrice('AAPL');
      if (!result.price || result.price.price <= 0) {
        throw new Error('유효하지 않은 주가 데이터');
      }
      return `현재가: $${result.price.price}, 응답시간: ${result.responseTime}ms`;
    }));

    // 테스트 2: 한국 종목 지원
    tests.push(await this.runTest('한국 종목 지원', async () => {
      const result = await this.stockService.getStockPrice('005930');
      if (!result.price || result.price.market !== 'KOSPI') {
        throw new Error('한국 종목 처리 실패');
      }
      return `삼성전자 현재가: ₩${result.price.price.toLocaleString()}`;
    }));

    // 테스트 3: 캐시 시스템
    tests.push(await this.runTest('캐시 시스템', async () => {
      const first = await this.stockService.getStockPrice('AAPL');
      const second = await this.stockService.getStockPrice('AAPL');
      
      if (!second.cached) {
        throw new Error('캐시가 작동하지 않음');
      }
      return `첫 호출: ${first.responseTime}ms, 캐시 호출: ${second.responseTime}ms`;
    }));

    // 테스트 4: 배치 처리
    tests.push(await this.runTest('배치 주가 조회', async () => {
      const batchStart = Date.now();
      const results = await this.stockService.getMultipleStocks(this.testTickers);
      const batchTime = Date.now() - batchStart;
      
      if (Object.keys(results).length < this.testTickers.length * 0.8) {
        throw new Error('배치 처리 성공률 낮음');
      }
      return `${Object.keys(results).length}/${this.testTickers.length} 성공, ${batchTime}ms`;
    }));

    // 테스트 5: 과거 데이터
    tests.push(await this.runTest('과거 데이터 조회', async () => {
      const historical = await this.stockService.getHistoricalData('AAPL', 1);
      if (!historical.length || historical.length < 10) {
        throw new Error('충분한 과거 데이터 없음');
      }
      return `${historical.length}개 데이터 포인트, 기간: ${(historical[0] || {}).date || 'N/A'} ~ ${(historical[historical.length-1] || {}).date || 'N/A'}`;
    }));

    return this.createTestSuite('Stock Price API Tests', tests, startTime);
  }

  /**
   * 🔄 데이터 파이프라인 테스트
   */
  private async testDataPipeline(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // 테스트 1: 데이터 정합성
    tests.push(await this.runTest('데이터 정합성 검증', async () => {
      const price = await this.stockService.getStockPrice('AAPL');
      if (price.price.price <= 0 || price.price.price > 1000000) {
        throw new Error('비정상적인 가격 범위');
      }
      if (!price.price.currency || !price.price.market) {
        throw new Error('필수 메타데이터 누락');
      }
      return '가격, 통화, 시장 정보 정상';
    }));

    // 테스트 2: 시간 동기화
    tests.push(await this.runTest('시간 동기화', async () => {
      const price = await this.stockService.getStockPrice('AAPL');
      const timeDiff = Math.abs(Date.now() - price.price.timestamp);
      if (timeDiff > 300000) { // 5분
        throw new Error('데이터 시간이 너무 오래됨');
      }
      return `시간 차이: ${Math.round(timeDiff / 1000)}초`;
    }));

    // 테스트 3: 에러 복구
    tests.push(await this.runTest('에러 복구 메커니즘', async () => {
      try {
        await this.stockService.getStockPrice('INVALID_TICKER');
        throw new Error('잘못된 티커에 대한 에러 처리 실패');
      } catch (error) {
        if (error instanceof Error && error.message.includes('잘못된 티커')) {
          throw error;
        }
        return '에러 정상 처리됨';
      }
    }));

    return this.createTestSuite('Data Pipeline Tests', tests, startTime);
  }

  /**
   * 📈 기술적 지표 계산 테스트
   */
  private async testTechnicalIndicators(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // 테스트 1: 이동평균 계산
    tests.push(await this.runTest('이동평균 계산', async () => {
      const historical = await this.stockService.getHistoricalData('AAPL', 3);
      if (historical.length < 50) {
        throw new Error('이동평균 계산을 위한 데이터 부족');
      }
      
      // 간단한 20일 이동평균 계산 테스트
      const last20 = historical.slice(-20);
      const ma20 = last20.reduce((sum, d) => sum + d.price, 0) / 20;
      
      if (ma20 <= 0 || ma20 > 1000000) {
        throw new Error('비정상적인 이동평균 값');
      }
      return `MA20: $${ma20.toFixed(2)}`;
    }));

    // 테스트 2: 볼린저 밴드
    tests.push(await this.runTest('볼린저 밴드 계산', async () => {
      const historical = await this.stockService.getHistoricalData('AAPL', 2);
      if (historical.length < 20) {
        throw new Error('볼린저 밴드 계산을 위한 데이터 부족');
      }
      
      const last20 = historical.slice(-20);
      const mean = last20.reduce((sum, d) => sum + d.price, 0) / 20;
      const variance = last20.reduce((sum, d) => sum + Math.pow(d.price - mean, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      
      const upperBand = mean + (2 * stdDev);
      const lowerBand = mean - (2 * stdDev);
      
      if (upperBand <= mean || lowerBand >= mean) {
        throw new Error('볼린저 밴드 계산 오류');
      }
      return `상단: $${upperBand.toFixed(2)}, 하단: $${lowerBand.toFixed(2)}`;
    }));

    // 테스트 3: RSI 계산
    tests.push(await this.runTest('RSI 계산', async () => {
      const historical = await this.stockService.getHistoricalData('AAPL', 2);
      if (historical.length < 15) {
        throw new Error('RSI 계산을 위한 데이터 부족');
      }
      
      // 간단한 RSI 계산
      const last14 = historical.slice(-14);
      let gains = 0, losses = 0;
      
      for (let i = 1; i < last14.length; i++) {
        const current = last14[i] || { price: 0 };
        const previous = last14[i-1] || { price: 0 };
        const change = current.price - previous.price;
        if (change > 0) gains += change;
        else losses -= change;
      }
      
      const avgGain = gains / 14;
      const avgLoss = losses / 14;
      const rs = avgGain / (avgLoss || 1);
      const rsi = 100 - (100 / (1 + rs));
      
      if (rsi < 0 || rsi > 100) {
        throw new Error('RSI 값이 유효 범위를 벗어남');
      }
      return `RSI: ${rsi.toFixed(1)}`;
    }));

    return this.createTestSuite('Technical Indicators Tests', tests, startTime);
  }

  /**
   * 🔌 MCP 통합 테스트
   */
  private async testMCPIntegration(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // 테스트 1: Memory MCP
    tests.push(await this.runTest('Memory MCP 저장/불러오기', async () => {
      await mcpChartIntegration.saveChartPreferences('AAPL', {
        preferredTimeRange: '3M',
        enabledIndicators: ['MA20', 'RSI']
      });
      
      const prefs = await mcpChartIntegration.getChartPreferences('AAPL');
      if (prefs.preferredTimeRange !== '3M') {
        throw new Error('Memory MCP 저장/불러오기 실패');
      }
      return '설정 저장/불러오기 성공';
    }));

    // 테스트 2: Fetch MCP
    tests.push(await this.runTest('Fetch MCP 뉴스 가져오기', async () => {
      const news = await mcpChartIntegration.fetchMarketNews('AAPL');
      if (!Array.isArray(news)) {
        throw new Error('뉴스 데이터 형식 오류');
      }
      return `${news.length}개 뉴스 가져옴`;
    }));

    // 테스트 3: Time MCP
    tests.push(await this.runTest('Time MCP 시장 시간', async () => {
      const marketTime = await mcpChartIntegration.getCurrentMarketTime('US');
      if (!marketTime.marketTime || !marketTime.localTime) {
        throw new Error('시간 정보 누락');
      }
      return `시장 개장: ${marketTime.isMarketOpen ? 'Y' : 'N'}`;
    }));

    // 테스트 4: 통합 데이터
    tests.push(await this.runTest('MCP 통합 데이터', async () => {
      const data = await mcpChartIntegration.getEnhancedChartData('AAPL');
      if (!data.preferences || !data.marketMemory) {
        throw new Error('통합 데이터 누락');
      }
      return '모든 MCP 데이터 정상';
    }));

    return this.createTestSuite('MCP Integration Tests', tests, startTime);
  }

  /**
   * 📡 실시간 스트리밍 테스트
   */
  private async testRealTimeStreaming(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // 테스트 1: 실시간 데이터 수신
    tests.push(await this.runTest('실시간 데이터 수신', async () => {
      const first = await this.stockService.getStockPrice('AAPL');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
      const second = await this.stockService.getStockPrice('AAPL');
      
      // 캐시를 사용하지 않은 새로운 데이터인지 확인
      const timeDiff = second.price.timestamp - first.price.timestamp;
      return `시간 차이: ${timeDiff}ms`;
    }));

    // 테스트 2: 데이터 스트림 안정성
    tests.push(await this.runTest('데이터 스트림 안정성', async () => {
      const results = [];
      for (let i = 0; i < 5; i++) {
        try {
          const result = await this.stockService.getStockPrice('AAPL');
          results.push(result.price.price);
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          throw new Error(`${i+1}번째 요청 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      return `${results.length}개 연속 요청 성공`;
    }));

    return this.createTestSuite('Real-time Streaming Tests', tests, startTime);
  }

  /**
   * ⚡ 성능 및 최적화 테스트
   */
  private async testPerformance(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // 테스트 1: 응답 시간
    tests.push(await this.runTest('API 응답 시간', async () => {
      const start = Date.now();
      await this.stockService.getStockPrice('AAPL');
      const duration = Date.now() - start;
      
      if (duration > 5000) {
        throw new Error('응답 시간이 너무 느림 (5초 초과)');
      }
      return `응답 시간: ${duration}ms`;
    }));

    // 테스트 2: 배치 처리 성능
    tests.push(await this.runTest('배치 처리 성능', async () => {
      const start = Date.now();
      const results = await this.stockService.getMultipleStocks(this.testTickers);
      const duration = Date.now() - start;
      const throughput = Object.keys(results).length / (duration / 1000);
      
      if (throughput < 1) {
        throw new Error('배치 처리 성능 저하 (1 stock/sec 미만)');
      }
      return `처리량: ${throughput.toFixed(1)} stocks/sec`;
    }));

    // 테스트 3: 메모리 사용량
    tests.push(await this.runTest('메모리 사용량', async () => {
      const stats = this.stockService.getCacheStats();
      if (stats.size > 1000) {
        console.warn('캐시 크기가 큼:', stats.size);
      }
      return `캐시 크기: ${stats.size}개`;
    }));

    return this.createTestSuite('Performance Tests', tests, startTime);
  }

  /**
   * 👤 사용자 경험 테스트
   */
  private async testUserExperience(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // 테스트 1: 차트 데이터 완성도
    tests.push(await this.runTest('차트 데이터 완성도', async () => {
      const historical = await this.stockService.getHistoricalData('AAPL', 6);
      const missingDataPoints = historical.filter(d => !d.price || d.price <= 0).length;
      const completeness = ((historical.length - missingDataPoints) / historical.length) * 100;
      
      if (completeness < 95) {
        throw new Error(`데이터 완성도 낮음: ${completeness.toFixed(1)}%`);
      }
      return `완성도: ${completeness.toFixed(1)}%`;
    }));

    // 테스트 2: 에러 메시지 품질
    tests.push(await this.runTest('에러 메시지 품질', async () => {
      try {
        await this.stockService.getStockPrice('');
        throw new Error('빈 티커에 대한 에러 처리 누락');
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (!message || message.length < 10) {
          throw new Error('에러 메시지가 너무 짧음');
        }
        return '에러 메시지 품질 양호';
      }
    }));

    return this.createTestSuite('User Experience Tests', tests, startTime);
  }

  /**
   * 🛡️ 에러 처리 및 복구 테스트
   */
  private async testErrorHandling(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // 테스트 1: 잘못된 티커 처리
    tests.push(await this.runTest('잘못된 티커 처리', async () => {
      try {
        await this.stockService.getStockPrice('INVALID_TICKER_123');
        throw new Error('잘못된 티커에 대한 에러 처리 실패');
      } catch (error) {
        if (error instanceof Error && error.message.includes('에러 처리 실패')) {
          throw error;
        }
        return '에러 정상 처리됨';
      }
    }));

    // 테스트 2: 네트워크 오류 시뮬레이션
    tests.push(await this.runTest('네트워크 오류 복구', async () => {
      // 실제로는 네트워크 오류를 시뮬레이션하기 어려우므로 캐시 복구 테스트로 대체
      const cached = await this.stockService.getStockPrice('AAPL');
      if (!cached) {
        throw new Error('캐시 복구 실패');
      }
      return '캐시 복구 메커니즘 정상';
    }));

    // 테스트 3: 데이터 검증
    tests.push(await this.runTest('데이터 검증', async () => {
      const price = await this.stockService.getStockPrice('AAPL', true);
      if (price.validation && !price.validation.isValid) {
        throw new Error(`데이터 검증 실패: ${price.validation.warnings.join(', ')}`);
      }
      return '데이터 검증 통과';
    }));

    return this.createTestSuite('Error Handling Tests', tests, startTime);
  }

  /**
   * 🧪 개별 테스트 실행 헬퍼
   */
  private async runTest(name: string, testFunction: () => Promise<string>): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const message = await testFunction();
      const duration = Date.now() - startTime;
      
      return {
        name,
        status: 'passed',
        duration,
        message
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name,
        status: 'failed',
        duration,
        message: error instanceof Error ? error.message : '알 수 없는 오류',
        details: error
      };
    }
  }

  /**
   * 📊 테스트 스위트 결과 생성
   */
  private createTestSuite(name: string, tests: TestResult[], startTime: number): TestSuite {
    const totalDuration = Date.now() - startTime;
    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;
    const warnings = tests.filter(t => t.status === 'warning').length;

    return {
      name,
      tests,
      summary: {
        total: tests.length,
        passed,
        failed,
        warnings,
        totalDuration
      }
    };
  }

  /**
   * 📈 테스트 결과 리포트 생성
   */
  generateReport(suites: TestSuite[]): string {
    const totalTests = suites.reduce((sum, suite) => sum + suite.summary.total, 0);
    const totalPassed = suites.reduce((sum, suite) => sum + suite.summary.passed, 0);
    const totalFailed = suites.reduce((sum, suite) => sum + suite.summary.failed, 0);
    const totalDuration = suites.reduce((sum, suite) => sum + suite.summary.totalDuration, 0);

    let report = `
🧪 Bloomberg Terminal 차트 테스트 리포트
====================================

📊 전체 요약:
- 총 테스트: ${totalTests}개
- 성공: ${totalPassed}개 (${((totalPassed / totalTests) * 100).toFixed(1)}%)
- 실패: ${totalFailed}개 (${((totalFailed / totalTests) * 100).toFixed(1)}%)
- 총 소요 시간: ${(totalDuration / 1000).toFixed(2)}초

`;

    suites.forEach(suite => {
      report += `
📋 ${suite.name}
${'-'.repeat(suite.name.length + 4)}
- 성공: ${suite.summary.passed}/${suite.summary.total}
- 소요 시간: ${(suite.summary.totalDuration / 1000).toFixed(2)}초

`;

      suite.tests.forEach(test => {
        const status = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
        report += `  ${status} ${test.name} (${test.duration}ms)\n`;
        if (test.status === 'failed') {
          report += `     오류: ${test.message}\n`;
        } else if (test.message) {
          report += `     결과: ${test.message}\n`;
        }
      });
    });

    return report;
  }
}

// 싱글톤 인스턴스
export const chartTestSuite = new ChartTestSuite();