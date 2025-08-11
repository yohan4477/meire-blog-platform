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
import StockPicker from '@/components/investment/StockPicker';
import QuarterlyChart from '@/components/investment/QuarterlyChart';
import { ScionPortfolio } from '@/types';

export default function Home() {
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [portfolio, setPortfolio] = useState<ScionPortfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // 포스트 데이터 가져오기 (메르 블로그 글용으로 6개)
        const postsResponse = await fetch('/api/posts?limit=6');
        const postsData = await postsResponse.json();
        
        if (postsData.success) {
          setRecentPosts(postsData.data || []);
        }

        // 국민연금 데이터 가져오기
        const portfolioResponse = await fetch('/api/scion-holdings?limit=10');
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

      {/* 메르 Pick */}
      <section className="py-16 bg-muted/20 rounded-lg">
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold mb-4">메르's Pick</h3>
          <p className="text-muted-foreground">메르가 선택한 주목할 만한 종목과 투자 포인트</p>
        </div>
        
        <StockPicker />
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
    </div>
  );
}
