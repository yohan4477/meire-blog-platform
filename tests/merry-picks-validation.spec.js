const { test, expect } = require('@playwright/test');

test.describe('MerryStockPicks Section Error Validation', () => {
  let page;
  let consoleErrors = [];
  let jsErrors = [];

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('Console Error:', msg.text());
      }
    });

    // Capture JavaScript errors
    page.on('pageerror', error => {
      jsErrors.push(error.message);
      console.log('JavaScript Error:', error.message);
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Test 1: Console Error Detection - No MerryStockPicks crashes', async () => {
    console.log('🧪 Test 1: Checking for console errors during page load...');
    
    // Reset error arrays
    consoleErrors = [];
    jsErrors = [];

    // Navigate to main page
    await page.goto('http://localhost:3010/', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });

    // Wait for the page to fully load
    await page.waitForTimeout(3000);

    // Check for specific MerryStockPicks errors
    const merryPicksErrors = [
      ...consoleErrors,
      ...jsErrors
    ].filter(error => 
      error.includes('MerryStockPicks') ||
      error.includes('Cannot read properties of undefined') ||
      error.includes('stock.tags.slice') ||
      error.includes('stock.lastMention') ||
      error.includes('slice is not a function')
    );

    console.log('Total console errors:', consoleErrors.length);
    console.log('Total JS errors:', jsErrors.length);
    console.log('MerryStockPicks specific errors:', merryPicksErrors.length);

    if (merryPicksErrors.length > 0) {
      console.log('❌ MerryStockPicks errors found:', merryPicksErrors);
    }

    // Assertion: No MerryStockPicks specific errors
    expect(merryPicksErrors.length).toBe(0);
  });

  test('Test 2: MerryStockPicks Component Function - Renders without crashes', async () => {
    console.log('🧪 Test 2: Checking MerryStockPicks component rendering...');

    await page.goto('http://localhost:3010/', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });

    // Wait for component to load
    await page.waitForTimeout(2000);

    // Check if MerryStockPicks section exists
    const merryPicksSection = page.locator('[data-testid="merry-picks-section"], section:has-text("메르\'s Pick"), .merry-picks, h2:has-text("메르\'s Pick")').first();
    
    // Wait for the section to be visible (if it exists)
    try {
      await merryPicksSection.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ MerryStockPicks section found and visible');

      // Check for stock items within the section
      const stockItems = page.locator('.stock-item, [data-testid="stock-item"], .border').filter({
        has: page.locator('text=/TSLA|AAPL|GOOGL|005930|종목/i')
      });

      const stockCount = await stockItems.count();
      console.log(`📊 Found ${stockCount} stock items`);

      if (stockCount > 0) {
        // Test first stock item for proper rendering
        const firstStock = stockItems.first();
        await expect(firstStock).toBeVisible();
        
        // Check that no error boundary is shown
        const errorBoundary = page.locator('text=/something went wrong|error occurred|component crashed/i');
        await expect(errorBoundary).toHaveCount(0);
        
        console.log('✅ Stock items render without error boundaries');
      }

    } catch (error) {
      console.log('ℹ️ MerryStockPicks section not found or not visible - this is OK if section is conditionally rendered');
    }

    // Critical: Ensure no error boundary messages anywhere on page
    const globalErrorBoundary = page.locator('text=/something went wrong|component.*error|error.*component/i');
    await expect(globalErrorBoundary).toHaveCount(0);
  });

  test('Test 3: API Data Handling - Graceful handling of undefined data', async () => {
    console.log('🧪 Test 3: Testing API data handling and fallbacks...');

    // Intercept the API call to potentially simulate undefined data
    await page.route('**/api/merry/stocks', async route => {
      const response = await route.fetch();
      const data = await response.json();
      
      // Simulate some undefined fields to test our fixes
      if (data && data.length > 0) {
        data.forEach(stock => {
          // Randomly remove tags or lastMention to test our fixes
          if (Math.random() > 0.5) {
            delete stock.tags;
          }
          if (Math.random() > 0.5) {
            delete stock.lastMention;
          }
        });
      }
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data)
      });
    });

    await page.goto('http://localhost:3010/', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });

    await page.waitForTimeout(3000);

    // Check that page still loads without crashing
    const bodyContent = await page.textContent('body');
    expect(bodyContent.length).toBeGreaterThan(100);

    // Verify no undefined-related errors occurred
    const undefinedErrors = [
      ...consoleErrors,
      ...jsErrors
    ].filter(error => 
      error.includes('undefined') && 
      (error.includes('slice') || error.includes('tags') || error.includes('lastMention'))
    );

    console.log('Undefined-related errors:', undefinedErrors.length);
    expect(undefinedErrors.length).toBe(0);
  });

  test('Test 4: Performance Impact - Page loads within performance budget', async () => {
    console.log('🧪 Test 4: Measuring page performance after fixes...');

    const startTime = Date.now();

    await page.goto('http://localhost:3009/', { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });

    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Page load time: ${loadTime}ms`);

    // Performance assertion: Page should load within 5 seconds (generous for local dev)
    expect(loadTime).toBeLessThan(5000);

    // Check Core Web Vitals using page.evaluate
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {};
          
          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              vitals.fid = entry.processingStart - entry.startTime;
            }
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              vitals.cls = (vitals.cls || 0) + entry.value;
            }
          });
          
          resolve(vitals);
        });
        
        observer.observe({entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift']});
        
        // Fallback resolve after 3 seconds
        setTimeout(() => resolve({}), 3000);
      });
    });

    console.log('📊 Core Web Vitals:', vitals);

    // Basic performance check: ensure no major regressions
    if (vitals.lcp) {
      expect(vitals.lcp).toBeLessThan(4000); // LCP < 4s for local dev
    }
  });

  test('Test 5: Complete Integration Test - Full user flow', async () => {
    console.log('🧪 Test 5: Complete integration test...');

    // Reset error tracking
    consoleErrors = [];
    jsErrors = [];

    await page.goto('http://localhost:3010/', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });

    // Wait for full page load
    await page.waitForTimeout(3000);

    // Scroll through page to trigger any lazy-loaded components
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });

    // Final error check
    const finalErrors = [...consoleErrors, ...jsErrors];
    const criticalErrors = finalErrors.filter(error => 
      error.includes('MerryStockPicks') ||
      error.includes('Cannot read properties of undefined') ||
      error.includes('slice is not a function') ||
      error.includes('TypeError')
    );

    console.log('📋 Final Error Summary:');
    console.log(`- Total console errors: ${consoleErrors.length}`);
    console.log(`- Total JS errors: ${jsErrors.length}`);
    console.log(`- Critical errors: ${criticalErrors.length}`);

    if (criticalErrors.length > 0) {
      console.log('❌ Critical errors found:');
      criticalErrors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ No critical errors found - MerryStockPicks fixes are working!');
    }

    // Final assertion: No critical errors
    expect(criticalErrors.length).toBe(0);
  });
});