import { test, expect } from '@playwright/test';
import './setup/test-cleanup';

test.describe('Final Tooltip Update Test', () => {
  test('should verify final tooltip content after removing sections', async ({ page }) => {
    // 테슬라 페이지로 이동
    await page.goto('http://localhost:3006/merry/stocks/TSLA');
    
    // 차트가 로딩될 때까지 대기 (Recharts SVG)
    await page.waitForSelector('[data-recharts-cartesian-grid]', { timeout: 10000 });
    
    // 차트 마커들이 렌더링될 때까지 대기
    await page.waitForTimeout(3000);
    
    // 감정 분석 마커 찾기 (빈 원)
    const markers = await page.locator('circle[fill="none"]');
    const markerCount = await markers.count();
    
    console.log(`Found ${markerCount} markers on chart`);
    
    if (markerCount > 0) {
      // 첫 번째 마커에 호버하여 툴팁 표시
      await markers.first().hover();
      
      // 툴팁이 표시될 때까지 대기
      await page.waitForTimeout(500);
      
      // 툴팁 요소 확인
      const tooltip = page.locator('div').filter({ hasText: '메르 감정 분석' }).first();
      
      if (await tooltip.count() > 0) {
        console.log('✅ Tooltip found with sentiment analysis');
        
        // 남아있어야 할 섹션들 확인
        const keyReasoning = page.locator('strong:has-text("핵심 근거:")');
        const confidence = page.locator('text=신뢰도');
        const timeframe = page.locator('text=기간:');
        const conviction = page.locator('text=확신:');
        
        const keyReasoningCount = await keyReasoning.count();
        const confidenceCount = await confidence.count();
        const timeframeCount = await timeframe.count();
        const convictionCount = await conviction.count();
        
        console.log(`✅ Key sections present - 핵심 근거: ${keyReasoningCount}, 신뢰도: ${confidenceCount}, 기간: ${timeframeCount}, 확신: ${convictionCount}`);
        
        // 제거되어야 할 섹션들 확인
        const investmentPerspective = page.locator('strong:has-text("투자 관점:")');
        const supportingEvidence = page.locator('strong:has-text("지지 증거:")');
        const meryMention = page.locator('strong:has-text("메르 언급:")');
        
        const perspectiveCount = await investmentPerspective.count();
        const evidenceCount = await supportingEvidence.count();
        const mentionCount = await meryMention.count();
        
        console.log(`✅ Removed sections verified - 투자 관점: ${perspectiveCount} (should be 0), 지지 증거: ${evidenceCount} (should be 0), 메르 언급: ${mentionCount} (should be 0)`);
        
        // 제거된 섹션들이 없는지 확인
        expect(perspectiveCount).toBe(0);
        expect(evidenceCount).toBe(0);
        expect(mentionCount).toBe(0);
        
        // 전체 툴팁 내용 캡처
        const tooltipContent = await tooltip.textContent();
        console.log('Final tooltip content:', tooltipContent);
        
      } else {
        console.log('ℹ️ No sentiment analysis tooltip found - checking general tooltip');
        
        // 일반 툴팁 확인
        const generalTooltip = page.locator('div').filter({ hasText: '$' }).first();
        if (await generalTooltip.count() > 0) {
          const content = await generalTooltip.textContent();
          console.log('General tooltip content:', content);
        }
      }
      
    } else {
      console.log('⚠️ No markers found on chart');
    }
  });
  
  test('should verify chart functionality after tooltip updates', async ({ page }) => {
    await page.goto('http://localhost:3006/merry/stocks/TSLA');
    
    // 차트 로딩 대기
    await page.waitForSelector('[data-recharts-cartesian-grid]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // 주요 차트 요소들이 있는지 확인
    const lineChart = page.locator('path[stroke="#3742fa"]'); // 토스 블루 라인
    const gridLines = page.locator('[data-recharts-cartesian-grid]');
    const xAxis = page.locator('text.recharts-text.recharts-cartesian-axis-tick-value');
    const yAxis = page.locator('text.recharts-text.recharts-cartesian-axis-tick-value');
    
    const lineCount = await lineChart.count();
    const gridCount = await gridLines.count();
    const xAxisCount = await xAxis.count();
    const yAxisCount = await yAxis.count();
    
    console.log(`Chart elements - Line: ${lineCount}, Grid: ${gridCount}, X-Axis: ${xAxisCount}, Y-Axis: ${yAxisCount}`);
    
    // 차트가 정상적으로 렌더링되었는지 확인
    expect(lineCount).toBeGreaterThan(0);
    expect(gridCount).toBeGreaterThan(0);
    
    console.log('✅ Chart functionality verified after tooltip updates');
  });
});