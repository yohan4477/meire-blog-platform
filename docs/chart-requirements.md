# 📊 종목 차트 요구사항 명세서

> **6개월치 주식 차트와 메르 언급 정보를 연동한 인터랙티브 차트 시스템**  
> 종목 상세 페이지의 핵심 컴포넌트입니다.

---

## 📋 핵심 기능 요구사항

### 차트 기본 사양
- **데이터 기간**: 6개월치 차트 기본 표시 (180일 데이터)
- **차트 유형**: Line Chart (Recharts 라이브러리 사용)
- **데이터 소스**: 실제 주식 가격 API + 메르 언급 데이터
- **업데이트**: 실시간 불필요, 페이지 로드시에만 갱신

### 메르 글 연동 요구사항
- **6개월치 메르 글** 데이터 연동
- **메르 글 언급 날짜 또는 당일**에만 정보 마커 표시
- **언급 없는 날들은 정보 표시 안 함** (깔끔한 차트 유지)
- 메르 글 마커 클릭 시 해당 글 요약 팝업 표시
- 마커 색상: 긍정적 언급(초록 #16a34a), 부정적 언급(빨강 #dc2626), 중립(회색 #6b7280)

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

> 📝 **마지막 업데이트**: 2025-08-13  
> 💬 **문의사항**: 차트 관련 질문이나 개선사항이 있으면 언제든지 알려주세요.