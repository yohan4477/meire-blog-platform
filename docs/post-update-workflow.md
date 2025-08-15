# 📄 포스트 갱신 워크플로우 가이드

> **메르 블로그 포스트 추가 시 갱신해야 할 서비스와 프로세스 완전 가이드**

---

## 🔄 자동 갱신 서비스 (크롤링 시 자동 실행)

### 1. **메르's Pick 시스템**
**파일**: `src/lib/blog-crawler.ts`
**실행 위치**: `updateMerrysPick()` 메서드
**갱신 대상**:
- `merry_mentioned_stocks` 테이블
- 새로 언급된 종목 자동 추가
- 언급 횟수 (`mention_count`) 업데이트  
- 최근 언급일 (`last_mentioned_at`) 갱신

**검증 방법**:
```bash
# 메르's Pick 데이터 확인
sqlite3 database.db "SELECT ticker, company_name, mention_count, last_mentioned_at FROM merry_mentioned_stocks ORDER BY last_mentioned_at DESC LIMIT 10;"
```

### 2. **논리체인 분석 시스템**
**파일**: `src/lib/merry-insight-ai.js`
**실행 위치**: `extractCausalChain()` 메서드
**갱신 대상**:
- `causal_chains` 테이블
- AI 기반 논리체인 추출 및 저장
- 단계별 논리 흐름 분석
- 신뢰도 점수 계산

**검증 방법**:
```bash
# 최신 논리체인 확인
sqlite3 database.db "SELECT id, post_id, title, steps_count, confidence FROM causal_chains ORDER BY created_at DESC LIMIT 5;"
```

### 3. **포스트 메타데이터 갱신**
**갱신 대상**:
- `blog_posts` 테이블에 새 포스트 저장
- 밀리초 타임스탬프 형식으로 날짜 저장
- 카테고리 및 태그 자동 분류
- 조회수 초기화

---

## 📋 수동 갱신 서비스 (필요시 실행)

### 1. **감정 분석 시스템**
**실행 명령**:
```bash
cd meire-blog-platform
node scripts/analyze-sentiment.js
```

**갱신 대상**:
- `post_stock_sentiments` 테이블
- 종목별 감정 분석 (긍정/부정/중립)
- 감정 점수 및 신뢰도 계산
- 키워드 및 컨텍스트 저장

**검증 방법**:
```bash
# 감정 분석 결과 확인  
sqlite3 database.db "SELECT post_id, ticker, sentiment, sentiment_score, confidence FROM post_stock_sentiments ORDER BY analyzed_at DESC LIMIT 10;"
```

### 2. **하이브리드 패턴 분석** (선택사항)
**실행 명령**:
```bash
# API 호출로 패턴 학습
curl -X POST "http://localhost:3004/api/merry/pattern-learning/analyze"
```

**갱신 대상**:
- 메르의 투자 패턴 학습
- 추천 예측 모델 업데이트
- 소스 분석 패턴 갱신

---

## 🎯 갱신 확인 페이지

새 포스트 추가 후 다음 페이지들을 반드시 확인하여 정상 갱신되었는지 검증:

### 1. **메인 페이지** (`/`)
- [x] 메르's Pick 섹션에 새로운 종목 표시
- [x] 최신 포스트가 상단에 표시
- [x] 로딩 시간 < 3초 (성능 기준)

### 2. **메르 블로그 페이지** (`/merry`) 
- [x] 새로운 포스트가 목록 최상단 추가
- [x] 논리체인 분석 결과 표시 (있는 경우)
- [x] 포스트 카운트 정확성

### 3. **종목별 상세 페이지** (`/merry/stocks/[ticker]`)
- [x] 새로 언급된 종목의 차트에 마커 추가
- [x] 관련 포스트 목록에 새 글 포함
- [x] 감정 분석 마커 색상 표시 (긍정=초록, 부정=빨강, 중립=파랑)

### 4. **AI 분석 대시보드** (`/merry/analysis`)
- [x] 논리체인 분석 결과 시각화
- [x] 새로운 인사이트 반영
- [x] 통계 데이터 갱신

---

## ⚡ 실행 스크립트

### 전체 갱신 스크립트
```bash
#!/bin/bash
# 새 포스트 추가 후 전체 시스템 갱신

echo "🚀 포스트 갱신 프로세스 시작..."

# 1. 최신 포스트 크롤링
echo "📥 최신 포스트 크롤링..."
curl -X POST "http://localhost:3004/api/crawl/latest" -H "Content-Type: application/json" -d '{"background": false}'

# 2. 감정 분석 실행
echo "🧠 감정 분석 실행..."
cd meire-blog-platform
node scripts/analyze-sentiment.js

# 3. 패턴 분석 업데이트 (선택사항)
echo "📊 패턴 분석 업데이트..."
curl -X POST "http://localhost:3004/api/merry/pattern-learning/analyze"

# 4. 확인 페이지 자동 오픈
echo "🌐 확인 페이지 오픈..."
start http://localhost:3004
start http://localhost:3004/merry
start http://localhost:3004/merry/analysis

echo "✅ 갱신 프로세스 완료!"
```

---

## 🚨 주의사항 및 문제해결

### 일반적인 문제
1. **감정 분석 누락**: 자동 실행되지 않으므로 수동 실행 필수
2. **캐시 이슈**: 브라우저 하드 리프레시 (Ctrl+F5) 실행
3. **타임스탬프 오류**: 밀리초 단위 확인 필요

### 성능 모니터링
- **로딩 시간**: 모든 페이지 < 3초 (CLAUDE.md 기준)
- **API 응답**: < 500ms 
- **메모리 사용량**: 크롤링 후 정상 범위 유지

### 데이터 무결성 확인
```bash
# 중복 포스트 확인
sqlite3 database.db "SELECT log_no, COUNT(*) FROM blog_posts GROUP BY log_no HAVING COUNT(*) > 1;"

# 최신 포스트 날짜 확인
sqlite3 database.db "SELECT id, title, datetime(created_date/1000, 'unixepoch') FROM blog_posts ORDER BY id DESC LIMIT 5;"
```

---

## 📊 모니터링 지표

### 핵심 KPI
- **포스트 총 개수**: 증가 추이 모니터링
- **메르's Pick 종목 수**: 새로운 종목 발견율
- **논리체인 분석 성공률**: AI 분석 품질
- **감정 분석 커버리지**: 종목별 감정 데이터 완성도

### 자동화 점검 항목
- [ ] 크롤링 스케줄 정상 작동
- [ ] 중복 포스트 방지 시스템
- [ ] 날짜 형식 일관성
- [ ] API 엔드포인트 응답성

---

> **📝 마지막 업데이트**: 2025-08-15  
> **🔄 갱신 주기**: 새 포스트 발견 시마다  
> **📧 문의**: 이 문서에 대한 질문이나 개선사항이 있으면 언제든지 알려주세요.