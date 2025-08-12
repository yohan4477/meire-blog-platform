'use client';

import React, { useMemo, useCallback } from 'react';
import { ScionHolding } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface HoldingsTableProps {
  holdings: ScionHolding[];
  title?: string;
  showRank?: boolean;
  className?: string;
}

const HoldingsTable = React.memo(({ 
  holdings, 
  title = "포트폴리오 보유 종목",
  showRank = true,
  className = ""
}: HoldingsTableProps) => {
  
  const formatCurrency = useCallback((value: number): string => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    }
    if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    }
    if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
  }, []);

  const formatNumber = useCallback((value: number): string => {
    return value.toLocaleString();
  }, []);

  const getChangeIcon = useCallback((change?: ScionHolding['change']) => {
    if (!change) return null;
    
    switch (change.type) {
      case 'new':
        return (
          <div className="flex items-center space-x-1">
            <Badge variant="secondary" className="text-xs">NEW</Badge>
          </div>
        );
      case 'increased':
        return (
          <div className="flex items-center space-x-1 text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">증가</span>
          </div>
        );
      case 'decreased':
        return (
          <div className="flex items-center space-x-1 text-red-600">
            <TrendingDown className="h-4 w-4" />
            <span className="text-xs">감소</span>
          </div>
        );
      case 'sold':
        return (
          <Badge variant="destructive" className="text-xs">매도완료</Badge>
        );
      default:
        return <span className="text-xs text-muted-foreground">변화없음</span>;
    }
  }, []);

  const getChangeValue = useCallback((change?: ScionHolding['change']) => {
    if (!change || !change.marketValue) return null;
    
    const isPositive = change.marketValue > 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const sign = isPositive ? '+' : '';
    
    return (
      <div className={`text-sm ${color}`}>
        {sign}{formatCurrency(change.marketValue)}
      </div>
    );
  }, [formatCurrency]);

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">{title}</h3>
        <div className="text-sm text-muted-foreground">
          총 {holdings.length}개 종목
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {showRank && (
                <th className="text-left p-3 font-medium text-muted-foreground">순위</th>
              )}
              <th className="text-left p-3 font-medium text-muted-foreground">종목</th>
              <th className="text-left p-3 font-medium text-muted-foreground">유형</th>
              <th className="text-right p-3 font-medium text-muted-foreground">주식수</th>
              <th className="text-right p-3 font-medium text-muted-foreground">시장가치</th>
              <th className="text-right p-3 font-medium text-muted-foreground">평단가</th>
              <th className="text-right p-3 font-medium text-muted-foreground">비중</th>
              <th className="text-center p-3 font-medium text-muted-foreground">변화</th>
              <th className="text-right p-3 font-medium text-muted-foreground">변화액</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding, index) => (
              <tr 
                key={`${holding.ticker}-${index}`}
                className="border-b hover:bg-accent/50 transition-colors"
              >
                {showRank && (
                  <td className="p-3 font-medium">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {holding.rank || index + 1}
                    </div>
                  </td>
                )}
                <td className="p-3">
                  <div>
                    <div className="font-mono font-bold text-primary text-lg">
                      {holding.ticker}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {holding.name}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="text-xs">
                    {holding.securityType}
                  </Badge>
                </td>
                <td className="p-3 text-right font-mono">
                  {formatNumber(holding.shares)}
                </td>
                <td className="p-3 text-right font-semibold">
                  {formatCurrency(holding.marketValue)}
                </td>
                <td className="p-3 text-right">
                  <div className="font-mono text-sm">
                    ${(holding.marketValue / holding.shares).toFixed(2)}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="text-lg font-bold text-primary">
                    {holding.portfolioPercent.toFixed(1)}%
                  </div>
                </td>
                <td className="p-3 text-center">
                  {getChangeIcon(holding.change)}
                </td>
                <td className="p-3 text-right">
                  {getChangeValue(holding.change)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {holdings.map((holding, index) => (
          <Card 
            key={`${holding.ticker}-${index}-mobile`}
            className="p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                {showRank && (
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {holding.rank || index + 1}
                  </div>
                )}
                <div>
                  <div className="font-mono font-bold text-primary text-lg">
                    {holding.ticker}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {holding.securityType}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">
                  {holding.portfolioPercent.toFixed(1)}%
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrency(holding.marketValue)}
                </div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {holding.name}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-xs">
                  <span className="text-muted-foreground">주식수: </span>
                  <span className="font-mono">{formatNumber(holding.shares)}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {getChangeIcon(holding.change)}
                {getChangeValue(holding.change)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Show All Link */}
      <div className="mt-6 pt-4 border-t text-center">
        <a 
          href="https://www.sec.gov/edgar/browse/?CIK=0001608046" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-primary hover:underline"
        >
          SEC EDGAR에서 전체 포트폴리오 보기
          <ExternalLink className="h-4 w-4 ml-1" />
        </a>
      </div>
    </Card>
  );
});

HoldingsTable.displayName = 'HoldingsTable';

export default HoldingsTable;