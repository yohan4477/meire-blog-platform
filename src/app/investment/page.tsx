'use client';

import { useEffect, useState } from 'react';
import { ScionPortfolio } from '@/types';
import { Button } from '@/components/ui/button';
import HoldingsSkeleton from '@/components/investment/HoldingsSkeleton';
import ErrorDisplay from '@/components/investment/ErrorDisplay';
import InvestmentInsights from '@/components/investment/InvestmentInsights';
import RealPerformanceTable from '@/components/investment/RealPerformanceTable';
import { 
  RefreshCw, 
  BarChart3, 
  TrendingUp, 
  ArrowLeft,
  Download,
  ExternalLink,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function InvestmentPage() {
  const [portfolio, setPortfolio] = useState<ScionPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchScionData = async (forceRefresh = false) => {
    try {
      const url = new URL('/api/scion-holdings', window.location.origin);
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
      setLastRefresh(new Date());
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

  const handleExportData = () => {
    if (!portfolio) return;
    
    const csvData = [
      ['Rank', 'Ticker', 'Company Name', 'Security Type', 'Shares', 'Market Value', 'Portfolio %'],
      ...portfolio.holdings.map(holding => [
        holding.rank,
        holding.ticker,
        holding.name,
        holding.securityType,
        holding.shares,
        holding.marketValue,
        holding.portfolioPercent.toFixed(2) + '%'
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `scion-holdings-${portfolio.quarter.replace(/\\s+/g, '-').toLowerCase()}.csv`;
    link.click();
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchScionData();
      setLoading(false);
    };
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="h-10 w-10 bg-muted rounded animate-pulse" />
            <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-6 w-96 bg-muted rounded animate-pulse" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-muted rounded-lg animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              </div>
            </Card>
          ))}
        </div>

        {/* Holdings Table Skeleton */}
        <HoldingsSkeleton rows={20} showStats={false} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            홈으로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold">국민연금 투자 현황</h1>
        </div>

        <ErrorDisplay
          error={error}
          onRetry={handleRefresh}
          isRetrying={refreshing}
        />
      </div>
    );
  }

  if (!portfolio) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          홈으로 돌아가기
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <span>국민연금 투자현황</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              자금운용 글로벌 #1 • {portfolio.quarter}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button onClick={handleExportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              CSV 다운로드
            </Button>
            
            <Button 
              onClick={handleRefresh} 
              disabled={refreshing}
              variant="outline" 
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            
            <Button asChild>
              <a 
                href="https://www.sec.gov/edgar/browse/?CIK=0001608046" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                SEC EDGAR
              </a>
            </Button>
          </div>
        </div>

        {/* Last Update Info */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                보고 기준일: {new Date(portfolio.reportDate).toLocaleDateString('ko-KR')}
              </span>
            </div>
            {lastRefresh && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>
                  마지막 업데이트: {formatDistanceToNow(lastRefresh, { addSuffix: true, locale: ko })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 투자 전략 인사이트 - 가장 중요한 정보를 맨 위에 */}
      <div className="mb-8">
        <InvestmentInsights holdings={portfolio.holdings} />
      </div>

      {/* 핵심 포트폴리오 현황 - 실제 수익/손실 정보 */}
      <div className="mb-8">
        <RealPerformanceTable 
          holdings={portfolio.holdings} 
          title="국민연금 실제 손익 현황"
          limit={10}
        />
      </div>



      {/* Footer */}
      <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
        <p>
          데이터 제공: SEC EDGAR • 
          최근 업데이트: {new Date(portfolio.lastUpdated).toLocaleDateString('ko-KR')} • 
          총 {portfolio.holdings.length}개 종목 • 
          포트폴리오 가치: {(portfolio.totalValue / 1e6).toFixed(1)}M
        </p>
        <p className="mt-2 text-xs">
          이 정보는 투자 권유가 아니며, 투자 결정 시 충분한 검토가 필요합니다.
        </p>
      </div>
    </div>
  );
}