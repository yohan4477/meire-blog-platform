/**
 * 섹션 오류 자동 카테고리화 시스템
 * 오류의 특성에 따라 자동으로 카테고리와 우선순위를 분류
 */

export enum ErrorCategory {
  PERFORMANCE = 'performance',
  UI_UX = 'ui_ux', 
  DATA = 'data',
  NETWORK = 'network',
  LOGIC = 'logic',
  SECURITY = 'security',
  COMPATIBILITY = 'compatibility'
}

export enum ErrorSubCategory {
  // Performance
  LOAD_TIME = 'load_time',
  RENDERING = 'rendering',
  MEMORY = 'memory',
  
  // UI/UX  
  RESPONSIVE = 'responsive',
  ACCESSIBILITY = 'accessibility',
  INTERACTION = 'interaction',
  
  // Data
  API_RESPONSE = 'api_response',
  DATABASE = 'database',
  VALIDATION = 'validation',
  
  // Network
  TIMEOUT = 'timeout',
  CONNECTION = 'connection',
  CORS = 'cors',
  
  // Logic
  UNDEFINED_REFERENCE = 'undefined_reference',
  TYPE_ERROR = 'type_error',
  NULL_POINTER = 'null_pointer',
  
  // Security
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  XSS = 'xss',
  
  // Compatibility
  BROWSER = 'browser',
  VERSION = 'version',
  DEVICE = 'device'
}

export enum ErrorSeverity {
  CRITICAL = 'critical',
  HIGH = 'high', 
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface ErrorClassification {
  category: ErrorCategory;
  subCategory: ErrorSubCategory;
  severity: ErrorSeverity;
  tags: string[];
  automatedSolution?: string;
  preventionTips?: string[];
}

export class ErrorCategorizer {
  
  /**
   * 섹션 오류를 자동으로 분류
   */
  static categorizeError(errorData: {
    component_name?: string;
    section_name?: string; 
    error_message?: string;
    page_path?: string;
    user_agent?: string;
    stack_trace?: string;
  }): ErrorClassification {
    
    const {
      component_name = '',
      section_name = '',
      error_message = '',
      page_path = '',
      user_agent = '',
      stack_trace = ''
    } = errorData;

    // 🎯 성능 관련 오류
    if (this.isPerformanceError(error_message, component_name, stack_trace)) {
      return this.classifyPerformanceError(errorData);
    }

    // 🎨 UI/UX 관련 오류  
    if (this.isUIError(component_name, section_name, error_message)) {
      return this.classifyUIError(errorData);
    }

    // 🗄️ 데이터 관련 오류
    if (this.isDataError(error_message, stack_trace)) {
      return this.classifyDataError(errorData);
    }

    // 🌐 네트워크 관련 오류
    if (this.isNetworkError(error_message, stack_trace)) {
      return this.classifyNetworkError(errorData);
    }

    // 🔒 보안 관련 오류
    if (this.isSecurityError(page_path, error_message, component_name)) {
      return this.classifySecurityError(errorData);
    }

    // 🖥️ 호환성 관련 오류
    if (this.isCompatibilityError(user_agent, error_message)) {
      return this.classifyCompatibilityError(errorData);
    }

    // 🔧 기본값: 로직 오류
    return this.classifyLogicError(errorData);
  }

  // 성능 오류 감지
  private static isPerformanceError(message: string, component: string, stack: string): boolean {
    const performanceKeywords = [
      'timeout', 'slow', 'memory', 'leak', 'performance', 
      'loading', 'render', 'lag', 'freeze', 'hang'
    ];
    
    const text = `${message} ${component} ${stack}`.toLowerCase();
    return performanceKeywords.some(keyword => text.includes(keyword));
  }

