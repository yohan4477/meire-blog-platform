# 🎯 메르's Pick 요구사항

> **메르's Pick** 컴포넌트 개발을 위한 포괄적인 요구사항 문서

## 🎯 컴포넌트 개요

- **컴포넌트**: `src/components/merry/MerryPicks.tsx`
- **API 엔드포인트**: `/api/merry/picks`
- **사용 위치**: 메인 페이지 (`src/app/page.tsx`), 종목 관련 페이지
- **목적**: 메르가 최근에 언급한 종목들을 우선순위로 표시

## 🎯 핵심 기능 요구사항

### 📊 **표시 순서 (핵심 요구사항 - 절대 준수)**

**🔥 최우선 원칙**: **메르가 언급한 최신 날짜 순으로 랭킹** (`lastMention` 기준 내림차순)

1. **⚠️ 최신 언급일 기준 정렬** (`last_mentioned_at` 기준 내림차순)
   - **❌ 포스트 개수 기준 랭킹 절대 금지**
   - **✅ 최신 언급일(`last_mentioned_at`) 기준만 사용**
2. **언급 횟수는 보조 정보로만 표시** (`mention_count`)
3. **메르가 언급한 종목만 표시** (`mention_count > 0`)

### 🎨 **UI 구성 요소**

#### 기본 구조
- **제목**: "메르's Pick" 
- **표시 개수**: 최대 5-10개 종목
- **정렬**: 최신 언급일 기준 내림차순

#### 종목별 표시 정보
- **티커**: 종목 코드 (예: TSLA, 005930)
- **종목명**: 회사명 (예: 테슬라, 삼성전자)
- **최근 언급일**: YYYY-MM-DD 형태
- **현재가**: 실시간 가격 정보 (있는 경우)
- **배지**: 종목 위에 작성 (종목 아래가 아님)

#### 회사 소개 요구사항 (필수)
- **⚠️ 회사 소개 필수**: "회사 사업 정보"가 아닌 실제 회사 한줄 소개로 성의있게 작성
- **신규 종목 자동 처리**: 새로운 종목이 메르's Pick에 들어가면 회사 사업 정보 자동 생성

#### 인터랙션
- **클릭 액션**: 해당 종목 상세 페이지로 이동 (`/merry/stocks/[ticker]`)
- **반응형 디자인**: 모바일/태블릿/데스크톱 최적화

## 🔗 데이터 연동

### 데이터베이스 테이블
- **주 테이블**: `merry_mentioned_stocks`
- **정렬 기준**: `last_mentioned_at DESC`
- **필터 조건**: `mention_count > 0`

### API 연동
- **엔드포인트**: `/api/merry/picks`
- **파라미터**: 
  - `limit`: 표시할 종목 수 (기본값: 10)
  - `includePrice`: 실시간 가격 포함 여부 (선택사항)

### 실시간 가격 정보
- **연동 방식**: Finance API 또는 외부 주가 API
- **업데이트 주기**: 15분 지연 또는 실시간
- **fallback**: 가격 정보 없을 때 적절한 안내

## 🎨 UI/UX 요구사항

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
- **모바일**: 세로 스택, 카드형 레이아웃
- **태블릿**: 2열 그리드
- **데스크톱**: 3-4열 그리드 또는 가로 스크롤

### 🎯 **사용자 경험**
- **로딩 상태**: 스켈레톤 UI 제공
- **에러 상태**: 적절한 에러 메시지
- **빈 상태**: 메르가 언급한 종목이 없을 때 안내
- **상호작용**: 호버 효과, 클릭 피드백

## 📡 API 규격

### 요청 형식
```typescript
interface PicksRequest {
  limit?: number;        // 표시할 종목 수 (기본값: 10)
  includePrice?: boolean; // 실시간 가격 포함 여부
}
```

### 응답 형식
```typescript
interface PicksResponse {
  success: boolean;
  data?: {
    picks: Array<{
      ticker: string;
      name: string;
      description: string;    // 회사 한줄 소개
      lastMentioned: string; // ISO 날짜 형식
      mentionCount: number;
      currentPrice?: {
        price: number;
        change: number;
        changePercent: number;
        currency: string;
      };
      badge?: string;        // 배지 텍스트 (예: "NEW", "HOT")
    }>;
    totalCount: number;
    lastUpdated: string;
  };
  error?: {
    code: string;
    message: string;
  };
}
```

### 에러 코드
- `NO_PICKS_AVAILABLE`: 메르가 언급한 종목이 없음
- `PRICE_FETCH_FAILED`: 실시간 가격 조회 실패
- `DATABASE_ERROR`: 데이터베이스 연결 오류

## ⚡ 성능 요구사항

### 🚀 **속도 기준**
- **로딩 시간**: < 500ms
- **API 응답**: < 300ms
- **가격 정보 조회**: < 200ms (병렬 처리)
- **UI 렌더링**: < 100ms

### 💾 **캐싱 전략**
- **종목 리스트**: 5분 캐시
- **가격 정보**: 1분 캐시 (실시간성 중요)
- **회사 소개**: 24시간 캐시 (변경 빈도 낮음)

