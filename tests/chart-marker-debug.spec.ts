import { test, expect } from '@playwright/test';

test('TSLA Chart Marker Debug Test', async ({ page }) => {
  console.log('🚀 Starting TSLA chart marker analysis...');
  
  // Navigate to TSLA chart page
  await page.goto('http://localhost:3007/merry/stocks/TSLA');
  console.log('📄 Navigated to TSLA page');
  
  // Wait for chart to load (with longer timeout)
  await page.waitForSelector('[data-testid="chart-container"], .recharts-wrapper', { 
    timeout: 15000 
  });
  console.log('📊 Chart container loaded');
  
  // Wait a bit more for data to load
  await page.waitForTimeout(3000);
  
  // Count all SVG circles (markers) in the chart
  const allCircles = await page.locator('svg circle').count();
  console.log(`🔍 Total SVG circles found: ${allCircles}`);
  
  // Look for post markers specifically (should have stroke)
  const postMarkers = await page.locator('svg circle[stroke]:not([fill="none"])').count();
  console.log(`📍 Post markers with stroke: ${postMarkers}`);
  
  // Look for sentiment-colored markers
  const greenMarkers = await page.locator('svg circle[stroke="#10b981"], svg circle[stroke="#16a34a"]').count();
  const redMarkers = await page.locator('svg circle[stroke="#ef4444"], svg circle[stroke="#dc2626"]').count(); 
  const blueMarkers = await page.locator('svg circle[stroke="#6b7280"], svg circle[stroke="#64748b"], svg circle[stroke="#2563eb"]').count();
  
  console.log(`🟢 Green (positive) markers: ${greenMarkers}`);
  console.log(`🔴 Red (negative) markers: ${redMarkers}`);
  console.log(`🔵 Blue (neutral) markers: ${blueMarkers}`);
  
  // Check for specific marker colors by inspecting styles
  const markerElements = await page.locator('svg circle[stroke]:not([stroke="#3b82f6"])').all();
  console.log(`🎨 Non-line-colored markers: ${markerElements.length}`);
  
  for (let i = 0; i < Math.min(markerElements.length, 5); i++) {
    const stroke = await markerElements[i].getAttribute('stroke');
    const fill = await markerElements[i].getAttribute('fill');
    console.log(`  Marker ${i + 1}: stroke=${stroke}, fill=${fill}`);
  }
  
  // Check browser console for our debug messages
  const consoleLogs: string[] = [];
  page.on('console', (msg) => {
    if (msg.text().includes('Chart Marker Statistics') || 
        msg.text().includes('Sentiment analysis for marker') ||
        msg.text().includes('Final marker style') ||
        msg.text().includes('Rendering marker for')) {
      consoleLogs.push(msg.text());
    }
  });
  
  // Reload page to capture console messages from the start
  await page.reload();
  await page.waitForSelector('[data-testid="chart-container"], .recharts-wrapper', { 
    timeout: 15000 
  });
  await page.waitForTimeout(5000);
  
  console.log('📝 Console debug messages:');
  consoleLogs.forEach(log => console.log(`  ${log}`));
  
  // Basic assertions
  expect(allCircles).toBeGreaterThan(0);
  console.log('✅ Test completed - check console output for detailed analysis');
});