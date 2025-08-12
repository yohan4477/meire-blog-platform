# 국민연금 투자현황 대시보드 아키텍처

## 프로젝트 개요

Robinhood 스타일의 게임화된 UX를 적용한 국민연금 투자현황 대시보드입니다. 복잡한 금융 데이터를 직관적이고 흥미롭게 시각화하여 사용자가 쉽게 이해할 수 있도록 설계되었습니다.

## 컴포넌트 구조

```
src/components/pension/
├── NationalPensionDashboard.tsx      # 메인 대시보드 컨테이너
├── PensionAssetAllocation.tsx        # 자산배분 파이차트 & 분석
├── PensionPerformanceMetrics.tsx     # 성과지표 게이지 & 카드
├── PensionTopHoldings.tsx           # 주요 보유종목 리스트
├── PortfolioComparison.tsx          # 개인 포트폴리오 비교 (게임화)
├── PensionTrendChart.tsx            # 수익률 추이 라인차트
└── STYLING_GUIDE.md                 # 스타일링 가이드
```

## 페이지 구조

```
src/app/pension/
└── page.tsx                         # 국민연금 대시보드 페이지
```

## 핵심 기능

### 1. 메인 대시보드 (NationalPensionDashboard.tsx)

**주요 기능:**
- 국민연금 실시간 데이터 로딩 및 표시
- 탭 기반 네비게이션 (개요, 자산배분, 보유종목, 포트폴리오 비교)
- 반응형 그리드 레이아웃
- 로딩 및 에러 상태 처리

**데이터 구조:**
```typescript
interface PensionData {
  totalAssets: number;           // 총 자산 (₩912조원)
  ytdReturn: number;            // 올해 수익률 (8.4%)
  assetAllocation: {            // 자산배분
    domesticStocks: number;     // 국내주식 30%
    foreignStocks: number;      // 해외주식 35%
    bonds: number;              // 채권 30%
    alternatives: number;       // 대체투자 5%
  };
  topHoldings: Array<{          // 주요 보유종목
    symbol: string;
    name: string;
    value: number;
    percentage: number;
    change: number;
    country: string;
  }>;
  performance: {                // 성과 지표
    ytd: number;
    threeYear: number;
    fiveYear: number;
    volatility: number;
    sharpeRatio: number;
  };
}
```

### 2. 자산배분 시각화 (PensionAssetAllocation.tsx)

**시각화 요소:**
- SVG 기반 애니메이션 도넛 차트
- 호버 효과 및 글로우 이펙트
- 상세 모드 토글 (설명 추가 표시)
- 자산별 인사이트 카드

**핵심 기능:**
```typescript
// 도넛 차트 애니메이션
const circumference = normalizedRadius * 2 * Math.PI;
const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
```

### 3. 성과 지표 (PensionPerformanceMetrics.tsx)

**게임화 요소:**
- 게이지 차트 애니메이션
- 색상 코딩된 성과 지표
- 벤치마크 비교 진행 바
- 투자 점수 시스템

**시각화 컴포넌트:**
```typescript
const GaugeChart = ({ value, max, color }) => {
  const percentage = Math.min((Math.abs(value) / max) * 100, 100);
  const rotation = (percentage / 100) * 180;
  // SVG 게이지 렌더링
};
```

### 4. 보유종목 (PensionTopHoldings.tsx)

**인터랙티브 기능:**
- 국가별 필터링
- 무한 스크롤 (더보기)
- 실시간 가격 변동 표시
- 포트폴리오 집중도 분석

**데이터 시각화:**
- 순위별 색상 코딩 (1위: 금색, 2위: 은색, 3위: 동색)
- 국가별 플래그 표시
- 회사별 아이콘/이모지
- 호버 효과 및 애니메이션

### 5. 포트폴리오 비교 (PortfolioComparison.tsx)

**게임화 전략:**
- 3가지 투자 스타일 프리셋 (공격적, 균형적, 보수적)
- AI 기반 인사이트 생성
- 투자 점수 시스템
- 상세 분석 토글

**비교 메트릭:**
- 자산 배분 차이
- 수익률 비교
- 리스크 레벨 분석
- 개선 제안

### 6. 수익률 추이 (PensionTrendChart.tsx)