### 📊 **최적화 방안**
- **병렬 처리**: 종목 정보와 가격 정보 병렬 조회
- **지연 로딩**: 가격 정보는 필요시에만 로딩
- **에러 복구**: 부분 실패 시 일부 결과라도 표시
- **메인 페이지 영향 최소화**: 메르's Pick 로딩이 메인 페이지 전체 로딩에 영향 주지 않음

## 🔄 데이터 갱신

### 자동 갱신 시점
1. **새 포스트 추가 시**: 언급된 종목 자동 감지 및 추가
2. **언급 날짜 업데이트**: 기존 종목 재언급 시 `last_mentioned_at` 갱신
3. **언급 횟수 증가**: `mention_count` 자동 증가

### 수동 갱신 방법
```bash
# 메르's Pick 데이터 강제 갱신
node scripts/update-merry-picks.js

# 가격 정보 수동 갱신
node scripts/update-stock-prices.js
```

### 데이터 검증
- **중복 제거**: 하나의 포스트에서 여러 번 언급된 종목 중복 카운트 방지
- **유효성 검사**: 존재하지 않는 티커 필터링
- **데이터 일관성**: 언급 횟수와 실제 포스트 수 일치 확인

### 🚨 **언급/분석 개수 불일치 방지 (필수 준수)**
**문제**: `post_stock_analysis` 테이블의 분석 개수가 실제 `blog_posts`에서 언급된 개수보다 많아지는 현상

#### 📊 **원인 분석**
- **근본 원인**: 중복 분석 데이터 생성 또는 실제 언급 없는 분석 데이터 존재
- **구체적 사례**: 005930(삼성전자) - 실제 언급 37개 vs 분석 39개 (+2개 초과)

#### ✅ **필수 해결책 (API 레벨)**
```sql
-- ❌ 잘못된 방식 (단순 COUNT는 중복 허용)
COUNT(psa.id) as analyzed_count

-- ✅ 올바른 방식 (DISTINCT로 중복 제거)
COUNT(DISTINCT psa.post_id) as analyzed_count,
(
  SELECT COUNT(DISTINCT bp.id) 
  FROM blog_posts bp 
  WHERE (
    bp.title LIKE '%' || s.ticker || '%' OR 
    bp.content LIKE '%' || s.ticker || '%' OR
    bp.title LIKE '%' || s.company_name || '%' OR 
    bp.content LIKE '%' || s.company_name || '%'
  )
) as actual_mention_count
```

#### 🔧 **로직 규칙 (절대 준수)**
```typescript
// ✅ 올바른 mention_count 계산
mention_count: Math.max(stock.actual_mention_count, stock.analyzed_count)

// ❌ 잘못된 방식 (기존 stocks 테이블 값 그대로 사용)
mention_count: stock.mention_count // 부정확할 수 있음
```

#### 🚫 **금지사항**
- **analyzed_count > mention_count 상황 허용**: 논리적으로 불가능한 상황
- **중복 분석 데이터 허용**: post_stock_analysis에서 같은 post_id + ticker 중복 허용 금지
- **가짜 언급 데이터**: 실제 blog_posts에 없는 내용을 기반으로 한 분석 금지

#### 📋 **검증 체크리스트 (개발 시 필수)**
1. **SQL 쿼리 검증**: `COUNT(DISTINCT psa.post_id)` 사용 여부
2. **실제 언급 수 계산**: blog_posts에서 직접 언급 수 조회
3. **로직 일관성**: `mention_count >= analyzed_count` 보장
4. **중복 제거**: 같은 포스트-종목 조합 중복 방지
5. **데이터 무결성**: 분석 없이 언급만 있는 경우 정상 처리

#### 🧪 **테스트 시나리오 (필수 추가)**
```javascript
test('언급/분석 개수 데이터 정합성 검증', async ({ page }) => {
  const response = await page.request.get('/api/merry/stocks?limit=5&pricesOnly=false');
  const data = await response.json();
  
  // 모든 종목에 대해 mention_count >= analyzed_count 검증
  data.data.stocks.forEach(stock => {
    expect(stock.mention_count).toBeGreaterThanOrEqual(stock.analyzed_count);
    
    // 개발 환경에서 actual_mention_count 검증
    if (stock.actual_mention_count !== undefined) {
      expect(stock.mention_count).toBeGreaterThanOrEqual(stock.actual_mention_count);
    }
  });
});
```

## 🧪 테스트 요구사항

### 📋 **필수 테스트 시나리오**
1. **정렬 순서 확인**: 최신 언급일 기준 내림차순 정렬
2. **종목 정보 표시**: 티커, 종목명, 언급일, 가격 정보 표시
3. **빈 상태 처리**: 메르가 언급한 종목이 없을 때 적절한 안내
4. **에러 처리**: API 실패, 가격 조회 실패 시 graceful degradation
5. **클릭 액션**: 종목 클릭 시 상세 페이지 이동
6. **반응형 디자인**: 모바일/태블릿/데스크톱 레이아웃 확인
7. **다크 모드**: 모든 색상 정상 표시
8. **성능 기준**: 500ms 이내 로딩

