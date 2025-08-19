# 📊 종목 차트 페이지 개발 요구사항

> **메르 블로그 플랫폼** 종목별 차트 페이지 (`/merry/stocks/[ticker]`) 개발을 위한 포괄적 요구사항 문서

---

## 🎯 **핵심 기능 요구사항**

### 📈 **차트 시스템**
- **기본 표시**: 6개월치 캔들스틱 차트 (180일 데이터)
- **시간 범위**: 1M, 3M, 6M, 1Y 선택 가능
- **차트 라이브러리**: Recharts 사용 필수
- **반응형**: 모바일 최적화 필수
- **상호작용**: 확대/축소, 드래그 스크롤 지원

### 🏢 **종목 정보**
- **기본 정보**: 티커, 회사명, 현재가, 등락률
- **실시간 가격**: Yahoo Finance API 연동
- **회사 소개**: 실제 사업 영역 한줄 소개 (성의있게 작성)
- **시장 정보**: 상장 시장, 통화, 섹터

### 🎯 **메르 언급 마커**
- **표시 대상**: 메르가 해당 종목을 언급한 날짜만
- **데이터 소스**: `blog_posts` 테이블 직접 검색
- **시간 범위별**: 선택된 기간(1M/3M/6M/1Y) 내 모든 언급
- **마커 클릭**: 해당 포스트 요약 팝업

### 📝 **관련 포스트**
- **기본 표시**: 최근 5개 포스트
- **더보기 기능**: 추가 포스트 로딩
- **검색 로직**: 티커명 + 회사명 양방향 검색
- **정렬**: 최신 작성일 순

---

## 🎨 **감정 분석 시스템 요구사항**

### 🧠 **분석 철학**
- **Claude 직접 분석**: 외부 API 없이 Claude가 포스트 내용을 읽고 직접 감정 분석
- **논리적 근거**: 분석 결과의 근거만 봐도 감정 판단이 논리적으로 납득 가능해야 함
- **맥락 이해**: 단순 키워드 매칭이 아닌 문맥과 의도 파악
- **투자 관점**: 투자자 시각에서 해당 종목에 대한 긍정/부정/중립 판단

### 📊 **감정 분류 기준**

#### 🟢 **긍정적 (Positive)**
**판단 기준**: 해당 종목의 주가 상승 또는 투자 매력도 증가 요인
**예시 근거**:
- "AI 칩 시장 급성장으로 TSMC 파운드리 사업 강화 전망"
- "삼성전자 3나노 수율 실패로 TSMC 기술 우위 확실"
- "실적 개선으로 목표가 상향 조정"
- "신사업 진출로 성장 동력 확보"

#### 🔴 **부정적 (Negative)**
**판단 기준**: 해당 종목의 주가 하락 또는 투자 리스크 증가 요인
**예시 근거**:
- "트럼프 인텔 CEO 사임 요구로 반도체 업계 정치적 리스크"
- "실적 악화로 목표가 하향 조정"
- "경쟁사 대비 기술 격차 확대"
- "규제 강화로 사업 환경 악화"

#### 🔵 **중립적 (Neutral)**
**판단 기준**: 투자 판단에 중립적이거나 단순 정보 전달
**예시 근거**:
- "대만 정부 지분 7% 보유로 정부-민간 하이브리드 구조"
- "분기별 정기 실적 발표"
- "기업 지배구조 변경 발표"
- "단순 뉴스 인용 또는 사실 전달"

### 🎯 **분석 품질 기준**

#### ✅ **논리적 근거 작성 원칙**
1. **구체적 사실**: 추상적 표현보다 구체적 사실과 수치 활용
2. **인과관계 명확**: 왜 긍정/부정인지 논리적 연결고리 제시
3. **투자 관점**: 주가나 기업가치에 미치는 영향 관점에서 서술
4. **간결성**: 핵심 요점을 한 문장으로 명확히 요약

#### ❌ **금지 사항**
- **키워드 분석**: "상승", "하락" 등 단순 키워드 기반 판단 금지
- **패턴 매칭**: 정형화된 패턴이나 템플릿 사용 금지
- **글자수 기준**: 문장 길이나 글자수로 감정 판단 금지
- **외부 API**: 감정 분석 전용 API 사용 금지

### 🔧 **기술적 구현**

