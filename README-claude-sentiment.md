# 🤖 Claude AI 기반 6개월치 감정분석 시스템

메르의 투자 블로그에서 종목별 감정분석과 투자 근거를 Claude AI로 추출하는 시스템입니다.

## 🎯 시스템 개요

- **목적**: 6개월치 블로그 포스트에서 종목별 감정분석 및 투자 논리 추출
- **방식**: Claude AI API를 사용한 한 번 분석, 영구 저장
- **결과**: 차트 툴팁에서 구체적인 투자 근거와 감정 판단 이유 제공

## 📋 주요 기능

### ✅ Claude AI 감정 분석
- **감정 분류**: positive/negative/neutral (신뢰도 점수 포함)
- **투자 논리**: 메르의 핵심 투자 근거 1-2문장 요약
- **판단 근거**: 구체적인 키워드와 문장 추출
- **투자 관점**: 실적/전망/리스크/기회/밸류에이션 분류
- **투자 시간**: 단기/중기/장기 관점 구분

### ✅ 향상된 차트 툴팁
```
🟢 긍정적 (신뢰도 87%)
💡 판단 근거: "3분기 실적 호조", "장기 성장 전망"
📈 투자 관점: 실적 개선
💬 메르의 논리: "테슬라 3분기 실적이 예상을 뛰어넘으며..."
```

### ✅ 데이터 품질 보장
- **신뢰도 검증**: 근거 부족시 자동 신뢰도 조정
- **일관성 검사**: 감정과 근거의 일치성 검증
- **비용 추적**: API 사용량 및 비용 모니터링

## 🚀 설치 및 설정

### 1. 환경 변수 설정
```bash
# .env.local 파일에 추가
CLAUDE_API_KEY=sk-ant-api03-your-claude-api-key-here
ANALYSIS_LIMIT=100
```

### 2. 데이터베이스 초기화
```bash
# Claude AI 전용 테이블 생성
sqlite3 database.db ".read scripts/setup-claude-sentiment-db.sql"

# 테이블 생성 확인
sqlite3 database.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%claude%';"
```

### 3. 필요한 패키지 설치
```bash
npm install  # 기존 종속성 확인
```

## 📊 사용 방법

### 6개월치 배치 분석 실행
```bash
# 기본 실행 (최대 100개 포스트)
node scripts/analyze-claude-sentiment-6months.js

# 분석 제한 설정
ANALYSIS_LIMIT=50 node scripts/analyze-claude-sentiment-6months.js
```

### 실행 출력 예시
```
🚀 Claude AI 6개월치 감정 분석 시작
==================================================
🔍 환경 설정 검증 중...
✅ Claude API 키 확인됨
📊 분석 제한: 100개 포스트

🗄️ 데이터베이스 스키마 초기화 중...
✅ 데이터베이스 스키마 초기화 완료

📈 기존 분석 현황 확인 중...
📊 6개월치 포스트: 285개
✅ 분석 완료 포스트: 0개
🎯 총 감정 분석: 0개
⏳ 미분석 포스트: 285개

🤖 Claude AI 분석 시작...
⚠️  API 비용이 발생합니다. 계속하시겠습니까? (Ctrl+C로 중단)

🔍 [1/100] 분석 중: "테슬라 3분기 실적 분석" (2024-02-15)
📈 발견된 종목: TSLA
  ✅ TSLA: positive (신뢰도: 85%)
     💡 논리: 3분기 실적 개선과 자율주행 상용화 가능성으로 장기 성장 전망이 긍정적

📊 분석 결과 요약
==============================
📈 총 감정 분석: 156개
🎯 평균 신뢰도: 73.2%
🟢 긍정적: 45개
🔴 부정적: 23개
🔵 중립적: 88개
💰 총 API 비용: $12.34

🏆 주요 언급 종목 (TOP 10):
1. TSLA: 28회 (신뢰도: 78%)
   🟢12 🔴8 🔵8
2. AAPL: 22회 (신뢰도: 81%)
   🟢9 🔴3 🔵10

⏱️  총 실행 시간: 45.2초
✅ Claude AI 감정 분석 완료!
```

## 📈 API 응답 구조

### 향상된 감정 분석 API
```javascript
// GET /api/merry/stocks/TSLA/sentiments?period=6mo
{
  "ticker": "TSLA",
  "period": "6mo",
  "sentimentByDate": {
    "2024-02-15": {
      "date": "2024-02-15",
      "sentiments": [
        {
          "sentiment": "positive",
          "score": 0.75,
          "confidence": 0.87,
          "data_source": "claude",
          // Claude AI 전용 필드
          "key_reasoning": "3분기 실적 개선과 자율주행 상용화 가능성으로 장기 성장 전망이 긍정적",
          "supporting_evidence": {
            "positive_factors": ["3분기 실적 예상 초과", "자율주행 기술 진전"],
            "negative_factors": ["경쟁 심화"],
            "neutral_factors": []
          },
          "context_quotes": ["3분기 실적이 예상을 뛰어넘었습니다"],
          "investment_perspective": ["실적", "전망"],
          "investment_timeframe": "장기",
          "conviction_level": "높음",
          "mention_context": "실적 발표 분석"
        }
      ],
      "posts": [...]
    }
  },
  "summary": {...},
  "totalMentions": 28,
  "averageConfidence": 0.78
}
```

