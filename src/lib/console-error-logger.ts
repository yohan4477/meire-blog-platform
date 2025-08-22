'use client';

/**
 * Console Error Logger - F12 콘솔 에러 자동 감지 및 로깅 시스템
 * 목적: 개발자 도구 F12 콘솔에서 발생하는 모든 에러를 자동으로 감지하여 섹션 오류 로그에 기록
 */

interface ConsoleErrorData {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  componentContext?: string;
  pageContext: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ErrorPattern {
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: '데이터' | 'API' | '렌더링' | '로직';
  description: string;
}

class ConsoleErrorLogger {
  private errorQueue: Set<string> = new Set();
  private isInitialized: boolean = false;
  private originalConsoleError: Function;
  private originalConsoleWarn: Function;
  private readonly maxQueueSize = 50; // 최대 큐 크기
  private readonly debounceTime = 1000; // 중복 에러 방지 (1초)
  
  // 🎯 에러 패턴 분류 시스템
  private readonly errorPatterns: ErrorPattern[] = [
    // Critical Errors (즉시 처리 필요)
    {
      pattern: /Cannot read properties of undefined|TypeError.*undefined/i,
      severity: 'critical',
      category: '로직',
      description: 'undefined 속성 접근 오류'
    },
    {
      pattern: /JSON\.parse.*Unexpected/i,
      severity: 'critical', 
      category: 'API',
      description: 'JSON 파싱 실패'
    },
    {
      pattern: /Network Error|Failed to fetch/i,
      severity: 'high',
      category: 'API',
      description: '네트워크 오류'
    },
    // High Priority Errors
    {
      pattern: /ChunkLoadError|Loading chunk \d+ failed/i,
      severity: 'high',
      category: '렌더링',
      description: '코드 스플리팅 로딩 실패'
    },
    {
      pattern: /Hydration.*failed|Text content does not match/i,
      severity: 'high',
      category: '렌더링',
      description: 'SSR Hydration 불일치'
    },
    // Medium Priority Errors
    {
      pattern: /Warning.*validateDOMNesting|Each child.*unique.*key/i,
      severity: 'medium',
      category: '렌더링',
      description: 'React DOM 구조 경고'
    },
    {
      pattern: /404.*Not Found/i,
      severity: 'medium',
      category: 'API',
      description: 'API 엔드포인트 없음'
    },
    // Low Priority Errors
    {
      pattern: /Warning.*deprecated|componentWillReceiveProps/i,
      severity: 'low',
      category: '로직',
      description: 'Deprecated API 사용'
    }
  ];

  constructor() {
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
  }

