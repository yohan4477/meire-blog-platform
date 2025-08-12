/**
 * 고급 로깅 및 모니터링 시스템
 * 구조화된 로깅, 메트릭 수집, 알림, 성능 추적을 통합 제공
 */

// 로그 레벨 정의
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

// 로그 엔트리 인터페이스
export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  component?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  duration?: number;
  metadata?: Record<string, any>;
  tags?: string[];
  stack?: string;
  context?: LogContext;
}

// 로그 컨텍스트
export interface LogContext {
  method?: string;
  url?: string;
  userAgent?: string;
  ip?: string;
  referrer?: string;
  statusCode?: number;
  requestSize?: number;
  responseSize?: number;
}

// 메트릭 타입
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
}

// 메트릭 엔트리
export interface MetricEntry {
  id: string;
  name: string;
  type: MetricType;
  value: number;
  timestamp: string;
  labels?: Record<string, string>;
  unit?: string;
}

// 알림 설정
export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled: boolean;
  channels: string[];
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  timeWindow: number;
  aggregation: 'avg' | 'sum' | 'max' | 'min' | 'count';
}

// 로그 전송 인터페이스
export interface LogTransport {
  name: string;
  level: LogLevel;
  send(entry: LogEntry): Promise<void>;
}

// 콘솔 전송
export class ConsoleTransport implements LogTransport {
  name = 'console';
  level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  async send(entry: LogEntry): Promise<void> {
    if (entry.level < this.level) return;

    const timestamp = new Date(entry.timestamp).toISOString();
    const levelName = LogLevel[entry.level];
    const component = entry.component ? `[${entry.component}]` : '';
    
    const logMessage = `${timestamp} ${levelName} ${component} ${entry.message}`;
    
    const consoleMethod = this.getConsoleMethod(entry.level);
    
    if (entry.metadata || entry.context) {
      consoleMethod(logMessage, {
        metadata: entry.metadata,
        context: entry.context,
        stack: entry.stack,
      });
    } else {
      consoleMethod(logMessage);
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }
}

// 파일 전송 (서버 환경용)
export class FileTransport implements LogTransport {
  name = 'file';
  level: LogLevel;
  private filePath: string;

  constructor(filePath: string, level: LogLevel = LogLevel.INFO) {
    this.filePath = filePath;
    this.level = level;
  }

  async send(entry: LogEntry): Promise<void> {
    if (entry.level < this.level) return;

    try {
      const logLine = JSON.stringify(entry) + '\n';
      
      // 서버 환경에서만 실행
      if (typeof window === 'undefined') {
        const fs = await import('fs');
        await fs.promises.appendFile(this.filePath, logLine, 'utf8');
      }
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
}

// 원격 전송 (로그 수집 서비스용)
export class RemoteTransport implements LogTransport {
  name = 'remote';
  level: LogLevel;
  private endpoint: string;
  private apiKey?: string;
  private batch: LogEntry[] = [];
  private batchSize: number;
  private flushInterval: number;
  private timer?: NodeJS.Timeout;

  constructor(config: {
    endpoint: string;
    apiKey?: string;
    level?: LogLevel;
    batchSize?: number;
    flushInterval?: number;
  }) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.level = config.level || LogLevel.INFO;
    this.batchSize = config.batchSize || 100;
    this.flushInterval = config.flushInterval || 30000; // 30초

    this.startBatchTimer();
  }

  async send(entry: LogEntry): Promise<void> {
    if (entry.level < this.level) return;

    this.batch.push(entry);

    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }
  }

  private startBatchTimer(): void {
    this.timer = setInterval(async () => {
      if (this.batch.length > 0) {
        await this.flush();
      }
    }, this.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const logsToSend = [...this.batch];
    this.batch = [];

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ logs: logsToSend }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
      // 실패한 로그를 다시 배치에 추가 (옵션)
      this.batch.unshift(...logsToSend);
    }
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    // 남은 로그 전송
    if (this.batch.length > 0) {
      this.flush().catch(console.error);
    }
  }
}

// 고급 로거
export class AdvancedLogger {
  private static instance: AdvancedLogger;
  private transports: LogTransport[] = [];
  private metrics: Map<string, MetricEntry[]> = new Map();
  private alertRules: AlertRule[] = [];
  private contextStack: LogContext[] = [];

  static getInstance(): AdvancedLogger {
    if (!AdvancedLogger.instance) {
      AdvancedLogger.instance = new AdvancedLogger();
    }
    return AdvancedLogger.instance;
  }

