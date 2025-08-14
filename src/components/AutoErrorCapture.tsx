'use client';

import { useEffect } from 'react';
import { autoErrorCapture } from '@/lib/auto-error-capture';

// 🤖 자동 섹션 오류 감지 컴포넌트
// 페이지에서 에러 ID 패턴을 자동으로 감지하고 DB에 저장

export function AutoErrorCapture() {
  useEffect(() => {
    // 컴포넌트 마운트 시 즉시 스캔
    const initialErrors = autoErrorCapture.scanPageForErrors();
    if (initialErrors.length > 0) {
      console.log(`🚨 [MOUNT-SCAN] ${initialErrors.length}개 에러 ID 발견:`, initialErrors);
    }

    // MutationObserver로 DOM 변경 감지
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // 새로 추가된 노드들에서 에러 ID 검색
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
              const text = node.textContent || '';
              const foundErrors = autoErrorCapture.captureErrorFromText(text);
              
              if (foundErrors.length > 0) {
                console.log(`🔥 [REAL-TIME] 새 에러 감지:`, foundErrors);
              }
            }
          });
        }
      });
    });

    // 전체 document 감시
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // 주기적 스캔 시작 (3초마다)
    autoErrorCapture.startPeriodicScan(3000);

    // 브라우저 콘솔 모니터링 (에러 로그 캐치)
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorText = args.join(' ');
      const foundErrors = autoErrorCapture.captureErrorFromText(errorText);
      if (foundErrors.length > 0) {
        console.log(`🔍 [CONSOLE] 콘솔에서 에러 ID 감지:`, foundErrors);
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      observer.disconnect();
      console.error = originalConsoleError;
    };
  }, []);

  // 이 컴포넌트는 UI를 렌더링하지 않음 (백그라운드 모니터링)
  return null;
}