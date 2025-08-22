// 🚀 종목 페이지 방식의 모바일 반응형 최적화 훅
// 기기별 차별화 전략으로 성능과 UX 최적화

import React, { useState, useEffect, useMemo } from 'react';

interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  preferReducedMotion: boolean;
}

interface ResponsiveConfig {
  // 종목 페이지 방식의 기기별 최적화
  animation: {
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
  };
  loadingStrategy: {
    mobile: 'minimal' | 'standard';
    tablet: 'standard' | 'enhanced';
    desktop: 'enhanced';
  };
  contentDensity: {
    mobile: 'compact';
    tablet: 'comfortable';
    desktop: 'spacious';
  };
}

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

const DEFAULT_CONFIG: ResponsiveConfig = {
  animation: {
    mobile: false,    // 모바일에서는 애니메이션 최소화
    tablet: true,     // 태블릿에서는 부분 애니메이션
    desktop: true,    // 데스크톱에서는 풀 애니메이션
  },
  loadingStrategy: {
    mobile: 'minimal',   // 모바일: 필수 콘텐츠만
    tablet: 'standard',  // 태블릿: 표준 로딩
    desktop: 'enhanced', // 데스크톱: 향상된 로딩
  },
  contentDensity: {
    mobile: 'compact',     // 모바일: 압축된 레이아웃
    tablet: 'comfortable', // 태블릿: 편안한 간격
    desktop: 'spacious',   // 데스크톱: 넉넉한 간격
  },
};

