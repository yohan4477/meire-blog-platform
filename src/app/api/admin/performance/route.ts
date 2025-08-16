import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';
import { performantDb } from '@/lib/db-performance';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minutes = parseInt(searchParams.get('minutes') || '10');
    
    // Get performance metrics
    const healthStatus = performanceMonitor.getHealthStatus();
    const averages = performanceMonitor.getAverages(minutes);
    const recentMetrics = performanceMonitor.getMetrics(minutes);
    
    // Get database cache stats
    const cacheStats = performantDb.getCacheStats();
    
    // Get system metrics
    const memoryUsage = process.memoryUsage();
    
    return NextResponse.json({
      success: true,
      data: {
        healthStatus,
        averages,
        cacheStats,
        systemMetrics: {
          memoryUsage: {
            rss: memoryUsage.rss,
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            external: memoryUsage.external,
          },
          uptime: process.uptime(),
          nodeVersion: process.version,
        },
        recentMetrics: recentMetrics.slice(-50), // Last 50 metrics
        recommendations: generateRecommendations(healthStatus, averages, cacheStats),
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Performance monitoring error:', error);
    return NextResponse.json({
      success: false,
      error: { message: 'Performance monitoring failed' }
    }, { status: 500 });
  }
}

function generateRecommendations(
  healthStatus: any,
  averages: any,
  cacheStats: any
): string[] {
  const recommendations: string[] = [];
  
  // API performance recommendations
  if (averages.apiResponseTime > 500) {
    recommendations.push('🚨 API responses are slow (>500ms). Consider optimizing database queries or adding caching.');
  }
  
  if (averages.apiResponseTime > 1000) {
    recommendations.push('💥 Critical: API responses exceed 1 second. Immediate optimization required.');
  }
  
  // Database performance recommendations
  if (averages.databaseQueryTime > 100) {
    recommendations.push('⚠️ Database queries are slow (>100ms). Check indexes and query optimization.');
  }
  
  // Cache recommendations
  if (averages.cacheHitRate < 0.7) {
    recommendations.push('📉 Low cache hit rate (<70%). Review caching strategy and TTL settings.');
  }
  
  if (cacheStats.expiredEntries > cacheStats.validEntries) {
    recommendations.push('🗑️ Too many expired cache entries. Consider cleanup or TTL adjustment.');
  }
  
  // Error rate recommendations
  if (averages.errorRate > 0.05) {
    recommendations.push('❌ High error rate (>5%). Investigate and fix recurring errors.');
  }
  
  // Memory recommendations
  if (averages.memoryUsage > 200 * 1024 * 1024) { // 200MB
    recommendations.push('💾 High memory usage (>200MB). Check for memory leaks or optimize data handling.');
  }
  
  // Component performance
  if (averages.componentRenderTime > 100) {
    recommendations.push('🎨 Slow component rendering (>100ms). Optimize React components and reduce re-renders.');
  }
  
  // Overall health recommendations
  if (healthStatus.status === 'critical') {
    recommendations.push('🚨 CRITICAL: System performance is severely degraded. Immediate action required.');
  } else if (healthStatus.status === 'warning') {
    recommendations.push('⚠️ WARNING: System performance is below optimal. Monitor closely.');
  } else if (recommendations.length === 0) {
    recommendations.push('✅ System performance is healthy. Continue monitoring.');
  }
  
  return recommendations;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;
    
    switch (action) {
      case 'clear-cache':
        performantDb.clearCache();
        return NextResponse.json({
          success: true,
          message: 'Cache cleared successfully'
        });
        
      case 'clear-metrics':
        performanceMonitor.clearMetrics();
        return NextResponse.json({
          success: true,
          message: 'Performance metrics cleared successfully'
        });
        
      case 'set-thresholds':
        performanceMonitor.setThresholds(data.thresholds);
        return NextResponse.json({
          success: true,
          message: 'Performance thresholds updated successfully'
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: { message: 'Unknown action' }
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Performance action error:', error);
    return NextResponse.json({
      success: false,
      error: { message: 'Performance action failed' }
    }, { status: 500 });
  }
}