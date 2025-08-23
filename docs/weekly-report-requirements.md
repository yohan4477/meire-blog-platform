# 📈 메르 주간보고 요구사항

> **메르 주간보고** 페이지 개발을 위한 포괄적인 요구사항 문서

## 🎯 컴포넌트 개요

- **페이지**: `src/app/merry/weekly-report/page.tsx`
- **API 엔드포인트**: `/api/merry/weekly-reports`
- **분석 엔진**: `src/lib/claude-weekly-analyzer.ts`
- **목적**: 주간 투자 트렌드와 메르의 인사이트를 종합한 전문적 보고서

## 🚫 금지 사항 (절대 준수)

### ❌ **완전 금지 목록**
- **키워드 매칭**: 미리 정의된 키워드 리스트 기반 분석 금지
- **외부 AI API**: OpenAI, Anthropic API 등 외부 서비스 사용 금지
- **더미 데이터**: 임의 생성된 가짜 분석 결과 금지
- **랜덤 값**: Math.random() 등을 활용한 임의 값 생성 금지
- **자동화 스크립트**: 규칙 기반 자동 분석 시스템 금지

### 🚨 **핵심 원칙: "글이 없으면 분석하지 말라"**
- **실제 포스트 기반**: 해당 주간 포스트가 없으면 분석 결과 생성 금지
- **가짜 인사이트 금지**: 포스트에 언급되지 않은 내용 절대 금지
- **NULL 처리**: 분석할 포스트가 없으면 "해당 주간 포스트가 없습니다" 표시

## ✅ 유일한 허용 방식

### 🎯 **Claude 직접 수동 분석만 허용**
1. **Claude 직접 분석**: Claude가 해당 주간 포스트 전문을 읽고 수동으로 인사이트 추출
2. **실시간 생성**: 요청 시점에 Claude가 즉석에서 분석하여 보고서 생성
3. **포스트 기반**: 실제 포스트 내용을 근거로 한 분석만 허용

### 🔄 **분석 프로세스**
1. **주간 포스트 수집**: 해당 주간(월-일) 작성된 모든 포스트 수집
2. **Claude 직접 읽기**: 각 포스트의 title, content를 Claude가 직접 읽고 분석
3. **투자 테마 추출**: 포스트별로 투자 관련 핵심 테마와 인사이트 추출
4. **종목 분석**: 언급된 종목들의 투자 관점과 시장 영향도 분석
5. **주간 보고서 생성**: 추출된 인사이트를 바탕으로 전문적 보고서 형태로 재구성
6. **폴백 처리**: 해당 주간 포스트가 없으면 명확히 "포스트 없음" 표시

## 📊 보고서 구조

### 📋 **주간보고서 형식**
```typescript
interface WeeklyReport {
  week: string;                    // "2025년 8월 3주차" 형태
  period: string;                  // "2025-08-18 ~ 2025-08-24"
  totalPosts: number;              // 해당 주간 포스트 수
  
  // Claude 직접 분석 결과
  executiveSummary: string;        // 임원진이 읽을 수 있는 전문적 요약
  keyInsights: Array<{
    title: string;
    content: string;
    impact: 'high' | 'medium' | 'low';
    confidence: number;            // 0.0-1.0
  }>;
  
  stockAnalysis: Array<{
    ticker: string;
    name: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    reasoning: string;             // Claude가 분석한 구체적 근거
    mentionCount: number;
  }>;
  
  marketTrends: Array<{
    trend: string;
    description: string;
    relevantPosts: number[];       // 관련 포스트 ID들
  }>;
  
  sourcePosts: Array<{
    id: number;
    title: string;
    publishedAt: string;
    relevance: 'high' | 'medium' | 'low';
  }>;
  
  generatedAt: string;
  analysisMethod: 'claude_direct_analysis';
}
```

## 🎨 UI/UX 요구사항

### 📋 **페이지 구성**
- **제목**: "📈 메르 주간보고"
- **주간 선택**: 드롭다운으로 최근 8주간 선택 가능
- **보고서 섹션**: 
  1. 📊 주간 요약 (Executive Summary)
  2. 🎯 핵심 인사이트 (Key Insights) 
  3. 📈 종목 분석 (Stock Analysis)
  4. 🌐 시장 트렌드 (Market Trends)
  5. 📝 참조 포스트 (Source Posts)

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
- **모바일**: 세로 스택, 간결한 요약 중심
- **태블릿**: 2열 그리드, 상세 정보 표시
- **데스크톱**: 3열 그리드, 전체 보고서 표시

## 📡 API 규격

### 요청 형식
```typescript
interface WeeklyReportRequest {
  week?: string;        // "2025-W34" 형식, 기본값: 현재 주
  timezone?: string;    // 기본값: "Asia/Seoul"
}
```

### 응답 형식
```typescript
interface WeeklyReportResponse {
  success: boolean;
  data?: WeeklyReport;
  error?: {
    code: string;
    message: string;
  };
}
```

