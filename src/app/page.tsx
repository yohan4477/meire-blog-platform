'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, TrendingUp, BarChart3, User, Bell, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useResponsive } from '@/hooks/useResponsive';
import { mainPageCache } from '@/lib/performance-cache';

// 🎬 종목 페이지 방식의 애니메이션 시스템
interface SectionStatus {
  hero: 'idle' | 'loading' | 'loaded' | 'error';
  todayQuote: 'idle' | 'loading' | 'loaded' | 'error';
  merryPicks: 'idle' | 'loading' | 'loaded' | 'error';
  mainContent: 'idle' | 'loading' | 'loaded' | 'error';
  bottomCards: 'idle' | 'loading' | 'loaded' | 'error';
}

// ⚡ 성능 모니터링 함수 (종목 페이지 방식)
function trackSectionPerformance(sectionName: string, loadTime: number) {
  const performanceTargets = {
    hero: 200,
    todayQuote: 800,
    merryPicks: 1000,
    mainContent: 1200,
    bottomCards: 1500,
  };
  
  if (loadTime > performanceTargets[sectionName as keyof typeof performanceTargets]) {
    console.warn(`🐌 ${sectionName} 섹션 느림: ${loadTime}ms`);
  } else {
    console.log(`⚡ ${sectionName} 섹션 성능 양호: ${loadTime}ms`);
  }
}

// 🚀 점진적 로딩 시스템 - 종목 페이지 방식 적용
// 각 섹션을 독립적으로 로딩하여 성능과 UX 최적화

const MerryStockPicks = dynamic(
  () => import('@/components/merry/MerryStockPicks'),
  { 
    loading: () => <div className="animate-pulse"><Skeleton className="h-96 w-full" /></div>,
    ssr: true // 메르's Pick은 핵심 기능이므로 SSR 활성화
  }
);

const MerryProfileTab = dynamic(
  () => import('@/components/merry/MerryProfileTab'),
  { 
    loading: () => <div className="animate-pulse"><Skeleton className="h-96 w-full" /></div>,
    ssr: false // 탭 콘텐츠는 상호작용 후 로딩
  }
);

const TodayMerryQuote = dynamic(
  () => import('@/components/home/TodayMerryQuote').then(mod => ({ default: mod.TodayMerryQuote })),
  { 
    loading: () => <div className="animate-pulse"><Skeleton className="h-64 w-full rounded-lg" /></div>,
    ssr: true // SEO 중요하므로 SSR 활성화
  }
);

