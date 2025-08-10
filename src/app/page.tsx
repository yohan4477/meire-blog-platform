'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BlogPost } from '@/types';
import PostCard from '@/components/blog/PostCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, TrendingUp, BarChart3, BookOpen, MessageSquare } from 'lucide-react';
import RealPerformanceTable from '@/components/investment/RealPerformanceTable';
import { ScionPortfolio } from '@/types';

export default function Home() {
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [portfolio, setPortfolio] = useState<ScionPortfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // 포스트 데이터 가져오기
        const postsResponse = await fetch('/api/posts?limit=3');
        const postsData = await postsResponse.json();
        
        if (postsData.success) {
          setRecentPosts(postsData.data || []);
        }

        // 국민연금 데이터 가져오기
        const portfolioResponse = await fetch('/api/scion-holdings?limit=5');
        const portfolioData = await portfolioResponse.json();
        
        if (portfolioData.success) {
          setPortfolio(portfolioData.data);
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

      {/* 핵심 기능 안내 */}
      <section className="py-16 bg-muted/20 rounded-lg">
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold mb-4">주요 기능</h3>
          <p className="text-muted-foreground">요르의 날카로운 투자 관점을 경험해보세요</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold">투자 인사이트</h4>
            </div>
            <p className="text-muted-foreground mb-4">
              시장 동향과 투자 철학에 대한 깊이 있는 분석을 제공합니다.
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link href="/posts">포스트 보기</Link>
            </Button>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold">투자 전략 분석</h4>
            </div>
            <p className="text-muted-foreground mb-4">
              단순한 수익률이 아닌, <strong>진짜 투자 전략과 인사이트</strong>를 파헤칩니다. 집중도, 섹터 편중, 포지션 사이즈까지.
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link href="/investment">전략 분석 보기</Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* 국민연금 핵심 현황 */}
      {portfolio && (
        <section className="py-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">국민연금 TOP 5 현황</h3>
            <p className="text-muted-foreground">실시간 손익과 보유량 변화를 한눈에</p>
          </div>
          
          <RealPerformanceTable 
            holdings={portfolio.holdings} 
            title="국민연금 실제 손익 현황"
            limit={5}
          />
          
          <div className="text-center mt-6">
            <Button asChild>
              <Link href="/investment">
                전체 포트폴리오 분석 보기
                <BarChart3 className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
