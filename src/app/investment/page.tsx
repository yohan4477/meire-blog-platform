'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, TrendingUp, PieChart } from 'lucide-react';
import Link from 'next/link';

export default function InvestmentPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">🏛️ 국민연금 포트폴리오 분석</h1>
          <p className="text-muted-foreground">실시간 SEC 13F 데이터 기반 심층 분석</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로
          </Link>
        </Button>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <PieChart className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="font-semibold">총 운용자산</h3>
              <p className="text-2xl font-bold text-blue-600">$115.8B</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">2025년 Q2 기준 최신 데이터</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="font-semibold">보유 종목 수</h3>
              <p className="text-2xl font-bold text-green-600">540개</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">미국 상장 주식 포트폴리오</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div>
              <h3 className="font-semibold">분기 성장률</h3>
              <p className="text-2xl font-bold text-purple-600">+11.3%</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Q1 대비 Q2 2025 성장</p>
        </Card>
      </div>

      {/* TOP 5 홀딩 */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">TOP 5 보유 종목</h2>
        <div className="space-y-4">
          {[
            { ticker: 'AAPL', name: 'Apple Inc', percent: 6.1, value: '$7.1B' },
            { ticker: 'NVDA', name: 'NVIDIA Corporation', percent: 5.0, value: '$5.8B' },
            { ticker: 'MSFT', name: 'Microsoft Corporation', percent: 4.9, value: '$5.7B' },
            { ticker: 'PBUS', name: 'Invesco MSCI USA ETF', percent: 3.8, value: '$4.4B' },
            { ticker: 'AMZN', name: 'Amazon.com Inc', percent: 3.3, value: '$3.8B' }
          ].map((stock, index) => (
            <div key={stock.ticker} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <div className="font-mono font-bold text-primary">{stock.ticker}</div>
                  <div className="text-sm text-muted-foreground">{stock.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{stock.percent}%</div>
                <div className="text-sm text-muted-foreground">{stock.value}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 분석 인사이트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">📈 주요 변화</h3>
          <ul className="space-y-2 text-sm">
            <li>• NVIDIA 비중 확대 (+0.5%p)</li>
            <li>• Apple 안정적 유지 (6.1%)</li>
            <li>• Microsoft 클라우드 투자 증가</li>
            <li>• AI 관련 종목 비중 강화</li>
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">🌍 투자 전략</h3>
          <ul className="space-y-2 text-sm">
            <li>• 대형 기술주 중심 포트폴리오</li>
            <li>• 분산투자를 통한 리스크 관리</li>
            <li>• 장기 성장주 위주 투자</li>
            <li>• ESG 요소 고려한 선별 투자</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}