  /**
   * F12 콘솔 에러 감지 시스템 초기화
   */
  public initialize(): void {
    if (this.isInitialized) return;

    console.log('🔍 [Console Error Logger] F12 콘솔 에러 감지 시스템 시작...');
    
    // 1. console.error 오버라이드
    console.error = (...args: any[]) => {
      this.captureConsoleError('error', args);
      this.originalConsoleError.apply(console, args);
    };

    // 2. console.warn 오버라이드 (심각한 경고만)
    console.warn = (...args: any[]) => {
      this.captureConsoleError('warn', args);
      this.originalConsoleWarn.apply(console, args);
    };

    // 3. 전역 에러 핸들러 (window.onerror)
    window.addEventListener('error', (event) => {
      this.captureGlobalError(event);
    });

    // 4. Promise rejection 핸들러
    window.addEventListener('unhandledrejection', (event) => {
      this.captureUnhandledRejection(event);
    });

    // 5. Resource loading errors (이미지, 스크립트 등)
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.captureResourceError(event);
      }
    }, true);

    this.isInitialized = true;
    console.log('✅ [Console Error Logger] F12 콘솔 에러 감지 활성화 완료');
  }

  /**
   * F12 콘솔 에러 캡처 (console.error, console.warn)
   */
  private captureConsoleError(level: 'error' | 'warn', args: any[]): void {
    try {
      const message = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.message;
        if (typeof arg === 'object') return JSON.stringify(arg);
        return String(arg);
      }).join(' ');

      // 심각하지 않은 경고는 필터링
      if (level === 'warn' && !this.isSignificantWarning(message)) {
        return;
      }

      const errorData = this.buildErrorData(message, {
        level,
        stack: args.find(arg => arg instanceof Error)?.stack
      });

      this.processError(errorData);
    } catch (err) {
      // 로거 자체 오류 방지
      this.originalConsoleError.call(console, '[Console Error Logger] 캡처 실패:', err);
    }
  }

  /**
   * 전역 JavaScript 에러 캡처
   */
  private captureGlobalError(event: ErrorEvent): void {
    const errorData = this.buildErrorData(event.message, {
      level: 'error',
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
    
    this.processError(errorData);
  }

  /**
   * Promise rejection 캡처
   */
  private captureUnhandledRejection(event: PromiseRejectionEvent): void {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    
    const errorData = this.buildErrorData(`Unhandled Promise Rejection: ${message}`, {
      level: 'error',
      stack: reason instanceof Error ? reason.stack : undefined
    });
    
    this.processError(errorData);
  }

  /**
   * 리소스 로딩 에러 캡처 (이미지, 스크립트 등)
   */
  private captureResourceError(event: Event): void {
    const target = event.target as HTMLElement;
    const tagName = target?.tagName?.toLowerCase();
    const src = (target as any)?.src || (target as any)?.href;
    
    if (src) {
      const errorData = this.buildErrorData(`Resource loading failed: ${tagName} - ${src}`, {
        level: 'warn',
        source: src
      });
      
      this.processError(errorData);
    }
  }

  /**
   * 에러 데이터 구조 생성
   */
  private buildErrorData(message: string, options: {
    level: 'error' | 'warn';
    source?: string;
    lineno?: number;
    colno?: number;
    stack?: string;
  }): ConsoleErrorData {
    const { pattern, severity, category } = this.classifyError(message);
    
    return {
      message: message.substring(0, 1000), // 메시지 길이 제한
      source: options.source,
      lineno: options.lineno,
      colno: options.colno,
      stack: options.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      componentContext: this.extractComponentContext(options.stack),
      pageContext: this.extractPageContext(),
      severity
    };
  }

  /**
   * 에러 패턴 기반 분류
   */
  private classifyError(message: string): { pattern: ErrorPattern; severity: 'low' | 'medium' | 'high' | 'critical'; category: '데이터' | 'API' | '렌더링' | '로직' } {
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(message)) {
        return { pattern, severity: pattern.severity, category: pattern.category };
      }
    }
    
    // 기본 분류
    return {
      pattern: { pattern: /.*/, severity: 'medium', category: '로직', description: '분류되지 않은 에러' },
      severity: 'medium',
      category: '로직'
    };
  }

  /**
   * 컴포넌트 컨텍스트 추출 (스택 트레이스에서)
   */
  private extractComponentContext(stack?: string): string {
    if (!stack) return 'Unknown';
    
    // React 컴포넌트명 추출
    const componentMatch = stack.match(/at\s+([A-Z][a-zA-Z0-9]*)\s+/);
    if (componentMatch) {
      return componentMatch[1];
    }
    
    // 파일명에서 컴포넌트 추측
    const fileMatch = stack.match(/\/([A-Z][a-zA-Z0-9]*)\.[jt]sx?:/);
    if (fileMatch) {
      return fileMatch[1];
    }
    
    return 'Unknown';
  }

  /**
   * 페이지 컨텍스트 추출
   */
  private extractPageContext(): string {
    const path = window.location.pathname;
    const search = window.location.search;
    return `${path}${search}`;
  }

  /**
   * 중요한 경고인지 판단
   */
  private isSignificantWarning(message: string): boolean {
    const significantPatterns = [
      /validateDOMNesting/i,
      /unique.*key.*prop/i,
      /componentWillReceiveProps.*deprecated/i,
      /Failed.*load.*resource/i,
      /Hydration/i
    ];
    
    return significantPatterns.some(pattern => pattern.test(message));
  }

  /**
   * 에러 처리 및 섹션 오류 API로 전송
   */
  private processError(errorData: ConsoleErrorData): void {
    const errorKey = `${errorData.message.substring(0, 100)}-${errorData.pageContext}`;
    
    // 중복 방지
    if (this.errorQueue.has(errorKey)) {
      return;
    }
    
    this.errorQueue.add(errorKey);
    
    // 큐 크기 관리
    if (this.errorQueue.size > this.maxQueueSize) {
      const firstKey = this.errorQueue.values().next().value;
      this.errorQueue.delete(firstKey);
    }
    
    // Debounce 후 제거
    setTimeout(() => {
      this.errorQueue.delete(errorKey);
    }, this.debounceTime);
    
    // 섹션 오류 API로 전송
    this.sendToSectionErrorAPI(errorData);
  }

  /**
   * 섹션 오류 API로 에러 전송
   */
  private async sendToSectionErrorAPI(errorData: ConsoleErrorData): Promise<void> {
    // API 전송 실패가 무한루프를 만들지 않도록 강화된 조건부 처리
    if (errorData.message.includes('Console Error Logger') || 
        errorData.message.includes('Failed to fetch') ||
        errorData.message.includes('sendToSectionErrorAPI') ||
        errorData.message.includes('API 전송 실패') ||
        errorData.message.includes('TypeError: Failed to fetch')) {
      return; // 로거 자체 및 네트워크 에러는 API로 전송하지 않음
    }
    
    try {
      // 컴포넌트명 추출 및 섹션명 생성
      const componentName = errorData.componentContext || 'ConsoleError';
      const sectionName = errorData.severity === 'critical' ? 'critical-error' : 'console-log';
      
      const sectionErrorData = {
        componentName,
        sectionName,
        pagePath: errorData.pageContext,
        errorMessage: errorData.message,
        errorStack: errorData.stack,
        errorType: errorData.severity,
        errorCategory: this.classifyError(errorData.message).category,
        userAgent: errorData.userAgent,
        userAction: 'F12_CONSOLE_ERROR_DETECTED',
        apiCalls: [],
        componentProps: {
          severity: errorData.severity,
          source: errorData.source,
          lineno: errorData.lineno,
          colno: errorData.colno,
          consoleLevel: errorData.severity === 'critical' ? 'error' : 'warn'
        },
        stateSnapshot: {
          url: errorData.url,
          timestamp: errorData.timestamp,
          componentContext: errorData.componentContext
        }
      };

      // 우선순위에 따른 처리
      if (errorData.severity === 'critical') {
        console.error('🚨 [CRITICAL] F12 콘솔 크리티컬 에러 감지:', errorData.message);
      }

      // AbortController로 타임아웃 설정 (무한 대기 방지)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
      
      const response = await fetch('/api/section-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sectionErrorData),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        // 성공 로그도 조건부로만 출력 (스팸 방지)
        if (errorData.severity === 'critical') {
          console.log(`✅ [Console Logger] F12 크리티컬 에러 기록 완료: ${result.errorHash}`);
        }
      } else {
        // 단순히 무시하고 로그만 남김 (무한 루프 방지)
        // 상세 로깅은 개발 환경에서만 활성화
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ [Console Logger] API 응답 실패: ${response.status}`);
        }
      }
    } catch (err: any) {
      // 로거 자체 오류는 원본 console.error로만 처리 (무한 루프 완전 방지)
      // AbortError나 fetch 타임아웃은 무시 (정상적인 타임아웃)
      if (process.env.NODE_ENV === 'development' && 
          err.name !== 'AbortError' && 
          !err.message.includes('fetch')) {
        this.originalConsoleError.call(console, '[Console Logger] API 전송 실패:', err.message);
      }
    }
  }

  /**
   * 시스템 정리
   */
  public destroy(): void {
    if (!this.isInitialized) return;
    
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;
    
    // 이벤트 리스너는 컴포넌트 언마운트 시 자동 정리됨
    this.isInitialized = false;
    this.errorQueue.clear();
    
    console.log('🔄 [Console Error Logger] F12 콘솔 에러 감지 시스템 정리 완료');
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const consoleErrorLogger = new ConsoleErrorLogger();

// 자동 초기화 (클라이언트 사이드에서만)
if (typeof window !== 'undefined') {
  // 페이지 로드 완료 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      consoleErrorLogger.initialize();
    });
  } else {
    consoleErrorLogger.initialize();
  }
}