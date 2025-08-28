# 🚀 메르 포스트 크롤링 후 완전 분석 자동화 가이드

> **목적**: "분석해줘" 요청 시 수행해야 할 모든 단계를 표준화
> **최종 목표**: 메르님 한줄 코멘트 + 투자 인사이트까지 완전 분석하여 웹사이트 즉시 반영

## 📋 필수 수행 단계 (8단계)

### 1️⃣ **포스트 크롤링**
```javascript
// RSS 피드 확인: https://rss.blog.naver.com/ranto28.xml
// mcp__fetch__fetch로 새 포스트 발견
// database.db의 blog_posts 테이블에 저장
// 번호 매기기 형식 유지 (80개 항목 등)
```

**확인사항**: 새 포스트가 blog_posts 테이블에 정상 저장되었는가?

### 2️⃣ **종목 추출 및 stocks 테이블 업데이트**
```javascript
// 포스트 내용에서 종목명/티커 추출
// stocks 테이블에 종목 추가/업데이트
const updateScript = `
  UPDATE stocks SET 
    mention_count = (실제 언급 횟수),
    last_mentioned_date = '오늘날짜',
    description = '종목 설명'
  WHERE ticker = '종목코드'
`;
```

**확인사항**: stocks 테이블에 새 종목 추가, mention_count 업데이트 완료?

### 3️⃣ **감정 분석 (Claude 직접)**
```javascript
// post_stock_analysis 테이블에 저장
const sentimentData = {
  log_no: '포스트번호',
  ticker: '종목코드', 
  sentiment: 'positive/negative/neutral',
  sentiment_score: 0.7,
  confidence: 0.8,
  reasoning: '구체적인 분석 근거'
};
```

**확인사항**: 각 종목별 감정 분석 결과 저장 완료?

### 4️⃣ **🔥 메르님 한줄 코멘트 추출**
```javascript
// 포스트 맨 끝 "한 줄 코멘트:" 부분 추출
// blog_posts.excerpt 필드에 저장
const realComment = "메르님의 실제 한줄 코멘트 원문";
const updateExcerpt = `
  UPDATE blog_posts 
  SET excerpt = '${realComment}' 
  WHERE log_no = '포스트번호'
`;
```

**확인사항**: excerpt 필드에 메르님 실제 한줄 코멘트 저장 완료?

### 5️⃣ **💡 투자 인사이트 분석**
```javascript
// Claude가 전체 포스트에서 투자 관점 분석
const insight = `
🎯 주요 투자 테마: 구체적 테마
⚙️ 경쟁 구도: 경쟁사 상황
📊 기회 포인트: 성장 가능성
🚨 리스크 요소: 주의사항
`;
```

**분석 포인트**:
- 투자 테마 (예: 미해군 MRO, 조선업 합병)
- 경쟁 구도 (예: 싱가포르 ST Engineering vs 한국 조선사)
- 기회 요인 (예: 합병 시너지, 시장 진입)
- 리스크 요인 (예: 경쟁 심화, 초기 단계)

### 6️⃣ **post_analysis 테이블 저장**
```sql
-- 필수 테이블 구조 (없으면 생성)
CREATE TABLE IF NOT EXISTS post_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_no TEXT NOT NULL,
  summary TEXT NOT NULL,           -- 메르님 한줄 코멘트
  investment_insight TEXT NOT NULL, -- 투자 인사이트
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(log_no)
);

-- 데이터 삽입
INSERT OR REPLACE INTO post_analysis (log_no, summary, investment_insight) 
VALUES ('포스트번호', '메르님 한줄 코멘트', '투자 인사이트');
```

**확인사항**: post_analysis 테이블에 분석 결과 저장 완료?

### 7️⃣ **메르's Pick 자동 갱신 확인**
```bash
curl -s "http://localhost:3004/api/merry/picks?limit=10"
```

**확인사항**: 
- 새로 추가된 종목이 메르's Pick에 반영되었는가?
- mention_count가 정확하게 업데이트되었는가?

### 8️⃣ **웹사이트 표시 검증**
```bash
curl -s "http://localhost:3004/api/today-merry-quote"
```

**최종 확인사항**:
- ✅ "오늘의 메르님 말씀" API 정상 작동
- ✅ 메르님 한줄 코멘트 정확 표시
- ✅ 투자 인사이트 정확 표시  
- ✅ 웹사이트 메인 페이지에서 즉시 확인 가능

## 🚨 중요 원칙

### ❌ **절대 금지사항**
- 가짜 한줄 코멘트 생성 금지
- AI API 자동 분석 금지  
- 키워드 매칭 분석 금지
- 포스트 없이 분석 시도 금지

### ✅ **필수 준수사항**
- Claude 직접 수동 분석만 허용
- 실제 포스트 내용 기반 분석
- 메르님 실제 한줄 코멘트 원문 사용
- 구체적이고 실용적인 투자 인사이트

## 📊 성공 기준

**완료 조건**: 
1. 새 포스트 크롤링 ✅
2. 종목 추출 및 감정 분석 ✅
3. 메르님 한줄 코멘트 추출 ✅
4. 투자 인사이트 도출 ✅
5. post_analysis 테이블 저장 ✅
6. 메르's Pick 갱신 확인 ✅
7. API 정상 작동 확인 ✅
8. 웹사이트 즉시 표시 확인 ✅

**최종 검증**: `start http://localhost:3004`로 메인 페이지에서 "오늘의 메르님 말씀" 정상 표시

---

> 📝 **다음 사용법**: "분석해줘" 요청 시 이 문서의 8단계를 순서대로 모두 수행
> 🎯 **목표**: 메르님의 투자 철학과 인사이트를 완전히 분석하여 사용자에게 전달