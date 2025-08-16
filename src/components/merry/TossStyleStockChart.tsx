'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
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
    neutral: '#6b7280'
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

interface TossStyleStockChartProps {
  ticker: string;
  timeRange: '1M' | '3M' | '6M';
  onTimeRangeChange: (range: '1M' | '3M' | '6M') => void;
}

export default function TossStyleStockChart({ 
  ticker, 
  timeRange, 
  onTimeRangeChange 
}: TossStyleStockChartProps) {
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

  // 데이터 로딩
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 주가 데이터 가져오기
        const priceResponse = await fetch(`/api/stock-price?ticker=${ticker}&period=${timeRange}`);
        const priceResult = await priceResponse.json();
        
        // 감정 분석 데이터 가져오기  
        const sentimentResponse = await fetch(`/api/merry/stocks/${ticker}/sentiments?period=${timeRange.toLowerCase()}`);
        const sentimentResult = await sentimentResponse.json();
        
        if (priceResult.success && priceResult.data) {
          // 감정 데이터와 주가 데이터 결합
          const enrichedData = priceResult.data.map((point: any) => {
            const dateStr = point.date;
            const sentimentData = sentimentResult.sentimentByDate?.[dateStr];
            
            return {
              ...point,
              sentiments: sentimentData?.sentiments || [],
              posts: sentimentData?.posts || []
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
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-2xl max-w-sm">
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
          <div className="text-xl font-bold" style={{ color: chartColor }}>
            ₩{data.price.toLocaleString()}
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

  // 줌 이벤트 핸들러
  const handleMouseDown = (e: any) => {
    if (!e || !e.activeLabel) return;
    setIsZooming(true);
    setZoomArea({ start: e.activeLabel });
  };

  const handleMouseMove = (e: any) => {
    if (!isZooming || !e || !e.activeLabel) return;
    setZoomArea(prev => ({ ...prev, end: e.activeLabel }));
  };

  const handleMouseUp = () => {
    if (!isZooming || !zoomArea.start || !zoomArea.end) {
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
              {['1M', '3M', '6M'].map(period => (
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
        {/* 토스 스타일 헤더 */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{ticker}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl font-bold" style={{ color: chartColor }}>
                  ₩{currentPrice.toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                  {changePercent >= 0 ? (
                    <TrendingUp className="w-4 h-4" style={{ color: chartColor }} />
                  ) : (
                    <TrendingDown className="w-4 h-4" style={{ color: chartColor }} />
                  )}
                  <span 
                    className="text-sm font-semibold px-2 py-1 rounded-lg"
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
            
            <div className="flex items-center gap-2">
              {/* 줌 리셋 */}
              {(zoomDomain.start || zoomDomain.end) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetZoom}
                  className="text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  리셋
                </Button>
              )}
              
              {/* 풀스크린 토글 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-xs"
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
        </div>

        {/* 토스 스타일 차트 영역 */}
        <div className={`${isFullscreen ? 'h-96' : 'h-80'} p-4`}>
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
              
              {/* X축 (토스 스타일 - 깔끔하게) */}
              <XAxis 
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fontSize: 11, 
                  fill: tossColors.muted,
                  fontWeight: 500
                }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  if (timeRange === '1M') {
                    return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
                  } else {
                    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                  }
                }}
              />
              
              {/* Y축 (토스 스타일 - 오른쪽만) */}
              <YAxis 
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fontSize: 11, 
                  fill: tossColors.muted,
                  fontWeight: 500
                }}
                tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`}
                domain={['dataMin - 1000', 'dataMax + 1000']}
                width={60}
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
              />
              
              {/* 감정 분석 마커들 (기존 기능 유지) */}
              {filteredData.map((point, index) => {
                if (!point.sentiments || point.sentiments.length === 0) return null;
                
                const dominantSentiment = point.sentiments.reduce((prev, current) => 
                  (current.confidence > prev.confidence) ? current : prev
                );
                
                const markerColor = dominantSentiment.sentiment === 'positive' 
                  ? tossColors.sentiment.positive
                  : dominantSentiment.sentiment === 'negative' 
                  ? tossColors.sentiment.negative 
                  : tossColors.sentiment.neutral;
                
                return (
                  <ReferenceLine
                    key={`sentiment-${index}`}
                    x={point.date}
                    stroke={markerColor}
                    strokeWidth={3}
                    strokeDasharray="none"
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

        {/* 토스 스타일 기간 선택 */}
        <div className="px-6 pb-6">
          <div className="flex justify-center">
            <div className="flex bg-gray-50 rounded-xl p-1 gap-1">
              {(['1M', '3M', '6M'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => onTimeRangeChange(period)}
                  className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
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