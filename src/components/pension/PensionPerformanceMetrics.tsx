'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PerformanceData {
  ytd: number;
  threeYear: number;
  fiveYear: number;
  volatility: number;
  sharpeRatio: number;
}

interface PensionPerformanceMetricsProps {
  data: PerformanceData;
}

export function PensionPerformanceMetrics({ data }: PensionPerformanceMetricsProps) {
  const metrics = [
    {
      name: '올해 수익률',
      value: data.ytd,
      suffix: '%',
      color: data.ytd >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: data.ytd >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20',
      emoji: data.ytd >= 0 ? '📈' : '📉',
      benchmark: 8.0,
      description: '코스피 대비'
    },
    {
      name: '3년 평균',
      value: data.threeYear,
      suffix: '%',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      emoji: '📊',
      benchmark: 5.5,
      description: '연평균 수익률'
    },
    {
      name: '변동성',
      value: data.volatility,
      suffix: '%',
      color: data.volatility <= 15 ? 'text-green-600' : 'text-orange-600',
      bgColor: data.volatility <= 15 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-orange-100 dark:bg-orange-900/20',
      emoji: '📊',
      benchmark: 15.0,
      description: '리스크 수준'
    },
    {
      name: '샤프 지수',
      value: data.sharpeRatio,
      suffix: '',
      color: data.sharpeRatio >= 0.5 ? 'text-green-600' : 'text-orange-600',
      bgColor: data.sharpeRatio >= 0.5 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-orange-100 dark:bg-orange-900/20',
      emoji: '🎯',
      benchmark: 0.5,
      description: '위험 대비 수익'
    }
  ];

  // 게이지 차트 컴포넌트
  const GaugeChart = ({ value, max, color }: { value: number; max: number; color: string }) => {
    const percentage = Math.min((Math.abs(value) / max) * 100, 100);
    const rotation = (percentage / 100) * 180;

    return (
      <div className="relative w-20 h-10 mx-auto mb-2">
        <div className="absolute inset-0 flex items-end justify-center">
          <div className="w-16 h-8 border-4 border-gray-200 dark:border-gray-700 border-b-0 rounded-t-full"></div>
        </div>
        <div className="absolute inset-0 flex items-end justify-center">
          <div 
            className={`w-16 h-8 border-4 ${color.replace('text-', 'border-')} border-b-0 rounded-t-full transition-all duration-1000 ease-out`}
            style={{
              background: `conic-gradient(from 0deg at 50% 100%, ${color.replace('text-', '#')}22 0deg, ${color.replace('text-', '#')}22 ${rotation}deg, transparent ${rotation}deg)`
            }}
          ></div>
        </div>
        <div 
          className="absolute bottom-0 left-1/2 w-0.5 h-6 bg-gray-800 dark:bg-white origin-bottom transition-transform duration-1000 ease-out"
          style={{ transform: `translateX(-50%) rotate(${rotation - 90}deg)` }}
        ></div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 성과 지표
          <Badge variant="secondary" className="ml-auto">
            2024년 기준
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.name}
              className={`p-4 rounded-lg ${metric.bgColor} hover:scale-105 transition-transform cursor-pointer group`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{metric.emoji}</div>
                
                {/* 게이지 차트 (샤프 지수와 변동성용) */}
                {(metric.name === '샤프 지수' || metric.name === '변동성') && (
                  <GaugeChart 
                    value={metric.value} 
                    max={metric.name === '샤프 지수' ? 2 : 25} 
                    color={metric.color}
                  />
                )}
                
                <div className={`text-2xl font-bold ${metric.color} group-hover:scale-110 transition-transform`}>
                  {metric.value > 0 && metric.name !== '변동성' && metric.name !== '샤프 지수' ? '+' : ''}
                  {metric.value}
                  {metric.suffix}
                </div>
                
                <div className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {metric.name}
                </div>
                
                <div className="text-xs text-gray-500 mt-1">
                  {metric.description}
                </div>
                
                {/* 벤치마크 비교 */}
                <div className="mt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">목표:</span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {metric.benchmark}{metric.suffix}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-1000 ease-out ${
                        metric.value >= metric.benchmark ? 'bg-green-500' : 'bg-orange-500'
                      }`}
                      style={{
                        width: `${Math.min((Math.abs(metric.value) / (metric.benchmark * 1.5)) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 성과 요약 */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            🎯 성과 분석
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-green-600 text-xl">✅</div>
              <div className="text-sm">
                <strong>우수한 수익률:</strong> 올해 {data.ytd}% 수익으로 목표 대비 초과 달성
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-blue-600 text-xl">📊</div>
              <div className="text-sm">
                <strong>안정적 변동성:</strong> {data.volatility}% 변동성으로 적정 리스크 수준 유지
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-purple-600 text-xl">🎯</div>
              <div className="text-sm">
                <strong>효율적 운용:</strong> 샤프지수 {data.sharpeRatio}로 위험 대비 수익 효율성 양호
              </div>
            </div>
          </div>

          {/* 랭킹 정보 */}
          <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🏆</div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  글로벌 연기금 순위
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  자산규모 3위 | 수익률 상위 20% | ESG 투자 선도
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}