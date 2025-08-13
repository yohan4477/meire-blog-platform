# 🧪 메르 블로그 플랫폼 테스트 요구사항

> **Playwright 기반 포괄적 테스트 가이드라인**  
> 모든 테스트는 반드시 Playwright를 활용하여 완료해야 합니다.

---

## 🎯 포괄적 테스트 요구사항

### 핵심 테스트 원칙

#### 1. **CLAUDE.md 준수 검증 (필수)**
- ✅ **Dummy Data 금지**: 모든 가짜/샘플 데이터 사용 금지
- ✅ **"정보 없음" 표시**: 실제 데이터 없을 때 명확한 안내
- ✅ **3초 로딩 제한**: 모든 페이지 로딩 시간 < 3초
- ✅ **메르 언급 종목만**: 메르가 언급한 종목만 데이터 제공
- ✅ **6개월치 데이터**: 180일 기준 차트 데이터

#### 2. **성능 요구사항 검증**
- 초기 로딩: < 3초 (절대 한계)
- 차트 렌더링: < 1.5초
- API 응답: < 500ms
- 차트 상호작용: < 100ms

#### 3. **데이터 무결성 검증**
- Dummy data 완전 제거 확인
- 실제 데이터 vs "정보 없음" 적절한 구분
- 메르 언급일에만 차트 마커 표시
- 미언급 날짜는 마커 표시 안 함

---

## 🚨 섹션 오류 방지 TC (Test Cases)

### TC-001: 페이지 기본 구조 검증
- [ ] `html` 태그 정상 렌더링
- [ ] `body` 태그 정상 렌더링  
- [ ] `h1` 태그 존재 및 내용 확인
- [ ] 메인 네비게이션 섹션 존재

### TC-002: JavaScript 에러 완전 차단
- [ ] `TypeError` 절대 발생 금지
- [ ] `ReferenceError` 절대 발생 금지
- [ ] `SyntaxError` 절대 발생 금지
- [ ] `Cannot read properties` 에러 금지
- [ ] `is not defined` 에러 금지
- [ ] `Uncaught` 에러 금지

### TC-003: 차트 섹션 안정성 보장
- [ ] 차트 로딩 실패 시 적절한 fallback
- [ ] SVG 렌더링 에러 방지
- [ ] 차트 상호작용 에러 방지
- [ ] Recharts 에러 완전 차단

### TC-004: API 응답 실패 시 섹션 보호
- [ ] 500 에러 시에도 페이지 구조 유지
- [ ] 네트워크 실패 시 적절한 에러 메시지
- [ ] API 지연 시 로딩 상태 표시
- [ ] 타임아웃 시 섹션 붕괴 방지

### TC-005: 메르's Pick 포스트 클릭 테스트
- [ ] 메르's Pick 섹션의 모든 종목 클릭 가능
- [ ] 종목 클릭 시 해당 종목 상세 페이지로 올바른 이동
- [ ] 종목 상세 페이지 로딩 성공 (3초 이내)
- [ ] 종목 페이지에서 기본 정보 표시 확인
- [ ] 차트 또는 "정보 없음" 메시지 적절히 표시
- [ ] 뒤로 가기 버튼 정상 작동
- [ ] 메르's Pick → 종목 상세 → 메인으로 돌아가는 전체 플로우 검증

---

## ❌ 금지사항 체크리스트

### 절대 표시되면 안 되는 요소들:
- [ ] `text=예시 데이터`
- [ ] `text=샘플:`  
- [ ] `text=$100` (임의 가격)
- [ ] `text=3개 포스트` (임의 개수)
- [ ] `text=로딩 중...` (3초 이상)
- [ ] `text=임시 데이터`
- [ ] `text=테스트 데이터`

---

## 📋 테스트 시나리오 상세

