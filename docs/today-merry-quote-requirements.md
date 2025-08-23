# 💬 오늘의 메르님 말씀 요구사항

> **오늘의 메르님 말씀** 컴포넌트 개발을 위한 포괄적인 요구사항 문서

## 🎯 컴포넌트 개요

- **컴포넌트**: `src/components/home/TodayMerryQuote.tsx`
- **API 엔드포인트**: `/api/today-merry-quote`
- **사용 위치**: 메인 페이지 (`src/app/page.tsx`)
- **목적**: 오늘 작성된 모든 포스트에서 Claude가 직접 핵심 메시지를 추출하여 표시

## 🚫 금지 사항 (절대 준수)

### ❌ **완전 금지 목록**
- **하드코딩된 말씀**: 미리 작성된 고정 메시지 사용 금지
- **외부 AI API**: OpenAI, Anthropic API 등 외부 서비스 사용 금지
- **키워드 매칭**: 제목 기반 if-else 매칭 로직 금지
- **패턴 분석**: 정규식이나 자동화된 패턴 분석 금지
- **자동화 스크립트**: 배치 처리나 자동 분석 시스템 금지

### 🚨 **핵심 원칙: "글이 없으면 분석하지 말라"**
- **실제 포스트 기반**: 포스트가 없으면 분석 결과 생성 금지
- **가짜 인사이트 금지**: 포스트에 언급되지 않은 내용 절대 금지
- **NULL 처리**: 분석할 포스트가 없으면 "분석할 포스트가 없습니다" 표시

## ✅ 유일한 허용 방식

### 🎯 **Claude 직접 수동 분석만 허용**
1. **Claude 직접 분석**: Claude가 포스트 전문을 읽고 수동으로 핵심 메시지 추출
2. **실시간 생성**: 요청 시점에 Claude가 즉석에서 분석하여 말씀 생성
3. **포스트 기반**: 실제 포스트 내용을 근거로 한 분석만 허용

### 🔄 **분석 프로세스**
1. **포스트 수집**: 오늘 작성된 모든 포스트를 최신순으로 가져옴
2. **Claude 직접 읽기**: 각 포스트의 title, content를 Claude가 직접 읽고 분석
3. **핵심 메시지 추출**: 포스트별로 투자 관련 핵심 인사이트를 추출
4. **말씀 생성**: 추출된 인사이트를 바탕으로 "메르님 말씀" 형태로 재구성
5. **폴백 처리**: 오늘 포스트가 없으면 최신 포스트 1개로 동일 처리

## ✍️ 문체 및 스타일 가이드

### 📝 **문체 요구사항**
- **동사의 명사형**: "~합니다" → "~함", "~입니다" → "~임"
- **명료한 결론**: 투자 관점에서 명확한 메시지 전달
- **종목명 볼드**: 언급된 모든 종목명과 티커를 **굵게** 처리
- **존댓말 유지**: 격식있는 투자 조언 톤앤매너
- **간결성**: 핵심만 담은 명확한 표현

### 💭 **메시지 구조**
```typescript
interface TodayQuote {
  title: string;           // "오늘의 메르님 말씀" 또는 "메르님 말씀"
  coreMessage: string;     // Claude가 추출한 1문장 핵심 요약 (필수)
  insight: string;         // 상세한 투자 인사이트와 시사점
  mentionedStocks: string[]; // 언급된 종목 티커들
  sourcePostIds: number[]; // 분석 기반 포스트 ID들
  analysisDate: string;    // 분석 수행 날짜
}
```

### 🎯 **품질 기준**
- **정확성**: 포스트 내용과 100% 일치하는 분석
- **통찰력**: 단순 요약이 아닌 투자 인사이트 제공
- **일관성**: 메르님의 투자 철학과 일치하는 톤앤매너
- **실용성**: 실제 투자 결정에 도움이 되는 내용
- **근거성**: 모든 분석에 명확한 포스트 근거 제시

## 🎨 UI/UX 요구사항

