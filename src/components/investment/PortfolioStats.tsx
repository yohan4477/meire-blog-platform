'use client';

import { Card } from '@/components/ui/card';
import { ScionPortfolio } from '@/types';
import { 
  DollarSign, 
  PieChart, 
  TrendingUp, 
  Building2, 
  Calendar,
  Target,
  BarChart3
} from 'lucide-react';

interface PortfolioStatsProps {
  portfolio: ScionPortfolio;
  className?: string;
}

export default function PortfolioStats({ portfolio, className = "" }: PortfolioStatsProps) {
  
  const formatCurrency = (value: number): string => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    }
    if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  // Calculate portfolio statistics
  const topHolding = portfolio.holdings[0];
  const top5Weight = portfolio.holdings.slice(0, 5).reduce((sum, holding) => sum + holding.portfolioPercent, 0);
  const averagePosition = portfolio.totalValue / portfolio.totalPositions;
  
  // Security type breakdown
  const securityTypes = portfolio.holdings.reduce((acc, holding) => {
    const type = holding.securityType;
    if (!acc[type]) {
      acc[type] = { count: 0, value: 0 };
    }
    acc[type].count++;
    acc[type].value += holding.marketValue;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  const stats = [
    {
      icon: DollarSign,
      label: '총 포트폴리오 가치',
      value: formatCurrency(portfolio.totalValue),
      description: `${portfolio.quarter} 기준`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: Building2,
      label: '보유 종목 수',
      value: portfolio.totalPositions.toString(),
      description: '개 종목 보유',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Target,
      label: '최대 보유 종목',
      value: topHolding ? topHolding.ticker : 'N/A',
      description: topHolding ? `${topHolding.portfolioPercent.toFixed(1)}% 비중` : '',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: BarChart3,
      label: 'Top 5 집중도',
      value: `${top5Weight.toFixed(1)}%`,
      description: '상위 5개 종목 비중',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      icon: PieChart,
      label: '평균 포지션 크기',
      value: formatCurrency(averagePosition),
      description: '종목당 평균 투자액',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      icon: Calendar,
      label: '보고 분기',
      value: portfolio.quarter,
      description: new Date(portfolio.reportDate).toLocaleDateString('ko-KR'),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <div className={className}>
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Security Types Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">증권 유형별 분석</h3>
        <div className="space-y-4">
          {Object.entries(securityTypes)
            .sort(([,a], [,b]) => b.value - a.value)
            .map(([type, data]) => {
              const percentage = (data.value / portfolio.totalValue * 100);
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <span className="text-sm font-medium text-primary">
                        {data.count}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{type}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.count}개 종목
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(data.value)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}