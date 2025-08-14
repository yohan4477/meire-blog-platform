'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { TrendingUp, TrendingDown, Calendar, DollarSign, BarChart3 } from 'lucide-react';

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
  }[];
  posts?: {
    id: number;
    title: string;
    excerpt: string;
    views: number;
    date: number;
  }[];
}

interface StockPriceChartProps {
  ticker: string;
  stockName: string;
  currency: string;
  recentPosts?: any[];
  currentPrice?: number;
}

export default function StockPriceChart({ 
  ticker, 
  stockName, 
  currency, 
  recentPosts = [], 
  currentPrice = 0 
}: StockPriceChartProps) {
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [yAxisDomain, setYAxisDomain] = useState<[number, number] | null>(null);
  const [zoomState, setZoomState] = useState<{
    left?: string | number;
    right?: string | number;
    refAreaLeft?: string | number;
    refAreaRight?: string | number;
    top?: number;
    bottom?: number;
    isZooming?: boolean;
  }>({});
  const [zoomHistory, setZoomHistory] = useState<Array<{
    xDomain: [string | number | undefined, string | number | undefined];
    yDomain: [number, number] | null;
  }>>([]);
  const [timeRange, setTimeRange] = useState<string>('6M');
  const [priceChange, setPriceChange] = useState<{ 
    value: number; 
    percentage: number; 
    isPositive: boolean; 
  } | null>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [isPostSheetOpen, setIsPostSheetOpen] = useState(false);

  useEffect(() => {
    fetchAllPostsAndGenerateChart();
  }, [ticker, currentPrice, timeRange]);

  const fetchAllPostsAndGenerateChart = async () => {
    try {
      // 선택된 기간에 따른 포스트 가져오기
      const period = timeRange.toLowerCase().replace('m', 'mo'); // 6M -> 6mo
      const cacheBuster = Date.now();
      console.log(`📅 Fetching posts for period: ${timeRange} (API: ${period})`);
      
      // 포스트와 감정 분석 데이터를 병렬로 가져오기
      const [postsResponse, sentimentResponse] = await Promise.all([
        fetch(`/api/merry/stocks/${ticker}/posts/full?period=${period}&t=${cacheBuster}`, {
          cache: 'no-store'
        }),
        fetch(`/api/merry/stocks/${ticker}/sentiments?period=${period}&t=${cacheBuster}`, {
          cache: 'no-store'
        })
      ]);
      
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        if (postsData.success) {
          console.log(`📊 Loaded ${postsData.data.posts.length} posts for ${ticker} chart (${timeRange} period)`);
          setAllPosts(postsData.data.posts);
          
          // 감정 분석 데이터 처리
          if (sentimentResponse.ok) {
            const sentimentDataResponse = await sentimentResponse.json();
            console.log(`🎯 Loaded sentiment data for ${ticker}:`, sentimentDataResponse);
            setSentimentData(sentimentDataResponse);
          } else {
            console.warn('감정 분석 데이터 로딩 실패');
            setSentimentData(null);
          }
          
          // 포스트 로드 후 차트 생성
          await generatePriceHistory(postsData.data.posts);
          return;
        }
      }
    } catch (error) {
      console.error('전체 포스트 로딩 실패:', error);
    }
    
    // 포스트 로드 실패시 기본 차트 생성
    await generatePriceHistory([]);
  };

  const generatePriceHistory = async (postsData?: any[]) => {
    try {
      const chartData: PricePoint[] = [];

      // 실제 주식 가격 API 호출 (선택된 기간)
      const priceData = await fetchRealStockPrices(ticker, stockName, timeRange);
      
      if (priceData && priceData.length > 0) {
        // API에서 받은 실제 가격 데이터 사용
        priceData.forEach((dataPoint) => {
          chartData.push({
            date: dataPoint.date,
            price: dataPoint.price,
            isCurrentPrice: false
          });
        });

        // 전달받은 postsData 또는 상태의 allPosts 사용
        const postsToUse = postsData && postsData.length > 0 ? postsData : 
                          allPosts.length > 0 ? allPosts : recentPosts;
        
        console.log(`🎯 Using ${postsToUse.length} posts for chart markers`);
        
        if (postsToUse && postsToUse.length > 0) {
          console.log(`🎯 Processing ${postsToUse.length} posts for chart markers`);
          
          postsToUse.forEach((post, index) => {
            let mentionDate: Date;
            if (typeof post.created_date === 'number') {
              mentionDate = new Date(post.created_date);
            } else {
              mentionDate = new Date(post.created_date);
            }
            
            const postDateStr = mentionDate.toISOString().split('T')[0];
            console.log(`📅 Post ${index + 1}: "${post.title.substring(0, 30)}..." on ${postDateStr}`);
            
            // 정확한 날짜 매칭을 먼저 시도
            let matchingPoint = chartData.find(p => p.date === postDateStr);
            
            // 정확한 매칭이 없으면 가장 가까운 날짜 찾기 (±7일 범위)
            if (!matchingPoint) {
              const postTime = mentionDate.getTime();
              const dayMs = 24 * 60 * 60 * 1000;
              
              let closestPoint = null;
              let closestDistance = Infinity;
              
              chartData.forEach(point => {
                const pointTime = new Date(point.date).getTime();
                const distance = Math.abs(pointTime - postTime);
                
                // 7일 이내에서 가장 가까운 점 찾기
                if (distance < 7 * dayMs && distance < closestDistance) {
                  closestDistance = distance;
                  closestPoint = point;
                }
              });
              
              matchingPoint = closestPoint;
              if (matchingPoint) {
                console.log(`🔗 Matched post "${post.title.substring(0, 30)}..." (${postDateStr}) to chart point (${matchingPoint.date})`);
              }
            } else {
              console.log(`✅ Exact match for post "${post.title.substring(0, 30)}..." on ${postDateStr}`);
            }
            
            if (matchingPoint) {
              // 해당 날짜의 데이터 포인트에 언급 정보 추가
              if (!matchingPoint.postTitle) {
                matchingPoint.postTitle = post.title;
                matchingPoint.postId = post.id;
                
                // 감정 분석 데이터 추가
                const postDateStr = matchingPoint.date;
                if (sentimentData && sentimentData.sentimentByDate && sentimentData.sentimentByDate[postDateStr]) {
                  matchingPoint.sentiments = sentimentData.sentimentByDate[postDateStr].sentiments;
                  matchingPoint.posts = sentimentData.sentimentByDate[postDateStr].posts;
                  console.log(`🎯 Added sentiment data to marker on ${postDateStr}:`, matchingPoint.sentiments);
                }
              } else {
                // 여러 포스트가 같은 날짜에 있으면 제목 합치기
                matchingPoint.postTitle = `${matchingPoint.postTitle} | ${post.title}`;
                
                // 감정 분석 데이터도 합치기
                const postDateStr = matchingPoint.date;
                if (sentimentData && sentimentData.sentimentByDate && sentimentData.sentimentByDate[postDateStr]) {
                  if (!matchingPoint.sentiments) matchingPoint.sentiments = [];
                  if (!matchingPoint.posts) matchingPoint.posts = [];
                  
                  matchingPoint.sentiments = [...matchingPoint.sentiments, ...sentimentData.sentimentByDate[postDateStr].sentiments];
                  matchingPoint.posts = [...matchingPoint.posts, ...sentimentData.sentimentByDate[postDateStr].posts];
                }
              }
            } else {
              console.log(`⚠️ No matching chart point found for post "${post.title.substring(0, 30)}..." (${postDateStr})`);
            }
          });
          
          const markersCount = chartData.filter(p => p.postTitle && !p.isCurrentPrice).length;
          console.log(`📊 Total markers created: ${markersCount} out of ${postsToUse.length} posts`);
        }

        // 현재가 추가/업데이트
        const today = new Date().toISOString().split('T')[0];
        const todayPoint = chartData.find(p => p.date === today);
        const todayPrice = currentPrice || (chartData.length > 0 ? chartData[chartData.length - 1].price : 0);
        
        if (todayPoint) {
          todayPoint.price = todayPrice;
          todayPoint.isCurrentPrice = true;
          if (!todayPoint.postTitle) {
            todayPoint.postTitle = '현재가';
          }
        } else {
          chartData.push({
            date: today,
            price: todayPrice,
            postTitle: '현재가',
            isCurrentPrice: true
          });
        }

        // 날짜순으로 정렬
        chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Y축 범위 최적화를 위한 최소/최대값 계산
        calculateYAxisDomain(chartData);

        // 가격 변화 계산 (첫째 날 vs 마지막 날)
        if (chartData.length >= 2) {
          const firstPrice = chartData[0].price;
          const lastPrice = chartData[chartData.length - 1].price;
          const change = lastPrice - firstPrice;
          const changePercentage = (change / firstPrice) * 100;

          setPriceChange({
            value: change,
            percentage: changePercentage,
            isPositive: change >= 0
          });
        }
      }

      // CLAUDE.md 원칙: 실제 데이터만 사용, dummy data 금지
      setPriceData(chartData); // 빈 배열이든 실제 데이터든 그대로 설정
      setLoading(false);
    } catch (error) {
      console.error('가격 데이터 로딩 실패:', error);
      setPriceData([]);
      setLoading(false);
    }
  };

  // 실제 주식 가격 API 호출 (기간별)
  const fetchRealStockPrices = async (ticker: string, stockName: string, period: string = '6M') => {
    try {
      // 한국 주식과 미국 주식 구분
      const isKoreanStock = ticker.length === 6 && !isNaN(Number(ticker));
      
      if (isKoreanStock) {
        // 한국 주식: KIS API 또는 Yahoo Finance Korea 사용
        return await fetchKoreanStockPrice(ticker, period);
      } else {
        // 미국 주식: Alpha Vantage 또는 Yahoo Finance 사용
        return await fetchUSStockPrice(ticker, period);
      }
    } catch (error) {
      console.error('주식 가격 API 호출 실패:', error);
      return null;
    }
  };

  // 한국 주식 가격 (Yahoo Finance Korea)
  const fetchKoreanStockPrice = async (ticker: string, period: string = '6M') => {
    try {
      // 기간을 API 형식으로 변환
      const apiPeriod = period.toLowerCase().replace('m', 'mo'); // 6M -> 6mo
      const cacheBuster = Date.now();
      const response = await fetch(`/api/stock-price?ticker=${ticker}.KS&period=${apiPeriod}&t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success && data.prices) {
        return data.prices;
      }
      return null;
    } catch (error) {
      console.error('한국 주식 가격 조회 실패:', error);
      return null;
    }
  };

  // 미국 주식 가격
  const fetchUSStockPrice = async (ticker: string, period: string = '6M') => {
    try {
      // 기간을 API 형식으로 변환
      const apiPeriod = period.toLowerCase().replace('m', 'mo'); // 6M -> 6mo
      const cacheBuster = Date.now();
      const response = await fetch(`/api/stock-price?ticker=${ticker}&period=${apiPeriod}&t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success && data.prices) {
        return data.prices;
      }
      return null;
    } catch (error) {
      console.error('미국 주식 가격 조회 실패:', error);
      return null;
    }
  };



  const formatPrice = (price: number): string => {
    const symbol = currency === 'USD' ? '$' : '₩';
    return `${symbol}${price.toLocaleString()}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  const handleMarkerClick = (data: PricePoint) => {
    if (data.postTitle && !data.isCurrentPrice && data.postId) {
      // allPosts에서 해당 포스트 찾기
      const post = allPosts.find(p => p.id === data.postId);
      if (post) {
        setSelectedPost(post);
        setIsPostSheetOpen(true);
      }
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // 언급된 날짜나 현재가가 아니면 툴팁을 표시하지 않음
      if (!data.postTitle && !data.isCurrentPrice) {
        return null;
      }
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-xs z-50">
          <p className="font-semibold text-sm">{formatDate(label)}</p>
          <p className="text-lg font-bold text-primary">
            {formatPrice(payload[0].value)}
          </p>
          {data.postTitle && !data.isCurrentPrice && (
            <div className="mt-2 p-2 bg-blue-50 rounded border-l-2 border-blue-400">
              <p className="text-xs font-medium text-blue-700 mb-1">📝 메르의 언급</p>
              <p className="text-sm text-blue-600 line-clamp-2">
                {data.postTitle}
              </p>
              
              {/* 감정 분석 정보 표시 */}
              {data.sentiments && data.sentiments.length > 0 && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="text-xs font-medium text-gray-700 mb-1">🎯 감정 분석</p>
                  {data.sentiments.slice(0, 2).map((sentiment, index) => {
                    const sentimentColor = sentiment.sentiment === 'positive' ? 'text-green-600' :
                                         sentiment.sentiment === 'negative' ? 'text-red-600' : 'text-gray-600';
                    const sentimentIcon = sentiment.sentiment === 'positive' ? '😊' :
                                        sentiment.sentiment === 'negative' ? '😟' : '😐';
                    
                    return (
                      <div key={index} className="flex items-center justify-between text-xs mb-1">
                        <span className={`${sentimentColor} font-medium`}>
                          {sentimentIcon} {sentiment.sentiment}
                        </span>
                        <span className="text-gray-500">
                          신뢰도: {(sentiment.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                  {data.sentiments.length > 2 && (
                    <p className="text-xs text-gray-500">
                      +{data.sentiments.length - 2}개 더
                    </p>
                  )}
                </div>
              )}
              
              {data.postId && (
                <button 
                  onClick={() => handleMarkerClick(data)}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-2 underline"
                >
                  포스트 자세히 보기 →
                </button>
              )}
            </div>
          )}
          {data.isCurrentPrice && (
            <div className="mt-2 p-2 bg-green-50 rounded border-l-2 border-green-400">
              <p className="text-sm text-green-600 font-medium">
                🔥 현재가
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const calculateYAxisDomain = (data: PricePoint[], xDomain?: [string | number | undefined, string | number | undefined]) => {
    let filteredData = data;
    
    // X축 줌 범위가 있으면 해당 범위의 데이터만 필터링
    if (xDomain && xDomain[0] && xDomain[1]) {
      const startDate = new Date(xDomain[0]).getTime();
      const endDate = new Date(xDomain[1]).getTime();
      filteredData = data.filter(d => {
        const dataDate = new Date(d.date).getTime();
        return dataDate >= startDate && dataDate <= endDate;
      });
    }
    
    const prices = filteredData.map(d => d.price).filter(p => p > 0);
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const padding = (maxPrice - minPrice) * 0.05; // 5% 여백
      
      const yAxisMin = Math.max(0, minPrice - padding);
      const yAxisMax = maxPrice + padding;
      
      setYAxisDomain([yAxisMin, yAxisMax]);
      console.log(`📊 Y-axis range: ${yAxisMin.toFixed(0)} - ${yAxisMax.toFixed(0)} (${filteredData.length}/${data.length} points)`);
    }
  };

  const handleMouseDown = (e: any) => {
    if (!e) return;
    const { activeLabel } = e;
    if (activeLabel) {
      setZoomState(prev => ({ ...prev, refAreaLeft: activeLabel, isZooming: true }));
    }
  };

  const handleMouseMove = (e: any) => {
    if (!zoomState.isZooming || !e) return;
    const { activeLabel } = e;
    if (activeLabel && zoomState.refAreaLeft !== activeLabel) {
      setZoomState(prev => ({ ...prev, refAreaRight: activeLabel }));
    }
  };

  const handleMouseUp = () => {
    if (!zoomState.isZooming) return;
    
    let { refAreaLeft, refAreaRight } = zoomState;
    
    if (refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight) {
      // 날짜 순서 확인 및 정렬
      if (new Date(refAreaLeft).getTime() > new Date(refAreaRight).getTime()) {
        [refAreaLeft, refAreaRight] = [refAreaRight, refAreaLeft];
      }
      
      // 현재 상태를 히스토리에 저장
      setZoomHistory(prev => [
        ...prev,
        {
          xDomain: [zoomState.left, zoomState.right],
          yDomain
        }
      ]);
      
      // 새로운 줌 범위 설정
      setZoomState({
        left: refAreaLeft,
        right: refAreaRight
      });
      
      // Y축 범위도 새로 계산
      calculateYAxisDomain(priceData, [refAreaLeft, refAreaRight]);
      
      console.log(`🔍 Zoomed to: ${refAreaLeft} ~ ${refAreaRight}`);
    }
    
    setZoomState(prev => ({ ...prev, refAreaLeft: undefined, refAreaRight: undefined, isZooming: false }));
  };

  const handleZoomOut = () => {
    if (zoomHistory.length > 0) {
      const lastState = zoomHistory[zoomHistory.length - 1];
      setZoomState({
        left: lastState.xDomain[0],
        right: lastState.xDomain[1]
      });
      setYAxisDomain(lastState.yDomain);
      setZoomHistory(prev => prev.slice(0, -1));
    } else {
      // 전체 범위로 리셋
      setZoomState({});
      calculateYAxisDomain(priceData);
    }
  };

  const handleReset = () => {
    setZoomState({});
    setZoomHistory([]);
    calculateYAxisDomain(priceData);
    setTimeRange('6M');
  };

  const handleTimeRangeChange = (range: string) => {
    console.log(`📅 Changing time range to: ${range}`);
    setTimeRange(range);
    setZoomState({});
    setZoomHistory([]);
    setLoading(true);
    
    // 새로운 기간에 대한 데이터를 다시 가져옴 (useEffect가 트리거됨)
    // fetchAllPostsAndGenerateChart()는 useEffect를 통해 자동 호출됨
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            가격 차트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
            <p className="text-muted-foreground">차트를 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // CLAUDE.md 원칙: 실제 데이터 없으면 "정보 없음" 명확히 표시
  if (priceData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {stockName} 가격 차트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <div className="space-y-2">
              <p className="text-lg font-medium">가격 정보 없음</p>
              <p className="text-sm">
                {stockName}({ticker})의 6개월치 가격 데이터가<br/>
                아직 준비되지 않았습니다.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                메르가 언급한 종목만 차트 데이터를 제공합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            {stockName} 가격 차트
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {ticker}
            </Badge>
            {priceChange && (
              <Badge 
                variant={priceChange.isPositive ? "default" : "destructive"}
                className="text-sm"
              >
                {priceChange.isPositive ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {priceChange.isPositive ? '+' : ''}{priceChange.percentage.toFixed(1)}%
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          최근 {timeRange} 가격 변화 추이 및 메르의 언급 시점
        </p>
      </CardHeader>
      <CardContent>
        {/* 줌 컨트롤 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">기간:</span>
            {['1M', '3M', '6M'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeRangeChange(range)}
                className="text-xs"
              >
                {range}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            {(zoomState.left && zoomState.right) && (
              <Badge variant="secondary" className="text-xs">
                📅 {formatDate(zoomState.left.toString())} ~ {formatDate(zoomState.right.toString())}
              </Badge>
            )}
            {zoomHistory.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleZoomOut} className="text-xs">
                ↶ 뒤로
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
              🔄 초기화
            </Button>
          </div>
        </div>
        
        <div className="h-96 w-full" data-testid="stock-price-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={priceData} 
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                className="text-xs"
                domain={zoomState.left && zoomState.right ? [zoomState.left, zoomState.right] : ['dataMin', 'dataMax']}
                type="category"
                allowDataOverflow
              />
              <YAxis 
                domain={yAxisDomain || ['auto', 'auto']}
                tickFormatter={(value) => formatPrice(value)}
                className="text-xs"
              />
              <Tooltip 
                content={<CustomTooltip />}
                animationDuration={150}
                animationEasing="ease-out"
                allowEscapeViewBox={{ x: false, y: true }}
                offset={10}
                cursor={{ stroke: '#2563eb', strokeWidth: 1, strokeDasharray: '3 3' }}
                wrapperStyle={{ 
                  zIndex: 1000,
                  pointerEvents: 'none'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  // 언급된 날짜만 파란색 빈 원으로 표시 (클릭 가능)
                  if (payload.postTitle && !payload.isCurrentPrice) {
                    // 감정 분석에 따른 마커 색상 결정
                    let markerColor = "#2563eb"; // 기본 파란색
                    let strokeWidth = 2;
                    
                    if (payload.sentiments && payload.sentiments.length > 0) {
                      // 여러 감정이 있는 경우 우세한 감정으로 결정
                      const sentimentCounts = payload.sentiments.reduce((acc, s) => {
                        acc[s.sentiment] = (acc[s.sentiment] || 0) + 1;
                        return acc;
                      }, {});
                      
                      const dominantSentiment = Object.entries(sentimentCounts)
                        .sort(([,a], [,b]) => b - a)[0][0];
                      
                      switch (dominantSentiment) {
                        case 'positive':
                          markerColor = "#16a34a"; // 초록색
                          strokeWidth = 3;
                          break;
                        case 'negative':
                          markerColor = "#dc2626"; // 빨간색
                          strokeWidth = 3;
                          break;
                        case 'neutral':
                        default:
                          markerColor = "#2563eb"; // 기본 파란색
                          strokeWidth = 2;
                          break;
                      }
                    }
                    
                    return (
                      <g>
                        {/* 투명한 더 큰 영역으로 호버 영역 확대 */}
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={12} 
                          fill="transparent" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleMarkerClick(payload)}
                        />
                        {/* 실제 보이는 마커 - 감정에 따른 색상 */}
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={5} 
                          fill="none" 
                          stroke={markerColor} 
                          strokeWidth={strokeWidth}
                          style={{ cursor: 'pointer', pointerEvents: 'none' }}
                        />
                        {/* 감정 분석이 있는 경우 작은 indicator */}
                        {payload.sentiments && payload.sentiments.length > 0 && (
                          <circle 
                            cx={cx + 6} 
                            cy={cy - 6} 
                            r={2} 
                            fill={markerColor}
                            stroke="#ffffff"
                            strokeWidth={1}
                          />
                        )}
                      </g>
                    );
                  }
                  // 현재가만 초록색 점으로 표시
                  if (payload.isCurrentPrice) {
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={10} fill="transparent" />
                        <circle cx={cx} cy={cy} r={6} fill="#16a34a" stroke="#ffffff" strokeWidth={2} />
                      </g>
                    );
                  }
                  // 언급되지 않은 일반 날짜는 점 표시 안함 (곡선만)
                  return null;
                }}
                dotSize={0}
                activeDot={{ 
                  r: 12, 
                  fill: '#1d4ed8', 
                  stroke: '#ffffff', 
                  strokeWidth: 2,
                  style: { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }
                }}
                name="주가"
              />
              {zoomState.refAreaLeft && zoomState.refAreaRight && (
                <ReferenceArea
                  x1={zoomState.refAreaLeft}
                  x2={zoomState.refAreaRight}
                  strokeOpacity={0.3}
                  fill="#2563eb"
                  fillOpacity={0.1}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {formatPrice(priceData[0]?.price || 0)}
            </div>
            <div className="text-sm text-muted-foreground">첫 언급가</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDate(priceData[0]?.date || '')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {formatPrice(priceData[priceData.length - 1]?.price || 0)}
            </div>
            <div className="text-sm text-muted-foreground">현재가</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDate(priceData[priceData.length - 1]?.date || '')}
            </div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${priceChange?.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {priceChange ? formatPrice(Math.abs(priceChange.value)) : '-'}
            </div>
            <div className="text-sm text-muted-foreground">가격 변동</div>
            <div className={`text-xs mt-1 ${priceChange?.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {priceChange ? `${priceChange.isPositive ? '+' : '-'}${Math.abs(priceChange.percentage).toFixed(1)}%` : '-'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {allPosts.length > 0 ? allPosts.length : recentPosts.length}개
            </div>
            <div className="text-sm text-muted-foreground">최근 {timeRange} 언급</div>
            <div className="text-xs text-muted-foreground mt-1">
              <Calendar className="w-3 h-3 inline mr-1" />
              {priceData.filter(p => p.postTitle && !p.isCurrentPrice).length}회 언급
            </div>
            {(zoomState.left && zoomState.right) && (
              <div className="text-xs text-blue-600 mt-1">
                🔍 줌: {formatDate(zoomState.left.toString())} ~ {formatDate(zoomState.right.toString())}
              </div>
            )}
          </div>
        </div>

        {/* 포스트 상세 정보 팝업 */}
        <Sheet open={isPostSheetOpen} onOpenChange={setIsPostSheetOpen}>
          <SheetContent className="w-[400px] sm:w-[540px] max-h-[100vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold text-left">
                📝 메르의 포스트 상세정보
              </SheetTitle>
            </SheetHeader>
            {selectedPost && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-primary">
                    {selectedPost.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedPost.created_date).toLocaleDateString('ko-KR')}
                    </span>
                    {selectedPost.views && selectedPost.views > 0 && (
                      <span>{selectedPost.views.toLocaleString()} 조회</span>
                    )}
                    {selectedPost.category && (
                      <Badge variant="outline">{selectedPost.category}</Badge>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-primary">
                  <p className="text-sm leading-relaxed">
                    {selectedPost.excerpt}
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    💡 {stockName}이(가) 언급된 포스트입니다
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsPostSheetOpen(false)}
                    >
                      닫기
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        window.open(`/merry/${selectedPost.id}`, '_blank');
                      }}
                    >
                      전체 포스트 보기 →
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}