### 📋 **컴포넌트 구조**
- **제목**: "오늘의 메르님 말씀" (오늘 포스트) / "메르님 말씀" (과거 포스트)
- **날짜 표시**: 분석 기준 날짜 명시
- **핵심 메시지**: Claude가 추출한 **1문장** 요약 (대형 텍스트)
- **투자 인사이트**: 상세한 분석과 시사점 (중간 크기)
- **관련 종목**: 포스트에서 언급된 티커들을 클릭 가능한 배지로 표시
- **출처**: 분석 기반 포스트 제목들 (링크 연결)

### 🌈 **다크 모드 지원**
```css
/* ✅ 다크 모드 호환 색상 */
text-foreground        /* 메인 텍스트 */
text-muted-foreground  /* 부가 정보 */
bg-card               /* 카드 배경 */
border                /* 테두리 */
bg-primary/5          /* 강조 배경 */

/* ❌ 사용 금지 색상 */
text-gray-900         /* 하드코딩된 회색 */
bg-white             /* 하드코딩된 배경 */
```

### 📱 **반응형 디자인**
- **모바일**: 세로 스택, 텍스트 크기 조정
- **태블릿**: 균형잡힌 레이아웃
- **데스크톱**: 가로 배치, 여백 최적화

### 🔧 **텍스트 렌더링 문제 해결**
**"\n" 문자 개행 처리 (필수 적용)**:
```tsx
// ✅ 올바른 개행 처리 (양쪽 패턴 모두 처리)
dangerouslySetInnerHTML={{ 
  __html: highlightStockNames(quote.insight, quote.relatedTickers)
    .replace(/\\n/g, '<br />') // 이스케이프된 \n 처리
    .replace(/\n/g, '<br />')  // 일반 \n 처리
}}

// ❌ 잘못된 처리 (한쪽만 처리)
dangerouslySetInnerHTML={{ 
  __html: highlightStockNames(quote.insight, quote.relatedTickers).replace(/\n/g, '<br />')
}}
```

**문제 원인**:
- API 응답에서 `\\n` (이스케이프된 개행)과 `\n` (일반 개행) 두 패턴 모두 존재
- 한 패턴만 처리할 경우 일부 텍스트에서 리터럴 "\n" 문자가 화면에 표시됨
- **필수**: 투자 인사이트 텍스트에서 개행이 제대로 표시되도록 양쪽 패턴 모두 처리 필요

## 📡 API 연동

### 🔗 **API 엔드포인트**: `/api/today-merry-quote`

**요청 형식**:
```typescript
interface QuoteRequest {
  date?: string; // YYYY-MM-DD 형식, 기본값: 오늘
}
```

**응답 형식**:
```typescript
interface QuoteResponse {
  success: boolean;
  data?: {
    title: string;
    coreMessage: string;
    insight: string;
    mentionedStocks: Array<{
      ticker: string;
      name: string;
    }>;
    sourcePosts: Array<{
      id: number;
      title: string;
      createdAt: string;
    }>;
    analysisDate: string;
  };
  error?: {
    code: string;
    message: string;
  };
}
```

**에러 코드**:
- `NO_POSTS_TODAY`: 오늘 포스트 없음
- `ANALYSIS_FAILED`: Claude 분석 실패
- `INVALID_DATE`: 잘못된 날짜 형식

### 🔄 **데이터 플로우**
1. **날짜 기준 포스트 조회**: `blog_posts` WHERE `created_date = today`
2. **Claude 분석 실행**: 포스트 내용 직접 분석
3. **종목 추출**: 언급된 종목 티커 추출 및 검증
4. **결과 반환**: 구조화된 응답 생성

## ⚡ 성능 요구사항

### 🚀 **속도 기준**
- **Claude 분석 시간**: < 3초
- **API 전체 응답**: < 5초
- **UI 렌더링**: < 500ms
- **종목 링크 생성**: < 200ms

### 💾 **캐싱 전략**
- **세션 캐시**: 동일 포스트 재분석 방지
- **분석 결과**: 같은 날 동일 요청 캐시 (1시간)
- **종목 정보**: 티커-이름 매핑 캐시 (12시간)

### 📊 **최적화 방안**
- **병렬 처리**: 종목 정보 조회 병렬 실행
- **지연 로딩**: 비필수 데이터 지연 로딩
- **에러 복구**: 부분 실패 시 일부 결과라도 표시

