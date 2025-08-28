'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// 🚀 최적화된 로딩 상태 관리 훅
export interface LoadingOptions {
  minLoadingTime?: number;    // 최소 로딩 시간 (UX)
  maxLoadingTime?: number;    // 최대 로딩 시간 (timeout)
  showProgressBar?: boolean;  // 진행률 표시 여부
  retryAttempts?: number;     // 재시도 횟수
}

export interface LoadingState {
  isLoading: boolean;
  progress: number;
  error: string | null;
  canRetry: boolean;
  isRetrying: boolean;
  retryCount: number;
}

export function useOptimizedLoading(options: LoadingOptions = {}) {
  const {
    minLoadingTime = 500,     // 최소 0.5초는 로딩 표시
    maxLoadingTime = 10000,   // 최대 10초 timeout
    showProgressBar = false,
    retryAttempts = 3
  } = options;

  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    error: null,
    canRetry: false,
    isRetrying: false,
    retryCount: 0
  });

  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const progressIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const minTimeTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  // 🎯 로딩 시작
  const startLoading = useCallback(() => {
    // 기존 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    startTimeRef.current = Date.now();
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      progress: 0,
      error: null,
      canRetry: false,
      isRetrying: false
    }));

    // 진행률 시뮬레이션 (실제 API 진행률이 없을 때)
    if (showProgressBar) {
      let currentProgress = 0;
      progressIntervalRef.current = setInterval(() => {
        currentProgress = Math.min(currentProgress + Math.random() * 15, 90);
        setState(prev => ({ ...prev, progress: currentProgress }));
      }, 200);
    }

    // 최대 로딩 시간 timeout
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        error: '로딩 시간이 초과되었습니다. 다시 시도해주세요.',
        canRetry: true
      }));
    }, maxLoadingTime);

    return abortControllerRef.current;
  }, [showProgressBar, maxLoadingTime]);

  // 🎯 로딩 완료
  const completeLoading = useCallback((data?: any, error?: string) => {
    const elapsedTime = Date.now() - startTimeRef.current;
    
    // 정리
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    const finishLoading = () => {
      setState(prev => ({
        ...prev,
        isLoading: false,
        progress: error ? prev.progress : 100,
        error: error || null,
        canRetry: !!error && prev.retryCount < retryAttempts,
        isRetrying: false
      }));
    };

    // 최소 로딩 시간 보장 (UX 개선)
    if (elapsedTime < minLoadingTime) {
      minTimeTimeoutRef.current = setTimeout(finishLoading, minLoadingTime - elapsedTime);
    } else {
      finishLoading();
    }
  }, [minLoadingTime, retryAttempts]);

  // 🔄 재시도
  const retry = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
      error: null
    }));
  }, []);

  // 🎯 비동기 작업 실행기
  const executeAsync = useCallback(async <T>(
    asyncOperation: (abortSignal: AbortSignal) => Promise<T>,
    onSuccess?: (data: T) => void,
    onError?: (error: Error) => void
  ): Promise<T | null> => {
    const abortController = startLoading();
    
    try {
      const result = await asyncOperation(abortController.signal);
      
      if (abortController.signal.aborted) {
        throw new Error('작업이 취소되었습니다.');
      }
      
      completeLoading(result);
      onSuccess?.(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
      completeLoading(null, errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      return null;
    }
  }, [startLoading, completeLoading]);

  // 🎯 fetch 래퍼
  const fetchWithLoading = useCallback(async <T>(
    url: string,
    options: RequestInit = {},
    parser: (response: Response) => Promise<T> = (r) => r.json()
  ): Promise<T | null> => {
    return executeAsync(
      async (abortSignal) => {
        const response = await fetch(url, {
          ...options,
          signal: abortSignal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return parser(response);
      }
    );
  }, [executeAsync]);

  // 🧹 정리
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (minTimeTimeoutRef.current) clearTimeout(minTimeTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return {
    ...state,
    startLoading,
    completeLoading,
    retry,
    executeAsync,
    fetchWithLoading,
    // 편의 메서드
    reset: () => setState({
      isLoading: false,
      progress: 0,
      error: null,
      canRetry: false,
      isRetrying: false,
      retryCount: 0
    })
  };
}

// 🚀 여러 로딩 상태를 관리하는 훅
export function useMultiLoading<T extends string>(keys: readonly T[]) {
  const [states, setStates] = useState<Record<T, LoadingState>>(() =>
    keys.reduce((acc, key) => {
      acc[key] = {
        isLoading: false,
        progress: 0,
        error: null,
        canRetry: false,
        isRetrying: false,
        retryCount: 0
      };
      return acc;
    }, {} as Record<T, LoadingState>)
  );

  const updateState = useCallback((key: T, updates: Partial<LoadingState>) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }));
  }, []);

  const startLoading = useCallback((key: T) => {
    updateState(key, {
      isLoading: true,
      progress: 0,
      error: null,
      canRetry: false,
      isRetrying: false
    });
  }, [updateState]);

  const completeLoading = useCallback((key: T, error?: string) => {
    updateState(key, {
      isLoading: false,
      progress: 100,
      error: error || null,
      canRetry: !!error,
      isRetrying: false
    });
  }, [updateState]);

  const retry = useCallback((key: T) => {
    updateState(key, {
      isRetrying: true,
      retryCount: states[key].retryCount + 1,
      error: null
    });
  }, [updateState, states]);

  const isAnyLoading = Object.values(states).some((state: any) => state.isLoading);
  const hasAnyError = Object.values(states).some((state: any) => state.error);
  const allCompleted = Object.values(states).every((state: any) => !state.isLoading);

  return {
    states,
    startLoading,
    completeLoading,
    retry,
    updateState,
    isAnyLoading,
    hasAnyError,
    allCompleted
  };
}

// 🎯 캐시와 함께 사용하는 로딩 훅
export function useCachedLoading<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: LoadingOptions & {
    cacheTime?: number;     // 캐시 유효 시간 (ms)
    staleTime?: number;     // stale 시간 (ms)
  } = {}
) {
  const { cacheTime = 5 * 60 * 1000, staleTime = 1 * 60 * 1000 } = options; // 기본: 5분 캐시, 1분 stale
  const [data, setData] = useState<T | null>(null);
  const [lastFetched, setLastFetched] = useState<number>(0);
  const loading = useOptimizedLoading(options);

  const isStale = Date.now() - lastFetched > staleTime;
  const isExpired = Date.now() - lastFetched > cacheTime;

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && data && !isExpired) {
      return data;
    }

    const result = await loading.executeAsync(async () => {
      const result = await fetcher();
      setData(result);
      setLastFetched(Date.now());
      return result;
    });

    return result;
  }, [data, isExpired, fetcher, loading]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return {
    data,
    ...loading,
    fetchData,
    refresh,
    isStale,
    isExpired
  };
}