  // UI/UX 오류 감지
  private static isUIError(component: string, section: string, message: string): boolean {
    const uiComponents = ['Chart', 'Button', 'Modal', 'Dialog', 'Sheet', 'Input', 'Form'];
    const uiKeywords = ['click', 'hover', 'focus', 'scroll', 'resize', 'responsive', 'layout'];
    
    const hasUIComponent = uiComponents.some(comp => component.includes(comp));
    const hasUIKeyword = uiKeywords.some(keyword => 
      `${section} ${message}`.toLowerCase().includes(keyword)
    );
    
    return hasUIComponent || hasUIKeyword;
  }

  // 데이터 오류 감지
  private static isDataError(message: string, stack: string): boolean {
    const dataKeywords = [
      'undefined', 'null', 'json', 'parse', 'api', 'fetch', 
      'database', 'sql', 'query', 'validation', 'schema'
    ];
    
    const text = `${message} ${stack}`.toLowerCase();
    return dataKeywords.some(keyword => text.includes(keyword));
  }

  // 네트워크 오류 감지
  private static isNetworkError(message: string, stack: string): boolean {
    const networkKeywords = [
      'network', 'connection', 'cors', 'fetch failed', 
      '404', '500', '503', 'timeout', 'refused'
    ];
    
    const text = `${message} ${stack}`.toLowerCase();
    return networkKeywords.some(keyword => text.includes(keyword));
  }

  // 보안 오류 감지
  private static isSecurityError(path: string, message: string, component: string): boolean {
    const securityPaths = ['/admin', '/auth', '/login'];
    const securityKeywords = ['permission', 'unauthorized', 'forbidden', 'csrf', 'xss'];
    
    const hasSecurityPath = securityPaths.some(p => path.includes(p));
    const hasSecurityKeyword = securityKeywords.some(keyword => 
      `${message} ${component}`.toLowerCase().includes(keyword)
    );
    
    return hasSecurityPath || hasSecurityKeyword;
  }

  // 호환성 오류 감지
  private static isCompatibilityError(userAgent: string, message: string): boolean {
    const compatKeywords = ['unsupported', 'not supported', 'browser', 'webkit', 'moz'];
    
    const text = `${userAgent} ${message}`.toLowerCase();
    return compatKeywords.some(keyword => text.includes(keyword));
  }

  // 성능 오류 상세 분류
  private static classifyPerformanceError(errorData: any): ErrorClassification {
    const { error_message = '', component_name = '' } = errorData;
    
    let subCategory = ErrorSubCategory.RENDERING;
    let severity = ErrorSeverity.MEDIUM;
    
    if (error_message.toLowerCase().includes('timeout')) {
      subCategory = ErrorSubCategory.LOAD_TIME;
      severity = ErrorSeverity.HIGH;
    } else if (error_message.toLowerCase().includes('memory')) {
      subCategory = ErrorSubCategory.MEMORY;
      severity = ErrorSeverity.CRITICAL;
    }
    
    return {
      category: ErrorCategory.PERFORMANCE,
      subCategory,
      severity,
      tags: ['performance', 'optimization'],
      automatedSolution: '성능 모니터링 시스템에서 자동 감지 및 최적화 권장사항 적용',
      preventionTips: [
        '코드 분할 및 지연 로딩 구현',
        '메모리 누수 방지를 위한 정리 작업',
        '성능 프로파일링 정기 실행'
      ]
    };
  }

  // UI/UX 오류 상세 분류
  private static classifyUIError(errorData: any): ErrorClassification {
    const { section_name = '', error_message = '' } = errorData;
    
    let subCategory = ErrorSubCategory.INTERACTION;
    let severity = ErrorSeverity.MEDIUM;
    
    if (section_name.includes('responsive') || error_message.includes('mobile')) {
      subCategory = ErrorSubCategory.RESPONSIVE;
      severity = ErrorSeverity.HIGH;
    } else if (error_message.includes('accessibility')) {
      subCategory = ErrorSubCategory.ACCESSIBILITY;
      severity = ErrorSeverity.HIGH;
    }
    
    return {
      category: ErrorCategory.UI_UX,
      subCategory,
      severity,
      tags: ['ui', 'ux', 'interaction'],
      automatedSolution: 'UI 컴포넌트 자동 복구 및 접근성 개선 적용',
      preventionTips: [
        '반응형 디자인 테스트 자동화',
        'WCAG 접근성 가이드라인 준수',
        '다양한 디바이스에서 테스트'
      ]
    };
  }

