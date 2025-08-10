'use client';

import { useMemo } from 'react';
import { ScionHolding } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart } from 'lucide-react';

interface PortfolioPieChartProps {
  holdings: ScionHolding[];
  title?: string;
  className?: string;
}

export default function PortfolioPieChart({ 
  holdings, 
  title = "포트폴리오 구성", 
  className = "" 
}: PortfolioPieChartProps) {
  
  const chartData = useMemo(() => {
    // 상위 8개 종목만 표시하고 나머지는 기타로 묶기
    const topHoldings = holdings.slice(0, 8);
    const otherHoldings = holdings.slice(8);
    
    const otherTotal = otherHoldings.reduce((sum, holding) => sum + holding.portfolioPercent, 0);
    
    const data = topHoldings.map((holding, index) => ({
      name: holding.ticker,
      value: holding.portfolioPercent,
      color: `hsl(${(index * 45) % 360}, 70%, 50%)`,
      marketValue: holding.marketValue
    }));
    
    if (otherTotal > 0) {
      data.push({
        name: 'Others',
        value: otherTotal,
        color: 'hsl(220, 20%, 60%)',
        marketValue: otherHoldings.reduce((sum, h) => sum + h.marketValue, 0)
      });
    }
    
    return data;
  }, [holdings]);

  const formatCurrency = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${(value / 1e3).toFixed(0)}K`;
  };

  // SVG 파이차트 그리기
  const createPieSlices = () => {
    let cumulativePercentage = 0;
    const radius = 80;
    const center = 100;
    
    return chartData.map((item, index) => {
      const startAngle = (cumulativePercentage * 360) / 100;
      const endAngle = ((cumulativePercentage + item.value) * 360) / 100;
      
      cumulativePercentage += item.value;
      
      const startAngleRad = (startAngle * Math.PI) / 180;
      const endAngleRad = (endAngle * Math.PI) / 180;
      
      const x1 = center + radius * Math.cos(startAngleRad);
      const y1 = center + radius * Math.sin(startAngleRad);
      const x2 = center + radius * Math.cos(endAngleRad);
      const y2 = center + radius * Math.sin(endAngleRad);
      
      const largeArc = endAngle - startAngle > 180 ? 1 : 0;
      
      const pathData = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');
      
      return (
        <g key={index}>
          <path
            d={pathData}
            fill={item.color}
            className="hover:opacity-80 transition-opacity cursor-pointer"
            stroke="white"
            strokeWidth="2"
          />
        </g>
      );
    });
  };

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <div className="relative">
            {/* SVG 파이차트 */}
            <svg width="200" height="200" className="transform -rotate-90">
              {createPieSlices()}
            </svg>
            
            {/* 중앙 텍스트 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-bold">총 {holdings.length}개</div>
                <div className="text-xs text-muted-foreground">종목</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 범례 */}
        <div className="mt-6 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{item.name}</span>
                    <span className="text-sm font-bold text-primary ml-2">
                      {item.value.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(item.marketValue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}