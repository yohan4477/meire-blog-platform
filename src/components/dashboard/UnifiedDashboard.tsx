/**
 * 통합 대시보드 컴포넌트
 * Unified Dashboard Component
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  BarChart3, 
  Brain, 
  Bell, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  PieChart,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  portfolioValue: number;
  portfolioChange: number;
  portfolioChangePercent: number;
  npsHoldings: number;
  aiInsights: number;
  agentsActive: number;
  workflowsRunning: number;
}


interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
  loading?: boolean;
}

export default function UnifiedDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);

  useEffect(() => {
    initializeDashboard();
    setupQuickActions();
  }, []);

  const initializeDashboard = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDashboardStats(),
      ]);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('대시보드 초기화 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      // 실제 API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        portfolioValue: 125000000, // 1.25억
        portfolioChange: 2500000, // 250만원 증가
        portfolioChangePercent: 2.04,
        npsHoldings: 247,
        aiInsights: 12,
        agentsActive: 3,
        workflowsRunning: 2
      });
    } catch (error) {
      console.error('통계 로딩 실패:', error);
    }
  };


  const setupQuickActions = () => {
    setQuickActions([
      {
        id: 'portfolio-analysis',
        title: '포트폴리오 분석',
        description: '현재 포트폴리오 성과 및 리스크 분석',
        icon: <PieChart className="h-5 w-5" />,
        href: '/portfolio'
      },
      {
        id: 'nps-comparison',
        title: '국민연금 비교',
        description: '국민연금 포트폴리오와의 비교 분석',
        icon: <BarChart3 className="h-5 w-5" />,
        href: '/investment'
      },
      {
        id: 'ai-insights',
        title: 'AI 인사이트',
        description: '최신 AI 분석 결과 및 추천사항',
        icon: <Brain className="h-5 w-5" />,
        href: '/financial-curation'
      }
      // Agent workflow quick action removed as per user request
    ]);
  };

  // Agent workflow function removed as per user request

  const refreshDashboard = async () => {
    await initializeDashboard();
  };

  const formatCurrency = (value: number) => {
    return (value / 10000).toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }) + '만원';
  };

  const formatLargeCurrency = (value: number) => {
    if (value >= 100000000) {
      return (value / 100000000).toFixed(1) + '억원';
    }
    return formatCurrency(value);
  };


  if (loading && !stats) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* 헤더 스켈레톤 */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>


        {/* 주요 지표 스켈레톤 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 빠른 액션 스켈레톤 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-start space-x-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 주요 페이지 링크 스켈레톤 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">투자 대시보드</h1>
          <p className="text-gray-600">
            AI 에이전트가 분석한 포트폴리오 및 시장 인사이트
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {lastRefresh && (
            <p className="text-sm text-gray-500">
              마지막 업데이트: {lastRefresh.toLocaleTimeString('ko-KR')}
            </p>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshDashboard}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </div>


      {/* 주요 지표 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">포트폴리오 가치</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{formatLargeCurrency(stats.portfolioValue)}</div>
                <div className={`text-sm flex items-center ${
                  stats.portfolioChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stats.portfolioChange >= 0 ? '+' : ''}{formatCurrency(stats.portfolioChange)} 
                  ({stats.portfolioChangePercent >= 0 ? '+' : ''}{stats.portfolioChangePercent}%)
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">국민연금 종목</CardTitle>
                <BarChart3 className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{stats.npsHoldings}</div>
                <div className="text-sm text-gray-500">추적 중인 종목</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">AI 인사이트</CardTitle>
                <Brain className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{stats.aiInsights}</div>
                <div className="text-sm text-gray-500">새로운 분석</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">에이전트 상태</CardTitle>
                <Activity className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{stats.agentsActive}/3</div>
                <div className="text-sm text-gray-500">
                  {stats.workflowsRunning}개 워크플로우 실행 중
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 빠른 액션 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 액션</CardTitle>
          <CardDescription>자주 사용하는 기능에 빠르게 접근하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <div key={action.id}>
                {action.href ? (
                  <Link href={action.href}>
                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          {action.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{action.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ) : (
                  <Card 
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full"
                    onClick={action.action}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        {action.loading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        ) : (
                          action.icon
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{action.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 주요 페이지 링크 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">국민연금 분석</h3>
                <p className="text-sm text-gray-500">13F 파일링 기반 포트폴리오 추적</p>
              </div>
            </div>
            <Button asChild className="w-full">
              <Link href="/investment">
                분석 보기
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">AI 금융 큐레이션</h3>
                <p className="text-sm text-gray-500">실시간 시장 분석 및 인사이트</p>
              </div>
            </div>
            <Button asChild className="w-full" variant="outline">
              <Link href="/financial-curation">
                큐레이션 보기
              </Link>
            </Button>
          </div>
        </Card>

        {/* Agent workflow card removed as per user request */}
      </div>
    </div>
  );
}