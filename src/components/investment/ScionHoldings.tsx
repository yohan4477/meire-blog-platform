'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScionPortfolio, ScionHolding } from '@/types';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  DollarSign, 
  PieChart,
  AlertCircle,
  ExternalLink,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import HoldingsSkeleton from './HoldingsSkeleton';
import ErrorDisplay from './ErrorDisplay';
import InvestmentInsights from './InvestmentInsights';

interface ScionHoldingsProps {
  limit?: number;
  showRefreshButton?: boolean;
  className?: string;
}

export default function ScionHoldings({ 
  limit = 10, 
  showRefreshButton = true,
  className = ""
}: ScionHoldingsProps) {
  const [portfolio, setPortfolio] = useState<ScionPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScionData = async (forceRefresh = false) => {
    try {
      const url = new URL('/api/scion-holdings', window.location.origin);
      if (limit) url.searchParams.set('limit', limit.toString());
      if (forceRefresh) url.searchParams.set('refresh', 'true');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch data');
      }
      
      setPortfolio(data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching Scion data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchScionData(true);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchScionData();
      setLoading(false);
    };
    
    loadData();
  }, [limit]);

  const formatCurrency = (value: number): string => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    }
    if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    }
    if (value >= 1e3) {
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

  if (loading) {
    return (
      <HoldingsSkeleton 
        rows={limit} 
        showStats={true} 
        className={className}
      />
    );
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={handleRefresh}
        isRetrying={refreshing}
        className={className}
      />
    );
  }

  if (!portfolio) {
    return null;
  }

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <PieChart className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-xl font-semibold">국민연금 투자현황</h3>
            <p className="text-sm text-muted-foreground">
              13F 신고 기준 보유 현황 | 자금운용 글로벌 #1
            </p>
          </div>
        </div>
        {showRefreshButton && (
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-2" />
          <div className="text-lg font-semibold">{formatCurrency(portfolio.totalValue)}</div>
          <div className="text-xs text-muted-foreground">총 포트폴리오 가치</div>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <PieChart className="h-5 w-5 text-blue-600 mx-auto mb-2" />
          <div className="text-lg font-semibold">{portfolio.totalPositions}</div>
          <div className="text-xs text-muted-foreground">보유 종목 수</div>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <Clock className="h-5 w-5 text-orange-600 mx-auto mb-2" />
          <div className="text-lg font-semibold">{portfolio.quarter}</div>
          <div className="text-xs text-muted-foreground">분기</div>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <TrendingUp className="h-5 w-5 text-purple-600 mx-auto mb-2" />
          <div className="text-lg font-semibold">
            {formatDistanceToNow(new Date(portfolio.lastUpdated), { 
              addSuffix: true, 
              locale: ko 
            })}
          </div>
          <div className="text-xs text-muted-foreground">업데이트</div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium">주요 보유 종목</h4>
          <Button variant="ghost" size="sm" asChild>
            <a 
              href="https://whalewisdom.com/filer/scion-asset-management-llc" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center"
            >
              전체 보기
              <ExternalLink className="h-4 w-4 ml-1" />
            </a>
          </Button>
        </div>

        <div className="space-y-2">
          {portfolio.holdings.slice(0, limit).map((holding, index) => (
            <div 
              key={`${holding.ticker}-${index}`}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-mono font-bold text-primary">
                      {holding.ticker}
                    </span>
                    {getChangeIcon(holding.change)}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {holding.securityType}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {holding.name}
                </p>
              </div>
              
              <div className="text-right">
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold">
                    {formatCurrency(holding.marketValue)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {holding.portfolioPercent.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(holding.shares)} shares
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t text-center">
        <p className="text-xs text-muted-foreground">
          데이터 제공: SEC EDGAR 13F • 시가총액 기준 • 최근 업데이트: {new Date(portfolio.lastUpdated).toLocaleDateString('ko-KR')}
        </p>
      </div>
    </Card>
  );
}