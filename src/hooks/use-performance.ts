'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  
  // Additional metrics
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  memoryUsage: number | null;
  connectionType: string | null;
  
  // Query performance
  queryHitRate: number;
  averageQueryTime: number;
}

interface PerformanceThresholds {
  lcp: { good: number; needs_improvement: number };
  fid: { good: number; needs_improvement: number };
  cls: { good: number; needs_improvement: number };
  fcp: { good: number; needs_improvement: number };
  ttfb: { good: number; needs_improvement: number };
}

const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  lcp: { good: 2500, needs_improvement: 4000 },
  fid: { good: 100, needs_improvement: 300 },
  cls: { good: 0.1, needs_improvement: 0.25 },
  fcp: { good: 1800, needs_improvement: 3000 },
  ttfb: { good: 800, needs_improvement: 1800 },
};

/**
 * Performance Monitoring Hook
 * Tracks Core Web Vitals and other performance metrics
 */
export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    navigationStart: 0,
    domContentLoaded: 0,
    loadComplete: 0,
    memoryUsage: null,
    connectionType: null,
    queryHitRate: 0,
    averageQueryTime: 0,
  });

  const [isSupported, setIsSupported] = useState(false);
  const queryClient = useQueryClient();

  // Check for browser support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      setIsSupported(true);
    }
  }, []);

  // Measure Core Web Vitals
  useEffect(() => {
    if (!isSupported) return undefined;

    // Initialize basic navigation metrics
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      setMetrics(prev => ({
        ...prev,
        navigationStart: navigation.loadEventStart - (navigation as any).navigationStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - (navigation as any).navigationStart,
        loadComplete: navigation.loadEventEnd - (navigation as any).navigationStart,
        ttfb: navigation.responseStart - (navigation as any).navigationStart,
      }));
    }

    // Measure FCP (First Contentful Paint)
    const measureFCP = () => {
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        setMetrics(prev => ({ ...prev, fcp: fcpEntry.startTime }));
      }
    };

    // Use Performance Observer for Core Web Vitals
    if ('PerformanceObserver' in window) {
      // LCP Observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
        }
      });

      // FID Observer
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-input') {
            const fid = (entry as any).processingStart - entry.startTime;
            setMetrics(prev => ({ ...prev, fid }));
          }
        });
      });

      // CLS Observer
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });
        setMetrics(prev => ({ ...prev, cls: clsValue }));
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        fidObserver.observe({ entryTypes: ['first-input'] });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        
        // Fallback for FCP
        measureFCP();
      } catch (error) {
        console.warn('PerformanceObserver not fully supported:', error);
      }

      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    }
    
    return undefined;
  }, [isSupported]);

  // Monitor memory usage
  useEffect(() => {
    if (!isSupported) return;

    const measureMemory = () => {
      // @ts-ignore - memory API is experimental
      if ('memory' in performance) {
        // @ts-ignore
        const memInfo = performance.memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: (memInfo as any).usedJSHeapSize / (1024 * 1024), // Convert to MB
        }));
      }
    };

    measureMemory();
    const interval = setInterval(measureMemory, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isSupported]);

  // Monitor connection type
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      // @ts-ignore
      const connection = navigator.connection;
      if (connection) {
        setMetrics(prev => ({ ...prev, connectionType: (connection as any).effectiveType }));
        
        const updateConnection = () => {
          setMetrics(prev => ({ ...prev, connectionType: (connection as any).effectiveType }));
        };

        (connection as any).addEventListener('change', updateConnection);
        return () => (connection as any).removeEventListener('change', updateConnection);
      }
    }
    return undefined;
  }, []);

  // Monitor React Query performance
  useEffect(() => {
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();
    
    if (queries.length > 0) {
      const hitCount = queries.filter(q => q.state.dataUpdatedAt > 0).length;
      const hitRate = hitCount / queries.length;
      
      // Calculate average query time (simplified)
      const totalTime = queries.reduce((acc, query) => {
        const fetchTime = query.state.dataUpdatedAt - (query.state as any).dataFetchedAt;
        return acc + (fetchTime > 0 ? fetchTime : 0);
      }, 0);
      
      const averageTime = queries.length > 0 ? totalTime / queries.length : 0;
      
      setMetrics(prev => ({
        ...prev,
        queryHitRate: hitRate,
        averageQueryTime: averageTime,
      }));
    }
  }, [queryClient]);

  // Performance rating helper
  const getRating = useCallback((metric: keyof PerformanceMetrics, value: number | null) => {
    if (value === null) return 'unknown';
    
    const thresholds = PERFORMANCE_THRESHOLDS[metric as keyof PerformanceThresholds];
    if (!thresholds) return 'unknown';
    
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.needs_improvement) return 'needs-improvement';
    return 'poor';
  }, []);

  // Overall performance score
  const getPerformanceScore = useCallback(() => {
    const scores = {
      lcp: metrics.lcp ? getRating('lcp', metrics.lcp) : 'unknown',
      fid: metrics.fid ? getRating('fid', metrics.fid) : 'unknown',
      cls: metrics.cls ? getRating('cls', metrics.cls) : 'unknown',
      fcp: metrics.fcp ? getRating('fcp', metrics.fcp) : 'unknown',
      ttfb: metrics.ttfb ? getRating('ttfb', metrics.ttfb) : 'unknown',
    };

    const validScores = Object.values(scores).filter(score => score !== 'unknown');
    if (validScores.length === 0) return 'unknown';

    const goodCount = validScores.filter(score => score === 'good').length;
    const poorCount = validScores.filter(score => score === 'poor').length;

    const goodRatio = goodCount / validScores.length;
    const poorRatio = poorCount / validScores.length;

    if (goodRatio >= 0.75) return 'good';
    if (poorRatio >= 0.25) return 'poor';
    return 'needs-improvement';
  }, [metrics, getRating]);

  // Log performance data (for debugging)
  const logPerformanceData = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group('Performance Metrics');
      console.table(metrics);
      console.log('Overall Score:', getPerformanceScore());
      console.groupEnd();
    }
  }, [metrics, getPerformanceScore]);

  // Send performance data to analytics (placeholder)
  const sendPerformanceData = useCallback(() => {
    // In production, you would send this to your analytics service
    // Example: analytics.track('performance', metrics);
    if (process.env.NODE_ENV === 'production') {
      // Implementation for analytics service
    }
  }, [metrics]);

  return {
    metrics,
    isSupported,
    getRating,
    getPerformanceScore,
    logPerformanceData,
    sendPerformanceData,
  };
}

