'use client';

import React, { ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug, ExternalLink } from 'lucide-react';
import { ApiError } from '@/types';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'section';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorId: this.generateErrorId()
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate error ID without instance method call to prevent issues
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    const errorId = `err_${timestamp}_${random}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to log to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo, this.state.errorId);
    }
  }

  generateErrorId(): string {
    // Fixed error ID generation to prevent infinite loops
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `err_${timestamp}_${random}`;
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      errorId: this.generateErrorId()
    });
  };

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI based on level
      return (
        <ErrorFallback
          error={this.state.error!}
          errorInfo={this.state.errorInfo!}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          showDetails={this.props.showDetails ?? false}
          level={this.props.level ?? 'component'}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  onRetry?: () => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'section';
}

function ErrorFallback({
  error,
  errorInfo,
  errorId,
  onRetry,
  showDetails = false,
  level = 'component'
}: ErrorFallbackProps) {
  const getErrorLevel = () => {
    switch (level) {
      case 'page':
        return {
          title: '페이지 로딩 오류',
          description: '페이지를 로드하는 중 오류가 발생했습니다.',
          icon: AlertTriangle,
          showHome: true
        };
      case 'section':
        return {
          title: '섹션 오류',
          description: '이 섹션을 표시하는 중 오류가 발생했습니다.',
          icon: Bug,
          showHome: false
        };
      default:
        return {
          title: '컴포넌트 오류',
          description: '구성 요소를 렌더링하는 중 오류가 발생했습니다.',
          icon: Bug,
          showHome: false
        };
    }
  };

  const errorLevel = getErrorLevel();
  const Icon = errorLevel.icon;

  const containerClasses = level === 'page'
    ? 'min-h-[50vh] flex items-center justify-center p-4'
    : 'p-6';

  return (
    <div className={containerClasses}>
      <Card className="max-w-md w-full p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          {/* Error Icon */}
          <div className="p-4 rounded-full bg-red-50 dark:bg-red-900/20">
            <Icon className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>

          {/* Error Title */}
          <h2 className="text-xl font-semibold text-foreground">
            {errorLevel.title}
          </h2>

          {/* Error Description */}
          <p className="text-muted-foreground">
            {errorLevel.description}
          </p>

          {/* Error ID for support */}
          <p className="text-xs text-muted-foreground font-mono">
            오류 ID: {errorId}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            {onRetry && (
              <Button onClick={onRetry} variant="default" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
            )}
            
            {errorLevel.showHome && (
              <Button variant="outline" size="sm" asChild>
                <a href="/">
                  <Home className="h-4 w-4 mr-2" />
                  홈으로
                </a>
              </Button>
            )}
            
            <Button variant="ghost" size="sm" asChild>
              <a href="mailto:support@example.com?subject=Error Report&body=Error ID: ${errorId}">
                <Bug className="h-4 w-4 mr-2" />
                문제 신고
              </a>
            </Button>
          </div>

          {/* Technical Details (Development/Debug) */}
          {showDetails && error && (
            <details className="mt-6 text-left w-full">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                기술적 세부사항
              </summary>
              <div className="mt-2 p-3 bg-muted rounded-lg text-xs font-mono">
                <div className="mb-2">
                  <strong>오류:</strong> {error.name}
                </div>
                <div className="mb-2">
                  <strong>메시지:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>스택 추적:</strong>
                    <pre className="whitespace-pre-wrap mt-1 text-xs">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo && (
                  <div className="mt-2">
                    <strong>컴포넌트 스택:</strong>
                    <pre className="whitespace-pre-wrap mt-1 text-xs">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * API Error Display Component
 * For displaying API errors in a user-friendly way
 */
interface ApiErrorDisplayProps {
  error: ApiError | Error | string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function ApiErrorDisplay({ 
  error, 
  onRetry, 
  isRetrying = false, 
  className = '' 
}: ApiErrorDisplayProps) {
  const getErrorMessage = () => {
    if (typeof error === 'string') {
      return error;
    }
    
    if ('code' in error && 'message' in error) {
      // ApiError
      return error.message;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return '알 수 없는 오류가 발생했습니다.';
  };

  const getErrorCode = () => {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      return error.code;
    }
    return null;
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="text-center space-y-4">
        <div className="p-3 rounded-full bg-red-50 dark:bg-red-900/20 w-16 h-16 mx-auto">
          <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400 mx-auto" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            오류가 발생했습니다
          </h3>
          <p className="text-muted-foreground mt-1">
            {getErrorMessage()}
          </p>
          {getErrorCode() && (
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              오류 코드: {getErrorCode()}
            </p>
          )}
        </div>

        {onRetry && (
          <Button 
            onClick={onRetry} 
            disabled={isRetrying}
            variant="default"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? '재시도 중...' : '다시 시도'}
          </Button>
        )}
      </div>
    </Card>
  );
}