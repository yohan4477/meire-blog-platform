'use client';

import { ScionHolding } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface TrendChartProps {
  holdings: ScionHolding[];
  title?: string;
  className?: string;
}

export default function TrendChart({ 
  holdings, 
  title = "상위 종목 3분기 추이", 
  className = "" 
}: TrendChartProps) {
  
  const formatCurrency = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${(value / 1e3).toFixed(0)}K`;
  };

  // 상위 5개 종목의 트렌드 데이터만 표시
  const trendingHoldings = holdings
    .filter(h => h.change?.quarterlyTrend)
    .slice(0, 5);

  const quarters = ['Q4 2024', 'Q1 2025', 'Q2 2025', '현재'];

  // 각 종목별 색상
  const colors = [
    'rgb(59, 130, 246)',   // blue-500
    'rgb(16, 185, 129)',   // emerald-500  
    'rgb(245, 158, 11)',   // amber-500
    'rgb(239, 68, 68)',    // red-500
    'rgb(139, 92, 246)',   // violet-500
  ];

  const createTrendLine = (holding: ScionHolding, color: string, index: number) => {
    if (!holding.change?.quarterlyTrend) return null;

    const trend = holding.change.quarterlyTrend;
    const dataPoints = [
      trend.Q4_2024?.marketValue || 0,
      trend.Q1_2025?.marketValue || 0, 
      trend.Q2_2025?.marketValue || 0,
      holding.marketValue
    ];

    const maxValue = Math.max(...dataPoints);
    const minValue = Math.min(...dataPoints);
    const range = maxValue - minValue || 1;

    // SVG 좌표 계산 (차트 영역 300x150)
    const chartWidth = 280;
    const chartHeight = 120;
    const margin = 20;

    const points = dataPoints.map((value, i) => {
      const x = margin + (i * (chartWidth - 2 * margin)) / (dataPoints.length - 1);
      const y = margin + ((maxValue - value) / range) * (chartHeight - 2 * margin);
      return `${x},${y}`;
    }).join(' ');

    const circlePoints = dataPoints.map((value, i) => {
      const x = margin + (i * (chartWidth - 2 * margin)) / (dataPoints.length - 1);
      const y = margin + ((maxValue - value) / range) * (chartHeight - 2 * margin);
      return { x, y, value };
    });

    return (
      <g key={holding.ticker}>
        {/* 트렌드 라인 */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* 데이터 포인트 */}
        {circlePoints.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill={color}
              className="hover:r-6 transition-all cursor-pointer"
            />
            {/* 호버시 툴팁 효과를 위한 투명한 큰 원 */}
            <circle
              cx={point.x}
              cy={point.y}
              r="12"
              fill="transparent"
              className="hover:fill-black hover:fill-opacity-10"
            />
          </g>
        ))}
      </g>
    );
  };

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 차트 영역 */}
          <div className="relative bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg p-4">
            <svg width="320" height="160" className="w-full max-w-md mx-auto">
              {/* 배경 격자 */}
              <defs>
                <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
                </pattern>
              </defs>
              <rect width="320" height="160" fill="url(#grid)" />
              
              {/* 트렌드 라인들 */}
              {trendingHoldings.map((holding, index) => 
                createTrendLine(holding, colors[index], index)
              )}
              
              {/* X축 라벨 */}
              {quarters.map((quarter, index) => (
                <text
                  key={quarter}
                  x={20 + (index * 260) / (quarters.length - 1)}
                  y={150}
                  textAnchor="middle"
                  className="text-xs fill-muted-foreground"
                >
                  {quarter}
                </text>
              ))}
            </svg>
          </div>
          
          {/* 범례 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trendingHoldings.map((holding, index) => {
              const currentValue = holding.marketValue;
              const previousValue = holding.change?.quarterlyTrend?.Q4_2024?.marketValue || 0;
              const changePercent = previousValue > 0 
                ? ((currentValue - previousValue) / previousValue) * 100 
                : 0;
              
              return (
                <div key={holding.ticker} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: colors[index] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-bold">{holding.ticker}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        changePercent > 0 ? 'bg-green-100 text-green-800' : 
                        changePercent < 0 ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(currentValue)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}