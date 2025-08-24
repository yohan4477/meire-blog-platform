# 🔄 메르님 말씀 스타일 표준 로딩 컴포넌트

> **목적**: 모든 API 로딩 상태에서 일관된 UX 제공
> **기반**: 메인페이지 TodayMerryQuote 컴포넌트의 로딩 패턴

## 📋 핵심 설계 원칙

### ✅ **즉시 표시 요소**
- 제목과 아이콘은 바로 렌더링
- 사용자가 무엇을 기다리는지 명확히 인지

### ✅ **명확한 로딩 상태**
- "로딩 중..." 텍스트로 명시적 상태 표시
- 애매한 빈 화면 방지

### ✅ **Skeleton Animation**
- `animate-pulse`로 자연스러운 로딩 효과
- 실제 콘텐츠와 유사한 레이아웃

## 🔧 표준 로딩 컴포넌트

```tsx
import { ReactNode } from 'react';

interface LoadingSectionProps {
  title: string;
  icon: any; // Lucide React 아이콘
  subtitle?: string;
  className?: string;
  skeletonLines?: number;
}

export function LoadingSection({ 
  title, 
  icon: Icon, 
  subtitle,
  className = "",
  skeletonLines = 3
}: LoadingSectionProps) {
  return (
    <div className={`bg-card rounded-2xl p-4 sm:p-6 lg:p-8 border shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}>
      {/* 헤더 - 즉시 표시 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-primary p-1.5 sm:p-2 rounded-lg flex-shrink-0">
            <Icon className="text-primary-foreground w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground leading-tight">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <span className="truncate">로딩 중...</span>
              {subtitle && <span className="hidden sm:inline text-muted-foreground/70">• {subtitle}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* 내용 - 로딩 중 */}
      <div className="animate-pulse space-y-4 sm:space-y-6">
        <div className="space-y-3">
          {Array.from({ length: skeletonLines }).map((_, index) => (
            <div 
              key={index}
              className={`h-4 bg-muted rounded ${
                index === 0 ? 'w-full' : 
                index === 1 ? 'w-4/5' : 
                'w-3/4'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

## 📱 컴팩트 버전 (작은 섹션용)

```tsx
export function LoadingCompact({ 
  title, 
  icon: Icon,
  className = ""
}: { title: string; icon: any; className?: string }) {
  return (
    <div className={`bg-card rounded-lg p-3 sm:p-4 border ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="text-primary w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground ml-auto">로딩 중...</span>
      </div>
      
      <div className="animate-pulse space-y-2">
        <div className="h-3 bg-muted rounded w-full"></div>
        <div className="h-3 bg-muted rounded w-3/4"></div>
      </div>
    </div>
  );
}
```

## 🎯 사용 예시

### 메인 컴포넌트들

```tsx
import { TrendingUp, BarChart3, Brain, FileText, Quote, PieChart } from 'lucide-react';

// 메르's Pick 로딩
<LoadingSection 
  title="메르's Pick" 
  icon={TrendingUp}
  subtitle="종목 추천 데이터"
/>

// 종목 차트 로딩  
<LoadingSection 
  title="주가 차트" 
  icon={BarChart3}
  subtitle="6개월 차트 데이터"
  skeletonLines={4}
/>

// 감정 분석 로딩
<LoadingSection 
  title="감정 분석" 
  icon={Brain}
  subtitle="AI 분석 결과"
/>

// 메르님 말씀 (기존)
<LoadingSection 
  title="메르님 한 줄 코멘트" 
  icon={Quote}
/>

// 포트폴리오 차트
<LoadingSection 
  title="포트폴리오 현황" 
  icon={PieChart}
  subtitle="자산 배분"
/>
```

### 컴팩트 버전

```tsx
// 사이드바나 작은 위젯용
<LoadingCompact title="최근 포스트" icon={FileText} />
<LoadingCompact title="실시간 뉴스" icon={Newspaper} />
<LoadingCompact title="관련 종목" icon={Building2} />
```

## 🎨 스타일링 가이드

### 색상 시스템
- **Primary**: 메인 아이콘 배경
- **Foreground**: 제목 텍스트
- **Muted-Foreground**: 부제목 및 "로딩 중..." 텍스트
- **Muted**: Skeleton 애니메이션 배경

### 반응형 크기
```css
/* 모바일 (기본) */
- 아이콘: w-5 h-5
- 제목: text-lg  
- 부제목: text-xs
- 패딩: p-4

/* 태블릿 (sm:) */
- 아이콘: sm:w-6 sm:h-6
- 제목: sm:text-xl
- 부제목: sm:text-sm
- 패딩: sm:p-6

/* 데스크톱 (lg:) */
- 제목: lg:text-2xl
- 패딩: lg:p-8
```

## ⚡ 성능 최적화

### 지연 로딩 방지
```tsx
// ❌ 잘못된 방법 - 지연 표시
{loading && <div>로딩중...</div>}

// ✅ 올바른 방법 - 즉시 표시
{loading ? (
  <LoadingSection title="데이터" icon={Database} />
) : (
  <ActualContent data={data} />
)}
```

### 조건부 렌더링 패턴
```tsx
export function DataSection({ data, isLoading, error }) {
  // 로딩 상태 - 최우선 표시
  if (isLoading) {
    return <LoadingSection title="데이터 분석" icon={BarChart3} />;
  }
  
  // 에러 상태
  if (error) {
    return <ErrorSection message="데이터 로딩 실패" />;
  }
  
  // 데이터 없음
  if (!data || data.length === 0) {
    return <EmptySection message="데이터가 없습니다" />;
  }
  
  // 정상 데이터 표시
  return <NormalContent data={data} />;
}
```

## 🚀 구현 체크리스트

### 모든 API 호출에 적용
- [ ] `/api/merry/stocks` - 메르's Pick 로딩
- [ ] `/api/merry/posts` - 포스트 목록 로딩  
- [ ] `/api/stock-price` - 차트 데이터 로딩
- [ ] `/api/merry/stocks/[ticker]/sentiments` - 감정 분석 로딩
- [ ] `/api/today-merry-quote` - 메르님 말씀 로딩

### 상태 관리 패턴
```tsx
// React 훅 사용 예시
function useDataWithLoading<T>(apiCall: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiCall();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
```

## 💡 사용자 경험 개선점

1. **즉시 피드백**: 로딩 시작과 동시에 상태 표시
2. **진행 상황 인지**: "로딩 중..." 텍스트로 명확한 상태 전달  
3. **일관성**: 모든 섹션에서 동일한 로딩 패턴 사용
4. **반응성**: 다양한 화면 크기에서 최적화된 표시
5. **접근성**: 스크린 리더 친화적 구조

---

**💾 claud.me 저장 완료** - 이 문서를 참조하여 모든 로딩 상태를 일관되게 구현하세요.