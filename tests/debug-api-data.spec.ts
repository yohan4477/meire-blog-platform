import { test } from '@playwright/test';

test.describe('Debug API Data', () => {
  test('should compare API data with component rendering', async ({ page }) => {
    const DEV_PORT = process.env.DEV_PORT || '3004';
    
    // First, get the API data directly
    console.log('=== API Data ===');
    const apiResponse = await page.request.get(`http://localhost:${DEV_PORT}/api/today-merry-quote?t=${Date.now()}`);
    const apiData = await apiResponse.json();
    console.log('API Response:', JSON.stringify(apiData, null, 2));
    
    // Then check what the component is actually displaying
    console.log('=== Component Data ===');
    await page.goto(`http://localhost:${DEV_PORT}`);
    await page.waitForSelector('.bg-card:has-text("메르님 한 줄 코멘트")', { timeout: 10000 });
    
    // Get the quote content from the page
    const quoteContent = await page.locator('div.group.cursor-pointer p').first().textContent();
    console.log('Displayed Quote:', quoteContent);
    
    // Check for relatedTickers in the component
    const tickerElements = await page.locator('span.cursor-pointer:has-text("CEG")').count();
    console.log('CEG ticker elements found:', tickerElements);
    
    // Check all ticker elements
    const allTickers = await page.locator('span.cursor-pointer').allTextContents();
    console.log('All ticker elements:', allTickers);
    
    // Check the actual href attribute
    const linkHref = await page.locator('a.block.group.cursor-pointer').first().getAttribute('href');
    console.log('Actual link href:', linkHref);
    
    // Check for any elements containing CEG
    const cegElements = await page.locator('*:has-text("CEG")').allTextContents();
    console.log('Elements containing CEG:', cegElements.slice(0, 5)); // Limit to first 5
    
    // Check if there are any data attributes that might contain stock info
    const stockDataAttrs = await page.locator('[data-stock], [data-ticker], [data-symbol]').count();
    console.log('Elements with stock data attributes:', stockDataAttrs);
  });
});