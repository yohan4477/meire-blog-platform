# 🔄 업데이트 요구사항 명세서

> **메르 블로그 플랫폼의 크롤링 및 업데이트 프로세스 완전 가이드**  
> 종목 종가 업데이트와 포스트 업데이트 두 가지 주요 업데이트 방향을 다룹니다.

---

## 📋 업데이트 시스템 개요

### 🎯 **두 가지 주요 업데이트 방향**

#### 1. **📊 종목 종가 업데이트**
- **목적**: 메르가 언급한 종목의 주가 데이터 수집 및 저장
- **데이터 소스**: Yahoo Finance API, Alpha Vantage API
- **업데이트 주기**: 
  - **국내장**: 매일 장 마감 후 (15:30 KST)
  - **국외장**: 매일 장 마감 후 (06:00 KST, 다음날)
- **대상 테이블**: `stock_prices`, `stocks`

#### 2. **📝 포스트 업데이트**
- **목적**: 새로운 블로그 포스트 감지 및 관련 데이터 갱신
- **데이터 소스**: 메르 블로그 RSS/웹 크롤링
- **업데이트 주기**: 3시간 20분마다 (00:20, 03:20, 06:20, 09:20, 12:20, 15:20, 18:20, 21:20 KST)
- **대상 테이블**: `blog_posts`, `stocks`, `post_stock_analysis`

---

## 🕐 크롤링 스케줄 정책

### 📅 **정기 크롤링 스케줄**

#### **포스트 크롤링** (3시간 20분 주기)
```bash
# KST 기준 스케줄
00:20 - 자정 크롤링 (하루 시작)
03:20 - 새벽 크롤링 
06:20 - 아침 크롤링 + 국외장 종가 업데이트
09:20 - 오전 크롤링 (장 시작 전)
12:20 - 점심 크롤링 (장중)
15:20 - 오후 크롤링 (장중) + 국내장 종가 업데이트
18:20 - 저녁 크롤링 (장 마감 후)
21:20 - 밤 크롤링 (하루 마무리)
```

#### **종가 업데이트** (국내/국외 분리)
```bash
# KST 기준 스케줄
15:20 - 국내장 마감 후 종가 수집 (KOSPI, KOSDAQ)
06:20 - 국외장 마감 후 종가 수집 (NASDAQ, NYSE)
```

### 🔧 **크롤링 방식**
크롤링 구현 방법 및 기술적 세부사항은 **`@docs/automated-crawling-system.md`**를 참조하세요.

**실행 방법**:
- Node.js 스케줄러 실행으로 자동화
- 즉시 테스트 실행 가능

---

## 📊 1. 종목 종가 업데이트 프로세스

### 🎯 **업데이트 대상**

#### **1.1 주가 데이터 수집**
```javascript
// 메르가 언급한 종목만 선별적 수집
const mentionedStocks = await getMerryMentionedStocks();
for (const stock of mentionedStocks) {
    const priceData = await fetchStockPrice(stock.ticker);
    await saveStockPrice(stock.ticker, priceData);
}
```

**수집 데이터**:
- **종가** (close_price)
- **시가** (open_price)  
- **고가** (high_price)
- **저가** (low_price)
- **거래량** (volume)
- **거래 날짜** (trade_date)

#### **1.2 데이터베이스 갱신**

**`stock_prices` 테이블 업데이트**:
```sql
INSERT INTO stock_prices (
    ticker, 
    trade_date, 
    open_price, 
    high_price, 
    low_price, 
    close_price, 
    volume, 
    updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
ON CONFLICT (ticker, trade_date) 
DO UPDATE SET 
    close_price = excluded.close_price,
    volume = excluded.volume,
    updated_at = CURRENT_TIMESTAMP;
```

**`stocks` 테이블 메타데이터 갱신**:
```sql
UPDATE stocks 
SET 
    last_price = ?,
    price_updated_at = CURRENT_TIMESTAMP
WHERE ticker = ? AND is_merry_mentioned = 1;
```

### ⚡ **성능 요구사항**
- **수집 시간**: 종목당 < 2초
- **전체 완료**: 모든 언급 종목 < 10분
- **API 호출 제한**: 초당 5회 이하
- **에러율**: < 5% (재시도 로직 포함)

### 🔍 **검증 방법**
```bash
# 오늘 종가 데이터 확인
sqlite3 database.db "
    SELECT s.ticker, s.company_name, sp.close_price, sp.trade_date 
    FROM stocks s 
    JOIN stock_prices sp ON s.ticker = sp.ticker 
    WHERE s.is_merry_mentioned = 1 
    AND sp.trade_date = date('now')
    ORDER BY sp.updated_at DESC;
"

# 누락된 종목 확인  
sqlite3 database.db "
    SELECT s.ticker, s.company_name
    FROM stocks s 
    LEFT JOIN stock_prices sp ON s.ticker = sp.ticker 
        AND sp.trade_date = date('now')
    WHERE s.is_merry_mentioned = 1 
    AND sp.ticker IS NULL;
"
```

