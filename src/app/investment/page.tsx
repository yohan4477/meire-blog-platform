'use client';

import { useEffect, useState } from 'react';
import { ScionPortfolio } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ScionHoldings from '@/components/investment/ScionHoldings';
import HoldingsTable from '@/components/investment/HoldingsTable';
import EnhancedHoldingsTable from '@/components/investment/EnhancedHoldingsTable';
import PortfolioStats from '@/components/investment/PortfolioStats';
import HoldingsSkeleton from '@/components/investment/HoldingsSkeleton';
import ErrorDisplay from '@/components/investment/ErrorDisplay';
import QuarterlyTrend from '@/components/investment/QuarterlyTrend';
import PortfolioPieChart from '@/components/investment/PortfolioPieChart';
import TrendChart from '@/components/investment/TrendChart';
import FilterControls from '@/components/investment/FilterControls';
import { 
  RefreshCw, 
  BarChart3, 
  TrendingUp, 
  ArrowLeft,
  Download,
  ExternalLink,
  Calendar,
  Filter,
  Search,
  Eye,
  Grid3x3,
  List,
  PieChart,
  Activity
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rank');

  // 필터링된 holdings 계산
  const filteredHoldings = portfolio?.holdings.filter(holding => {
    // 검색 필터
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!holding.ticker.toLowerCase().includes(searchLower) && 
          !holding.name.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // 섹터 필터 (간단한 예시 - 실제로는 섹터 정보가 데이터에 있어야 함)
    if (selectedSector !== 'all') {
      // TODO: 실제 섹터 정보 기반 필터링
    }
    
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'value':
        return b.marketValue - a.marketValue;
      case 'change-positive':
        const aChange = ((a.marketValue - (a.change?.quarterlyTrend?.Q4_2024?.marketValue || a.marketValue)) / (a.change?.quarterlyTrend?.Q4_2024?.marketValue || a.marketValue)) * 100;
        const bChange = ((b.marketValue - (b.change?.quarterlyTrend?.Q4_2024?.marketValue || b.marketValue)) / (b.change?.quarterlyTrend?.Q4_2024?.marketValue || b.marketValue)) * 100;
        return bChange - aChange;
      case 'change-negative':
        const aChangeNeg = ((a.marketValue - (a.change?.quarterlyTrend?.Q4_2024?.marketValue || a.marketValue)) / (a.change?.quarterlyTrend?.Q4_2024?.marketValue || a.marketValue)) * 100;
        const bChangeNeg = ((b.marketValue - (b.change?.quarterlyTrend?.Q4_2024?.marketValue || b.marketValue)) / (b.change?.quarterlyTrend?.Q4_2024?.marketValue || b.marketValue)) * 100;
        return aChangeNeg - bChangeNeg;
      case 'alphabetical':
        return a.ticker.localeCompare(b.ticker);
      default: // 'rank'
        return a.rank - b.rank;
    }
  }) || [];

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedSector('all');
    setSortBy('rank');
  };

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

      {/* Enhanced Dashboard Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
        {/* Portfolio Statistics */}
        <div className="xl:col-span-8">
          <PortfolioStats portfolio={portfolio} />
        </div>
        
        {/* Portfolio Pie Chart */}
        <div className="xl:col-span-4">
          <PortfolioPieChart holdings={portfolio.holdings} />
        </div>
      </div>

      {/* Trend Chart */}
      <div className="mb-8">
        <TrendChart holdings={portfolio.holdings} />
      </div>

      {/* Filter Controls */}
      <FilterControls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedSector={selectedSector}
        setSelectedSector={setSelectedSector}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        totalCount={portfolio.holdings.length}
        filteredCount={filteredHoldings.length}
        onReset={handleResetFilters}
      />

      {/* Holdings Display */}
      {viewMode === 'table' ? (
        <EnhancedHoldingsTable 
          holdings={filteredHoldings} 
          title="포트폴리오 보유 종목 (실시간 수익률)"
          showRank={true}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {filteredHoldings.map((holding, index) => (
            <Card key={holding.ticker} className="p-4 hover:shadow-lg transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                    {holding.rank}
                  </div>
                  <div>
                    <div className="font-mono font-bold text-lg text-primary group-hover:text-primary/80 transition-colors">
                      {holding.ticker}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    {holding.portfolioPercent.toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {holding.name}
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">시장가치</span>
                  <span className="font-semibold">
                    ${(holding.marketValue / 1e6).toFixed(1)}M
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">주식수</span>
                  <span className="font-mono">
                    {(holding.shares / 1e6).toFixed(1)}M
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">평단가</span>
                  <span className="font-mono font-semibold text-primary">
                    ${(holding.marketValue / holding.shares).toFixed(2)}
                  </span>
                </div>
                
                {holding.change && (
                  <div className="pt-2 border-t">
                    <div className={`text-xs px-2 py-1 rounded-full text-center ${
                      holding.change.type === 'increased' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      holding.change.type === 'decreased' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                      holding.change.type === 'new' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {holding.change.type === 'increased' && '📈 증가'}
                      {holding.change.type === 'decreased' && '📉 감소'}
                      {holding.change.type === 'new' && '✨ 신규'}
                      {holding.change.type === 'unchanged' && '➡️ 유지'}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {filteredHoldings.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">검색 결과가 없습니다</p>
            <p>다른 검색어나 필터 조건을 시도해보세요.</p>
            <Button variant="outline" onClick={handleResetFilters} className="mt-4">
              필터 초기화
            </Button>
          </div>
        </Card>
      )}

      {/* Detailed Quarterly Trends Section */}
      <div className="mt-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            상위 종목 세부 분석
          </h2>
          <p className="text-muted-foreground mt-2">
            상위 5개 종목의 3분기 세부 투자 패턴과 포지션 변화를 상세히 분석합니다.
          </p>
        </div>
        
        <div className="grid gap-6">
          {portfolio.holdings
            .filter(holding => holding.change?.quarterlyTrend && holding.rank <= 5)
            .map(holding => (
              <QuarterlyTrend 
                key={holding.ticker} 
                holding={holding}
              />
            ))
          }
        </div>
        
        {portfolio.holdings.filter(h => h.change?.quarterlyTrend).length === 0 && (
          <Card className="p-8 text-center">
            <div className="text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>분기별 추이 데이터를 준비 중입니다.</p>
            </div>
          </Card>
        )}
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