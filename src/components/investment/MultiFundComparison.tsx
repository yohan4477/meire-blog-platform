'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart,
  BarChart3,
  Users,
  Globe,
  DollarSign,
  Percent
} from 'lucide-react';

interface FundData {
  cik: string;
  name: string;
  nameKo: string;
  type: string;
  aum: number;
  country: string;
  totalValue: number;
  totalPositions: number;
  quarter: string;
  holdings: Array<{
    ticker: string;
    name: string;
    portfolioPercent: number;
    marketValue: number;
    shares: number;
    rank: number;
  }>;
}

interface MultiFundComparisonProps {
  className?: string;
}

const FUND_TYPE_COLORS: Record<string, string> = {
  'hedge-fund': 'bg-blue-500',
  'pension-fund': 'bg-green-500',
  'sovereign-wealth': 'bg-purple-500',
  'mutual-fund': 'bg-orange-500',
  'insurance': 'bg-red-500',
  'endowment': 'bg-yellow-500'
};

const FUND_TYPE_LABELS: Record<string, string> = {
  'hedge-fund': '헤지펀드',
  'pension-fund': '연기금',
  'sovereign-wealth': '국부펀드',
  'mutual-fund': '뮤추얼펀드',
  'insurance': '보험사',
  'endowment': '기부금'
};

export default function MultiFundComparison({ className = "" }: MultiFundComparisonProps) {
  const [funds, setFunds] = useState<FundData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'holdings' | 'comparison' | 'overlap'>('holdings');

  useEffect(() => {
    fetchMultiFundData();
  }, []);

  const fetchMultiFundData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/multi-fund-comparison?analysis=holdings&limit=10');
      const data = await response.json();
      
      if (data.success) {
        setFunds(data.data.funds);
      }
    } catch (error) {
      console.error('Failed to fetch multi-fund data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    if (Math.abs(value) >= 1e12) {
      return `$${(value / 1e12).toFixed(1)}T`;
    }
    if (Math.abs(value) >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    }
    if (Math.abs(value) >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-8 bg-white ${className}`}>
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              🌍 글로벌 기관투자자 포트폴리오 비교
            </h3>
            <p className="text-slate-600">
              세계 주요 기관투자자들의 13F 홀딩 현황 및 투자 전략 분석
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="px-3 py-1">
              WhaleWisdom 수준
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              실시간 SEC 데이터
            </Badge>
          </div>
        </div>

        {/* 뷰 선택 버튼 */}
        <div className="flex space-x-2">
          <Button 
            variant={selectedView === 'holdings' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('holdings')}
          >
            <PieChart className="h-4 w-4 mr-2" />
            홀딩 현황
          </Button>
          <Button 
            variant={selectedView === 'comparison' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('comparison')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            종목 비교
          </Button>
          <Button 
            variant={selectedView === 'overlap' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('overlap')}
          >
            <Users className="h-4 w-4 mr-2" />
            오버랩 분석
          </Button>
        </div>
      </div>

      {/* 펀드별 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {funds.map((fund, index) => (
          <Card key={fund.cik} className="p-6 hover:shadow-lg transition-shadow border-2">
            {/* 펀드 헤더 */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${FUND_TYPE_COLORS[fund.type] || 'bg-gray-500'}`}
                  ></div>
                  <Badge variant="secondary" className="text-xs">
                    {FUND_TYPE_LABELS[fund.type] || fund.type}
                  </Badge>
                </div>
                <h4 className="font-bold text-lg text-slate-900 mb-1">
                  {fund.nameKo}
                </h4>
                <p className="text-sm text-slate-500 mb-2">{fund.name}</p>
                <div className="flex items-center space-x-2 text-xs text-slate-600">
                  <Globe className="h-3 w-3" />
                  <span>{fund.country}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">
                  #{index + 1}
                </div>
                <div className="text-xs text-slate-500">순위</div>
              </div>
            </div>

            {/* AUM 및 포트폴리오 정보 */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="flex items-center space-x-1 mb-1">
                  <DollarSign className="h-3 w-3 text-slate-600" />
                  <span className="text-xs text-slate-600">총 운용자산</span>
                </div>
                <div className="font-bold text-slate-900">
                  {formatCurrency(fund.aum)}
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="flex items-center space-x-1 mb-1">
                  <BarChart3 className="h-3 w-3 text-slate-600" />
                  <span className="text-xs text-slate-600">보유 종목</span>
                </div>
                <div className="font-bold text-slate-900">
                  {fund.totalPositions}개
                </div>
              </div>
            </div>

            {/* TOP 5 홀딩 */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-700 mb-3">
                TOP 5 보유 종목
              </div>
              {fund.holdings.slice(0, 5).map((holding, idx) => (
                <div key={holding.ticker} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-primary/10 text-primary rounded text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-mono font-semibold text-primary text-sm">
                        {holding.ticker}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-1">
                        {holding.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">
                      {holding.portfolioPercent.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatCurrency(holding.marketValue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 업데이트 정보 */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                최종 업데이트: {fund.quarter}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 요약 통계 */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h5 className="font-semibold text-blue-900">총 기관투자자</h5>
            </div>
            <div className="text-2xl font-bold text-blue-900">{funds.length}개</div>
            <p className="text-sm text-blue-700">글로벌 주요 펀드</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h5 className="font-semibold text-green-900">총 운용자산</h5>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {formatCurrency(funds.reduce((sum, f) => sum + f.aum, 0))}
            </div>
            <p className="text-sm text-green-700">합계 AUM</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <h5 className="font-semibold text-purple-900">평균 보유종목</h5>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {Math.round(funds.reduce((sum, f) => sum + f.totalPositions, 0) / funds.length)}개
            </div>
            <p className="text-sm text-purple-700">펀드당 평균</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
            <div className="flex items-center space-x-2 mb-2">
              <Globe className="h-5 w-5 text-orange-600" />
              <h5 className="font-semibold text-orange-900">국가별 분포</h5>
            </div>
            <div className="text-2xl font-bold text-orange-900">
              {new Set(funds.map(f => f.country)).size}개국
            </div>
            <p className="text-sm text-orange-700">글로벌 커버리지</p>
          </div>
        </div>
      </div>
    </Card>
  );
}