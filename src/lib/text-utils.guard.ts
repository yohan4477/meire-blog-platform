/**
 * 텍스트 처리 원칙 보장 시스템
 * - 런타임 검증으로 원칙 위반 방지
 * - 개발자 실수 자동 감지
 * - 안전한 fallback 제공
 */

interface TextProcessingRule {
  name: string;
  check: (input: string, output: string) => boolean;
  errorMessage: string;
}

// 텍스트 처리 원칙들
const TEXT_PROCESSING_RULES: TextProcessingRule[] = [
  {
    name: "원본_텍스트_보존",
    check: (input, output) => {
      // 핵심 내용이 사라지지 않았는지 확인 (80% 이상 보존)
      const inputWords = input.replace(/[^\w가-힣]/g, '').length;
      const outputWords = output.replace(/[^\w가-힣]/g, '').length;
      return outputWords >= inputWords * 0.8;
    },
    errorMessage: "원본 텍스트가 과도하게 삭제되었습니다. 80% 이상 보존되어야 합니다."
  },
  {
    name: "메타데이터만_제거",
    check: (input, output) => {
      // 네이버블로그 메타데이터는 제거되어야 함
      return !output.includes('네이버블로그');
    },
    errorMessage: "네이버블로그 메타데이터가 제거되지 않았습니다."
  },
  {
    name: "HTML_태그_안전성",
    check: (input, output) => {
      // 위험한 HTML 태그가 없는지 확인
      const dangerousTags = /<script|<iframe|<object|<embed/i;
      return !dangerousTags.test(output);
    },
    errorMessage: "위험한 HTML 태그가 포함되어 있습니다."
  },
  {
    name: "과도한_정규식_금지",
    check: (input, output) => {
      // 입력 대비 출력이 너무 짧지 않은지 확인 (50% 이상 유지)
      return output.length >= input.length * 0.5;
    },
    errorMessage: "텍스트가 과도하게 축약되었습니다. 50% 이상 유지되어야 합니다."
  }
];

/**
 * 텍스트 처리 결과 검증
 */
export function validateTextProcessing(
  originalText: string, 
  processedText: string,
  operation: string
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 원칙 검증
  for (const rule of TEXT_PROCESSING_RULES) {
    if (!rule.check(originalText, processedText)) {
      errors.push(`[${operation}] ${rule.name}: ${rule.errorMessage}`);
    }
  }

  // 추가 경고사항
  if (processedText.length < originalText.length * 0.7) {
    warnings.push(`텍스트가 ${Math.round((1 - processedText.length / originalText.length) * 100)}% 축약되었습니다.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 안전한 텍스트 처리 래퍼
 */
export function safeTextProcess<T extends string>(
  originalText: string,
  processor: (text: string) => T,
  operation: string,
  fallbackProcessor?: (text: string) => T
): T {
  try {
    const result = processor(originalText);
    const validation = validateTextProcessing(originalText, result, operation);
    
    if (!validation.isValid) {
      console.error(`🚨 텍스트 처리 원칙 위반 (${operation}):`, validation.errors);
      
      // fallback이 있으면 사용
      if (fallbackProcessor) {
        console.log(`🔄 fallback 처리기 사용`);
        return fallbackProcessor(originalText);
      }
      
      // fallback이 없으면 원본 반환
      console.log(`🔄 원본 텍스트 반환 (안전 모드)`);
      return originalText as T;
    }

    if (validation.warnings.length > 0) {
      console.warn(`⚠️ 텍스트 처리 경고 (${operation}):`, validation.warnings);
    }

    return result;
  } catch (error) {
    console.error(`❌ 텍스트 처리 오류 (${operation}):`, error);
    return fallbackProcessor ? fallbackProcessor(originalText) : originalText as T;
  }
}

/**
 * 개발자 실수 감지 시스템
 */
export class TextProcessingMonitor {
  private static violations: { operation: string; error: string; timestamp: Date }[] = [];

  static reportViolation(operation: string, error: string) {
    this.violations.push({
      operation,
      error,
      timestamp: new Date()
    });

    // 5개 이상 위반시 경고
    if (this.violations.length >= 5) {
      console.error('🚨🚨🚨 텍스트 처리 원칙 위반이 5회 이상 발생했습니다!');
      console.error('최근 위반 내역:', this.violations.slice(-5));
    }
  }

  static getViolationReport() {
    return {
      totalViolations: this.violations.length,
      recentViolations: this.violations.slice(-10),
      frequentOperations: this.getFrequentViolations()
    };
  }

  private static getFrequentViolations() {
    const operationCounts: Record<string, number> = {};
    this.violations.forEach(v => {
      operationCounts[v.operation] = (operationCounts[v.operation] || 0) + 1;
    });
    return Object.entries(operationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
  }
}

// 전역 오류 핸들러
if (typeof window !== 'undefined') {
  (window as any).textProcessingMonitor = TextProcessingMonitor;
}