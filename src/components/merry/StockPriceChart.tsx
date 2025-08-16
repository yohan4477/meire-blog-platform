'use client';

import { useState, useEffect, useMemo } from 'react';
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
  
  // 텍스트
  primary: '#2f3640',
  secondary: '#747d8c', 
  muted: '#a4b0be',
  
  // 액센트 및 상태
  accent: '#5352ed',        // 토스 보라
  success: '#2ed573',       // 성공
  warning: '#ffa502',       // 경고
  
  // 감정 분석 마커 (기존 유지)
  sentiment: {
    positive: '#16a34a',
    negative: '#dc2626', 
    neutral: '#000000'  // 중립적인 감정은 검은색
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
    keywords: any;
    context: string;
    key_reasoning?: string;
    supporting_evidence?: string[];
    investment_perspective?: string;
    context_quotes?: string[];
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
}

export default function StockPriceChart({ 
  ticker, 
  timeRange, 
  onTimeRangeChange 
}: StockPriceChartProps) {
  // 상태 관리
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [changePercent, setChangePercent] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
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

  // 데이터 로딩
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 주가 데이터 가져오기
        const priceResponse = await fetch(`/api/stock-price?ticker=${ticker}&period=${timeRange}`);
        const priceResult = await priceResponse.json();
        
        // 감정 분석 데이터 가져오기  
        const sentimentResponse = await fetch(`/api/merry/stocks/${ticker}/sentiments?period=${timeRange?.toLowerCase() || '6mo'}`);
        const sentimentResult = await sentimentResponse.json();
        
        // 포스트 데이터 가져오기 (모든 포스트)
        const postsResponse = await fetch(`/api/merry/stocks/${ticker}/posts?limit=100&offset=0`);
        const postsResult = await postsResponse.json();
        
        if (priceResult.success && priceResult.prices) {
          // 포스트를 날짜별로 그룹화
          const postsByDate: {[key: string]: any[]} = {};
          if (postsResult.success && postsResult.data?.posts) {
            postsResult.data.posts.forEach((post: any) => {
              const postDate = new Date(post.created_date).toISOString().split('T')[0];
              if (!postsByDate[postDate]) {
                postsByDate[postDate] = [];
              }
              postsByDate[postDate].push(post);
            });
          }
          
          // 감정 데이터, 포스트 데이터와 주가 데이터 결합
          const enrichedData = priceResult.prices.map((point: any) => {
            const dateStr = point.date;
            const sentimentData = sentimentResult.sentimentByDate?.[dateStr];
            const postsData = postsByDate[dateStr] || [];
            
            return {
              ...point,
              sentiments: sentimentData?.sentiments || [],
              posts: [...(sentimentData?.posts || []), ...postsData]
            };
          });
          
          setPriceData(enrichedData);
          
          // 현재가 및 변동률 계산
          if (enrichedData.length >= 2) {
            const latest = enrichedData[enrichedData.length - 1];
            const previous = enrichedData[enrichedData.length - 2];
            setCurrentPrice(latest.price);
            setChangePercent(((latest.price - previous.price) / previous.price) * 100);
          }
          
          // 애니메이션 초기화
          setShowMarkers(false);
          setVisibleMarkerCount(0);
          
          // 라인 애니메이션 완료 후 마커 애니메이션 시작
          setTimeout(() => {
            setShowMarkers(true);
            
            // 마커들을 순차적으로 표시
            const markersWithData = enrichedData.filter(point => 
              (point.posts && point.posts.length > 0) || 
              (point.sentiments && point.sentiments.length > 0)
            );
            
            markersWithData.forEach((_, index) => {
              setTimeout(() => {
                setVisibleMarkerCount(prev => prev + 1);
              }, index * 100);
            });
          }, 1200); // 라인 애니메이션 대부분 완료 후
        }
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker, timeRange]);

  // 차트 색상 결정
  const chartColor = useMemo(() => {
    return changePercent >= 0 ? tossColors.positive : tossColors.negative;
  }, [changePercent]);

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

  // 토스 스타일 커스텀 툴팁
  const TossTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    const hassentiments = data.sentiments && data.sentiments.length > 0;
    
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
        
        {/* 감정 분석 정보 (기존 기능 유지) */}
        {hassentiments && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-700 mb-1">🎯 메르 감정 분석</div>
            {data.sentiments.slice(0, 2).map((sentiment: any, index: number) => {
              const sentimentColor = sentiment.sentiment === 'positive' 
                ? tossColors.sentiment.positive
                : sentiment.sentiment === 'negative' 
                ? tossColors.sentiment.negative 
                : tossColors.sentiment.neutral;
              
              const sentimentIcon = sentiment.sentiment === 'positive' ? '😊' 
                : sentiment.sentiment === 'negative' ? '😰' : '😐';
              
              return (
                <div key={index} className="text-xs space-y-1">
                  <div className="flex items-center gap-1">
                    <span style={{ color: sentimentColor }} className="font-medium">
                      {sentimentIcon} {sentiment.sentiment.toUpperCase()}
                    </span>
                    <span className="text-gray-500">
                      신뢰도 {(sentiment.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  {sentiment.key_reasoning && (
                    <div className="text-gray-600 bg-gray-50 rounded-lg p-2">
                      💡 {sentiment.key_reasoning}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* 관련 포스트 */}
        {data.posts && data.posts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-700 mb-1">
              📝 관련 포스트 ({data.posts.length}개)
            </div>
            <div className="text-xs text-gray-600">
              {data.posts[0].title.substring(0, 30)}...
            </div>
          </div>
        )}
      </div>
    );
  };

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
    const touchDuration = Date.now() - (touchState.touchStartTime || 0);
    
    // 탭 (100ms 미만) = 툴팁 표시
    // 길게 누르기 (500ms 이상) = 풀스크린 토글
    if (touchDuration < 100) {
      // 짧은 탭 - 툴팁 표시는 차트 라이브러리에서 처리
    } else if (touchDuration > 500) {
      // 길게 누르기 - 풀스크린 토글
      setIsFullscreen(!isFullscreen);
    }
    
    setTouchState({ isTouch: false });
  };

  // 줌 리셋
  const resetZoom = () => {
    setZoomDomain({});
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="flex gap-2">
              {['1M', '3M', '6M', '1Y'].map(period => (
                <div key={period} className="h-10 bg-gray-200 rounded w-16"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full transition-all duration-300 ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <CardContent className="p-0">
        {/* 토스 스타일 헤더 (모바일 최적화) */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">{ticker}</h2>
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
            
            <div className="flex items-center gap-1 sm:gap-2">
              {/* 줌 리셋 */}
              {(zoomDomain.start || zoomDomain.end) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetZoom}
                  className="text-xs px-2 py-1 h-auto"
                >
                  <RotateCcw className="w-3 h-3 sm:mr-1" />
                  <span className="hidden sm:inline">리셋</span>
                </Button>
              )}
              
              {/* 풀스크린 토글 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-xs px-2 py-1 h-auto"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3 h-3" />
                ) : (
                  <Maximize2 className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
          
          {/* 줌 정보 표시 */}
          {(zoomDomain.start && zoomDomain.end) && (
            <div className="mt-2 text-xs text-gray-500">
              🔍 {new Date(zoomDomain.start).toLocaleDateString('ko-KR')} ~ {new Date(zoomDomain.end).toLocaleDateString('ko-KR')}
            </div>
          )}
          
          {/* 모바일 도움말 */}
          <div className="mt-2 sm:hidden text-xs text-gray-400">
            📱 길게 누르면 풀스크린, 드래그하면 확대
          </div>
        </div>

        {/* 토스 스타일 차트 영역 */}
        <div 
          className={`${isFullscreen ? 'h-96 md:h-[500px]' : 'h-64 sm:h-80'} p-2 sm:p-4`}
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
              {/* 최소한의 그리드 (토스 스타일) */}
              <CartesianGrid 
                strokeDasharray="none" 
                stroke={tossColors.gridLine}
                vertical={false}
                strokeWidth={1}
              />
              
              {/* X축 (토스 스타일 - 중복 제거) */}
              <XAxis 
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fontSize: isMobile ? 9 : 11, 
                  fill: tossColors.muted,
                  fontWeight: 500
                }}
                interval="preserveStartEnd"
                tickCount={isMobile ? 4 : 6}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  
                  if (isMobile) {
                    // 모바일: 더 간단한 형식
                    if (timeRange === '1Y') {
                      return date.toLocaleDateString('ko-KR', { month: 'short' });
                    }
                    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                  } else {
                    // 데스크탑: 상세한 형식
                    if (timeRange === '1M') {
                      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                    } else if (timeRange === '1Y') {
                      return date.toLocaleDateString('ko-KR', { year: '2-digit', month: 'short' });
                    } else {
                      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                    }
                  }
                }}
              />
              
              {/* Y축 (토스 스타일 - 가격 표시 개선) */}
              <YAxis 
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fontSize: isMobile ? 9 : 11, 
                  fill: tossColors.muted,
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
              
              {/* 메인 라인 (토스 스타일) */}
              <Line
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ 
                  r: 5, 
                  fill: chartColor,
                  strokeWidth: 3,
                  stroke: '#ffffff'
                }}
                animationBegin={0}
                animationDuration={1500}
                animationEasing="ease-out"
              />
              
              {/* 언급된 정보 마커들 (빈 원으로 표시) */}
              {showMarkers && filteredData.map((point, index) => {
                // 포스트가 있거나 감정 분석이 있는 경우 빈 원 표시
                if ((!point.posts || point.posts.length === 0) && 
                    (!point.sentiments || point.sentiments.length === 0)) return null;
                
                // 마커 인덱스 계산 (데이터가 있는 포인트만 카운트)
                const markersBeforeThis = filteredData.slice(0, index).filter(p => 
                  (p.posts && p.posts.length > 0) || (p.sentiments && p.sentiments.length > 0)
                ).length;
                
                // 아직 표시할 시점이 아니면 렌더링하지 않음
                if (markersBeforeThis >= visibleMarkerCount) return null;
                
                // 감정이 있는 경우 색상 적용, 없으면 차트 색상과 동일
                let markerColor = chartColor; // 감정 정보 없음 - 차트 가격선과 같은 색
                if (point.sentiments && point.sentiments.length > 0) {
                  const dominantSentiment = point.sentiments.reduce((prev, current) => 
                    (current.confidence > prev.confidence) ? current : prev
                  );
                  
                  markerColor = dominantSentiment.sentiment === 'positive' 
                    ? tossColors.sentiment.positive    // 🟢 긍정: #16a34a
                    : dominantSentiment.sentiment === 'negative' 
                    ? tossColors.sentiment.negative    // 🔴 부정: #dc2626
                    : tossColors.sentiment.neutral;    // ⚫ 중립: #000000 (검은색)
                }
                
                return (
                  <ReferenceDot
                    key={`mention-${index}`}
                    x={point.date}
                    y={point.price}
                    r={4}
                    fill="none"
                    stroke={markerColor}
                    strokeWidth={2}
                    style={{
                      opacity: 1,
                      transform: 'scale(1)',
                      transition: 'opacity 0.3s ease-out, transform 0.3s ease-out'
                    }}
                  />
                );
              })}
              
              {/* 현재가 참조선 */}
              <ReferenceLine 
                y={currentPrice} 
                stroke={chartColor}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
                strokeWidth={1}
                animationBegin={1000}
                animationDuration={600}
                animationEasing="ease-out"
              />
              
              {/* 줌 영역 표시 */}
              {isZooming && zoomArea.start && zoomArea.end && (
                <ReferenceArea
                  x1={zoomArea.start}
                  x2={zoomArea.end}
                  fill={tossColors.accent}
                  fillOpacity={0.1}
                  stroke={tossColors.accent}
                  strokeOpacity={0.3}
                />
              )}
              
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
}