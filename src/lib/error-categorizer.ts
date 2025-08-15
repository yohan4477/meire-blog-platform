/**
 * 섹션 오류 자동 카테고리화 시스템
 * 오류의 특성에 따라 자동으로 카테고리와 우선순위를 분류
 */

export enum ErrorCategory {
  PERFORMANCE = 'performance',
  UI_UX = 'ui_ux', 
  DATA = 'data',
  NETWORK = 'network',
  LOGIC_UNDEFINED = 'logic_undefined',
  LOGIC_TYPE = 'logic_type',
  LOGIC_NULL = 'logic_null',
  LOGIC_REFERENCE = 'logic_reference',
  LOGIC_SYNTAX = 'logic_syntax',
  SECURITY = 'security',
  COMPATIBILITY = 'compatibility',
  // AutoCapture 전용 카테고리 (실제 오류 유형 기반)
  AUTOCAPTURE_UNKNOWN = 'autocapture_unknown',           // 감지했으나 종류 불명
  AUTOCAPTURE_PERFORMANCE = 'autocapture_performance',   // 성능 관련 감지
  AUTOCAPTURE_UI_ERROR = 'autocapture_ui_error',         // UI 오류 감지
  AUTOCAPTURE_API_ERROR = 'autocapture_api_error'        // API/네트워크 오류 감지
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

    // 🤖 AutoCapture 관련 오류 (최우선 처리)
    if (this.isAutoCaptureError(component_name, section_name, error_message)) {
      return this.classifyAutoCaptureError(errorData);
    }

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

