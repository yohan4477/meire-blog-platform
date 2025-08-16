'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Tag, Eye, MessageSquare, Heart, Share2 } from 'lucide-react';
import Link from 'next/link';

interface MerryPost {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  author: string;
  createdAt: string;
  views: number;
  likes: number;
  comments: number;
  tags: string[];
  featured: boolean;
}

export default function MerryPage() {
  const [posts, setPosts] = useState<MerryPost[]>([]);
  const [loading, setLoading] = useState(true);

  // API에서 메르 블로그 데이터 가져오기
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/merry');
        const result = await response.json();

        if (result.success && result.data) {
          const apiPosts: MerryPost[] = result.data.map((post: any) => ({
            id: post.id,
            title: post.title,
            content: post.content,
            excerpt: post.excerpt || '',
            category: post.category || '일상',
            author: post.author || '메르',
            createdAt: new Date(post.created_date).toISOString().split('T')[0],
            views: post.views || 0,
            likes: post.likes || 0,
            comments: post.comments_count || 0,
            tags: post.tags || [],
            featured: post.featured || false
          }));
          setPosts(apiPosts);
        } else {
          // API 실패 시 fallback 데이터
          console.warn('메르 블로그 API 실패, fallback 데이터 사용');
          const fallbackPosts: MerryPost[] = [
            {
              id: 1,
              title: '우리형 메르의 첫 번째 이야기',
              content: '안녕하세요, 우리형 메르입니다. 이곳에서 다양한 이야기를 공유하려고 해요.',
              excerpt: '메르의 첫 번째 포스트입니다. 앞으로 재미있는 이야기들을 많이 공유할 예정이에요.',
              category: '일상',
              author: '메르',
              createdAt: '2025-01-10',
              views: 156,
              likes: 12,
              comments: 3,
              tags: ['소개', '첫글', '일상'],
              featured: true
            }
          ];
          setPosts(fallbackPosts);
        }
      } catch (error) {
        console.error('메르 블로그 데이터 가져오기 실패:', error);
        // 에러 시에도 fallback 데이터 사용
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // 모든 포스트 표시 (카테고리 필터링 제거)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-gray-200 rounded-lg w-64"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🎭 우리형 메르
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          일상, 투자, 독서, 그리고 삶의 다양한 이야기들을 나누는 공간입니다. 
          메르만의 독특한 시각으로 세상을 바라본 이야기들을 만나보세요.
        </p>
      </div>


      {/* Featured Posts */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">✨ 추천 포스트</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {posts.filter(post => post.featured).map((post) => (
            <Card key={post.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-amber-600">추천</Badge>
                </div>
                <CardTitle className="group-hover:text-blue-600 transition-colors">
                  <Link href={`/merry/${post.id}`}>
                    {post.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    {post.author}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {formatDate(post.createdAt)}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Eye size={14} />
                      {post.views}
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart size={14} />
                      {post.likes}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare size={14} />
                      {post.comments}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Share2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* All Posts */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          📝 모든 포스트
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  {post.featured && (
                    <Badge variant="outline" className="text-amber-600">추천</Badge>
                  )}
                </div>
                <CardTitle className="group-hover:text-blue-600 transition-colors">
                  <Link href={`/merry/${post.id}`}>
                    {post.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {(() => {
                    let tagsArray: string[] = [];
                    
                    try {
                      if (post.tags) {
                        if (typeof post.tags === 'string') {
                          // JSON 문자열 파싱 시도
                          try {
                            const parsed = JSON.parse(post.tags);
                            if (Array.isArray(parsed)) {
                              tagsArray = parsed.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
                            }
                          } catch (parseError) {
                            console.warn(`Failed to parse tags for post ${post.id}:`, parseError);
                            tagsArray = [];
                          }
                        } else if (Array.isArray(post.tags)) {
                          // 이미 배열인 경우
                          tagsArray = post.tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
                        }
                      }
                    } catch (error) {
                      console.error(`Tag processing error for post ${post.id}:`, error);
                      tagsArray = [];
                    }
                    
                    // 최종 안전성 검증
                    if (!Array.isArray(tagsArray)) {
                      tagsArray = [];
                    }
                    
                    return (
                      <>
                        {tagsArray.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Tag size={10} className="mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {tagsArray.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{tagsArray.length - 3}
                          </Badge>
                        )}
                        {tagsArray.length === 0 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            태그 없음
                          </Badge>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    {post.author}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {formatDate(post.createdAt)}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Eye size={14} />
                      {post.views}
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart size={14} />
                      {post.likes}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare size={14} />
                      {post.comments}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Share2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">📝</div>
            <p className="text-gray-600">
              아직 포스트가 없습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}