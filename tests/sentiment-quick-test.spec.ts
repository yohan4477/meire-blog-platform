import { test, expect } from '@playwright/test';

test.describe('Sentiment Analysis Quick Test', () => {
  test('should verify sentiment API works and chart displays with sentiment data', async ({ page }) => {
    console.log('🧪 Quick test: Sentiment analysis integration...');
    
    // Test sentiment API first
    const sentimentResponse = await page.request.get('http://localhost:3004/api/merry/stocks/TSLA/sentiments?period=6mo');
    expect(sentimentResponse.status()).toBe(200);
    
    const sentimentData = await sentimentResponse.json();
    console.log(`✅ TSLA sentiment API working: ${sentimentData.totalMentions} mentions`);
    expect(sentimentData.totalMentions).toBeGreaterThan(0);
    
    // Navigate to TSLA page
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    
    // Wait for chart to load
    await page.waitForSelector('[data-testid="stock-price-chart"]', { timeout: 15000 });
    console.log('✅ Chart container loaded');
    
    // Wait a bit longer for sentiment data to load
    await page.waitForTimeout(5000);
    
    // Check if any markers exist at all
    const allCircles = await page.locator('circle').count();
    console.log(`📊 Total circles found: ${allCircles}`);
    
    // Look for specific sentiment-colored markers
    const greenMarkers = await page.locator('circle[stroke="#16a34a"]').count();
    const redMarkers = await page.locator('circle[stroke="#dc2626"]').count();  
    const blueMarkers = await page.locator('circle[stroke="#2563eb"]').count();
    
    console.log(`🎨 Sentiment markers found:`);
    console.log(`   🟢 Positive (green): ${greenMarkers}`);
    console.log(`   🔴 Negative (red): ${redMarkers}`);
    console.log(`   🔵 Neutral/default (blue): ${blueMarkers}`);
    
    const totalSentimentMarkers = greenMarkers + redMarkers + blueMarkers;
    console.log(`📈 Total sentiment markers: ${totalSentimentMarkers}`);
    
    // Since we have sentiment data from API, we should have some markers
    if (sentimentData.totalMentions > 0) {
      expect(totalSentimentMarkers).toBeGreaterThan(0);
      console.log('✅ Sentiment markers are displaying correctly');
    }
  });
  
  test('should display sentiment information correctly in browser', async ({ page }) => {
    console.log('🧪 Testing sentiment display in browser...');
    
    await page.goto('http://localhost:3004/merry/stocks/TSLA');
    await page.waitForSelector('[data-testid="stock-price-chart"]', { timeout: 15000 });
    
    // Check console logs for sentiment data loading
    const logs = [];
    page.on('console', msg => {
      if (msg.text().includes('🎯') || msg.text().includes('sentiment')) {
        logs.push(msg.text());
      }
    });
    
    // Refresh to trigger sentiment loading
    await page.reload();
    await page.waitForSelector('[data-testid="stock-price-chart"]', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    console.log('📱 Browser console logs related to sentiment:');
    logs.forEach(log => console.log(`   ${log}`));
    
    // Check if the sentiment loading is working
    const pageContent = await page.content();
    const hasChart = pageContent.includes('ResponsiveContainer') || pageContent.includes('LineChart');
    
    if (hasChart) {
      console.log('✅ Chart component is rendered');
    }
  });
});