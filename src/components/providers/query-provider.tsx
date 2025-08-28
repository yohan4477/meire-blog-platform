'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode } from 'react';
import { ApiError } from '@/types';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * React Query Provider
 * Configures TanStack Query with optimized settings for the blog platform
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          // Stale time: 5 minutes (data considered fresh for 5 minutes)
          staleTime: 1000 * 60 * 5,
          
          // Cache time: 30 minutes (data kept in cache for 30 minutes after being stale)
          gcTime: 1000 * 60 * 30,
          
          // Retry failed queries up to 3 times with exponential backoff
          retry: (failureCount, error) => {
            // Don't retry for client errors (4xx)
            if (error instanceof Error) {
              const apiError = error as any;
              if (apiError.statusCode && apiError.statusCode >= 400 && apiError.statusCode < 500) {
                return false;
              }
            }
            return failureCount < 3;
          },
          
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          
          // Refetch on window focus for important data
          refetchOnWindowFocus: true,
          
          // Don't refetch on mount if data is fresh
          refetchOnMount: false,
          
          // Don't refetch on reconnect automatically
          refetchOnReconnect: 'always',
          
          // Network mode
          networkMode: 'online',
        },
        mutations: {
          // Retry mutations only once
          retry: 1,
          
          // Network mode for mutations
          networkMode: 'online',
          
          // Global error handling for mutations
          onError: (error: unknown) => {
            console.error('Mutation error:', error);
            
            // Here you could integrate with error reporting service
            // Example: reportError(error);
          },
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show React Query DevTools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
          position={"bottom-right" as any}
          buttonPosition={"bottom-right" as any}
        />
      )}
    </QueryClientProvider>
  );
}

/**
 * Custom error handler for React Query
 */
export function handleQueryError(error: unknown): ApiError {
  if (typeof error === 'object' && error !== null) {
    // Check if it's already an ApiError
    if ('code' in error && 'message' in error && 'timestamp' in error) {
      return error as ApiError;
    }
    
    // Handle fetch errors
    if ('status' in error) {
      const fetchError = error as { status: number; statusText: string };
      return {
        code: 'FETCH_ERROR',
        message: `Network error: ${fetchError.statusText}`,
        statusCode: fetchError.status,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      statusCode: 500,
      timestamp: new Date().toISOString()
    };
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    statusCode: 500,
    timestamp: new Date().toISOString()
  };
}

/**
 * Query key factory for consistent cache keys
 */
export const queryKeys = {
  // Posts
  posts: ['posts'] as const,
  postsList: (filters?: Record<string, any>) => [...queryKeys.posts, 'list', filters] as const,
  postsDetail: (id: string | number) => [...queryKeys.posts, 'detail', id] as const,
  
  // Categories
  categories: ['categories'] as const,
  categoriesList: () => [...queryKeys.categories, 'list'] as const,
  
  // Scion Holdings
  scion: ['scion'] as const,
  scionHoldings: (filters?: Record<string, any>) => [...queryKeys.scion, 'holdings', filters] as const,
  scionPortfolio: (quarter?: string) => [...queryKeys.scion, 'portfolio', quarter] as const,
  
  // Search
  search: ['search'] as const,
  searchQuery: (query: string, type?: string) => [...queryKeys.search, query, type] as const,
} as const;

/**
 * Performance monitoring hook for queries
 */
export function useQueryPerformance() {
  const [metrics, setMetrics] = useState<{
    averageLoadTime: number;
    totalQueries: number;
    cacheHitRate: number;
    errorRate: number;
  }>({
    averageLoadTime: 0,
    totalQueries: 0,
    cacheHitRate: 0,
    errorRate: 0
  });

  // This could be expanded to actually track performance metrics
  // For now, it's a placeholder for future implementation
  
  return metrics;
}