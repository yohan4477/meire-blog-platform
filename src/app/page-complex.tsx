'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BlogPost } from '@/types';
import PostCard from '@/components/blog/PostCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, TrendingUp, BarChart3, BookOpen, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import RealPerformanceTable from '@/components/investment/RealPerformanceTable';
import QuarterlyChart from '@/components/investment/QuarterlyChart';
import MultiFundComparison from '@/components/investment/MultiFundComparison';
import { ScionPortfolio } from '@/types';

export default function Home() {
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [portfolio, setPortfolio] = useState<ScionPortfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // DB 연결 비활성화 - 더미 데이터 사용
        console.log('📝 Using fallback blog posts data (DB disabled)');
        setRecentPosts([
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
          }
        ]);

        // 국민연금 데이터 가져오기 (SEC EDGAR API 사용)
        const portfolioResponse = await fetch('/api/nps-holdings?limit=25');
        const portfolioData = await portfolioResponse.json();
        
        if (portfolioData.success) {
          setPortfolio(portfolioData.data);
        } else {
          // 실패시 기존 API로 fallback
          console.log('NPS API failed, trying fallback...');
          const fallbackResponse = await fetch('/api/scion-holdings?limit=10');
          const fallbackData = await fallbackResponse.json();
          
          if (fallbackData.success) {
            setPortfolio(fallbackData.data);
          }
        }
        
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero Section */}
      <section className="text-center py-16">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          요르의 투자 블로그
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          니가 뭘 알아. 니가 뭘 아냐고.<br />
          요르가 전하는 날카로운 투자 인사이트와 
          포트폴리오 분석을 만나보세요.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/posts">
              모든 포스트 보기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/categories">
              카테고리 탐색
              <TrendingUp className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>


      {/* 최근 포스트 */}
      <section className="py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">최근 포스트</h2>
          <Button variant="ghost" asChild>
            <Link href="/posts">
              전체보기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {recentPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentPosts.slice(0, 3).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">포스트를 불러올 수 없습니다.</p>
          </div>
        )}
      </section>


      {/* 메르 블로그 글 */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold mb-4">메르 블로그 글</h3>
          <p className="text-muted-foreground">메르의 투자 철학과 시장 분석이 담긴 블로그 포스트</p>
        </div>
        
        {recentPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentPosts.slice(0, 6).map((post) => (
              <Card key={post.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <Badge className="mb-2">{post.category || '일반'}</Badge>
                  <h4 className="font-semibold mb-2 line-clamp-2">{post.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {post.content.replace(/\n/g, ' ').substring(0, 150)}...
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{new Date(post.created_date).toLocaleDateString('ko-KR')}</span>
                  <span>{Math.ceil(post.content.length / 300)}분 읽기</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">블로그 글을 불러올 수 없습니다.</p>
          </div>
        )}

        <div className="text-center mt-8">
          <Button asChild>
            <Link href="/posts">
              모든 블로그 글 보기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* 국민연금 포트폴리오 추이 */}
      {portfolio && (
        <section className="py-16">
          <QuarterlyChart 
            holdings={portfolio.holdings}
            totalValue={portfolio.totalValue}
          />
          
          <div className="text-center mt-8">
            <Button asChild>
              <Link href="/investment">
                전체 포트폴리오 분석 보기
                <BarChart3 className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* 글로벌 기관투자자 비교 */}
      <section className="py-16">
        <MultiFundComparison />
        
        <div className="text-center mt-8">
          <Button asChild variant="outline">
            <Link href="/institutional-investors">
              모든 기관투자자 보기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
