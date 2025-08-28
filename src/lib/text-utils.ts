/**
 * 안전한 텍스트 처리 유틸리티 함수들
 * - 원본 텍스트 보존 원칙
 * - 단계별 처리로 예측 가능한 결과
 * - 철저한 테스트 케이스 포함
 */

export interface ContentParts {
  summary: string;
  mainContent: string;
}

/**
 * 네이버블로그 메타데이터만 안전하게 제거
 */
export function removeNaverMetadata(content: string): string {
  if (!content) return '';
  
  return content
    // 네이버블로그 링크 제거 (제목 : 네이버블로그 패턴)
    .replace(/^[^:]+\s*:\s*네이버블로그/gm, '')
    // 유니코드 공백 문자 제거
    .replace(/​+/g, '')
    // 앞뒤 공백 정리
    .trim();
}

/**
 * 한줄 코멘트 추출 (원본 텍스트 보존)
 */
export function extractOneLineComment(content: string): ContentParts {
  if (!content) return { summary: '', mainContent: content };

  // 한줄 코멘트 패턴들 (우선순위 순)
  const patterns = [
    /한줄\s*코멘트\.\s*(.+?)$/m,        // "한줄 코멘트. 내용"
    /한\s*줄\s*코멘트\.\s*(.+?)$/m,     // "한 줄 코멘트. 내용"
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const summary = match[1].trim();
      
      // 해당 라인만 제거 (안전한 방식)
      const lines = content.split('\n');
      const filteredLines = lines.filter(line => !pattern.test(line));
      const mainContent = filteredLines.join('\n').trim();
      
      return { summary, mainContent };
    }
  }

  // 한줄 코멘트가 없으면 원본 그대로 반환
  return { summary: '', mainContent: content };
}

/**
 * 메르님 한줄 요약 추출
 */
export function extractMerryAnalysis(content: string): ContentParts {
  if (!content) return { summary: '', mainContent: content };

  const pattern = /📝\s*\*\*메르님 한 줄 요약\*\*:\s*(.+?)(?=\n\n|\n---|\n📝|$)/s;
  const match = content.match(pattern);
  
  if (match && match[1]) {
    const summary = match[1].trim();
    const mainContent = content.replace(pattern, '').replace(/^---\s*\n+/, '').trim();
    return { summary, mainContent };
  }

  return { summary: '', mainContent: content };
}

/**
 * 통합 콘텐츠 추출 함수
 */
export function extractContentParts(rawContent: string): ContentParts {
  // 1단계: 메타데이터 제거
  let cleanContent = removeNaverMetadata(rawContent);
  
  // 2단계: 메르님 한줄 요약 확인
  let result = extractMerryAnalysis(cleanContent);
  
  // 3단계: 한줄 요약이 없으면 한줄 코멘트 확인
  if (!result.summary) {
    result = extractOneLineComment(result.mainContent);
  }
  
  return result;
}

/**
 * HTML 포맷팅 (최소한의 안전한 변환만)
 */
export function formatForDisplay(content: string): string {
  if (!content) return '';
  
  return content
    // 기본 줄바꿈 처리
    .replace(/\n/g, '<br/>')
    // 기본 마크다운 (볼드, 이탤릭만)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 과도한 br 태그 정리
    .replace(/(<br\/>){3,}/g, '<br/><br/>')
    // 앞뒤 br 태그 제거
    .replace(/^<br\/>/g, '')
    .replace(/<br\/>$/g, '')
    .trim();
}

// 테스트 케이스들
export const TEST_CASES = {
  // 네이버 메타데이터 있는 경우
  withNaverMeta: "한미 정상회담 양국 정상의 주요 발언 간단 정.. : 네이버블로그한미정상회의의 공개된 자리에서...",
  
  // 한줄 코멘트 있는 경우
  withOneLineComment: "본문 내용입니다. 한줄 코멘트. 이것은 코멘트입니다.",
  
  // 메르님 한줄 요약 있는 경우
  withMerryAnalysis: "📝 **메르님 한 줄 요약**: 이것은 요약입니다.\n\n---\n\n본문 내용입니다.",
  
  // 일반 텍스트
  plainText: "그냥 일반적인 본문 내용입니다."
};