  // 전송 추가
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  // 컨텍스트 푸시
  pushContext(context: LogContext): void {
    this.contextStack.push(context);
  }

  // 컨텍스트 팝
  popContext(): LogContext | undefined {
    return this.contextStack.pop();
  }

  // 현재 컨텍스트 가져오기
  getCurrentContext(): LogContext {
    return this.contextStack.reduce((acc, context) => ({ ...acc, ...context }), {});
  }

  // 로그 메서드들
  trace(message: string, metadata?: Record<string, any>, component?: string): void {
    this.log(LogLevel.TRACE, message, metadata, component);
  }

  debug(message: string, metadata?: Record<string, any>, component?: string): void {
    this.log(LogLevel.DEBUG, message, metadata, component);
  }

  info(message: string, metadata?: Record<string, any>, component?: string): void {
    this.log(LogLevel.INFO, message, metadata, component);
  }

  warn(message: string, metadata?: Record<string, any>, component?: string): void {
    this.log(LogLevel.WARN, message, metadata, component);
  }

  error(message: string, error?: Error | any, metadata?: Record<string, any>, component?: string): void {
    const errorMetadata = {
      ...metadata,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };

    this.log(LogLevel.ERROR, message, errorMetadata, component, error?.stack);
  }

  fatal(message: string, error?: Error | any, metadata?: Record<string, any>, component?: string): void {
    const errorMetadata = {
      ...metadata,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };

    this.log(LogLevel.FATAL, message, errorMetadata, component, error?.stack);
  }

  // 성능 측정
  async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage?.().heapUsed || 0;

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage?.().heapUsed || 0;
      const memoryDelta = endMemory - startMemory;

      this.info(`Performance: ${operation} completed`, {
        ...metadata,
        duration,
        memoryDelta,
        success: true,
      }, 'Performance');

      this.recordMetric(`performance.${operation}.duration`, MetricType.TIMER, duration);
      this.recordMetric(`performance.${operation}.memory`, MetricType.GAUGE, memoryDelta);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.error(`Performance: ${operation} failed`, error, {
        ...metadata,
        duration,
        success: false,
      }, 'Performance');

      this.recordMetric(`performance.${operation}.errors`, MetricType.COUNTER, 1);
      
