'use client';

import { ScionHolding } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart
} from 'lucide-react';

interface RealPerformanceTableProps {
  holdings: ScionHolding[];
  totalValue: number;
  title?: string;
  limit?: number;
  className?: string;
}

export default function RealPerformanceTable({ 
  holdings, 
  totalValue,
  title = "국민연금 주요 보유 현황",
  limit = 10,
  className = ""
}: RealPerformanceTableProps) {
  
  const limitedHoldings = holdings.slice(0, limit);

  const formatCurrency = (value: number): string => {
    if (Math.abs(value) >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    }
    if (Math.abs(value) >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString();
  };

  const getChangeIcon = (change?: ScionHolding['change']) => {
    if (!change) return null;
    
    switch (change.type) {
      case 'new':
        return <Badge variant="secondary" className="text-xs">NEW</Badge>;
      case 'increased':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreased':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'sold':
        return <Badge variant="destructive" className="text-xs">SOLD</Badge>;
      default:
        return null;
    }
  };

  const getQuarterlyTrend = (holding: ScionHolding, totalValue: number) => {
    if (!holding.change?.quarterlyTrend) return null;

    const quarters = ['Q4_2024', 'Q1_2025', 'Q2_2025'] as const;
    const trends = [];

    for (let i = 1; i < quarters.length; i++) {
      const currentQ = holding.change.quarterlyTrend[quarters[i]];
      const prevQ = holding.change.quarterlyTrend[quarters[i-1]];
      
      if (currentQ && prevQ) {
        // Calculate approximate portfolio percentage change
        // Since we don't have total portfolio values for each quarter, 
        // we'll use the current total as a baseline estimate
        const currentPercent = (currentQ.marketValue / totalValue) * 100;
        const prevPercent = (prevQ.marketValue / totalValue) * 100;
        const percentageChange = currentPercent - prevPercent;
        
        trends.push({
          quarter: quarters[i],
          change: percentageChange,
          percent: currentPercent
        });
      }
    }

    return trends;
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold flex items-center space-x-2">
            <PieChart className="h-6 w-6 text-primary" />
            <span>{title}</span>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            13F 신고 기준 보유 현황 (시가총액 기준)
          </p>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 font-medium text-muted-foreground">순위</th>
              <th className="text-left p-3 font-medium text-muted-foreground">종목</th>
              <th className="text-right p-3 font-medium text-muted-foreground">보유주식</th>
              <th className="text-right p-3 font-medium text-muted-foreground">시가총액</th>
              <th className="text-right p-3 font-medium text-muted-foreground">포트폴리오 비중</th>
              <th className="text-center p-3 font-medium text-muted-foreground">3분기 비중 변화</th>
              <th className="text-center p-3 font-medium text-muted-foreground">변화</th>
            </tr>
          </thead>
          <tbody>
            {limitedHoldings.map((holding, index) => (
              <tr 
                key={`${holding.ticker}-${index}`}
                className="border-b hover:bg-accent/50 transition-colors"
              >
                <td className="p-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {holding.rank}
                  </div>
                </td>
                <td className="p-3">
                  <div>
                    <div className="font-mono font-bold text-primary text-lg">
                      {holding.ticker}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {holding.name}
                    </div>
                    <Badge variant="outline" className="text-xs mt-1">
                      {holding.securityType}
                    </Badge>
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="font-mono text-sm">
                    {formatNumber(holding.shares)}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="font-mono text-lg font-semibold">
                    {formatCurrency(holding.marketValue)}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="font-bold text-lg">
                    {holding.portfolioPercent.toFixed(1)}%
                  </div>
                </td>
                <td className="p-3 text-center">
                  <div className="text-xs">
                    {(() => {
                      const trends = getQuarterlyTrend(holding, totalValue);
                      if (!trends || trends.length === 0) {
                        return <span className="text-muted-foreground">-</span>;
                      }
                      return trends.map((trend, idx) => (
                        <div key={trend.quarter} className="flex items-center justify-center space-x-1">
                          <span className="text-muted-foreground">
                            {trend.quarter.replace('_', ' ')}:
                          </span>
                          <span className={trend.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {trend.change >= 0 ? '+' : ''}{trend.change.toFixed(2)}%
                          </span>
                          {trend.change >= 0 ? 
                            <TrendingUp className="h-3 w-3 text-green-600" /> : 
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          }
                        </div>
                      ));
                    })()}
                  </div>
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center">
                    {getChangeIcon(holding.change)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {limitedHoldings.map((holding, index) => (
          <Card key={`${holding.ticker}-mobile`} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {holding.rank}
                </div>
                <div>
                  <div className="font-mono font-bold text-primary text-lg">
                    {holding.ticker}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {holding.name}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">
                  {holding.portfolioPercent.toFixed(1)}%
                </div>
                <div className="flex items-center justify-end">
                  {getChangeIcon(holding.change)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">보유주식:</span>
                <div className="font-mono">
                  {formatNumber(holding.shares)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">시가총액:</span>
                <div className="font-mono font-semibold">
                  {formatCurrency(holding.marketValue)}
                </div>
              </div>
            </div>

            {/* Quarterly Trend for Mobile */}
            {(() => {
              const trends = getQuarterlyTrend(holding, totalValue);
              if (trends && trends.length > 0) {
                return (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-muted-foreground mb-2">3분기 비중 변화:</div>
                    <div className="space-y-1">
                      {trends.map((trend) => (
                        <div key={trend.quarter} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {trend.quarter.replace('_', ' ')}:
                          </span>
                          <div className="flex items-center space-x-1">
                            <span className={`text-xs font-bold ${trend.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {trend.change >= 0 ? '+' : ''}{trend.change.toFixed(2)}%
                            </span>
                            {trend.change >= 0 ? 
                              <TrendingUp className="h-3 w-3 text-green-600" /> : 
                              <TrendingDown className="h-3 w-3 text-red-600" />
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="mt-3">
              <Badge variant="outline" className="text-xs">
                {holding.securityType}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t text-center">
        <p className="text-xs text-muted-foreground">
          데이터 제공: SEC EDGAR 13F • 시가총액 기준 • 손익 계산 비활성화
        </p>
      </div>
    </Card>
  );
}