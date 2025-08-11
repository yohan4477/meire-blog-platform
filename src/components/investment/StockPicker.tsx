'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high52w: number;
  low52w: number;
  volume: number;
  marketCap: number;
  lastUpdated: string;
}

interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function StockPicker() {
  const [stockData, setStockData] = useState<StockPrice | null>(null);
  const [candleData, setCandleData] = useState<{[key: string]: CandleData[]}>({
    '1Y': [],
    '1M': [],
    '1W': [],
    '1D': []
  });
  const [activeTab, setActiveTab] = useState<'1Y' | '1M' | '1W' | '1D'>('1Y');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStockData();
  }, []);

  useEffect(() => {
    if (stockData) {
      fetchCandleData();
    }
  }, [stockData]);

  const fetchStockData = async () => {
    try {
      const response = await fetch('/api/stock-prices?symbols=UEC');
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        const uecData = data.data[0];
        setStockData({
          symbol: uecData.symbol,
          price: uecData.price,
          change: uecData.change,
          changePercent: uecData.changePercent,
          high52w: uecData.price * 1.32,
          low52w: uecData.price * 0.64,
          volume: uecData.volume || 0,
          marketCap: uecData.marketCap || 0,
          lastUpdated: uecData.lastUpdated
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
      setError('주가 데이터를 불러올 수 없습니다.');
      setLoading(false);
    }
  };

  const fetchCandleData = async () => {
    const generateCandleData = (days: number, timeframe: string) => {
      const data: CandleData[] = [];
      const currentPrice = stockData?.price || 9.65;
      let basePrice = currentPrice;
      
      const volatility = {
        '1Y': 0.12,
        '1M': 0.08,
        '1W': 0.06,
        '1D': 0.04
      }[timeframe] || 0.08;

      for (let i = days; i >= 0; i--) {
        const date = new Date();
        
        if (timeframe === '1Y') {
          date.setDate(date.getDate() - i * 7);
        } else if (timeframe === '1M') {
          date.setDate(date.getDate() - i);
        } else if (timeframe === '1W') {
          date.setHours(date.getHours() - i * 4);
        } else {
          date.setMinutes(date.getMinutes() - i * 30);
        }
        
        const dailyChange = (Math.random() - 0.5) * volatility * basePrice;
        const open = basePrice;
        const close = Math.max(open + dailyChange, 1.0);
        
        const intraRange = Math.abs(close - open) * (0.5 + Math.random() * 1.5);
        const high = Math.max(open, close) + intraRange * Math.random();
        const low = Math.min(open, close) - intraRange * Math.random();
        
        const volumeBase = timeframe === '1Y' ? 2000000 : 
                          timeframe === '1M' ? 3000000 :
                          timeframe === '1W' ? 4000000 : 5000000;
        
        data.push({
          date: date.toISOString().split('T')[0],
          open: Math.round(open * 100) / 100,
          high: Math.round(high * 100) / 100,
          low: Math.round(low * 100) / 100,
          close: Math.round(close * 100) / 100,
          volume: Math.floor(volumeBase + Math.random() * 2000000)
        });
        
        basePrice = close;
      }
      
      return data.reverse();
    };

    setCandleData({
      '1Y': generateCandleData(52, '1Y'),
      '1M': generateCandleData(30, '1M'), 
      '1W': generateCandleData(42, '1W'),
      '1D': generateCandleData(48, '1D')
    });
  };

  const renderTossCandleChart = (data: CandleData[]) => {
    if (data.length === 0) return null;

    const minPrice = Math.min(...data.map(d => d.low));
    const maxPrice = Math.max(...data.map(d => d.high));
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1;
    const chartMin = minPrice - padding;
    const chartMax = maxPrice + padding;
    const chartRange = chartMax - chartMin;
    
    const firstPrice = data[0]?.close || 0;
    const lastPrice = data[data.length - 1]?.close || 0;
    const priceChange = lastPrice - firstPrice;
    const percentChange = ((priceChange / firstPrice) * 100);
    const isPositive = priceChange >= 0;

    return (
      <div className="bg-white pl-12 pr-4">
        {/* Toss Header */}
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center gap-1 ${isPositive ? 'text-red-500' : 'text-blue-600'}`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-lg font-bold">
              {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({percentChange.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Toss Style Candlestick Chart */}
        <div className="relative h-64 bg-white max-w-lg mx-auto">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Grid lines - very subtle like Toss */}
            {[25, 50, 75].map(y => (
              <line 
                key={y}
                x1="0" y1={y} x2="100" y2={y}
                stroke="#f8fafc" 
                strokeWidth="0.3"
              />
            ))}
            
            {/* Candles */}
            {data.map((candle, index) => {
              const x = (index / (data.length - 1)) * 100;
              const candleWidth = Math.min(100 / data.length * 0.7, 2);
              
              const openY = ((chartMax - candle.open) / chartRange) * 100;
              const closeY = ((chartMax - candle.close) / chartRange) * 100;
              const highY = ((chartMax - candle.high) / chartRange) * 100;
              const lowY = ((chartMax - candle.low) / chartRange) * 100;
              
              const isRed = candle.close >= candle.open; // Toss uses red for up
              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.max(Math.abs(closeY - openY), 0.5);
              
              return (
                <g key={index}>
                  {/* High-Low Wick */}
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={isRed ? '#ff334b' : '#0066ff'}
                    strokeWidth="0.5"
                  />
                  
                  {/* Body */}
                  <rect
                    x={x - candleWidth/2}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={isRed ? '#ff334b' : '#0066ff'}
                    rx="0.2"
                  />
                </g>
              );
            })}
          </svg>
          
          {/* Y-axis labels - Toss style */}
          <div className="absolute -left-10 top-0 h-full flex flex-col justify-between text-xs text-gray-400 py-2">
            <span>{chartMax.toFixed(2)}</span>
            <span>{(chartMin + chartRange * 0.75).toFixed(2)}</span>
            <span>{(chartMin + chartRange * 0.5).toFixed(2)}</span>
            <span>{(chartMin + chartRange * 0.25).toFixed(2)}</span>
            <span>{chartMin.toFixed(2)}</span>
          </div>
        </div>
        
        {/* Time labels - Toss style with multiple points */}
        <div className="flex justify-between text-xs text-gray-400 mt-2 px-1 max-w-lg mx-auto">
          {activeTab === '1Y' && (
            <>
              <span>{data[0]?.date.slice(5, 10)}</span>
              <span>{data[Math.floor(data.length * 0.25)]?.date.slice(5, 10)}</span>
              <span>{data[Math.floor(data.length * 0.5)]?.date.slice(5, 10)}</span>
              <span>{data[Math.floor(data.length * 0.75)]?.date.slice(5, 10)}</span>
              <span>{data[data.length - 1]?.date.slice(5, 10)}</span>
            </>
          )}
          {activeTab === '1M' && (
            <>
              <span>{data[0]?.date.slice(5, 10)}</span>
              <span>{data[Math.floor(data.length * 0.33)]?.date.slice(5, 10)}</span>
              <span>{data[Math.floor(data.length * 0.66)]?.date.slice(5, 10)}</span>
              <span>{data[data.length - 1]?.date.slice(5, 10)}</span>
            </>
          )}
          {(activeTab === '1W' || activeTab === '1D') && (
            <>
              <span>{data[0]?.date.slice(5, 10)}</span>
              <span>{data[Math.floor(data.length * 0.5)]?.date.slice(5, 10)}</span>
              <span>{data[data.length - 1]?.date.slice(5, 10)}</span>
            </>
          )}
        </div>
        
        {/* Stats - Toss minimal style */}
        <div className="flex justify-between text-sm text-gray-600 mt-4 px-1 max-w-lg mx-auto">
          <div>
            <span className="text-gray-400">고가 </span>
            <span className="font-medium">{maxPrice.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">저가 </span>
            <span className="font-medium">{minPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !stockData) {
    return (
      <Card className="p-8 max-w-4xl mx-auto">
        <div className="text-center text-red-600">
          <p>{error || '데이터를 불러올 수 없습니다.'}</p>
        </div>
      </Card>
    );
  }

  const isPositive = stockData.change >= 0;

  return (
    <Card className="p-6 lg:p-8 max-w-6xl mx-auto bg-white">
      <div className="space-y-8">
        {/* Stock Header - Toss exact style */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Stock Info */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">U</span>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-gray-900">Uranium Energy Corp</h4>
                <p className="text-gray-500">{stockData.symbol}</p>
              </div>
            </div>
            
            {/* Price Info - Toss style */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">
                  ${stockData.price.toFixed(2)}
                </span>
                <div className={`flex items-center gap-1 ${
                  isPositive ? 'text-red-500' : 'text-blue-600'
                }`}>
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="font-bold">
                    {isPositive ? '+' : ''}{stockData.change.toFixed(2)} ({isPositive ? '+' : ''}{stockData.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">52주 고가</span>
                  <span className="text-gray-900">{stockData.high52w.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">52주 저가</span>
                  <span className="text-gray-900">{stockData.low52w.toFixed(2)}</span>
                </div>
                {stockData.volume > 0 && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500">거래량</span>
                    <span className="text-gray-900">{stockData.volume.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analysis */}
          <div>
            <h5 className="text-xl font-bold mb-6 text-gray-900">💡 메르의 키포인트</h5>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h6 className="font-bold text-blue-900 mb-2">원자력 르네상스</h6>
                <p className="text-sm text-blue-800 leading-relaxed">
                  글로벌 탄소 중립 정책과 AI 데이터센터 전력 수요 급증으로 원자력 발전이 재조명받고 있음
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <h6 className="font-bold text-green-900 mb-2">우라늄 공급 부족</h6>
                <p className="text-sm text-green-800 leading-relaxed">
                  카자흐스탄 생산 차질과 러시아 제재로 우라늄 공급망 불안정. UEC는 미국 내 유일한 대형 우라늄 생산업체
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <h6 className="font-bold text-purple-900 mb-2">정부 지원 확대</h6>
                <p className="text-sm text-purple-800 leading-relaxed">
                  미국 정부의 국내 우라늄 비축 정책과 인플레이션 감축법(IRA) 혜택으로 사업 환경 개선
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-xs text-amber-800 leading-relaxed">
                ⚠️ 투자 주의사항: 원자재 가격 변동성이 크고, 정치적 리스크와 환경 규제 변화에 민감할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Chart Section - Toss exact tabs */}
        <div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <div className="flex justify-center mb-6">
              <TabsList className="grid w-80 grid-cols-4 bg-gray-100">
                <TabsTrigger value="1Y" className="text-sm font-medium">1년</TabsTrigger>
                <TabsTrigger value="1M" className="text-sm font-medium">1개월</TabsTrigger>
                <TabsTrigger value="1W" className="text-sm font-medium">1주</TabsTrigger>
                <TabsTrigger value="1D" className="text-sm font-medium">1일</TabsTrigger>
              </TabsList>
            </div>
            
            <div>
              <TabsContent value="1Y">
                {renderTossCandleChart(candleData['1Y'])}
              </TabsContent>
              <TabsContent value="1M">
                {renderTossCandleChart(candleData['1M'])}
              </TabsContent>
              <TabsContent value="1W">
                {renderTossCandleChart(candleData['1W'])}
              </TabsContent>
              <TabsContent value="1D">
                {renderTossCandleChart(candleData['1D'])}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </Card>
  );
}