#### 📋 **데이터베이스 구조**
```sql
-- sentiments 테이블
CREATE TABLE sentiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    sentiment_score DECIMAL(4,3) NOT NULL,
    confidence DECIMAL(4,3) NOT NULL,
    key_reasoning TEXT NOT NULL, -- 핵심 근거 (필수)
    context_snippet TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    UNIQUE(post_id, ticker)
);
```

#### 🎨 **마커 색상 시스템**
```javascript
const sentimentColors = {
    positive: '#16a34a',  // 초록색 (투자 매력도 증가)
    negative: '#dc2626',  // 빨간색 (투자 리스크 증가)  
    neutral: '#6b7280',   // 회색 (중립적 정보)
    default: '#2563eb'    // 파란색 (메르 언급만, 감정 분석 없음)
};
```

#### 📊 **차트 통합 표시**
- **마커 위치**: 해당 날짜의 주가 차트 위에 원형 마커
- **색상 우선순위**: 하나의 날짜에 여러 감정이 있을 경우 긍정 > 부정 > 중립 순으로 표시
- **툴팁 내용**: 감정 아이콘 + 근거 텍스트 + 신뢰도
- **상호작용**: 마커 클릭/호버시 상세 감정 분석 결과 표시

---

## ⚡ **성능 요구사항**

### 🚀 **로딩 성능**
- **전체 페이지**: < 3초 (절대 한계)
- **차트 렌더링**: < 1.5초
- **API 응답**: < 500ms
- **상호작용 지연**: < 100ms

### 📦 **데이터 최적화**
- **가격 데이터**: 메르 언급 종목만 저장
- **감정 분석**: 12시간 캐싱
- **포스트 검색**: 인덱스 최적화
- **실시간 가격**: 5분 캐싱

---

## 🧪 **테스트 요구사항**

### 📋 **Playwright 필수 테스트**
1. **차트 로딩**: 6개월치 데이터 정상 표시
2. **감정 마커**: 올바른 색상과 위치
3. **시간 범위**: 1M/3M/6M/1Y 전환 테스트
4. **툴팁 표시**: 감정 분석 정보 정확성
5. **반응형**: 모바일/데스크톱 호환성

### 🎯 **감정 분석 품질 검증**
```javascript
// 테스트 시나리오 예시
const sentimentTest = {
    positive: "AI 칩 시장 급성장으로 TSMC 파운드리 사업 강화 전망",
    negative: "트럼프 인텔 CEO 사임 요구로 반도체 업계 정치적 리스크", 
    neutral: "대만 정부 지분 7% 보유로 정부-민간 하이브리드 구조"
};

// 각 근거를 읽고 감정 분류가 논리적으로 납득되는지 확인
```

---

## 📁 **파일 구조**

### 🗂️ **핵심 파일들**
- **`src/app/merry/stocks/[ticker]/page.tsx`**: 종목 상세 페이지
- **`src/components/merry/StockPriceChart.tsx`**: 차트 컴포넌트
- **`src/app/api/merry/stocks/[ticker]/route.ts`**: 종목 정보 API
- **`src/app/api/merry/stocks/[ticker]/sentiments/route.ts`**: 감정 분석 API
- **`src/lib/sentiment-analyzer.js`**: Claude 감정 분석 엔진
- **`scripts/analyze-sentiment.js`**: 배치 감정 분석 스크립트

### 🔄 **감정 분석 워크플로우**
1. **포스트 작성**: 새 블로그 포스트 저장
2. **종목 추출**: 포스트에서 언급된 종목 식별
3. **Claude 분석**: 포스트 내용을 Claude가 읽고 감정 분석
4. **근거 생성**: 논리적 근거 문장 생성
5. **데이터베이스 저장**: sentiments 테이블에 결과 저장
6. **차트 표시**: 해당 날짜 마커에 감정 색상 반영

---

## 🎨 **UI/UX 가이드라인**

### 🎯 **감정 표시 원칙**
- **직관적 색상**: 긍정=초록, 부정=빨강, 중립=회색
- **명확한 구분**: 각 감정별 고유 아이콘 사용
- **상세 정보**: 근거 텍스트는 읽기 쉽게 표시
- **신뢰도 표시**: 분석 확신도를 시각적으로 표현

### 📱 **반응형 디자인**
- **모바일**: 터치 친화적 마커 크기
- **데스크톱**: 호버 상태 인터랙션
- **태블릿**: 중간 크기 최적화