### ⚠️ **Playwright 테스트 케이스**
```javascript
test('메르\'s Pick 표시 및 기능', async ({ page }) => {
  await page.goto('/');
  
  // 메르's Pick 컴포넌트 로딩 확인
  await expect(page.locator('text=메르\'s Pick')).toBeVisible();
  
  // 종목 리스트 표시 확인
  const stockItems = page.locator('[data-testid="merry-pick-item"]');
  await expect(stockItems.first()).toBeVisible();
  
  // 종목 정보 표시 확인
  const firstStock = stockItems.first();
  await expect(firstStock.locator('[data-testid="stock-ticker"]')).toBeVisible();
  await expect(firstStock.locator('[data-testid="stock-name"]')).toBeVisible();
  await expect(firstStock.locator('[data-testid="last-mentioned"]')).toBeVisible();
  
  // 종목 클릭 테스트
  const ticker = await firstStock.locator('[data-testid="stock-ticker"]').textContent();
  await firstStock.click();
  await expect(page).toHaveURL(new RegExp(`/merry/stocks/${ticker}`));
});

test('메르\'s Pick 정렬 및 데이터 검증', async ({ page }) => {
  // API 응답 시간 확인
  const response = await page.request.get('/api/merry/picks?limit=10');
  expect(response.status()).toBe(200);
  
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(Array.isArray(data.data.picks)).toBe(true);
  
  // 정렬 순서 확인 (최신 언급일 기준)
  const picks = data.data.picks;
  for (let i = 0; i < picks.length - 1; i++) {
    const currentDate = new Date(picks[i].lastMentioned);
    const nextDate = new Date(picks[i + 1].lastMentioned);
    expect(currentDate >= nextDate).toBe(true);
  }
});

test('메르\'s Pick 반응형 및 다크모드', async ({ page }) => {
  await page.goto('/');
  
  // 모바일 뷰포트 테스트
  await page.setViewportSize({ width: 375, height: 667 });
  const mobileLayout = page.locator('[data-testid="merry-picks-container"]');
  await expect(mobileLayout).toBeVisible();
  
  // 다크 모드 테스트
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(mobileLayout).not.toHaveClass(/text-gray-900/);
  
  // 데스크톱 뷰포트 테스트
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(mobileLayout).toBeVisible();
});
```

### 🎯 **품질 검증 기준**
```javascript
// 데이터 품질 검증 예시
const qualityCheck = {
  sortingAccuracy: "최신 언급일 기준 정렬이 정확한가?",
  dataCompleteness: "필수 정보(티커, 종목명, 언급일)가 모두 있는가?",
  performanceTarget: "500ms 이내 로딩을 달성하는가?",
  uiConsistency: "다크모드와 반응형 디자인이 일관되는가?",
  errorHandling: "에러 상황에서 적절히 처리되는가?"
};
```

## 🚨 주의사항

### ❌ **절대 금지 사항**
- **포스트 개수 기준 정렬**: 언급 횟수가 아닌 최신 언급일만 사용
- **더미 데이터 사용**: 실제 데이터 없을 때 가짜 데이터 생성 금지
- **하드코딩된 색상**: 다크모드 비호환 색상 사용 금지
- **성능 저해**: 메인 페이지 로딩 시간에 영향 주는 무거운 연산 금지

### ✅ **필수 준수사항**
- **최신 언급일 기준 정렬**: 유일한 허용 정렬 방식
- **실제 데이터만**: 메르가 실제로 언급한 종목만 표시
- **500ms 응답**: 성능 기준 엄격 준수
- **다크 모드**: semantic 색상 완전 지원

## 🔗 관련 문서

### 📄 **상위 문서**
- **`@docs/main-page-requirements.md`**: 메인 페이지 전체 구성에서 이 컴포넌트 위치

### 📄 **관련 문서**
- **`@CLAUDE.md`**: 전체 프로젝트 개발 가이드라인
- **`@docs/stock-page-requirements.md`**: 종목 상세 페이지 연동
- **`@docs/performance-requirements.md`**: 성능 최적화 가이드

### 📄 **데이터 의존성**
- **merry_mentioned_stocks 테이블**: 메르 언급 종목 데이터
- **stocks 테이블**: 종목 기본 정보
- **blog_posts 테이블**: 포스트 기반 언급 분석

---

## 📝 요약

**메르's Pick은 메르가 최근에 언급한 종목들을 최신 언급일 기준으로 정렬하여 표시하는 핵심 컴포넌트입니다.**

핵심 기능:
1. 🎯 **최신 언급일 기준 정렬**: 포스트 개수가 아닌 언급 시점 기준
2. 📊 **실시간 가격 연동**: 선택적 실시간 주가 정보 표시
3. ⚡ **빠른 응답**: 500ms 이내 로딩 완료
4. 🎨 **다크 모드**: semantic 색상으로 완전 호환
5. 📱 **반응형**: 모든 기기에서 최적화된 표시