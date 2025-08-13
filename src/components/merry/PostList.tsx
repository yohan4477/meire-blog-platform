'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, User, Tag, Eye, MessageSquare, Heart, Share2, 
  Filter, Search, TrendingUp, BarChart3, Clock
} from 'lucide-react';
import Link from 'next/link';
import { PostCard } from './PostCard';
import { LoadMoreButton } from './LoadMoreButton';

interface MerryBlogPost {
  id: number;
  slug: string;
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
  stockTickers: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  keywords: string[];
  featured: boolean;
  readingTime: number;
  publishedAt: string;
}

interface PostListProps {
  initialDisplayCount?: number;
  showFeatured?: boolean;
  category?: string;
}

interface ApiResponse {
  success: boolean;
  data: MerryBlogPost[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrev: boolean;
    categories: string[];
    featuredCount: number;
  };
}

export function PostList({ 
  initialDisplayCount = 3, 
  showFeatured = true,
  category = 'all'
}: PostListProps) {
  const [posts, setPosts] = useState<MerryBlogPost[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<MerryBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'likes'>('date');
  const [showOnlyFeatured, setShowOnlyFeatured] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    fetchPosts(true);
  }, [selectedCategory, showOnlyFeatured]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [posts, searchQuery, sortBy]);

  const fetchPosts = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setCurrentOffset(0);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        limit: '50', // 더 많은 데이터를 가져와서 클라이언트에서 필터링
        offset: reset ? '0' : currentOffset.toString(),
        category: selectedCategory,
        featured: showOnlyFeatured ? 'true' : 'false'
      });

      const response = await fetch(`/api/merry/posts?${params}`);
      const result: ApiResponse = await response.json();

      if (result.success) {
        if (reset) {
          setPosts(result.data);
          setDisplayedPosts(result.data.slice(0, initialDisplayCount));
        } else {
          const newPosts = [...posts, ...result.data];
          setPosts(newPosts);
          setDisplayedPosts(newPosts.slice(0, currentOffset + initialDisplayCount));
        }
        
        setMeta(result.meta);
        setCategories(result.meta.categories);
        setHasMore(result.meta.hasNext);
        setCurrentOffset(reset ? 0 : currentOffset + result.data.length);
      }
    } catch (error) {
      console.error('포스트 로드 실패:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...posts];

    // 검색 필터
    if (searchQuery) {
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        post.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'views':
          return b.views - a.views;
        case 'likes':
          return b.likes - a.likes;
        case 'date':
        default:
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
    });

    setDisplayedPosts(filtered.slice(0, Math.max(initialDisplayCount, displayedPosts.length)));
  };

  const loadMore = () => {
    const nextCount = displayedPosts.length + initialDisplayCount;
    const filtered = getFilteredPosts();
    setDisplayedPosts(filtered.slice(0, nextCount));
  };

  const getFilteredPosts = () => {
    let filtered = [...posts];

    if (searchQuery) {
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        post.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'views':
          return b.views - a.views;
        case 'likes':
          return b.likes - a.likes;
        case 'date':
        default:
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
    });

    return filtered;
  };

  const canLoadMore = () => {
    const filtered = getFilteredPosts();
    return displayedPosts.length < filtered.length;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Filter Skeleton */}
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-48" />
        </div>
        
        {/* Posts Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Stats */}
      {meta && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📚 메르의 포스트 라이브러리
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{meta.total}</div>
              <div className="text-sm text-gray-600">전체 포스트</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{meta.featuredCount}</div>
              <div className="text-sm text-gray-600">추천 포스트</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{categories.length}</div>
              <div className="text-sm text-gray-600">카테고리</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(posts.reduce((sum, p) => sum + p.readingTime, 0) / posts.length || 0)}
              </div>
              <div className="text-sm text-gray-600">평균 읽기 시간</div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="포스트, 태그, 키워드로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">전체 카테고리</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="date">최신순</option>
            <option value="views">조회수순</option>
            <option value="likes">좋아요순</option>
          </select>

          {/* Featured Filter */}
          <Button
            variant={showOnlyFeatured ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyFeatured(!showOnlyFeatured)}
          >
            ✨ 추천만
          </Button>
        </div>
      </div>

      {/* Featured Posts Section */}
      {showFeatured && !showOnlyFeatured && selectedCategory === 'all' && (
        <div className="mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="text-yellow-500" size={24} />
            ✨ 추천 포스트
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            {posts.filter(post => post.featured).slice(0, 4).map((post) => (
              <PostCard key={post.id} post={post} featured />
            ))}
          </div>
        </div>
      )}

      {/* Main Posts Grid */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <TrendingUp className="text-blue-500" size={24} />
          {selectedCategory === 'all' ? '모든 포스트' : `${selectedCategory} 포스트`}
          <span className="text-sm font-normal text-gray-500">
            ({getFilteredPosts().length}개)
          </span>
        </h3>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {displayedPosts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">🔍</div>
            <p className="text-gray-600">
              {searchQuery 
                ? `"${searchQuery}"에 대한 검색 결과가 없습니다.` 
                : '포스트가 없습니다.'}
            </p>
          </div>
        )}

        {/* Load More Button */}
        {canLoadMore() && (
          <div className="mt-8 text-center">
            <LoadMoreButton 
              onClick={loadMore}
              loading={loadingMore}
              remainingCount={getFilteredPosts().length - displayedPosts.length}
            />
          </div>
        )}
      </div>
    </div>
  );
}