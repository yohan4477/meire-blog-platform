'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PostsPage() {
  // 더미 포스트 데이터 (API 호출 제거)
  const posts = [
    {
      id: 1,
      title: "국민연금의 2025년 투자 전략 분석",
      content: "국민연금공단이 2025년 상반기에 보인 투자 전략의 변화를 분석해봅니다. NVIDIA와 Microsoft 비중 증가, Apple 안정적 유지 등 주요 포인트들을 살펴보겠습니다.",
      category: "투자분석",
      created_date: new Date().toISOString(),
      author: "요르",
      views: 1250
    },
    {
      id: 2,
      title: "글로벌 기관투자자 포트폴리오 비교",
      content: "버크셔 해서웨이, 타이거 글로벌, 시타델 등 주요 기관투자자들의 투자 성향과 포트폴리오 구성을 비교 분석합니다.",
      category: "시장분석",
      created_date: new Date(Date.now() - 86400000).toISOString(),
      author: "요르",
      views: 980
    },
    {
      id: 3,
      title: "13F 파일링으로 보는 기관투자 트렌드",
      content: "SEC 13F 파일링 데이터를 통해 발견한 2025년 기관투자 트렌드와 시사점을 정리했습니다.",
      category: "데이터분석",
      created_date: new Date(Date.now() - 172800000).toISOString(),
      author: "요르",
      views: 756
    },
    {
      id: 4,
      title: "AI 시대 투자 패러다임의 변화",
      content: "인공지능과 자동화 기술이 금융시장에 미치는 영향과 새로운 투자 기회를 탐색해봅니다.",
      category: "기술투자",
      created_date: new Date(Date.now() - 259200000).toISOString(),
      author: "요르",
      views: 892
    },
    {
      id: 5,
      title: "ESG 투자의 현재와 미래",
      content: "환경, 사회, 지배구조를 고려한 ESG 투자가 기관투자자들에게 미치는 영향을 분석합니다.",
      category: "ESG",
      created_date: new Date(Date.now() - 345600000).toISOString(),
      author: "요르",
      views: 634
    },
    {
      id: 6,
      title: "반도체 업계 투자 동향 분석",
      content: "NVIDIA, TSMC, ASML 등 주요 반도체 기업들의 투자 가치와 향후 전망을 살펴봅니다.",
      category: "업종분석",
      created_date: new Date(Date.now() - 432000000).toISOString(),
      author: "요르",
      views: 1156
    },
    {
      id: 7,
      title: "중국 시장 투자 리스크 평가",
      content: "지정학적 리스크와 규제 변화가 중국 투자에 미치는 영향을 심층 분석합니다.",
      category: "지역분석",
      created_date: new Date(Date.now() - 518400000).toISOString(),
      author: "요르",
      views: 445
    },
    {
      id: 8,
      title: "암호화폐 ETF 시장 전망",
      content: "비트코인 및 이더리움 ETF 승인 이후 암호화폐 시장의 변화와 전망을 살펴봅니다.",
      category: "암호화폐",
      created_date: new Date(Date.now() - 604800000).toISOString(),
      author: "요르",
      views: 1389
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">모든 포스트</h1>
          <p className="text-muted-foreground">요르의 투자 인사이트와 시장 분석</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Card key={post.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="mb-4">
              <Badge className="mb-2">{post.category}</Badge>
              <h3 className="font-semibold mb-2 line-clamp-2">{post.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {post.content}
              </p>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{new Date(post.created_date).toLocaleDateString('ko-KR')}</span>
              <span>{post.views?.toLocaleString()} 조회</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}