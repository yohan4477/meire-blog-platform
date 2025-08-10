'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PostCard from '@/components/blog/PostCard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BlogPost } from '@/types';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PostsPage() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // URL 파라미터에서 필터 정보 가져오기
  useEffect(() => {
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    
    setSelectedCategory(category);
    setSearchQuery(search);
    setCurrentPage(page);
  }, [searchParams]);

  // 포스트와 카테고리 로딩
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // 포스트 목록 가져오기
        const postsUrl = new URL('/api/posts', window.location.origin);
        if (selectedCategory) postsUrl.searchParams.set('category', selectedCategory);
        if (searchQuery) postsUrl.searchParams.set('search', searchQuery);
        postsUrl.searchParams.set('limit', '12');
        postsUrl.searchParams.set('offset', ((currentPage - 1) * 12).toString());

        const postsResponse = await fetch(postsUrl.toString());
        const postsData = await postsResponse.json();
        
        if (postsData.success) {
          setPosts(postsData.data || []);
          setTotalPages(postsData.meta?.totalPages || 1);
        } else {
          console.error('Posts API error:', postsData.error);
          setPosts([]);
          setTotalPages(1);
        }

        // 카테고리 목록 가져오기
        const categoriesResponse = await fetch('/api/categories');
        const categoriesData = await categoriesResponse.json();
        
        if (categoriesData.success) {
          setCategories(categoriesData.data || []);
        } else {
          console.error('Categories API error:', categoriesData.error);
          setCategories([]);
        }
        
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedCategory, searchQuery, currentPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    updateURL({ search: searchQuery, category: selectedCategory, page: 1 });
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    updateURL({ search: searchQuery, category, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL({ search: searchQuery, category: selectedCategory, page });
  };

  const updateURL = (params: { search: string; category: string; page: number }) => {
    const url = new URL(window.location.href);
    if (params.search) url.searchParams.set('search', params.search);
    else url.searchParams.delete('search');
    if (params.category) url.searchParams.set('category', params.category);
    else url.searchParams.delete('category');
    if (params.page > 1) url.searchParams.set('page', params.page.toString());
    else url.searchParams.delete('page');
    
    window.history.pushState({}, '', url.toString());
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSearchQuery('');
    setCurrentPage(1);
    window.history.pushState({}, '', '/posts');
  };

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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">모든 포스트</h1>
        
        {/* 검색 */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="포스트 검색..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge 
            variant={selectedCategory === '' ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => handleCategorySelect('')}
          >
            전체 ({categories.reduce((sum, cat) => sum + cat.count, 0)})
          </Badge>
          {categories.map((category) => (
            <Badge 
              key={category.name}
              variant={selectedCategory === category.name ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => handleCategorySelect(category.name)}
            >
              {category.name} ({category.count})
            </Badge>
          ))}
        </div>

        {/* 활성 필터 표시 */}
        {(selectedCategory || searchQuery) && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <span>활성 필터:</span>
            {selectedCategory && <Badge variant="outline">{selectedCategory}</Badge>}
            {searchQuery && <Badge variant="outline">"{searchQuery}"</Badge>}
            <Button variant="link" size="sm" onClick={clearFilters}>
              모든 필터 지우기
            </Button>
          </div>
        )}
      </div>

      {/* 포스트 목록 */}
      {posts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => 
                  page === 1 || 
                  page === totalPages || 
                  Math.abs(page - currentPage) <= 2
                )
                .map((page, index, array) => (
                  <div key={page} className="flex items-center">
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  </div>
                ))}

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">
            {searchQuery || selectedCategory 
              ? '검색 조건에 맞는 포스트를 찾을 수 없습니다.' 
              : '포스트가 없습니다.'}
          </p>
          {(searchQuery || selectedCategory) && (
            <Button onClick={clearFilters}>모든 포스트 보기</Button>
          )}
        </div>
      )}
    </div>
  );
}