  // 데이터 오류 상세 분류
  private static classifyDataError(errorData: any): ErrorClassification {
    const { error_message = '' } = errorData;
    
    let subCategory = ErrorSubCategory.VALIDATION;
    let severity = ErrorSeverity.MEDIUM;
    
    if (error_message.toLowerCase().includes('api') || error_message.includes('fetch')) {
      subCategory = ErrorSubCategory.API_RESPONSE;
      severity = ErrorSeverity.HIGH;
    } else if (error_message.toLowerCase().includes('database') || error_message.includes('sql')) {
      subCategory = ErrorSubCategory.DATABASE;
      severity = ErrorSeverity.CRITICAL;
    }
    
    return {
      category: ErrorCategory.DATA,
      subCategory,
      severity,
      tags: ['data', 'api', 'validation'],
      automatedSolution: '데이터 검증 및 에러 핸들링 자동 적용',
      preventionTips: [
        'API 응답 검증 강화',
        '데이터베이스 트랜잭션 관리',
        '입력값 검증 철저히 수행'
      ]
    };
  }

  // 네트워크 오류 상세 분류
  private static classifyNetworkError(errorData: any): ErrorClassification {
    const { error_message = '' } = errorData;
    
    let subCategory = ErrorSubCategory.CONNECTION;
    let severity = ErrorSeverity.HIGH;
    
    if (error_message.toLowerCase().includes('timeout')) {
      subCategory = ErrorSubCategory.TIMEOUT;
    } else if (error_message.toLowerCase().includes('cors')) {
      subCategory = ErrorSubCategory.CORS;
      severity = ErrorSeverity.MEDIUM;
    }
    
    return {
      category: ErrorCategory.NETWORK,
      subCategory,
      severity,
      tags: ['network', 'connection', 'api'],
      automatedSolution: '네트워크 재시도 로직 및 fallback 처리 적용',
      preventionTips: [
        '네트워크 타임아웃 적절히 설정',
        'CORS 정책 확인 및 설정',
        '네트워크 오류 복구 메커니즘 구현'
      ]
    };
  }

  // 보안 오류 상세 분류
  private static classifySecurityError(errorData: any): ErrorClassification {
    const { page_path = '', error_message = '' } = errorData;
    
    let subCategory = ErrorSubCategory.AUTHORIZATION;
    let severity = ErrorSeverity.CRITICAL;
    
    if (error_message.toLowerCase().includes('auth') || page_path.includes('/login')) {
      subCategory = ErrorSubCategory.AUTHENTICATION;
    } else if (error_message.toLowerCase().includes('xss')) {
      subCategory = ErrorSubCategory.XSS;
    }
    
    return {
      category: ErrorCategory.SECURITY,
      subCategory,
      severity,
      tags: ['security', 'authentication', 'authorization'],
      automatedSolution: '보안 정책 자동 적용 및 권한 검증 강화',
      preventionTips: [
        '인증/인가 로직 검증',
        '입력값 사니타이징',
        '보안 헤더 설정 확인'
      ]
    };
  }

