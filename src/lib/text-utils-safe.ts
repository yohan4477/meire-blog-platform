/**
 * 안전한 텍스트 처리 함수들 (원칙 보장 버전)
 * - 모든 함수는 원칙 검증을 거침
 * - 실패시 자동 fallback
 * - 위반 사항 자동 보고
 */

import { safeTextProcess, validateTextProcessing, TextProcessingMonitor } from './text-utils.guard';
import { extractContentParts as unsafeExtractContentParts, formatForDisplay as unsafeFormatForDisplay } from './text-utils';

/**
 * 안전한 콘텐츠 추출 (원칙 보장)
 */
export function extractContentParts(rawContent: string) {
  try {
    const result = unsafeExtractContentParts(rawContent);
    
    // 결과 검증: mainContent가 원본 텍스트의 80% 이상 보존되었는지
    const originalWords = rawContent.replace(/[^\w가-힣]/g, '').length;
    const outputWords = result.mainContent.replace(/[^\w가-힣]/g, '').length;
    
    if (outputWords < originalWords * 0.8) {
      console.warn('🚨 텍스트 처리 원칙 위반: 원본 텍스트가 과도하게 삭제됨');
      return { summary: '', mainContent: rawContent };
    }
    
    return result;
  } catch (error) {
    console.error('❌ 텍스트 처리 오류 (extractContentParts):', error);
    return { summary: '', mainContent: rawContent };
  }
}

/**
 * 안전한 디스플레이 포맷팅 (원칙 보장)
 */
export function formatForDisplay(content: string): string {
  return safeTextProcess(
    content,
    (text) => {
      const result = unsafeFormatForDisplay(text);
      return result;
    },
    'formatForDisplay',
    // fallback: 최소한의 안전한 변환만
    (text) => text.replace(/\n/g, '<br/>')
  );
}

/**
 * 급한 수정을 위한 임시 함수 (원칙 자동 검증)
 */
export function emergencyTextFix(
  originalText: string, 
  quickFix: (text: string) => string,
  reason: string
): string {
  console.warn(`🚨 긴급 텍스트 수정: ${reason}`);
  
  const result = safeTextProcess(
    originalText,
    quickFix,
    `emergency_fix_${reason}`,
    // 긴급시에도 원본은 보존
    (text) => text
  );

  // 위반사항 기록
  const validation = validateTextProcessing(originalText, result, 'emergency_fix');
  if (!validation.isValid) {
    validation.errors.forEach(error => {
      TextProcessingMonitor.reportViolation('emergency_fix', error);
    });
  }

  return result;
}

/**
 * 개발자 위반 체크 (개발 모드에서만)
 */
export function checkForViolations() {
  if (process.env.NODE_ENV === 'development') {
    const report = TextProcessingMonitor.getViolationReport();
    
    if (report.totalViolations > 0) {
      console.group('📊 텍스트 처리 위반 리포트');
      console.log('총 위반 횟수:', report.totalViolations);
      console.log('최근 위반:', report.recentViolations);
      console.log('자주 위반되는 작업:', report.frequentOperations);
      console.groupEnd();
    }
  }
}

// 개발 모드에서 주기적으로 체크
if (process.env.NODE_ENV === 'development') {
  setInterval(checkForViolations, 30000); // 30초마다
}