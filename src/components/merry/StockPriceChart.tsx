'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, ReferenceDot } from 'recharts';
import { TrendingUp, TrendingDown, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';

// 🎨 토스 스타일 디자인 시스템
const tossColors = {
  // 메인 차트 색상 (토스 브랜드 컬러)
  positive: '#ff4757',      // 상승 (토스 레드)
  negative: '#3742fa',      // 하락 (토스 블루)  
  neutral: '#747d8c',       // 중립/보합
  
  // 배경 및 그리드
  background: '#ffffff',
  surface: '#f8f9fa',
  gridLine: '#f1f2f6',
  gridMajor: '#e9ecef',
  
  // 다크 모드 색상
  dark: {
    background: '#0f0f0f',
    surface: '#1a1a1a',
    gridLine: '#333333',     // 옅은 회색 점선
    gridMajor: '#444444',
    primary: '#ffffff',      // 종목명 텍스트 (흰색)
    secondary: '#d1d5db',
    muted: '#9ca3af',
  },
  
  // 텍스트
  primary: '#2f3640',
  secondary: '#747d8c', 
  muted: '#a4b0be',
  
  // 액센트 및 상태
  accent: '#5352ed',        // 토스 보라
  success: '#2ed573',       // 성공
  warning: '#ffa502',       // 경고
  
  // 감정 분석 마커 (다크모드 대응)
  sentiment: {
    positive: '#16a34a',
    negative: '#dc2626', 
    neutral: '#6b7280'  // 중립적인 감정은 회색 (다크모드에서도 잘 보임)
  }
} as const;

interface PricePoint {
  date: string;
  price: number;
  postTitle?: string;
  postId?: number;
  isCurrentPrice?: boolean;
  isActualData?: boolean; // 🆕 실제 데이터인지 보완된 데이터인지 구분
  missingDataNote?: string; // 🆕 데이터 누락 메모
  sentiments?: {
    sentiment: string;
    score: number;
    keywords?: any;
    context?: string;
    reasoning?: string;
    supporting_evidence?: string[];
    investment_perspective?: string[];
    context_quotes?: string[];
    investment_timeframe?: string;
    conviction_level?: string;
    analysis_focus?: string;
    uncertainty_factors?: string[];
    data_source?: string;
  }[];
}

interface PriceDataResponse {
  prices: PricePoint[];
  dataQuality: {
    totalDays: number;
    actualDataDays: number;
    missingDataDays: number;
    hasCurrentDayData: boolean;
    lastActualDate: string;
  };
}

interface StockPriceChartProps {
  ticker: string;
  timeRange: '1M' | '3M' | '6M' | '1Y';
  onTimeRangeChange: (range: '1M' | '3M' | '6M' | '1Y') => void;
  stockName?: string; // 종목 이름 추가
  description?: string; // 회사 설명 추가
  stock?: any; // stock 정보 전체 추가
}

// 🚀 ULTRA: 메모이제이션된 차트 컴포넌트
export default memo(function StockPriceChart({ 
  ticker, 
  timeRange, 
  onTimeRangeChange,
  stockName,
  description,
  stock
}: StockPriceChartProps) {
  // CSS 애니메이션 정의 - 제자리에서 나타나는 효과 (확대 없이)
  const animationStyles = `
    @keyframes fadeInPlace {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }
  `;

  // 스타일 태그를 head에 추가
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = animationStyles;
    document.head.appendChild(styleSheet);
    
    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }, []);

  // 🚀 ULTRA: useState 최소화 및 성능 최적화
  const [priceData, setPriceData] = useState<PriceDataResponse | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [changePercent, setChangePercent] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingState, setLoadingState] = useState({
    chart: true,      // 기본 차트
    markers: true,    // 감정 마커  
    details: true     // 툴팁 세부정보
  });
  const [sentimentStats, setSentimentStats] = useState<{totalMentions: number, analyzedMentions: number} | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 🔥 가장 가까운 거래일 찾는 헬퍼 함수
  const findNearestTradingDate = (targetDate: string, priceData: any[]): string | null => {
    const target = new Date(targetDate);
    if (isNaN(target.getTime())) return null;
    
    let nearestDate = null;
    let minDiff = Infinity;
    
    priceData.forEach(point => {
      const pointDate = new Date(point.date);
      if (isNaN(pointDate.getTime())) return;
      
      const diff = Math.abs(pointDate.getTime() - target.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        nearestDate = point.date;
      }
    });
    
    return nearestDate;
  };
  
  // 🚀 UX 우선 + 성능 최적화 하이브리드 로딩
  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadingState({ chart: true, markers: true, details: true });
    
    // 🔥 즉시 이전 상태 초기화로 빠른 UI 반응
    setPriceData(null);
    setCurrentPrice(0);
    setChangePercent(0);
    setSentimentStats(null);
    
    try {
      const standardPeriod = timeRange;
      
      // 🚀 1단계: 주가 데이터 우선 로딩 (UX 최우선)
      console.log('⚡ 1단계: 주가 차트 우선 표시');
      const priceResult = await fetch(`/api/stock-price?ticker=${ticker}&period=${standardPeriod}`).then(r => r.json());
      console.log(`⚡ 1단계 완료: Stock Price - ${priceResult.success}`);
      
      if (priceResult.success && priceResult.prices && Array.isArray(priceResult.prices)) {
        // 🎯 즉시 기본 차트 렌더링 (마커 없이)
        const basicPriceData = priceResult.prices.map((point: any) => ({
          ...point,
          hasMention: false,  // 아직 로딩 중
          postTitles: [],     // 아직 로딩 중
          sentiments: []      // 아직 로딩 중
        }));
        
        setPriceData({
          prices: basicPriceData,
          dataQuality: priceResult.dataQuality || {
            totalDays: basicPriceData.length,
            actualDataDays: basicPriceData.length,
            missingDataDays: 0,
            hasCurrentDayData: true,
            lastActualDate: basicPriceData[basicPriceData.length - 1]?.date
          }
        });
        
        // 🚀 현재가 계산 (즉시 표시)
        if (basicPriceData.length >= 2) {
          // 날짜순으로 정렬된 데이터에서 최신 데이터 가져오기
          const sortedData = [...basicPriceData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const latest = sortedData[sortedData.length - 1];
          const previous = sortedData[sortedData.length - 2];
          setCurrentPrice(latest.price);
          setChangePercent(((latest.price - previous.price) / previous.price) * 100);
        }
        
        // 🔑 기본 차트는 이제 사용 가능!
        setLoadingState(prev => ({ ...prev, chart: false }));
        setLoading(false); // 사용자는 이미 차트를 볼 수 있음
        
        // 🚀 2단계: 부가 정보 병렬 로딩 (성능 최적화)
        console.log('⚡ 2단계: 부가 정보 병렬 로딩');
        const [sentimentResult, postsResult] = await Promise.all([
          fetch(`/api/merry/stocks/${ticker}/sentiments?period=${standardPeriod}`).then(r => r.json()),
          fetch(`/api/merry/stocks/${ticker}/posts?limit=100&offset=0&period=${standardPeriod}`).then(r => r.json())
        ]);
        console.log(`⚡ 2단계 완료: 병렬 로딩 - Sentiments: ${!!sentimentResult.success}, Posts: ${postsResult.success}`);
        
        // 감정 분석 통계 설정 (새로운 API 구조 반영)
        const sentimentData = sentimentResult.success ? sentimentResult.data : sentimentResult;
        setSentimentStats({
          totalMentions: sentimentData?.totalMentions || 0,
          analyzedMentions: sentimentData?.summary?.total || 0
        });
        
        // 🎨 3단계: 마커와 툴팁 정보 점진적 추가 (가장 가까운 거래일 매핑 포함)
        const postsByDate = Object.create(null);
        const postsByTradingDate = Object.create(null); // 🔥 거래일 기준 매핑 추가
        
        if (postsResult.success && postsResult.data?.posts) {
          postsResult.data.posts.forEach((post: any) => {
            const postDate = post.created_date || post.mentioned_date;
            let dateKey;
            if (postDate.includes('T')) {
              dateKey = postDate.split('T')[0];
            } else if (postDate.includes(' ')) {
              dateKey = postDate.split(' ')[0];
            } else {
              dateKey = postDate;
            }
            
            // 원래 날짜로 저장
            (postsByDate[dateKey] = postsByDate[dateKey] || []).push(post);
            
            // 🔥 가장 가까운 거래일 찾기
            const nearestTradingDate = findNearestTradingDate(dateKey, basicPriceData);
            if (nearestTradingDate) {
              (postsByTradingDate[nearestTradingDate] = postsByTradingDate[nearestTradingDate] || []).push({
                ...post,
                originalDate: dateKey, // 원래 포스트 날짜 보존
                mappedToTradingDate: nearestTradingDate
              });
            }
          });
        }
        
        // 🔥 enriched 데이터로 차트 업데이트 (마커 추가)
        console.log('🚨 데이터 통합 시작:', {
          pricePoints: basicPriceData.length,
          postsByDateKeys: Object.keys(postsByDate),
          sentimentKeys: Object.keys(sentimentData?.sentimentByDate || {})
        });
        
        const enrichedData = basicPriceData.map((point: any) => {
          const dateStr = point.date;
          const normalizedDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
          
          // 1. 원래 날짜 기준 데이터
          const originalPostsData = postsByDate[normalizedDate] || [];
          
          // 2. 🔥 거래일 매핑 기준 데이터 (주말/공휴일 포스트 포함)
          const tradingDatePostsData = postsByTradingDate[normalizedDate] || [];
          
          // 3. 모든 포스트 데이터 통합 (원본 + 매핑된 것)
          const allPostsData = [...originalPostsData, ...tradingDatePostsData];
          
          // 4. sentiments 데이터 (색상 변경용) - 새로운 API 구조 반영
          const daysentimentData = sentimentData?.sentimentByDate?.[normalizedDate];
          const sentiments = daysentimentData?.sentiments?.map((sentiment: any) => ({
            ...sentiment,
            postTitle: daysentimentData?.posts?.[0]?.title || ''
          })) || [];
          
          const hasAnyData = allPostsData.length > 0 || sentiments.length > 0;
          if (hasAnyData) {
            console.log(`📍 마커 데이터 발견: ${normalizedDate} - 원본: ${originalPostsData.length}, 매핑: ${tradingDatePostsData.length}, sentiments: ${sentiments.length}`);
          }
          
          return {
            ...point,
            hasMention: allPostsData.length > 0, // 🔥 원본 + 매핑된 포스트 모두 포함
            postTitles: allPostsData.map((post: any) => post.title).filter(Boolean),
            originalPosts: originalPostsData, // 디버깅용
            mappedPosts: tradingDatePostsData, // 디버깅용
            sentiments: sentiments
          };
        });
        
        // 🎯 점진적 업데이트
        setPriceData(prev => ({
          ...prev!,
          prices: enrichedData
        }));
        setLoadingState(prev => ({ ...prev, markers: false }));
        
        // 🔥 마커 표시 활성화
        setShowMarkers(true);
        const markersWithData = enrichedData.filter((point: any) => 
          point.hasMention || point.sentiments?.length > 0
        );
        
        console.log(`🎯 마커 활성화 완료:`, {
          totalPoints: enrichedData.length,
          markersWithData: markersWithData.length,
          markerDates: markersWithData.map(p => p.date),
          showMarkers: true
        });
        
        // ✅ 주말/공휴일 포스트 매핑 완료: 5개 마커 모두 표시 가능
        
        // ✅ 마커 시스템 완료: Line dot 방식으로 차트에 마커 표시
        
        setVisibleMarkerCount(markersWithData.length);
        setLoadingState(prev => ({ ...prev, details: false }));
        
        console.log('🎯 점진적 로딩 완료 - 차트: ✅, 마커: ✅, 세부정보: ✅');
      }
    } catch (error) {
      console.error('Data fetch error:', error);
      // 에러 시 빈 데이터 구조 설정
      setPriceData({
        prices: [],
        dataQuality: {
          totalDays: 0,
          actualDataDays: 0,
          missingDataDays: 0,
          hasCurrentDayData: false,
          lastActualDate: ''
        }
      });
    } finally {
      setLoading(false);
    }
  }, [ticker, timeRange]);
  
  // 🚀 ULTRA: useEffect 최적화
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 다크 모드 감지
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    
    // 다크모드 변경 감지
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);
  
  // 줌 상태 (토스 스타일 줌 기능)
  const [zoomDomain, setZoomDomain] = useState<{start?: string, end?: string}>({});
  const [isZooming, setIsZooming] = useState(false);
  const [zoomArea, setZoomArea] = useState<{start?: string, end?: string}>({});
  
  // 모바일 터치 상태 (핀치 제스처 지원)
  const [touchState, setTouchState] = useState<{
    startX?: number;
    startY?: number;
    isTouch: boolean;
    touchStartTime?: number;
    initialDistance?: number;
    isPinching: boolean;
  }>({ isTouch: false, isPinching: false });
  
  // 모바일 감지
  const [isMobile, setIsMobile] = useState(false);
  
  // 애니메이션 상태
  const [showMarkers, setShowMarkers] = useState(false);
  const [visibleMarkerCount, setVisibleMarkerCount] = useState(0);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 640);
      
      const handleResize = () => {
        setIsMobile(window.innerWidth < 640);
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
    return () => {}; // Cleanup function for SSR case
  }, []);

  // 차트 색상 결정 - 토스 블루로 통일
  const chartColor = useMemo(() => {
    return tossColors.negative; // 토스 블루로 통일
  }, []);

  // 줌 기능 제거 - priceData를 직접 사용
  // 🆕 데이터를 날짜 순으로 정렬 (오래된 날짜 → 최신 날짜)
  const filteredData = useMemo(() => {
    if (!priceData?.prices || !Array.isArray(priceData.prices)) return [];
    
    return [...priceData.prices].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime(); // 오래된 날짜가 먼저 오도록 정렬
    });
  }, [priceData]);

  // 🚀 ULTRA: 메모이제이션된 툴팁 컴포넌트
  const TossTooltip = memo(({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-3 sm:p-4 shadow-2xl max-w-xs sm:max-w-sm text-sm sm:text-base">
        {/* 날짜 */}
        <div className="text-xs font-medium text-gray-500 mb-2">
          {new Date(data.date).toLocaleDateString('ko-KR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'short' 
          })}
        </div>
        
        {/* 가격 정보 */}
        <div className="mb-3">
          <div className="text-lg sm:text-xl font-bold" style={{ color: chartColor }}>
            ${data.price.toLocaleString()}
          </div>
        </div>
        

        {/* 📝 포스트 & 감정 분석 번갈아가며 표시 */}
        {data.sentiments?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-700 mb-2">📝 메르 언급 포스트</p>
            <div className="space-y-1">
              {data.sentiments?.slice(0, 2).map((sentiment: any, index: number) => {
                const sentimentColor = sentiment?.sentiment === 'positive' 
                  ? '#16a34a' : sentiment?.sentiment === 'negative' 
                  ? '#dc2626' : '#6b7280';
                
                const sentimentIcon = sentiment?.sentiment === 'positive' ? '😊' 
                  : sentiment?.sentiment === 'negative' ? '😞' : '😐';
                
                const sentimentLabel = sentiment?.sentiment === 'positive' ? '긍정' 
                  : sentiment?.sentiment === 'negative' ? '부정' : '중립';
                
                return (
                  <div key={`sentiment-${index}`}>
                    {/* 포스트 타이틀 */}
                    {sentiment.postTitle && (
                      <div key={`post-title-${index}`} className="text-xs p-2 bg-blue-50 rounded-lg border-l-2 border-blue-400 mb-1">
                        <div className="font-medium text-blue-800 line-clamp-2">
                          {sentiment.postTitle}
                        </div>
                      </div>
                    )}
                    
                    {/* 해당 포스트의 감정 분석 */}
                    <div key={`sentiment-analysis-${index}`} className="text-xs p-2 bg-gray-50 rounded-lg border-l-2 mb-2" style={{borderLeftColor: sentimentColor}}>
                      <div className="flex items-center gap-1 mb-1">
                        <span style={{ color: sentimentColor }} className="font-medium text-xs">
                          {sentimentIcon} {sentimentLabel}
                        </span>
                        {sentiment.score && (
                          <span className="text-xs text-gray-500">
                            ({sentiment.score > 0 ? '+' : ''}{(sentiment.score * 100).toFixed(0)}%)
                          </span>
                        )}
                      </div>
                      {sentiment.reasoning && (
                        <div className="text-gray-700 text-xs leading-relaxed">
                          {sentiment.reasoning.length > 80 
                            ? `${sentiment.reasoning.substring(0, 80)}...` 
                            : sentiment.reasoning}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {data.sentiments?.length > 2 && (
              <div className="text-xs text-gray-500 mt-2">
                +{data.sentiments.length - 2}개 포스트 더 있음
              </div>
            )}
          </div>
        )}
      </div>
    );
  });

  // 토스 스타일 줌 이벤트 핸들러
  const handleZoomIn = useCallback(() => {
    if (filteredData.length === 0) return;
    
    const totalDays = filteredData.length;
    const currentRange = zoomDomain.start && zoomDomain.end ? 
      Math.floor((new Date(zoomDomain.end).getTime() - new Date(zoomDomain.start).getTime()) / (1000 * 60 * 60 * 24)) :
      totalDays;
    
    const newRange = Math.max(7, Math.floor(currentRange * 0.7)); // 30% 줌인, 최소 7일
    const centerIndex = zoomDomain.start && zoomDomain.end ?
      Math.floor(filteredData.findIndex(d => d.date === zoomDomain.start) + (filteredData.findIndex(d => d.date === zoomDomain.end) - filteredData.findIndex(d => d.date === zoomDomain.start)) / 2) :
      Math.floor(totalDays * 0.8); // 기본적으로 최근쪽 중심
    
    const startIndex = Math.max(0, centerIndex - Math.floor(newRange / 2));
    const endIndex = Math.min(totalDays - 1, startIndex + newRange);
    
    setZoomDomain({
      start: filteredData[startIndex].date,
      end: filteredData[endIndex].date
    });
  }, [filteredData, zoomDomain]);

  const handleZoomOut = useCallback(() => {
    if (filteredData.length === 0) return;
    
    const totalDays = filteredData.length;
    const currentRange = zoomDomain.start && zoomDomain.end ? 
      Math.floor((new Date(zoomDomain.end).getTime() - new Date(zoomDomain.start).getTime()) / (1000 * 60 * 60 * 24)) :
      totalDays;
    
    const newRange = Math.min(totalDays, Math.floor(currentRange * 1.5)); // 50% 줌아웃
    
    if (newRange >= totalDays * 0.95) {
      // 거의 전체면 완전히 리셋
      setZoomDomain({});
      return;
    }
    
    const centerIndex = zoomDomain.start && zoomDomain.end ?
      Math.floor(filteredData.findIndex(d => d.date === zoomDomain.start) + (filteredData.findIndex(d => d.date === zoomDomain.end) - filteredData.findIndex(d => d.date === zoomDomain.start)) / 2) :
      Math.floor(totalDays * 0.8);
    
    const startIndex = Math.max(0, centerIndex - Math.floor(newRange / 2));
    const endIndex = Math.min(totalDays - 1, startIndex + newRange);
    
    setZoomDomain({
      start: filteredData[startIndex].date,
      end: filteredData[endIndex].date
    });
  }, [filteredData, zoomDomain]);

  const handleZoomReset = useCallback(() => {
    setZoomDomain({});
  }, []);
  
  // 두 점 간의 거리 계산 함수
  const getDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 마우스 휠 줌 핸들러
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.deltaY < 0) {
      // 휠 업 = 줌인
      handleZoomIn();
    } else {
      // 휠 다운 = 줌아웃
      handleZoomOut();
    }
  };

  // 모바일 터치 이벤트 핸들러 (핀치 줌 지원)
  const handleTouchStart = (e: React.TouchEvent) => {
    console.log('터치 시작:', e.touches.length, '개 터치');
    
    if (e.touches.length === 1) {
      // 단일 터치 - 기본 터치 상태 설정
      const touch = e.touches[0];
      setTouchState({
        startX: touch.clientX,
        startY: touch.clientY,
        isTouch: true,
        touchStartTime: Date.now(),
        isPinching: false
      });
    } else if (e.touches.length === 2) {
      // 두 손가락 터치 - 핀치 제스처 시작
      const distance = getDistance(e.touches);
      console.log('핀치 제스처 시작:', distance);
      setTouchState({
        isTouch: true,
        isPinching: true,
        initialDistance: distance,
        touchStartTime: Date.now()
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchState.isPinching && touchState.initialDistance) {
      // 핀치 제스처 처리
      e.preventDefault(); // 기본 스크롤 방지
      
      const currentDistance = getDistance(e.touches);
      const scaleChange = currentDistance / touchState.initialDistance;
      
      console.log('핀치 제스처 감지:', { currentDistance, initialDistance: touchState.initialDistance, scaleChange });
      
      if (scaleChange > 1.05) {
        // 손가락을 벌림 = 줌인 (민감도 낮춤)
        console.log('줌인 실행');
        handleZoomIn();
        setTouchState(prev => ({ ...prev, initialDistance: currentDistance }));
      } else if (scaleChange < 0.95) {
        // 손가락을 모음 = 줌아웃 (민감도 낮춤)
        console.log('줌아웃 실행');
        handleZoomOut();
        setTouchState(prev => ({ ...prev, initialDistance: currentDistance }));
      }
    }
    // 단일 터치는 자연스럽게 툴팁 동작 허용
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // 터치 종료 시 상태 리셋
    setTouchState({ isTouch: false, isPinching: false });
  };

  // 줌 리셋 제거

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-0">
          {/* 헤더 스켈레톤 */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="flex items-center gap-3">
                <div className="h-8 bg-gray-200 rounded w-24"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
          
          {/* 차트 스켈레톤 */}
          <div className="px-4 sm:px-6 py-4 sm:py-6">
            <div className="animate-pulse">
              <div className="h-48 sm:h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
          
          {/* 버튼 스켈레톤 */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="flex justify-center">
              <div className="flex bg-gray-50 rounded-xl p-1 gap-0.5 sm:gap-1">
                {['1M', '3M', '6M', '1Y'].map(period => (
                  <div key={`skeleton-${period}`} className="h-10 bg-gray-200 rounded-lg w-12 sm:w-16"></div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        {/* 토스 스타일 헤더 (모바일 최적화) */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className={`text-base sm:text-lg font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>{stockName || ticker}</h2>
              
              
              
              <div className="flex items-center gap-2 sm:gap-3 mt-1">
                <span className="text-xl sm:text-2xl font-bold" style={{ color: chartColor }}>
                  ${currentPrice.toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                  {changePercent >= 0 ? (
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: chartColor }} />
                  ) : (
                    <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: chartColor }} />
                  )}
                  <span 
                    className="text-xs sm:text-sm font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg"
                    style={{ 
                      color: chartColor,
                      backgroundColor: `${chartColor}15`
                    }}
                  >
                    {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
              
              {/* 언급 통계 정보 */}
              {stock && stock.mention_count > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">
                    언급 {stock.mention_count}개 · 분석 {stock.analyzed_count || 0}개
                  </p>
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* 로딩 진행 상황 및 감정 분석 설명 */}
        <div className="px-4 sm:px-6 py-2 border-b border-gray-100">
          {/* 로딩 진행 상황 표시 */}
          {(loadingState.chart || loadingState.markers || loadingState.details) && (
            <div className="text-center mb-2">
              <div className="inline-flex items-center gap-2 text-xs text-gray-500">
                <span className={loadingState.chart ? 'text-blue-600' : 'text-green-600'}>
                  {loadingState.chart ? '📊 차트 로딩 중...' : '✅ 차트 완료'}
                </span>
                <span>→</span>
                <span className={loadingState.markers ? 'text-blue-600' : 'text-green-600'}>
                  {loadingState.markers ? '🎯 감정 분석 중...' : '✅ 마커 완료'}
                </span>
                <span>→</span>
                <span className={loadingState.details ? 'text-blue-600' : 'text-green-600'}>
                  {loadingState.details ? '📝 세부정보 로딩 중...' : '✅ 모든 기능 완료'}
                </span>
              </div>
            </div>
          )}
          
          {/* 감정 분석 범례 및 데이터 품질 정보 (로딩 완료 후 표시) */}
          {!loadingState.chart && (
            <div className="text-center space-y-2" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
              {/* 감정 분석 범례 - 다크모드 대응 */}
              <div className={`inline-flex items-center justify-center gap-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: isDarkMode ? '#22c55e' : '#16a34a' }}></div>
                  <span className="text-xs">긍정</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: isDarkMode ? '#ef4444' : '#dc2626' }}></div>
                  <span className="text-xs">부정</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: isDarkMode ? '#9ca3af' : '#6b7280' }}></div>
                  <span className="text-xs">중립</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: isDarkMode ? '#60a5fa' : '#2563eb' }}></div>
                  <span className="text-xs">메르 언급</span>
                </div>
              </div>
              
              {/* 🆕 토스 스타일 데이터 품질 정보 표시 */}
              {priceData && priceData.dataQuality && (
                <div className="text-xs text-gray-500 flex items-center justify-center gap-4">
                  <span>📊 거래일 {priceData.dataQuality.totalDays}일</span>
                  <span>✅ 실제 종가 데이터</span>
                  {priceData.dataQuality.lastActualDate && (
                    <span>📅 최신 {priceData.dataQuality.lastActualDate}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 토스 스타일 차트 영역 - 조건부 렌더링으로 범례 문제 완전 해결 */}
        <div 
          className="relative h-64 sm:h-80 p-2 sm:p-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{ 
            touchAction: 'manipulation' // 핀치 줌 허용
          }}
        >
          {/* 줌 리셋 버튼만 유지 (필요시만 표시) */}
          {(zoomDomain.start || zoomDomain.end) && (
            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomReset}
                className="w-8 h-8 p-0 bg-white/90 hover:bg-white border-gray-200 shadow-sm"
                disabled={loading}
                title="전체 보기로 돌아가기"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>
          )}
          {/* 🔥 CRITICAL FIX: 데이터 로딩 완료 후에만 차트 렌더링 */}
          {filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={filteredData}
                margin={{ top: 5, right: 40, left: 5, bottom: 5 }}
                legend={false}
                layout="horizontal"
                className="recharts-no-legend"
              >
              {/* 최소한의 그리드 (토스 스타일 - 다크모드 대응) */}
              <CartesianGrid 
                strokeDasharray={isDarkMode ? "2 4" : "none"}
                stroke={isDarkMode ? tossColors.dark.gridLine : tossColors.gridLine}
                strokeOpacity={isDarkMode ? 0.4 : 0.8}
                vertical={false}
                strokeWidth={1}
              />
              
              {/* X축 - 토스 스타일: 거래일만 연속 표시 */}
              <XAxis 
                dataKey="date"
                axisLine={false}
                tickLine={false}
                domain={zoomDomain.start && zoomDomain.end ? [zoomDomain.start, zoomDomain.end] : ['dataMin', 'dataMax']}
                tick={({ x, y, payload, index }: any) => {
                  const date = new Date(payload.value);
                  let text = '';
                  let isSpecial = false;
                  let shouldShow = true;
                  
                  // 토스 스타일: 거래일 인덱스 기반 표시
                  const totalDataPoints = filteredData.length;
                  
                  if (timeRange === '1Y') {
                    // 1년: 약 250 거래일 → 매월 1회 표시 (약 20일 간격)
                    const interval = Math.floor(totalDataPoints / 12);
                    shouldShow = index % interval === 0 || index === 0;
                    
                    if (shouldShow) {
                      const month = date.getMonth() + 1;
                      const year = date.getFullYear();
                      if (month === 1) {
                        text = `${year}년`;
                        isSpecial = true;
                      } else {
                        text = `${month}월`;
                      }
                    }
                  } else if (timeRange === '6M') {
                    // 6개월: 약 125 거래일 → 2주 간격 표시 (약 10일 간격)
                    const interval = Math.floor(totalDataPoints / 12);
                    shouldShow = index % interval === 0 || index === 0;
                    
                    if (shouldShow) {
                      const month = date.getMonth() + 1;
                      const day = date.getDate();
                      text = `${month}/${day}`;
                    }
                  } else if (timeRange === '3M') {
                    // 3개월: 약 63 거래일 → 주 1회 표시 (약 5일 간격)
                    const interval = Math.max(Math.floor(totalDataPoints / 12), 5);
                    shouldShow = index % interval === 0 || index === 0;
                    
                    if (shouldShow) {
                      const month = date.getMonth() + 1;
                      const day = date.getDate();
                      text = `${month}/${day}`;
                    }
                  } else {
                    // 1개월: 약 21 거래일 → 3-4일 간격 표시
                    const interval = Math.max(Math.floor(totalDataPoints / 7), 3);
                    shouldShow = index % interval === 0 || index === 0;
                    
                    if (shouldShow) {
                      const month = date.getMonth() + 1;
                      const day = date.getDate();
                      text = `${month}/${day}`;
                    }
                  }
                  
                  // 중복 방지: 이전에 같은 텍스트가 표시된 경우 건너뛰기
                  if (shouldShow && index > 0) {
                    for (let i = index - 1; i >= Math.max(0, index - 5); i--) {
                      const prevDate = new Date(filteredData[i]?.date || '');
                      const prevMonth = prevDate.getMonth() + 1;
                      const prevYear = prevDate.getFullYear();
                      let prevText = '';
                      
                      if (timeRange === '1Y') {
                        if (prevMonth === 1) {
                          prevText = `${prevYear}년`;
                        } else {
                          prevText = `${prevMonth}월`;
                        }
                      } else {
                        const prevDay = prevDate.getDate();
                        prevText = `${prevMonth}/${prevDay}`;
                      }
                      
                      if (prevText === text) {
                        shouldShow = false;
                        break;
                      }
                    }
                  }
                  
                  if (!shouldShow) {
                    return <g></g>;
                  }
                  
                  return (
                    <text 
                      x={x} 
                      y={y} 
                      dy={16} 
                      textAnchor="middle" 
                      fill={isDarkMode ? tossColors.dark.muted : tossColors.muted}
                      fontSize={isMobile ? 9 : 11}
                      fontWeight={isSpecial ? 'bold' : 500}
                    >
                      {text}
                    </text>
                  );
                }}
                interval={0}
                tickCount={timeRange === '1Y' ? 13 : timeRange === '6M' ? 7 : 3}
              />
              
              {/* Y축 */}
              <YAxis 
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fontSize: isMobile ? 9 : 11, 
                  fill: isDarkMode ? tossColors.dark.muted : tossColors.muted,
                  fontWeight: 500
                }}
                tickCount={isMobile ? 4 : 6}
                tickFormatter={(value) => {
                  if (value >= 1000) {
                    return isMobile ? `$${(value / 1000).toFixed(0)}K` : `$${(value / 1000).toFixed(1)}K`;
                  } else {
                    return isMobile ? `$${Math.round(value)}` : `$${value.toFixed(0)}`;
                  }
                }}
                domain={['dataMin * 0.98', 'dataMax * 1.02']}
                width={isMobile ? 50 : 65}
              />
              
              {/* 메인 라인 (토스 스타일 - 애니메이션 제거) */}
              <Line
                key="main-price-line"
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={2.5}
                connectNulls={false}
                dot={(props: any) => {
                  // 🔥 마커가 있는 점에만 dot 표시
                  const point = filteredData[props.index];
                  if (!point || !showMarkers) return null;
                  
                  const hasMerryMention = point.hasMention;
                  const hasSentiments = point.sentiments && point.sentiments.length > 0;
                  
                  if (!hasMerryMention && !hasSentiments) {
                    return null; // 마커 없음
                  }
                  
                  // 색상 결정 (감정 분석 우선, 없으면 파란색)
                  let markerColor = isDarkMode ? '#60a5fa' : '#2563eb'; // 기본: 파란색 (메르 언급)
                  let strokeWidth = 2;
                  
                  if (hasSentiments) {
                    strokeWidth = 3; // 감정 분석 있으면 더 두껍게
                    
                    // 감정별 개수 집계
                    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
                    point.sentiments?.forEach((sentiment: any) => {
                      if (sentiment.sentiment in sentimentCounts) {
                        sentimentCounts[sentiment.sentiment as keyof typeof sentimentCounts]++;
                      }
                    });
                    
                    // 가장 많은 감정으로 색상 결정
                    const maxCount = Math.max(sentimentCounts.positive, sentimentCounts.negative, sentimentCounts.neutral);
                    
                    if (sentimentCounts.positive === maxCount && sentimentCounts.positive > 0) {
                      markerColor = isDarkMode ? '#22c55e' : '#16a34a'; // 초록색 (긍정)
                    } else if (sentimentCounts.negative === maxCount && sentimentCounts.negative > 0) {
                      markerColor = isDarkMode ? '#ef4444' : '#dc2626'; // 빨간색 (부정)
                    } else {
                      markerColor = isDarkMode ? '#9ca3af' : '#6b7280'; // 회색 (중립)
                    }
                  }
                  
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={isMobile ? 6 : 5}
                      fill="none"
                      stroke={markerColor}
                      strokeWidth={strokeWidth}
                    />
                  );
                }}
                legendType="none"
                activeDot={{ 
                  r: isMobile ? 8 : 7, 
                  fill: chartColor,
                  strokeWidth: 4,
                  stroke: '#ffffff'
                }}
                isAnimationActive={false}
                animationBegin={0}
                animationDuration={0}
              />
              
              {/* 🔥 ReferenceDot 방식 제거 - Line dot으로 대체함 */}
              
              <Tooltip content={<TossTooltip />} />
            </LineChart>
          </ResponsiveContainer>
          ) : (
            /* 🔥 데이터 로딩 중 차트 스켈레톤 - 범례 없는 깔끔한 로딩 상태 */
            <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                <p className="text-sm text-gray-500">아직 정보가 업데이트 되지 않았습니다. 요르님에게 문의하세요.</p>
              </div>
            </div>
          )}
        </div>

        {/* 📊 차트 범례 (stock-page-requirements.md 요구사항) - 다크모드 대응 */}
        <div className={`px-4 sm:px-6 py-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex justify-center">
            <div className="flex items-center gap-4 sm:gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: isDarkMode ? '#22c55e' : '#16a34a' }}></div>
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>긍정</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: isDarkMode ? '#ef4444' : '#dc2626' }}></div>
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>부정</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: isDarkMode ? '#9ca3af' : '#6b7280' }}></div>
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>중립</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: isDarkMode ? '#60a5fa' : '#2563eb' }}></div>
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>메르 언급</span>
              </div>
            </div>
          </div>
        </div>

        {/* 토스 스타일 기간 선택 (모바일 최적화) */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="flex justify-center">
            <div className="flex bg-gray-50 rounded-xl p-1 gap-0.5 sm:gap-1">
              {(['1M', '3M', '6M', '1Y'] as const).map((period) => (
                <button
                  key={`period-${period}`}
                  onClick={() => onTimeRangeChange(period)}
                  className={`px-3 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 min-w-[50px] ${
                    timeRange === period
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});