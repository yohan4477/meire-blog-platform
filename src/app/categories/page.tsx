'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function CategoriesPage() {
  // 더미 카테고리 데이터
  const categories = [
    { name: "투자분석", count: 12, description: "투자 전략과 시장 분석" },
    { name: "시장분석", count: 8, description: "주식시장 동향과 전망" },
    { name: "데이터분석", count: 6, description: "투자 데이터 심층 분석" },
    { name: "기술투자", count: 5, description: "AI, 반도체 등 기술주 분석" },
    { name: "ESG", count: 4, description: "ESG 투자와 지속가능성" },
    { name: "업종분석", count: 7, description: "업종별 투자 동향" },
    { name: "지역분석", count: 3, description: "글로벌 투자 기회" },
    { name: "암호화폐", count: 2, description: "디지털 자산 투자" }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">카테고리</h1>
          <p className="text-muted-foreground">투자 주제별 포스트 모음</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Card key={category.name} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                  {category.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {category.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                {category.count}개 포스트
              </Badge>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/posts?category=${category.name}`}>
                  보기
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}