import { test } from '@playwright/test';

test.describe('Debug HTML Structure', () => {
  test('should inspect the actual HTML structure of TodayMerryQuote', async ({ page }) => {
    const DEV_PORT = process.env.DEV_PORT || '3004';
    
    await page.goto(`http://localhost:${DEV_PORT}`);
    await page.waitForSelector('.bg-card:has-text("메르님 한 줄 코멘트")', { timeout: 10000 });
    
    // Find the quote component
    const quoteComponent = page.locator('.bg-card:has-text("메르님 한 줄 코멘트")');
    
    // Get the HTML content
    const htmlContent = await quoteComponent.innerHTML();
    console.log('=== TodayMerryQuote HTML Structure ===');
    console.log(htmlContent);
    
    // Look for any unexpected clickable elements
    const clickableElements = page.locator('a, button, [onclick], [data-href], .cursor-pointer');
    const clickableCount = await clickableElements.count();
    console.log(`Found ${clickableCount} clickable elements`);
    
    for (let i = 0; i < Math.min(clickableCount, 10); i++) {
      const element = clickableElements.nth(i);
      const tagName = await element.evaluate(el => el.tagName);
      const className = await element.getAttribute('class');
      const href = await element.getAttribute('href');
      const onclick = await element.getAttribute('onclick');
      
      console.log(`Clickable ${i + 1}: ${tagName}, class="${className}", href="${href}", onclick="${onclick}"`);
    }
    
    // Specifically look for elements that might redirect to /merry/stocks/CEG
    const cegElements = page.locator('*').filter({ hasText: 'CEG' });
    const cegCount = await cegElements.count();
    console.log(`Found ${cegCount} elements containing 'CEG'`);
    
    for (let i = 0; i < cegCount; i++) {
      const element = cegElements.nth(i);
      const text = await element.textContent();
      const tagName = await element.evaluate(el => el.tagName);
      const className = await element.getAttribute('class');
      
      console.log(`CEG element ${i + 1}: ${tagName}, class="${className}", text="${text}"`);
    }
  });
});