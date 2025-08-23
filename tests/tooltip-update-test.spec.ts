import { test, expect } from '@playwright/test';
import './setup/test-cleanup';

test.describe('Chart Tooltip Update Test', () => {
  test('should verify removal of investment perspective and mery mention sections from tooltip', async ({ page }) => {
    // 테슬라 페이지로 이동
    await page.goto('http://localhost:3006/merry/stocks/TSLA');
    
    // 차트가 로딩될 때까지 대기
    await page.waitForSelector('svg', { timeout: 10000 });
    
    // 차트 마커들이 렌더링될 때까지 대기
    await page.waitForTimeout(3000);
    
    // 감정 분석 마커 찾기 (빈 원)
    const markers = await page.locator('circle[fill="none"][stroke-width="3"]');
    const markerCount = await markers.count();
    
    console.log(`Found ${markerCount} sentiment markers on chart`);
    
    if (markerCount > 0) {
      // 첫 번째 마커에 호버하여 툴팁 표시
      await markers.first().hover();
      
      // 툴팁이 표시될 때까지 대기
      await page.waitForTimeout(500);
      
      // 툴팁 요소 확인
      const tooltip = page.locator('div:has-text("메르 감정 분석")').first();
      await expect(tooltip).toBeVisible();
      
      // 핵심 근거 섹션이 있는지 확인 (유지되어야 함)
      const keyReasoning = page.locator('text=핵심 근거:');
      if (await keyReasoning.count() > 0) {
        console.log('✅ Key reasoning section is present (expected)');
      }
      
      // 지지 증거 섹션이 있는지 확인 (유지되어야 함)
      const supportingEvidence = page.locator('text=지지 증거:');
      if (await supportingEvidence.count() > 0) {
        console.log('✅ Supporting evidence section is present (expected)');
      }
      
      // 투자 기간 및 확신도 섹션이 있는지 확인 (유지되어야 함)
      const timeframeConfidence = page.locator('text=기간:, text=확신:');
      if (await timeframeConfidence.count() > 0) {
        console.log('✅ Timeframe and confidence sections are present (expected)');
      }
      
      // **제거되어야 할 섹션들 검증**
      
      // 1. "투자 관점" 섹션이 제거되었는지 확인
      const investmentPerspective = page.locator('text=투자 관점:');
      const perspectiveCount = await investmentPerspective.count();
      expect(perspectiveCount).toBe(0);
      console.log(`✅ Investment perspective section removed (found ${perspectiveCount} instances)`);
      
      // 2. "메르 언급" 섹션이 제거되었는지 확인
      const meryMention = page.locator('text=메르 언급:');
      const mentionCount = await meryMention.count();
      expect(mentionCount).toBe(0);
      console.log(`✅ Mery mention section removed (found ${mentionCount} instances)`);
      
      // 3. 투자 관점 관련 아이콘 제거 확인
      const perspectiveIcon = page.locator('text=📈');
      const iconCount = await perspectiveIcon.count();
      console.log(`📈 투자 관점 아이콘 개수: ${iconCount}`);
      
      // 4. 메르 언급 관련 아이콘 제거 확인  
      const mentionIcon = page.locator('text=📝');
      const mentionIconCount = await mentionIcon.count();
      console.log(`📝 메르 언급 아이콘 개수: ${mentionIconCount} (관련 포스트 섹션에는 여전히 존재 가능)`);
      
      // 툴팁 내용 전체 캡처하여 로깅
      const tooltipContent = await tooltip.textContent();
      console.log('Tooltip content:', tooltipContent);
      
    } else {
      console.log('⚠️ No sentiment markers found - testing with any available marker');
      
      // 대안: 모든 차트 마커 확인
      const allMarkers = await page.locator('circle').count();
      console.log(`Found ${allMarkers} total markers on chart`);
      
      if (allMarkers > 0) {
        // 아무 마커나 호버해서 툴팁 확인
        await page.locator('circle').first().hover();
        await page.waitForTimeout(500);
      }
    }
  });
  
  test('should verify tooltip sections content after removal', async ({ page }) => {
    await page.goto('http://localhost:3006/merry/stocks/TSLA');
    
    // 차트 로딩 대기
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // 마커 호버
    const markers = await page.locator('circle[fill="none"]');
    if (await markers.count() > 0) {
      await markers.first().hover();
      await page.waitForTimeout(500);
      
      // 남아있어야 할 섹션들 확인
      const expectedSections = [
        '메르 감정 분석',
        '핵심 근거:',
        '지지 증거:',
        '신뢰도'
      ];
      
      for (const section of expectedSections) {
        const element = page.locator(`text=${section}`);
        const count = await element.count();
        if (count > 0) {
          console.log(`✅ Expected section "${section}" is present`);
        } else {
          console.log(`⚠️ Expected section "${section}" not found`);
        }
      }
      
      // 제거되어야 할 섹션들 재확인
      const removedSections = [
        '투자 관점:',
        '메르 언급:'
      ];
      
      for (const section of removedSections) {
        const element = page.locator(`text=${section}`);
        const count = await element.count();
        expect(count).toBe(0);
        console.log(`✅ Removed section "${section}" not found (${count} instances)`);
      }
    }
  });
});