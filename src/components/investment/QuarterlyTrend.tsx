'use client';

import { ScionHolding } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  BarChart3
} from 'lucide-react';

interface QuarterlyTrendProps {
  holding: ScionHolding;
  className?: string;
}

export default function QuarterlyTrend({ holding, className = "" }: QuarterlyTrendProps) {
  const formatCurrency = (value: number): string => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    }
    if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    }
    return `$${(value / 1e3).toFixed(0)}K`;
  };

  const formatShares = (shares: number): string => {
    if (shares >= 1e6) {
      return `${(shares / 1e6).toFixed(1)}M`;
    }
    if (shares >= 1e3) {
      return `${(shares / 1e3).toFixed(0)}K`;
    }
    return shares.toLocaleString();
  };

  const calculateGrowth = (current: number, previous: number): number => {
    return ((current - previous) / previous) * 100;
  };

  const getGrowthColor = (growth: number): string => {
    if (growth > 0) return "text-green-600";
    if (growth < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-3 w-3" />;
    if (growth < 0) return <TrendingDown className="h-3 w-3" />;
    return <ArrowRight className="h-3 w-3" />;
  };

  if (!holding.change?.quarterlyTrend) {
    return null;
  }

  const trend = holding.change.quarterlyTrend;
  const quarters = [
    { name: 'Q4 2024', data: trend.Q4_2024 },
    { name: 'Q1 2025', data: trend.Q1_2025 },
    { name: 'Q2 2025', data: trend.Q2_2025 },
    { name: '현재', data: { shares: holding.shares, marketValue: holding.marketValue } }
  ];

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {holding.ticker} - 3분기 추이
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {holding.name}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 분기별 데이터 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quarters.map((quarter, index) => {
              const prevQuarter = index > 0 ? quarters[index - 1] : null;
              const shareGrowth = prevQuarter 
                ? calculateGrowth(quarter.data.shares, prevQuarter.data.shares)
                : 0;
              const valueGrowth = prevQuarter 
                ? calculateGrowth(quarter.data.marketValue, prevQuarter.data.marketValue)
                : 0;

              return (
                <div key={quarter.name} className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-semibold text-sm mb-2">{quarter.name}</div>
                  
                  {/* 보유 주식 수 */}
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">주식 수</div>
                    <div className="font-mono text-sm">
                      {formatShares(quarter.data.shares)}
                    </div>
                    {prevQuarter && (
                      <div className={`flex items-center gap-1 text-xs ${getGrowthColor(shareGrowth)}`}>
                        {getGrowthIcon(shareGrowth)}
                        {Math.abs(shareGrowth).toFixed(1)}%
                      </div>
                    )}
                  </div>

                  {/* 시장 가치 */}
                  <div className="space-y-1 mt-3">
                    <div className="text-xs text-muted-foreground">시장 가치</div>
                    <div className="font-mono text-sm font-semibold">
                      {formatCurrency(quarter.data.marketValue)}
                    </div>
                    {prevQuarter && (
                      <div className={`flex items-center gap-1 text-xs ${getGrowthColor(valueGrowth)}`}>
                        {getGrowthIcon(valueGrowth)}
                        {Math.abs(valueGrowth).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 전체 추이 요약 */}
          <div className="mt-6 p-4 bg-primary/5 rounded-lg">
            <div className="text-sm font-semibold mb-2">3분기 전체 추이</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">주식 수 변화</div>
                <div className="font-mono font-semibold">
                  {formatShares(trend.Q4_2024?.shares || 0)} → {formatShares(holding.shares)}
                  <span className={`ml-2 ${getGrowthColor(calculateGrowth(holding.shares, trend.Q4_2024?.shares || 1))}`}>
                    ({calculateGrowth(holding.shares, trend.Q4_2024?.shares || 1) > 0 ? '+' : ''}
                    {calculateGrowth(holding.shares, trend.Q4_2024?.shares || 1).toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">시장 가치 변화</div>
                <div className="font-mono font-semibold">
                  {formatCurrency(trend.Q4_2024?.marketValue || 0)} → {formatCurrency(holding.marketValue)}
                  <span className={`ml-2 ${getGrowthColor(calculateGrowth(holding.marketValue, trend.Q4_2024?.marketValue || 1))}`}>
                    ({calculateGrowth(holding.marketValue, trend.Q4_2024?.marketValue || 1) > 0 ? '+' : ''}
                    {calculateGrowth(holding.marketValue, trend.Q4_2024?.marketValue || 1).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 투자 성향 분석 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">투자 성향:</span>
            {(() => {
              const totalGrowth = calculateGrowth(holding.marketValue, trend.Q4_2024?.marketValue || 1);
              if (totalGrowth > 20) {
                return <Badge className="bg-green-100 text-green-800">적극 증액</Badge>;
              } else if (totalGrowth > 5) {
                return <Badge className="bg-blue-100 text-blue-800">점진 증액</Badge>;
              } else if (totalGrowth > -5) {
                return <Badge className="bg-gray-100 text-gray-800">보유 유지</Badge>;
              } else if (totalGrowth > -20) {
                return <Badge className="bg-yellow-100 text-yellow-800">점진 감액</Badge>;
              } else {
                return <Badge className="bg-red-100 text-red-800">대폭 감액</Badge>;
              }
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}