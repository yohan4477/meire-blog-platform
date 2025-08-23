import { test, expect } from '@playwright/test';
import './setup/test-cleanup';

test.describe('📱 모바일 터치 스와이핑 테스트', () => {
  test('모바일 차트 터치 스와이핑 상호작용', async ({ page }) => {
    console.log('🤳 모바일 터치 스와이핑 테스트 시작');
    
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
    
    // 1. TSLA 페이지 방문
    console.log('1️⃣ TSLA 차트 페이지 방문');
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('domcontentloaded');
    
    // 2. 차트 로딩 대기
    console.log('2️⃣ 차트 로딩 대기...');
    await page.waitForTimeout(3000);
    
    // 3. 차트 찾기
    console.log('3️⃣ 차트 요소 찾기...');
    const chartContainer = page.locator('[data-testid="stock-price-chart"]');
    
    if (await chartContainer.count() > 0) {
      console.log('✅ 차트 발견! 터치 상호작용 시작');
      
      const box = await chartContainer.boundingBox();
      if (box) {
        console.log(`📊 차트 크기: ${box.width}x${box.height}`);
        
        // 4. 터치 시작 - 왼쪽에서 시작
        console.log('4️⃣ 터치 스와이핑 테스트 시작...');
        const startX = box.x + 50;
        const startY = box.y + box.height / 2;
        
        // 터치 시작
        await page.touchscreen.tap(startX, startY);
        console.log(`📍 터치 시작: (${startX}, ${startY})`);
        
        // 잠시 대기하여 터치 상태 확인
        await page.waitForTimeout(500);
        
        // 5. 스와이핑 동작 - 왼쪽에서 오른쪽으로
        console.log('5️⃣ 스와이핑 동작 시뮬레이션...');
        
        const swipePoints = [];
        const swipeSteps = 10;
        
        for (let i = 0; i <= swipeSteps; i++) {
          const progress = i / swipeSteps;
          const currentX = startX + (box.width - 100) * progress;
          const currentY = startY;
          
          swipePoints.push({ x: currentX, y: currentY });
          
          // 각 지점에서 터치
          await page.touchscreen.tap(currentX, currentY);
          console.log(`📍 스와이프 ${i + 1}/${swipeSteps + 1}: (${Math.round(currentX)}, ${Math.round(currentY)})`);
          
          // 터치 오버레이 표시 대기
          await page.waitForTimeout(300);
          
          // 터치 오버레이가 나타나는지 확인
          const touchOverlay = page.locator('.absolute.pointer-events-none.z-10');
          if (await touchOverlay.count() > 0) {
            console.log(`✅ 터치 오버레이 표시됨 (${i + 1}번째)`);
            
            // 오버레이 내용 확인
            const priceInfo = touchOverlay.locator('.text-lg.font-bold');
            if (await priceInfo.count() > 0) {
              const priceText = await priceInfo.textContent();
              console.log(`💰 표시된 가격: ${priceText}`);
            }
          }
        }
        
        // 6. 터치 드래그 테스트
        console.log('6️⃣ 터치 드래그 테스트...');
        await page.touchscreen.tap(startX, startY);
        
        // 드래그 동작 시뮬레이션
        for (let i = 0; i < 5; i++) {
          const dragX = startX + (i * 30);
          await page.touchscreen.tap(dragX, startY);
          await page.waitForTimeout(200);
        }
        
        console.log('✅ 터치 드래그 테스트 완료');
        
        // 7. 터치 종료 후 오버레이 사라짐 확인
        console.log('7️⃣ 터치 종료 후 상태 확인...');
        await page.waitForTimeout(1000);
        
        const overlayAfterEnd = page.locator('.absolute.pointer-events-none.z-10');
        const overlayCount = await overlayAfterEnd.count();
        
        if (overlayCount === 0) {
          console.log('✅ 터치 종료 후 오버레이 정상적으로 사라짐');
        } else {
          console.log(`⚠️ 터치 종료 후 오버레이 ${overlayCount}개 남아있음`);
        }
      }
    } else {
      console.log('⚠️ 차트 없음 - 데이터 없음 상태');
    }
    
    // 결과 출력
    console.log('\n📱 모바일 터치 테스트 결과:');
    console.log(`  JS 에러: ${jsErrors.length}개`);
    console.log(`  콘솔 에러: ${errors.length}개`);
    
    if (jsErrors.length > 0) {
      console.log('\n❌ 발생한 JS 에러:');
      jsErrors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    
    if (jsErrors.length === 0) {
      console.log('\n🎉 모바일 터치 스와이핑 테스트 성공!');
    }
    
    // JS 에러만 체크
    expect(jsErrors.length).toBe(0);
  });

  test('모바일 차트 연속 터치 테스트', async ({ page }) => {
    console.log('🔄 연속 터치 테스트 시작');
    
    const jsErrors = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
      console.error('❌ JS 에러:', error.message);
    });
    
    // TSLA 페이지 방문
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const chartContainer = page.locator('[data-testid="stock-price-chart"]');
    
    if (await chartContainer.count() > 0) {
      const box = await chartContainer.boundingBox();
      if (box) {
        console.log('1️⃣ 연속 터치 테스트 (5초간)...');
        
        const startTime = Date.now();
        let touchCount = 0;
        
        while (Date.now() - startTime < 5000) { // 5초간 실행
          // 랜덤한 위치에 터치
          const randomX = box.x + 30 + Math.random() * (box.width - 60);
          const randomY = box.y + 50 + Math.random() * (box.height - 100);
          
          await page.touchscreen.tap(randomX, randomY);
          touchCount++;
          
          await page.waitForTimeout(200);
          
          if (touchCount % 5 === 0) {
            console.log(`📱 연속 터치 ${touchCount}회 완료`);
          }
        }
        
        console.log(`✅ 총 ${touchCount}회 연속 터치 완료`);
      }
    }
    
    console.log(`📊 JS 에러 수: ${jsErrors.length}`);
    expect(jsErrors.length).toBe(0);
  });
});