/**
 * Hook for monitoring page load performance
 */
export function usePageLoadPerformance(pageName: string) {
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const startTime = performance.now();
    
    const handleLoad = () => {
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      setLoadTime(totalTime);
      setIsLoading(false);
      
      // Log page load time
      if (process.env.NODE_ENV === 'development') {
        console.log(`Page "${pageName}" loaded in ${totalTime.toFixed(2)}ms`);
      }
    };

    // Handle both immediate and delayed load
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, [pageName]);

  return {
    loadTime,
    isLoading,
    loadTimeFormatted: loadTime ? `${loadTime.toFixed(2)}ms` : null,
  };
}

/**
 * Hook for resource timing monitoring
 */
export function useResourceTiming() {
  const [resources, setResources] = useState<PerformanceResourceTiming[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('performance' in window)) return;

    const updateResources = () => {
      const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      setResources(resourceEntries);
    };

    updateResources();

    // Update periodically
    const interval = setInterval(updateResources, 5000);
    return () => clearInterval(interval);
  }, []);

  // Analyze resource performance
  const getResourceAnalysis = useCallback(() => {
    if (resources.length === 0) return null;

    const analysis = {
      totalResources: resources.length,
      totalSize: resources.reduce((acc, resource) => acc + (resource.transferSize || 0), 0),
      slowestResources: resources
        .filter(resource => resource.duration > 1000) // > 1 second
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5),
      resourcesByType: resources.reduce((acc, resource) => {
        const type = resource.name.split('.').pop() || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return analysis;
  }, [resources]);

  return {
    resources,
    analysis: getResourceAnalysis(),
  };
}