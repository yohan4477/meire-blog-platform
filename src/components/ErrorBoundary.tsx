'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
  level?: 'page' | 'component';
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary caught error:', error, errorInfo);
    
    // 오류를 메모리에 저장 (실제 환경에서는 에러 리포팅 서비스로)
    this.setState({
      hasError: true,
      error,
      errorInfo
    });
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback, level = 'component' } = this.props;
      
      if (Fallback) {
        return <Fallback error={this.state.error} retry={this.retry} />;
      }

      if (level === 'page') {
        return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                페이지 오류
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                예상치 못한 오류가 발생했습니다.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.retry}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  다시 시도
                </button>
                <Link
                  href="/"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  홈으로
                </Link>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">컴포넌트 오류</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-300 mb-3">
            이 부분을 불러오는 중 오류가 발생했습니다.
          </p>
          <button
            onClick={this.retry}
            className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            다시 시도
          </button>
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