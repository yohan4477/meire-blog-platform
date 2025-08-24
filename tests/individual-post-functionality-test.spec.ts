import { test, expect } from '@playwright/test';

test.describe('Individual Post Page Functionality', () => {
  test('should navigate to formatted post page when clicking related posts', async ({ page }) => {
    const DEV_PORT = process.env.DEV_PORT || '3004';
    
    // Navigate to CEG stock page
    await page.goto(`http://localhost:${DEV_PORT}/merry/stocks/CEG`);
    
    // Wait for the page to load completely
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Verify we're on the CEG page
    const pageTitle = await page.locator('h1').first().textContent();
    console.log('CEG page title:', pageTitle);
    expect(pageTitle).toMatch(/CEG|컨스텔레이션에너지/);
    
    // Wait for related posts section to load
    await page.waitForSelector('.bg-card', { timeout: 10000 });
    
    // Find related post links
    const relatedPostLinks = page.locator('a[href*="/merry/posts/"]');
    const linkCount = await relatedPostLinks.count();
    console.log(`Found ${linkCount} related post links`);
    
    if (linkCount > 0) {
      // Get the first related post link
      const firstLink = relatedPostLinks.first();
      const href = await firstLink.getAttribute('href');
      console.log('First related post link href:', href);
      
      // Click the first related post
      await firstLink.click();
      
      // Wait for navigation to individual post page
      await page.waitForURL(/\/merry\/posts\/\d+/, { timeout: 10000 });
      
      // Verify we're now on an individual post page
      const currentUrl = page.url();
      console.log('Current URL after click:', currentUrl);
      expect(currentUrl).toMatch(/\/merry\/posts\/\d+/);
      
      // Wait for post content to load
      await page.waitForSelector('h1', { timeout: 5000 });
      
      // Verify post page elements are present
      const postTitle = await page.locator('h1').first();
      await expect(postTitle).toBeVisible();
      
      const postTitleText = await postTitle.textContent();
      console.log('Post title:', postTitleText);
      
      // Check for formatted content elements
      const authorInfo = page.locator('text=메르');
      await expect(authorInfo.first()).toBeVisible();
      
      const backButton = page.locator('text=전체 포스트로');
      await expect(backButton.first()).toBeVisible();
      
      // Check if content is properly formatted
      const contentArea = page.locator('.prose, .bg-card');
      await expect(contentArea.first()).toBeVisible();
      
      console.log('✅ Individual post page loaded successfully with formatted content');
    } else {
      console.log('⚠️ No related post links found - may need to check data');
      
      // Check if there are any error messages
      const errorMessages = await page.locator('text=오류, text=에러, text=Error').count();
      expect(errorMessages).toBe(0);
    }
  });
  
  test('should display properly formatted post content', async ({ page }) => {
    const DEV_PORT = process.env.DEV_PORT || '3004';
    
    // Navigate directly to a known post ID
    const testPostId = '223977895361'; // CEG related post
    await page.goto(`http://localhost:${DEV_PORT}/merry/posts/${testPostId}`);
    
    // Wait for page load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check post title is displayed
    const postTitle = await page.locator('h1').first().textContent();
    expect(postTitle).toBeTruthy();
    console.log('Post title:', postTitle);
    
    // Check author information
    const authorSection = page.locator('text=메르');
    await expect(authorSection.first()).toBeVisible();
    
    // Check meta information (date, views)
    const metaInfo = page.locator('text=조회');
    await expect(metaInfo.first()).toBeVisible();
    
    // Check main content area
    const contentArea = page.locator('.prose, .bg-card').filter({ hasText: '본문' });
    await expect(contentArea.first()).toBeVisible();
    
    // Check navigation elements
    const backButton = page.locator('text=전체 포스트로');
    await expect(backButton).toBeVisible();
    
    // Test back button functionality
    await backButton.click();
    await page.waitForURL(/\/merry$/, { timeout: 5000 });
    
    const merryPageUrl = page.url();
    expect(merryPageUrl).toContain('/merry');
    console.log('✅ Back navigation working properly');
    
    console.log('✅ Post formatting and navigation test passed');
  });
});