### A. 성능 테스트 예제
```typescript
test('종목 페이지 기본 로딩 및 3초 제한', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;
  
  // CLAUDE.md 요구사항: 로딩은 3초를 넘으면 안 됨
  expect(loadTime).toBeLessThan(3000);
});

test('성능 요구사항: 차트 렌더링 1초 이내', async ({ page }) => {
  await page.goto('http://localhost:3004/merry/stocks/TSLA');
  const startTime = Date.now();
  
  await page.locator('.recharts-wrapper')
    .or(page.locator('text=가격 정보 없음'))
    .waitFor();
  
  const renderTime = Date.now() - startTime;
  expect(renderTime).toBeLessThan(1500);
});
```

### B. Dummy Data 금지 검증 예제
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

### C. 메르 글 연동 검증 예제
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

### D. 메르's Pick 클릭 테스트 예제
```typescript
test('메르s Pick 전체 플로우 테스트', async ({ page }) => {
  await page.goto('http://localhost:3004');
  
  // 메르's Pick 섹션 확인
  await expect(page.locator('text=메르\'s Pick')).toBeVisible();
  
  // 첫 번째 종목 클릭
  const firstStock = page.locator('[data-testid="merry-pick-stock"]').first();
  await expect(firstStock).toBeVisible();
  
  // 종목 클릭하여 상세 페이지로 이동
  await firstStock.click();
  
  // 종목 상세 페이지 로딩 확인 (3초 이내)
  const startTime = Date.now();
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000);
  
  // 기본 정보 표시 확인
  await expect(page.locator('h1')).toBeVisible();
  
  // 차트 또는 "정보 없음" 메시지 확인
  const chartOrMessage = page.locator('.recharts-wrapper')
    .or(page.locator('text=가격 정보 없음'));
  await expect(chartOrMessage).toBeVisible();
  
  // 뒤로 가기
  await page.goBack();
  await expect(page.locator('text=메르\'s Pick')).toBeVisible();
});
```

---

## 🖥️ 크로스 브라우저 테스트

### 지원 브라우저
- **Chrome** (기본)
- **Firefox** 
- **Safari** (macOS에서)
- **Edge** (Windows에서)

### 모바일 테스트
- **Galaxy S9** (Android)
- **iPhone 12** (iOS)
- **iPad** (태블릿)

---

## ⚡ 테스트 실행 명령어

```bash
# 전체 테스트 실행
npx playwright test

# 섹션 오류 검증 테스트
npx playwright test tests/critical-sections.spec.ts --workers=1

# 상세 페이지 오류 검증
npx playwright test tests/detailed-page-errors.spec.ts --workers=1

# 메르 종목 요구사항 테스트
npx playwright test tests/merry-stock-requirements.spec.ts

# 특정 테스트만 실행
npx playwright test -g "성능"
npx playwright test -g "가격 정보 없음"
npx playwright test -g "메르 글"
npx playwright test -g "메르's Pick"

# 크로스 브라우저 테스트
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# 모바일 테스트
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
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

### TC 통과 기준
- **JavaScript 에러**: 0건 (절대 허용 안 함)
- **섹션 구조**: 100% 정상 렌더링
- **에러 핸들링**: 모든 실패 상황에서 적절한 fallback
- **사용자 경험**: 어떤 상황에서도 빈 화면이나 에러 화면 금지

---

## 🌐 테스트 완료 후 웹사이트 자동 오픈 (필수)

**테스트가 종료되면 반드시 해당 서비스를 웹사이트에 열어서 보여줘야 합니다:**

```bash
# 포트는 상황에 따라 자동 설정 (기본값: 3004)
start http://localhost:[자동설정포트]
```

**확인해야 할 사항:**
- 기능 정상 동작
- **로딩 시간 < 3초** (필수 측정)
- UI/UX 일관성
- 반응형 디자인
- 접근성 (a11y)

---

> 📝 **마지막 업데이트**: 2025-08-13  
> 💬 **문의사항**: 테스트 관련 질문이나 개선사항이 있으면 언제든지 알려주세요.