export function useResponsive(customConfig?: Partial<ResponsiveConfig>) {
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo>({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    deviceType: 'desktop',
    orientation: 'landscape',
    preferReducedMotion: false,
  });

  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...customConfig,
  }), [customConfig]);

  useEffect(() => {
    const updateViewportInfo = () => {
      if (typeof window === 'undefined') return;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < BREAKPOINTS.mobile;
      const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
      const isDesktop = width >= BREAKPOINTS.tablet;
      const orientation = width > height ? 'landscape' : 'portrait';
      
      // 모션 감소 선호도 감지 (접근성)
      const preferReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const deviceType: ViewportInfo['deviceType'] = 
        isMobile ? 'mobile' : 
        isTablet ? 'tablet' : 
        'desktop';

      setViewportInfo({
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        deviceType,
        orientation,
        preferReducedMotion,
      });
    };

    // 초기 설정
    updateViewportInfo();

    // 리사이즈 이벤트 리스너
    const handleResize = () => {
      // 디바운스로 성능 최적화 (종목 페이지 방식)
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateViewportInfo, 100);
    };

    let resizeTimeout: NodeJS.Timeout;
    window.addEventListener('resize', handleResize);
    
    // orientation change 감지 (모바일 최적화)
    const handleOrientationChange = () => {
      // 방향 전환 후 약간의 지연을 두고 업데이트
      setTimeout(updateViewportInfo, 250);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // 🎨 기기별 애니메이션 설정 (종목 페이지 방식)
  const shouldAnimate = useMemo(() => {
    if (viewportInfo.preferReducedMotion) return false;
    
    return config.animation[viewportInfo.deviceType];
  }, [viewportInfo.deviceType, viewportInfo.preferReducedMotion, config.animation]);

  // ⚡ 기기별 로딩 전략
  const loadingStrategy = useMemo(() => {
    return config.loadingStrategy[viewportInfo.deviceType];
  }, [viewportInfo.deviceType, config.loadingStrategy]);

  // 📱 기기별 콘텐츠 밀도
  const contentDensity = useMemo(() => {
    return config.contentDensity[viewportInfo.deviceType];
  }, [viewportInfo.deviceType, config.contentDensity]);

  // 🎯 메인 페이지 특화 설정
  const mainPageConfig = useMemo(() => {
    const { deviceType, isMobile, isTablet } = viewportInfo;
    
    return {
      // Hero 섹션 설정
      hero: {
        titleSize: isMobile ? 'text-3xl' : isTablet ? 'text-4xl' : 'text-5xl',
        buttonLayout: isMobile ? 'flex-col' : 'flex-row',
        buttonSize: isMobile ? 'sm' : 'lg',
        animationDelay: shouldAnimate ? 0 : 300, // 애니메이션 없으면 즉시 표시
      },
      
      // 오늘의 메르 말씀 설정
      todayQuote: {
        format: isMobile ? 'compact' : 'full', // 모바일은 1-2줄, 데스크톱은 풀 버전
        backgroundGradient: !isMobile, // 모바일에서는 그래디언트 제거 (성능)
        animationType: shouldAnimate ? 'scaleIn' : 'fadeIn',
      },
      
      // 메르's Pick 설정
      merryPicks: {
        cardLayout: isMobile ? 'single-scroll' : isTablet ? 'dual-grid' : 'grid-5',
        cardSize: contentDensity === 'compact' ? 'sm' : 'md',
        showDescription: !isMobile, // 모바일에서는 회사 소개 숨김
        animationType: shouldAnimate ? 'staggered' : 'simple',
      },
      
      // 메인 콘텐츠 (탭) 설정
      mainContent: {
        tabStyle: isMobile ? 'accordion' : 'tabs', // 모바일은 아코디언 스타일
        defaultTab: 'profile',
        animateTabChange: shouldAnimate,
      },
      
      // 하단 카드 설정
      bottomCards: {
        layout: isMobile ? 'vertical-stack' : 'horizontal-grid',
        cardSpacing: contentDensity === 'compact' ? 'gap-2' : 'gap-4',
        showIcons: !isMobile || isTablet, // 모바일에서는 아이콘 최소화
      },
    };
  }, [viewportInfo, shouldAnimate, contentDensity]);

  // 📊 성능 최적화 설정
  const performanceConfig = useMemo(() => {
    const { deviceType } = viewportInfo;
    
    return {
      // 이미지 로딩 설정
      imageOptimization: {
        quality: deviceType === 'mobile' ? 75 : deviceType === 'tablet' ? 85 : 95,
        format: 'webp',
        sizes: deviceType === 'mobile' ? '(max-width: 768px) 100vw' : 
               deviceType === 'tablet' ? '(max-width: 1024px) 100vw' : '100vw',
      },
      
      // 로딩 우선순위
      loadingPriority: {
        hero: 'high',
        todayQuote: deviceType === 'mobile' ? 'low' : 'high',
        merryPicks: 'high',
        mainContent: deviceType === 'mobile' ? 'low' : 'medium',
        bottomCards: 'low',
      },
      
      // 캐시 전략
      cacheStrategy: {
        aggressive: deviceType === 'mobile', // 모바일에서는 적극적 캐싱
        staleWhileRevalidate: true,
        prefetchNextSection: deviceType !== 'mobile', // 데스크톱에서만 프리페치
      },
    };
  }, [viewportInfo.deviceType]);

  return {
    // 기본 뷰포트 정보
    ...viewportInfo,
    
    // 설정
    shouldAnimate,
    loadingStrategy,
    contentDensity,
    
    // 메인 페이지 특화 설정
    mainPageConfig,
    performanceConfig,
    
    // 유틸리티 함수들
    isPortrait: viewportInfo.orientation === 'portrait',
    isLandscape: viewportInfo.orientation === 'landscape',
    
    // CSS 클래스 헬퍼
    getResponsiveClass: (classes: {
      mobile?: string;
      tablet?: string;
      desktop?: string;
    }) => {
      if (viewportInfo.isMobile && classes.mobile) return classes.mobile;
      if (viewportInfo.isTablet && classes.tablet) return classes.tablet;
      if (viewportInfo.isDesktop && classes.desktop) return classes.desktop;
      return '';
    },
    
    // 디버깅용 정보
    debug: {
      deviceType: viewportInfo.deviceType,
      shouldAnimate,
      loadingStrategy,
      contentDensity,
      cacheStrategy: performanceConfig.cacheStrategy,
    },
  };
}

// 성능 최적화를 위한 HOC  
export function withResponsive<P extends object>(
  Component: React.ComponentType<P & { responsive?: any }>,
  config?: Partial<ResponsiveConfig>
) {
  return function ResponsiveComponent(props: P) {
    const responsive = useResponsive(config);
    
    // JSX 구문 오류 방지를 위해 React.createElement 사용
    return React.createElement(Component, { ...props, responsive });
  };
}