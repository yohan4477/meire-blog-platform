'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, BookOpen, TrendingUp } from 'lucide-react';

export default function PhilosophyPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* 헤더 */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로 돌아가기
          </Link>
        </Button>
        <h1 className="text-4xl font-bold mb-4">투자 철학 & 시장 분석</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          메르의 깊이 있는 투자 철학과 체계적인 시장 분석을 만나보세요.
        </p>
      </div>

      {/* 카테고리 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* 투자 철학 */}
        <Card className="p-8 hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">투자 철학</h2>
              <p className="text-muted-foreground">핵심 투자 원칙과 철학</p>
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            <Card className="p-4 bg-blue-50 border-l-4 border-blue-500">
              <h3 className="font-semibold text-blue-900 mb-2">장기 투자의 힘</h3>
              <p className="text-sm text-blue-800">
                단기적 변동성에 흔들리지 않는 장기 관점의 투자 접근법
              </p>
            </Card>
            
            <Card className="p-4 bg-green-50 border-l-4 border-green-500">
              <h3 className="font-semibold text-green-900 mb-2">가치 투자 원칙</h3>
              <p className="text-sm text-green-800">
                내재 가치 대비 저평가된 기업을 발굴하는 체계적 접근법
              </p>
            </Card>
            
            <Card className="p-4 bg-purple-50 border-l-4 border-purple-500">
              <h3 className="font-semibold text-purple-900 mb-2">리스크 관리</h3>
              <p className="text-sm text-purple-800">
                포트폴리오 다각화와 체계적인 위험 관리 전략
              </p>
            </Card>
          </div>
          
          <Button className="w-full">
            투자 철학 상세보기
          </Button>
        </Card>

        {/* 시장 분석 */}
        <Card className="p-8 hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">시장 분석</h2>
              <p className="text-muted-foreground">체계적 시장 동향 분석</p>
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            <Card className="p-4 bg-orange-50 border-l-4 border-orange-500">
              <h3 className="font-semibold text-orange-900 mb-2">거시경제 분석</h3>
              <p className="text-sm text-orange-800">
                금리, 인플레이션, GDP 등 거시경제 지표 종합 분석
              </p>
            </Card>
            
            <Card className="p-4 bg-red-50 border-l-4 border-red-500">
              <h3 className="font-semibold text-red-900 mb-2">섹터별 동향</h3>
              <p className="text-sm text-red-800">
                주요 산업 섹터별 성장 전망과 투자 기회 분석
              </p>
            </Card>
            
            <Card className="p-4 bg-indigo-50 border-l-4 border-indigo-500">
              <h3 className="font-semibold text-indigo-900 mb-2">글로벌 트렌드</h3>
              <p className="text-sm text-indigo-800">
                ESG, AI, 에너지 전환 등 메가트렌드 투자 관점
              </p>
            </Card>
          </div>
          
          <Button className="w-full">
            시장 분석 상세보기
          </Button>
        </Card>
      </div>

      {/* 최근 콘텐츠 */}
      <section>
        <h2 className="text-2xl font-bold mb-6">최근 분석 자료</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 예시 콘텐츠들 */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <Badge className="mb-3">투자철학</Badge>
            <h3 className="font-semibold mb-2">워렌 버핏의 투자 원칙 현대적 해석</h3>
            <p className="text-sm text-muted-foreground mb-4">
              변화하는 시장 환경에서 가치 투자 원칙을 어떻게 적용할 것인가...
            </p>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>2025.01.10</span>
              <span>12분 읽기</span>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <Badge className="mb-3">시장분석</Badge>
            <h3 className="font-semibold mb-2">2025년 반도체 산업 전망</h3>
            <p className="text-sm text-muted-foreground mb-4">
              AI 붐과 메모리 반도체 사이클을 고려한 투자 전략...
            </p>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>2025.01.08</span>
              <span>15분 읽기</span>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <Badge className="mb-3">투자철학</Badge>
            <h3 className="font-semibold mb-2">리스크와 수익률의 균형</h3>
            <p className="text-sm text-muted-foreground mb-4">
              변동성이 큰 시장에서 안정적인 수익을 추구하는 방법...
            </p>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>2025.01.06</span>
              <span>10분 읽기</span>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <Badge className="mb-3">시장분석</Badge>
            <h3 className="font-semibold mb-2">금리 인하 사이클과 주식 시장</h3>
            <p className="text-sm text-muted-foreground mb-4">
              연준의 통화정책 변화가 각 섹터에 미치는 영향 분석...
            </p>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>2025.01.04</span>
              <span>18분 읽기</span>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <Badge className="mb-3">투자철학</Badge>
            <h3 className="font-semibold mb-2">감정적 투자의 함정</h3>
            <p className="text-sm text-muted-foreground mb-4">
              인간의 심리가 투자 성과에 미치는 영향과 극복 방법...
            </p>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>2025.01.02</span>
              <span>8분 읽기</span>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <Badge className="mb-3">시장분석</Badge>
            <h3 className="font-semibold mb-2">신흥국 투자의 기회와 위험</h3>
            <p className="text-sm text-muted-foreground mb-4">
              글로벌 경제 변화 속에서 신흥국 시장의 투자 가치...
            </p>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>2024.12.30</span>
              <span>14분 읽기</span>
            </div>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button asChild variant="outline">
            <Link href="/merry">
              모든 분석 자료 보기
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}