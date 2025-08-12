'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Globe, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function InstitutionalInvestorsPage() {
  // 더미 기관투자자 데이터
  const investors = [
    {
      name: "국민연금공단",
      nameEn: "National Pension Service",
      type: "연기금",
      country: "🇰🇷 South Korea",
      aum: 115800000000,
      description: "세계 최대 규모의 국민연금기금"
    },
    {
      name: "버크셔 해서웨이",
      nameEn: "Berkshire Hathaway Inc",
      type: "헤지펀드",
      country: "🇺🇸 United States",
      aum: 600000000000,
      description: "워렌 버핏의 투자 지주회사"
    },
    {
      name: "타이거 글로벌",
      nameEn: "Tiger Global Management",
      type: "헤지펀드",
      country: "🇺🇸 United States",
      aum: 65000000000,
      description: "성장주 중심 헤지펀드"
    },
    {
      name: "코투 매니지먼트",
      nameEn: "Coatue Management",
      type: "헤지펀드",
      country: "🇺🇸 United States",
      aum: 50000000000,
      description: "기술주 전문 투자회사"
    },
    {
      name: "시타델 어드바이저스",
      nameEn: "Citadel Advisors",
      type: "헤지펀드",
      country: "🇺🇸 United States",
      aum: 60000000000,
      description: "멀티 전략 헤지펀드"
    }
  ];

  const formatCurrency = (value: number): string => {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(1)}T`;
    }
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">🌍 글로벌 기관투자자</h1>
          <p className="text-muted-foreground">주요 기관투자자 포트폴리오 비교 분석</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로
          </Link>
        </Button>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="font-semibold">총 기관투자자</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{investors.length}개</p>
          <p className="text-sm text-muted-foreground">글로벌 주요 펀드</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="font-semibold">총 운용자산</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(investors.reduce((sum, inv) => sum + inv.aum, 0))}
          </p>
          <p className="text-sm text-muted-foreground">합계 AUM</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-2">
            <Globe className="h-5 w-5 text-purple-600" />
            <span className="font-semibold">국가 분포</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {new Set(investors.map(inv => inv.country)).size}개국
          </p>
          <p className="text-sm text-muted-foreground">글로벌 커버리지</p>
        </Card>
      </div>

      {/* 기관투자자 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {investors.map((investor, index) => (
          <Card key={investor.nameEn} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg mb-1">{investor.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{investor.nameEn}</p>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>{investor.country}</span>
                  <Badge variant="secondary">{investor.type}</Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">
                  {formatCurrency(investor.aum)}
                </div>
                <div className="text-xs text-muted-foreground">운용자산</div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              {investor.description}
            </p>
            
            <div className="flex justify-between items-center">
              <Badge variant="outline" className="text-xs">
                SEC 13F 데이터
              </Badge>
              <Button variant="outline" size="sm">
                상세 분석
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}