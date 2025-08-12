'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PensionData {
  totalAssets: number;
  ytdReturn: number;
  assetAllocation: {
    domesticStocks: number;
    foreignStocks: number;
    bonds: number;
    alternatives: number;
  };
  performance: {
    ytd: number;
    threeYear: number;
    fiveYear: number;
    volatility: number;
    sharpeRatio: number;
  };
}

interface PortfolioComparisonProps {
  pensionData: PensionData;
}

// 사용자 포트폴리오 예시 데이터 (실제로는 API나 사용자 입력으로 받아올 데이터)
const userPortfolios = [
  {
    name: '공격적 성장형',
    type: 'aggressive',
    allocation: { stocks: 80, bonds: 15, alternatives: 5 },
    performance: { ytd: 12.5, volatility: 18.5, sharpeRatio: 0.72 },
    emoji: '🚀'
  },
  {
    name: '균형 투자형',
    type: 'balanced',
    allocation: { stocks: 60, bonds: 35, alternatives: 5 },
    performance: { ytd: 9.2, volatility: 13.1, sharpeRatio: 0.65 },
    emoji: '⚖️'
  },
  {
    name: '안정 추구형',
    type: 'conservative',
    allocation: { stocks: 40, bonds: 55, alternatives: 5 },
    performance: { ytd: 6.8, volatility: 8.9, sharpeRatio: 0.58 },
    emoji: '🛡️'
  }
];

