'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, User, Tag, Eye, MessageSquare, Heart, Share2, Filter } from 'lucide-react';
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
  // 새로운 필드들 추가
  mentionedStocks?: string[];
  investmentTheme?: string;
  sentimentTone?: string;
  // Claude 분석 결과
  claudeSummary?: string;
}

export default function MerryPage() {
  const [posts, setPosts] = useState<MerryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalPosts, setTotalPosts] = useState<number>(0);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [tickerFilter, setTickerFilter] = useState<string>('all');
  const [availableStocks, setAvailableStocks] = useState<Array<{ticker: string, name: string, count: number}>>([]);

  // 필터 변경시 포스트 다시 로드
  useEffect(() => {
    loadPosts(true);
  }, [dateFilter, tickerFilter]);

  // 초기 로드 및 종목 목록 로드
  useEffect(() => {
    loadPosts(true);
    loadAvailableStocks();
  }, []);

  const loadAvailableStocks = async () => {
    try {
      const response = await fetch('/api/merry/stocks');
      const result = await response.json();
      
      if (result.success && result.data?.stocks) {
        // 언급 횟수가 있는 종목만 필터링하고 정렬
        const stocksWithMentions = result.data.stocks
          .filter((stock: any) => stock.mention_count > 0)
          .map((stock: any) => ({
            ticker: stock.ticker,
            name: stock.name || stock.ticker,
            count: stock.mention_count
          }))
          .sort((a: any, b: any) => b.count - a.count);
        
        setAvailableStocks(stocksWithMentions);
      }
    } catch (error) {
      console.error('종목 목록 로드 실패:', error);
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
      
      // URL 파라미터 구성
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      if (dateFilter && dateFilter !== 'all') params.append('date', dateFilter);
      if (tickerFilter && tickerFilter !== 'all') params.append('ticker', tickerFilter);

      const response = await fetch(`/api/merry/posts?${params.toString()}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // API 데이터를 MerryPost 형식으로 변환
        const formattedPosts: MerryPost[] = result.data.map((post: any) => ({
          id: post.id,
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
        } else {
          setPosts(prev => [...prev, ...formattedPosts]);
        }
        
        // 더 보기 버튼 표시 여부 결정
        setHasMore(result.meta?.hasNext || false);
        
        // 총 포스트 수 업데이트
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
        <h1 className="text-4xl font-bold text-foreground mb-4">
          🎭 우리형 메르
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          일상, 투자, 독서, 그리고 삶의 다양한 이야기들을 나누는 공간입니다. 
          메르만의 독특한 시각으로 세상을 바라본 이야기들을 만나보세요.
        </p>
      </div>



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


          <Select value={tickerFilter} onValueChange={setTickerFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="종목 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 종목</SelectItem>
              {availableStocks.map((stock) => (
                <SelectItem key={stock.ticker} value={stock.ticker}>
                  {stock.name} ({stock.ticker}) - {stock.count}개 언급
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(dateFilter !== 'all' || tickerFilter !== 'all') && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setDateFilter('all');
                setTickerFilter('all');
              }}
            >
              초기화
            </Button>
          )}
        </div>
      </div>

      {/* All Posts */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6">
          📝 모든 포스트 
          {totalPosts > 0 && (
            <span className="text-base font-normal text-muted-foreground ml-2">
              (총 {totalPosts}개)
            </span>
          )}
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="group-hover:text-blue-600 transition-colors">
                  <Link href={`/merry/posts/${post.id}`}>
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
            <div className="text-gray-400 text-lg mb-4">📝</div>
            <p className="text-gray-600">
              {dateFilter !== 'all' || tickerFilter !== 'all'
                ? '선택한 필터에 해당하는 포스트가 없습니다.'
                : '아직 포스트가 없습니다.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}