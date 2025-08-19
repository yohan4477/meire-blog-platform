# 📅 데이터베이스 날짜 컬럼 정리

## 🔍 **주요 테이블별 날짜 컬럼**

### 📝 **blog_posts (메르 포스트)**
- `created_date` DATETIME NOT NULL - **포스트 작성일** ⭐ (메인)
- `crawled_at` DATETIME DEFAULT CURRENT_TIMESTAMP - 크롤링 시간
- `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP - 업데이트 시간

### 📈 **stock_prices (주가 데이터)**
- `date` DATE NOT NULL - **주가 날짜** ⭐ (메인)
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP - 데이터 생성 시간

### 🎯 **merry_mentioned_stocks (메르 언급 종목)**
- `mentioned_date` DATETIME NOT NULL - **언급 날짜** ⭐ (메인)
- `last_mentioned_at` DATETIME - 마지막 언급일
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP - 레코드 생성 시간

### 💭 **sentiments (감정 분석)**
- `analysis_date` DATE - **분석 날짜** ⭐ (메인)
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP - 분석 시간

### 🏢 **stocks (종목 정보)**
- `first_mentioned_date` NUM - 첫 언급일 (숫자 타입)
- `last_mentioned_date` NUM - 마지막 언급일 (숫자 타입)
- `created_at` NUM - 생성일 (숫자 타입)
- `updated_at` NUM - 수정일 (숫자 타입)

## 🚨 **날짜 불일치 문제 발견**

### 현재 상황:
1. **차트 데이터 (stock_prices.date)**: `2025-08-18`까지 
2. **감정 데이터 (sentiments.analysis_date)**: `2025-08-19`만 있음
3. **포스트 데이터 (blog_posts.created_date)**: 과거~현재 모든 날짜
4. **언급 데이터 (merry_mentioned_stocks.mentioned_date)**: 포스트와 동일

### 해결 방안:
**감정 분석을 과거 포스트 날짜로 재생성**하여 차트 날짜 범위와 일치시켜야 함

## 📊 **TSM 관련 데이터 현황**

### 포스트 날짜들 (blog_posts.created_date):
- 2025-08-17, 2025-08-07, 2025-08-05, 2025-07-30, 2025-07-29 등

### 차트 날짜 범위 (stock_prices.date):
- 2024-08-19 ~ 2025-08-18 (1년치)

### 감정 분석 날짜 (sentiments.analysis_date):
- 2025-08-19만 존재 (오늘, 차트 범위 밖)

**결론**: 감정 분석을 포스트 날짜(`blog_posts.created_date`)와 일치하도록 재생성하여 차트 마커 색상 문제 해결