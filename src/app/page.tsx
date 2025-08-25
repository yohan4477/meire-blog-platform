'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InteractiveButton } from '@/components/ui/interactive-button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, User } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { mainPageCache } from '@/lib/performance-cache';

// 🎬 종목 페이지 방식의 애니메이션 시스템 - Fast Refresh 테스트
interface SectionStatus {
  hero: 'idle' | 'loading' | 'loaded' | 'error';
  todayQuote: 'idle' | 'loading' | 'loaded' | 'error';
  merryPicks: 'idle' | 'loading' | 'loaded' | 'error';
  mainContent: 'idle' | 'loading' | 'loaded' | 'error';
}

// ⚡ 성능 모니터링 함수 (1초 로딩 목표)
function trackSectionPerformance(sectionName: string, loadTime: number) {
  const performanceTargets = {
    hero: 100,      // Hero: 100ms 이내
    todayQuote: 200, // 오늘의 말씀: 200ms 이내
    merryPicks: 300, // 메르's Pick: 300ms 이내
    mainContent: 250, // 메인 콘텐츠: 250ms 이내
  };
  
  if (loadTime > performanceTargets[sectionName as keyof typeof performanceTargets]) {
    console.warn(`🐌 ${sectionName} 섹션 느림: ${loadTime}ms`);
  } else {
    console.log(`⚡ ${sectionName} 섹션 성능 양호: ${loadTime}ms`);
  }
}

// 🚀 점진적 로딩 시스템 - 종목 페이지 방식 적용
// 각 섹션을 독립적으로 로딩하여 성능과 UX 최적화

// ⚡ Dynamic Import 제거 - 직접 import로 번들 최적화
import MerryStockPicks from '@/components/merry/MerryStockPicks';
import MerryProfileTab from '@/components/merry/MerryProfileTab';
import { TodayMerryQuote } from '@/components/home/TodayMerryQuote';

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
  
  .section-hero { animation: fadeInUp 0.3s ease-out; }
  .section-today-quote { animation: scaleIn 0.4s ease-out 0.2s both; }
  .section-merry-picks { animation: fadeInUp 0.3s ease-out 0.4s both; }
  .section-main-content { animation: fadeInUp 0.3s ease-out 0.6s both; }
  
  .card-stagger-1 { animation: fadeInUp 0.3s ease-out 0.1s both; }
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
    mainContent: 'idle'    // 모바일: 즉시, 데스크톱: 900ms 후
  });
  
  const [merryPosts, setMerryPosts] = useState<any[]>([]);
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
  
  // 🚀 즉시 로딩 시스템 (인위적 지연 제거)
  useEffect(() => {
    // 모든 섹션 즉시 로드 (setTimeout 제거)
    console.log('⚡ 모든 섹션 즉시 로딩 시작');
    
    const loadAllSectionsImmediately = () => {
      const sections = ['todayQuote', 'merryPicks', 'mainContent'];
      
      sections.forEach((name) => {
        startSectionTimer(name);
        setSectionStatus(prev => ({ ...prev, [name]: 'loaded' })); // 즉시 loaded
        completeSectionTimer(name);
      });
    };

    loadAllSectionsImmediately();
  }, [startSectionTimer, completeSectionTimer]);
  
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
              <InteractiveButton 
                variant="outline" 
                size="lg" 
                href="/merry"
                className="w-full sm:w-auto min-w-0 text-sm sm:text-base card-stagger-1"
              >
                <span className="truncate">📝 메르 포스트</span>
                <User className="ml-2 h-4 w-4 flex-shrink-0" />
              </InteractiveButton>
              <InteractiveButton 
                variant="outline" 
                size="lg" 
                href="/merry/stocks"
                className="w-full sm:w-auto min-w-0 text-sm sm:text-base card-stagger-1"
              >
                <span className="truncate">📊 종목 리스트</span>
                <TrendingUp className="ml-2 h-4 w-4 flex-shrink-0" />
              </InteractiveButton>
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
          <div className="w-full">
            {/* 탭 시스템 제거 - 메르 소개만 표시 */}
            <div className="mt-6">
              <MerryProfileTab />
            </div>
          </div>
        ) : sectionStatus.mainContent === 'loading' ? (
          <div className="animate-pulse">
            <Skeleton className="h-12 w-full mb-6" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : null}
      </div>

    </div>
  );
}