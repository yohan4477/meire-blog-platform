import { test, expect } from '@playwright/test';

test.describe('🔥 빠른 상호작용 테스트', () => {
  test('실제 사용자처럼 차트 조작하기', async ({ page }) => {
    console.log('🚀 빠른 상호작용 테스트 시작');
    
    const errors = [];
    const jsErrors = [];
    
    // 에러 모니터링
    page.on('pageerror', error => {
      jsErrors.push(error.message);
      console.error('❌ JS 에러:', error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        errors.push(msg.text());
        console.error('❌ 콘솔 에러:', msg.text());
      }
    });
    
    // 1. TSLA 페이지 바로 가기
    console.log('1️⃣ TSLA 페이지 방문');
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('domcontentloaded');
    
    // 2. 1초 대기
    await page.waitForTimeout(1000);
    
    // 3. 차트 찾기
    console.log('2️⃣ 차트 찾기...');
    const chart = page.locator('.recharts-surface').first();
    
    if (await chart.count() > 0) {
      console.log('✅ 차트 발견!');
      
      // 4. 차트 호버 - 3초 동안 여러 지점
      console.log('3️⃣ 차트 호버 시작...');
      const box = await chart.boundingBox();
      if (box) {
        for (let i = 0; i < 6; i++) {
          const x = box.x + (box.width / 6) * i;
          const y = box.y + box.height / 2;
          await page.mouse.move(x, y);
          await page.waitForTimeout(500); // 0.5초씩 = 총 3초
        }
        console.log('✅ 차트 호버 완료');
      }
    } else {
      console.log('⚠️ 차트 없음 - "가격 정보 없음" 메시지 확인');
      const noDataMessage = page.locator('text=가격 정보 없음');
      if (await noDataMessage.count() > 0) {
        console.log('✅ "가격 정보 없음" 메시지 확인됨');
      }
    }
    
    // 5. 페이지 스크롤
    console.log('4️⃣ 페이지 스크롤...');
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(1000);
    
    // 6. 상단으로 다시 스크롤
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    
    // 7. 페이지 새로고침
    console.log('5️⃣ 페이지 새로고침...');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 8. 다시 차트 확인
    console.log('6️⃣ 새로고침 후 차트 재확인...');
    const chartAfterReload = page.locator('.recharts-surface, [data-testid="stock-price-chart"]').first();
    
    if (await chartAfterReload.count() > 0) {
      console.log('✅ 새로고침 후에도 차트 정상');
    } else {
      console.log('ℹ️ 차트 대신 "정보 없음" 메시지 표시');
    }
    
    // 결과 출력
    console.log('\n📊 테스트 결과:');
    console.log(`  JS 에러: ${jsErrors.length}개`);
    console.log(`  콘솔 에러: ${errors.length}개`);
    
    if (jsErrors.length > 0) {
      console.log('\n❌ 발생한 JS 에러:');
      jsErrors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    
    if (errors.length > 0) {
      console.log('\n⚠️ 콘솔 메시지:');
      errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    
    if (jsErrors.length === 0) {
      console.log('\n🎉 차트 조작 중 JavaScript 에러 없음!');
    }
    
    // JS 에러만 체크 (콘솔 경고는 허용)
    expect(jsErrors.length).toBe(0);
  });

  test('여러 페이지 빠른 네비게이션', async ({ page }) => {
    console.log('🔄 페이지 네비게이션 테스트');
    
    const jsErrors = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
      console.error('❌ JS 에러:', error.message);
    });
    
    // 1. 메인 페이지
    console.log('1️⃣ 메인 페이지...');
    await page.goto('http://localhost:3004');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    
    // 2. TSLA 페이지
    console.log('2️⃣ TSLA 페이지...');
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    
    // 3. 삼성전자 페이지
    console.log('3️⃣ 삼성전자 페이지...');
    await page.goto('http://localhost:3004/merry/stocks/005930');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    
    // 4. 종목 목록 페이지
    console.log('4️⃣ 종목 목록 페이지...');
    await page.goto('http://localhost:3004/merry/stocks');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    
    // 5. 다시 메인 페이지
    console.log('5️⃣ 다시 메인 페이지...');
    await page.goto('http://localhost:3004');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    
    console.log(`📊 네비게이션 완료 - JS 에러: ${jsErrors.length}개`);
    
    if (jsErrors.length === 0) {
      console.log('🎉 페이지 네비게이션 중 JavaScript 에러 없음!');
    } else {
      jsErrors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    
    expect(jsErrors.length).toBe(0);
  });
});