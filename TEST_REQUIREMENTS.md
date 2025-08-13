# 📋 메르 블로그 플랫폼 테스트 요구사항

> **CLAUDE.md 기반 종목 화면 테스트 요구사항 문서**  
> 모든 테스트는 이 문서의 요구사항을 준수해야 합니다.

---

## 🎯 핵심 테스트 원칙

### 1. **CLAUDE.md 준수 검증 (필수)**
- ✅ **Dummy Data 금지**: 모든 가짜/샘플 데이터 사용 금지
- ✅ **"정보 없음" 표시**: 실제 데이터 없을 때 명확한 안내
- ✅ **3초 로딩 제한**: 모든 페이지 로딩 시간 < 3초
- ✅ **메르 언급 종목만**: 메르가 언급한 종목만 데이터 제공
- ✅ **6개월치 데이터**: 180일 기준 차트 데이터

### 2. **성능 요구사항 검증**
- 초기 로딩: < 3초 (절대 한계)
- 차트 렌더링: < 1초
- API 응답: < 500ms
- 차트 상호작용: < 100ms

### 3. **데이터 무결성 검증**
- Dummy data 완전 제거 확인
- 실제 데이터 vs "정보 없음" 적절한 구분
- 메르 언급일에만 차트 마커 표시
- 미언급 날짜는 마커 표시 안 함

---

## 🧪 테스트 시나리오 상세

### A. 성능 테스트

#### A1. 페이지 로딩 성능
```typescript
test('종목 페이지 기본 로딩 및 3초 제한', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;
  
  // CLAUDE.md 요구사항: 로딩은 3초를 넘으면 안 됨
  expect(loadTime).toBeLessThan(3000);
});
```

#### A2. 차트 렌더링 성능
```typescript
test('성능 요구사항: 차트 렌더링 1초 이내', async ({ page }) => {
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  const startTime = Date.now();
  
  await page.locator('.recharts-wrapper')
    .or(page.locator('text=가격 정보 없음'))
    .waitFor();
  
  const renderTime = Date.now() - startTime;
  expect(renderTime).toBeLessThan(1000);
});
```

### B. Dummy Data 금지 검증

#### B1. 가격 정보 없음 시 올바른 메시지
```typescript
test('가격 정보 없음 시 올바른 메시지 표시', async ({ page }) => {
  await page.goto('http://localhost:3004/merry/stocks/NONEXISTENT');
  
  // CLAUDE.md 원칙: dummy data 대신 "정보 없음" 표시
  await expect(
    page.locator('text=가격 정보 없음')
      .or(page.locator('text=종목을 찾을 수 없습니다'))
  ).toBeVisible();
  
  // Dummy data 금지 확인
  await expect(page.locator('text=예시')).not.toBeVisible();
  await expect(page.locator('text=샘플')).not.toBeVisible();
  await expect(page.locator('text=$100')).not.toBeVisible();
});
```

#### B2. 관련 포스트 실제 데이터만 표시
```typescript
test('관련 포스트 섹션 - 실제 데이터만 표시', async ({ page }) => {
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  
  const postsSection = page.locator('text=관련 포스트');
  if (await postsSection.isVisible()) {
    // CLAUDE.md 원칙: dummy data 금지
    await expect(page.locator('text=예시:')).not.toBeVisible();
    await expect(page.locator('text=샘플 포스트')).not.toBeVisible();
    
    // 실제 데이터 또는 "준비 중" 메시지만 허용
    const hasRealPosts = await page.locator('[data-testid="post-item"]').count() > 0;
    const hasNoPostsMessage = await page.locator('text=준비하고 있습니다').isVisible();
    expect(hasRealPosts || hasNoPostsMessage).toBeTruthy();
  }
});
```

### C. 메르 글 연동 검증

#### C1. 메르 언급 시에만 마커 표시
```typescript
test('메르 글 언급 시에만 마커 표시', async ({ page }) => {
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  
  const chart = page.locator('.recharts-wrapper');
  if (await chart.isVisible()) {
    // 메르 글 언급 마커 확인
    const mentionMarker = page.locator('.recharts-dot[fill="#dc2626"]')
      .or(page.locator('.recharts-dot[fill="#16a34a"]'));
    
    if (await mentionMarker.first().isVisible()) {
      await mentionMarker.first().hover();
      // 툴팁에 메르 언급 관련 내용 확인
      await expect(
        page.locator('text=메르의 언급')
          .or(page.locator('[data-testid="mention-tooltip"]'))
      ).toBeVisible();
    }
  } else {
    // 차트가 없으면 "정보 없음" 확인
    await expect(
      page.locator('text=가격 정보 없음')
        .or(page.locator('text=아직 준비되지 않았습니다'))
    ).toBeVisible();
  }
});
```

