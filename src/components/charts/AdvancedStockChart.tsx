'use client';

/**
 * 📊 고급 인터랙티브 주식 차트 - TradingView 수준의 차트
 * 실시간 데이터 + 기술적 지표 + 감정 오버레이
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
  ComposedChart,
  ReferenceLine,
  ReferenceArea,
  Brush
} from 'recharts';
import { format } from 'date-fns';

interface ChartDataPoint {
  date: string;
  timestamp: number;
  price: number;
  volume: number;
  sentiment: number;
  mentions: number;
  sma20?: number;
  sma50?: number;
  bollinger_upper?: number;
  bollinger_lower?: number;
  rsi?: number;
  macd?: number;
  signal?: number;
  events?: Array<{
    type: 'mention' | 'news' | 'earnings' | 'alert';
    title: string;
    description: string;
    sentiment?: number;
  }>;
}

interface ChartConfig {
  showVolume: boolean;
  showSentiment: boolean;
  showSMA20: boolean;
  showSMA50: boolean;
  showBollingerBands: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showEvents: boolean;
  timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';
  chartType: 'line' | 'candlestick' | 'area';
  sentimentOverlay: 'heatmap' | 'line' | 'none';
  realTimeUpdates: boolean;
}

interface Props {
  ticker: string;
  data: ChartDataPoint[];
  config?: Partial<ChartConfig>;
  onConfigChange?: (config: ChartConfig) => void;
  height?: number;
  width?: string;
  className?: string;
}

const DEFAULT_CONFIG: ChartConfig = {
  showVolume: true,
  showSentiment: true,
  showSMA20: true,
  showSMA50: true,
  showBollingerBands: false,
  showRSI: false,
  showMACD: false,
  showEvents: true,
  timeframe: '3M',
  chartType: 'line',
  sentimentOverlay: 'heatmap',
  realTimeUpdates: true
};

export const AdvancedStockChart: React.FC<Props> = ({
  ticker,
  data,
  config: propConfig = {},
  onConfigChange,
  height = 600,
  width = '100%',
  className = ''
}) => {
  const [config, setConfig] = useState<ChartConfig>({ ...DEFAULT_CONFIG, ...propConfig });
  const [selectedRange, setSelectedRange] = useState<{ start?: number; end?: number }>({});
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);
  const [zoom, setZoom] = useState({ start: 0, end: 100 });
  const chartRef = useRef<HTMLDivElement>(null);

  // 📊 차트 데이터 전처리
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((point, index) => {
      const processed = { ...point };

      // 이동평균선 계산
      if (config.showSMA20 && index >= 19) {
        const sma20Data = data.slice(index - 19, index + 1);
        processed.sma20 = sma20Data.reduce((sum, p) => sum + p.price, 0) / 20;
      }

      if (config.showSMA50 && index >= 49) {
        const sma50Data = data.slice(index - 49, index + 1);
        processed.sma50 = sma50Data.reduce((sum, p) => sum + p.price, 0) / 50;
      }

      // 볼린저 밴드 계산
      if (config.showBollingerBands && index >= 19) {
        const period = 20;
        const bandData = data.slice(index - period + 1, index + 1);
        const sma = bandData.reduce((sum, p) => sum + p.price, 0) / period;
        const variance = bandData.reduce((sum, p) => sum + Math.pow(p.price - sma, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        
        processed.bollinger_upper = sma + (stdDev * 2);
        processed.bollinger_lower = sma - (stdDev * 2);
      }

      // RSI 계산 (간단화)
      if (config.showRSI && index >= 14) {
        const period = 14;
        const changes = data.slice(index - period, index + 1).map((p, i, arr) => 
          i > 0 ? p.price - arr[i - 1].price : 0
        ).slice(1);
        
        const gains = changes.filter(c => c > 0);
        const losses = changes.filter(c => c < 0).map(c => -c);
        
        const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
        const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
        
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        processed.rsi = 100 - (100 / (1 + rs));
      }

      return processed;
    });
  }, [data, config]);

  // 🎨 감정 히트맵 색상 계산
  const getSentimentColor = (sentiment: number): string => {
    if (sentiment > 0.5) return '#10B981'; // 매우 긍정 - 녹색
    if (sentiment > 0.2) return '#34D399'; // 긍정 - 연한 녹색
    if (sentiment > -0.2) return '#6B7280'; // 중립 - 회색
    if (sentiment > -0.5) return '#F87171'; // 부정 - 연한 빨강
    return '#EF4444'; // 매우 부정 - 빨강
  };

  // 📈 메인 차트 컴포넌트
  const MainChart = () => {
    const ChartComponent = config.chartType === 'area' ? AreaChart : LineChart;
    
    return (
      <ResponsiveContainer width="100%" height={height * 0.6}>
        <ComposedChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="date"
            tickFormatter={(value) => format(new Date(value), 'MM/dd')}
            stroke="#9CA3AF"
            fontSize={12}
          />
          <YAxis 
            domain={['dataMin - 1', 'dataMax + 1']}
            stroke="#9CA3AF"
            fontSize={12}
            yAxisId="price"
          />
          
          {/* 볼린저 밴드 */}
          {config.showBollingerBands && (
            <>
              <Area
                type="monotone"
                dataKey="bollinger_upper"
                stroke="#9333EA"
                fill="#9333EA"
                fillOpacity={0.1}
                yAxisId="price"
              />
              <Area
                type="monotone"
                dataKey="bollinger_lower"
                stroke="#9333EA"
                fill="#9333EA"
                fillOpacity={0.1}
                yAxisId="price"
              />
            </>
          )}

          {/* 이동평균선 */}
          {config.showSMA20 && (
            <Line
              type="monotone"
              dataKey="sma20"
              stroke="#F59E0B"
              strokeWidth={1.5}
              dot={false}
              yAxisId="price"
            />
          )}
          {config.showSMA50 && (
            <Line
              type="monotone"
              dataKey="sma50"
              stroke="#EF4444"
              strokeWidth={1.5}
              dot={false}
              yAxisId="price"
            />
          )}

          {/* 메인 가격 라인 */}
          {config.chartType === 'area' ? (
            <Area
              type="monotone"
              dataKey="price"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.2}
              strokeWidth={2}
              yAxisId="price"
            />
          ) : (
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              yAxisId="price"
            />
          )}

          {/* 감정 오버레이 */}
          {config.showSentiment && config.sentimentOverlay === 'line' && (
            <Line
              type="monotone"
              dataKey="sentiment"
              stroke="#10B981"
              strokeWidth={1}
              dot={false}
              yAxisId="sentiment"
            />
          )}

          {/* 이벤트 마커 */}
          {config.showEvents && processedData.map((point, index) => 
            point.events && point.events.length > 0 ? (
              <ReferenceLine
                key={index}
                x={point.date}
                stroke="#F59E0B"
                strokeDasharray="2 2"
                yAxisId="price"
              />
            ) : null
          )}

          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* 줌/브러시 */}
          <Brush dataKey="date" height={30} stroke="#3B82F6" />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  // 📊 볼륨 차트
  const VolumeChart = () => (
    <ResponsiveContainer width="100%" height={height * 0.2}>
      <BarChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis 
          dataKey="date"
          tickFormatter={(value) => format(new Date(value), 'MM/dd')}
          stroke="#9CA3AF"
          fontSize={10}
        />
        <YAxis stroke="#9CA3AF" fontSize={10} />
        <Bar dataKey="volume" fill="#6B7280" opacity={0.7} />
        <Tooltip 
          formatter={(value: any) => [new Intl.NumberFormat().format(value), 'Volume']}
          labelFormatter={(label) => format(new Date(label), 'yyyy-MM-dd')}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  // 📈 RSI 차트
  const RSIChart = () => (
    <ResponsiveContainer width="100%" height={height * 0.15}>
      <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis 
          dataKey="date"
          tickFormatter={(value) => format(new Date(value), 'MM/dd')}
          stroke="#9CA3AF"
          fontSize={10}
        />
        <YAxis domain={[0, 100]} stroke="#9CA3AF" fontSize={10} />
        <Line type="monotone" dataKey="rsi" stroke="#8B5CF6" strokeWidth={1.5} dot={false} />
        <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="2 2" />
        <ReferenceLine y={30} stroke="#10B981" strokeDasharray="2 2" />
        <Tooltip 
          formatter={(value: any) => [value?.toFixed(2), 'RSI']}
          labelFormatter={(label) => format(new Date(label), 'yyyy-MM-dd')}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  // 🛠️ 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 shadow-xl">
        <p className="text-white font-semibold mb-2">
          {format(new Date(label), 'yyyy-MM-dd HH:mm')}
        </p>
        
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Price:</span>
            <span className={`font-mono ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              ${data.price?.toFixed(2)}
            </span>
          </div>
          
          {data.volume && (
            <div className="flex justify-between">
              <span className="text-gray-400">Volume:</span>
              <span className="text-white font-mono">
                {new Intl.NumberFormat().format(data.volume)}
              </span>
            </div>
          )}
          
          {config.showSentiment && data.sentiment !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-400">Sentiment:</span>
              <span 
                className="font-mono"
                style={{ color: getSentimentColor(data.sentiment) }}
              >
                {(data.sentiment * 100).toFixed(1)}%
              </span>
            </div>
          )}
          
          {data.mentions && (
            <div className="flex justify-between">
              <span className="text-gray-400">Mentions:</span>
              <span className="text-white font-mono">{data.mentions}</span>
            </div>
          )}
          
          {data.sma20 && (
            <div className="flex justify-between">
              <span className="text-gray-400">SMA 20:</span>
              <span className="text-orange-400 font-mono">
                ${data.sma20.toFixed(2)}
              </span>
            </div>
          )}
          
          {data.sma50 && (
            <div className="flex justify-between">
              <span className="text-gray-400">SMA 50:</span>
              <span className="text-red-400 font-mono">
                ${data.sma50.toFixed(2)}
              </span>
            </div>
          )}
          
          {data.rsi && (
            <div className="flex justify-between">
              <span className="text-gray-400">RSI:</span>
              <span className="text-purple-400 font-mono">
                {data.rsi.toFixed(1)}
              </span>
            </div>
          )}
        </div>
        
        {/* 이벤트 정보 */}
        {data.events && data.events.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-700">
            <p className="text-yellow-400 text-xs font-semibold mb-1">Events:</p>
            {data.events.map((event: any, index: number) => (
              <div key={index} className="text-xs text-gray-300">
                • {event.title}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ⚙️ 설정 패널
  const ConfigPanel = () => (
    <div className="bg-gray-800 p-4 rounded-lg mb-4">
      <h3 className="text-white font-semibold mb-3">Chart Settings</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 시간프레임 */}
        <div>
          <label className="text-gray-400 text-sm block mb-1">Timeframe</label>
          <select 
            value={config.timeframe}
            onChange={(e) => updateConfig({ timeframe: e.target.value as any })}
            className="w-full p-2 bg-gray-700 text-white rounded text-sm"
          >
            <option value="1D">1 Day</option>
            <option value="1W">1 Week</option>
            <option value="1M">1 Month</option>
            <option value="3M">3 Months</option>
            <option value="6M">6 Months</option>
            <option value="1Y">1 Year</option>
          </select>
        </div>

        {/* 차트 타입 */}
        <div>
          <label className="text-gray-400 text-sm block mb-1">Chart Type</label>
          <select 
            value={config.chartType}
            onChange={(e) => updateConfig({ chartType: e.target.value as any })}
            className="w-full p-2 bg-gray-700 text-white rounded text-sm"
          >
            <option value="line">Line</option>
            <option value="area">Area</option>
            <option value="candlestick">Candlestick</option>
          </select>
        </div>

        {/* 감정 오버레이 */}
        <div>
          <label className="text-gray-400 text-sm block mb-1">Sentiment</label>
          <select 
            value={config.sentimentOverlay}
            onChange={(e) => updateConfig({ sentimentOverlay: e.target.value as any })}
            className="w-full p-2 bg-gray-700 text-white rounded text-sm"
          >
            <option value="none">None</option>
            <option value="line">Line</option>
            <option value="heatmap">Heatmap</option>
          </select>
        </div>
      </div>

      {/* 기술적 지표 토글 */}
      <div className="mt-4">
        <label className="text-gray-400 text-sm block mb-2">Technical Indicators</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries({
            showVolume: 'Volume',
            showSMA20: 'SMA 20',
            showSMA50: 'SMA 50',
            showBollingerBands: 'Bollinger Bands',
            showRSI: 'RSI',
            showMACD: 'MACD',
            showEvents: 'Events'
          }).map(([key, label]) => (
            <label key={key} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config[key as keyof ChartConfig] as boolean}
                onChange={(e) => updateConfig({ [key]: e.target.checked })}
                className="rounded"
              />
              <span className="text-gray-300 text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const updateConfig = (updates: Partial<ChartConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  return (
    <div className={`w-full ${className}`} ref={chartRef}>
      {/* 설정 패널 */}
      <ConfigPanel />
      
      {/* 차트 제목 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">
          {ticker} - Advanced Chart Analysis
        </h2>
        <div className="flex items-center space-x-2">
          {config.realTimeUpdates && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* 메인 차트 */}
      <div className="bg-gray-900 p-4 rounded-lg mb-4">
        <MainChart />
      </div>

      {/* 볼륨 차트 */}
      {config.showVolume && (
        <div className="bg-gray-900 p-4 rounded-lg mb-4">
          <h3 className="text-white font-semibold mb-2">Volume</h3>
          <VolumeChart />
        </div>
      )}

      {/* RSI 차트 */}
      {config.showRSI && (
        <div className="bg-gray-900 p-4 rounded-lg mb-4">
          <h3 className="text-white font-semibold mb-2">RSI (14)</h3>
          <RSIChart />
        </div>
      )}

      {/* 차트 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {hoveredPoint && (
          <>
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-gray-400 text-sm">Current Price</div>
              <div className="text-white font-bold text-lg">
                ${hoveredPoint.price.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-gray-400 text-sm">Volume</div>
              <div className="text-white font-bold text-lg">
                {new Intl.NumberFormat().format(hoveredPoint.volume)}
              </div>
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-gray-400 text-sm">Sentiment</div>
              <div 
                className="font-bold text-lg"
                style={{ color: getSentimentColor(hoveredPoint.sentiment) }}
              >
                {(hoveredPoint.sentiment * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-gray-400 text-sm">Mentions</div>
              <div className="text-white font-bold text-lg">
                {hoveredPoint.mentions}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdvancedStockChart;