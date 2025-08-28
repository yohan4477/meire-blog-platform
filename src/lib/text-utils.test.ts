/**
 * 텍스트 처리 유틸리티 테스트
 */
import { 
  removeNaverMetadata, 
  extractOneLineComment, 
  extractMerryAnalysis,
  extractContentParts,
  formatForDisplay,
  TEST_CASES 
} from './text-utils';

describe('Text Utils', () => {
  describe('removeNaverMetadata', () => {
    test('네이버블로그 메타데이터 제거', () => {
      const result = removeNaverMetadata(TEST_CASES.withNaverMeta);
      expect(result).not.toContain('네이버블로그');
      expect(result).toContain('한미정상회의의 공개된 자리에서');
    });

    test('일반 텍스트는 그대로 유지', () => {
      const result = removeNaverMetadata(TEST_CASES.plainText);
      expect(result).toBe(TEST_CASES.plainText);
    });
  });

  describe('extractOneLineComment', () => {
    test('한줄 코멘트 추출 및 본문에서 제거', () => {
      const result = extractOneLineComment(TEST_CASES.withOneLineComment);
      expect(result.summary).toBe('이것은 코멘트입니다.');
      expect(result.mainContent).toBe('본문 내용입니다.');
    });

    test('한줄 코멘트 없으면 원본 유지', () => {
      const result = extractOneLineComment(TEST_CASES.plainText);
      expect(result.summary).toBe('');
      expect(result.mainContent).toBe(TEST_CASES.plainText);
    });
  });

  describe('extractMerryAnalysis', () => {
    test('메르님 한줄 요약 추출', () => {
      const result = extractMerryAnalysis(TEST_CASES.withMerryAnalysis);
      expect(result.summary).toBe('이것은 요약입니다.');
      expect(result.mainContent).toBe('본문 내용입니다.');
    });
  });

  describe('formatForDisplay', () => {
    test('줄바꿈을 br 태그로 변환', () => {
      const result = formatForDisplay('첫째줄\n둘째줄');
      expect(result).toBe('첫째줄<br/>둘째줄');
    });

    test('과도한 br 태그 정리', () => {
      const result = formatForDisplay('첫째줄\n\n\n\n둘째줄');
      expect(result).toBe('첫째줄<br/><br/>둘째줄');
    });
  });

  describe('통합 테스트', () => {
    test('실제 트럼프 포스트 데이터로 테스트', () => {
      const trumpPost = "한미 정상회담 양국 정상의 주요 발언 간단 정.. : 네이버블로그한미정상회의의 공개된 자리에서 양국 정상이 나눈 대화는 위 글에서 정리를 했다. 한미정상회담후 트럼프는 백악관 본인의 자리에서 기자들과 질의응답을 가졌다. 한줄 코멘트. 보따리는 꽤 크게 푼 것 같고 트럼프는 만족한 것 같은 반응이다.";
      
      const result = extractContentParts(trumpPost);
      
      expect(result.summary).toBe('보따리는 꽤 크게 푼 것 같고 트럼프는 만족한 것 같은 반응이다.');
      expect(result.mainContent).toContain('한미정상회의의 공개된 자리에서');
      expect(result.mainContent).not.toContain('네이버블로그');
      expect(result.mainContent).not.toContain('한줄 코멘트.');
    });
  });
});