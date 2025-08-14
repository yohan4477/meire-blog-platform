'use client';

// 🤖 자동 섹션 오류 캐처
// 사용자가 에러 ID를 언급하면 자동으로 DB에 저장하는 시스템

export class AutoErrorCapture {
  private static instance: AutoErrorCapture;
  private errorQueue: Set<string> = new Set();
  private isProcessing = false;

  static getInstance(): AutoErrorCapture {
    if (!AutoErrorCapture.instance) {
      AutoErrorCapture.instance = new AutoErrorCapture();
    }
    return AutoErrorCapture.instance;
  }

  // 에러 ID 패턴 매칭 (err_숫자_문자열 형식)
  private static ERROR_ID_PATTERN = /err_\d{13}_[a-z0-9]{9,}/gi;

  // 에러 ID 자동 감지 및 캐처
  public captureErrorFromText(text: string): string[] {
    const matches = text.match(AutoErrorCapture.ERROR_ID_PATTERN);
    if (!matches) return [];

    const newErrors: string[] = [];
    
    matches.forEach(errorId => {
      if (!this.errorQueue.has(errorId)) {
        this.errorQueue.add(errorId);
        newErrors.push(errorId);
        this.processError(errorId);
      }
    });

    return newErrors;
  }

  // 개별 에러 처리
  private async processError(errorId: string) {
    if (this.isProcessing) {
      // 이미 처리 중이면 큐에 대기
      setTimeout(() => this.processError(errorId), 100);
      return;
    }

    this.isProcessing = true;

    try {
      const errorData = {
        componentName: 'AutoCapture',
        sectionName: 'pattern-detected',
        pagePath: '/auto-detected',
        errorMessage: `자동 감지된 에러 ID: ${errorId}`,
        errorType: 'AutoDetected',
        errorCategory: '로직',
        userAgent: 'AutoErrorCapture System'
      };

      const response = await fetch('/api/section-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ [AUTO-CAPTURE] ${errorId} → ${result.errorHash}`);
      } else {
        console.error(`❌ [AUTO-CAPTURE] ${errorId} 저장 실패:`, result.error);
      }

    } catch (error) {
      console.error(`❌ [AUTO-CAPTURE] ${errorId} 처리 중 오류:`, error);
    } finally {
      this.isProcessing = false;
    }
  }

  // 페이지의 모든 텍스트에서 에러 ID 검색
  public scanPageForErrors(): string[] {
    if (typeof window === 'undefined') return [];

    const pageText = document.body.innerText || '';
    return this.captureErrorFromText(pageText);
  }

  // 주기적으로 페이지 스캔
  public startPeriodicScan(intervalMs: number = 5000) {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      const foundErrors = this.scanPageForErrors();
      if (foundErrors.length > 0) {
        console.log(`🔍 [AUTO-SCAN] ${foundErrors.length}개 새로운 에러 발견:`, foundErrors);
      }
    }, intervalMs);
  }
}

// 전역 자동 캐처 인스턴스
export const autoErrorCapture = AutoErrorCapture.getInstance();

// 페이지 로드 시 자동 시작
if (typeof window !== 'undefined') {
  // DOM 로드 완료 후 스캔 시작
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoErrorCapture.startPeriodicScan(3000);
    });
  } else {
    autoErrorCapture.startPeriodicScan(3000);
  }
}