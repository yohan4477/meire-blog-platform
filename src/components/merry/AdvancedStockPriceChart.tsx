'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { safeApiCall } from '@/components/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  BarChart3, 
  Activity, 
  AlertCircle, 
  RefreshCw, 
  Pause, 
  Play, 
  Globe, 
  Target
} from 'lucide-react';
import { StockPriceService } from '@/services/StockPriceService';
import { HistoricalPrice, StockMention } from '@/types/stock';

interface AdvancedChartDataPoint {
  date: string;
  timestamp: number;
  price: number;
  close: number;
  isActualPrice: boolean;
  hasMention?: boolean;
  postTitle?: string;
  postId?: string;
  sentiment?: number;
  confidence?: number;
  context?: string;
}

interface AdvancedStockPriceChartProps {
  ticker: string;
  stockName: string;
  currency?: string;
  currentPrice?: number;
  recentPosts?: any[];
  allMentions?: StockMention[];
  enableRealtime?: boolean;
  enableGlobalAnalysis?: boolean;
  enableTechnicalIndicators?: boolean;
}

export default function AdvancedStockPriceChart({
  ticker,
  stockName,
  currency = 'USD',
  currentPrice = 0,
  recentPosts = [],
  allMentions = [],
  enableRealtime = true,
  enableGlobalAnalysis = false,
  enableTechnicalIndicators = false,
}: AdvancedStockPriceChartProps) {
  // 📊 Core State Management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalPrice[]>([]);
  const [actualCurrentPrice, setActualCurrentPrice] = useState<number>(0);
  
  // 🎯 Bloomberg Terminal Style State Management
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '2Y'>('6M');
  const [isRealTimeActive, setIsRealTimeActive] = useState(enableRealtime);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const stockService = useMemo(() => new StockPriceService(), []);

  // 🎯 Enhanced Data Loading Pipeline
  useEffect(() => {
    const loadAdvancedData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('🔄 Bloomberg Terminal급 데이터 로딩 시작...');
        
        // 1. 현재 주가 조회 - 프록시 사용 (safeApiCall)
        const currentData = await safeApiCall(async () => {
          const response = await fetch(`/api/merry/stocks/proxy?ticker=${ticker}&range=1d&interval=1d`);
          if (!response.ok) throw new Error('현재가 API 호출 실패');
          return await response.json();
        }, 3, null);
        
        if (currentData) {
          const meta = currentData.chart?.result?.[0]?.meta;
          const currentPrice = meta?.regularMarketPrice || meta?.previousClose;
          if (currentPrice) setActualCurrentPrice(currentPrice);
        } else {
          console.warn('현재가 조회 실패');
          setActualCurrentPrice(0); // 기본값
        }

        // 2. 시간 범위에 따른 과거 데이터 조회
        const range = timeRange === '1D' ? '1d' : 
                     timeRange === '1W' ? '1w' :
                     timeRange === '1M' ? '1mo' :
                     timeRange === '3M' ? '3mo' :
                     timeRange === '6M' ? '6mo' :
                     timeRange === '1Y' ? '1y' : '2y';
                     
        const histData = await safeApiCall(async () => {
          const response = await fetch(`/api/merry/stocks/proxy?ticker=${ticker}&range=${range}&interval=1d`);
          if (!response.ok) throw new Error('과거 데이터 API 호출 실패');
          return await response.json();
        }, 3, null);
        const result = histData?.chart?.result?.[0];
        
        let historical = [];
        if (histData && result?.timestamp && result?.indicators?.quote?.[0]) {
          const timestamps = result.timestamp;
          const closes = result.indicators.quote[0].close;
          
          historical = timestamps
            .map((timestamp, index) => {
              const close = closes[index];
              if (close == null) return null;
              return {
                date: new Date(timestamp * 1000).toISOString().split('T')[0],
                timestamp: timestamp * 1000,
                price: ticker.match(/^\d{6}$/) ? Math.round(close) : parseFloat(close.toFixed(2)),
                currency: ticker.match(/^\d{6}$/) ? 'KRW' : 'USD'
              };
            })
            .filter(item => item !== null)
            .sort((a, b) => a.timestamp - b.timestamp);
        }
        
        console.log(`✅ Historical data processed: ${historical.length} points`);
        setHistoricalData(historical);
        
        console.log('✅ 모든 고급 데이터 로딩 완료');

      } catch (err) {
        console.error('❌ Bloomberg Terminal 데이터 로딩 실패:', err);
        setError(err instanceof Error ? err.message : '고급 차트 데이터를 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    };

    if (ticker) {
      loadAdvancedData();
    }
  }, [ticker, stockService, timeRange, isRealTimeActive]);

  // 📊 Enhanced Chart Data with All Advanced Features
  const advancedChartData = useMemo(() => {
    console.log(`🔍 Chart Data Debug: historicalData.length=${historicalData.length}, timeRange=${timeRange}`);
    
    if (!historicalData.length) {
      console.log('❌ No historical data available');
      return [];
    }

    const mentionsToCheck = allMentions.length > 0 ? allMentions : recentPosts;
    console.log(`📝 Mentions to check: ${mentionsToCheck.length}`);
    const mentionsByDate = new Map<string, any>();
    
    // 언급 데이터를 날짜별로 매핑
    mentionsToCheck.forEach(mention => {
      let date: string;
      if (mention.date && typeof mention.date === 'number') {
        date = new Date(mention.date).toISOString().split('T')[0];
      } else if (mention.date && typeof mention.date === 'string') {
        date = new Date(mention.date).toISOString().split('T')[0];
      } else if (mention.created_date) {
        date = new Date(mention.created_date).toISOString().split('T')[0];
      } else {
        return;
      }
      
      mentionsByDate.set(date, mention);
    });

    console.log(`📅 Mentions mapped by date: ${mentionsByDate.size} dates`);

    // 실제 주가 데이터를 기준으로 차트 데이터 생성
    const baseDataPoints: AdvancedChartDataPoint[] = historicalData.map(priceData => {
      const mention = mentionsByDate.get(priceData.date);
      
      return {
        date: priceData.date,
        timestamp: priceData.timestamp,
        price: priceData.price,
        close: priceData.price,
        isActualPrice: true,
        hasMention: !!mention,
        postTitle: mention?.title,
        postId: mention?.postId,
        sentiment: mention?.sentiment,
        confidence: mention?.confidence,
        context: mention?.context,
      };
    });

    // 최신 현재가로 마지막 포인트 업데이트
    if (baseDataPoints.length > 0 && actualCurrentPrice > 0) {
      const lastPoint = baseDataPoints[baseDataPoints.length - 1];
      const today = new Date().toISOString().split('T')[0];
      
      if (lastPoint.date === today) {
        lastPoint.price = actualCurrentPrice;
        lastPoint.close = actualCurrentPrice;
      } else {
        baseDataPoints.push({
          date: today,
          timestamp: Date.now(),
          price: actualCurrentPrice,
          close: actualCurrentPrice,
          isActualPrice: true,
          hasMention: false
        });
      }
    }

    // 시간 범위 필터링
    const rangeStart = (() => {
      const now = Date.now();
      switch (timeRange) {
        case '1D': return now - (1 * 24 * 60 * 60 * 1000);
        case '1W': return now - (7 * 24 * 60 * 60 * 1000);
        case '1M': return now - (30 * 24 * 60 * 60 * 1000);
        case '3M': return now - (90 * 24 * 60 * 60 * 1000);
        case '6M': return now - (180 * 24 * 60 * 60 * 1000);
        case '1Y': return now - (365 * 24 * 60 * 60 * 1000);
        case '2Y': return now - (730 * 24 * 60 * 60 * 1000);
        default: return now - (180 * 24 * 60 * 60 * 1000);
      }
    })();
    
    const filteredData = baseDataPoints
      .filter(point => point.timestamp >= rangeStart)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`📊 Filtered chart data: ${filteredData.length} points for ${timeRange} range`);
    const mentionCount = filteredData.filter(p => p.hasMention).length;
    console.log(`📝 Mentions in filtered data: ${mentionCount}`);
    console.log(`✅ Final chart data: ${filteredData.length} points`);
    
    return filteredData;
  }, [
    historicalData, 
    allMentions, 
    recentPosts, 
    actualCurrentPrice, 
    timeRange
  ]);

  // 📊 통계 계산
  const advancedStats = useMemo(() => {
    const dataPoints = advancedChartData.length;
    const mentions = advancedChartData.filter(p => p.hasMention).length;
    const priceChange = dataPoints > 1 ? 
      ((advancedChartData[dataPoints - 1].price - advancedChartData[0].price) / advancedChartData[0].price) * 100 : 0;
    
    return {
      dataPoints,
      mentions,
      priceChange,
      lastUpdate
    };
  }, [advancedChartData, lastUpdate]);

  // 🔥 메르의 요구사항: 특정 날짜만 툴팁 표시
  const ProfessionalTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as AdvancedChartDataPoint;
      const isToday = data.date === new Date().toISOString().split('T')[0];
      const isMentionedByMeire = data.hasMention; // 메르가 언급한 날짜
      
      // 메르 요구사항: 메르 언급일과 오늘이 아니면 툴팁 표시 안함
      if (!isToday && !isMentionedByMeire) {
        return null;
      }
      
      return (
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl p-4 rounded-lg shadow-lg border">
          <div className="text-sm font-semibold mb-2">
            {new Date(data.date).toLocaleDateString('ko-KR')}
          </div>
          <div className="text-lg font-bold">
            {currency === 'USD' ? '$' : '₩'}{data.price.toLocaleString()}
          </div>
          {data.hasMention && (
            <div className="text-sm text-red-600 mt-2">
              🔴 메르 언급일
            </div>
          )}
          {isToday && (
            <div className="text-sm text-green-600 mt-2">
              🟢 오늘
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // 📱 Loading State
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">차트 데이터 로딩 중...</h3>
            <p className="text-sm text-gray-600">{stockName}의 {timeRange} 데이터를 불러오고 있습니다</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ❌ Error State
  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2 text-red-700">차트 로딩 실패</h3>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 📊 No Data State
  console.log(`🔍 Render condition check: advancedChartData.length=${advancedChartData.length}, loading=${loading}, error=${error}`);
  
  if (advancedChartData.length === 0 && !loading) {
    console.log('❌ Showing no data state');
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-lg font-semibold mb-2">데이터 준비 중</h3>
            <p className="text-sm text-gray-600">6개월 차트 데이터를 준비하고 있습니다</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 🎯 Main Chart
  console.log('✅ Rendering main chart with data:', advancedChartData.length, 'points');
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <span className="font-bold text-xl">{stockName}</span>
            <Badge variant="outline">6개월 차트</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1D">1D</SelectItem>
                <SelectItem value="1W">1W</SelectItem>
                <SelectItem value="1M">1M</SelectItem>
                <SelectItem value="3M">3M</SelectItem>
                <SelectItem value="6M">6M</SelectItem>
                <SelectItem value="1Y">1Y</SelectItem>
                <SelectItem value="2Y">2Y</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          데이터 포인트: {advancedStats.dataPoints}개 | 메르 언급: {advancedStats.mentions}개 | 
          변화율: {advancedStats.priceChange > 0 ? '+' : ''}{advancedStats.priceChange.toFixed(2)}%
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={advancedChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                }}
                interval={Math.floor(advancedChartData.length / 4)}
                minTickGap={80}
              />
              <YAxis 
                tickFormatter={(value) => 
                  currency === 'USD' ? `$${value}` : `₩${value.toLocaleString()}`
                }
              />
              <Tooltip content={<ProfessionalTooltip />} />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={false}
                activeDot={(props: any) => {
                  const { payload } = props;
                  if (payload?.hasMention || payload?.date === new Date().toISOString().split('T')[0]) {
                    return <circle {...props} r={6} fill={payload?.hasMention ? "#ef4444" : "#10b981"} />;
                  }
                  return null;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 text-center">
          🔴 빨간 점: 메르 언급일 | 🟢 초록 점: 오늘 | API 수정 완료: 실제 6개월 데이터 사용 중
        </div>
      </CardContent>
    </Card>
  );
}