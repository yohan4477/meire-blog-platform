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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Mock 데이터 - 실제로는 API에서 가져올 데이터
  useEffect(() => {
    const mockPosts: MerryPost[] = [
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
      },
      {
        id: 2,
        title: '투자에 대한 메르의 생각',
        content: '최근 시장 상황에 대한 나의 관점을 공유해보려고 합니다.',
        excerpt: '현재 시장 상황과 투자 전략에 대한 메르의 개인적인 견해를 담았습니다.',
        category: '투자',
        author: '메르',
        createdAt: '2025-01-08',
        views: 234,
        likes: 18,
        comments: 7,
        tags: ['투자', '시장분석', '개인견해'],
        featured: false
      },
      {
        id: 3,
        title: '메르의 독서 노트 - 피터 린치의 투자 철학',
        content: '피터 린치의 "전설로 떠나는 월가의 영웅"을 읽고 느낀 점들을 정리해보았습니다.',
        excerpt: '피터 린치의 투자 철학 중 인상 깊었던 부분들과 현재 시장에 적용 가능한 교훈들을 소개합니다.',
        category: '독서',
        author: '메르',
        createdAt: '2025-01-05',
        views: 187,
        likes: 15,
        comments: 5,
        tags: ['독서', '피터린치', '투자철학', '책리뷰'],
        featured: true
      },
      {
        id: 4,
        title: '메르의 주말 요리 도전기',
        content: '주말에 도전해본 새로운 요리와 그 과정에서 있었던 에피소드들을 공유합니다.',
        excerpt: '요리 초보 메르의 좌충우돌 요리 도전기! 실패와 성공이 공존하는 유쾌한 이야기입니다.',
        category: '라이프스타일',
        author: '메르',
        createdAt: '2025-01-03',
        views: 98,
        likes: 8,
        comments: 2,
        tags: ['요리', '주말', '도전', '라이프'],
        featured: false
      }
    ];

    setTimeout(() => {
      setPosts(mockPosts);
      setLoading(false);
    }, 1000);
  }, []);

  const categories = ['all', '일상', '투자', '독서', '라이프스타일'];
  
  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(post => post.category === selectedCategory);

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

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => setSelectedCategory(category)}
            className="capitalize"
          >
            {category === 'all' ? '전체' : category}
          </Button>
        ))}
      </div>

      {/* Featured Posts */}
      {selectedCategory === 'all' && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">✨ 추천 포스트</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {posts.filter(post => post.featured).map((post) => (
              <Card key={post.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{post.category}</Badge>
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
      )}

      {/* All Posts */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          📝 {selectedCategory === 'all' ? '모든 포스트' : `${selectedCategory} 포스트`}
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">{post.category}</Badge>
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
                  {post.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <Tag size={10} className="mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  {post.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{post.tags.length - 3}
                    </Badge>
                  )}
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

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">📝</div>
            <p className="text-gray-600">
              {selectedCategory === 'all' 
                ? '아직 포스트가 없습니다.' 
                : `${selectedCategory} 카테고리에 포스트가 없습니다.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}