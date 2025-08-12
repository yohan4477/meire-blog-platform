'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PortfolioDashboard, PortfolioHolding, PortfolioSummary } from '@/types';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import NPSComparison from './NPSComparison';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Activity,
  Plus,
  RotateCw,
  Target,
  Award,
  BarChart3
} from 'lucide-react';

interface PortfolioDashboardProps {
  portfolioId: number;
  userId: number;
}

export default function PortfolioDashboard({ portfolioId, userId }: PortfolioDashboardProps) {
  const [dashboard, setDashboard] = useState<PortfolioDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    fetchDashboardData();
    
    // 5분마다 자동 새로고침
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [portfolioId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/portfolio/${portfolioId}/dashboard`);
      const result = await response.json();

      if (result.success) {
        setDashboard(result.data);
        setLastUpdated(new Date().toLocaleTimeString());
        setError(null);
      } else {
        setError(result.error?.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchDashboardData();
  };

  const handleUpdatePrices = async () => {
    try {
      const response = await fetch('/api/stock-prices/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_id: portfolioId })
      });

      if (response.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to update prices:', err);
    }
  };

  if (loading && !dashboard) {
    return <PortfolioDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchDashboardData}>Retry</Button>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 섹션 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {dashboard.summary.portfolio.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastUpdated}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleUpdatePrices}
            disabled={loading}
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Update Prices
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* 포트폴리오 요약 카드 */}
      <PortfolioSummaryCards summary={dashboard.summary} />

      {/* 메인 대시보드 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 보유 종목 리스트 */}
        <div className="lg:col-span-2">
          <HoldingsList holdings={dashboard.holdings} />
        </div>

        {/* 사이드바 - 섹터 분산도 및 AI 추천 */}
        <div className="space-y-6">
          <SectorAllocationChart allocation={dashboard.sector_allocation} />
          <AIRecommendations recommendations={dashboard.ai_recommendations} />
        </div>
      </div>

      {/* 최근 거래 내역 */}
      <RecentTransactions transactions={dashboard.recent_transactions} />

      {/* 국민연금 성과 비교 */}
      <NPSComparison 
        portfolioId={portfolioId}
        portfolioReturn={dashboard.summary.total_return_percent}
        showDetails={false}
      />
    </div>
  );
}

// 포트폴리오 요약 카드 컴포넌트
function PortfolioSummaryCards({ summary }: { summary: PortfolioSummary }) {
  const isGain = summary.total_gain_loss >= 0;
  const isDailyGain = summary.daily_change >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 총 평가금액 */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium opacity-90">총 평가금액</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.total_value)}
          </div>
          <p className="text-xs opacity-75 mt-1">
            {summary.holdings_count}개 종목
          </p>
        </CardContent>
      </Card>

      {/* 총 손익 */}
      <Card className={`text-white ${isGain ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium opacity-90">총 손익</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1">
            {isGain ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            <span className="text-2xl font-bold">
              {formatCurrency(summary.total_gain_loss)}
            </span>
          </div>
          <p className="text-xs opacity-75 mt-1">
            {formatPercentage(summary.total_return_percent)}
          </p>
        </CardContent>
      </Card>

      {/* 일일 변동 */}
      <Card className={`text-white ${isDailyGain ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium opacity-90">오늘</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1">
            {isDailyGain ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            <span className="text-2xl font-bold">
              {formatCurrency(summary.daily_change)}
            </span>
          </div>
          <p className="text-xs opacity-75 mt-1">
            {formatPercentage(summary.daily_change_percent)}
          </p>
        </CardContent>
      </Card>

      {/* 현금 잔고 */}
      <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium opacity-90">현금 잔고</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1">
            <DollarSign className="h-5 w-5" />
            <span className="text-2xl font-bold">
              {formatCurrency(summary.cash_balance)}
            </span>
          </div>
          <p className="text-xs opacity-75 mt-1">
            투자 가능 자금
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// 보유 종목 리스트 컴포넌트
function HoldingsList({ holdings }: { holdings: PortfolioHolding[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            보유 종목
          </CardTitle>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            종목 추가
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {holdings.map((holding) => (
            <HoldingCard key={holding.id} holding={holding} />
          ))}
          {holdings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>아직 보유한 종목이 없습니다.</p>
              <p className="text-sm">첫 번째 종목을 추가해보세요!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 개별 보유 종목 카드
function HoldingCard({ holding }: { holding: PortfolioHolding }) {
  const isGain = (holding.gain_loss || 0) >= 0;
  const currentValue = holding.current_value || holding.total_cost;
  const gainLoss = holding.gain_loss || 0;
  const gainLossPercent = holding.gain_loss_percent || 0;

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
            {holding.stock.symbol.substring(0, 2)}
          </span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {holding.stock.symbol}
          </h3>
          <p className="text-sm text-gray-500">
            {holding.shares}주 × {formatCurrency(holding.avg_purchase_price)}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-semibold text-gray-900 dark:text-white">
          {formatCurrency(currentValue)}
        </p>
        <div className={`flex items-center gap-1 ${isGain ? 'text-green-600' : 'text-red-600'}`}>
          {isGain ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span className="text-sm font-medium">
            {formatCurrency(gainLoss)} ({formatPercentage(gainLossPercent)})
          </span>
        </div>
      </div>
    </div>
  );
}

// 섹터 분산도 차트
function SectorAllocationChart({ allocation }: { allocation: Array<{ sector: string; percentage: number; value: number }> }) {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-pink-500',
    'bg-gray-500'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          섹터 분산도
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allocation.map((item, index) => (
            <div key={item.sector} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{item.sector}</span>
                  <span className="text-sm text-gray-500">
                    {formatPercentage(item.percentage)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${colors[index % colors.length]}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// AI 추천 컴포넌트
function AIRecommendations({ recommendations }: { recommendations: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          AI 추천
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                    {rec.agent_type}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {rec.recommendation_type}
                  </span>
                </div>
                <p className="text-sm font-medium">{rec.title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {rec.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">AI 추천이 준비 중입니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 최근 거래 내역
function RecentTransactions({ transactions }: { transactions: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          최근 거래 내역
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={transaction.transaction_type === 'buy' ? 'default' : 'destructive'}>
                    {transaction.transaction_type === 'buy' ? '매수' : '매도'}
                  </Badge>
                  <div>
                    <span className="font-medium">{transaction.stock.symbol}</span>
                    <p className="text-sm text-gray-500">
                      {transaction.shares}주 × {formatCurrency(transaction.price)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(transaction.total_amount)}</p>
                  <p className="text-sm text-gray-500">{transaction.transaction_date}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">거래 내역이 없습니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// 로딩 스켈레톤
function PortfolioDashboardSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="space-y-6">
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}