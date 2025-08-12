'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PensionAssetAllocation } from './PensionAssetAllocation';
import { PensionPerformanceMetrics } from './PensionPerformanceMetrics';
import { PensionTopHoldings } from './PensionTopHoldings';
import { PortfolioComparison } from './PortfolioComparison';
import { PensionTrendChart } from './PensionTrendChart';

interface PensionData {
  totalAssets: number;
  ytdReturn: number;
  assetAllocation: {
    domesticStocks: number;
    foreignStocks: number;
    bonds: number;
    alternatives: number;
  };
  topHoldings: Array<{
    symbol: string;
    name: string;
    value: number;
    percentage: number;
    change: number;
    country: string;
  }>;
  performance: {
    ytd: number;
    threeYear: number;
    fiveYear: number;
    volatility: number;
    sharpeRatio: number;
  };
}

export default function NationalPensionDashboard() {
  const [pensionData, setPensionData] = useState<PensionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 국민연금 데이터 로딩 (실제로는 API 호출)
    const loadPensionData = async () => {
      // Mock data - 실제 환경에서는 국민연금 API 호출
      const mockData: PensionData = {
        totalAssets: 912000000000000, // 912조원
        ytdReturn: 8.4,
        assetAllocation: {
          domesticStocks: 30,
          foreignStocks: 35,
          bonds: 30,
          alternatives: 5
        },
        topHoldings: [
          {
            symbol: '005930',
            name: '삼성전자',
            value: 12400000000000, // 12.4조원
            percentage: 3.2,
            change: 2.1,
            country: 'KR'
          },
          {
            symbol: '000660',
            name: 'SK하이닉스',
            value: 8900000000000, // 8.9조원
            percentage: 2.3,
            change: 1.8,
            country: 'KR'
          },
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            value: 8200000000, // $8.2B
            percentage: 1.9,
            change: 0.9,
            country: 'US'
          },
          {
            symbol: 'TSM',
            name: 'Taiwan Semiconductor',
            value: 6100000000, // $6.1B
            percentage: 1.4,
            change: 1.2,
            country: 'TW'
          }
        ],
        performance: {
          ytd: 8.4,
          threeYear: 6.2,
          fiveYear: 5.8,
          volatility: 12.3,
          sharpeRatio: 0.68
        }
      };

      setTimeout(() => {
        setPensionData(mockData);
        setLoading(false);
      }, 1000);
    };

    loadPensionData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pensionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            데이터를 불러올 수 없습니다
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            잠시 후 다시 시도해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              📊 국민연금 투자현황
              <Badge variant="secondary" className="text-sm">
                실시간
              </Badge>
            </h1>
          </div>
          
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">총 자산</p>
                    <p className="text-2xl font-bold">
                      ₩{(pensionData.totalAssets / 1000000000000).toFixed(0)}조원
                    </p>
                  </div>
                  <div className="text-4xl">💰</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">2024년 수익률</p>
                    <p className="text-2xl font-bold">+{pensionData.ytdReturn}%</p>
                  </div>
                  <div className="text-4xl">📈</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">변동성</p>
                    <p className="text-2xl font-bold">{pensionData.performance.volatility}%</p>
                  </div>
                  <div className="text-4xl">📊</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100">샤프 지수</p>
                    <p className="text-2xl font-bold">{pensionData.performance.sharpeRatio}</p>
                  </div>
                  <div className="text-4xl">🎯</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-1/2">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="allocation">자산배분</TabsTrigger>
            <TabsTrigger value="holdings">보유종목</TabsTrigger>
            <TabsTrigger value="compare">포트폴리오 비교</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PensionAssetAllocation data={pensionData.assetAllocation} />
              <PensionPerformanceMetrics data={pensionData.performance} />
            </div>
            <PensionTrendChart />
          </TabsContent>

          <TabsContent value="allocation" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PensionAssetAllocation data={pensionData.assetAllocation} detailed />
              <Card>
                <CardHeader>
                  <CardTitle>자산배분 변화 추이</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-gray-500 py-8">
                    자산배분 히스토리 차트가 여기에 표시됩니다
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="holdings" className="space-y-6">
            <PensionTopHoldings holdings={pensionData.topHoldings} />
          </TabsContent>

          <TabsContent value="compare" className="space-y-6">
            <PortfolioComparison pensionData={pensionData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}