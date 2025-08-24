'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 🔄 로딩 상태 인터페이스
export interface LoadingConfig {
  isLoading: boolean;
  message?: string;
  progress?: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'skeleton' | 'pulse' | 'dots';
}

// 🚨 에러 상태 인터페이스
export interface ErrorConfig {
  hasError: boolean;
  error?: string | Error;
  canRetry?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

// 🎯 통합 상태 관리
export interface LoadingState extends LoadingConfig, ErrorConfig {
  isEmpty?: boolean;
  emptyMessage?: string;
}

// ⭐ 메인 로딩 컴포넌트
export function LoadingIndicator({ 
  isLoading = true,
  message = "로딩 중입니다",
  progress,
  showProgress = false,
  size = 'md',
  variant = 'spinner',
  className
}: LoadingConfig & { className?: string }) {
  if (!isLoading) return null;

  const sizeConfig = {
    sm: { icon: 'h-4 w-4', text: 'text-sm', container: 'p-4' },
    md: { icon: 'h-6 w-6', text: 'text-base', container: 'p-6' },
    lg: { icon: 'h-8 w-8', text: 'text-lg', container: 'p-8' }
  };

  const config = sizeConfig[size];

  const renderVariant = () => {
    switch (variant) {
      case 'skeleton':
        return (
          <div className="space-y-3 w-full max-w-md">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            ))}
          </div>
        );

      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn("bg-primary rounded-full animate-bounce", config.icon)}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.6s'
                }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <div className={cn("bg-primary rounded-full animate-pulse", config.icon)} />
        );

      default:
        return (
          <Loader2 className={cn("animate-spin text-primary", config.icon)} />
        );
    }
  };

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4", config.container, className)}>
      {renderVariant()}
      
      {message && (
        <p className={cn("text-muted-foreground text-center animate-pulse", config.text)}>
          {message}
        </p>
      )}
      
      {showProgress && progress !== undefined && (
        <div className="w-48">
          <div className="bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );
}

// 🚨 에러 상태 컴포넌트
export function ErrorDisplay({
  hasError = false,
  error,
  canRetry = true,
  onRetry,
  isRetrying = false,
  className
}: ErrorConfig & { className?: string }) {
  if (!hasError) return null;

  const errorMessage = error instanceof Error ? error.message : error || '알 수 없는 오류가 발생했습니다';
  const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                        errorMessage.toLowerCase().includes('fetch');

  return (
    <div className={cn("flex flex-col items-center justify-center p-6 space-y-4", className)}>
      <div className="flex items-center space-x-2 text-destructive">
        {isNetworkError ? (
          <WifiOff className="h-6 w-6" />
        ) : (
          <AlertCircle className="h-6 w-6" />
        )}
        <span className="font-medium">
          {isNetworkError ? '연결 실패' : '로딩 실패했습니다'}
        </span>
      </div>
      
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {errorMessage}
      </p>
      
      {canRetry && onRetry && (
        <Button 
          variant="outline" 
          onClick={onRetry}
          disabled={isRetrying}
          className="min-w-[120px]"
        >
          {isRetrying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              재시도 중...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              다시 시도
            </>
          )}
        </Button>
      )}
      
      {isNetworkError && (
        <div className="text-xs text-muted-foreground text-center">
          <p>• 인터넷 연결을 확인해주세요</p>
          <p>• 잠시 후 다시 시도해주세요</p>
        </div>
      )}
    </div>
  );
}

// 🚀 빈 상태 컴포넌트
export function EmptyState({
  message = "표시할 데이터가 없습니다",
  description,
  icon: Icon,
  action,
  className
}: {
  message?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 space-y-4", className)}>
      {Icon && <Icon className="h-12 w-12 text-muted-foreground/50" />}
      
      <div className="text-center space-y-2">
        <p className="text-muted-foreground font-medium">{message}</p>
        {description && (
          <p className="text-sm text-muted-foreground/75">{description}</p>
        )}
      </div>
      
      {action}
    </div>
  );
}

// 🎯 통합 상태 컴포넌트
export function DataStateHandler({
  isLoading,
  hasError,
  isEmpty,
  children,
  loadingConfig,
  errorConfig,
  emptyConfig,
  className
}: {
  isLoading: boolean;
  hasError: boolean;
  isEmpty?: boolean;
  children: React.ReactNode;
  loadingConfig?: Partial<LoadingConfig>;
  errorConfig?: Partial<ErrorConfig>;
  emptyConfig?: {
    message?: string;
    description?: string;
    icon?: React.ComponentType<{ className?: string }>;
    action?: React.ReactNode;
  };
  className?: string;
}) {
  if (isLoading) {
    return (
      <LoadingIndicator 
        isLoading={true}
        message="로딩 중입니다"
        size="md"
        variant="spinner"
        {...loadingConfig}
        className={className}
      />
    );
  }

  if (hasError) {
    return (
      <ErrorDisplay
        hasError={true}
        canRetry={true}
        {...errorConfig}
        className={className}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        message="표시할 데이터가 없습니다"
        {...emptyConfig}
        className={className}
      />
    );
  }

  return <>{children}</>;
}

// 🏃‍♂️ 페이지 레벨 로딩 Skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-8">
        {/* 헤더 */}
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
        
        {/* 카드 그리드 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-5/6" />
                <div className="h-4 bg-muted rounded w-4/6" />
                <div className="flex justify-between">
                  <div className="h-3 bg-muted rounded w-16" />
                  <div className="h-3 bg-muted rounded w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// 📊 차트 로딩 Skeleton
export function ChartLoadingSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="h-6 bg-muted rounded w-32" />
          <div className="flex space-x-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 w-12 bg-muted rounded" />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse">
          {/* 차트 영역 */}
          <div className="h-80 bg-muted rounded mb-4" />
          
          {/* 범례 */}
          <div className="flex justify-center space-x-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="h-3 w-3 bg-muted rounded-full" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}