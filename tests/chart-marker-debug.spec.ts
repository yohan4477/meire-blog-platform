import { test, expect } from '@playwright/test';
import './setup/test-cleanup';

test('Multiple Stocks Chart Marker Debug Test', async ({ page }) => {
  const stocks = ['TSLA', '005930', 'AAPL', 'NVDA'];
  
  for (const ticker of stocks) {
    console.log(`\n🚀 Starting ${ticker} chart marker analysis...`);
    
    // Navigate to stock chart page
    await page.goto(`http://localhost:3004/merry/stocks/${ticker}`);
    console.log(`📄 Navigated to ${ticker} page`);
    
    // Wait for chart to load (with longer timeout)
    await page.waitForSelector('[data-testid="chart-container"], .recharts-wrapper', { 
      timeout: 15000 
    });
    console.log('📊 Chart container loaded');
    
    // Wait a bit more for data to load
    await page.waitForTimeout(3000);
    
    // Count all SVG circles (markers) in the chart
    const allCircles = await page.locator('svg circle').count();
    console.log(`🔍 ${ticker} - Total SVG circles found: ${allCircles}`);
    
    // Look for sentiment-colored markers
    const greenMarkers = await page.locator('svg circle[stroke="#10b981"], svg circle[stroke="#16a34a"]').count();
    const redMarkers = await page.locator('svg circle[stroke="#ef4444"], svg circle[stroke="#dc2626"]').count(); 
    const blueMarkers = await page.locator('svg circle[stroke="#6b7280"], svg circle[stroke="#64748b"], svg circle[stroke="#2563eb"]').count();
    
    console.log(`🟢 ${ticker} - Green (positive) markers: ${greenMarkers}`);
    console.log(`🔴 ${ticker} - Red (negative) markers: ${redMarkers}`);
    console.log(`🔵 ${ticker} - Blue (neutral) markers: ${blueMarkers}`);
    
    // Check for specific marker colors by inspecting styles
    const markerElements = await page.locator('svg circle[stroke]:not([stroke="#3b82f6"])').all();
    console.log(`🎨 ${ticker} - Non-line-colored markers: ${markerElements.length}`);
    
    for (let i = 0; i < Math.min(markerElements.length, 3); i++) {
      const stroke = await markerElements[i].getAttribute('stroke');
      const fill = await markerElements[i].getAttribute('fill');
      console.log(`  ${ticker} Marker ${i + 1}: stroke=${stroke}, fill=${fill}`);
    }
    
    // Basic assertions
    expect(allCircles).toBeGreaterThan(0);
  }
  
  console.log('\n✅ All stocks tested - check console output for detailed analysis');
});