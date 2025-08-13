# ⚡ 성능 요구사항 명세서

> **3초 로딩 제한 달성을 위한 포괄적 성능 최적화 가이드라인**  
> CLAUDE.md의 핵심 원칙을 구현하기 위한 필수 성능 기준입니다.

---

## 🎯 핵심 성능 기준 (필수 준수)

### 절대 성능 한계
- **로딩 시간**: < 3초 (절대 한계)
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### 페이지별 세부 기준
| 페이지 | 초기 로딩 | 차트 렌더링 | API 응답 |
|--------|-----------|-------------|----------|
| 메인 페이지 | < 2초 | N/A | < 500ms |
| 종목 상세 | < 3초 | < 1.5초 | < 500ms |
| 메르's Pick | < 500ms | N/A | < 500ms |
| 포트폴리오 | < 3초 | < 2초 | < 1초 |

---

## 🏗️ 필수 최적화 방법 (3초 로딩 달성)

### 1. 이미지 최적화
```typescript
// Next.js Image 컴포넌트 사용 (필수)
import Image from 'next/image';

<Image
  src="/stock-chart.webp"
  alt="Stock Chart"
  width={800}
  height={400}
  priority={true} // 중요 이미지는 priority
  placeholder="blur" // 블러 효과로 로딩 체감 개선
/>
```

**이미지 포맷 기준**:
- **WebP**: 모든 차트, 로고, 아이콘
- **AVIF**: 지원하는 브라우저에서 우선 사용
- **PNG**: WebP 미지원 브라우저 fallback
- **최대 크기**: 데스크톱 1920px, 모바일 768px

### 2. 코드 스플리팅
```typescript
// 동적 import 사용 (필수)
import dynamic from 'next/dynamic';

const StockChart = dynamic(() => import('@/components/merry/StockPriceChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false // 차트는 CSR로 렌더링
});

const PortfolioDashboard = dynamic(
  () => import('@/components/portfolio/Dashboard'),
  { ssr: false }
);
```

**번들 크기 제한**:
- **메인 번들**: < 250KB (gzipped)
- **페이지별 청크**: < 100KB (gzipped)
- **라이브러리 청크**: < 500KB (gzipped)

### 3. 캐싱 전략
```typescript
// Redis 캐싱 (권장)
interface CacheStrategy {
  stocks: '12h';           // 메르's Pick 데이터
  prices: '5m';            // 실시간 주가
  charts: '1h';            // 차트 데이터
  posts: '6h';             // 메르 포스트
  static: '30d';           // 정적 자산
}

// API 레벨 캐싱
export async function GET(request: NextRequest) {
  const cachedData = await redis.get(`stocks:${ticker}`);
  if (cachedData) {
    return NextResponse.json(JSON.parse(cachedData));
  }
  
  const freshData = await fetchStockData(ticker);
  await redis.setex(`stocks:${ticker}`, 3600, JSON.stringify(freshData));
  return NextResponse.json(freshData);
}
```

### 4. 번들 최적화
```typescript
// Tree shaking을 위한 Named Import (필수)
import { LineChart, XAxis, YAxis } from 'recharts'; // ✅ 좋음
import * as Recharts from 'recharts'; // ❌ 나쁨

// 불필요한 라이브러리 제거
// package.json에서 사용하지 않는 패키지 정리
```

**Webpack 설정 최적화**:
```javascript
// next.config.js
module.exports = {
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        recharts: {
          name: 'recharts',
          chunks: 'all',
          test: /[\\/]node_modules[\\/]recharts[\\/]/,
        },
      };
    }
    return config;
  },
};
```

### 5. 서버 최적화
```typescript
// 데이터베이스 쿼리 최적화
// 인덱스 생성 (필수)
CREATE INDEX idx_stocks_merry_mentioned ON stocks(is_merry_mentioned, last_mentioned_date);
CREATE INDEX idx_stock_prices_ticker_date ON stock_prices(ticker, date);

// 연결 풀링
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  acquireTimeout: 60000,
  timeout: 60000,
});
```

**API 응답 시간 제한**:
- **단순 쿼리**: < 100ms
- **복잡 쿼리**: < 300ms
- **외부 API**: < 500ms
- **전체 API**: < 500ms

### 6. 리소스 압축
```typescript
// gzip/brotli 압축 활성화
// next.config.js
module.exports = {
  compress: true,
  poweredByHeader: false,
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### 7. 프리로딩
```typescript
// Critical CSS 인라인 (필수)
import { Inter, Noto_Sans_KR } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

// 폰트 preload
<link
  rel="preload"
  href="/fonts/inter-latin.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>
```

### 8. 지연 로딩
```typescript
// 뷰포트 외부 컨텐츠 lazy loading
import { lazy, Suspense } from 'react';

const LazyPortfolioChart = lazy(() => import('./PortfolioChart'));

<Suspense fallback={<PortfolioSkeleton />}>
  <LazyPortfolioChart />