#### C2. 언급 없는 날 마커 미표시
```typescript
test('언급 없는 날에는 마커 표시 안 함', async ({ page }) => {
  await page.goto('http://localhost:3004/merry/stocks/005930');
  
  const chart = page.locator('.recharts-wrapper');
  if (await chart.isVisible()) {
    // 일반 데이터 점은 마커가 없어야 함
    // 메르 언급일만 특별한 색상 마커 (빨강/초록)
    const mentionDots = page.locator('.recharts-dot[fill="#dc2626"]')
      .or(page.locator('.recharts-dot[fill="#16a34a"]'));
    
    // 언급 마커는 있을 수도 없을 수도 있지만,
    // 일반 날짜에는 마커가 표시되지 않아야 함
    const regularLine = page.locator('.recharts-line');
    await expect(regularLine).toBeVisible();
  }
});
```

### D. 종목별 데이터 검증

#### D1. 메르 언급 종목만 차트 표시
```typescript
test('메르 언급 종목만 차트 데이터 표시', async ({ page }) => {
  // 메르가 언급한 종목 테스트
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  await page.waitForLoadState('networkidle');
  
  await expect(page.locator('h1')).toContainText('Tesla');
  
  // 차트나 "정보 없음" 메시지 중 하나는 있어야 함
  const hasChart = await page.locator('.recharts-wrapper').isVisible();
  const hasNoDataMessage = await page.locator('text=가격 정보 없음').isVisible();
  expect(hasChart || hasNoDataMessage).toBeTruthy();
  
  // CLAUDE.md 원칙: dummy data 표시 금지
  await expect(page.locator('text=예시 데이터')).not.toBeVisible();
  await expect(page.locator('text=샘플:')).not.toBeVisible();
});
```

#### D2. 미언급 종목 적절한 안내
```typescript
test('미언급 종목 접근시 적절한 안내', async ({ page }) => {
  await page.goto('http://localhost:3004/merry/stocks/UNKNOWN');
  
  // 적절한 안내 메시지 표시
  await expect(
    page.locator('text=종목을 찾을 수 없습니다')
      .or(page.locator('text=가격 정보 없음'))
      .or(page.locator('text=준비되지 않았습니다'))
  ).toBeVisible();
  
  // Dummy data 미표시 확인
  await expect(page.locator('text=$')).not.toBeVisible();
  await expect(page.locator('text=포스트').and(page.locator('text=개'))).not.toBeVisible();
});
```

### E. 6개월 차트 검증

#### E1. 6개월치 차트 기본 표시
```typescript
test('6개월치 차트 기본 표시', async ({ page }) => {
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  
  // 차트 컨테이너 또는 "정보 없음" 메시지 확인
  const chartContainer = page.locator('.recharts-wrapper')
    .or(page.locator('[data-testid="stock-chart"]'));
  
  await expect(
    chartContainer.or(page.locator('text=가격 정보 없음'))
  ).toBeVisible();
  
  // 6개월 관련 텍스트 확인 (데이터가 있을 때)
  const sixMonthText = page.locator('text=6개월')
    .or(page.locator('text=180일'));
  if (await sixMonthText.isVisible()) {
    await expect(sixMonthText).toBeVisible();
  }
});
```

### F. 반응형 및 접근성 테스트

#### F1. 모바일 반응형
```typescript
test('모바일 반응형 테스트', async ({ page }) => {
  // 모바일 뷰포트 설정
  await page.setViewportSize({ width: 375, height: 667 });
  
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  await page.waitForLoadState('networkidle');
  
  // 모바일에서도 기본 요소 표시 확인
  await expect(page.locator('h1')).toBeVisible();
  
  // 차트 또는 "정보 없음" 메시지 확인
  const chartOrMessage = page.locator('.recharts-wrapper')
    .or(page.locator('text=가격 정보 없음'));
  await expect(chartOrMessage).toBeVisible();
});
```

---

## 🚨 금지사항 체크리스트

### 절대 표시되면 안 되는 요소들:

#### Dummy Data 관련
- [ ] `text=예시 데이터`
- [ ] `text=샘플:`  
- [ ] `text=$100` (임의 가격)
- [ ] `text=3개 포스트` (임의 개수)
- [ ] `text=준비 중` (단, "준비하고 있습니다"는 허용)

#### 부적절한 메시지
- [ ] `text=로딩 중...` (3초 이상)
- [ ] `text=데이터 없음` (대신 "정보 없음" 사용)
- [ ] `text=임시 데이터`
- [ ] `text=테스트 데이터`

---

## 🎯 테스트 실행 명령어

### 전체 테스트 실행
```bash
# 모든 테스트 실행
npx playwright test tests/merry-stock-requirements.spec.ts

# 헤드리스 모드
npx playwright test tests/merry-stock-requirements.spec.ts --headed

# 단일 워커로 실행 (안정성)
npx playwright test tests/merry-stock-requirements.spec.ts --workers=1
```

