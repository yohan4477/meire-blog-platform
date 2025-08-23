import { test, expect } from '@playwright/test';
import './setup/test-cleanup';

test.describe('📊 차트 클릭 상호작용 테스트 - 3초간 테스트', () => {
  test('차트 마커 클릭 및 상호작용 테스트', async ({ page }) => {
    console.log('🚀 차트 클릭 테스트 시작 - 3초간 집중 상호작용');
    
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
    await page.waitForTimeout(2000);
    
    // 3. 차트 찾기
    console.log('3️⃣ 차트 요소 찾기...');
    const chart = page.locator('.recharts-surface').first();
    
    if (await chart.count() > 0) {
      console.log('✅ 차트 발견! 상호작용 시작');
      
      // 4. 차트 영역 확인
      const box = await chart.boundingBox();
      if (box) {
        console.log(`📊 차트 크기: ${box.width}x${box.height}`);
        
        // 5. 차트 클릭 테스트 - 3초간 여러 지점 클릭
        console.log('4️⃣ 차트 클릭 테스트 시작 (3초간)...');
        
        const startTime = Date.now();
        let clickCount = 0;
        
        while (Date.now() - startTime < 3000) { // 3초간 실행
          // 랜덤한 위치에 클릭
          const randomX = box.x + Math.random() * box.width;
          const randomY = box.y + (box.height * 0.3) + Math.random() * (box.height * 0.4);
          
          await page.mouse.click(randomX, randomY);
          clickCount++;
          
          // 클릭 후 잠시 대기
          await page.waitForTimeout(200);
          
          console.log(`📍 클릭 ${clickCount}: (${Math.round(randomX)}, ${Math.round(randomY)})`);
        }
        
        console.log(`✅ 총 ${clickCount}번 클릭 완료`);
        
        // 6. 마커 요소 확인
        console.log('5️⃣ 차트 마커 확인...');
        const markers = page.locator('circle[stroke], .recharts-dot');
        const markerCount = await markers.count();
        console.log(`📊 발견된 마커 개수: ${markerCount}개`);
        
        if (markerCount > 0) {
          // 첫 번째 마커에 호버 및 클릭
          console.log('6️⃣ 마커 호버 및 클릭 테스트...');
          const firstMarker = markers.first();
          
          await firstMarker.hover();
          await page.waitForTimeout(500);
          
          await firstMarker.click();
          await page.waitForTimeout(500);
          
          // 툴팁 또는 정보 표시 확인
          const tooltip = page.locator('.recharts-tooltip, [role="tooltip"]');
          if (await tooltip.count() > 0) {
            console.log('✅ 툴팁 표시 확인');
          }
        }
        
        // 7. 차트 드래그 테스트
        console.log('7️⃣ 차트 드래그 테스트...');
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        
        await page.mouse.move(centerX - 100, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 100, centerY, { steps: 5 });
        await page.mouse.up();
        
        console.log('✅ 드래그 테스트 완료');
      }
    } else {
      console.log('⚠️ 차트 없음 - 데이터 없음 메시지 확인');
      const noDataMessage = page.locator('text=가격 정보 없음, text=데이터 없음, text=차트 로딩');
      if (await noDataMessage.count() > 0) {
        console.log('✅ 데이터 없음 메시지 확인됨');
      }
    }
    
    // 8. 최종 대기 및 상태 확인
    console.log('8️⃣ 최종 상태 확인...');
    await page.waitForTimeout(1000);
    
    // 9. Sheet 컴포넌트가 나타나지 않는지 확인
    console.log('9️⃣ Sheet 컴포넌트 제거 확인...');
    const sheetComponent = page.locator('[data-state="open"], .sheet, [role="dialog"]');
    const sheetCount = await sheetComponent.count();
    
    if (sheetCount === 0) {
      console.log('✅ Sheet 컴포넌트 없음 - 제거 성공!');
    } else {
      console.log(`⚠️ Sheet 컴포넌트 ${sheetCount}개 발견`);
    }
    
    // 결과 출력
    console.log('\n📊 차트 클릭 테스트 결과:');
    console.log(`  JS 에러: ${jsErrors.length}개`);
    console.log(`  콘솔 에러: ${errors.length}개`);
    console.log(`  Sheet 컴포넌트: ${sheetCount}개 (0개가 정상)`);
    
    if (jsErrors.length > 0) {
      console.log('\n❌ 발생한 JS 에러:');
      jsErrors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    
    if (errors.length > 0) {
      console.log('\n⚠️ 콘솔 메시지:');
      errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    
    if (jsErrors.length === 0 && sheetCount === 0) {
      console.log('\n🎉 차트 클릭 테스트 성공! Sheet 제거 확인됨!');
    }
    
    // JS 에러만 체크 (Sheet 컴포넌트는 경고만)
    expect(jsErrors.length).toBe(0);
  });

  test('차트 상세 상호작용 - 호버 및 클릭 분리 테스트', async ({ page }) => {
    console.log('🎯 차트 호버/클릭 분리 테스트 시작');
    
    const jsErrors = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
      console.error('❌ JS 에러:', error.message);
    });
    
    // TSLA 페이지 방문
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const chart = page.locator('.recharts-surface').first();
    
    if (await chart.count() > 0) {
      const box = await chart.boundingBox();
      if (box) {
        console.log('1️⃣ 호버 테스트 (1.5초)...');
        
        // 호버 테스트 - 1.5초간
        const hoverStartTime = Date.now();
        while (Date.now() - hoverStartTime < 1500) {
          const randomX = box.x + Math.random() * box.width;
          const randomY = box.y + (box.height * 0.3) + Math.random() * (box.height * 0.4);
          
          await page.mouse.move(randomX, randomY);
          await page.waitForTimeout(100);
        }
        
        console.log('2️⃣ 클릭 테스트 (1.5초)...');
        
        // 클릭 테스트 - 1.5초간
        const clickStartTime = Date.now();
        let clickCount = 0;
        
        while (Date.now() - clickStartTime < 1500) {
          const randomX = box.x + Math.random() * box.width;
          const randomY = box.y + (box.height * 0.3) + Math.random() * (box.height * 0.4);
          
          await page.mouse.click(randomX, randomY);
          clickCount++;
          await page.waitForTimeout(150);
        }
        
        console.log(`✅ 호버/클릭 테스트 완료 - ${clickCount}번 클릭`);
      }
    }
    
    console.log(`📊 JS 에러 수: ${jsErrors.length}`);
    expect(jsErrors.length).toBe(0);
  });
});