'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NPSComparison from '@/components/portfolio/NPSComparison';
import { Portfolio } from '@/types';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { 
  ArrowLeft,
  Target,
  TrendingUp,
  BarChart3,
  FileText,
  Download,
  Share2
} from 'lucide-react';

export default function NPSComparisonPage() {
  const params = useParams();
  const router = useRouter();
  const portfolioId = parseInt(params.id as string);
  
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (portfolioId) {
      fetchPortfolioData();
    }
  }, [portfolioId]);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/portfolio/${portfolioId}`);
      const result = await response.json();

      if (result.success) {
        setPortfolio(result.data);
        setError(null);
      } else {
        setError(result.error?.message || 'Failed to fetch portfolio');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.push('/portfolio');
  };

  const handleExportReport = async () => {
    // TODO: Implement PDF export functionality
    console.log('Exporting NPS comparison report...');
  };

  const handleShare = async () => {
    // TODO: Implement share functionality
    console.log('Sharing NPS comparison...');
  };

  if (loading) {
    return <NPSComparisonPageSkeleton />;
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error || 'Portfolio not found'}</p>
            <Button onClick={handleGoBack}>포트폴리오로 돌아가기</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                포트폴리오로 돌아가기
              </Button>
              
              <div className="h-6 border-l border-gray-300 dark:border-gray-600" />
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Target className="h-6 w-6" />
                  국민연금 성과 비교 분석
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {portfolio.name} - {formatCurrency(portfolio.total_value || 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                공유
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportReport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                리포트 다운로드
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="container mx-auto p-6">
        {/* 포트폴리오 요약 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              포트폴리오 개요
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">총 평가금액</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(portfolio.total_value || 0)}
                </p>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">총 수익률</p>
                <p className="text-xl font-bold text-green-600">
                  {formatPercentage(portfolio.total_return_percent || 0)}
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">투자 목표</p>
                <Badge variant="secondary" className="text-sm">
                  {getInvestmentGoalLabel(portfolio.investment_goal)}
                </Badge>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">생성일</p>
                <p className="text-sm font-medium">
                  {new Date(portfolio.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 상세 NPS 비교 */}
        <NPSComparison 
          portfolioId={portfolioId}
          portfolioReturn={portfolio.total_return_percent || 0}
        />

        {/* 추가 분석 정보 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              분석 방법론 및 주의사항
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">분석 방법론</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• 국민연금의 자산군별 공시 수익률과 포트폴리오 수익률을 기간별로 비교</li>
                  <li>• 절대 수익률 및 상대 수익률(아웃퍼포먼스) 분석</li>
                  <li>• 리스크 조정 수익률(샤프 비율) 비교</li>
                  <li>• 섹터별 기여도 분석을 통한 성과 요인 분해</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">주의사항</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• 국민연금은 장기 운용을 목적으로 하는 기관투자자입니다</li>
                  <li>• 단기 성과 비교보다 장기적 관점에서 분석하는 것이 중요합니다</li>
                  <li>• 투자 목적, 리스크 허용도, 투자 기간이 다를 수 있습니다</li>
                  <li>• 과거 성과가 미래 성과를 보장하지는 않습니다</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h4 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
                투자 참고사항
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                이 분석은 참고용이며, 실제 투자 결정 시에는 개인의 투자 목적, 재무상황, 
                리스크 허용도 등을 종합적으로 고려하시기 바랍니다. 
                필요시 전문가의 조언을 구하시기를 권장합니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 투자 목표 라벨 변환
function getInvestmentGoalLabel(goal: string): string {
  const labels = {
    conservative: '안정형',
    balanced: '균형형',
    aggressive: '공격형',
    custom: '맞춤형'
  };
  return labels[goal as keyof typeof labels] || goal;
}

// 로딩 스켈레톤
function NPSComparisonPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto p-6">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse" />
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}