/**
 * 에러 핸들링 및 모니터링 시스템
 * 중앙화된 에러 처리, 로깅, 알림, 메트릭 수집
 */

import { z } from 'zod';

// 에러 레벨 정의
export enum ErrorLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
  FATAL = 'fatal'
}

// 에러 카테고리
export enum ErrorCategory {
  API = 'api',
  DATABASE = 'database',
  CACHE = 'cache',
  EXTERNAL_SERVICE = 'external_service',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RATE_LIMIT = 'rate_limit',
  SYSTEM = 'system',
  BUSINESS_LOGIC = 'business_logic'
}

// 에러 컨텍스트 인터페이스
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  payload?: any;
  headers?: Record<string, string>;
  timestamp: string;
  environment: string;
  version: string;
  additionalData?: Record<string, any>;
}

// 구조화된 에러 클래스
export class StructuredError extends Error {
  public readonly id: string;
  public readonly level: ErrorLevel;
  public readonly category: ErrorCategory;
  public readonly code: string;
  public readonly context: ErrorContext;
  public readonly originalError?: Error;
  public readonly statusCode?: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    level: ErrorLevel,
    category: ErrorCategory,
    code: string,
    context: Partial<ErrorContext> = {},
    options: {
      originalError?: Error;
      statusCode?: number;
      isOperational?: boolean;
    } = {}
  ) {
    super(message);
    
    this.name = 'StructuredError';
    this.id = this.generateErrorId();
    this.level = level;
    this.category = category;
    this.code = code;
    this.originalError = options.originalError;
    this.statusCode = options.statusCode;
    this.isOperational = options.isOperational ?? true;
    
    this.context = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      ...context
    };

    // 스택 트레이스 설정
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StructuredError);
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      level: this.level,
      category: this.category,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

// 로그 출력 인터페이스
interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  critical(message: string, meta?: any): void;
}

