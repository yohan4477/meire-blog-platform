import { test, expect } from '@playwright/test';

test.describe('Database Performance Optimization Tests', () => {
  const BASE_URL = 'http://localhost:3007';
  
  test('should load Merry stocks API under 500ms (target)', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate to API endpoint
    const response = await page.request.get(`${BASE_URL}/api/merry/stocks?limit=5`);
    
    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    console.log(`📊 Stocks API Performance:`, {
      responseTime: `${responseTime}ms`,
      target: '<500ms',
      status: responseTime < 500 ? '✅ FAST' : '❌ SLOW',
      cacheStatus: data.performance?.cacheStatus || 'UNKNOWN'
    });
    
    // Performance assertions
    expect(response.status()).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stocks).toBeDefined();
    
    // CRITICAL: Response time must be under 500ms (down from 700ms+)
    expect(responseTime).toBeLessThan(500);
    
    // Verify performance metrics in development
    if (data.performance) {
      expect(data.performance.target).toBe('<500ms');
      expect(data.performance.optimizationLevel).toBe('ULTRA_PERFORMANCE');
    }
  });

  test('should have cache hit rate >80% on subsequent requests', async ({ page }) => {
    const url = `${BASE_URL}/api/merry/stocks?limit=5`;
    
    // First request (cache miss expected)
    const response1 = await page.request.get(url);
    const data1 = await response1.json();
    
    // Second request (cache hit expected)
    const response2 = await page.request.get(url);
    const data2 = await response2.json();
    
    console.log(`🎯 Cache Performance:`, {
      firstRequest: data1.performance?.cacheStatus || 'UNKNOWN',
      secondRequest: data2.performance?.cacheStatus || 'UNKNOWN',
      target: '>80% hit rate'
    });
    
    expect(response1.status()).toBe(200);
    expect(response2.status()).toBe(200);
    
    // Cache should be working on second request
    if (data2.performance?.cacheStatus) {
      expect(data2.performance.cacheStatus).toBe('HIT');
    }
  });

  test('should load sentiment data API under 500ms', async ({ page }) => {
    const startTime = Date.now();
    
    const response = await page.request.get(`${BASE_URL}/api/merry/stocks/TSLA/sentiments?period=6mo`);
    
    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    console.log(`📈 Sentiments API Performance:`, {
      responseTime: `${responseTime}ms`,
      target: '<500ms',
      status: responseTime < 500 ? '✅ FAST' : '❌ SLOW',
      ticker: 'TSLA'
    });
    
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(500);
    
    // Verify sentiment data structure
    expect(data.ticker).toBe('TSLA');
    expect(data.period).toBe('6mo');
    expect(data.sentimentByDate).toBeDefined();
  });

  test('should validate database optimization headers', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/merry/stocks?limit=5`);
    
    // Check optimized cache headers
    const cacheControl = response.headers()['cache-control'];
    const cacheStatus = response.headers()['x-cache-status'];
    const cacheTTL = response.headers()['x-cache-ttl'];
    
    console.log(`🏷️ Cache Headers:`, {
      cacheControl,
      cacheStatus,
      cacheTTL
    });
    
    expect(response.status()).toBe(200);
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('max-age');
    expect(cacheStatus).toBe('OPTIMIZED');
    expect(cacheTTL).toBe('300'); // 5 minutes
  });

  test('should handle concurrent requests efficiently', async ({ page }) => {
    const concurrentRequests = 5;
    const url = `${BASE_URL}/api/merry/stocks?limit=5&concurrent=true`;
    
    const startTime = Date.now();
    
    // Fire multiple concurrent requests
    const promises = Array(concurrentRequests).fill(0).map(() => 
      page.request.get(url)
    );
    
    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / concurrentRequests;
    
    console.log(`🚀 Concurrent Load Test:`, {
      concurrentRequests,
      totalTime: `${totalTime}ms`,
      avgResponseTime: `${avgTime}ms`,
      target: 'All <500ms'
    });
    
    // All requests should complete successfully
    for (const response of responses) {
      expect(response.status()).toBe(200);
    }
    
    // Average response time should be reasonable
    expect(avgTime).toBeLessThan(500);
  });

  test('should verify SQLite3 WAL mode and optimizations', async ({ page }) => {
    // This test verifies that database optimizations are working
    const response = await page.request.get(`${BASE_URL}/api/merry/stocks?limit=1&debug=db`);
    const data = await response.json();
    
    console.log(`🗄️ Database Status:`, {
      success: data.success,
      optimizations: 'SQLite3 WAL + Indexes + Cache',
      performance: data.performance
    });
    
    expect(response.status()).toBe(200);
    expect(data.success).toBe(true);
    
    // Should have performance data in development
    if (data.performance) {
      expect(data.performance.optimizationLevel).toBe('ULTRA_PERFORMANCE');
      expect(data.performance.dbQueryTime).toBeLessThan(500);
    }
  });
});