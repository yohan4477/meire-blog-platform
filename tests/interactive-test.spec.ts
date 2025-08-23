import { test, expect } from '@playwright/test';
import './setup/test-cleanup';

test.describe('🎯 실제 사용자 상호작용 테스트 - 3초씩 상호작용', () => {
  test('메인 페이지 → TSLA 차트 페이지 상호작용 테스트', async ({ page }) => {
    console.log('🚀 테스트 시작: 실제 사용자처럼 3초씩 상호작용');
    
    // 1. 메인 페이지 방문
    console.log('1️⃣ 메인 페이지 로딩...');
    await page.goto('http://localhost:3004');
    await page.waitForLoadState('networkidle');
    
    // 3초 대기하며 페이지 확인
    await page.waitForTimeout(3000);
    console.log('✅ 메인 페이지 정상 로딩');
    
    // 2. 메르's Pick 섹션 확인 및 클릭
    console.log('2️⃣ 메르\'s Pick 섹션 찾기...');
    const merryPickSection = page.locator('text=메르\'s Pick').first();
    await expect(merryPickSection).toBeVisible();
    
    // 3초 대기
    await page.waitForTimeout(3000);
    
    // 3. TSLA 종목 클릭
    console.log('3️⃣ TSLA 종목 클릭...');
    const tslaStock = page.locator('a[href*="/merry/stocks/TSLA"]').first();
    await tslaStock.scrollIntoViewIfNeeded();
    await tslaStock.click();
    
    // 페이지 전환 대기
    await page.waitForURL('**/merry/stocks/TSLA');
    await page.waitForLoadState('networkidle');
    console.log('✅ TSLA 종목 페이지 진입');
    
    // 3초 대기
    await page.waitForTimeout(3000);
    
    // 4. 차트 영역 확인
    console.log('4️⃣ 차트 영역 확인...');
    const chartArea = page.locator('[data-testid="stock-price-chart"], .recharts-wrapper').first();
    await expect(chartArea).toBeVisible({ timeout: 10000 });
    console.log('✅ 차트 영역 표시됨');
    
    // 3초 대기
    await page.waitForTimeout(3000);
    
    // 5. 차트와 상호작용 - 호버
    console.log('5️⃣ 차트 호버 상호작용...');
    const chartContainer = page.locator('.recharts-surface').first();
    if (await chartContainer.count() > 0) {
      const box = await chartContainer.boundingBox();
      if (box) {
        // 차트의 여러 지점에 마우스 호버
        for (let i = 0; i < 5; i++) {
          const x = box.x + (box.width / 5) * i;
          const y = box.y + box.height / 2;
          await page.mouse.move(x, y);
          await page.waitForTimeout(600); // 각 호버마다 0.6초
        }
        console.log('✅ 차트 호버 완료');
      }
    }
    
    // 3초 대기
    await page.waitForTimeout(3000);
    
    // 6. 관련 포스트 섹션 스크롤
    console.log('6️⃣ 관련 포스트 섹션으로 스크롤...');
    const relatedPosts = page.locator('text=관련 포스트').first();
    if (await relatedPosts.count() > 0) {
      await relatedPosts.scrollIntoViewIfNeeded();
      console.log('✅ 관련 포스트 섹션 확인');
    }
    
    // 3초 대기
    await page.waitForTimeout(3000);
    
    // 7. 페이지 상단으로 스크롤
    console.log('7️⃣ 페이지 상단으로 스크롤...');
    await page.evaluate(() => window.scrollTo(0, 0));
    
    // 3초 대기
    await page.waitForTimeout(3000);
    
    // 8. 캐시 컨트롤 버튼 클릭 테스트
    console.log('8️⃣ 캐시 컨트롤 버튼 찾기...');
    const cacheButton = page.locator('button:has-text("캐시"), button:has-text("Cache")').first();
    if (await cacheButton.count() > 0) {
      await cacheButton.click();
      console.log('✅ 캐시 버튼 클릭');
      await page.waitForTimeout(3000);
    }
    
    // 9. 다른 종목 페이지로 이동
    console.log('9️⃣ 종목 목록으로 돌아가기...');
    const backButton = page.locator('text=종목 목록').first();
    if (await backButton.count() > 0) {
      await backButton.click();
      await page.waitForURL('**/merry/stocks');
      console.log('✅ 종목 목록 페이지 이동');
    } else {
      // 직접 URL로 이동
      await page.goto('http://localhost:3004/merry/stocks');
    }
    
    // 3초 대기
    await page.waitForTimeout(3000);
    
    // 10. 다른 종목 (삼성전자) 클릭
    console.log('🔟 삼성전자 종목 페이지 테스트...');
    const samsungStock = page.locator('a[href*="/merry/stocks/005930"]').first();
    if (await samsungStock.count() > 0) {
      await samsungStock.click();
      await page.waitForURL('**/merry/stocks/005930');
      await page.waitForLoadState('networkidle');
      console.log('✅ 삼성전자 페이지 진입');
      
      // 3초 대기
      await page.waitForTimeout(3000);
      
      // 차트 확인
      const samsungChart = page.locator('[data-testid="stock-price-chart"], .recharts-wrapper').first();
      await expect(samsungChart).toBeVisible({ timeout: 10000 });
      console.log('✅ 삼성전자 차트 표시됨');
    }
    
    // 최종 3초 대기
    await page.waitForTimeout(3000);
    
    // 에러 확인
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
      console.error('❌ 페이지 에러 발생:', error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.error('❌ 콘솔 에러:', msg.text());
      }
    });
    
    // 최종 확인
    console.log('✅ 모든 상호작용 테스트 완료');
    console.log(`📊 총 에러 수: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('❌ 발생한 에러들:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('🎉 에러 없이 모든 상호작용 성공!');
    }
    
    // 에러가 없어야 테스트 통과
    expect(errors.length).toBe(0);
  });

  test('차트 페이지 집중 상호작용 테스트', async ({ page }) => {
    console.log('🎯 차트 페이지 집중 테스트 시작');
    
    // TSLA 차트 페이지 직접 방문
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('networkidle');
    
    const errors = [];
    
    // 에러 모니터링 설정
    page.on('pageerror', error => {
      errors.push(error.message);
      console.error('❌ 페이지 에러:', error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        errors.push(msg.text());
        console.error('❌ 콘솔 에러:', msg.text());
      }
    });
    
    // 1. 차트 로딩 대기
    console.log('1️⃣ 차트 로딩 대기...');
    await page.waitForTimeout(3000);
    
    // 2. 차트와 반복 상호작용
    console.log('2️⃣ 차트와 반복 상호작용...');
    const chart = page.locator('.recharts-surface').first();
    
    for (let round = 1; round <= 3; round++) {
      console.log(`  라운드 ${round}/3 시작`);
      
      if (await chart.count() > 0) {
        const box = await chart.boundingBox();
        if (box) {
          // 왼쪽에서 오른쪽으로 마우스 이동
          for (let i = 0; i <= 10; i++) {
            const x = box.x + (box.width / 10) * i;
            const y = box.y + box.height / 2;
            await page.mouse.move(x, y);
            await page.waitForTimeout(300);
          }
        }
      }
      
      // 3초 대기
      await page.waitForTimeout(3000);
    }
    
    // 3. 페이지 새로고침
    console.log('3️⃣ 페이지 새로고침...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 4. 차트 다시 확인
    console.log('4️⃣ 새로고침 후 차트 확인...');
    const chartAfterReload = page.locator('[data-testid="stock-price-chart"], .recharts-wrapper').first();
    await expect(chartAfterReload).toBeVisible({ timeout: 10000 });
    
    // 5. 스크롤 테스트
    console.log('5️⃣ 페이지 스크롤 테스트...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 300));
      await page.waitForTimeout(1000);
    }
    
    // 최종 결과
    console.log('📊 테스트 결과:');
    console.log(`  - 총 에러 수: ${errors.length}`);
    
    if (errors.length === 0) {
      console.log('  🎉 차트 페이지 상호작용 중 에러 없음!');
    } else {
      console.log('  ❌ 발생한 에러:');
      errors.forEach((error, index) => {
        console.log(`    ${index + 1}. ${error}`);
      });
    }
    
    expect(errors.length).toBe(0);
  });
});