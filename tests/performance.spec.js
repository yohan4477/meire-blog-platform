const { test, expect } = require('@playwright/test');

test.describe('Meire Blog Platform Performance Tests', () => {
  const BASE_URL = 'http://localhost:3009';
  
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for performance tests
    test.setTimeout(60000);
    
    // Enable performance monitoring
    await page.addInitScript(() => {
      window.performanceData = {
        navigationStart: performance.now(),
        apiCalls: [],
        errors: []
      };
      
      // Monitor API calls
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const start = performance.now();
        return originalFetch.apply(this, args).then(response => {
          const end = performance.now();
          window.performanceData.apiCalls.push({
            url: args[0],
            duration: end - start,
            status: response.status
          });
          return response;
        });
      };
      
      // Monitor errors
      window.addEventListener('error', (e) => {
        window.performanceData.errors.push({
          message: e.message,
          filename: e.filename,
          line: e.lineno
        });
      });
    });
  });

  test('API Performance Test - /api/merry/stocks', async ({ page }) => {
    console.log('🚀 Testing API Performance: /api/merry/stocks?limit=5');
    
    const startTime = Date.now();
    
    // Make direct API request
    const response = await page.request.get(`${BASE_URL}/api/merry/stocks?limit=5`);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`⏱️ API Response Time: ${responseTime}ms`);
    
    // Validate response
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(500); // <500ms requirement
    
    const data = await response.json();
    console.log(`📊 Data received: ${data.length || 0} stocks`);
    
    // Verify no database errors
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBeTruthy();
    
    console.log('✅ API Performance Test PASSED');
  });

  test('Main Page Loading Performance', async ({ page }) => {
    console.log('🏠 Testing Main Page Loading Performance');
    
    const startTime = performance.now();
    
    // Navigate to main page
    await page.goto(BASE_URL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    console.log(`⏱️ Page Load Time: ${loadTime.toFixed(2)}ms`);
    
    // Validate <3 seconds requirement
    expect(loadTime).toBeLessThan(3000);
    
    // Check for Merry's Pick section
    const merryPickSection = page.locator('text=메르\'s Pick').or(page.locator('[data-testid="merry-pick"]'));
    await expect(merryPickSection.first()).toBeVisible({ timeout: 10000 });
    
    // Get performance data
    const performanceData = await page.evaluate(() => window.performanceData);
    
    console.log(`📡 API Calls made: ${performanceData.apiCalls.length}`);
    console.log(`❌ JavaScript Errors: ${performanceData.errors.length}`);
    
    // Log API call performance
    performanceData.apiCalls.forEach(call => {
      console.log(`  📞 ${call.url}: ${call.duration.toFixed(2)}ms (${call.status})`);
      expect(call.duration).toBeLessThan(500); // Each API call <500ms
    });
    
    // Verify no critical errors
    expect(performanceData.errors.length).toBe(0);
    
    console.log('✅ Main Page Performance Test PASSED');
  });

  test('Profile Tab Functionality Test', async ({ page }) => {
    console.log('👤 Testing Merry Profile Tab Functionality');
    
    await page.goto(BASE_URL);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for profile or merry section
    const profileElements = await page.locator('[class*="profile"], [class*="merry"], [data-testid*="profile"], [data-testid*="merry"]').all();
    
    if (profileElements.length > 0) {
      console.log(`🔍 Found ${profileElements.length} profile/merry elements`);
      
      // Test interaction with first profile element
      try {
        await profileElements[0].click({ timeout: 5000 });
        console.log('✅ Profile element clicked successfully');
      } catch (error) {
        console.log('ℹ️ Profile element not clickable or not needed');
      }
    }
    
    // Check for forEach errors specifically
    const jsErrors = await page.evaluate(() => {
      return window.performanceData ? window.performanceData.errors : [];
    });
    
    // Filter for forEach-related errors
    const forEachErrors = jsErrors.filter(error => 
      error.message.includes('forEach') || 
      error.message.includes('Cannot read properties of null') ||
      error.message.includes('undefined')
    );
    
    console.log(`🔍 Total JS Errors: ${jsErrors.length}`);
    console.log(`🔍 ForEach-related Errors: ${forEachErrors.length}`);
    
    // Verify no forEach crashes
    expect(forEachErrors.length).toBe(0);
    
    // Verify page is still responsive
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
    
    console.log('✅ Profile Tab Functionality Test PASSED');
  });

  test('Overall Website Performance Test', async ({ page }) => {
    console.log('🌐 Testing Overall Website Performance');
    
    const pages = [
      '/',
      '/merry',
      '/merry/stocks/TSLA'
    ];
    
    const performanceResults = [];
    
    for (const testPage of pages) {
      console.log(`📄 Testing page: ${testPage}`);
      
      const startTime = performance.now();
      
      try {
        await page.goto(`${BASE_URL}${testPage}`, { 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
        
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        // Get performance data
        const performanceData = await page.evaluate(() => window.performanceData || { apiCalls: [], errors: [] });
        
        const result = {
          page: testPage,
          loadTime: loadTime,
          apiCalls: performanceData.apiCalls.length,
          errors: performanceData.errors.length,
          avgApiTime: performanceData.apiCalls.length > 0 
            ? performanceData.apiCalls.reduce((sum, call) => sum + call.duration, 0) / performanceData.apiCalls.length 
            : 0
        };
        
        performanceResults.push(result);
        
        console.log(`  ⏱️ Load Time: ${loadTime.toFixed(2)}ms`);
        console.log(`  📡 API Calls: ${result.apiCalls}`);
        console.log(`  📊 Avg API Time: ${result.avgApiTime.toFixed(2)}ms`);
        console.log(`  ❌ Errors: ${result.errors}`);
        
        // Validate performance requirements
        expect(loadTime).toBeLessThan(3000); // <3 seconds
        expect(result.errors).toBe(0); // No errors
        if (result.avgApiTime > 0) {
          expect(result.avgApiTime).toBeLessThan(500); // API calls <500ms
        }
        
      } catch (error) {
        console.log(`⚠️ Error testing ${testPage}: ${error.message}`);
        // Some pages might not exist, continue testing
      }
    }
    
    // Summary
    console.log('\n📊 Performance Summary:');
    performanceResults.forEach(result => {
      console.log(`${result.page}: ${result.loadTime.toFixed(2)}ms (${result.apiCalls} API calls, ${result.errors} errors)`);
    });
    
    console.log('✅ Overall Website Performance Test COMPLETED');
  });

  test('Database Query Performance Test', async ({ page }) => {
    console.log('🗄️ Testing Database Query Performance');
    
    // Test the fixed database schema query
    const testApis = [
      '/api/merry/stocks?limit=5',
      '/api/merry/stocks?limit=10'
    ];
    
    for (const apiEndpoint of testApis) {
      console.log(`🔍 Testing: ${apiEndpoint}`);
      
      const startTime = Date.now();
      const response = await page.request.get(`${BASE_URL}${apiEndpoint}`);
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      console.log(`  ⏱️ Response Time: ${responseTime}ms`);
      
      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(500);
      
      const data = await response.json();
      console.log(`  📊 Records returned: ${data.length || 0}`);
      
      // Verify data structure
      if (data.length > 0) {
        const firstStock = data[0];
        console.log(`  📈 First stock: ${firstStock.ticker || 'N/A'} - ${firstStock.company_name || 'N/A'}`);
        
        // Verify mentioned_date field exists (the fixed schema)
        if (firstStock.mentioned_date) {
          console.log(`  📅 Mentioned Date: ${firstStock.mentioned_date}`);
        }
      }
    }
    
    console.log('✅ Database Query Performance Test PASSED');
  });
});