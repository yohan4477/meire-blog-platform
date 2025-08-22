'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';

/**
 * 경제 지표 차트 컴포넌트
 * CLAUDE.md 준수: 실제 데이터만 사용, 더미 데이터 금지
 */

interface EconomicIndicator {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: number;
  changePercent: number;
  country: string;
  category: 'interest_rate' | 'inflation' | 'gdp' | 'unemployment' | 'currency';
  date: string;
  source: string;
}

interface EconomicChartProps {
  indicators?: EconomicIndicator[];
  className?: string;
}

export default function EconomicChart({ indicators = [], className = '' }: EconomicChartProps) {
  // 실제 데이터에서 파싱된 경제 지표들
  const realIndicators: EconomicIndicator[] = indicators.length > 0 ? indicators : [
    // 실제 데이터가 없을 때는 "정보 없음" 표시
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'interest_rate': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'inflation': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'gdp': return <BarChart3 className="h-4 w-4 text-green-600" />;
      case 'unemployment': return <Activity className="h-4 w-4 text-orange-600" />;
      case 'currency': return <DollarSign className="h-4 w-4 text-purple-600" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'interest_rate': return '금리';
      case 'inflation': return '인플레이션';
      case 'gdp': return 'GDP';
      case 'unemployment': return '실업률';
      case 'currency': return '환율';
      default: return '기타';
    }
  };

  const getChangeColor = (changePercent: number) => {
    if (changePercent > 0) return 'text-green-600 bg-green-50';
    if (changePercent < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getChangeIcon = (changePercent: number) => {
    if (changePercent > 0) return <TrendingUp className="h-3 w-3" />;
    if (changePercent < 0) return <TrendingDown className="h-3 w-3" />;
    return <Activity className="h-3 w-3" />;
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            📈 주요 경제 지표
          </h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          실시간 분석
        </Badge>
      </div>

      {realIndicators.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            경제 지표 정보 없음
          </h4>
          <p className="text-sm text-gray-600">
            현재 분석된 경제 지표 데이터가 없습니다.<br />
            새로운 매크로 포스트가 분석되면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {realIndicators.map((indicator) => (
              <div
                key={indicator.id}
                className="p-4 border rounded-lg hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(indicator.category)}
                    <span className="text-xs font-medium text-gray-600">
                      {getCategoryName(indicator.category)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {indicator.country}
                  </span>
                </div>
                
                <h4 className="font-medium text-gray-900 mb-2">
                  {indicator.name}
                </h4>
                
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {indicator.value.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-600">
                    {indicator.unit}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getChangeColor(indicator.changePercent)}`}>
                    {getChangeIcon(indicator.changePercent)}
                    <span>
                      {indicator.changePercent > 0 ? '+' : ''}
                      {indicator.changePercent.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(indicator.date).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 차트 범례 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              <span>금리</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-600"></div>
              <span>인플레이션</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-600"></div>
              <span>GDP</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-600"></div>
              <span>실업률</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-600"></div>
              <span>환율</span>
            </div>
          </div>
          <span className="text-gray-500">
            📊 메르 매크로 분석 기반
          </span>
        </div>
      </div>
    </Card>
  );
}