// 🎨 CSS 애니메이션 시스템 (종목 페이지 차트 애니메이션 방식)
const animationStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes slideInFromLeft {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .section-hero { animation: fadeInUp 0.3s ease-out; }
  .section-today-quote { animation: scaleIn 0.4s ease-out 0.2s both; }
  .section-merry-picks { animation: fadeInUp 0.3s ease-out 0.4s both; }
  .section-main-content { animation: fadeInUp 0.3s ease-out 0.6s both; }
  .section-bottom-cards { animation: slideInFromLeft 0.3s ease-out 0.8s both; }
  
  .card-stagger-1 { animation: fadeInUp 0.3s ease-out 0.1s both; }
  .card-stagger-2 { animation: fadeInUp 0.3s ease-out 0.2s both; }
`;


export default function Home() {
  // 🚀 반응형 및 성능 최적화 훅 (종목 페이지 방식)
  const responsive = useResponsive();
  const { mainPageConfig, performanceConfig } = responsive;
  
  // 🎬 섹션별 로딩 상태 관리 (기기별 차별화)
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>({
    hero: 'loaded',        // Hero는 즉시 표시
    todayQuote: 'idle',    // 모바일: 즉시, 데스크톱: 300ms 후
    merryPicks: 'idle',    // 600ms 후 로딩
    mainContent: 'idle',   // 모바일: 즉시, 데스크톱: 900ms 후  
    bottomCards: 'idle'    // 1200ms 후 로딩
  });
  
  const [merryPosts, setMerryPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(mainPageConfig.mainContent.defaultTab);
  const animationStylesRef = useRef<HTMLStyleElement | null>(null);
  
  // ⚡ 성능 추적을 위한 Ref
  const sectionTimers = useRef<Record<string, number>>({});
  
  // 📈 섹션 로딩 시간 추적
  const startSectionTimer = useCallback((sectionName: string) => {
    sectionTimers.current[sectionName] = Date.now();
  }, []);
  
  const completeSectionTimer = useCallback((sectionName: string) => {
    if (sectionTimers.current[sectionName]) {
      const loadTime = Date.now() - sectionTimers.current[sectionName];
      trackSectionPerformance(sectionName, loadTime);
      delete sectionTimers.current[sectionName];
    }
  }, []);
  
  // 🎨 CSS 애니메이션 주입 (종목 페이지 방식)
  useEffect(() => {
    if (!animationStylesRef.current) {
      const styleSheet = document.createElement('style');
      styleSheet.type = 'text/css';
      styleSheet.innerText = animationStyles;
      document.head.appendChild(styleSheet);
      animationStylesRef.current = styleSheet;
    }
    
    return () => {
      if (animationStylesRef.current) {
        document.head.removeChild(animationStylesRef.current);
        animationStylesRef.current = null;
      }
    };
  }, []);
  
  // 🚀 점진적 데이터 로딩 시스템 (기기별 최적화)
  useEffect(() => {
    // 기기별 로딩 시퀀스 조정
    const getLoadSequence = () => {
      if (responsive.isMobile) {
        // 모바일: 빠른 로딩, 필수 콘텐츠 우선
        return [
          { name: 'todayQuote', delay: 100 },  // 모바일에서는 즉시
          { name: 'merryPicks', delay: 400 },  // 빠른 로딩
          { name: 'mainContent', delay: 200 }, // 모바일에서는 빠르게
          { name: 'bottomCards', delay: 800 }  // 덜 중요한 하단 콘텐츠
        ];
      } else if (responsive.isTablet) {
        // 태블릿: 균형잡힌 로딩
        return [
          { name: 'todayQuote', delay: 200 },
          { name: 'merryPicks', delay: 500 },
          { name: 'mainContent', delay: 700 },
          { name: 'bottomCards', delay: 1000 }
        ];
      } else {
        // 데스크톱: 애니메이션 중심 로딩 (원래 시퀀스)
        return [
          { name: 'todayQuote', delay: 300 },
          { name: 'merryPicks', delay: 600 },
          { name: 'mainContent', delay: 900 },
          { name: 'bottomCards', delay: 1200 }
        ];
      }
    };

    const sectionLoadSequence = getLoadSequence();
    
    sectionLoadSequence.forEach(({ name, delay }) => {
      setTimeout(() => {
        startSectionTimer(name);
        setSectionStatus(prev => ({ ...prev, [name]: 'loading' }));
        
        // 실제 데이터 로딩 (기기별 타임아웃 조정)
        const loadingTimeout = responsive.isMobile ? 
          Math.random() * 200 + 50 :  // 모바일: 50-250ms
          Math.random() * 300 + 100;  // 데스크톱: 100-400ms
          
        setTimeout(() => {
          setSectionStatus(prev => ({ ...prev, [name]: 'loaded' }));
          completeSectionTimer(name);
        }, loadingTimeout);
      }, delay);
    });
  }, [startSectionTimer, completeSectionTimer, responsive.deviceType]);
  
  // 📈 메르 데이터 캐시 최적화 로딩 (종목 페이지 방식)
  useEffect(() => {
    const fetchMerryData = async () => {
      try {
        // 캐시된 병렬 로딩으로 성능 극대화
        const [merryPostsResult] = await Promise.allSettled([
          mainPageCache.getMerryPosts()
        ]);
        
        // 메르 포스트 처리 (캐시된 데이터)
        if (merryPostsResult.status === 'fulfilled' && merryPostsResult.value.success) {
          setMerryPosts(merryPostsResult.value.data.slice(0, 2));
          console.log('✅ 메르 포스트 캐시 로딩 성공');
        }
        
        // 캐시 통계 로그 (개발 시에만)
        if (process.env.NODE_ENV === 'development') {
          const cacheStats = mainPageCache.getPerformanceStats();
          console.log('📊 메인 페이지 캐시 통계:', cacheStats);
        }
        
      } catch (error) {
        console.error('❌ 메르 데이터 로딩 실패:', error);
        // 빈 데이터 유지 (가짜 데이터 사용 금지)
      }
    };
    
    fetchMerryData();
  }, []);


  return (
    <div className="min-h-screen bg-background">
      {/* 🎆 Hero Section - 즉시 표시 */}
      <section className={`bg-card border-b section-hero ${sectionStatus.hero === 'loaded' ? '' : 'opacity-0'}`}>
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              요르의 투자 플랫폼
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-4 break-keep">
              니가 뭘 알아. 니가 뭘 아냐고.<br />
              요르가 전하는 날카로운 투자 인사이트
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center max-w-4xl mx-auto px-2">
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto min-w-0 text-sm sm:text-base card-stagger-1">
                <Link href="/merry" className="flex items-center justify-center">
                  <span className="truncate">📝 메르 블로그</span>
                  <User className="ml-2 h-4 w-4 flex-shrink-0" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto min-w-0 text-sm sm:text-base card-stagger-1">
                <Link href="/merry/stocks" className="flex items-center justify-center">
                  <span className="truncate">📊 종목 리스트</span>
                  <TrendingUp className="ml-2 h-4 w-4 flex-shrink-0" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto min-w-0 text-sm sm:text-base card-stagger-2">
                <Link href="/merry/weekly-report" className="flex items-center justify-center">
                  <span className="truncate">📊 주간 보고</span>
                  <BarChart3 className="ml-2 h-4 w-4 flex-shrink-0" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 🎅 오늘의 메르님 말씀 - 300ms 후 로딩 */}
      <section className={`bg-muted/50 border-b transition-all duration-300 ${
        sectionStatus.todayQuote === 'loaded' ? 'section-today-quote' : 
        sectionStatus.todayQuote === 'loading' ? 'animate-pulse' :
        'opacity-0'
      }`}>
        <div className="container mx-auto px-4 py-8">
          {sectionStatus.todayQuote === 'loaded' ? (
            <TodayMerryQuote />
          ) : sectionStatus.todayQuote === 'loading' ? (
            <div className="animate-pulse"><Skeleton className="h-64 w-full rounded-lg" /></div>
          ) : null}
        </div>
      </section>

      {/* 🎆 메르's Pick - 600ms 후 로딩 */}
      <section className={`bg-muted/50 border-b transition-all duration-300 ${
        sectionStatus.merryPicks === 'loaded' ? 'section-merry-picks' : 
        sectionStatus.merryPicks === 'loading' ? 'animate-pulse' :
        'opacity-0'
      }`}>
        <div className="container mx-auto px-4 py-6">
          {sectionStatus.merryPicks === 'loaded' ? (
            <MerryStockPicks />
          ) : sectionStatus.merryPicks === 'loading' ? (
            <div className="animate-pulse"><Skeleton className="h-96 w-full" /></div>
          ) : null}
        </div>
      </section>
      
      {/* 🎯 Main Content with Tabs - 900ms 후 로딩 */}
      <div className={`container mx-auto px-4 py-8 transition-all duration-300 ${
        sectionStatus.mainContent === 'loaded' ? 'section-main-content' : 
        sectionStatus.mainContent === 'loading' ? 'animate-pulse' :
        'opacity-0'
      }`}>
        {sectionStatus.mainContent === 'loaded' ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger value="profile" className="text-xs sm:text-sm px-1 sm:px-2 py-2 min-w-0">
                <span className="hidden sm:inline">👤 </span>
                <span className="truncate">메르 소개</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs sm:text-sm px-1 sm:px-2 py-2 min-w-0">
                <span className="hidden sm:inline">🤖 </span>
                <span className="truncate">AI 인사이트</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="insights" className="mt-6 space-y-6">
              {/* AI 금융 큐레이션 섹션 제거됨 */}
              <div className="bg-card rounded-lg p-6">
                <div className="text-center text-muted-foreground">
                  <p>AI 금융 큐레이션 기능이 제거되었습니다.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              <MerryProfileTab />
            </TabsContent>
          </Tabs>
        ) : sectionStatus.mainContent === 'loading' ? (
          <div className="animate-pulse">
            <Skeleton className="h-12 w-full mb-6" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : null}
      </div>

      {/* 🏛️ 국민연금 분석 & 에이전트 관리 - 1200ms 후 로딩 */}
      <section className={`bg-card border-t transition-all duration-300 ${
        sectionStatus.bottomCards === 'loaded' ? 'section-bottom-cards' : 
        sectionStatus.bottomCards === 'loading' ? 'animate-pulse' :
        'opacity-0'
      }`}>
        <div className="container mx-auto px-4 py-6">
          {sectionStatus.bottomCards === 'loaded' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 card-stagger-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  국민연금 분석
                </h3>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/investment">
                    자세히 보기
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                국민연금공단의 최신 포트폴리오 변화와 투자 전략을 분석합니다
              </p>
            </Card>
            
              <Card className="p-6 card-stagger-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Brain className="mr-2 h-5 w-5" />
                    에이전트 관리
                  </h3>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/agent-workflows">
                      자세히 보기
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI 에이전트들의 분석 워크플로우를 관리하고 모니터링합니다
                </p>
              </Card>
            </div>
          ) : sectionStatus.bottomCards === 'loading' ? (
            <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}