/**
 * 🧪 Bloomberg Terminal 차트 테스트 실행 스크립트
 * 터미널에서 직접 실행하여 차트 시스템을 종합적으로 테스트
 */

import { chartTestSuite } from '../tests/chart-test-suite';

async function runChartTests() {
  console.log('🚀 Bloomberg Terminal 차트 테스트 시작...\n');
  
  try {
    const startTime = Date.now();
    
    // 전체 테스트 스위트 실행
    const results = await chartTestSuite.runFullTestSuite();
    
    const totalTime = Date.now() - startTime;
    
    // 결과 리포트 생성 및 출력
    const report = chartTestSuite.generateReport(results);
    console.log(report);
    
    // 요약 통계
    const totalTests = results.reduce((sum, suite) => sum + suite.summary.total, 0);
    const totalPassed = results.reduce((sum, suite) => sum + suite.summary.passed, 0);
    const totalFailed = results.reduce((sum, suite) => sum + suite.summary.failed, 0);
    
    console.log(`\n🎯 최종 결과:`);
    console.log(`   전체 소요 시간: ${(totalTime / 1000).toFixed(2)}초`);
    console.log(`   성공률: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    
    if (totalFailed === 0) {
      console.log(`\n🎉 모든 테스트 통과! Bloomberg Terminal 차트 시스템이 완벽하게 작동합니다.`);
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${totalFailed}개 테스트 실패. 문제를 해결한 후 다시 실행해주세요.`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 테스트 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  runChartTests();
}

export default runChartTests;