---

## 📝 2. 포스트 업데이트 프로세스

### 🎯 **업데이트 대상**

#### **2.1 새 포스트 감지 및 저장**
```javascript
// 새로운 포스트 감지 후 데이터베이스 저장
const newPosts = await detectNewPosts();
for (const post of newPosts) {
    await saveBlogPost(post);
    await triggerRelatedUpdates(post.id);
}
```

**`blog_posts` 테이블 업데이트**:
- 새 포스트 추가
- 제목, 내용, 발행일, URL 저장
- 자동 태깅 및 카테고리 분류

#### **2.2 관련 서비스 자동 갱신**

**🔄 즉시 자동 갱신 서비스들**:

##### **A. 메르's Pick 시스템**
```javascript
// 메르's Pick 업데이트
await updateMerrysPick({
    postId: newPost.id,
    mentionedTickers: extractedTickers
});
```
**갱신 내용**:
- 새로 언급된 종목 `merry_mentioned_stocks` 테이블 추가
- 기존 종목의 `mention_count` 증가
- `last_mentioned_at` 최신화
- **랭킹 기준**: 최신 언급일 순 (CLAUDE.md 요구사항)

#### **2.3 수동 실행 필요 서비스들**

##### **A. 감정 분석 시스템** (수동 실행)
- **분석 방식**: Claude가 직접 포스트 읽고 수동 분석 (CLAUDE.md 준수)
**갱신 내용**:
- `post_stock_analysis` 테이블 데이터 추가
- 종목별 감정 분석 (긍정/부정/중립)
- **분석 방식**: Claude가 직접 포스트 읽고 수동 분석
- **금지 사항**: AI API, 키워드 매칭, 패턴 분석 절대 금지

##### **B. 차트 마커 업데이트** (자동)
- 종목별 차트에 새 포스트 날짜 마커 추가
- 감정 분석 결과에 따른 마커 색상 표시
- 툴팁 정보 업데이트

### 🔍 **검증 방법**
```bash
# 새 포스트 저장 확인
sqlite3 database.db "
    SELECT id, title, created_at 
    FROM blog_posts 
    ORDER BY created_at DESC 
    LIMIT 5;
"

# 메르's Pick 갱신 확인
sqlite3 database.db "
    SELECT ticker, company_name, mention_count, last_mentioned_at 
    FROM merry_mentioned_stocks 
    ORDER BY last_mentioned_at DESC 
    LIMIT 10;
"

```

---

## 🎯 업데이트 완료 후 검증 페이지

### 📄 **1. 종목 종가 업데이트 검증**

#### **확인할 페이지들**:
- **종목 상세 페이지**: 차트에 최신 종가 반영 확인
- **메인 페이지**: 메르's Pick 현재가 정보, 메르 주간보고, 오늘의 메르님 말씀 업데이트 확인
- **API 엔드포인트**: 주가 API, 메르's Pick API, 메르 주간보고 API 응답 확인

#### **검증 항목**:
- ✅ 오늘 종가 데이터 존재 여부
- ✅ 차트 최신 데이터 포인트 표시
- ✅ 등락률 계산 정확성
- ✅ 메인 페이지 메르's Pick 현재가 반영
- ✅ 메르 주간보고 종가 정보 업데이트
- ✅ API 응답 시간 < 500ms

### 📝 **2. 포스트 업데이트 검증**

#### **확인할 페이지들**:
- **메인 페이지**: 최신 포스트, 메르 주간보고, 오늘의 메르님 말씀 표시
- **블로그 목록**: 새 포스트 추가
- **크롤링 로그**: 자동 업데이트 상태 및 오류 로그 확인
- **종목 상세 페이지**: 언급된 종목 차트 마커 추가, 감정 분석 마커 색상, 관련 포스트 목록
- **AI 분석 대시보드**: 감정 분석 결과, 종목별 분석 데이터, 마커 색상 업데이트
- **오늘의 메르님 말씀**: 새 포스트 기반 분석 결과