---

## 🗄️ 데이터 요구사항

### 주가 데이터
**데이터베이스 테이블**: `stock_prices`
```sql
CREATE TABLE stock_prices (
  id INTEGER PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  close_price DECIMAL(10,2) NOT NULL,
  volume BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 메르 언급 데이터
**데이터베이스 테이블**: `merry_mentioned_stocks`
```sql
CREATE TABLE merry_mentioned_stocks (
  id INTEGER PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  mentioned_date DATE NOT NULL,
  mention_type VARCHAR(20), -- 'positive', 'negative', 'neutral'
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
  post_title TEXT,
  post_id INTEGER
);
```

### API 엔드포인트
- **주가 데이터**: `/api/stock-price?ticker={ticker}&period=6mo`
- **메르 언급 데이터**: `/api/merry/stocks/{ticker}/posts/full?period=6mo`
- **응답 시간**: < 500ms (각각)
- **캐싱**: 주가 데이터 1시간, 메르 언급 데이터 6시간

---

## 🎨 UI/UX 요구사항

### 차트 레이아웃
- **컨테이너 높이**: 400px (기본), 반응형으로 조정
- **여백**: `margin={{ top: 5, right: 30, left: 20, bottom: 60 }}`
- **그리드**: 점선 그리드 표시 (`strokeDasharray="3 3"`)

### 차트 구성 요소
1. **X축 (날짜)**:
   - 포맷: MM/DD 형태
   - 자동 간격 조정
   - 줌 범위에 따른 동적 라벨

2. **Y축 (가격)**:
   - 통화 기호 포함 (₩ 또는 $)
   - 동적 범위 조정 (5% 여백)
   - 천 단위 구분 쉼표

3. **라인**:
   - 색상: 파란색 (#2563eb)
   - 두께: 2px
   - 부드러운 곡선 (`type="monotone"`)

4. **데이터 포인트**:
   - **메르 언급일**: 빨간 점 (r=6, fill="#dc2626")
   - **현재가**: 초록 점 (r=6, fill="#16a34a")
   - **일반 날짜**: 점 표시 안 함 (곡선만)

### 인터랙티브 기능
1. **줌 기능**:
   - 마우스 드래그로 영역 선택 줌
   - 줌 히스토리 관리 (뒤로 가기 버튼)
   - 초기화 버튼

2. **시간 범위 선택**:
   - 1개월, 3개월, 6개월 버튼
   - 선택된 범위 하이라이트

3. **툴팁**:
   - 호버 시 상세 정보 표시
   - 메르 언급일: 포스트 제목 미리보기
   - 현재가: "현재가" 표시
   - 커스텀 디자인

---

## ⚡ 성능 요구사항

### 로딩 성능
- **초기 차트 로딩**: < 3초 (CLAUDE.md 핵심 요구사항)
- **차트 렌더링**: < 1.5초
- **인터랙션 응답**: < 100ms (줌, 호버 등)
- **API 호출**: 병렬 처리로 총 < 1초

### 메모리 최적화
- **데이터 포인트**: 최대 180개 (6개월)
- **줌 히스토리**: 최대 10단계
- **이미지 캐싱**: SVG 렌더링 최적화

---

## 🔧 기술 사양

### 차트 라이브러리
- **Recharts**: React 기반 차트 라이브러리
- **컴포넌트**: LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
- **반응형**: ResponsiveContainer 사용

### 데이터 처리
```typescript
interface PricePoint {
  date: string; // YYYY-MM-DD
  price: number;
  postTitle?: string; // 메르 언급일에만
  postId?: number;
  isCurrentPrice?: boolean;
}
```

### 상태 관리
```typescript
interface ChartState {
  priceData: PricePoint[];
  allPosts: any[];
  loading: boolean;
  yAxisDomain: [number, number] | null;
  zoomState: {
    left?: string | number;
    right?: string | number;
    refAreaLeft?: string | number;
    refAreaRight?: string | number;
    isZooming?: boolean;
  };
  zoomHistory: Array<{
    xDomain: [string | number | undefined, string | number | undefined];
    yDomain: [number, number] | null;
  }>;
  timeRange: '1M' | '3M' | '6M';
  priceChange: {
    value: number;
    percentage: number;
    isPositive: boolean;
  } | null;
}
```

---

## 📱 반응형 디자인

### 브레이크포인트별 최적화
- **데스크톱 (≥1024px)**: 전체 기능, 큰 차트
- **태블릿 (768-1023px)**: 핵심 기능, 중간 차트
- **모바일 (≤767px)**: 필수 기능, 작은 차트

### 모바일 최적화
- **터치 제스처**: 핑치 줌, 팬 이동
- **버튼 크기**: 최소 44px × 44px
- **툴팁**: 터치 친화적 크기
- **로딩**: 모바일에서 더 빠른 렌더링

---

## 🧪 테스트 시나리오

### 기능 테스트
1. **차트 로딩**: 6개월 데이터 정상 로딩 확인
2. **메르 마커**: 언급일에만 마커 표시 확인
3. **줌 기능**: 드래그 줌, 뒤로 가기, 초기화 동작
4. **시간 범위**: 1M/3M/6M 버튼 정상 동작
5. **툴팁**: 호버 시 올바른 정보 표시

### 성능 테스트
1. **로딩 시간**: 3초 이내 완전 로딩
2. **렌더링**: 1.5초 이내 차트 표시
3. **인터랙션**: 100ms 이내 응답
4. **메모리**: 메모리 누수 없음

### 데이터 무결성 테스트
1. **실제 데이터**: Dummy 데이터 사용 금지
2. **빈 데이터**: "가격 정보 없음" 적절한 표시
3. **에러 처리**: API 실패 시 적절한 fallback

---

## 📊 차트 데이터 플로우

### 데이터 로딩 순서
1. **종목 정보 확인**: ticker 유효성 검증
2. **병렬 API 호출**:
   - 6개월 주가 데이터 (stock-price API)
   - 6개월 메르 언급 데이터 (posts API)
3. **데이터 매핑**: 날짜별 가격 + 언급 정보 결합
4. **현재가 추가**: 오늘 날짜에 현재가 표시
5. **차트 렌더링**: Y축 범위 계산 후 차트 생성

### 에러 처리
- **API 실패**: 빈 배열 반환, "정보 없음" 표시
- **부분 실패**: 가능한 데이터만 표시
- **완전 실패**: 적절한 에러 메시지와 재시도 버튼

---

## 🔗 관련 컴포넌트 및 파일

### 주요 컴포넌트
- **`src/components/merry/StockPriceChart.tsx`**: 메인 차트 컴포넌트

### API 파일
- **`src/app/api/stock-price/route.ts`**: 주가 데이터 API
- **`src/app/api/merry/stocks/[ticker]/posts/route.ts`**: 메르 언급 데이터 API

### 유틸리티
- **가격 포맷팅**: `formatPrice(price: number): string`
- **날짜 포맷팅**: `formatDate(dateStr: string): string`
- **Y축 계산**: `calculateYAxisDomain(data: PricePoint[]): [number, number]`

---

## 🛡️ 보안 및 안정성

### 입력 검증
- **ticker 검증**: 알파벳과 숫자만 허용, 최대 10자
- **날짜 범위**: 6개월 이내로 제한
- **SQL 인젝션**: Prepared statements 사용

### 에러 바운더리
```typescript
<ErrorBoundary 
  fallback={<ChartErrorFallback />}
  onError={(error) => console.error('Chart error:', error)}
>
  <StockPriceChart />
</ErrorBoundary>
```

---

## 🔍 **개발 참고사항**

### ⚠️ **주의사항**
- **Next.js 15 호환**: async params 규칙 준수
- **실제 데이터**: Dummy 데이터 사용 절대 금지
- **에러 처리**: 데이터 없을 때 명확한 안내
- **성능 모니터링**: 3초 로딩 제한 엄격 준수

### 💡 **개선 방향**
- **감정 학습**: 분석 정확도 지속적 개선
- **다국어 지원**: 영문 포스트 감정 분석
- **감정 트렌드**: 시간별 감정 변화 시각화
- **AI 고도화**: GPT 기반 더 정교한 분석

---

**📌 마지막 업데이트**: 2025-08-19  
**🚀 SuperClaude 명령어**: `/sc:implement chart sentiment analysis --persona-analyzer --seq`  
**🧪 테스트**: `npx playwright test --grep "sentiment"`  
**🌐 확인**: `http://localhost:3015/merry/stocks/TSM`