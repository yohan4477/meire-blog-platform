'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  isReporting?: boolean;
  reportSent?: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
  level?: 'page' | 'component' | 'section';
  componentName?: string;
  sectionName?: string;
  showDetails?: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private startTime: number;
  private lastUserAction: string = '';
  private apiCallHistory: any[] = [];
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.startTime = Date.now();
    this.state = { 
      hasError: false,
      isReporting: false,
      reportSent: false
    };

    // 사용자 행동 및 API 호출 추적 시작
    this.trackUserActions();
    this.trackApiCalls();
  }

  // 🔍 사용자 행동 추적
  private trackUserActions() {
    if (typeof window === 'undefined') return;
    
    const actions = ['click', 'scroll', 'keydown', 'touchstart'];
    
    actions.forEach(action => {
      document.addEventListener(action, (e) => {
        const target = e.target as HTMLElement;
        const elementInfo = `${target.tagName}${target.className ? '.' + target.className.split(' ')[0] : ''}`;
        this.lastUserAction = `${action}:${elementInfo}@${Date.now()}`;
      });
    });
  }

  // 🌐 API 호출 추적
  private trackApiCalls() {
    if (typeof window === 'undefined') return;
    
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      const [url, options] = args;
      const callInfo = {
        url: url.toString(),
        method: options?.method || 'GET',
        timestamp: Date.now()
      };
      
      // 최근 10개 API 호출만 저장
      this.apiCallHistory = [...this.apiCallHistory.slice(-9), callInfo];
      
      return originalFetch.apply(this, args);
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // 섹션 오류 자동 리포팅
    this.reportSectionError(error, errorInfo);
  }

  // 📤 섹션 오류 자동 리포팅
  private async reportSectionError(error: Error, errorInfo: React.ErrorInfo) {
    const { level = 'component', componentName, sectionName } = this.props;
    
    // 중복 리포팅 방지
    if (this.state.isReporting || this.state.reportSent) return;
    
    this.setState({ isReporting: true });
    
    try {
      // 현재 페이지 경로
      const pagePath = typeof window !== 'undefined' ? window.location.pathname : '';
      
      // 오류 카테고리 자동 분류
      const errorCategory = this.categorizeError(error);
      
      // 컴포넌트 props 스냅샷 (민감한 데이터 제외)
      const propsSnapshot = this.sanitizeProps(this.props);
      
      // 오류 데이터 구성
      const errorData = {
        componentName: componentName || 'Unknown',
        sectionName: sectionName || level,
        pagePath,
        errorMessage: error.message,
        errorStack: error.stack,
        errorType: error.constructor.name,
        errorCategory,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        userAction: this.lastUserAction,
        apiCalls: this.apiCallHistory,
        componentProps: propsSnapshot,
        stateSnapshot: {
          level,
          hasError: true,
          errorId: this.state.errorId,
          timestamp: Date.now()
        }
      };
      
      console.group(`🚨 [SECTION ERROR] ${componentName || 'Unknown'}/${sectionName || level}`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Context:', errorData);
      console.groupEnd();
      
      // 섹션 오류 API로 전송
      const response = await fetch('/api/section-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ [SECTION ERROR] Reported: ${result.errorHash}`);
        
        // 해결 방법이 있으면 콘솔에 출력
        if (result.solutions && result.solutions.length > 0) {
          console.group('💡 추천 해결 방법:');
          result.solutions.forEach((sol: any, index: number) => {
            console.log(`${index + 1}. ${sol.title}`);
            if (sol.codeTemplate) {
              console.log('코드 템플릿:', sol.codeTemplate);
            }
          });
          console.groupEnd();
        }
        
        this.setState({ reportSent: true });
      } else {
        console.error('섹션 오류 리포팅 실패:', result.error);
      }
      
    } catch (reportError) {
      console.error('섹션 오류 리포팅 중 오류 발생:', reportError);
    } finally {
      this.setState({ isReporting: false });
    }
  }

  // 🏷️ 오류 카테고리 자동 분류
  private categorizeError(error: Error): '데이터' | 'API' | '렌더링' | '로직' {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    // API 관련 오류
    if (message.includes('fetch') || message.includes('network') || 
        message.includes('response') || stack.includes('api/')) {
      return 'API';
    }
    
    // 데이터 관련 오류
    if (message.includes('cannot read propert') || message.includes('undefined') ||
        message.includes('null') || message.includes('is not iterable')) {
      return '데이터';
    }
    
    // 렌더링 관련 오류
    if (message.includes('render') || message.includes('jsx') || 
        message.includes('component') || stack.includes('react')) {
      return '렌더링';
    }
    
    // 기본값: 로직 오류
    return '로직';
  }

  // 🧹 Props 정리 (민감한 데이터 제거)
  private sanitizeProps(props: any): any {
    if (!props || typeof props !== 'object') return {};
    
    const sanitized: any = {};
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
    
    Object.keys(props).forEach(key => {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof props[key] === 'function') {
        sanitized[key] = '[FUNCTION]';
      } else if (typeof props[key] === 'object' && props[key] !== null) {
        sanitized[key] = '[OBJECT]';
      } else {
        sanitized[key] = props[key];
      }
    });
    
    return sanitized;
  }

  retry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: undefined,
      reportSent: false
    });
    
    // 페이지 새로고침 (강력한 복구)
    if (this.props.level === 'page') {
      window.location.reload();
    }
  };

  // 🏠 홈으로 이동
  private handleGoHome = () => {
    window.location.href = '/';
  };

  // 📋 오류 정보 클립보드 복사
  private handleCopyErrorInfo = async () => {
    if (!this.state.error) return;
    
    const errorInfo = {
      errorId: this.state.errorId,
      component: this.props.componentName,
      section: this.props.sectionName,
      message: this.state.error.message,
      stack: this.state.error.stack?.split('\n').slice(0, 5).join('\n'),
      userAction: this.lastUserAction,
      timestamp: new Date().toISOString()
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
      alert('오류 정보가 클립보드에 복사되었습니다.');
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback, level = 'component', showDetails = false } = this.props;
      
      // 커스텀 fallback이 있으면 사용
      if (Fallback) {
        return <Fallback error={this.state.error} retry={this.retry} />;
      }

      // 컴포넌트 레벨 오류
      if (level === 'component') {
        return (
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">컴포넌트 오류</span>
            </div>
            {showDetails && (
              <p className="text-xs text-red-600 mt-1">
                {this.state.error?.message}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={this.retry}
              className="mt-2 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              다시 시도
            </Button>
          </div>
        );
      }
      
      // 섹션 레벨 오류
      if (level === 'section') {
        return (
          <div className="p-6 border border-red-200 rounded-xl bg-red-50">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                섹션 로딩 오류
              </h3>
              <p className="text-red-700 mb-4">
                이 섹션에서 일시적인 문제가 발생했습니다.
              </p>
              
              <div className="flex gap-3 justify-center">
                <Button onClick={this.retry} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  다시 시도
                </Button>
                
                {showDetails && (
                  <Button onClick={this.handleCopyErrorInfo} variant="outline">
                    <Bug className="w-4 h-4 mr-2" />
                    오류 정보 복사
                  </Button>
                )}
              </div>
              
              {this.state.reportSent && (
                <p className="text-xs text-green-600 mt-3">
                  ✅ 오류가 자동으로 보고되었습니다 (ID: {this.state.errorId})
                </p>
              )}
            </div>
          </div>
        );
      }

      // 페이지 레벨 오류
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              페이지 로딩 오류
            </h1>
            <p className="text-gray-600 mb-6">
              페이지를 불러오는 중 문제가 발생했습니다.
              잠시 후 다시 시도해주세요.
            </p>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={this.retry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                새로고침
              </Button>
              
              <Button onClick={this.handleGoHome} variant="outline">
                <Home className="w-4 h-4 mr-2" />
                홈으로
              </Button>
            </div>
            
            {this.state.reportSent && (
              <p className="text-sm text-green-600 mt-4">
                ✅ 오류가 자동으로 보고되었습니다<br/>
                <code className="text-xs">{this.state.errorId}</code>
              </p>
            )}
            
            {showDetails && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  기술적 세부사항 보기
                </summary>
                <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-auto">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack?.split('\n').slice(0, 10).join('\n')}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 안전한 API 호출 wrapper
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  retries: number = 3,
  fallback?: T
): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      console.warn(`API 호출 실패 (${i + 1}/${retries}):`, error);
      if (i === retries - 1) {
        if (fallback !== undefined) {
          return fallback;
        }
        return null;
      }
      // 재시도 전 잠깐 대기
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return null;
}

// 안전한 JSON 파싱
export function safeJsonParse<T>(jsonString: string, fallback?: T): T | null {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON 파싱 실패:', error);
    return fallback ?? null;
  }
}