  // 호환성 오류 상세 분류
  private static classifyCompatibilityError(errorData: any): ErrorClassification {
    const { user_agent = '', error_message = '' } = errorData;
    
    let subCategory = ErrorSubCategory.BROWSER;
    let severity = ErrorSeverity.MEDIUM;
    
    if (user_agent.toLowerCase().includes('mobile')) {
      subCategory = ErrorSubCategory.DEVICE;
    } else if (error_message.toLowerCase().includes('version')) {
      subCategory = ErrorSubCategory.VERSION;
    }
    
    return {
      category: ErrorCategory.COMPATIBILITY,
      subCategory,
      severity,
      tags: ['compatibility', 'browser', 'device'],
      automatedSolution: '브라우저 호환성 폴리필 자동 적용',
      preventionTips: [
        '다양한 브라우저에서 테스트',
        '폴리필 및 트랜스파일링 활용',
        '기능 감지 후 대체 방안 제공'
      ]
    };
  }

  // 로직 오류 상세 분류 (기본값)
  private static classifyLogicError(errorData: any): ErrorClassification {
    const { error_message = '' } = errorData;
    
    let subCategory = ErrorSubCategory.UNDEFINED_REFERENCE;
    let severity = ErrorSeverity.MEDIUM;
    
    if (error_message.toLowerCase().includes('type')) {
      subCategory = ErrorSubCategory.TYPE_ERROR;
    } else if (error_message.toLowerCase().includes('null')) {
      subCategory = ErrorSubCategory.NULL_POINTER;
    }
    
    return {
      category: ErrorCategory.LOGIC,
      subCategory,
      severity,
      tags: ['logic', 'code', 'bug'],
      automatedSolution: '타입 검증 및 null 체크 자동 추가',
      preventionTips: [
        'TypeScript 엄격 모드 사용',
        '단위 테스트 작성 강화',
        '코드 리뷰 프로세스 개선'
      ]
    };
  }

  /**
   * 카테고리별 색상 매핑
   */
  static getCategoryColor(category: ErrorCategory): { 
    primary: string; 
    secondary: string; 
    background: string;
    icon: string;
  } {
    const colorMap = {
      [ErrorCategory.PERFORMANCE]: {
        primary: '#f59e0b',
        secondary: '#fbbf24', 
        background: '#fef3c7',
        icon: '⚡'
      },
      [ErrorCategory.UI_UX]: {
        primary: '#8b5cf6',
        secondary: '#a78bfa',
        background: '#ede9fe', 
        icon: '🎨'
      },
      [ErrorCategory.DATA]: {
        primary: '#06b6d4',
        secondary: '#22d3ee',
        background: '#cffafe',
        icon: '🗄️'
      },
      [ErrorCategory.NETWORK]: {
        primary: '#10b981',
        secondary: '#34d399',
        background: '#d1fae5',
        icon: '🌐'
      },
      [ErrorCategory.LOGIC]: {
        primary: '#6b7280',
        secondary: '#9ca3af', 
        background: '#f3f4f6',
        icon: '🔧'
      },
      [ErrorCategory.SECURITY]: {
        primary: '#ef4444',
        secondary: '#f87171',
        background: '#fee2e2',
        icon: '🔒'
      },
      [ErrorCategory.COMPATIBILITY]: {
        primary: '#7c3aed',
        secondary: '#8b5cf6',
        background: '#f3e8ff',
        icon: '🖥️'
      }
    };

    return colorMap[category];
  }

  /**
   * 심각도별 색상 매핑  
   */
  static getSeverityColor(severity: ErrorSeverity): {
    primary: string;
    background: string; 
    icon: string;
  } {
    const severityColorMap = {
      [ErrorSeverity.CRITICAL]: {
        primary: '#dc2626',
        background: '#fee2e2',
        icon: '🚨'
      },
      [ErrorSeverity.HIGH]: {
        primary: '#ea580c', 
        background: '#fed7aa',
        icon: '⚠️'
      },
      [ErrorSeverity.MEDIUM]: {
        primary: '#ca8a04',
        background: '#fef3c7',
        icon: '⚡'
      },
      [ErrorSeverity.LOW]: {
        primary: '#16a34a',
        background: '#dcfce7', 
        icon: 'ℹ️'
      }
    };

    return severityColorMap[severity];
  }
}