**차트 기능:**
- 시간대별 필터 (1Y, 3Y, 5Y, 10Y)
- 벤치마크(KOSPI) 비교
- 애니메이션 라인 그래프
- 실시간 데이터 포인트

**SVG 애니메이션:**
```css
@keyframes draw {
  from {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
  }
  to {
    stroke-dasharray: 1000;
    stroke-dashoffset: 0;
  }
}
```

## Robinhood 스타일 디자인 원칙

### 1. 미니멀리즘
- 깔끔한 화이트 배경
- 충분한 여백 활용
- 필수 정보만 표시

### 2. 색상 시스템
- 녹색: 수익, 상승
- 빨간색: 손실, 하락
- 파란색: 중립, 정보
- 그라데이션: 카드 배경

### 3. 타이포그래피
- 큰 숫자: 강조
- 작은 라벨: 설명
- 모노스페이스: 금액 표시

### 4. 인터랙션
- 호버 효과
- 부드러운 애니메이션
- 즉각적인 피드백

## 반응형 디자인

### 모바일 (320px - 768px)
- 1열 그리드 레이아웃
- 터치 친화적 버튼 크기 (44px 이상)
- 스와이프 제스처 지원
- 간소화된 정보 표시

### 태블릿 (768px - 1024px)
- 2열 그리드 레이아웃
- 사이드바 네비게이션
- 확장된 차트 영역

### 데스크톱 (1024px+)
- 3-4열 그리드 레이아웃
- 풀스크린 차트
- 상세 정보 표시
- 멀티 패널 뷰

## 성능 최적화

### 1. 컴포넌트 최적화
```typescript
// React.memo로 불필요한 리렌더링 방지
export default React.memo(NationalPensionDashboard);

// useMemo로 복잡한 계산 캐싱
const calculations = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

### 2. 이미지 최적화
- Next.js Image 컴포넌트 사용
- WebP 포맷 지원
- 레이지 로딩

### 3. 번들 최적화
- 컴포넌트 코드 스플리팅
- 동적 임포트 활용
- Tree shaking

## 접근성 (Accessibility)

### WCAG 2.1 AA 준수
- 색상 대비 4.5:1 이상
- 키보드 네비게이션 지원
- 스크린 리더 호환
- 대체 텍스트 제공

### 키보드 네비게이션
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    // 액션 실행
  }
};
```

## 데이터 흐름

### 1. 데이터 페칭
```typescript
// API 호출 (실제 환경에서)
const fetchPensionData = async () => {
  const response = await fetch('/api/pension/current');
  return response.json();
};

// React Query로 캐싱 및 상태 관리
const { data, isLoading, error } = useQuery({
  queryKey: ['pension-data'],
  queryFn: fetchPensionData,
  refetchInterval: 60000, // 1분마다 업데이트
});
```

### 2. 상태 관리
- React Query: 서버 상태
- useState: 로컬 상태 (필터, 탭 등)
- Context API: 테마, 사용자 설정

### 3. 에러 처리
```typescript
const ErrorBoundary = ({ children }) => {
  // 에러 발생 시 폴백 UI 표시
  return (
    <div className="error-fallback">
      <h2>데이터를 불러올 수 없습니다</h2>
      <button onClick={retry}>다시 시도</button>
    </div>
  );
};
```

## 배포 및 환경 설정

### 환경 변수
```env
NEXT_PUBLIC_API_URL=https://api.pension.gov.kr
NEXT_PUBLIC_REFRESH_INTERVAL=60000
```

### 빌드 최적화
```bash
npm run build
npm run start
```

### Docker 배포
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 향후 개선 사항

### 1. 실시간 데이터
- WebSocket 연결
- 실시간 가격 업데이트
- 푸시 알림

### 2. 고급 분석
- 머신러닝 예측
- 포트폴리오 최적화
- 리스크 분석

### 3. 소셜 기능
- 투자 성과 공유
- 커뮤니티 기능
- 전문가 분석

### 4. 개인화
- 관심 종목 추가
- 맞춤형 대시보드
- 알림 설정

이 아키텍처를 통해 사용자에게 직관적이고 매력적인 국민연금 투자현황 대시보드를 제공할 수 있습니다.