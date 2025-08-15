'use client';

import { useEffect, useRef } from 'react';
import { consoleErrorLogger } from '@/lib/console-error-logger';

/**
 * ConsoleErrorLogger Component
 * F12 콘솔 에러를 자동으로 감지하여 섹션 오류 로그에 기록하는 React 컴포넌트
 * 
 * 기능:
 * - console.error, console.warn 자동 감지
 * - 전역 JavaScript 에러 감지 
 * - Promise rejection 감지
 * - Resource loading 에러 감지
 * - 에러 분류 및 우선순위 설정
 * - 섹션 오류 API로 자동 전송
 */
export function ConsoleErrorLogger() {
  const isInitializedRef = useRef(false);
  
  useEffect(() => {
    // 중복 초기화 방지
    if (isInitializedRef.current) return;
    
    // 개발 환경에서만 상세 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [ConsoleErrorLogger] F12 콘솔 에러 감지 컴포넌트 마운트됨');
    }
    
    // 콘솔 에러 로거 초기화
    consoleErrorLogger.initialize();
    isInitializedRef.current = true;
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [ConsoleErrorLogger] F12 콘솔 에러 감지 컴포넌트 언마운트됨');
      }
      consoleErrorLogger.destroy();
      isInitializedRef.current = false;
    };
  }, []);

  // UI를 렌더링하지 않는 유틸리티 컴포넌트
  return null;
}