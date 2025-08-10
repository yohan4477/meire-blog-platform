'use client';

import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import { LoadingState } from '@/types';

interface LoadingProps extends Partial<LoadingState> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'skeleton' | 'dots' | 'pulse';
  className?: string;
  fullScreen?: boolean;
  children?: React.ReactNode;
}

/**
 * Standardized Loading Component
 * Provides consistent loading states across the application
 */
export function Loading({
  isLoading = true,
  loadingText,
  progress,
  size = 'md',
  variant = 'spinner',
  className = '',
  fullScreen = false,
  children
}: LoadingProps) {
  if (!isLoading && !children) return null;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50'
    : `flex flex-col items-center justify-center p-8 ${className}`;

  const renderSpinner = () => (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
        
        {loadingText && (
          <p className={`${textSizeClasses[size]} text-muted-foreground animate-pulse`}>
            {loadingText}
          </p>
        )}
        
        {progress !== undefined && (
          <div className="w-48 bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {Math.round(progress)}%
            </p>
          </div>
        )}
        
        {children}
      </div>
    </div>
  );

  const renderSkeleton = () => (
    <div className={containerClasses}>
      <div className="space-y-4 w-full max-w-md">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-muted rounded w-full mb-2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderDots = () => (
    <div className={containerClasses}>
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${sizeClasses[size]} bg-primary rounded-full animate-bounce`}
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.6s'
            }}
          />
        ))}
      </div>
      {loadingText && (
        <p className={`${textSizeClasses[size]} text-muted-foreground mt-4`}>
          {loadingText}
        </p>
      )}
    </div>
  );

  const renderPulse = () => (
    <div className={containerClasses}>
      <div className={`${sizeClasses[size]} bg-primary rounded-full animate-pulse`} />
      {loadingText && (
        <p className={`${textSizeClasses[size]} text-muted-foreground mt-4 animate-pulse`}>
          {loadingText}
        </p>
      )}
    </div>
  );

  const renderContent = () => {
    switch (variant) {
      case 'skeleton':
        return renderSkeleton();
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  return isLoading ? renderContent() : <>{children}</>;
}

/**
 * Loading Skeleton for specific layouts
 */
export function PostCardSkeleton() {
  return (
    <Card className="p-6 space-y-4">
      <div className="animate-pulse">
        <div className="h-6 bg-muted rounded w-3/4 mb-3" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
          <div className="h-4 bg-muted rounded w-4/6" />
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="h-3 bg-muted rounded w-20" />
          <div className="h-3 bg-muted rounded w-16" />
        </div>
      </div>
    </Card>
  );
}

export function PostDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-3/4 mb-4" />
        <div className="flex items-center space-x-4 mb-6">
          <div className="h-4 bg-muted rounded w-20" />
          <div className="h-4 bg-muted rounded w-24" />
        </div>
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded w-full" />
          ))}
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex space-x-4 mb-4">
          {[...Array(columns)].map((_, i) => (
            <div key={i} className="h-6 bg-muted rounded flex-1" />
          ))}
        </div>
        
        {/* Rows */}
        {[...Array(rows)].map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-4 mb-3">
            {[...Array(columns)].map((_, colIndex) => (
              <div key={colIndex} className="h-4 bg-muted rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Inline Loading Spinner
 */
export function InlineLoading({ 
  size = 'sm', 
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg'; 
  className?: string; 
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <RefreshCw className={`${sizeClasses[size]} animate-spin ${className}`} />
  );
}