// 기본 콘솔 로거
class ConsoleLogger implements Logger {
  debug(message: string, meta?: any): void {
    console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  info(message: string, meta?: any): void {
    console.info(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  error(message: string, meta?: any): void {
    console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  critical(message: string, meta?: any): void {
    console.error(`[CRITICAL] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }
}

// 에러 메트릭 수집기
class ErrorMetricsCollector {
  private metrics = {
    totalErrors: 0,
    errorsByLevel: new Map<ErrorLevel, number>(),
    errorsByCategory: new Map<ErrorCategory, number>(),
    errorsByCode: new Map<string, number>(),
    errorsByEndpoint: new Map<string, number>(),
    recentErrors: [] as any[],
    errorTrends: [] as any[]
  };

  recordError(error: StructuredError): void {
    this.metrics.totalErrors++;
    
    // 레벨별 카운트
    const levelCount = this.metrics.errorsByLevel.get(error.level) || 0;
    this.metrics.errorsByLevel.set(error.level, levelCount + 1);
    
    // 카테고리별 카운트
    const categoryCount = this.metrics.errorsByCategory.get(error.category) || 0;
    this.metrics.errorsByCategory.set(error.category, categoryCount + 1);
    
    // 에러 코드별 카운트
    const codeCount = this.metrics.errorsByCode.get(error.code) || 0;
    this.metrics.errorsByCode.set(error.code, codeCount + 1);
    
    // 엔드포인트별 카운트
    if (error.context.endpoint) {
      const endpointCount = this.metrics.errorsByEndpoint.get(error.context.endpoint) || 0;
      this.metrics.errorsByEndpoint.set(error.context.endpoint, endpointCount + 1);
    }
    
    // 최근 에러 목록 유지 (최대 100개)
    this.metrics.recentErrors.unshift({
      id: error.id,
      level: error.level,
      category: error.category,
      code: error.code,
      message: error.message,
      timestamp: error.context.timestamp,
      endpoint: error.context.endpoint
    });
    
    if (this.metrics.recentErrors.length > 100) {
      this.metrics.recentErrors = this.metrics.recentErrors.slice(0, 100);
    }

    // 시간별 트렌드 기록
    this.recordErrorTrend(error);
  }

  private recordErrorTrend(error: StructuredError): void {
    const hour = new Date().getHours();
    const today = new Date().toDateString();
    
    let todayTrend = this.metrics.errorTrends.find(t => t.date === today);
    if (!todayTrend) {
      todayTrend = {
        date: today,
        hourlyErrors: new Array(24).fill(0)
      };
      this.metrics.errorTrends.push(todayTrend);
    }
    
    todayTrend.hourlyErrors[hour]++;
    
    // 최근 7일 데이터만 유지
    this.metrics.errorTrends = this.metrics.errorTrends.slice(-7);
  }

  getMetrics() {
    return {
      summary: {
        totalErrors: this.metrics.totalErrors,
        errorRate: this.calculateErrorRate(),
        criticalErrors: this.metrics.errorsByLevel.get(ErrorLevel.CRITICAL) || 0,
        topErrorCode: this.getTopErrorCode(),
        topErrorEndpoint: this.getTopErrorEndpoint()
      },
      breakdown: {
        byLevel: Object.fromEntries(this.metrics.errorsByLevel),
        byCategory: Object.fromEntries(this.metrics.errorsByCategory),
        byCode: Object.fromEntries(this.metrics.errorsByCode),
        byEndpoint: Object.fromEntries(this.metrics.errorsByEndpoint)
      },
      recentErrors: this.metrics.recentErrors.slice(0, 20),
      trends: this.metrics.errorTrends
    };
  }

  private calculateErrorRate(): number {
    // 간단한 에러율 계산 (실제로는 총 요청 수 대비)
    const recentHours = 24;
    const recentErrorCount = this.metrics.recentErrors.filter(e => {
      const errorTime = new Date(e.timestamp);
      const cutoff = new Date(Date.now() - recentHours * 60 * 60 * 1000);
      return errorTime > cutoff;
    }).length;
    
    return recentErrorCount / recentHours; // 시간당 평균 에러 수
  }

  private getTopErrorCode(): string | null {
    let maxCount = 0;
    let topCode = null;
    
    for (const [code, count] of this.metrics.errorsByCode) {
      if (count > maxCount) {
        maxCount = count;
        topCode = code;
      }
    }
    
    return topCode;
  }

  private getTopErrorEndpoint(): string | null {
    let maxCount = 0;
    let topEndpoint = null;
    
    for (const [endpoint, count] of this.metrics.errorsByEndpoint) {
      if (count > maxCount) {
        maxCount = count;
        topEndpoint = endpoint;
      }
    }
    
    return topEndpoint;
  }

  reset(): void {
    this.metrics = {
      totalErrors: 0,
      errorsByLevel: new Map(),
      errorsByCategory: new Map(),
      errorsByCode: new Map(),
      errorsByEndpoint: new Map(),
      recentErrors: [],
      errorTrends: []
    };
  }
}

// 알림 시스템 인터페이스
interface NotificationService {
  sendAlert(error: StructuredError): Promise<void>;
}

// 이메일 알림 서비스 (예시)
class EmailNotificationService implements NotificationService {
  async sendAlert(error: StructuredError): Promise<void> {
    // 실제 이메일 전송 로직
    console.log(`Email alert sent for error: ${error.id}`);
  }
}

// Slack 알림 서비스 (예시)
class SlackNotificationService implements NotificationService {
  constructor(private webhookUrl: string) {}

  async sendAlert(error: StructuredError): Promise<void> {
    try {
      const payload = {
        text: `🚨 Critical Error Alert`,
        attachments: [{
          color: 'danger',
          fields: [
            { title: 'Error ID', value: error.id, short: true },
            { title: 'Level', value: error.level, short: true },
            { title: 'Category', value: error.category, short: true },
            { title: 'Code', value: error.code, short: true },
            { title: 'Message', value: error.message, short: false },
            { title: 'Endpoint', value: error.context.endpoint || 'N/A', short: true },
            { title: 'Timestamp', value: error.context.timestamp, short: true }
          ]
        }]
      };

      // 실제 Slack 웹훅 호출
      // await fetch(this.webhookUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload)
      // });
      
      console.log(`Slack alert sent for error: ${error.id}`);
    } catch (err) {
      console.error('Failed to send Slack alert:', err);
    }
  }
}

// 메인 에러 핸들러 클래스
export class ErrorHandler {
  private logger: Logger;
  private metrics: ErrorMetricsCollector;
  private notificationServices: NotificationService[] = [];
  private config: {
    enableMetrics: boolean;
    enableNotifications: boolean;
    notificationThreshold: ErrorLevel;
    enableStackTrace: boolean;
    enableContextCapture: boolean;
  };

  constructor(
    logger?: Logger,
    config: Partial<typeof ErrorHandler.prototype.config> = {}
  ) {
    this.logger = logger || new ConsoleLogger();
    this.metrics = new ErrorMetricsCollector();
    this.config = {
      enableMetrics: true,
      enableNotifications: true,
      notificationThreshold: ErrorLevel.ERROR,
      enableStackTrace: true,
      enableContextCapture: true,
      ...config
    };
  }

  /**
   * 알림 서비스 추가
   */
  addNotificationService(service: NotificationService): void {
    this.notificationServices.push(service);
  }

  /**
   * 에러 처리 메인 메서드
   */
  async handleError(error: Error | StructuredError, context?: Partial<ErrorContext>): Promise<void> {
    let structuredError: StructuredError;

    if (error instanceof StructuredError) {
      structuredError = error;
      // 컨텍스트 병합
      if (context) {
        structuredError.context = { ...structuredError.context, ...context };
      }
    } else {
      // 일반 Error를 StructuredError로 변환
      structuredError = this.convertToStructuredError(error, context);
    }

    // 로깅
    this.logError(structuredError);

    // 메트릭 수집
    if (this.config.enableMetrics) {
      this.metrics.recordError(structuredError);
    }

    // 알림 전송
    if (this.config.enableNotifications && this.shouldSendNotification(structuredError)) {
      await this.sendNotifications(structuredError);
    }

    // 추가 처리 (예: 외부 모니터링 서비스)
    await this.processAdditionalHandling(structuredError);
  }

  /**
   * API 에러 처리 (Next.js API Routes용)
   */
  handleAPIError(error: Error | StructuredError, request?: any): {
    statusCode: number;
    response: any;
  } {
    let structuredError: StructuredError;

    if (error instanceof StructuredError) {
      structuredError = error;
    } else {
      structuredError = this.convertToStructuredError(error, this.extractRequestContext(request));
    }

    // 에러 처리
    this.handleError(structuredError);

    // API 응답 생성
    const statusCode = structuredError.statusCode || this.getStatusCodeFromCategory(structuredError.category);
    
    const response = {
      success: false,
      error: {
        id: structuredError.id,
        code: structuredError.code,
        message: this.shouldExposeMessage(structuredError) ? structuredError.message : 'An error occurred',
        category: structuredError.category,
        timestamp: structuredError.context.timestamp
      },
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          stack: structuredError.stack,
          context: structuredError.context,
          originalError: structuredError.originalError
        }
      })
    };

    return { statusCode, response };
  }

  /**
   * 에러 메트릭 조회
   */
  getMetrics() {
    return this.metrics.getMetrics();
  }

  /**
   * 메트릭 리셋
   */
  resetMetrics(): void {
    this.metrics.reset();
  }

  /**
   * 헬스 체크
   */
  getHealthStatus() {
    const metrics = this.metrics.getMetrics();
    const criticalErrors = metrics.summary.criticalErrors;
    const errorRate = metrics.summary.errorRate;

    return {
      status: criticalErrors > 10 || errorRate > 50 ? 'unhealthy' : 'healthy',
      errorSummary: metrics.summary,
      timestamp: new Date().toISOString()
    };
  }

  // Private 헬퍼 메서드들

  private convertToStructuredError(error: Error, context?: Partial<ErrorContext>): StructuredError {
    // 에러 타입에 따른 카테고리 추론
    let category = ErrorCategory.SYSTEM;
    let level = ErrorLevel.ERROR;
    let code = 'UNKNOWN_ERROR';

    if (error.name === 'ValidationError') {
      category = ErrorCategory.VALIDATION;
      level = ErrorLevel.WARNING;
      code = 'VALIDATION_FAILED';
    } else if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      category = ErrorCategory.SYSTEM;
      level = ErrorLevel.ERROR;
      code = 'RUNTIME_ERROR';
    } else if (error.message.includes('fetch')) {
      category = ErrorCategory.EXTERNAL_SERVICE;
      level = ErrorLevel.ERROR;
      code = 'EXTERNAL_API_ERROR';
    }

    return new StructuredError(
      error.message,
      level,
      category,
      code,
      context || {},
      { originalError: error }
    );
  }

  private extractRequestContext(request?: any): Partial<ErrorContext> {
    if (!request || !this.config.enableContextCapture) {
      return {};
    }

    return {
      endpoint: request.url || request.path,
      method: request.method,
      ipAddress: request.ip || request.headers?.['x-forwarded-for'] || request.headers?.['x-real-ip'],
      userAgent: request.headers?.['user-agent'],
      headers: request.headers,
      requestId: request.headers?.['x-request-id'] || `req_${Date.now()}`
    };
  }

  private logError(error: StructuredError): void {
    const logMethod = this.getLogMethod(error.level);
    const logMessage = `${error.category.toUpperCase()}: ${error.message}`;
    
    logMethod.call(this.logger, logMessage, {
      errorId: error.id,
      code: error.code,
      context: error.context,
      ...(this.config.enableStackTrace && { stack: error.stack })
    });
  }

  private getLogMethod(level: ErrorLevel): Function {
    switch (level) {
      case ErrorLevel.DEBUG:
        return this.logger.debug;
      case ErrorLevel.INFO:
        return this.logger.info;
      case ErrorLevel.WARNING:
        return this.logger.warn;
      case ErrorLevel.ERROR:
        return this.logger.error;
      case ErrorLevel.CRITICAL:
      case ErrorLevel.FATAL:
        return this.logger.critical;
      default:
        return this.logger.error;
    }
  }

  private shouldSendNotification(error: StructuredError): boolean {
    const levelPriority = {
      [ErrorLevel.DEBUG]: 0,
      [ErrorLevel.INFO]: 1,
      [ErrorLevel.WARNING]: 2,
      [ErrorLevel.ERROR]: 3,
      [ErrorLevel.CRITICAL]: 4,
      [ErrorLevel.FATAL]: 5
    };

    return levelPriority[error.level] >= levelPriority[this.config.notificationThreshold];
  }

  private async sendNotifications(error: StructuredError): Promise<void> {
    const notifications = this.notificationServices.map(service => 
      service.sendAlert(error).catch(err => 
        console.error('Notification service failed:', err)
      )
    );

    await Promise.allSettled(notifications);
  }

  private async processAdditionalHandling(error: StructuredError): Promise<void> {
    // 외부 모니터링 서비스 (Sentry, DataDog 등)로 전송
    // 실제 구현에서는 해당 서비스들의 SDK 사용
    
    try {
      // 예: Sentry.captureException(error);
      console.log(`Additional processing for error: ${error.id}`);
    } catch (err) {
      console.error('Additional error processing failed:', err);
    }
  }

  private getStatusCodeFromCategory(category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.VALIDATION:
        return 400;
      case ErrorCategory.AUTHENTICATION:
        return 401;
      case ErrorCategory.AUTHORIZATION:
        return 403;
      case ErrorCategory.RATE_LIMIT:
        return 429;
      case ErrorCategory.EXTERNAL_SERVICE:
        return 502;
      case ErrorCategory.DATABASE:
      case ErrorCategory.CACHE:
        return 503;
      default:
        return 500;
    }
  }

  private shouldExposeMessage(error: StructuredError): boolean {
    // 운영 환경에서는 민감한 에러 메시지 숨김
    if (process.env.NODE_ENV === 'production') {
      const safeCategories = [
        ErrorCategory.VALIDATION,
        ErrorCategory.AUTHENTICATION,
        ErrorCategory.AUTHORIZATION,
        ErrorCategory.RATE_LIMIT
      ];
      return safeCategories.includes(error.category);
    }
    return true;
  }
}

// 전역 에러 핸들러 인스턴스
let globalErrorHandler: ErrorHandler | null = null;

export function getGlobalErrorHandler(): ErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new ErrorHandler();
    
    // Slack 알림 설정 (환경 변수가 있는 경우)
    if (process.env.SLACK_WEBHOOK_URL) {
      globalErrorHandler.addNotificationService(
        new SlackNotificationService(process.env.SLACK_WEBHOOK_URL)
      );
    }
  }
  return globalErrorHandler;
}

// 에러 팩토리 함수들
export const createAPIError = (message: string, code: string, statusCode: number, context?: Partial<ErrorContext>) =>
  new StructuredError(message, ErrorLevel.ERROR, ErrorCategory.API, code, context, { statusCode });

export const createValidationError = (message: string, context?: Partial<ErrorContext>) =>
  new StructuredError(message, ErrorLevel.WARNING, ErrorCategory.VALIDATION, 'VALIDATION_ERROR', context, { statusCode: 400 });

export const createAuthError = (message: string, context?: Partial<ErrorContext>) =>
  new StructuredError(message, ErrorLevel.WARNING, ErrorCategory.AUTHENTICATION, 'AUTH_ERROR', context, { statusCode: 401 });

export const createRateLimitError = (message: string, context?: Partial<ErrorContext>) =>
  new StructuredError(message, ErrorLevel.WARNING, ErrorCategory.RATE_LIMIT, 'RATE_LIMIT_ERROR', context, { statusCode: 429 });

export const createExternalServiceError = (message: string, service: string, context?: Partial<ErrorContext>) =>
  new StructuredError(message, ErrorLevel.ERROR, ErrorCategory.EXTERNAL_SERVICE, `EXTERNAL_${service.toUpperCase()}_ERROR`, context, { statusCode: 502 });

export default ErrorHandler;