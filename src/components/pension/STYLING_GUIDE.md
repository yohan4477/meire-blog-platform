# 국민연금 대시보드 스타일링 가이드

## 색상 팔레트

### 메인 색상
- **Primary Blue**: `#3b82f6` - 국민연금 메인 색상
- **Success Green**: `#10b981` - 양수 수익률, 성공 상태
- **Warning Orange**: `#f97316` - 주의사항, 대체투자
- **Danger Red**: `#ef4444` - 음수 수익률, 위험 상태
- **Purple**: `#8b5cf6` - 채권, 보조 지표

### 배경 그라데이션
```css
/* 메인 대시보드 배경 */
.dashboard-bg {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

/* 다크모드 배경 */
.dashboard-bg-dark {
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
}
```

### 카드 스타일
```css
/* Robinhood 스타일 카드 */
.robinhood-card {
  @apply bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700;
  @apply hover:shadow-xl transition-all duration-300;
  @apply backdrop-blur-sm bg-opacity-90;
}

/* 그라데이션 카드 */
.gradient-card {
  @apply bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20;
  @apply border border-blue-200 dark:border-blue-800;
}
```

## 게임화 UI 요소

### 애니메이션
```css
/* 진입 애니메이션 */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-in-up {
  animation: slideInUp 0.6s ease-out;
}

/* 호버 효과 */
.hover-scale {
  @apply hover:scale-105 transition-transform duration-300;
}

/* 펄스 애니메이션 */
.pulse-dot {
  @apply animate-pulse bg-green-500 rounded-full;
}
```

### 진행 바 & 게이지
```css
/* 원형 진행 바 */
.circular-progress {
  @apply relative w-24 h-24;
}

.circular-progress-ring {
  @apply transform -rotate-90 origin-center;
  transition: stroke-dashoffset 1s ease-in-out;
}

/* 선형 진행 바 */
.progress-bar {
  @apply w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2;
  overflow: hidden;
}

.progress-fill {
  @apply h-full rounded-full transition-all duration-1000 ease-out;
}
```

## 반응형 디자인

### 모바일 우선 브레이크포인트
```css
/* Mobile First - 320px ~ 768px */
.mobile-grid {
  @apply grid grid-cols-1 gap-4;
}

/* Tablet - 768px ~ 1024px */
.tablet-grid {
  @apply md:grid-cols-2 md:gap-6;
}

/* Desktop - 1024px+ */
.desktop-grid {
  @apply lg:grid-cols-3 xl:grid-cols-4 lg:gap-8;
}
```

### 컴포넌트별 반응형
```css
/* 자산배분 차트 */
.asset-chart-container {
  @apply flex flex-col lg:flex-row items-center gap-6;
}

/* 보유종목 테이블 */
.holdings-table {
  @apply overflow-x-auto;
}

.holdings-row {
  @apply flex items-center justify-between p-4;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700;
  @apply transition-all duration-200;
}
```

## 타이포그래피

### 헤딩 스타일
```css
.dashboard-title {
  @apply text-4xl font-bold text-gray-900 dark:text-white;
  @apply mb-2;
}

.section-title {
  @apply text-xl font-semibold text-gray-800 dark:text-gray-200;
  @apply mb-4;
}

.metric-title {
  @apply text-sm font-medium text-gray-600 dark:text-gray-400;
  @apply uppercase tracking-wide;
}
```

### 숫자 스타일
```css
.big-number {
  @apply text-3xl font-bold;
}

.currency-kr {
  @apply font-mono text-green-600 dark:text-green-400;
}

.currency-us {
  @apply font-mono text-blue-600 dark:text-blue-400;
}

.percentage-positive {
  @apply text-green-600 dark:text-green-400 font-semibold;
}

.percentage-negative {
  @apply text-red-600 dark:text-red-400 font-semibold;
}
```

## 아이콘 & 이모지 사용

### 자산별 이모지
- 국내주식: 🏠
- 해외주식: 🌍
- 채권: 📄
- 대체투자: 🏢
- 현금: 💰

### 회사별 이모지
- 삼성전자: 📱
- SK하이닉스: 🧠
- Apple: 🍎
- TSMC: 💻
- Microsoft: 💼

### 상태 이모지
- 성공/증가: ✅ 📈
- 실패/감소: ❌ 📉
- 경고: ⚠️ 🟡
- 정보: ℹ️ 💡

## 다크모드 최적화

### 색상 변수
```css
:root {
  --card-bg: #ffffff;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
}

[data-theme="dark"] {
  --card-bg: #1f2937;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --border-color: #374151;
}
```

### 투명도 활용
```css
.glass-effect {
  @apply bg-white/80 dark:bg-gray-800/80;
  @apply backdrop-blur-md;
  @apply border border-white/20 dark:border-gray-600/20;
}
```

## 모바일 터치 최적화

### 터치 타겟 크기
```css
.touch-target {
  @apply min-h-[44px] min-w-[44px];
  @apply flex items-center justify-center;
}

.mobile-button {
  @apply py-3 px-4 rounded-lg;
  @apply active:scale-95 transition-transform;
}
```

### 스와이프 제스처
```css
.swipeable {
  @apply overflow-x-auto scrollbar-hide;
  scroll-snap-type: x mandatory;
}

.swipe-item {
  @apply flex-none scroll-snap-align-start;
}
```

## 성능 최적화

### CSS 최적화
```css
/* GPU 가속 활용 */
.gpu-accelerated {
  transform: translateZ(0);
  will-change: transform;
}

/* 효율적인 애니메이션 */
.smooth-animation {
  @apply transition-transform transition-opacity;
  @apply duration-300 ease-out;
}
```

### 로딩 상태
```css
.skeleton {
  @apply animate-pulse bg-gray-300 dark:bg-gray-600 rounded;
}

.shimmer {
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(255,255,255,0.4) 50%, 
    transparent 100%);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

## 접근성 (Accessibility)

### 키보드 네비게이션
```css
.focus-visible {
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
}

.skip-link {
  @apply absolute -top-40 left-6 bg-blue-600 text-white px-4 py-2 rounded;
  @apply focus:top-6 transition-all;
}
```

### 색상 대비
```css
/* WCAG AA 준수 색상 대비 */
.high-contrast {
  @apply text-gray-900 dark:text-gray-100;
  @apply bg-white dark:bg-gray-900;
}
```

## 사용 예시

### 기본 카드 컴포넌트
```jsx
<div className="robinhood-card slide-in-up">
  <div className="p-6">
    <h3 className="section-title">자산 현황</h3>
    <div className="big-number currency-kr">₩912조원</div>
  </div>
</div>
```

### 반응형 그리드
```jsx
<div className="mobile-grid tablet-grid desktop-grid">
  {items.map(item => (
    <div key={item.id} className="gradient-card hover-scale">
      {/* 카드 내용 */}
    </div>
  ))}
</div>
```

이 가이드를 따라 일관성 있고 사용자 친화적인 국민연금 대시보드를 구현할 수 있습니다.