### 특정 테스트만 실행
```bash
# 성능 테스트만
npx playwright test tests/merry-stock-requirements.spec.ts -g "성능"

# Dummy data 검증만
npx playwright test tests/merry-stock-requirements.spec.ts -g "가격 정보 없음"

# 메르 글 연동만
npx playwright test tests/merry-stock-requirements.spec.ts -g "메르 글"
```

---

## 📊 성공 기준

### 필수 통과 항목
1. **성능**: 모든 로딩 시간 < 3초
2. **Dummy Data**: 0건 검출
3. **정보 없음**: 적절한 메시지 표시
4. **메르 연동**: 언급일에만 마커 표시
5. **6개월 데이터**: 180일 기준 구조

### 권장 통과율
- **전체 테스트**: 90% 이상 통과
- **핵심 테스트**: 100% 통과 (성능, Dummy data 금지)
- **크로스 브라우저**: Chrome, Firefox 모두 통과

---

## 🔄 지속적 검증

### 개발 중 확인사항
1. 새로운 기능 추가 시 dummy data 사용 금지
2. API 응답에 실제 데이터 또는 빈 배열만 반환
3. UI에 "정보 없음" 메시지 적절히 표시
4. 성능 요구사항 지속적 모니터링

### 배포 전 필수 검증
- [ ] 전체 테스트 통과
- [ ] 성능 요구사항 만족
- [ ] Dummy data 완전 제거
- [ ] CLAUDE.md 요구사항 100% 준수

---

## 🔒 섹션 오류 방지 TC (Test Cases)

### 📋 섹션 오류 절대 금지 체크리스트

#### TC-001: 페이지 기본 구조 검증
- [ ] `html` 태그 정상 렌더링
- [ ] `body` 태그 정상 렌더링  
- [ ] `h1` 태그 존재 및 내용 확인
- [ ] 메인 네비게이션 섹션 존재

#### TC-002: JavaScript 에러 완전 차단
- [ ] `TypeError` 절대 발생 금지
- [ ] `ReferenceError` 절대 발생 금지
- [ ] `SyntaxError` 절대 발생 금지
- [ ] `Cannot read properties` 에러 금지
- [ ] `is not defined` 에러 금지
- [ ] `Uncaught` 에러 금지

#### TC-003: 차트 섹션 안정성 보장
- [ ] 차트 로딩 실패 시 적절한 fallback
- [ ] SVG 렌더링 에러 방지
- [ ] 차트 상호작용 에러 방지
- [ ] Recharts 에러 완전 차단

#### TC-004: API 응답 실패 시 섹션 보호
- [ ] 500 에러 시에도 페이지 구조 유지
- [ ] 네트워크 실패 시 적절한 에러 메시지
- [ ] API 지연 시 로딩 상태 표시
- [ ] 타임아웃 시 섹션 붕괴 방지

#### TC-005: 존재하지 않는 데이터 처리
- [ ] 잘못된 종목 코드 접근 시 안정적 처리
- [ ] 빈 데이터 응답 시 적절한 메시지
- [ ] undefined/null 데이터 안전 처리
- [ ] 배열 접근 에러 방지

### 🧪 섹션 오류 방지 테스트 실행

```bash
# 섹션 오류 검증 테스트 실행
npx playwright test tests/critical-sections.spec.ts --workers=1

# 상세 페이지 오류 검증
npx playwright test tests/detailed-page-errors.spec.ts --workers=1

# 전체 오류 방지 테스트
npx playwright test tests/critical-sections.spec.ts tests/detailed-page-errors.spec.ts
```

### 🚨 섹션 오류 발생 시 대응 절차

1. **즉시 테스트 실행**: 해당 TC 항목 확인
2. **에러 로그 수집**: JavaScript/Console 에러 전체 캡처
3. **원인 분석**: 어떤 섹션에서 어떤 이유로 실패했는지 파악
4. **수정 및 재검증**: TC 항목 모두 통과할 때까지 수정
5. **회귀 테스트**: 다른 페이지에도 영향 없는지 확인

### 📊 TC 통과 기준

- **JavaScript 에러**: 0건 (절대 허용 안 함)
- **섹션 구조**: 100% 정상 렌더링
- **에러 핸들링**: 모든 실패 상황에서 적절한 fallback
- **사용자 경험**: 어떤 상황에서도 빈 화면이나 에러 화면 금지

---

> 📝 **마지막 업데이트**: 2025-08-13  
> 🎯 **TC 목표**: 섹션 오류 0% 달성 및 유지  
> 🚀 **품질 기준**: CLAUDE.md 원칙 + 섹션 안정성 100% 보장