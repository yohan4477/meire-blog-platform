'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AssetAllocationData {
  domesticStocks: number;
  foreignStocks: number;
  bonds: number;
  alternatives: number;
}

interface PensionAssetAllocationProps {
  data: AssetAllocationData;
  detailed?: boolean;
}

export function PensionAssetAllocation({ data, detailed = false }: PensionAssetAllocationProps) {
  const allocations = [
    {
      name: '국내주식',
      percentage: data.domesticStocks,
      color: 'bg-blue-500',
      emoji: '🏠',
      description: '코스피, 코스닥 상장주식'
    },
    {
      name: '해외주식',
      percentage: data.foreignStocks,
      color: 'bg-green-500',
      emoji: '🌍',
      description: '미국, 유럽, 아시아 등 해외주식'
    },
    {
      name: '채권',
      percentage: data.bonds,
      color: 'bg-purple-500',
      emoji: '📄',
      description: '국채, 회사채, 해외채권'
    },
    {
      name: '대체투자',
      percentage: data.alternatives,
      color: 'bg-orange-500',
      emoji: '🏢',
      description: '부동산, 인프라, 사모펀드'
    }
  ];

  const radius = 90;
  const strokeWidth = 20;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  let currentOffset = 0;

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🥧 자산배분 현황
          {detailed && <Badge variant="outline">상세보기</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* 도넛 차트 */}
          <div className="relative">
            <svg
              height={radius * 2}
              width={radius * 2}
              className="transform -rotate-90"
            >
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {allocations.map((allocation, index) => {
                const strokeDasharray = `${(allocation.percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -currentOffset;
                currentOffset += (allocation.percentage / 100) * circumference;

                return (
                  <circle
                    key={allocation.name}
                    stroke={allocation.color.replace('bg-', '#')}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                    className="transition-all duration-1000 ease-in-out hover:filter-[url(#glow)]"
                    style={{
                      stroke: allocation.color === 'bg-blue-500' ? '#3b82f6' :
                              allocation.color === 'bg-green-500' ? '#10b981' :
                              allocation.color === 'bg-purple-500' ? '#8b5cf6' : '#f97316'
                    }}
                  />
                );
              })}
            </svg>
            
            {/* 중앙 텍스트 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₩912조
                </div>
                <div className="text-sm text-gray-500">총 자산</div>
              </div>
            </div>
          </div>

          {/* 범례 */}
          <div className="space-y-3 flex-1">
            {allocations.map((allocation) => (
              <div
                key={allocation.name}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{allocation.emoji}</div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {allocation.name}
                    </div>
                    {detailed && (
                      <div className="text-sm text-gray-500">
                        {allocation.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {allocation.percentage}%
                  </div>
                  <div className="text-sm text-gray-500">
                    ₩{Math.round(912 * allocation.percentage / 100)}조
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {detailed && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold mb-3">🎯 자산배분 인사이트</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <strong>글로벌 분산투자:</strong> 해외주식 비중이 35%로 높아 환위험은 있지만 글로벌 성장에 참여
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <strong>안정성 확보:</strong> 채권 30%로 포트폴리오 변동성을 적절히 관리
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <strong>성장 추구:</strong> 주식 비중 65%로 장기적 성장을 추구하는 적극적 운용
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <strong>대체투자:</strong> 5%의 대체투자로 인플레이션 헤지 및 수익 다변화
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}