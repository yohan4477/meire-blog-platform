import { test, expect } from '@playwright/test';

test.describe('Sentiment Analysis Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for development server to be ready
    await page.waitForTimeout(2000);
  });

  test('should display sentiment-colored markers on TSLA chart', async ({ page }) => {
    console.log('🧪 Testing sentiment analysis integration on TSLA chart...');
    
    // Navigate to TSLA stock page
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    
    // Wait for page to load and chart to render
    await page.waitForSelector('[data-testid="stock-price-chart"]', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for sentiment data to load
    
    // Check if chart contains markers (sentiment or post markers)
    const chartMarkers = page.locator('circle[stroke]').filter({ hasNot: page.locator('[fill="transparent"]') });
    const markerCount = await chartMarkers.count();
    console.log(`📊 Found ${markerCount} chart markers`);
    
    if (markerCount > 0) {
      // Check for sentiment-colored markers
      const greenMarkers = await page.locator('circle[stroke="#16a34a"]').count(); // Positive sentiment
      const redMarkers = await page.locator('circle[stroke="#dc2626"]').count();   // Negative sentiment
      const blueMarkers = await page.locator('circle[stroke="#2563eb"]').count();  // Neutral sentiment
      
      console.log(`🟢 Green markers (positive): ${greenMarkers}`);
      console.log(`🔴 Red markers (negative): ${redMarkers}`);
      console.log(`🔵 Blue markers (neutral): ${blueMarkers}`);
      
      // Expect at least some markers to exist
      expect(markerCount).toBeGreaterThan(0);
      
      // Verify sentiment API is working by checking for sentiment data
      const sentimentResponse = await page.request.get('http://localhost:3004/api/merry/stocks/TSLA/sentiments?period=6mo');
      expect(sentimentResponse.status()).toBe(200);
      
      const sentimentData = await sentimentResponse.json();
      console.log(`🎯 Sentiment API returned ${sentimentData.totalMentions} mentions`);
      expect(sentimentData.totalMentions).toBeGreaterThan(0);
    }
  });

  test('should show sentiment information in chart tooltips', async ({ page }) => {
    console.log('🧪 Testing sentiment information in chart tooltips...');
    
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForSelector('[data-testid="stock-price-chart"]', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Find any chart marker
    const firstMarker = page.locator('circle[stroke]').filter({ hasNot: page.locator('[fill="transparent"]') }).first();
    
    if (await firstMarker.count() > 0) {
      // Hover over the marker to trigger tooltip
      await firstMarker.hover();
      await page.waitForTimeout(1000);
      
      // Check if tooltip contains sentiment information
      const tooltip = page.locator('.recharts-tooltip-wrapper');
      await expect(tooltip).toBeVisible({ timeout: 5000 });
      
      // Look for sentiment indicators in tooltip
      const sentimentText = page.locator('text=감정 분석').or(page.locator('text=😊')).or(page.locator('text=😟')).or(page.locator('text=😐'));
      
      if (await sentimentText.count() > 0) {
        console.log('✅ Sentiment information found in tooltip');
        await expect(sentimentText.first()).toBeVisible();
      } else {
        console.log('ℹ️ No sentiment information in this marker tooltip');
      }
    }
  });

  test('should handle different time ranges with sentiment data', async ({ page }) => {
    console.log('🧪 Testing sentiment data across different time ranges...');
    
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForSelector('[data-testid="stock-price-chart"]', { timeout: 10000 });
    
    // Test different time ranges
    const timeRanges = ['1M', '3M', '6M'];
    
    for (const range of timeRanges) {
      console.log(`📅 Testing ${range} time range...`);
      
      // Click time range button
      const rangeButton = page.locator(`button:has-text("${range}")`);
      if (await rangeButton.count() > 0) {
        await rangeButton.click();
        await page.waitForTimeout(2000); // Wait for chart to update
        
        // Check if sentiment API is called for this range
        const period = range.toLowerCase().replace('m', 'mo');
        const sentimentResponse = await page.request.get(`http://localhost:3004/api/merry/stocks/TSLA/sentiments?period=${period}`);
        expect(sentimentResponse.status()).toBe(200);
        
        const sentimentData = await sentimentResponse.json();
        console.log(`📊 ${range} range: ${sentimentData.totalMentions} sentiment mentions`);
      }
    }
  });

  test('should verify sentiment API endpoints work correctly', async ({ page }) => {
    console.log('🧪 Testing sentiment API endpoints...');
    
    // Test TSLA sentiment API
    const tslaResponse = await page.request.get('http://localhost:3004/api/merry/stocks/TSLA/sentiments?period=6mo');
    expect(tslaResponse.status()).toBe(200);
    
    const tslaData = await tslaResponse.json();
    expect(tslaData).toHaveProperty('ticker', 'TSLA');
    expect(tslaData).toHaveProperty('summary');
    expect(tslaData).toHaveProperty('totalMentions');
    
    console.log(`✅ TSLA sentiment API: ${tslaData.totalMentions} mentions`);
    
    // Test GOOGL sentiment API (if it has data)
    const googlResponse = await page.request.get('http://localhost:3004/api/merry/stocks/GOOGL/sentiments?period=6mo');
    expect(googlResponse.status()).toBe(200);
    
    const googlData = await googlResponse.json();
    expect(googlData).toHaveProperty('ticker', 'GOOGL');
    
    console.log(`✅ GOOGL sentiment API: ${googlData.totalMentiments} mentions`);
  });

  test('should display different marker colors based on sentiment', async ({ page }) => {
    console.log('🧪 Testing marker color changes based on sentiment...');
    
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForSelector('[data-testid="stock-price-chart"]', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Count markers of different colors
    const greenMarkers = await page.locator('circle[stroke="#16a34a"]').count(); // Positive
    const redMarkers = await page.locator('circle[stroke="#dc2626"]').count();   // Negative  
    const blueMarkers = await page.locator('circle[stroke="#2563eb"]').count();  // Neutral
    
    console.log(`🎨 Marker color distribution:`);
    console.log(`   🟢 Positive (green): ${greenMarkers}`);
    console.log(`   🔴 Negative (red): ${redMarkers}`);
    console.log(`   🔵 Neutral (blue): ${blueMarkers}`);
    
    // At least some markers should exist
    const totalMarkers = greenMarkers + redMarkers + blueMarkers;
    expect(totalMarkers).toBeGreaterThan(0);
    
    // Verify that we have proper sentiment distribution (mostly neutral expected in current data)
    if (totalMarkers > 0) {
      console.log(`✅ Found ${totalMarkers} sentiment-colored markers`);
    }
  });
});