  // AutoCapture 오류 감지
  private static isAutoCaptureError(component: string, section: string, message: string): boolean {
    // AutoCapture 컴포넌트 직접 체크
    if (component.toLowerCase().includes('autocapture')) {
      return true;
    }
    
    // 자동 감지 관련 키워드
    const autoCaptureKeywords = [
      'auto-detected', 'pattern-detected', 'automatic', 'auto', '자동 감지',
      'err_', 'error id:', 'detection', 'tracking', 'monitoring'
    ];
    
    const text = `${component} ${section} ${message}`.toLowerCase();
    return autoCaptureKeywords.some(keyword => text.includes(keyword));
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

  // AutoCapture 오류 상세 분류 (실제 오류 유형 추론)
  private static classifyAutoCaptureError(errorData: any): ErrorClassification {
    const { error_message = '', section_name = '', component_name = '', page_path = '' } = errorData;
    const text = `${component_name} ${section_name} ${error_message} ${page_path}`.toLowerCase();
    
    let category: ErrorCategory;
    let severity = ErrorSeverity.MEDIUM;
    let tags = ['autocapture', 'detected'];
    let automatedSolution = '';
    let preventionTips: string[] = [];
    
    // 🚀 페이지 경로에서 오류 유형 추론
    if (page_path.includes('/merry/stocks') || page_path.includes('/chart')) {
      category = ErrorCategory.AUTOCAPTURE_UI_ERROR;
      tags.push('ui', 'chart', 'stocks');
      automatedSolution = '차트 또는 주식 페이지에서 UI 오류 감지됨 - 차트 렌더링 또는 데이터 로딩 문제 가능성';
      preventionTips = [
        '차트 렌더링 로직 점검',
        '주식 데이터 API 응답 확인',
        'UI 컴포넌트 에러 바운더리 강화'
      ];
    }
    // API 관련 경로
    else if (page_path.includes('/api') || text.includes('api') || text.includes('fetch')) {
      category = ErrorCategory.AUTOCAPTURE_API_ERROR;
      tags.push('api', 'network', 'backend');
      automatedSolution = 'API 호출 또는 네트워크 관련 오류 감지됨 - 서버 응답 또는 데이터 처리 문제';
      preventionTips = [
        'API 엔드포인트 상태 확인',
        '네트워크 연결 안정성 점검',
        'API 응답 데이터 검증 강화'
      ];
    }
    // 성능 관련 키워드
    else if (text.includes('timeout') || text.includes('slow') || text.includes('loading') || text.includes('performance')) {
      category = ErrorCategory.AUTOCAPTURE_PERFORMANCE;
      tags.push('performance', 'loading', 'timeout');
      automatedSolution = '성능 관련 오류 감지됨 - 로딩 시간 또는 응답 속도 문제';
      preventionTips = [
        '페이지 로딩 시간 최적화',
        '리소스 캐싱 전략 개선',
        '성능 모니터링 강화'
      ];
    }
    // UI 관련 키워드 (컴포넌트, 렌더링)
    else if (text.includes('component') || text.includes('render') || text.includes('ui') || text.includes('button')) {
      category = ErrorCategory.AUTOCAPTURE_UI_ERROR;
      tags.push('ui', 'component', 'render');
      automatedSolution = 'UI 컴포넌트 오류 감지됨 - 렌더링 또는 사용자 인터랙션 문제';
      preventionTips = [
        'React 컴포넌트 생명주기 검토',
        '사용자 인터랙션 로직 점검',
        '에러 바운더리 구현'
      ];
    }
    // 오류 ID만 있는 경우 (구체적 정보 없음)
    else if (text.includes('err_') || text.includes('error id')) {
      category = ErrorCategory.AUTOCAPTURE_UNKNOWN;
      tags.push('unknown', 'investigation-needed');
      severity = ErrorSeverity.HIGH; // 정체불명이므로 높은 우선순위
      automatedSolution = '⚠️ 오류 감지되었으나 구체적 원인 불명 - 추가 조사 필요';
      preventionTips = [
        '오류 ID를 통한 상세 로그 추적',
        '사용자 행동 패턴 분석',
        '시스템 전반적 상태 점검',
        '오류 컨텍스트 정보 수집 강화'
      ];
    }
    // 기타 (최소 정보만 있는 경우)
    else {
      category = ErrorCategory.AUTOCAPTURE_UNKNOWN;
      tags.push('generic', 'monitoring');
      severity = ErrorSeverity.LOW;
      automatedSolution = 'AutoCapture가 일반적인 오류 패턴을 감지했으나 세부사항 불명';
      preventionTips = [
        'AutoCapture 로깅 세부 수준 향상',
        '오류 컨텍스트 정보 추가 수집',
        '모니터링 정확도 개선'
      ];
    }
    
    return {
      category,
      subCategory: ErrorSubCategory.VALIDATION,
      severity,
      tags,
      automatedSolution,
      preventionTips
    };
  }

  // 로직 오류 상세 분류 (세분화)
  private static classifyLogicError(errorData: any): ErrorClassification {
    const { error_message = '', component_name = '', stack_trace = '' } = errorData;
    const text = `${error_message} ${component_name} ${stack_trace}`.toLowerCase();
    
    let category: ErrorCategory;
    let subCategory = ErrorSubCategory.UNDEFINED_REFERENCE;
    let severity = ErrorSeverity.MEDIUM;
    let tags = ['logic', 'code'];
    let automatedSolution = '';
    let preventionTips: string[] = [];
    
    // undefined/ReferenceError 관련
    if (text.includes('undefined') || text.includes('is not defined') || text.includes('reference')) {
      category = ErrorCategory.LOGIC_UNDEFINED;
      subCategory = ErrorSubCategory.UNDEFINED_REFERENCE;
      severity = ErrorSeverity.HIGH;
      tags.push('undefined', 'reference');
      automatedSolution = '변수 선언 확인 및 스코프 검증 자동 추가';
      preventionTips = [
        '변수 선언 전 사용 여부 확인',
        'ESLint no-undef 규칙 활성화',
        '스코프 체인 검토'
      ];
    }
    // TypeError 관련
    else if (text.includes('type') || text.includes('is not a function') || text.includes('cannot read property')) {
      category = ErrorCategory.LOGIC_TYPE;
      subCategory = ErrorSubCategory.TYPE_ERROR;
      severity = ErrorSeverity.HIGH;
      tags.push('type', 'function');
      automatedSolution = 'TypeScript 타입 가드 및 런타임 타입 검증 추가';
      preventionTips = [
        'TypeScript strict 모드 활성화',
        '타입 가드 함수 구현',
        '런타임 타입 검증 라이브러리 사용'
      ];
    }
    // null/undefined 접근
    else if (text.includes('null') || text.includes('cannot access') || text.includes('null pointer')) {
      category = ErrorCategory.LOGIC_NULL;
      subCategory = ErrorSubCategory.NULL_POINTER;
      severity = ErrorSeverity.CRITICAL;
      tags.push('null', 'access');
      automatedSolution = 'Optional chaining 및 null 체크 자동 추가';
      preventionTips = [
        'Optional chaining (?.) 사용',
        'Null 체크 로직 구현',
        'Default 값 설정'
      ];
    }
    // 문법 오류
    else if (text.includes('syntax') || text.includes('unexpected token') || text.includes('parsing')) {
      category = ErrorCategory.LOGIC_SYNTAX;
      subCategory = ErrorSubCategory.UNDEFINED_REFERENCE; // 기본값 사용
      severity = ErrorSeverity.CRITICAL;
      tags.push('syntax', 'parsing');
      automatedSolution = 'ESLint 및 Prettier 자동 수정 적용';
      preventionTips = [
        'ESLint 실시간 검사 활성화',
        'Prettier 자동 포맷팅',
        'IDE 문법 검사 도구 사용'
      ];
    }
    // 기타 참조 오류
    else {
      category = ErrorCategory.LOGIC_REFERENCE;
      subCategory = ErrorSubCategory.UNDEFINED_REFERENCE;
      severity = ErrorSeverity.MEDIUM;
      tags.push('reference', 'access');
      automatedSolution = '객체 속성 존재 여부 검증 및 안전한 접근 패턴 적용';
      preventionTips = [
        '객체 구조 분해 시 기본값 설정',
        'hasOwnProperty 검사 활용',
        '방어적 프로그래밍 패턴 적용'
      ];
    }
    
    return {
      category,
      subCategory,
      severity,
      tags,
      automatedSolution,
      preventionTips
    };
  }

  /**
   * 카테고리별 색상 매핑
   */
  static getCategoryColor(category: ErrorCategory | string): { 
    primary: string; 
    secondary: string; 
    background: string;
    icon: string;
  } {
    const colorMap: { [key: string]: { primary: string; secondary: string; background: string; icon: string } } = {
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
      [ErrorCategory.LOGIC_UNDEFINED]: {
        primary: '#8b5cf6',
        secondary: '#a78bfa',
        background: '#f3e8ff',
        icon: '❓'
      },
      [ErrorCategory.LOGIC_TYPE]: {
        primary: '#f59e0b',
        secondary: '#fbbf24',
        background: '#fef3c7',
        icon: '🔤'
      },
      [ErrorCategory.LOGIC_NULL]: {
        primary: '#ef4444',
        secondary: '#f87171',
        background: '#fee2e2',
        icon: '⚫'
      },
      [ErrorCategory.LOGIC_REFERENCE]: {
        primary: '#06b6d4',
        secondary: '#22d3ee',
        background: '#cffafe',
        icon: '🔗'
      },
      [ErrorCategory.LOGIC_SYNTAX]: {
        primary: '#dc2626',
        secondary: '#f87171',
        background: '#fee2e2',
        icon: '📝'
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
      },
      // AutoCapture 카테고리 색상 (실제 오류 유형 기반)
      [ErrorCategory.AUTOCAPTURE_UNKNOWN]: {
        primary: '#dc2626',
        secondary: '#f87171',
        background: '#fee2e2',
        icon: '❓'
      },
      [ErrorCategory.AUTOCAPTURE_PERFORMANCE]: {
        primary: '#ea580c',
        secondary: '#fb923c',
        background: '#fed7aa',
        icon: '⚡'
      },
      [ErrorCategory.AUTOCAPTURE_UI_ERROR]: {
        primary: '#8b5cf6',
        secondary: '#a78bfa',
        background: '#ede9fe',
        icon: '🎨'
      },
      [ErrorCategory.AUTOCAPTURE_API_ERROR]: {
        primary: '#0891b2',
        secondary: '#22d3ee',
        background: '#cffafe',
        icon: '🌐'
      }
    };

    return colorMap[category] || {
      primary: '#6b7280',
      secondary: '#9ca3af',
      background: '#f3f4f6', 
      icon: '🔧'
    };
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