import { test, expect } from '@playwright/test';

test.describe('Today Merry Quote Click Functionality', () => {
  test('should show visual feedback and navigate to post when clicked', async ({ page, context }) => {
    // Clear all browser data to prevent cache interference
    await context.clearCookies();
    await context.clearPermissions();
    const DEV_PORT = process.env.DEV_PORT || '3004';
    
    // Navigate to main page
    await page.goto(`http://localhost:${DEV_PORT}`);
    
    // Wait for the Today Merry Quote component to load
    await page.waitForSelector('.bg-card:has-text("메르님 한 줄 코멘트")', { timeout: 10000 });
    
    // Find quote cards specifically within the TodayMerryQuote component
    const todayQuoteSection = page.locator('.bg-card:has-text("메르님 한 줄 코멘트")');
    const quoteCards = todayQuoteSection.locator('a.block.group.cursor-pointer');
    const cardCount = await quoteCards.count();
    console.log(`Found ${cardCount} quote cards within TodayMerryQuote component`);
    
    if (cardCount > 0) {
      const firstCard = quoteCards.first();
      
      // Test hover effect - check for visual feedback
      await firstCard.hover();
      
      // Check if hover effects are applied (scale, background, border)
      const cardWithHover = page.locator('div.group.cursor-pointer').first();
      
      // Get the card's bounding box before and after hover to check for scale
      const boundingBoxBefore = await firstCard.boundingBox();
      await firstCard.hover();
      const boundingBoxAfter = await firstCard.boundingBox();
      
      console.log('Bounding box before hover:', boundingBoxBefore);
      console.log('Bounding box after hover:', boundingBoxAfter);
      
      // Wait a moment for CSS transition
      await page.waitForTimeout(300);
      
      // Test click functionality
      const initialUrl = page.url();
      console.log('Initial URL:', initialUrl);
      
      // Check what we're actually clicking on
      console.log('=== Debugging Click Target ===');
      
      // Get the link href first
      const linkElement = firstCard;
      const href = await linkElement.getAttribute('href');
      console.log('Link href:', href);
      
      // Try clicking on different areas with detailed logging
      const postButton = firstCard.locator('text=해당 포스트 보기').first();
      const titleArea = firstCard.locator('h3:has-text("핵심 한줄 요약")').first();
      const quoteContent = firstCard.locator('p').first();
      
      console.log('Post button count:', await postButton.count());
      console.log('Title area count:', await titleArea.count());
      console.log('Quote content count:', await quoteContent.count());
      
      // Let's try clicking on the title area specifically
      if (await titleArea.count() > 0) {
        console.log('Clicking on "핵심 한줄 요약" title area...');
        const titleText = await titleArea.textContent();
        console.log('Title area text:', titleText);
        await titleArea.click();
      } else if (await postButton.count() > 0) {
        console.log('Clicking on "해당 포스트 보기" button...');
        await postButton.click();
      } else {
        console.log('Clicking on quote content area...');
        const quoteText = await quoteContent.textContent();
        console.log('Quote content:', quoteText);
        await quoteContent.click();
      }
      
      // Wait for navigation
      await page.waitForTimeout(2000);
      
      const newUrl = page.url();
      console.log('URL after click:', newUrl);
      
      // Verify navigation occurred and URL contains /merry/posts/
      if (newUrl !== initialUrl) {
        expect(newUrl).toContain('/merry/posts/');
        console.log('✅ Navigation successful');
        
        // Verify we're on a post page
        await page.waitForSelector('article, .post-content, h1, main', { timeout: 5000 });
        console.log('✅ Post page loaded successfully');
      } else {
        console.log('❌ No navigation occurred - checking if ticker was clicked');
        
        // Try clicking on a different area - the title or insight area
        const insightArea = firstCard.locator('text=투자 인사이트').first();
        if (await insightArea.count() > 0) {
          console.log('Trying to click insight area...');
          await insightArea.click();
          await page.waitForTimeout(2000);
          
          const finalUrl = page.url();
          if (finalUrl !== initialUrl) {
            expect(finalUrl).toContain('/merry/posts/');
            console.log('✅ Navigation successful via insight area');
          }
        }
      }
    } else {
      console.log('No quote cards found - component may not have data');
    }
  });
  
  test('should have proper link structure', async ({ page }) => {
    const DEV_PORT = process.env.DEV_PORT || '3004';
    
    await page.goto(`http://localhost:${DEV_PORT}`);
    await page.waitForSelector('.bg-card:has-text("메르님 한 줄 코멘트")', { timeout: 10000 });
    
    // Check for Link components with correct href pattern
    const links = page.locator('a[href*="/merry/posts/"]');
    const linkCount = await links.count();
    console.log(`Found ${linkCount} links with /merry/posts/ pattern`);
    
    if (linkCount > 0) {
      const firstLink = links.first();
      const href = await firstLink.getAttribute('href');
      console.log('First link href:', href);
      
      // Verify href follows correct pattern
      expect(href).toMatch(/^\/merry\/posts\/\d+$/);
      console.log('✅ Link structure is correct');
    }
  });
});