      throw error;
    }
  }

  // HTTP 요청 로깅
  logHTTPRequest(req: {
    method: string;
    url: string;
    userAgent?: string;
    ip?: string;
    userId?: string;
    requestSize?: number;
  }): void {
    this.info(`HTTP ${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      userAgent: req.userAgent,
      ip: req.ip,
      userId: req.userId,
      requestSize: req.requestSize,
    }, 'HTTP');

    this.recordMetric('http.requests.total', MetricType.COUNTER, 1, {
      method: req.method,
      endpoint: req.url,
    });
  }

  // HTTP 응답 로깅
  logHTTPResponse(res: {
    statusCode: number;
    responseSize?: number;
    duration?: number;
    requestId?: string;
  }): void {
    const level = res.statusCode >= 500 ? LogLevel.ERROR :
                  res.statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;

    this.log(level, `HTTP Response ${res.statusCode}`, {
      statusCode: res.statusCode,
      responseSize: res.responseSize,
      duration: res.duration,
      requestId: res.requestId,
    }, 'HTTP');

    this.recordMetric('http.responses.total', MetricType.COUNTER, 1, {
      status: Math.floor(res.statusCode / 100) * 100 + 'xx',
    });

    if (res.duration) {
      this.recordMetric('http.response.duration', MetricType.HISTOGRAM, res.duration);
    }
  }

  // 비즈니스 이벤트 로깅
  logBusinessEvent(event: {
    type: string;
    entity: string;
    action: string;
    userId?: string;
    metadata?: Record<string, any>;
  }): void {
    this.info(`Business Event: ${event.type}`, {
      eventType: event.type,
      entity: event.entity,
      action: event.action,
      userId: event.userId,
      ...event.metadata,
    }, 'Business');

    this.recordMetric(`business.events.${event.type}`, MetricType.COUNTER, 1, {
      entity: event.entity,
      action: event.action,
    });
  }

  // 보안 이벤트 로깅
  logSecurityEvent(event: {
    type: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'access_denied';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    userId?: string;
    ip?: string;
    details: Record<string, any>;
  }): void {
    const level = event.severity === 'CRITICAL' ? LogLevel.FATAL :
                  event.severity === 'HIGH' ? LogLevel.ERROR :
                  event.severity === 'MEDIUM' ? LogLevel.WARN : LogLevel.INFO;

    this.log(level, `Security Event: ${event.type}`, {
      securityEventType: event.type,
      severity: event.severity,
      userId: event.userId,
      ip: event.ip,
      ...event.details,
    }, 'Security');

    this.recordMetric(`security.events.${event.type}`, MetricType.COUNTER, 1, {
      severity: event.severity,
    });
  }

  // 메트릭 기록
  recordMetric(
    name: string,
    type: MetricType,
    value: number,
    labels?: Record<string, string>,
    unit?: string
  ): void {
    const metric: MetricEntry = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      value,
      timestamp: new Date().toISOString(),
      labels,
      unit,
    };

    const existingMetrics = this.metrics.get(name) || [];
    existingMetrics.push(metric);
    
    // 최근 1000개 메트릭만 유지
    if (existingMetrics.length > 1000) {
      existingMetrics.splice(0, existingMetrics.length - 1000);
    }
    
    this.metrics.set(name, existingMetrics);

    // 알림 규칙 확인
    this.checkAlertRules(metric);
  }

  // 메트릭 조회
  getMetrics(name?: string, timeRange?: { start: string; end: string }): MetricEntry[] {
    if (name) {
      const metrics = this.metrics.get(name) || [];
      if (timeRange) {
        const start = new Date(timeRange.start).getTime();
        const end = new Date(timeRange.end).getTime();
        return metrics.filter(m => {
          const timestamp = new Date(m.timestamp).getTime();
          return timestamp >= start && timestamp <= end;
        });
      }
      return metrics;
    }

    const allMetrics: MetricEntry[] = [];
    this.metrics.forEach(metrics => allMetrics.push(...metrics));
    
    if (timeRange) {
      const start = new Date(timeRange.start).getTime();
      const end = new Date(timeRange.end).getTime();
      return allMetrics.filter(m => {
        const timestamp = new Date(m.timestamp).getTime();
        return timestamp >= start && timestamp <= end;
      });
    }
    
    return allMetrics.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // 알림 규칙 추가
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  // 알림 규칙 확인
  private checkAlertRules(metric: MetricEntry): void {
    this.alertRules
      .filter(rule => rule.enabled && rule.condition.metric === metric.name)
      .forEach(rule => {
        const shouldAlert = this.evaluateAlertCondition(rule.condition, metric);
        if (shouldAlert) {
          this.triggerAlert(rule, metric);
        }
      });
  }

  // 알림 조건 평가
  private evaluateAlertCondition(condition: AlertCondition, currentMetric: MetricEntry): boolean {
    const metrics = this.getMetrics(condition.metric, {
      start: new Date(Date.now() - condition.timeWindow).toISOString(),
      end: new Date().toISOString(),
    });

    if (metrics.length === 0) return false;

    let aggregatedValue: number;
    
    switch (condition.aggregation) {
      case 'avg':
        aggregatedValue = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
        break;
      case 'sum':
        aggregatedValue = metrics.reduce((sum, m) => sum + m.value, 0);
        break;
      case 'max':
        aggregatedValue = Math.max(...metrics.map(m => m.value));
        break;
      case 'min':
        aggregatedValue = Math.min(...metrics.map(m => m.value));
        break;
      case 'count':
        aggregatedValue = metrics.length;
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case 'gt':
        return aggregatedValue > condition.threshold;
      case 'gte':
        return aggregatedValue >= condition.threshold;
      case 'lt':
        return aggregatedValue < condition.threshold;
      case 'lte':
        return aggregatedValue <= condition.threshold;
      case 'eq':
        return aggregatedValue === condition.threshold;
      default:
        return false;
    }
  }

  // 알림 트리거
  private triggerAlert(rule: AlertRule, metric: MetricEntry): void {
    this.error(`Alert triggered: ${rule.name}`, undefined, {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      metricName: metric.name,
      metricValue: metric.value,
      threshold: rule.condition.threshold,
    }, 'Alert');

    // 실제 구현에서는 알림 채널로 전송
    console.warn(`🚨 ALERT: ${rule.name} - ${metric.name} = ${metric.value}`);
  }

  // 코어 로깅 메서드
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    component?: string,
    stack?: string
  ): void {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      component,
      metadata,
      stack,
      context: this.getCurrentContext(),
    };

    // 모든 전송에 로그 전송
    this.transports.forEach(transport => {
      transport.send(entry).catch(error => {
        console.error(`Failed to send log to ${transport.name}:`, error);
      });
    });
  }

  // 시스템 상태 리포트
  generateSystemReport(): {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage | {};
    recentErrors: LogEntry[];
    topMetrics: { name: string; count: number }[];
    alertRulesCount: number;
  } {
    const uptime = process.uptime ? process.uptime() : 0;
    const memoryUsage = process.memoryUsage ? process.memoryUsage() : {};
    
    // 최근 에러 로그들 (실제 구현에서는 저장된 로그에서 조회)
    const recentErrors: LogEntry[] = [];
    
    // 상위 메트릭들
    const metricCounts = new Map<string, number>();
    this.metrics.forEach((entries, name) => {
      metricCounts.set(name, entries.length);
    });
    
    const topMetrics = Array.from(metricCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      uptime,
      memoryUsage,
      recentErrors,
      topMetrics,
      alertRulesCount: this.alertRules.length,
    };
  }

  // 정리
  destroy(): void {
    this.transports.forEach(transport => {
      if ('destroy' in transport && typeof transport.destroy === 'function') {
        transport.destroy();
      }
    });
  }
}

// 글로벌 로거 인스턴스
export const logger = AdvancedLogger.getInstance();

// 편의 함수들
export const trace = logger.trace.bind(logger);
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const fatal = logger.fatal.bind(logger);

// 성능 측정 데코레이터
export function measurePerformance(operationName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const operation = operationName || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      return logger.measurePerformance(operation, () => method.apply(this, args));
    };

    return descriptor;
  };
}

// 로깅 미들웨어 팩토리
export function createLoggingMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 요청 컨텍스트 설정
    logger.pushContext({
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers?.['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
    });

    // 요청 로깅
    logger.logHTTPRequest({
      method: req.method,
      url: req.url,
      userAgent: req.headers?.['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
      userId: req.user?.id,
      requestSize: req.headers?.['content-length'] ? parseInt(req.headers['content-length'], 10) : undefined,
    });

    // 응답 완료 시 로깅
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      logger.logHTTPResponse({
        statusCode: res.statusCode,
        duration,
        requestId,
        responseSize: res.get?.('content-length') ? parseInt(res.get('content-length'), 10) : undefined,
      });

      // 컨텍스트 제거
      logger.popContext();
    });

    next();
  };
}

// 에러 핸들링 미들웨어
export function createErrorLoggingMiddleware() {
  return (error: any, req: any, res: any, next: any) => {
    logger.error('Unhandled error in request', error, {
      method: req.method,
      url: req.url,
      userAgent: req.headers?.['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
      userId: req.user?.id,
    });

    // 보안 관련 에러인지 확인
    if (error.name === 'UnauthorizedError' || error.statusCode === 401) {
      logger.logSecurityEvent({
        type: 'auth_failure',
        severity: 'MEDIUM',
        userId: req.user?.id,
        ip: req.ip || req.connection?.remoteAddress,
        details: {
          url: req.url,
          method: req.method,
          error: error.message,
        },
      });
    }

    next(error);
  };
}

// 기본 설정 적용
logger.addTransport(new ConsoleTransport(LogLevel.INFO));

// 개발 환경에서 디버그 레벨 활성화
if (process.env.NODE_ENV === 'development') {
  logger.addTransport(new ConsoleTransport(LogLevel.DEBUG));
}

// 프로덕션 환경에서 파일 로깅
if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  logger.addTransport(new FileTransport('/var/log/app.log', LogLevel.INFO));
  
  // 원격 로그 서비스 설정 (환경 변수 기반)
  if (process.env.LOG_ENDPOINT) {
    logger.addTransport(new RemoteTransport({
      endpoint: process.env.LOG_ENDPOINT,
      apiKey: process.env.LOG_API_KEY,
      level: LogLevel.WARN, // 원격으로는 중요한 로그만
    }));
  }
}

// 기본 알림 규칙들
logger.addAlertRule({
  id: 'high_error_rate',
  name: 'High Error Rate',
  condition: {
    metric: 'http.responses.total',
    operator: 'gt',
    threshold: 10,
    timeWindow: 5 * 60 * 1000, // 5분
    aggregation: 'count',
  },
  severity: 'HIGH',
  enabled: true,
  channels: ['email', 'slack'],
});

logger.addAlertRule({
  id: 'slow_response_time',
  name: 'Slow Response Time',
  condition: {
    metric: 'http.response.duration',
    operator: 'gt',
    threshold: 5000, // 5초
    timeWindow: 10 * 60 * 1000, // 10분
    aggregation: 'avg',
  },
  severity: 'MEDIUM',
  enabled: true,
  channels: ['slack'],
});

export default AdvancedLogger;