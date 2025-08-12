'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  const [loading, setLoading] = useState(true);
  const [priceChange, setPriceChange] = useState<{ 
    value: number; 
    percentage: number; 
    isPositive: boolean; 
  } | null>(null);

  useEffect(() => {
    generatePriceHistory();
  }, [ticker, recentPosts, currentPrice]);

  const generatePriceHistory = async () => {
    try {
      const chartData: PricePoint[] = [];

      // 실제 주식 가격 API 호출
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

        // recentPosts에서 실제 언급 날짜들에 메타데이터 추가
        if (recentPosts && recentPosts.length > 0) {
          recentPosts.forEach((post) => {
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

      // 실제 데이터가 없으면 빈 배열로 설정
      if (chartData.length === 0) {
        setPriceData([]);
      } else {
        setPriceData(chartData);
      }
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
      // Yahoo Finance 우회 API 사용 (CORS 문제 해결)
      const response = await fetch(`/api/stock-price?ticker=${ticker}.KS&period=1y`);
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
      const response = await fetch(`/api/stock-price?ticker=${ticker}&period=1y`);
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
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="font-semibold">{formatDate(label)}</p>
          <p className="text-lg font-bold text-primary">
            {formatPrice(payload[0].value)}
          </p>
          {data.postTitle && !data.isCurrentPrice && (
            <p className="text-sm text-muted-foreground mt-1 max-w-48">
              📝 {data.postTitle}
            </p>
          )}
          {data.isCurrentPrice && (
            <p className="text-sm text-green-600 font-medium">
              🔥 현재가
            </p>
          )}
        </div>
      );
    }
    return null;
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
                현재 {stockName}({ticker})의 가격 정보를<br />
                가져올 수 없습니다.
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
          메르가 언급한 시점의 가격 변화 추이
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                className="text-xs"
              />
              <YAxis 
                tickFormatter={(value) => formatPrice(value)}
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#2563eb" 
                strokeWidth={3}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.postTitle && !payload.isCurrentPrice) {
                    // 언급된 날짜는 더 큰 점으로 표시
                    return <circle cx={cx} cy={cy} r={6} fill="#dc2626" stroke="#ffffff" strokeWidth={2} />;
                  } else if (payload.isCurrentPrice) {
                    // 현재가는 특별한 점으로 표시
                    return <circle cx={cx} cy={cy} r={7} fill="#16a34a" stroke="#ffffff" strokeWidth={3} />;
                  }
                  // 일반 월별 포인트는 작은 점
                  return <circle cx={cx} cy={cy} r={3} fill="#2563eb" stroke="#ffffff" strokeWidth={1} />;
                }}
                activeDot={{ r: 8, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
                name="주가"
              />
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
              {recentPosts.length}개
            </div>
            <div className="text-sm text-muted-foreground">언급 포스트</div>
            <div className="text-xs text-muted-foreground mt-1">
              <Calendar className="w-3 h-3 inline mr-1" />
              {priceData.length - 1}회 언급
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}