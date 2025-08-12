'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Award,
  BarChart3,
  RefreshCw,
  Calendar,
  Info,
  Trophy,
  AlertTriangle
} from 'lucide-react';

interface NPSComparisonProps {
  portfolioId: number;
  portfolioReturn: number;
  className?: string;
  showDetails?: boolean;
}

interface NPSComparisonData {
  summary: {
    portfolio_return: number;
    outperforming_funds: number;
    total_funds: number;
    outperformance_rate: number;
    avg_outperformance: number;
    timeframe: string;
  };
  comparison: Array<{
    fund_type: string;
    nps_return: number;
    portfolio_return: number;
    outperformance: number;
    outperformance_percent: number;
    is_outperforming: boolean;
    timeframe: string;
  }>;
  nps_data: Array<{
    fund_type: string;
    return_1m: number;
    return_3m: number;
    return_6m: number;
    return_1y: number;
    return_3y: number;
    return_5y: number;
    return_inception: number;
    record_date: string;
  }>;
  historical_outperformance: any[];
  analysis_timestamp: string;
}

export default function NPSComparison({ portfolioId, portfolioReturn, className, showDetails = true }: NPSComparisonProps) {
  const router = useRouter();
  const [data, setData] = useState<NPSComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1m' | '3m' | '6m' | '1y' | '3y' | '5y'>('1y');
  const [isInitialized, setIsInitialized] = useState(false);

  const timeframes = [
    { value: '1m', label: '1개월' },
    { value: '3m', label: '3개월' },
    { value: '6m', label: '6개월' },
    { value: '1y', label: '1년' },
    { value: '3y', label: '3년' },
    { value: '5y', label: '5년' }
  ];

  useEffect(() => {
    fetchNPSComparison();
  }, [portfolioId, selectedTimeframe]);

  const fetchNPSComparison = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/portfolio/${portfolioId}/nps-comparison?timeframe=${selectedTimeframe}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setIsInitialized(true);
        setError(null);
      } else {
        setError(result.error?.message || 'Failed to fetch NPS comparison');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const initializeSampleData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/portfolio/${portfolioId}/nps-comparison`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize_sample_data' })
      });

      if (response.ok) {
        await fetchNPSComparison();
      }
    } catch (err) {
      console.error('Failed to initialize sample data:', err);
    }
  };

  const forceUpdate = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/portfolio/${portfolioId}/nps-comparison`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force_update' })
      });

      if (response.ok) {
        await fetchNPSComparison();
      }
    } catch (err) {
      console.error('Failed to update NPS data:', err);
    }
  };

  if (loading && !data) {
    return <NPSComparisonSkeleton className={className} />;
  }

  if (error || !data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            국민연금 수익률 비교
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
            <p className="text-gray-500 mb-4">
              {error || 'NPS 데이터를 불러올 수 없습니다.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={fetchNPSComparison} variant="outline" size="sm">
                다시 시도
              </Button>
              {!isInitialized && (
                <Button onClick={initializeSampleData} size="sm">
                  샘플 데이터 생성
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 헤더 및 컨트롤 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              국민연금 수익률 비교
            </CardTitle>
            <div className="flex items-center gap-2">
              {!showDetails && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => router.push(`/portfolio/${portfolioId}/nps-comparison`)}
                >
                  상세 분석 보기
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={forceUpdate}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                업데이트
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* 기간 선택 */}
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500 mr-2">기간:</span>
            <div className="flex gap-1">
              {timeframes.map((timeframe) => (
                <Button
                  key={timeframe.value}
                  variant={selectedTimeframe === timeframe.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeframe(timeframe.value as any)}
                  disabled={loading}
                >
                  {timeframe.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 성과 요약 */}
          <PerformanceSummary summary={data.summary} />
        </CardContent>
      </Card>

      {/* 상세 비교 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            펀드별 상세 비교
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.comparison.map((comp) => (
              <ComparisonRow key={comp.fund_type} comparison={comp} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 전체 기간 성과 매트릭스 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            전체 기간 성과 매트릭스
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceMatrix npsData={data.nps_data} portfolioReturn={portfolioReturn} />
        </CardContent>
      </Card>

      {/* 분석 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            분석 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">국민연금이란?</h4>
              <p className="text-gray-600 dark:text-gray-400">
                국민연금은 대한민국의 공적연금으로, 약 890조원 규모의 자산을 운용하는 
                세계 3위 규모의 연기금입니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">비교 기준</h4>
              <p className="text-gray-600 dark:text-gray-400">
                국민연금의 자산별 수익률과 귀하의 포트폴리오 수익률을 비교하여 
                상대적 성과를 분석합니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">업데이트 주기</h4>
              <p className="text-gray-600 dark:text-gray-400">
                국민연금 데이터는 월 1회 업데이트되며, 최신 업데이트: {
                  new Date(data.analysis_timestamp).toLocaleDateString()
                }
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">해석 방법</h4>
              <p className="text-gray-600 dark:text-gray-400">
                양수는 국민연금 대비 초과 수익, 음수는 미달 수익을 의미합니다. 
                장기적 관점에서 분석하는 것이 중요합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 성과 요약 컴포넌트
function PerformanceSummary({ summary }: { summary: NPSComparisonData['summary'] }) {
  const isOutperforming = summary.outperformance_rate > 50;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">내 포트폴리오</span>
        </div>
        <p className="text-2xl font-bold text-blue-600">
          {formatPercentage(summary.portfolio_return)}
        </p>
      </div>

      <div className={`p-4 rounded-lg ${isOutperforming ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
        <div className="flex items-center gap-2 mb-2">
          {isOutperforming ? 
            <TrendingUp className="h-4 w-4 text-green-600" /> : 
            <TrendingDown className="h-4 w-4 text-red-600" />
          }
          <span className={`text-sm font-medium ${isOutperforming ? 'text-green-600' : 'text-red-600'}`}>
            아웃퍼포먼스
          </span>
        </div>
        <p className={`text-2xl font-bold ${isOutperforming ? 'text-green-600' : 'text-red-600'}`}>
          {summary.outperforming_funds}/{summary.total_funds}
        </p>
        <p className="text-xs opacity-75">
          {formatPercentage(summary.outperformance_rate)} 승률
        </p>
      </div>

      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Award className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-600">평균 초과수익</span>
        </div>
        <p className="text-2xl font-bold text-purple-600">
          {summary.avg_outperformance > 0 ? '+' : ''}{formatPercentage(summary.avg_outperformance)}
        </p>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-600">분석 기간</span>
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {summary.timeframe.toUpperCase()}
        </p>
      </div>
    </div>
  );
}

// 개별 비교 행 컴포넌트
function ComparisonRow({ comparison }: { comparison: NPSComparisonData['comparison'][0] }) {
  const isOutperforming = comparison.is_outperforming;
  
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${isOutperforming ? 'bg-green-500' : 'bg-red-500'}`} />
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {comparison.fund_type}
          </h3>
          <p className="text-sm text-gray-500">
            국민연금: {formatPercentage(comparison.nps_return)}
          </p>
        </div>
      </div>

      <div className="text-right">
        <div className={`flex items-center gap-1 ${isOutperforming ? 'text-green-600' : 'text-red-600'}`}>
          {isOutperforming ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span className="font-bold">
            {comparison.outperformance > 0 ? '+' : ''}{formatPercentage(comparison.outperformance)}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          {formatPercentage(Math.abs(comparison.outperformance_percent))} 차이
        </p>
      </div>
    </div>
  );
}

// 성과 매트릭스 컴포넌트
function PerformanceMatrix({ npsData, portfolioReturn }: { npsData: NPSComparisonData['nps_data'], portfolioReturn: number }) {
  const periods = ['1m', '3m', '6m', '1y', '3y', '5y'];
  const periodLabels = ['1개월', '3개월', '6개월', '1년', '3년', '5년'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left p-2">펀드 유형</th>
            {periodLabels.map((label) => (
              <th key={label} className="text-center p-2">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
            <td className="font-semibold p-2">내 포트폴리오</td>
            {periods.map((period) => (
              <td key={period} className="text-center p-2 font-bold text-blue-600">
                {formatPercentage(portfolioReturn)}
              </td>
            ))}
          </tr>
          {npsData.map((fund) => (
            <tr key={fund.fund_type} className="border-b border-gray-200 dark:border-gray-700">
              <td className="p-2">{fund.fund_type}</td>
              {periods.map((period) => {
                const returnKey = `return_${period}` as keyof typeof fund;
                const value = fund[returnKey] as number;
                const diff = portfolioReturn - value;
                const isOutperforming = diff > 0;
                
                return (
                  <td key={period} className="text-center p-2">
                    <div className={`${isOutperforming ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(value)}
                      <div className="text-xs">
                        ({diff > 0 ? '+' : ''}{formatPercentage(diff)})
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 로딩 스켈레톤
function NPSComparisonSkeleton({ className }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}