## 🧪 테스트 요구사항

### 📋 **필수 테스트 시나리오**
1. **오늘 포스트 다수**: 여러 포스트 분석 결과 통합
2. **오늘 포스트 1개**: 단일 포스트 분석
3. **오늘 포스트 없음**: 최신 포스트 폴백
4. **Claude 분석 품질**: 포스트 내용과 일치성 검증
5. **종목명 볼드 처리**: 모든 티커/종목명 굵게 표시
6. **문체 일관성**: 동사의 명사형 사용
7. **성능 기준**: 5초 이내 응답
8. **다크 모드**: 모든 색상 정상 표시

### 🎯 **품질 검증 기준**
```javascript
// 분석 품질 검증 예시
const qualityCheck = {
  contentRelevance: "분석 내용이 포스트와 일치하는가?",
  insightDepth: "단순 요약이 아닌 투자 인사이트를 제공하는가?",
  stockMentionAccuracy: "언급된 종목이 실제 포스트에 있는가?",
  toneConsistency: "메르님의 투자 철학과 일치하는가?",
  practicalValue: "실제 투자에 도움이 되는 내용인가?"
};
```

### ⚠️ **Playwright 테스트 케이스**
```javascript
test('오늘의 메르님 말씀 표시 및 기능', async ({ page }) => {
  await page.goto('/');
  
  // 컴포넌트 로딩 확인
  await expect(page.locator('text=오늘의 메르님 말씀')).toBeVisible();
  
  // 핵심 메시지 표시 확인
  const coreMessage = page.locator('[data-testid="core-message"]');
  await expect(coreMessage).toBeVisible();
  
  // 종목 배지 클릭 테스트
  const stockBadge = page.locator('[data-testid="stock-badge"]').first();
  if (await stockBadge.isVisible()) {
    await stockBadge.click();
    await expect(page).toHaveURL(/\/merry\/stocks\/.+/);
  }
  
  // 다크 모드 테스트
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(coreMessage).not.toHaveClass(/text-gray-900/);
});
```

## 🚨 주의사항

### ❌ **절대 금지 사항**
- **가짜 분석 생성**: 포스트 없을 때 임의 메시지 생성 금지
- **외부 API 의존**: 모든 외부 AI 서비스 사용 금지
- **하드코딩**: 미리 정해진 메시지나 패턴 사용 금지
- **자동화**: 스크립트나 규칙 기반 분석 금지

### ✅ **필수 준수사항**
- **Claude 직접 분석**: 유일한 허용 분석 방식
- **실제 데이터만**: 포스트 기반 분석 결과만 사용
- **5초 응답**: 성능 기준 엄격 준수
- **다크 모드**: semantic 색상 완전 지원

## 🔗 관련 문서

### 📄 **상위 문서**
- **`@docs/main-page-requirements.md`**: 메인 페이지 전체 구성에서 이 컴포넌트 위치

### 📄 **관련 문서**
- **`@CLAUDE.md`**: 전체 프로젝트 개발 가이드라인
- **`@docs/post-list-page-requirements.md`**: 포스트 시스템 연동
- **`@docs/performance-requirements.md`**: 성능 최적화 가이드

### 📄 **데이터 의존성**
- **blog_posts 테이블**: 분석 대상 포스트 데이터
- **stocks 테이블**: 종목 정보 및 링크 생성

---

## 📝 요약

**오늘의 메르님 말씀은 "글이 없으면 분석하지 말라" 원칙 하에 Claude가 직접 포스트를 읽고 수동 분석하여 투자 인사이트를 제공하는 핵심 컴포넌트입니다.**

핵심 기능:
1. 🎯 **Claude 직접 분석**: 외부 API 없이 Claude 수동 분석만 허용
2. 📝 **실제 포스트 기반**: 포스트 내용을 근거로 한 분석만 제공
3. ⚡ **빠른 응답**: 5초 이내 분석 완료 및 표시
4. 🎨 **다크 모드**: semantic 색상으로 완전 호환
5. 📱 **반응형**: 모든 기기에서 최적화된 표시