export function PortfolioComparison({ pensionData }: PortfolioComparisonProps) {
  const [selectedPortfolio, setSelectedPortfolio] = useState(userPortfolios[0]);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  // 국민연금 데이터 가공
  const pensionAllocation = {
    stocks: pensionData.assetAllocation.domesticStocks + pensionData.assetAllocation.foreignStocks,
    bonds: pensionData.assetAllocation.bonds,
    alternatives: pensionData.assetAllocation.alternatives
  };

  // 비교 분석 함수
  const getComparison = (userValue: number, pensionValue: number) => {
    const diff = userValue - pensionValue;
    if (Math.abs(diff) < 1) return { text: '유사', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    if (diff > 0) return { text: `+${diff.toFixed(1)}%p 높음`, color: 'text-green-600', bgColor: 'bg-green-100' };
    return { text: `${diff.toFixed(1)}%p 낮음`, color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const getRiskLevel = (volatility: number) => {
    if (volatility < 10) return { level: '낮음', color: 'text-green-600', emoji: '🟢' };
    if (volatility < 15) return { level: '보통', color: 'text-yellow-600', emoji: '🟡' };
    return { level: '높음', color: 'text-red-600', emoji: '🔴' };
  };

  const getInsight = () => {
    const stockDiff = selectedPortfolio.allocation.stocks - pensionAllocation.stocks;
    const returnDiff = selectedPortfolio.performance.ytd - pensionData.performance.ytd;
    const volatilityDiff = selectedPortfolio.performance.volatility - pensionData.performance.volatility;

    if (stockDiff > 10 && returnDiff > 2) {
      return {
        type: '공격적',
        message: '국민연금보다 더 공격적인 포트폴리오로 높은 수익을 추구하지만 변동성도 큽니다.',
        emoji: '🚀',
        color: 'bg-red-50 dark:bg-red-900/20'
      };
    } else if (stockDiff < -10) {
      return {
        type: '보수적',
        message: '국민연금보다 보수적인 포트폴리오로 안정성을 우선시하지만 수익률은 제한적입니다.',
        emoji: '🛡️',
        color: 'bg-blue-50 dark:bg-blue-900/20'
      };
    } else {
      return {
        type: '균형적',
        message: '국민연금과 유사한 균형잡힌 포트폴리오로 적절한 위험과 수익을 추구합니다.',
        emoji: '⚖️',
        color: 'bg-green-50 dark:bg-green-900/20'
      };
    }
  };

  const insight = getInsight();

  return (
    <div className="space-y-6">
      {/* 포트폴리오 선택 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 나의 포트폴리오 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userPortfolios.map((portfolio) => (
              <div
                key={portfolio.type}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
                  selectedPortfolio.type === portfolio.type
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPortfolio(portfolio)}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{portfolio.emoji}</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {portfolio.name}
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    주식 {portfolio.allocation.stocks}% | 채권 {portfolio.allocation.bonds}%
                  </div>
                  <div className="text-sm font-medium text-blue-600 mt-1">
                    수익률 {portfolio.performance.ytd}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 비교 분석 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              ⚡ 포트폴리오 대결
              <Badge variant="secondary">{selectedPortfolio.name} vs 국민연금</Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
            >
              {showDetailedAnalysis ? '간단히 보기' : '상세 분석'} 📊
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 메인 비교 카드 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 내 포트폴리오 */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
              <div className="text-center">
                <div className="text-4xl mb-3">{selectedPortfolio.emoji}</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  내 포트폴리오
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">주식 비중:</span>
                    <span className="font-semibold">{selectedPortfolio.allocation.stocks}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">수익률:</span>
                    <span className="font-semibold text-green-600">+{selectedPortfolio.performance.ytd}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">변동성:</span>
                    <span className={`font-semibold ${getRiskLevel(selectedPortfolio.performance.volatility).color}`}>
                      {selectedPortfolio.performance.volatility}% {getRiskLevel(selectedPortfolio.performance.volatility).emoji}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">샤프지수:</span>
                    <span className="font-semibold">{selectedPortfolio.performance.sharpeRatio}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 국민연금 */}
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
              <div className="text-center">
                <div className="text-4xl mb-3">🏛️</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  국민연금
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">주식 비중:</span>
                    <span className="font-semibold">{pensionAllocation.stocks}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">수익률:</span>
                    <span className="font-semibold text-green-600">+{pensionData.performance.ytd}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">변동성:</span>
                    <span className={`font-semibold ${getRiskLevel(pensionData.performance.volatility).color}`}>
                      {pensionData.performance.volatility}% {getRiskLevel(pensionData.performance.volatility).emoji}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">샤프지수:</span>
                    <span className="font-semibold">{pensionData.performance.sharpeRatio}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 차이점 분석 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">주식 비중 차이</div>
              <div className={`font-bold ${getComparison(selectedPortfolio.allocation.stocks, pensionAllocation.stocks).color}`}>
                {getComparison(selectedPortfolio.allocation.stocks, pensionAllocation.stocks).text}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">수익률 차이</div>
              <div className={`font-bold ${getComparison(selectedPortfolio.performance.ytd, pensionData.performance.ytd).color}`}>
                {getComparison(selectedPortfolio.performance.ytd, pensionData.performance.ytd).text}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">위험도 차이</div>
              <div className={`font-bold ${getComparison(selectedPortfolio.performance.volatility, pensionData.performance.volatility).color}`}>
                {getComparison(selectedPortfolio.performance.volatility, pensionData.performance.volatility).text}
              </div>
            </div>
          </div>

          {/* AI 인사이트 */}
          <div className={`p-4 rounded-lg ${insight.color}`}>
            <div className="flex items-start gap-3">
              <div className="text-2xl">{insight.emoji}</div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white mb-2">
                  🤖 AI 분석: {insight.type} 투자 스타일
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {insight.message}
                </p>
              </div>
            </div>
          </div>

          {/* 상세 분석 (접이식) */}
          {showDetailedAnalysis && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                📈 상세 비교 분석
              </h4>
              
              <div className="space-y-4">
                {/* 리스크-수익 매트릭스 */}
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h5 className="font-medium mb-3">🎯 리스크-수익 포지셔닝</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>높은 수익, 높은 리스크:</strong>
                      {selectedPortfolio.performance.ytd > pensionData.performance.ytd && 
                       selectedPortfolio.performance.volatility > pensionData.performance.volatility ? 
                       ' ✅ 당신의 포트폴리오' : ' 국민연금이 아닌 다른 전략'}
                    </div>
                    <div>
                      <strong>적정 수익, 적정 리스크:</strong>
                      {Math.abs(selectedPortfolio.performance.ytd - pensionData.performance.ytd) < 2 ? 
                       ' ✅ 당신의 포트폴리오' : ' 🏛️ 국민연금'}
                    </div>
                  </div>
                </div>

                {/* 개선 제안 */}
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <h5 className="font-medium mb-3">💡 포트폴리오 개선 제안</h5>
                  <div className="text-sm space-y-2">
                    {selectedPortfolio.allocation.stocks > pensionAllocation.stocks + 10 && (
                      <div>• 주식 비중을 조금 줄여 변동성을 낮춰보세요</div>
                    )}
                    {selectedPortfolio.allocation.stocks < pensionAllocation.stocks - 10 && (
                      <div>• 주식 비중을 늘려 장기 수익률을 높여보세요</div>
                    )}
                    {selectedPortfolio.performance.sharpeRatio < pensionData.performance.sharpeRatio && (
                      <div>• 리스크 대비 수익 효율성을 높일 필요가 있습니다</div>
                    )}
                    <div>• 국민연금의 글로벌 분산투자 전략을 참고해보세요</div>
                  </div>
                </div>

                {/* 게임화 요소: 투자 점수 */}
                <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                  <h5 className="font-medium mb-3">🏆 투자 점수 비교</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round((selectedPortfolio.performance.ytd * 5 + selectedPortfolio.performance.sharpeRatio * 50))}점
                      </div>
                      <div className="text-sm text-gray-600">내 포트폴리오</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round((pensionData.performance.ytd * 5 + pensionData.performance.sharpeRatio * 50))}점
                      </div>
                      <div className="text-sm text-gray-600">국민연금</div>
                    </div>
                  </div>
                  <div className="text-center mt-3 text-sm text-gray-600">
                    (수익률과 효율성을 종합한 점수)
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}