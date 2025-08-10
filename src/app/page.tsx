'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BlogPost } from '@/types';
import PostCard from '@/components/blog/PostCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp } from 'lucide-react';

export default function Home() {
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentPosts() {
      try {
        const response = await fetch('/api/posts?limit=6');
        const data = await response.json();
        setRecentPosts(data.posts || []);
      } catch (error) {
        console.error('Failed to fetch recent posts:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentPosts();
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
          Meire Blog
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          경제, 투자, 일상의 이야기를 담은 블로그입니다. 
          다양한 관점에서 바라본 세상의 이야기를 전달합니다.
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
            {recentPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">포스트를 불러올 수 없습니다.</p>
          </div>
        )}
      </section>

      {/* 통계 섹션 */}
      <section className="py-16 bg-muted/50 rounded-lg">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-8">블로그 현황</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">101+</div>
              <div className="text-muted-foreground">총 포스트</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">3</div>
              <div className="text-muted-foreground">주요 카테고리</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">2025</div>
              <div className="text-muted-foreground">운영 시작</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