#### **검증 항목**:
- ✅ 새 포스트가 목록 최상단 표시
- ✅ 메르's Pick 랭킹 업데이트 (최신 언급일 순)
- ✅ 메르 주간보고 업데이트 (분석 포스트 개수, 언급 날짜 갱신)
- ✅ 오늘의 메르님 말씀 업데이트 (최신 포스트 기반)
- ✅ 차트 마커 추가 및 색상 표시
- ✅ 성능 기준: 페이지 로딩 < 3초
- ✅ 캐시 무효화 확인 (실시간 데이터 반영)
- ✅ 데이터베이스 동기화 상태 확인
- ✅ 에러 핸들링 상태 확인 (종목 없음, API 오류 등)
- ✅ 대체 데이터 표시 (정보 없음 안내)
- ✅ 모바일 반응형 디자인 정상 표시
- ✅ 크로스 브라우저 호환성 확인


### 🚨 **포스트 업데이트 주의사항**

#### **일반적인 문제**:
1. **감정 분석 누락**: 자동 실행되지 않으므로 수동 실행 필수
2. **캐시 이슈**: 브라우저 하드 리프레시 (Ctrl+F5) 실행
3. **타임스탬프 오류**: 밀리초 단위 확인 필요

#### **데이터 무결성 확인**:
```bash
# 중복 포스트 확인
sqlite3 database.db "SELECT log_no, COUNT(*) FROM blog_posts GROUP BY log_no HAVING COUNT(*) > 1;"

# 최신 포스트 날짜 확인
sqlite3 database.db "SELECT id, title, datetime(created_date/1000, 'unixepoch') FROM blog_posts ORDER BY id DESC LIMIT 5;"
```

### 📊 **포스트 업데이트 모니터링 지표**

#### **핵심 KPI**:
- **포스트 총 개수**: 증가 추이 모니터링
- **메르's Pick 종목 수**: 새로운 종목 발견율  
- **감정 분석 커버리지**: 종목별 감정 데이터 완성도

#### **자동화 점검 항목**:
- [ ] 크롤링 스케줄 정상 작동
- [ ] 중복 포스트 방지 시스템
- [ ] 날짜 형식 일관성
- [ ] API 엔드포인트 응답성

---

## 🚨 오류 처리 및 복구

### ⚠️ **종가 업데이트 실패 시**
```javascript
// 재시도 로직
const maxRetries = 3;
const retryDelay = 5000; // 5초

for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
        await fetchStockPrice(ticker);
        break;
    } catch (error) {
        if (attempt === maxRetries) {
            await logError('종가 업데이트 실패', { ticker, error });
            await sendAlert(`${ticker} 종가 업데이트 실패`);
        }
        await sleep(retryDelay * attempt);
    }
}
```

### ⚠️ **포스트 업데이트 실패 시**
```javascript
// 부분 복구 로직
try {
    await saveBlogPost(post);
    await updateMerrysPick(post.id); // 자동
    // 감정분석은 수동 실행으로 나중에 처리
} catch (error) {
    await rollbackBlogPost(post.id);
    await logError('포스트 업데이트 실패', { post, error });
}
```

### 📊 **모니터링 지표**
- **성공률**: 종가 업데이트 95% 이상
- **응답 시간**: API 호출당 < 2초
- **데이터 정합성**: 누락 데이터 0건
- **시스템 가용성**: 99.9% 이상

---

## 🔧 개발자 가이드

### 🚀 **SuperClaude 명령어 활용**
```bash
# 업데이트 시스템 분석
/sc:analyze update-system --focus performance

# 크롤링 시스템 개선
/sc:improve crawling-performance --persona-performance

# 에러 처리 강화
/sc:implement error-handling --persona-backend --validate
```

### 📋 **MCP 서버 활용**
- **Sequential MCP**: 복잡한 업데이트 워크플로우 관리
- **Context7 MCP**: 크롤링 베스트 프랙티스 참조
- **Magic MCP**: 업데이트 상태 UI 컴포넌트 생성

### 🧪 **테스트 실행**
- 크롤링 시스템 테스트 실행
- 업데이트 프로세스 검증
- 성능 테스트 수행

---

## 📚 관련 문서

### 🔗 **필수 참조 문서**
- **`@docs/automated-crawling-system.md`** - 크롤링 시스템 구현 세부사항
- **`@docs/service-dependencies.md`** - 서비스 간 의존성 관계
- **`@CLAUDE.md`** - 개발 가이드라인 및 금지사항

### 📊 **연관 요구사항 문서**
- **`@docs/stock-page-requirements.md`** - 종목 페이지 차트 업데이트 요구사항
- **`@docs/main-page-requirements.md`** - 메인 페이지 메르's Pick 업데이트 요구사항
- **`@docs/performance-requirements.md`** - 업데이트 성능 기준

---

> 📝 **마지막 업데이트**: 2025-08-22  
> 💬 **문의사항**: 업데이트 프로세스 관련 질문이나 개선사항이 있으면 언제든지 알려주세요.