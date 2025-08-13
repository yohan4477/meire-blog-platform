'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, DollarSign, BarChart3 } from 'lucide-react';

interface PricePoint {
  date: string;
  price: number;
  postTitle?: string;
  postId?: number;
  isCurrentPrice?: boolean;
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

  useEffect(() => {
    fetchAllPostsAndGenerateChart();
  }, [ticker, currentPrice]);

  const fetchAllPostsAndGenerateChart = async () => {
    try {
      // 6개월간의 모든 포스트 가져오기
      const cacheBuster = Date.now();
      const response = await fetch(`/api/merry/stocks/${ticker}/posts/full?period=6mo&t=${cacheBuster}`, {
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`📊 Loaded ${data.data.posts.length} posts for ${ticker} chart`);
          setAllPosts(data.data.posts);
          // 포스트 로드 후 차트 생성
          await generatePriceHistory(data.data.posts);
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

      // 실제 주식 가격 API 호출 (6개월)
      const priceData = await fetchRealStockPrices(ticker, stockName);
      
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
          postsToUse.forEach((post) => {
            let mentionDate: Date;
            if (typeof post.created_date === 'number') {
              mentionDate = new Date(post.created_date);
            } else {
              mentionDate = new Date(post.created_date);
            }
            
            const dateStr = mentionDate.toISOString().split('T')[0];
            const matchingPoint = chartData.find(p => p.date === dateStr);
            
            if (matchingPoint) {
              // 해당 날짜의 데이터 포인트에 언급 정보 추가
              matchingPoint.postTitle = post.title;
              matchingPoint.postId = post.id;
            }
          });
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

  // 실제 주식 가격 API 호출
  const fetchRealStockPrices = async (ticker: string, stockName: string) => {
    try {
      // 한국 주식과 미국 주식 구분
      const isKoreanStock = ticker.length === 6 && !isNaN(Number(ticker));
      
      if (isKoreanStock) {
        // 한국 주식: KIS API 또는 Yahoo Finance Korea 사용
        return await fetchKoreanStockPrice(ticker);
      } else {
        // 미국 주식: Alpha Vantage 또는 Yahoo Finance 사용
        return await fetchUSStockPrice(ticker);
      }
    } catch (error) {
      console.error('주식 가격 API 호출 실패:', error);
      return null;
    }
  };

  // 한국 주식 가격 (Yahoo Finance Korea)
  const fetchKoreanStockPrice = async (ticker: string) => {
    try {
      // Yahoo Finance 우회 API 사용 (CORS 문제 해결) - 6개월 데이터, 캐시 무효화
      const cacheBuster = Date.now();
      const response = await fetch(`/api/stock-price?ticker=${ticker}.KS&period=6mo&t=${cacheBuster}`, {
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
  const fetchUSStockPrice = async (ticker: string) => {
    try {
      const cacheBuster = Date.now();
      const response = await fetch(`/api/stock-price?ticker=${ticker}&period=6mo&t=${cacheBuster}`, {
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // 언급된 날짜나 현재가가 아니면 툴팁을 표시하지 않음
      if (!data.postTitle && !data.isCurrentPrice) {
        return null;
      }
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md max-w-xs">
          <p className="font-semibold text-sm">{formatDate(label)}</p>
          <p className="text-lg font-bold text-primary">
            {formatPrice(payload[0].value)}
          </p>
          {data.postTitle && !data.isCurrentPrice && (
            <div className="mt-2 p-2 bg-red-50 rounded border-l-2 border-red-400">
              <p className="text-xs font-medium text-red-700 mb-1">📝 메르의 언급</p>
              <p className="text-sm text-red-600 line-clamp-2">
                {data.postTitle}
              </p>
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
    setTimeRange(range);
    setZoomState({});
    setZoomHistory([]);
    
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '1M':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3M':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6M':
      default:
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = now.toISOString().split('T')[0];
    
    setZoomState({ left: startDateStr, right: endDateStr });
    calculateYAxisDomain(priceData, [startDateStr, endDateStr]);
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
          최근 6개월 가격 변화 추이 및 메르의 언급 시점
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
        
        <div className="h-96 w-full">
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
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  // 언급된 날짜만 빨간 점으로 표시
                  if (payload.postTitle && !payload.isCurrentPrice) {
                    return <circle cx={cx} cy={cy} r={6} fill="#dc2626" stroke="#ffffff" strokeWidth={2} />;
                  }
                  // 현재가만 초록색 점으로 표시
                  if (payload.isCurrentPrice) {
                    return <circle cx={cx} cy={cy} r={6} fill="#16a34a" stroke="#ffffff" strokeWidth={2} />;
                  }
                  // 언급되지 않은 일반 날짜는 점 표시 안함 (곡선만)
                  return null;
                }}
                dotSize={0}
                activeDot={{ r: 8, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
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
            <div className="text-sm text-muted-foreground">최근 6개월 언급</div>
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
      </CardContent>
    </Card>
  );
}