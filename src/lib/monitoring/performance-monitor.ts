export interface PerformanceMetrics {
  apiResponseTime: number;
  databaseQueryTime: number;
  componentRenderTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  errorRate: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  apiResponseTime: number;
  databaseQueryTime: number;
  componentRenderTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  errorRate: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private thresholds: PerformanceThresholds = {
    apiResponseTime: 500, // 500ms
    databaseQueryTime: 100, // 100ms
    componentRenderTime: 100, // 100ms
    cacheHitRate: 0.8, // 80%
    memoryUsage: 100 * 1024 * 1024, // 100MB
    errorRate: 0.01, // 1%
  };

  private alertCallbacks: ((metric: string, value: number, threshold: number) => void)[] = [];

  recordMetric(metric: Partial<PerformanceMetrics>): void {
    const completeMetric: PerformanceMetrics = {
      apiResponseTime: 0,
      databaseQueryTime: 0,
      componentRenderTime: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      errorRate: 0,
      timestamp: Date.now(),
      ...metric,
    };

    this.metrics.push(completeMetric);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    this.checkThresholds(completeMetric);
  }

  private checkThresholds(metric: PerformanceMetrics): void {
    Object.entries(this.thresholds).forEach(([key, threshold]) => {
      const value = metric[key as keyof PerformanceMetrics] as number;
      
      if (key === 'cacheHitRate' && value < threshold) {
        this.triggerAlert(key, value, threshold);
      } else if (key !== 'cacheHitRate' && value > threshold) {
        this.triggerAlert(key, value, threshold);
      }
    });
  }

  private triggerAlert(metric: string, value: number, threshold: number): void {
    console.warn(`🚨 Performance Alert: ${metric} = ${value} (threshold: ${threshold})`);
    this.alertCallbacks.forEach(callback => callback(metric, value, threshold));
  }

  onAlert(callback: (metric: string, value: number, threshold: number) => void): void {
    this.alertCallbacks.push(callback);
  }

  getMetrics(minutes: number = 10): PerformanceMetrics[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  getAverages(minutes: number = 10): Partial<PerformanceMetrics> {
    const recentMetrics = this.getMetrics(minutes);
    
    if (recentMetrics.length === 0) {
      return {};
    }

    const averages = recentMetrics.reduce(
      (acc, metric) => {
        acc.apiResponseTime += metric.apiResponseTime;
        acc.databaseQueryTime += metric.databaseQueryTime;
        acc.componentRenderTime += metric.componentRenderTime;
        acc.cacheHitRate += metric.cacheHitRate;
        acc.memoryUsage += metric.memoryUsage;
        acc.errorRate += metric.errorRate;
        return acc;
      },
      {
        apiResponseTime: 0,
        databaseQueryTime: 0,
        componentRenderTime: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
        errorRate: 0,
      }
    );

    const count = recentMetrics.length;
    return {
      apiResponseTime: averages.apiResponseTime / count,
      databaseQueryTime: averages.databaseQueryTime / count,
      componentRenderTime: averages.componentRenderTime / count,
      cacheHitRate: averages.cacheHitRate / count,
      memoryUsage: averages.memoryUsage / count,
      errorRate: averages.errorRate / count,
    };
  }

  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    details: Record<string, { value: number; threshold: number; status: string }>;
  } {
    const averages = this.getAverages(5); // Last 5 minutes
    const details: Record<string, { value: number; threshold: number; status: string }> = {};
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    Object.entries(this.thresholds).forEach(([key, threshold]) => {
      const value = (averages[key as keyof PerformanceMetrics] as number) || 0;
      let status = 'healthy';

      if (key === 'cacheHitRate') {
        if (value < threshold * 0.7) status = 'critical';
        else if (value < threshold * 0.9) status = 'warning';
      } else {
        if (value > threshold * 2) status = 'critical';
        else if (value > threshold * 1.5) status = 'warning';
      }

      details[key] = { value, threshold, status };
      
      if (status === 'critical') overallStatus = 'critical';
      else if (status === 'warning' && overallStatus !== 'critical') overallStatus = 'warning';
    });

    return { status: overallStatus, details };
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  setThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions for common measurements
export function measureApiCall<T>(
  apiCall: () => Promise<T>,
  metricName: string = 'api'
): Promise<T> {
  const startTime = Date.now();
  
  return apiCall()
    .then(result => {
      const responseTime = Date.now() - startTime;
      performanceMonitor.recordMetric({
        apiResponseTime: responseTime,
        timestamp: Date.now(),
      });
      
      if (responseTime > 500) {
        console.warn(`⚠️ Slow API response: ${metricName} took ${responseTime}ms`);
      }
      
      return result;
    })
    .catch(error => {
      const responseTime = Date.now() - startTime;
      performanceMonitor.recordMetric({
        apiResponseTime: responseTime,
        errorRate: 1,
        timestamp: Date.now(),
      });
      throw error;
    });
}

export function measureDatabaseQuery<T>(
  query: () => Promise<T>,
  queryName: string = 'db'
): Promise<T> {
  const startTime = Date.now();
  
  return query()
    .then(result => {
      const queryTime = Date.now() - startTime;
      performanceMonitor.recordMetric({
        databaseQueryTime: queryTime,
        timestamp: Date.now(),
      });
      
      if (queryTime > 100) {
        console.warn(`⚠️ Slow database query: ${queryName} took ${queryTime}ms`);
      }
      
      return result;
    })
    .catch(error => {
      const queryTime = Date.now() - startTime;
      performanceMonitor.recordMetric({
        databaseQueryTime: queryTime,
        errorRate: 1,
        timestamp: Date.now(),
      });
      throw error;
    });
}

export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  metricType: 'api' | 'db' | 'component' = 'api'
): T {
  return ((...args: any[]) => {
    const startTime = Date.now();
    
    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result
          .then(value => {
            const duration = Date.now() - startTime;
            const metricKey = `${metricType}ResponseTime` as keyof PerformanceMetrics;
            performanceMonitor.recordMetric({
              [metricKey]: duration,
              timestamp: Date.now(),
            } as Partial<PerformanceMetrics>);
            return value;
          })
          .catch(error => {
            const duration = Date.now() - startTime;
            const metricKey = `${metricType}ResponseTime` as keyof PerformanceMetrics;
            performanceMonitor.recordMetric({
              [metricKey]: duration,
              errorRate: 1,
              timestamp: Date.now(),
            } as Partial<PerformanceMetrics>);
            throw error;
          });
      } else {
        const duration = Date.now() - startTime;
        const metricKey = `${metricType}ResponseTime` as keyof PerformanceMetrics;
        performanceMonitor.recordMetric({
          [metricKey]: duration,
          timestamp: Date.now(),
        } as Partial<PerformanceMetrics>);
        return result;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const metricKey = `${metricType}ResponseTime` as keyof PerformanceMetrics;
      performanceMonitor.recordMetric({
        [metricKey]: duration,
        errorRate: 1,
        timestamp: Date.now(),
      } as Partial<PerformanceMetrics>);
      throw error;
    }
  }) as T;
}