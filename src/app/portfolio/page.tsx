'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PortfolioDashboard from '@/components/portfolio/PortfolioDashboard';
import { Portfolio } from '@/types';
import { 
  Plus, 
  Briefcase, 
  TrendingUp, 
  Settings,
  PieChart,
  BarChart3,
  Target
} from 'lucide-react';

export default function PortfolioPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 임시 사용자 ID (실제로는 인증 시스템에서 가져와야 함)
  const userId = 1;

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/portfolio?user_id=${userId}`);
      const result = await response.json();

      if (result.success) {
        setPortfolios(result.data);
        if (result.data.length > 0 && !selectedPortfolio) {
          setSelectedPortfolio(result.data[0]);
        }
        setError(null);
      } else {
        setError(result.error?.message || 'Failed to fetch portfolios');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePortfolio = async () => {
    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name: '새 포트폴리오',
          description: '새로 생성된 포트폴리오입니다.',
          investment_goal: 'balanced',
          target_amount: 10000000,
          currency: 'KRW'
        })
      });

      const result = await response.json();
      if (result.success) {
        setPortfolios([...portfolios, result.data]);
        setSelectedPortfolio(result.data);
      }
    } catch (err) {
      console.error('Failed to create portfolio:', err);
    }
  };

  if (loading) {
    return <PortfolioPageSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchPortfolios}>다시 시도</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 네비게이션 헤더 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Briefcase className="h-6 w-6" />
                포트폴리오 관리
              </h1>
              
              {/* 포트폴리오 탭 */}
              <div className="flex items-center gap-2">
                {portfolios.map((portfolio) => (
                  <Button
                    key={portfolio.id}
                    variant={selectedPortfolio?.id === portfolio.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPortfolio(portfolio)}
                    className="flex items-center gap-2"
                  >
                    <PieChart className="h-4 w-4" />
                    {portfolio.name}
                    <Badge variant="secondary" className="ml-1">
                      {getInvestmentGoalLabel(portfolio.investment_goal)}
                    </Badge>
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreatePortfolio}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  새 포트폴리오
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                설정
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="container mx-auto">
        {portfolios.length === 0 ? (
          <EmptyPortfolioState onCreatePortfolio={handleCreatePortfolio} />
        ) : selectedPortfolio ? (
          <PortfolioDashboard 
            portfolioId={selectedPortfolio.id} 
            userId={userId}
          />
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500">포트폴리오를 선택해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 투자 목표 라벨 변환
function getInvestmentGoalLabel(goal: string): string {
  const labels = {
    conservative: '안정',
    balanced: '균형',
    aggressive: '공격',
    custom: '맞춤'
  };
  return labels[goal as keyof typeof labels] || goal;
}

// 빈 포트폴리오 상태
function EmptyPortfolioState({ onCreatePortfolio }: { onCreatePortfolio: () => void }) {
  return (
    <div className="p-6">
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <Briefcase className="h-12 w-12 text-gray-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          첫 번째 포트폴리오를 만들어보세요
        </h2>
        
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          AI 에이전트들이 도와주는 스마트한 포트폴리오 관리를 시작하세요.
          Goldman Sachs, Bloomberg, BlackRock의 전문성을 경험해보세요.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
          <Card className="text-center p-6">
            <TrendingUp className="h-8 w-8 mx-auto mb-3 text-blue-500" />
            <h3 className="font-semibold mb-2">실시간 분석</h3>
            <p className="text-sm text-gray-500">
              AI가 실시간으로 시장을 분석하고 투자 기회를 알려드립니다.
            </p>
          </Card>

          <Card className="text-center p-6">
            <BarChart3 className="h-8 w-8 mx-auto mb-3 text-green-500" />
            <h3 className="font-semibold mb-2">포트폴리오 최적화</h3>
            <p className="text-sm text-gray-500">
              BlackRock 수준의 자산 배분과 리밸런싱 추천을 받아보세요.
            </p>
          </Card>

          <Card className="text-center p-6">
            <Target className="h-8 w-8 mx-auto mb-3 text-purple-500" />
            <h3 className="font-semibold mb-2">성과 비교</h3>
            <p className="text-sm text-gray-500">
              국민연금과 성과를 비교하고 투자 전략을 개선하세요.
            </p>
          </Card>
        </div>

        <Button 
          size="lg" 
          onClick={onCreatePortfolio}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          첫 번째 포트폴리오 만들기
        </Button>
      </div>
    </div>
  );
}

// 로딩 스켈레톤
function PortfolioPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  );
}