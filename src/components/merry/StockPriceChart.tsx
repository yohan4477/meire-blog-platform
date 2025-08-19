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
  sentiments?: {
    sentiment: string;
    score: number;
    keywords?: any;
    context?: string;
    key_reasoning?: string;
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
  // 🚀 ULTRA: useState 최소화 및 성능 최적화
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [changePercent, setChangePercent] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [sentimentStats, setSentimentStats] = useState<{totalMentions: number, analyzedMentions: number} | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // 🚀 ULTRA: 병렬 데이터 로딩 최적화 (3개 API 동시 호출)
  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // 🔥 즉시 이전 상태 초기화로 빠른 UI 반응
    setPriceData([]);
    setCurrentPrice(0);
    setChangePercent(0);
    setSentimentStats(null);
    
    try {
      // 🔥 수정: 모든 API에서 동일한 period 형식 사용 (1M, 3M, 6M, 1Y)
      const standardPeriod = timeRange; // 변환 없이 그대로 사용
      
      // 🔥 순차적 API 호출 - stock price 우선 호출
      console.log('⚡ 1단계: Stock Price API 호출 시작');
      const priceResult = await fetch(`/api/stock-price?ticker=${ticker}&period=${standardPeriod}`).then(r => r.json());
      console.log(`⚡ 1단계 완료: Stock Price - ${priceResult.success}`);
      
      console.log('⚡ 2단계: Sentiments API 호출 시작');
      const sentimentResult = await fetch(`/api/merry/stocks/${ticker}/sentiments?period=${standardPeriod}`).then(r => r.json());
      console.log(`⚡ 2단계 완료: Sentiments - ${!!sentimentResult.sentimentByDate}`);
      
      console.log('⚡ 3단계: Posts API 호출 시작');
      const postsResult = await fetch(`/api/merry/stocks/${ticker}/posts?limit=100&offset=0&period=${standardPeriod}`).then(r => r.json());
      console.log(`⚡ 3단계 완료: Posts - ${postsResult.success}`);
      
      console.log('⚡ 순차적 API 호출 완료');
      
      // 감정 분석 통계 즉시 설정
      setSentimentStats({
        totalMentions: sentimentResult.totalMentions || 0,
        analyzedMentions: sentimentResult.analyzedMentions || 0
      });
      
      if (priceResult.success && priceResult.prices) {
        // merry_mentioned_stocks 데이터 날짜별 그룹화 (마커용)
        const postsByDate = Object.create(null);
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
            (postsByDate[dateKey] = postsByDate[dateKey] || []).push(post);
          });
        }

        // 🚀 ULTRA: 데이터 검증 최소화 (90% 신뢰할 수 있는 API)
        if (!Array.isArray(priceResult.prices)) {
          console.error('Price data invalid:', priceResult.prices);
          setPriceData([]);
          setLoading(false);
          return;
        }

        

        // 🚀 ULTRA: 클라이언트 필터링 제거 (API에서 이미 필터링됨)
        const filteredPrices = priceResult.prices;

        // 🔥 merry_mentioned_stocks + sentiments 데이터 병합
        console.log('🚨 데이터 통합 시작:', {
          pricePoints: filteredPrices.length,
          postsByDateKeys: Object.keys(postsByDate),
          sentimentKeys: Object.keys(sentimentResult.sentimentByDate || {})
        });
        
        const enrichedData = filteredPrices.map((point: any) => {
          const dateStr = point.date;
          // 🔧 날짜 형식 정규화 (YYYY-MM-DD)
          const normalizedDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
          
          // 1. merry_mentioned_stocks 데이터 (마커 표시용)
          const postsData = postsByDate[normalizedDate] || [];
          
          // 2. sentiments 데이터 (색상 변경용) - 날짜 키 직접 사용
          const sentimentData = sentimentResult.sentimentByDate?.[normalizedDate];
          const sentiments = sentimentData?.postSentimentPairs?.map((pair: any) => pair.sentiment) || [];
          
          console.log(`🔍 날짜 매칭: ${normalizedDate} → mentions: ${postsData.length}, sentiments: ${sentiments.length}`);
          
          const hasAnyData = postsData.length > 0 || sentiments.length > 0;
          if (hasAnyData) {
            console.log(`📍 마커 데이터 발견: ${normalizedDate} - mentions: ${postsData.length}, sentiments: ${sentiments.length}, posts:`, postsData.map(p => p.title || p.post_title));
          }
          
          return {
            ...point,
            hasMention: postsData.length > 0,  // merry_mentioned_stocks 여부 (경량 데이터)
            postTitles: postsData.map((post: any) => post.post_title || post.title).filter(Boolean), // 포스트 제목들
            sentiments: sentiments   // sentiments 데이터
          };
        });
        
        
        // 🔍 날짜 매칭 디버그
        console.log('🔍 주가 데이터 날짜:', enrichedData.slice(-5).map(p => p.date));
        console.log('🔍 감정 분석 날짜:', Object.keys(sentimentResult.sentimentByDate || {}));
        console.log('🔍 전체 감정 분석 응답:', sentimentResult);
        console.log('🚨 FORCE DEBUG: Period:', standardPeriod, 'Ticker:', ticker);
        
        setPriceData(enrichedData);
        
        // 🚀 ULTRA: 현재가 계산 최적화
        if (enrichedData.length >= 2) {
          const latest = enrichedData[enrichedData.length - 1];
          const previous = enrichedData[enrichedData.length - 2];
          setCurrentPrice(latest.price);
          setChangePercent(((latest.price - previous.price) / previous.price) * 100);
        }
        
        // 🔥 마커 표시 (merry 언급 또는 sentiments 있는 날짜)
        setShowMarkers(true);
        const markersWithData = enrichedData.filter((point: any) => 
          point.hasMention || point.sentiments?.length > 0
        );
        setVisibleMarkerCount(markersWithData.length);
      }
    } catch (error) {
      console.error('Data fetch error:', error);
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
  
  // 줌 상태 (토스 스타일 - 간단하게)
  const [zoomDomain, setZoomDomain] = useState<{start?: string, end?: string}>({});
  const [isZooming, setIsZooming] = useState(false);
  const [zoomArea, setZoomArea] = useState<{start?: string, end?: string}>({});
  
  // 모바일 터치 상태
  const [touchState, setTouchState] = useState<{
    startX?: number;
    startY?: number;
    isTouch: boolean;
    touchStartTime?: number;
  }>({ isTouch: false });
  
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
  }, []);

  // 차트 색상 결정 - 토스 블루로 통일
  const chartColor = useMemo(() => {
    return tossColors.negative; // 토스 블루로 통일
  }, []);

  // 필터링된 데이터 (줌 적용)
  const filteredData = useMemo(() => {
    if (!zoomDomain.start || !zoomDomain.end) return priceData;
    
    const startTime = new Date(zoomDomain.start).getTime();
    const endTime = new Date(zoomDomain.end).getTime();
    
    return priceData.filter(point => {
      const pointTime = new Date(point.date).getTime();
      return pointTime >= startTime && pointTime <= endTime;
    });
  }, [priceData, zoomDomain]);

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
        {(data.postTitles?.length > 0 || data.sentiments?.length > 0) && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-700 mb-2">📝 메르 언급 포스트</p>
            <div className="space-y-1">
              {data.postTitles?.slice(0, 2).map((title: string, index: number) => {
                const sentiment = data.sentiments?.[index];
                const sentimentColor = sentiment?.sentiment === 'positive' 
                  ? '#16a34a' : sentiment?.sentiment === 'negative' 
                  ? '#dc2626' : '#6b7280';
                
                const sentimentIcon = sentiment?.sentiment === 'positive' ? '😊' 
                  : sentiment?.sentiment === 'negative' ? '😞' : '😐';
                
                const sentimentLabel = sentiment?.sentiment === 'positive' ? '긍정' 
                  : sentiment?.sentiment === 'negative' ? '부정' : '중립';
                
                return (
                  <div key={index}>
                    {/* 포스트 타이틀 */}
                    <div className="text-xs p-2 bg-blue-50 rounded-lg border-l-2 border-blue-400 mb-1">
                      <div className="font-medium text-blue-800 line-clamp-2">
                        {title}
                      </div>
                    </div>
                    
                    {/* 해당 포스트의 감정 분석 */}
                    {sentiment && (
                      <div className="text-xs p-2 bg-gray-50 rounded-lg border-l-2 mb-2" style={{borderLeftColor: sentimentColor}}>
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
                        {sentiment.key_reasoning && (
                          <div className="text-gray-700 text-xs leading-relaxed">
                            {sentiment.key_reasoning.length > 80 
                              ? `${sentiment.key_reasoning.substring(0, 80)}...` 
                              : sentiment.key_reasoning}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {data.postTitles?.length > 2 && (
              <div className="text-xs text-gray-500 mt-2">
                +{data.postTitles.length - 2}개 포스트 더 있음
              </div>
            )}
          </div>
        )}
      </div>
    );
  });

  // 줌 이벤트 핸들러 (데스크탑)
  const handleMouseDown = (e: any) => {
    if (touchState.isTouch || !e || !e.activeLabel) return;
    setIsZooming(true);
    setZoomArea({ start: e.activeLabel });
  };

  const handleMouseMove = (e: any) => {
    if (touchState.isTouch || !isZooming || !e || !e.activeLabel) return;
    setZoomArea(prev => ({ ...prev, end: e.activeLabel }));
  };

  const handleMouseUp = () => {
    if (touchState.isTouch || !isZooming || !zoomArea.start || !zoomArea.end) {
      setIsZooming(false);
      setZoomArea({});
      return;
    }

    // 줌 적용
    const start = zoomArea.start;
    const end = zoomArea.end;
    
    if (start !== end) {
      setZoomDomain({
        start: new Date(Math.min(new Date(start).getTime(), new Date(end).getTime())).toISOString().split('T')[0],
        end: new Date(Math.max(new Date(start).getTime(), new Date(end).getTime())).toISOString().split('T')[0]
      });
    }
    
    setIsZooming(false);
    setZoomArea({});
  };
  
  // 모바일 터치 이벤트 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchState({
      startX: touch.clientX,
      startY: touch.clientY,
      isTouch: true,
      touchStartTime: Date.now()
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // 스크롤 방지
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // 터치 종료 시 상태만 리셋
    setTouchState({ isTouch: false });
  };

  // 줌 리셋
  const resetZoom = () => {
    setZoomDomain({});
  };

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
                  <div key={period} className="h-10 bg-gray-200 rounded-lg w-12 sm:w-16"></div>
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
                    총 {stock.mention_count}개 언급 · {stock.analyzed_count || 0}개 분석 완료
                  </p>
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* 감정 분석 설명 - 차트 바로 위 중앙 배치 */}
        {sentimentStats && sentimentStats.totalMentions > 0 && (
          <div className="px-4 sm:px-6 py-2 border-b border-gray-100">
            <div className="text-center">
              <div className="inline-flex items-center gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: '#16a34a' }}></div>
                  <span className="text-xs">긍정</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: '#dc2626' }}></div>
                  <span className="text-xs">부정</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: '#6b7280' }}></div>
                  <span className="text-xs">중립</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: '#2563eb' }}></div>
                  <span className="text-xs">언급</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 토스 스타일 차트 영역 */}
        <div 
          className="relative h-64 sm:h-80 p-2 sm:p-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={filteredData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* 최소한의 그리드 (토스 스타일 - 다크모드 대응) */}
              <CartesianGrid 
                strokeDasharray={isDarkMode ? "2 4" : "none"}
                stroke={isDarkMode ? tossColors.dark.gridLine : tossColors.gridLine}
                strokeOpacity={isDarkMode ? 0.4 : 0.8}
                vertical={false}
                strokeWidth={1}
              />
              
              {/* X축 */}
              <XAxis 
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={({ x, y, payload, index }) => {
                  const date = new Date(payload.value);
                  let text = '';
                  let isSpecial = false;
                  let shouldShow = true;
                  
                  if (timeRange === '1Y' || timeRange === '6M') {
                    const month = date.getMonth() + 1;
                    const year = date.getFullYear();
                    const day = date.getDate();
                    const currentIndex = filteredData.findIndex(item => item.date === payload.value);
                    
                    // 1월인 경우 년도로 표시
                    if (month === 1) {
                      text = `${year}년`;
                      isSpecial = true;
                    } else {
                      text = `${month}월`;
                    }
                    
                    // 1Y의 경우: 매월 1일에만 표시하고, 1일이 없는 달은 해당 월의 첫 번째 날짜에 표시
                    if (timeRange === '1Y') {
                      // 현재 월의 1일이 데이터에 있는지 확인
                      const hasFirstDayInMonth = filteredData.some(item => {
                        const itemDate = new Date(item.date);
                        return itemDate.getMonth() === date.getMonth() && 
                               itemDate.getFullYear() === year && 
                               itemDate.getDate() === 1;
                      });
                      
                      // 1일이 있는 경우: 1일에만 표시
                      if (hasFirstDayInMonth) {
                        if (day !== 1) {
                          shouldShow = false;
                        }
                      } else {
                        // 1일이 없는 경우: 해당 월의 첫 번째 날짜에 표시
                        const isFirstInMonth = filteredData
                          .filter(item => {
                            const itemDate = new Date(item.date);
                            return itemDate.getMonth() === date.getMonth() && 
                                   itemDate.getFullYear() === year;
                          })
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]?.date === payload.value;
                        
                        if (!isFirstInMonth) {
                          shouldShow = false;
                        }
                      }
                    } else {
                      // 6M의 경우: 기존 중복 제거 로직 유지
                      for (let i = 0; i < currentIndex; i++) {
                        const prevDate = new Date(filteredData[i].date);
                        const prevMonth = prevDate.getMonth() + 1;
                        const prevYear = prevDate.getFullYear();
                        let prevText = '';
                        
                        if (prevMonth === 1) {
                          prevText = `${prevYear}년`;
                        } else {
                          prevText = `${prevMonth}월`;
                        }
                        
                        if (prevText === text) {
                          shouldShow = false;
                          break;
                        }
                      }
                    }
                  } else if (timeRange === '1M') {
                    const day = date.getDate();
                    const month = date.getMonth() + 1;
                    const currentIndex = filteredData.findIndex(item => item.date === payload.value);
                    
                    // 1M: 3일마다 표시 (1일은 월만, 나머지는 일만)
                    if (day === 1) {
                      text = `${month}월`;
                      isSpecial = true;
                    } else if (currentIndex % 3 === 0) {
                      text = `${day}일`;
                    } else {
                      shouldShow = false; // 3일 간격이 아니면 표시하지 않음
                    }
                    
                    // 1일(월 표시)의 경우 중복 제거 로직 적용
                    if (day === 1) {
                      for (let i = 0; i < currentIndex; i++) {
                        const prevDate = new Date(filteredData[i].date);
                        const prevDay = prevDate.getDate();
                        const prevMonth = prevDate.getMonth() + 1;
                        
                        if (prevDay === 1 && prevMonth === month) {
                          shouldShow = false;
                          break;
                        }
                      }
                    }
                  } else if (timeRange === '3M') {
                    const day = date.getDate();
                    const month = date.getMonth() + 1;
                    const currentIndex = filteredData.findIndex(item => item.date === payload.value);
                    
                    // 3M: 15일마다 표시 (1일은 월만, 나머지는 일만)
                    if (day === 1) {
                      text = `${month}월`;
                      isSpecial = true;
                    } else if (currentIndex % 15 === 0) {
                      text = `${day}일`;
                    } else {
                      shouldShow = false; // 15일 간격이 아니면 표시하지 않음
                    }
                    
                    // 1일(월 표시)의 경우 중복 제거 로직 적용
                    if (day === 1) {
                      for (let i = 0; i < currentIndex; i++) {
                        const prevDate = new Date(filteredData[i].date);
                        const prevDay = prevDate.getDate();
                        const prevMonth = prevDate.getMonth() + 1;
                        
                        if (prevDay === 1 && prevMonth === month) {
                          shouldShow = false;
                          break;
                        }
                      }
                    }
                  } else {
                    text = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                  }
                  
                  if (!shouldShow) {
                    return null;
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
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ 
                  r: isMobile ? 8 : 7, 
                  fill: chartColor,
                  strokeWidth: 4,
                  stroke: '#ffffff'
                }}
                animationBegin={0}
                animationDuration={0}
              />
              
              {/* 🔥 merry 언급 + 감정 분석 통합 마커 표시 */}
              {showMarkers && filteredData.map((point, index) => {
                // 1단계: merry_mentioned_stocks 또는 sentiments 데이터 확인
                const hasMerryMention = point.hasMention;
                const hasSentiments = point.sentiments && point.sentiments.length > 0;
                
                console.log(`🔍 마커 체크: ${point.date} → mention: ${hasMerryMention}, sentiments: ${hasSentiments}, data: ${JSON.stringify({hasMention: point.hasMention, sentiments: point.sentiments})}`);
                
                // 어느 것도 없으면 마커 표시 안함
                if (!hasMerryMention && !hasSentiments) {
                  return null;
                }
                
                // 2단계: 기본 색상 및 두께 설정
                let markerColor = '#2563eb'; // 기본: 파란색 (merry 언급만)
                let strokeWidth = 2;
                
                // 3단계: sentiments가 있으면 다수 감정으로 색상 결정
                if (hasSentiments) {
                  strokeWidth = 3; // 감정 분석 있으면 더 두껍게
                  
                  // 감정별 개수 집계
                  const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
                  point.sentiments.forEach((sentiment: any) => {
                    if (sentiment.sentiment in sentimentCounts) {
                      sentimentCounts[sentiment.sentiment as keyof typeof sentimentCounts]++;
                    }
                  });
                  
                  // 가장 많은 감정으로 색상 결정 (majority voting)
                  const maxCount = Math.max(sentimentCounts.positive, sentimentCounts.negative, sentimentCounts.neutral);
                  
                  if (sentimentCounts.positive === maxCount && sentimentCounts.positive > 0) {
                    markerColor = '#16a34a'; // 초록색
                  } else if (sentimentCounts.negative === maxCount && sentimentCounts.negative > 0) {
                    markerColor = '#dc2626'; // 빨간색
                  } else {
                    markerColor = '#6b7280'; // 중립: 회색
                  }
                  
                  console.log(`🎯 마커: ${point.date} → ${markerColor} (P:${sentimentCounts.positive}/N:${sentimentCounts.negative}/M:${sentimentCounts.neutral}), merry: ${hasMerryMention}`);
                } else if (hasMerryMention) {
                  console.log(`🔵 마커: ${point.date} → ${markerColor} (메르 언급만)`);
                }
                
                return (
                  <ReferenceDot
                    key={`mention-${index}`}
                    x={point.date}
                    y={point.price}
                    r={isMobile ? 6 : 5}
                    fill="none"
                    stroke={markerColor}
                    strokeWidth={strokeWidth}
                  />
                );
              })}
              
              <Tooltip content={<TossTooltip />} />
            </LineChart>
          </ResponsiveContainer>
        </div>


        {/* 토스 스타일 기간 선택 (모바일 최적화) */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="flex justify-center">
            <div className="flex bg-gray-50 rounded-xl p-1 gap-0.5 sm:gap-1">
              {(['1M', '3M', '6M', '1Y'] as const).map((period) => (
                <button
                  key={period}
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