## 🗄️ 데이터베이스 구조

### 주요 테이블

#### post_stock_sentiments_claude
- **기본 정보**: sentiment, confidence, sentiment_score
- **Claude 분석**: key_reasoning, supporting_evidence, context_quotes
- **투자 관점**: investment_perspective, investment_timeframe, conviction_level
- **메타데이터**: mention_context, analysis_focus, uncertainty_factors

#### claude_analysis_stats
- **일별 통계**: 분석 포스트 수, 성공률, 평균 신뢰도, API 비용

#### claude_api_usage_log  
- **API 사용 로그**: 토큰 수, 응답 시간, 에러 메시지

### 유용한 쿼리

```sql
-- 특정 종목의 6개월 감정 트렌드
SELECT 
  DATE(bp.created_date) as date,
  psc.sentiment,
  psc.confidence,
  psc.key_reasoning,
  bp.title
FROM post_stock_sentiments_claude psc
JOIN blog_posts bp ON psc.post_id = bp.id
WHERE psc.ticker = 'TSLA' 
  AND bp.created_date >= date('now', '-6 months')
ORDER BY bp.created_date DESC;

-- 고신뢰도 투자 의견 조회
SELECT 
  ticker,
  sentiment,
  confidence,
  key_reasoning,
  investment_timeframe,
  conviction_level
FROM post_stock_sentiments_claude
WHERE confidence >= 0.8
ORDER BY confidence DESC;

-- 월별 분석 통계
SELECT 
  strftime('%Y-%m', analyzed_at) as month,
  COUNT(*) as total_analyses,
  AVG(confidence) as avg_confidence,
  SUM(api_cost) as monthly_cost
FROM post_stock_sentiments_claude
GROUP BY strftime('%Y-%m', analyzed_at)
ORDER BY month DESC;
```

## 📊 모니터링 및 품질 관리

### 품질 메트릭
- **신뢰도 목표**: 평균 75% 이상
- **일치성 검증**: 감정과 근거의 논리적 일관성
- **비용 효율성**: 포스트당 평균 $0.05-0.15

### 데이터 검증
```bash
# 분석 품질 확인
sqlite3 database.db "SELECT * FROM claude_sentiment_quality_metrics LIMIT 10;"

# 종목별 트렌드 확인  
sqlite3 database.db "SELECT * FROM claude_sentiment_trends_by_ticker LIMIT 5;"
```

## 🚨 주의사항

### API 비용 관리
- **Claude 3 Sonnet**: 입력 $0.003/1K토큰, 출력 $0.015/1K토큰
- **예상 비용**: 100개 포스트 = 약 $10-15
- **제한 설정**: `ANALYSIS_LIMIT` 환경 변수로 제어

### 오류 처리
- **API 실패**: 자동 재시도 및 fallback 분석 제공
- **파싱 오류**: JSON 파싱 실패시 기본값 반환
- **신뢰도 조정**: 근거 부족시 자동 신뢰도 감소

## 🔧 개발자 가이드

### 새로운 종목 추가
```javascript
// src/lib/claude-sentiment-analyzer.js
this.tickerToNameMap = {
  'NEW_TICKER': ['회사명', '별칭1', '별칭2'],
  // ...
};
```

### 프롬프트 개선
```javascript
// generateAnalysisPrompt() 함수에서 프롬프트 수정
// 더 정확한 분석을 위한 지침 추가 가능
```

### 차트 툴팁 커스터마이징
```typescript
// src/components/merry/StockPriceChart.tsx
// Claude AI 데이터 표시 로직 수정
```

## 📚 관련 문서

- **[전체 개발 가이드](./CLAUDE.md)**: 프로젝트 전체 개발 가이드라인
- **[차트 요구사항](./docs/chart-requirements.md)**: 종목 차트 상세 요구사항  
- **[감정 분석 아키텍처](./docs/sentiment-analysis-architecture.md)**: 기술적 아키텍처 문서

---

> 📝 **개발 완료**: 2025-08-15  
> 🚀 **사용된 SuperClaude 명령어**: `/sc:analyze`, `/sc:design`, `/sc:implement`, `/sc:build`  
> 🧠 **사용된 MCP**: Sequential (분석 로직), Context7 (API 패턴), Magic (코드 생성)