### 에러 코드
- `NO_POSTS_WEEK`: 해당 주간 포스트 없음
- `ANALYSIS_FAILED`: Claude 분석 실패
- `INVALID_WEEK`: 잘못된 주간 형식

## ⚡ 성능 요구사항

### 🚀 **속도 기준**
- **Claude 분석 시간**: < 5초 (주간 포스트 분석)
- **API 전체 응답**: < 8초
- **UI 렌더링**: < 1초
- **주간 선택 변경**: < 3초

### 💾 **캐싱 전략**
- **분석 결과**: 같은 주간 동일 요청 캐시 (24시간)
- **포스트 데이터**: 주간별 포스트 목록 캐시 (12시간)
- **보고서 렌더링**: 클라이언트 사이드 캐시 (1시간)

### 📊 **최적화 방안**
- **병렬 처리**: 포스트 분석 병렬 실행
- **지연 로딩**: 차트나 그래프 지연 로딩
- **에러 복구**: 부분 실패 시 일부 결과라도 표시

## 🧪 테스트 요구사항

### 📋 **필수 테스트 시나리오**
1. **포스트 있는 주간**: 정상적인 분석 보고서 생성
2. **포스트 없는 주간**: "해당 주간 포스트가 없습니다" 표시
3. **Claude 분석 품질**: 포스트 내용과 분석 결과 일치성 검증
4. **성능 기준**: 8초 이내 응답
5. **다크 모드**: 모든 색상 정상 표시
6. **반응형**: 모바일/태블릿/데스크톱 레이아웃 확인

### ⚠️ **Playwright 테스트 케이스**
```javascript
test('메르 주간보고 표시 및 기능', async ({ page }) => {
  await page.goto('/merry/weekly-report');
  
  // 페이지 로딩 확인
  await expect(page.locator('text=메르 주간보고')).toBeVisible();
  
  // 주간 선택 드롭다운 확인
  await expect(page.locator('select')).toBeVisible();
  
  // 보고서 섹션들 확인
  await expect(page.locator('text=주간 요약')).toBeVisible();
  await expect(page.locator('text=핵심 인사이트')).toBeVisible();
  await expect(page.locator('text=종목 분석')).toBeVisible();
  
  // 다크 모드 테스트
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(page.locator('body')).not.toHaveClass(/text-gray-900/);
});

test('주간보고 분석 품질 검증', async ({ page }) => {
  // API 응답 시간 확인
  const response = await page.request.get('/api/merry/weekly-reports');
  expect(response.status()).toBe(200);
  
  const data = await response.json();
  expect(data.success).toBe(true);
  
  // 분석 결과 품질 검증
  if (data.data && data.data.totalPosts > 0) {
    expect(data.data.executiveSummary).toBeTruthy();
    expect(data.data.keyInsights).toBeInstanceOf(Array);
    expect(data.data.stockAnalysis).toBeInstanceOf(Array);
  }
});
```

## 🚨 주의사항

### ❌ **절대 금지 사항**
- **가짜 분석 생성**: 포스트 없을 때 임의 보고서 생성 금지
- **외부 API 의존**: 모든 외부 AI 서비스 사용 금지
- **하드코딩**: 미리 정해진 분석 결과나 패턴 사용 금지
- **자동화**: 규칙 기반 자동 분석 시스템 금지

### ✅ **필수 준수사항**
- **Claude 직접 분석**: 유일한 허용 분석 방식
- **실제 데이터만**: 포스트 기반 분석 결과만 사용
- **8초 응답**: 성능 기준 엄격 준수
- **전문적 품질**: 임원진이 읽을 수 있는 보고서 수준

## 🔗 관련 문서

### 📄 **상위 문서**
- **`@CLAUDE.md`**: 전체 프로젝트 개발 가이드라인

### 📄 **관련 문서**
- **`@docs/post-list-page-requirements.md`**: 포스트 시스템 연동
- **`@docs/performance-requirements.md`**: 성능 최적화 가이드
- **`@docs/testing-requirements.md`**: 테스트 가이드라인

### 📄 **데이터 의존성**
- **blog_posts 테이블**: 주간별 포스트 데이터
- **merry_mentioned_stocks 테이블**: 종목 언급 정보

---

## 📝 요약

**메르 주간보고는 "글이 없으면 분석하지 말라" 원칙 하에 Claude가 직접 주간 포스트를 읽고 수동 분석하여 전문적 투자 보고서를 제공하는 핵심 페이지입니다.**

핵심 기능:
1. 🎯 **Claude 직접 분석**: 외부 API 없이 Claude 수동 분석만 허용
2. 📊 **전문적 보고서**: 임원진이 읽을 수 있는 고품질 분석
3. ⚡ **빠른 응답**: 8초 이내 분석 완료 및 표시
4. 🎨 **다크 모드**: semantic 색상으로 완전 호환
5. 📱 **반응형**: 모든 기기에서 최적화된 표시