</Suspense>
```

---

## 📊 성능 모니터링

### Core Web Vitals 측정
```typescript
// 성능 메트릭 수집
export function reportWebVitals(metric: NextWebVitalsMetric) {
  switch (metric.name) {
    case 'FCP':
      console.log('First Contentful Paint:', metric.value);
      break;
    case 'LCP':
      console.log('Largest Contentful Paint:', metric.value);
      break;
    case 'CLS':
      console.log('Cumulative Layout Shift:', metric.value);
      break;
    case 'FID':
      console.log('First Input Delay:', metric.value);
      break;
    case 'TTFB':
      console.log('Time to First Byte:', metric.value);
      break;
  }
}
```

### 실시간 성능 추적
```typescript
// API 응답 시간 추적
export async function withPerformanceTracking<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    
    if (duration > 500) {
      console.warn(`⚠️ Slow operation: ${operationName} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Operation failed: ${operationName}`);
    throw error;
  }
}
```

---

## 🔧 개발 도구 최적화

### Next.js 설정
```javascript
// next.config.js
module.exports = {
  // 프로덕션 최적화
  swcMinify: true,
  
  // 이미지 최적화
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // 실험적 기능
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react'],
  },
};
```

### TypeScript 최적화
```json
// tsconfig.json
{
  "compilerOptions": {
    "incremental": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler"
  },
  "exclude": ["node_modules", ".next", "out"]
}
```

---

## 📱 모바일 성능 최적화

### 모바일 특화 최적화
```typescript
// 모바일 감지 및 최적화
function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

// 모바일에서는 단순화된 차트
const ChartComponent = isMobile() 
  ? SimpleMobileChart 
  : FullDesktopChart;
```

### 터치 성능 최적화
```css
/* CSS 최적화 */
.chart-container {
  /* GPU 가속 */
  transform: translateZ(0);
  will-change: transform;
  
  /* 터치 지연 제거 */
  touch-action: manipulation;
}

/* 스크롤 성능 */
.scroll-container {
  overflow-scrolling: touch;
  -webkit-overflow-scrolling: touch;
}
```

---

## ⚠️ 성능 경고 임계값

### 자동 경고 시스템
```typescript
// 성능 임계값 설정
const PERFORMANCE_THRESHOLDS = {
  PAGE_LOAD: 3000,     // 3초
  API_RESPONSE: 500,   // 500ms
  CHART_RENDER: 1500,  // 1.5초
  INTERACTION: 100,    // 100ms
};

// 성능 모니터링 미들웨어
function performanceMiddleware(req: NextRequest) {
  const startTime = Date.now();
  
  return {
    onFinish: () => {
      const duration = Date.now() - startTime;
      if (duration > PERFORMANCE_THRESHOLDS.API_RESPONSE) {
        console.warn(`🐌 Slow API: ${req.url} took ${duration}ms`);
      }
    }
  };
}
```

---

## 🧪 성능 테스트 시나리오

### Lighthouse 기준
```bash
# 성능 감사 실행
npx lighthouse http://localhost:3004 --output=json --output-path=./performance-report.json

# 목표 점수
# Performance: > 90
# Accessibility: > 95
# Best Practices: > 90
# SEO: > 90
```

### 로드 테스트
```bash
# Apache Bench를 이용한 부하 테스트
ab -n 1000 -c 10 http://localhost:3004/api/merry/stocks

# 목표:
# - 평균 응답 시간: < 500ms
# - 99% 응답 시간: < 1000ms
# - 에러율: < 1%
```

---

## 📈 성능 개선 로드맵

### Phase 1: 기본 최적화 (완료 기준)
- [ ] Next.js Image 컴포넌트 전체 적용
- [ ] 코드 스플리팅 구현
- [ ] 기본 캐싱 전략 적용
- [ ] 번들 크기 < 250KB 달성

### Phase 2: 고급 최적화 (성능 향상)
- [ ] Redis 캐싱 구현
- [ ] CDN 적용
- [ ] HTTP/2 서버 푸시
- [ ] Service Worker 구현

### Phase 3: 모니터링 시스템 (지속 개선)
- [ ] 실시간 성능 대시보드
- [ ] 자동 성능 회귀 감지
- [ ] 성능 예산 설정
- [ ] A/B 테스트 시스템

---

## 🔗 관련 도구 및 라이브러리

### 성능 측정 도구
- **Lighthouse**: 종합 성능 감사
- **WebPageTest**: 상세 성능 분석
- **Chrome DevTools**: 실시간 프로파일링
- **Next.js Bundle Analyzer**: 번들 크기 분석

### 모니터링 서비스
- **Vercel Analytics**: Next.js 최적화 분석
- **Google PageSpeed Insights**: Core Web Vitals
- **GTmetrix**: 종합 성능 리포트

---

> 📝 **마지막 업데이트**: 2025-08-13  
> 💬 **문의사항**: 성능 최적화 관련 질문이나 개선사항이 있으면 언제든지 알려주세요.  
> ⚡ **성능 목표**: 모든 페이지 3초 이내 로딩 달성이 최우선 목표입니다.