const { test, expect } = require('@playwright/test');
require('./setup/test-cleanup');

test.describe('Quick MerryStockPicks Fix Validation', () => {
  test('Critical Fix Validation - No slice() or undefined errors', async ({ page }) => {
    console.log('🔥 CRITICAL TEST: Validating MerryStockPicks fixes...');
    
    let consoleErrors = [];
    let jsErrors = [];

    // Capture errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('❌ Console Error:', msg.text());
      }
    });

    page.on('pageerror', error => {
      jsErrors.push(error.message);
      console.log('❌ JavaScript Error:', error.message);
    });

    try {
      // Load the page
      await page.goto('http://localhost:3010/', { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });

      console.log('✅ Page loaded successfully');

      // Wait for potential component rendering
      await page.waitForTimeout(3000);

      // Specifically look for the critical errors we fixed
      const criticalErrors = [...consoleErrors, ...jsErrors].filter(error => 
        error.includes('stock.tags.slice') ||
        error.includes('Cannot read properties of undefined') ||
        error.includes('slice is not a function') ||
        error.includes('new Date(stock.lastMention)') ||
        (error.includes('MerryStockPicks') && error.includes('TypeError'))
      );

      console.log('\n📊 ERROR ANALYSIS:');
      console.log(`- Total console errors: ${consoleErrors.length}`);
      console.log(`- Total JS errors: ${jsErrors.length}`);
      console.log(`- Critical MerryStockPicks errors: ${criticalErrors.length}`);

      if (criticalErrors.length > 0) {
        console.log('\n❌ CRITICAL ERRORS FOUND:');
        criticalErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      } else {
        console.log('\n✅ SUCCESS: No critical MerryStockPicks errors detected!');
      }

      // Check if MerryStockPicks section exists and renders
      const merrySection = page.locator('h2:has-text("메르\'s Pick"), text="메르\'s Pick"').first();
      const sectionExists = await merrySection.count() > 0;
      
      if (sectionExists) {
        console.log('✅ MerryStockPicks section found on page');
        
        // Check for error boundaries or crash indicators
        const errorBoundaryText = await page.locator('text=/something went wrong|error.*occurred|component.*crashed/i').count();
        
        if (errorBoundaryText === 0) {
          console.log('✅ No error boundaries detected');
        } else {
          console.log('⚠️ Error boundary detected - component may have crashed');
        }
      } else {
        console.log('ℹ️ MerryStockPicks section not found (may be conditionally rendered)');
      }

      // CRITICAL ASSERTION: No specific errors we fixed should occur
      expect(criticalErrors.length, `Found ${criticalErrors.length} critical errors: ${criticalErrors.join(', ')}`).toBe(0);

      console.log('\n🎉 VALIDATION COMPLETE: MerryStockPicks fixes are working correctly!');

    } catch (error) {
      console.log('❌ Test execution error:', error.message);
      throw error;
    }
  });

  test('Quick Component Render Test', async ({ page }) => {
    console.log('🧪 Quick component render test...');

    await page.goto('http://localhost:3010/', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });

    // Check that the page basic structure loads
    const bodyText = await page.textContent('body');
    expect(bodyText.length).toBeGreaterThan(50);

    // Check that no major crashes occurred (page should have some content)
    const hasContent = bodyText.includes('메르') || bodyText.includes('투자') || bodyText.includes('포스트');
    expect(hasContent).toBe(true);

    console.log('✅ Basic page structure and content loaded successfully');
  });
});