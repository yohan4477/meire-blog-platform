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
    confidence: number;
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
  posts?: {
    id: number;
    title: string;
    excerpt: string;
    views: number;
  }[];
}

interface StockPriceChartProps {
  ticker: string;
  timeRange: '1M' | '3M' | '6M' | '1Y';
  onTimeRangeChange: (range: '1M' | '3M' | '6M' | '1Y') => void;
  stockName?: string; // 종목 이름 추가
}

// 🚀 ULTRA: 메모이제이션된 차트 컴포넌트
export default memo(function StockPriceChart({ 
  ticker, 
  timeRange, 
  onTimeRangeChange,
  stockName
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
      
      // 🔥 4개 DB 최적화: 3개 API 병렬 호출 (stocks+prices, sentiments, merry_mentioned_stocks)
      const [priceResult, sentimentResult, postsResult] = await Promise.all([
        fetch(`/api/stock-price?ticker=${ticker}&period=${standardPeriod}`).then(r => r.json()),
        fetch(`/api/merry/stocks/${ticker}/sentiments?period=${standardPeriod}`).then(r => r.json()),
        fetch(`/api/merry/stocks/${ticker}/posts?limit=100&offset=0&period=${standardPeriod}`).then(r => r.json())
      ]);
      
      console.log(`⚡ ULTRA: 3개 API 병렬 완료 - Price: ${priceResult.success}, Sentiment: ${!!sentimentResult.sentimentByDate}, Posts: ${postsResult.success}`);
      
      // 감정 분석 통계 즉시 설정
      setSentimentStats({
        totalMentions: sentimentResult.totalMentions || 0,
        analyzedMentions: sentimentResult.analyzedMentions || 0
      });
      
      if (priceResult.success && priceResult.prices) {
        // 🔥 4개 DB 최적화: merry_mentioned_stocks 데이터 날짜별 그룹화
        const postsByDate = Object.create(null);
        if (postsResult.success && postsResult.data?.posts) {
          postsResult.data.posts.forEach((post: any) => {
            // merry_mentioned_stocks.mentioned_date 사용
            const postDate = post.created_date || post.mentioned_date;
            // 🔧 날짜 형식 정규화 (YYYY-MM-DD)
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

        // 🔥 단순화: merry_mentioned_stocks + sentiments 별도 병합
        const enrichedData = filteredPrices.map((point: any) => {
          const dateStr = point.date;
          // 🔧 날짜 형식 정규화 (YYYY-MM-DD)
          const normalizedDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
          
          // 1. merry_mentioned_stocks 데이터 (파란색 마커용)
          const postsData = postsByDate[normalizedDate] || [];
          
          // 2. sentiments 데이터 (색상 변경용) - 날짜 키 직접 사용
          const sentimentData = sentimentResult.sentimentByDate?.[normalizedDate];
          const sentiments = sentimentData?.postSentimentPairs?.map((pair: any) => pair.sentiment) || [];
          
          console.log(`🔍 날짜 매칭: ${normalizedDate} → posts: ${postsData.length}, sentiments: ${sentiments.length}`, {
            sentimentData,
            sentiments: sentiments.map(s => ({ sentiment: s.sentiment, reasoning: s.key_reasoning?.substring(0, 50) }))
          });
          
          return {
            ...point,
            posts: postsData,        // merry_mentioned_stocks 데이터
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
        
        // 🔥 단순화: 마커 표시 (merry 언급이 있는 날짜)
        setShowMarkers(true);
        const markersWithData = enrichedData.filter((point: any) => 
          point.posts?.length > 0
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
        
        {/* 📝 관련 포스트 표시 (실제 제목) */}
        {data.posts?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-700 mb-1">📝 관련 포스트</p>
            {data.posts.slice(0, 2).map((post: any, index: number) => (
              <div key={index} className="text-xs p-2 bg-blue-50 rounded-lg border-l-2 border-blue-400 mb-1">
                <div className="font-medium text-blue-800 mb-1 line-clamp-2">
                  {post.title || `메르 포스트 #${post.id}`}
                </div>
                <div className="text-gray-600 text-[10px]">
                  조회수: {post.views || 0} · {post.category || '투자분석'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 🎯 근거 기반 감정 분석 표시 */}
        {data.sentiments?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700 mb-1">🎯 감정 분석</p>
            {data.sentiments.slice(0, 2).map((sentiment: any, index: number) => {
              const sentimentColor = sentiment.sentiment === 'positive' 
                ? '#16a34a' : sentiment.sentiment === 'negative' 
                ? '#dc2626' : '#6b7280';
              
              const sentimentIcon = sentiment.sentiment === 'positive' ? '📈' 
                : sentiment.sentiment === 'negative' ? '📉' : '📊';
              
              const sentimentLabel = sentiment.sentiment === 'positive' ? '긍정적' 
                : sentiment.sentiment === 'negative' ? '부정적' : '중립적';
              
              return (
                <div key={index} className="text-xs p-2 bg-gray-50 rounded-lg border-l-2" style={{borderLeftColor: sentimentColor}}>
                  <div className="flex items-center gap-1 mb-1">
                    <span style={{ color: sentimentColor }} className="font-medium text-xs">
                      {sentimentIcon} {sentimentLabel}
                    </span>
                  </div>
                  {sentiment.key_reasoning && (
                    <div className="text-gray-700 text-xs leading-relaxed">
                      {sentiment.key_reasoning}
                    </div>
                  )}
                </div>
              );
            })}
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
            </div>
            
            {/* 마커 범례 (헤더 오른쪽, 조금 아래) */}
            <div className="hidden sm:flex items-end gap-3 text-xs text-gray-500 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: '#16a34a' }}></div>
                <span>긍정</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: '#dc2626' }}></div>
                <span>부정</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: '#6b7280' }}></div>
                <span>중립</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: '#2563eb' }}></div>
                <span>언급</span>
              </div>
            </div>
          </div>
        </div>

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
                tick={({ x, y, payload }) => {
                  const date = new Date(payload.value);
                  let text = '';
                  let isJanuary = false;
                  
                  if (timeRange === '1Y' || timeRange === '6M') {
                    const month = date.getMonth() + 1;
                    isJanuary = month === 1;
                    
                    if (isJanuary) {
                      text = `${date.getFullYear()}년 1월`;
                    } else {
                      text = `${month}월`;
                    }
                  } else {
                    text = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                  }
                  
                  return (
                    <text 
                      x={x} 
                      y={y} 
                      dy={16} 
                      textAnchor="middle" 
                      fill={isDarkMode ? tossColors.dark.muted : tossColors.muted}
                      fontSize={isMobile ? 9 : 11}
                      fontWeight={isJanuary ? 'bold' : 500}
                    >
                      {text}
                    </text>
                  );
                }}
                interval="preserveStartEnd"
                tickCount={timeRange === '1Y' ? 6 : timeRange === '6M' ? 4 : 3}
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
              
              {/* 🔥 최종 완성: 감정 분석 + merry 언급 통합 마커 표시 */}
              {showMarkers && filteredData.map((point, index) => {
                // 1단계: merry_mentioned_stocks 또는 sentiments 데이터 확인
                const hasMerryMention = point.posts && point.posts.length > 0;
                const hasSentiments = point.sentiments && point.sentiments.length > 0;
                
                // 어느 것도 없으면 마커 표시 안함
                if (!hasMerryMention && !hasSentiments) {
                  return null;
                }
                
                // 2단계: 기본 색상 및 두께 설정
                let markerColor = '#2563eb'; // 기본: 파란색 (merry 언급만)
                let strokeWidth = 2;
                let sentimentInfo = '';
                
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
                  let dominantSentiment = 'neutral';
                  
                  if (sentimentCounts.positive === maxCount && sentimentCounts.positive > 0) {
                    dominantSentiment = 'positive';
                    markerColor = '#16a34a'; // 초록색
                  } else if (sentimentCounts.negative === maxCount && sentimentCounts.negative > 0) {
                    dominantSentiment = 'negative';
                    markerColor = '#dc2626'; // 빨간색
                  } else {
                    dominantSentiment = 'neutral';
                    markerColor = '#6b7280'; // 중립: 회색
                  }
                  
                  sentimentInfo = `P${sentimentCounts.positive}/N${sentimentCounts.negative}/M${sentimentCounts.neutral} → ${dominantSentiment.toUpperCase()}`;
                  
                  console.log(`🎯 마커 최종: ${point.date} → ${markerColor} (${sentimentInfo}), merry: ${hasMerryMention}`);
                } else if (hasMerryMention) {
                  console.log(`🔵 마커 기본: ${point.date} → ${markerColor} (메르 언급만), sentiments: none`);
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