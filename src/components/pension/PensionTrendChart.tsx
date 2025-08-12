'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ChartData {
  date: string;
  value: number;
  returns: number;
  benchmark: number;
}

export function PensionTrendChart() {
  const [timeframe, setTimeframe] = useState<'1Y' | '3Y' | '5Y' | '10Y'>('1Y');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Mock 데이터 생성 (실제로는 API에서 받아올 데이터)
    const generateMockData = () => {
      const periods = {
        '1Y': 12,
        '3Y': 36,
        '5Y': 60,
        '10Y': 120
      };

      const monthsBack = periods[timeframe];
      const data: ChartData[] = [];
      let baseValue = 100;
      let benchmarkValue = 100;

      for (let i = monthsBack; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        
        // 국민연금 수익률 시뮬레이션 (약간의 변동성과 함께 상승 추세)
        const monthlyReturn = (Math.random() - 0.45) * 4; // -1.8% ~ +2.2% 월간 수익률
        baseValue *= (1 + monthlyReturn / 100);
        
        // 벤치마크 (KOSPI) 시뮬레이션
        const benchmarkReturn = (Math.random() - 0.4) * 5; // 더 높은 변동성
        benchmarkValue *= (1 + benchmarkReturn / 100);

        data.push({
          date: date.toISOString().slice(0, 7), // YYYY-MM 형식
          value: baseValue,
          returns: ((baseValue - 100) / 100) * 100,
          benchmark: ((benchmarkValue - 100) / 100) * 100
        });
      }
      
      return data;
    };

    setIsAnimating(true);
    setTimeout(() => {
      setChartData(generateMockData());
      setIsAnimating(false);
    }, 300);
  }, [timeframe]);

  const latestData = chartData[chartData.length - 1];
  const maxValue = Math.max(...chartData.map(d => Math.max(d.returns, d.benchmark)));
  const minValue = Math.min(...chartData.map(d => Math.min(d.returns, d.benchmark)));
  const range = maxValue - minValue;

  // SVG 경로 생성
  const generatePath = (data: number[], color: string) => {
    if (data.length === 0) return '';
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - minValue) / range) * 80;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  const pensionPath = generatePath(chartData.map(d => d.returns), '#3b82f6');
  const benchmarkPath = generatePath(chartData.map(d => d.benchmark), '#10b981');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            📈 수익률 추이
            {latestData && (
              <Badge variant={latestData.returns >= 0 ? 'default' : 'destructive'}>
                {latestData.returns >= 0 ? '+' : ''}{latestData.returns.toFixed(1)}%
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex gap-2">
            {(['1Y', '3Y', '5Y', '10Y'] as const).map((period) => (
              <Button
                key={period}
                variant={timeframe === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe(period)}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isAnimating ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 차트 영역 */}
            <div className="relative h-64 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                {/* 격자 */}
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.5"/>
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />
                
                {/* 0% 기준선 */}
                <line
                  x1="0"
                  y1={100 - ((-minValue) / range) * 80}
                  x2="100"
                  y2={100 - ((-minValue) / range) * 80}
                  stroke="#6b7280"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                
                {/* 벤치마크 영역 */}
                <path
                  d={benchmarkPath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  opacity="0.7"
                  className="animate-[draw_2s_ease-in-out]"
                />
                
                {/* 국민연금 라인 */}
                <path
                  d={pensionPath}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  className="animate-[draw_2s_ease-in-out]"
                />
                
                {/* 현재 값 포인트 */}
                {latestData && (
                  <circle
                    cx="100"
                    cy={100 - ((latestData.returns - minValue) / range) * 80}
                    r="3"
                    fill="#3b82f6"
                    className="animate-pulse"
                  />
                )}
              </svg>
              
              {/* Y축 라벨 */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 -ml-8">
                <span>{maxValue.toFixed(1)}%</span>
                <span>0%</span>
                <span>{minValue.toFixed(1)}%</span>
              </div>
              
              {/* 실시간 데이터 표시 */}
              {latestData && (
                <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg border">
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      현재 수익률
                    </div>
                    <div className={`text-lg font-bold ${
                      latestData.returns >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {latestData.returns >= 0 ? '+' : ''}{latestData.returns.toFixed(2)}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 범례 */}
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">국민연금</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-green-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">KOSPI (벤치마크)</span>
              </div>
            </div>

            {/* 통계 정보 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-300">최고 수익률</div>
                <div className="text-lg font-bold text-blue-600">
                  +{maxValue.toFixed(1)}%
                </div>
              </div>
              
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-300">최저 수익률</div>
                <div className="text-lg font-bold text-red-600">
                  {minValue.toFixed(1)}%
                </div>
              </div>
              
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-300">평균 수익률</div>
                <div className="text-lg font-bold text-green-600">
                  +{(chartData.reduce((sum, d) => sum + d.returns, 0) / chartData.length).toFixed(1)}%
                </div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-300">변동성</div>
                <div className="text-lg font-bold text-purple-600">
                  {(Math.sqrt(chartData.reduce((sum, d, i, arr) => {
                    const avg = arr.reduce((s, dd) => s + dd.returns, 0) / arr.length;
                    return sum + Math.pow(d.returns - avg, 2);
                  }, 0) / chartData.length) * Math.sqrt(12)).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* 성과 분석 */}
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                🎯 {timeframe} 성과 분석
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>상대 성과:</strong> 
                  {latestData && latestData.returns > latestData.benchmark 
                    ? ` 벤치마크 대비 +${(latestData.returns - latestData.benchmark).toFixed(1)}%p 우수` 
                    : ` 벤치마크 대비 ${(latestData.returns - latestData.benchmark).toFixed(1)}%p 부진`}
                </div>
                <div>
                  <strong>투자 전략:</strong> 장기적 관점에서 안정적인 성장 추구하며 적극적 자산배분 운용
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 애니메이션을 위한 CSS */}
        <style jsx>{`
          @keyframes draw {
            from {
              stroke-dasharray: 1000;
              stroke-dashoffset: 1000;
            }
            to {
              stroke-dasharray: 1000;
              stroke-dashoffset: 0;
            }
          }
        `}</style>
      </CardContent>
    </Card>
  );
}