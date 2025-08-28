'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, User, Tag, Eye, MessageSquare, Heart, Share2, Filter, Grid3X3, List, TrendingUp, CalendarDays, BookOpen, Search, X } from 'lucide-react';
import Link from 'next/link';
import CompactCalendar from '@/components/merry/CompactCalendar';
import MerryPicks from '@/components/merry/MerryPicks';

interface MerryPost {
  log_no: string;
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
  mentionedStocks?: string[];
  investmentTheme?: string;
  sentimentTone?: string;
  claudeSummary?: string;
}

function MerryPageContent() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<MerryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalPosts, setTotalPosts] = useState<number>(0);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [availableStocks, setAvailableStocks] = useState<Array<{ticker: string, name: string, count: number}>>([]);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [activeTab, setActiveTab] = useState<string>('posts');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<MerryPost[]>([]);
  const [showSearchPreview, setShowSearchPreview] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>(''); // 실제 메인 리스트에 적용된 검색어

  // URL 파라미터로부터 탭 설정
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['posts', 'picks', 'calendar', 'analysis'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // 필터 변경시 포스트 다시 로드
  useEffect(() => {
    if (activeTab === 'posts') {
      loadPosts(true);
    }
  }, [dateFilter, categoryFilter, activeSearchQuery]);

  // 검색어가 변경될 때만 검색 미리보기 실행
  useEffect(() => {
    if (searchQuery.trim() && showSearchPreview) {
      performSearch();
    } else {
      setSearchResults([]);
      setShowSearchPreview(false);
    }
  }, [searchQuery]);

  // 초기 로드 및 종목 목록 로드
  useEffect(() => {
    loadPosts(true);
    loadAvailableStocks();
  }, []);

  const loadAvailableStocks = async () => {
    try {
      console.log('🔄 종목 목록 로딩 시작...');
      const response = await fetch('/api/merry/stocks');
      const result = await response.json();
      console.log('📊 종목 API 응답:', result);
      
      if (result.success && result.data?.stocks) {
        const stocksWithMentions = result.data.stocks
          .filter((stock: any) => stock.mention_count > 0)
          .map((stock: any) => ({
            ticker: stock.ticker,
            name: stock.name || stock.ticker,
            count: stock.mention_count
          }))
          .sort((a: any, b: any) => b.count - a.count);
        
        console.log('✅ 필터링된 종목 목록:', stocksWithMentions);
        setAvailableStocks(stocksWithMentions);
      } else {
        console.error('❌ 종목 API 응답 구조 오류:', result);
      }
    } catch (error) {
      console.error('❌ 종목 목록 로드 실패:', error);
    }
  };

  const loadPosts = async (resetPosts = false) => {
    if (resetPosts) {
      setLoading(true);
      setPosts([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = resetPosts ? 0 : posts.length;
      const limit = 10;
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      if (dateFilter && dateFilter !== 'all') params.append('date', dateFilter);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (activeSearchQuery && activeSearchQuery.trim()) {
        params.append('search', activeSearchQuery.trim());
        console.log('🔍 검색어 적용:', activeSearchQuery.trim());
      }

      const response = await fetch(`/api/merry/posts?${params.toString()}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const formattedPosts: MerryPost[] = result.data.map((post: any) => ({
          log_no: post.log_no || post.id,
          title: post.title,
          content: post.content || post.excerpt,
          excerpt: post.excerpt || post.content?.substring(0, 200) + '...',
          category: post.category || '일반',
          author: '메르',
          createdAt: post.createdAt || post.date,
          views: post.views || 0,
          likes: post.likes || 0,
          comments: post.comments || 0,
          tags: post.tags || [],
          featured: post.featured || false,
          claudeSummary: post.claudeSummary || post.excerpt || post.content?.substring(0, 150) + '...'
        }));
        
        if (resetPosts) {
          setPosts(formattedPosts);
          if (formattedPosts.length > 0) {
            console.log('첫 번째 포스트 데이터:', {
              log_no: formattedPosts[0]?.log_no,
              title: formattedPosts[0]?.title,
              category: formattedPosts[0]?.category
            });
          }
        } else {
          setPosts(prev => [...prev, ...formattedPosts]);
        }
        
        setHasMore(result.meta?.hasNext || false);
        
        if (result.meta?.total !== undefined) {
          setTotalPosts(result.meta.total);
        }
      } else {
        console.error('포스트 로드 실패:', result.error);
      }
    } catch (error) {
      console.error('API 호출 실패:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMorePosts = () => {
    loadPosts(false);
  };

  // 검색 미리보기 수행
  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '5', // 미리보기는 5개만
        offset: '0',
        search: searchQuery.trim()
      });
      
      const response = await fetch(`/api/merry/posts?${params.toString()}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const formattedResults: MerryPost[] = result.data.map((post: any) => ({
          log_no: post.log_no || post.id,
          title: post.title,
          content: post.content || post.excerpt,
          excerpt: post.excerpt || post.content?.substring(0, 100) + '...',
          category: post.category || '일반',
          author: '메르',
          createdAt: post.createdAt || post.date,
          views: post.views || 0,
          likes: post.likes || 0,
          comments: post.comments || 0,
          tags: post.tags || [],
          featured: post.featured || false,
          claudeSummary: post.claudeSummary || post.excerpt
        }));
        
        setSearchResults(formattedResults);
      }
    } catch (error) {
      console.error('검색 실패:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // 검색 결과 선택 시 메인 리스트에 적용
  const applySearch = () => {
    setActiveSearchQuery(searchQuery); // 검색어를 activeSearchQuery로 설정
    setShowSearchPreview(false);
  };

  // 검색 초기화
  const clearSearch = () => {
    setSearchQuery('');
    setActiveSearchQuery(''); // activeSearchQuery도 초기화
    setShowSearchInput(false);
    setShowSearchPreview(false);
    setSearchResults([]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading && activeTab === 'posts') {
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
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          🎭 우리형 메르
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          일상, 투자, 독서, 그리고 삶의 다양한 이야기들을 나누는 공간입니다. 
          메르만의 독특한 시각으로 세상을 바라본 이야기들을 만나보세요.
        </p>
      </div>

      {/* 탭 시스템 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="posts" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            포스트
          </TabsTrigger>
          <TabsTrigger value="picks" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            메르's Pick
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            매크로 캘린더
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            종목 분석
          </TabsTrigger>
        </TabsList>

        {/* 포스트 탭 */}
        <TabsContent value="posts">
          {/* 필터 섹션 */}
          <div className="mb-8">
            <div className="flex items-center gap-4 p-4 bg-muted/50 border rounded-lg">
              <Filter size={20} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">필터:</span>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="기간" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 기간</SelectItem>
                  <SelectItem value="week">최근 1주</SelectItem>
                  <SelectItem value="month">최근 1개월</SelectItem>
                  <SelectItem value="quarter">최근 3개월</SelectItem>
                  <SelectItem value="year">최근 1년</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 카테고리</SelectItem>
                  <SelectItem value="주절주절">주절주절</SelectItem>
                  <SelectItem value="경제/주식/국제정세/사회">경제/주식/국제정세/사회</SelectItem>
                  <SelectItem value="건강/의학/맛집/일상/기타">건강/의학/맛집/일상/기타</SelectItem>
                </SelectContent>
              </Select>

              {/* 검색 입력 필드 */}
              <div className="relative flex items-center">
                {showSearchInput ? (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="relative flex items-center">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <input
                            type="text"
                            placeholder="제목 또는 종목명으로 검색..."
                            value={searchQuery}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSearchQuery(value);
                              if (value.trim()) {
                                setShowSearchPreview(true);
                              } else {
                                setShowSearchPreview(false);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                applySearch();
                              }
                            }}
                            className="pl-10 pr-12 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                            autoFocus
                          />
                          {/* 검색 버튼 */}
                          <Button
                            type="button"
                            onClick={applySearch}
                            className="absolute right-0 top-0 h-full px-3 rounded-l-none rounded-r-lg bg-blue-500 hover:bg-blue-600 text-white"
                            disabled={!searchQuery.trim()}
                          >
                            <Search className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* 검색 미리보기 드롭다운 */}
                      {showSearchPreview && searchQuery.trim() && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                          {searchLoading ? (
                            <div className="p-4 text-center text-muted-foreground">
                              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                              검색 중...
                            </div>
                          ) : searchResults.length > 0 ? (
                            <>
                              <div className="px-3 py-2 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
                                검색 결과 ({searchResults.length}개)
                              </div>
                              {searchResults.map((post) => (
                                <Link 
                                  key={post.log_no} 
                                  href={`/merry/posts/${post.log_no}`}
                                  className="block px-3 py-2 hover:bg-muted/50 border-b last:border-b-0"
                                  onClick={() => setShowSearchPreview(false)}
                                >
                                  <div className="font-medium text-sm text-foreground line-clamp-1">
                                    {post.title}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {post.claudeSummary || post.excerpt}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {formatDate(post.createdAt)} · 조회 {post.views}속
                                  </div>
                                </Link>
                              ))}
                              <div className="px-3 py-2 border-t bg-muted/50">
                                <button
                                  onClick={applySearch}
                                  className="text-sm text-blue-600 hover:text-blue-800 font-medium w-full text-left"
                                >
                                  모든 검색 결과 보기 →
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="p-4 text-center text-muted-foreground">
                              검색 결과가 없습니다.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSearchInput(true)}
                    className="flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    검색
                  </Button>
                )}
              </div>

              {(dateFilter !== 'all' || categoryFilter !== 'all' || activeSearchQuery.trim()) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setDateFilter('all');
                    setCategoryFilter('all');
                    clearSearch();
                  }}
                >
                  모든 필터 초기화
                </Button>
              )}
            </div>
          </div>

          {/* All Posts */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                📝 {activeSearchQuery.trim() ? `"${activeSearchQuery}" 검색 결과` : '모든 포스트'}
                {totalPosts > 0 && (
                  <span className="text-base font-normal text-muted-foreground ml-2">
                    (총 {totalPosts}개)
                  </span>
                )}
              </h2>
              
              {/* View Toggle Buttons */}
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className="px-3"
                >
                  <Grid3X3 size={16} className="mr-1" />
                  카드
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="px-3"
                >
                  <List size={16} className="mr-1" />
                  리스트
                </Button>
              </div>
            </div>
            
            {/* Conditional rendering based on view mode */}
            {viewMode === 'card' ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Card key={post.log_no} className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-foreground group-hover:text-blue-600 transition-colors">
                      <Link href={`/merry/posts/${post.log_no}`}>
                        {post.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4 line-clamp-3">{post.claudeSummary || post.excerpt}</p>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {(() => {
                        let tagsArray: string[] = [];
                        
                        try {
                          if (post.tags) {
                            if (typeof post.tags === 'string') {
                              try {
                                const parsed = JSON.parse(post.tags);
                                if (Array.isArray(parsed)) {
                                  tagsArray = parsed.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
                                }
                              } catch (parseError) {
                                console.warn(`Failed to parse tags for post ${post.log_no}:`, parseError);
                                tagsArray = [];
                              }
                            } else if (Array.isArray(post.tags)) {
                              tagsArray = post.tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
                            }
                          }
                        } catch (error) {
                          console.error(`Tag processing error for post ${post.log_no}:`, error);
                          tagsArray = [];
                        }
                        
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
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.log_no} className="group p-4 border rounded-lg hover:shadow-md transition-shadow bg-card">
                    <Link href={`/merry/posts/${post.log_no}`} className="block">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-foreground group-hover:text-blue-600 transition-colors flex-1 mr-4">
                          {post.title}
                        </h3>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(post.createdAt)}
                        </span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* 더보기 버튼 */}
            {hasMore && posts.length > 0 && (
              <div className="flex justify-center mt-8">
                <Button 
                  onClick={loadMorePosts}
                  disabled={loadingMore}
                  size="lg"
                  className="px-8"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      로딩 중...
                    </>
                  ) : (
                    '더보기 (10개씩)'
                  )}
                </Button>
              </div>
            )}

            {posts.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-4">{searchQuery.trim() ? '🔍' : '📝'}</div>
                <p className="text-gray-600">
                  {activeSearchQuery.trim()
                    ? `"${activeSearchQuery}"에 대한 검색 결과가 없습니다.`
                    : dateFilter !== 'all' || categoryFilter !== 'all'
                    ? '선택한 필터에 해당하는 포스트가 없습니다.'
                    : '아직 포스트가 없습니다.'
                  }
                </p>
                {activeSearchQuery.trim() && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={clearSearch}
                  >
                    검색 초기화
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 메르's Pick 탭 */}
        <TabsContent value="picks">
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">🎯 메르's Pick</h2>
              <p className="text-muted-foreground">메르가 주목하는 종목들을 확인해보세요</p>
            </div>
            <MerryPicks />
          </div>
        </TabsContent>

        {/* 매크로 캘린더 탭 */}
        <TabsContent value="calendar">
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">📅 매크로 캘린더</h2>
              <p className="text-muted-foreground">주요 경제 이벤트와 실적 발표 일정을 확인하세요</p>
            </div>
            <div className="max-w-4xl mx-auto">
              <CompactCalendar />
            </div>
          </div>
        </TabsContent>

        {/* 종목 분석 탭 */}
        <TabsContent value="analysis">
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">📊 종목 분석</h2>
              <p className="text-muted-foreground">메르가 언급한 종목들의 상세 분석</p>
            </div>
            
            {/* 종목 리스트 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableStocks.map(stock => (
                <Link key={stock.ticker} href={`/merry/stocks/${stock.ticker}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-foreground">{stock.ticker}</h3>
                          <p className="text-sm text-muted-foreground">{stock.name}</p>
                        </div>
                        <Badge variant="secondary">
                          언급 {stock.count}회
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {availableStocks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">아직 분석된 종목이 없습니다.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MerryPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-center items-center min-h-96">
          <div className="text-center">
            <div className="text-2xl mb-4">📝</div>
            <p className="text-muted-foreground">메르 블로그를 불러오는 중...</p>
          </div>
        </div>
      </div>
    }>
      <MerryPageContent />
    </Suspense>
  );
}