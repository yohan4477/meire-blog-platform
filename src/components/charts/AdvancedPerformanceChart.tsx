'use client';

import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  LineChart,
  AreaChart,
} from 'lucide-react';

export interface PerformanceDataPoint {
  date: string;
  portfolioValue: number;
  dailyReturn: number;
  cumulativeReturn: number;
  benchmark: number;
  volume?: number;
  volatility?: number;
  sharpeRatio?: number;
}

interface AdvancedPerformanceChartProps {
  data: PerformanceDataPoint[];
  title?: string;
  showBenchmark?: boolean;
  showVolume?: boolean;
  showMetrics?: boolean;
  height?: number;
  className?: string;
}

type ChartType = 'line' | 'area' | 'composed';
type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

const AdvancedPerformanceChart: React.FC<AdvancedPerformanceChartProps> = ({
  data,
  title = '포트폴리오 성과 분석',
  showBenchmark = true,
  showVolume = true,
  showMetrics = true,
  height = 400,
  className = '',
}) => {
  const [chartType, setChartType] = useState<ChartType>('composed');
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [showTooltipDetails, setShowTooltipDetails] = useState(true);

  // 시간 범위에 따른 데이터 필터링
  const filteredData = useMemo(() => {
    if (!data.length) return [];

    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case '1D':
        startDate.setDate(now.getDate() - 1);
        break;
      case '1W':
        startDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'ALL':
      default:
        return data;
    }

    return data.filter(point => new Date(point.date) >= startDate);
  }, [data, timeRange]);

  // 성과 메트릭 계산
  const performanceMetrics = useMemo(() => {
    if (!filteredData.length) return null;

    const firstValue = filteredData[0]?.portfolioValue || 0;
    const lastValue = filteredData[filteredData.length - 1]?.portfolioValue || 0;
    const totalReturn = ((lastValue - firstValue) / firstValue) * 100;

    const returns = filteredData.map(d => d.dailyReturn).filter(r => r !== undefined);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );

    const sharpeRatio = avgReturn / volatility || 0;

    const maxDrawdown = calculateMaxDrawdown(filteredData);
    const winRate = (returns.filter(r => r > 0).length / returns.length) * 100;

    return {
      totalReturn: totalReturn.toFixed(2),
      avgDailyReturn: avgReturn.toFixed(4),
      volatility: (volatility * 100).toFixed(2),
      sharpeRatio: sharpeRatio.toFixed(2),
      maxDrawdown: maxDrawdown.toFixed(2),
      winRate: winRate.toFixed(1),
    };
  }, [filteredData]);

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 min-w-[200px]">
        <p className="font-semibold text-sm mb-2">
          {new Date(label).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}</span>
            </div>
            <span className="font-mono font-medium">
              {entry.name === '포트폴리오 가치'
                ? `₩${entry.value.toLocaleString()}`
                : entry.name === '일일 수익률' || entry.name === '누적 수익률'
                ? `${entry.value.toFixed(2)}%`
                : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const chartComponents = {
    line: (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            stroke="hsl(var(--foreground))"
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`}
            stroke="hsl(var(--foreground))"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => `${value.toFixed(1)}%`}
            stroke="hsl(var(--foreground))"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="portfolioValue"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            name="포트폴리오 가치"
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
          />
          {showBenchmark && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="benchmark"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="5 5"
              name="벤치마크"
              dot={false}
            />
          )}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativeReturn"
            stroke="hsl(var(--chart-2))"
            strokeWidth={1}
            name="누적 수익률"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    ),
    area: (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            stroke="hsl(var(--foreground))"
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`}
            stroke="hsl(var(--foreground))"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => `${value.toFixed(1)}%`}
            stroke="hsl(var(--foreground))"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="portfolioValue"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.1}
            name="포트폴리오 가치"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativeReturn"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            name="누적 수익률"
            dot={false}
          />
          {showBenchmark && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="benchmark"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="5 5"
              name="벤치마크"
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    ),
    composed: (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            stroke="hsl(var(--foreground))"
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`}
            stroke="hsl(var(--foreground))"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => `${value.toFixed(1)}%`}
            stroke="hsl(var(--foreground))"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Volume bars at the bottom */}
          {showVolume && (
            <Bar
              yAxisId="right"
              dataKey="volume"
              fill="hsl(var(--muted))"
              fillOpacity={0.3}
              name="거래량"
            />
          )}
          
          {/* Portfolio value line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="portfolioValue"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            name="포트폴리오 가치"
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
          />
          
          {/* Benchmark comparison */}
          {showBenchmark && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="benchmark"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="5 5"
              name="벤치마크"
              dot={false}
            />
          )}
          
          {/* Cumulative return area */}
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="cumulativeReturn"
            stroke="hsl(var(--chart-2))"
            fill="hsl(var(--chart-2))"
            fillOpacity={0.1}
            name="누적 수익률"
          />
          
          {/* Reference line at 0% */}
          <ReferenceLine yAxisId="right" y={0} stroke="hsl(var(--border))" strokeDasharray="2 2" />
        </ComposedChart>
      </ResponsiveContainer>
    ),
  };

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart type selector */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={chartType === 'line' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <LineChart className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'area' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('area')}
            >
              <AreaChart className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'composed' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('composed')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Time range selector */}
          <div className="flex items-center gap-1">
            {(['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {showMetrics && performanceMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{performanceMetrics.totalReturn}%</div>
            <div className="text-xs text-muted-foreground">총 수익률</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{performanceMetrics.avgDailyReturn}%</div>
            <div className="text-xs text-muted-foreground">평균 일일수익률</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{performanceMetrics.volatility}%</div>
            <div className="text-xs text-muted-foreground">변동성</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{performanceMetrics.sharpeRatio}</div>
            <div className="text-xs text-muted-foreground">샤프 비율</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{performanceMetrics.maxDrawdown}%</div>
            <div className="text-xs text-muted-foreground">최대 손실</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{performanceMetrics.winRate}%</div>
            <div className="text-xs text-muted-foreground">승률</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="w-full">
        {chartComponents[chartType]}
      </div>

      {/* Data Range Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          <span>
            {filteredData.length > 0 && 
              `${new Date(filteredData[0]?.date).toLocaleDateString('ko-KR')} - ${new Date(filteredData[filteredData.length - 1]?.date).toLocaleDateString('ko-KR')}`
            }
          </span>
        </div>
        <div>
          총 {filteredData.length}개 데이터 포인트
        </div>
      </div>
    </Card>
  );
};

// 최대 손실 계산 함수
function calculateMaxDrawdown(data: PerformanceDataPoint[]): number {
  let maxDrawdown = 0;
  let peak = data[0]?.portfolioValue || 0;

  for (const point of data) {
    if (point.portfolioValue > peak) {
      peak = point.portfolioValue;
    }
    const drawdown = ((peak - point.portfolioValue) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

export default AdvancedPerformanceChart;