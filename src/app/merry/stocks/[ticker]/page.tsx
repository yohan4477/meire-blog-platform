'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// 실제 사용되는 필수 아이콘만 import (모듈 최소화)
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ChevronLeft, 
  Calendar,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ui/error-boundary';

// 직접 import로 성능 개선 (동적 import 제거)
import StockPriceChart from '@/components/merry/StockPriceChart';

// StockTags는 일반 import로 복원 (동적 import 오류 수정)
import { StockTags } from '@/components/ui/StockTags';

interface Stock {
  ticker: string;
  name: string;
  company_name: string;
  market: string;
  mentions: number;
  mention_count: number;
  analyzed_count: number;
  postCount: number;
  firstMention: string;
  lastMention: string;
  first_mentioned_date?: string;
  last_mentioned_date?: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  tags?: string[] | string;
  description: string;
  currentPrice: number;
  currency: string;
  priceChange: string;
  recentPosts?: any[];
}

interface Post {
  id: number;
  title: string;
  excerpt: string;
  created_date: string;
  published_date?: string;
  views?: number;
  category?: string;
}

interface PostsState {
  posts: Post[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  currentOffset: number;
  limit: number;
}

// 태그 개수 계산 헬퍼 함수
const getTagsLength = (stock: any): number => {
  if (!stock?.tags) return 0;
  
  try {
    if (typeof stock.tags === 'string') {
      const parsed = JSON.parse(stock.tags);
      return Array.isArray(parsed) ? parsed.length : 0;
    } else if (Array.isArray(stock.tags)) {
      return stock.tags.length;
    }
  } catch (error) {
    console.error('Tag length calculation error:', error);
  }
  
  return 0;
};

export default function StockDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ticker = params?.['ticker'] as string;
  
  const [stock, setStock] = useState<Stock | null>(null);
  // URL 파라미터에서 period를 읽어서 timeRange 설정
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>(() => {
    // URL에서 period 파라미터 확인
    const urlPeriod = searchParams?.get('period')?.toUpperCase();
    if (urlPeriod && ['1M', '3M', '6M', '1Y'].includes(urlPeriod)) {
      return urlPeriod as '1M' | '3M' | '6M' | '1Y';
    }
    // URL 파라미터가 없으면 기본값 설정 (요구사항: 모바일 3M, 데스크탑 1Y)
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? '3M' : '1Y';
    }
    return '1Y'; // SSR 시 데스크탑 기본값
  });
  const [postsState, setPostsState] = useState<PostsState>({
    posts: [],
    total: 0,
    hasMore: false,
    loading: true,
    loadingMore: false,
    currentOffset: 0,
    limit: 5
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allPosts, setAllPosts] = useState<Post[]>([]); // 통계용 전체 포스트

  // URL 파라미터 변경 시 timeRange 동기화
  useEffect(() => {
    const urlPeriod = searchParams?.get('period')?.toUpperCase();
    if (urlPeriod && ['1M', '3M', '6M', '1Y'].includes(urlPeriod)) {
      const newTimeRange = urlPeriod as '1M' | '3M' | '6M' | '1Y';
      if (newTimeRange !== timeRange) {
        console.log(`🔄 URL period change: ${timeRange} → ${newTimeRange}`);
        setTimeRange(newTimeRange);
      }
    }
  }, [searchParams, timeRange]);

  // 모바일 가로모드 감지 및 1Y 차트 전환
  useEffect(() => {
    const handleOrientationChange = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 640) {
        // 모바일 기기에서만 동작
        if (window.screen && window.screen.orientation) {
          // 가로모드일 때 1Y로 변경
          if (window.screen.orientation.angle === 90 || window.screen.orientation.angle === -90) {
            setTimeRange('1Y');
          }
        }
      }
    };

    // orientation change 이벤트 리스너 추가
    if (typeof window !== 'undefined' && window.screen && window.screen.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientationChange);
    }

    return () => {
      // cleanup
      if (typeof window !== 'undefined' && window.screen && window.screen.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientationChange);
      }
    };
  }, []);

  useEffect(() => {
    if (ticker) {
      fetchStockData();
      fetchRelatedPosts(0, true); // 첫 번째 로드
      fetchAllRelatedPosts(); // 통계용 전체 포스트 로드
    }
  }, [ticker]);

  const fetchStockData = async () => {
    try {
      console.log(`🔍 Loading stock data for ${ticker}...`);
      
      // 개별 종목 API 사용으로 빠른 로딩
      const response = await fetch(`/api/merry/stocks/${ticker}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // 개별 종목 API 응답 구조에 맞게 데이터 매핑
        const stockData = {
          ticker: data.data.ticker,
          name: data.data.name,
          company_name: data.data.name,
          market: data.data.market,
          currentPrice: data.data.currentPrice || 0,
          priceChange: data.data.priceChange || '+0.00%',
          currency: data.data.currency || 'USD',
          description: data.data.description || `${ticker} 종목`,
          mentions: data.data.stats?.totalMentions || 0,
          mention_count: data.data.stats?.totalMentions || 0,
          analyzed_count: data.data.mentions?.length || 0,
          postCount: data.data.stats?.totalPosts || 0,
          lastMention: data.data.stats?.lastMention || '',
          firstMention: data.data.stats?.firstMention || '',
          first_mentioned_date: data.data.stats?.firstMention || '',
          last_mentioned_date: data.data.stats?.lastMention || '',
          sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
          tags: data.data.tags || [] // stocks 테이블의 tags 컬럼 사용
        };
        
        console.log(`✅ Stock data loaded:`, stockData);
        setStock(stockData);
      } else {
        console.warn(`❌ Stock ${ticker} not found, using fallback`);
        // Fallback: 종목을 찾지 못한 경우 기본 정보로 생성
        setStock({
          ticker,
          name: ticker,
          company_name: ticker,
          mentions: 0,
          lastMention: '',
          firstMention: '',
          postCount: 0,
          currentPrice: 0,
          priceChange: '+0.00%',
          currency: ticker.length === 6 ? 'KRW' : 'USD',
          market: ticker.length === 6 ? 'KOSPI' : 'NASDAQ',
          description: `${ticker} 종목 정보`,
          tags: ['투자', '종목'],
          mention_count: 0,
          analyzed_count: 0,
          sentiment: 'neutral' as 'positive' | 'neutral' | 'negative'
        });
      }
    } catch (err) {
      console.error('❌ Stock data fetch error:', err);
      setError(`종목 ${ticker} 데이터를 불러올 수 없습니다.`);
      
      // Network error 시에도 fallback 제공
      setStock({
        ticker,
        name: ticker,
        company_name: ticker,
        mentions: 0,
        lastMention: '',
        firstMention: '',
        postCount: 0,
        currentPrice: 0,
        priceChange: '+0.00%',
        currency: ticker.length === 6 ? 'KRW' : 'USD',
        market: ticker.length === 6 ? 'KOSPI' : 'NASDAQ',
        description: `${ticker} 종목 정보`,
        tags: ['투자', '종목'],
        mention_count: 0,
        analyzed_count: 0,
        sentiment: 'neutral' as 'positive' | 'neutral' | 'negative'
      });
    } finally {
      console.log(`🏁 Loading completed for ${ticker}`);
      setLoading(false);
    }
  };

  const fetchAllRelatedPosts = async () => {
    try {
      const response = await fetch(`/api/merry/stocks/${ticker}/posts?limit=1000&offset=0`);
      const data = await response.json();
      
      if (data.success) {
        const allPostsData = Array.isArray(data.data.posts) ? data.data.posts.map((post: any) => ({
          ...post,
          created_date: post.published_date || post.created_date
        })) : [];
        setAllPosts(allPostsData);
        
        // 전체 포스트 수를 postsState.total에 반영
        setPostsState(prev => ({
          ...prev,
          total: data.data.total || allPostsData.length
        }));
      }
    } catch (err) {
      console.error('전체 관련 포스트 로딩 실패:', err);
    }
  };

  const fetchRelatedPosts = async (offset: number = 0, isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setPostsState(prev => ({ ...prev, loading: true }));
      } else {
        setPostsState(prev => ({ ...prev, loadingMore: true }));
      }

      const response = await fetch(`/api/merry/stocks/${ticker}/posts?limit=${postsState.limit}&offset=${offset}`);
      const data = await response.json();
      
      if (data.success) {
        const newPosts = Array.isArray(data.data.posts) ? data.data.posts.map((post: any) => ({
          ...post,
          created_date: post.published_date || post.created_date
        })) : [];

        setPostsState(prev => ({
          ...prev,
          posts: isInitial ? newPosts : [...prev.posts, ...newPosts],
          total: data.data.total,
          hasMore: data.data.hasMore,
          currentOffset: offset + postsState.limit,
          loading: false,
          loadingMore: false
        }));
      }
    } catch (err) {
      console.error('관련 포스트 로딩 실패:', err);
      setPostsState(prev => ({ 
        ...prev, 
        loading: false, 
        loadingMore: false 
      }));
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (!postsState.loadingMore && postsState.hasMore) {
      fetchRelatedPosts(postsState.currentOffset, false);
    }
  };

  // 시간 범위 변경 핸들러 추가
  const handleTimeRangeChange = (range: '1M' | '3M' | '6M' | '1Y') => {
    setTimeRange(range);
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'negative':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSentimentText = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '긍정적';
      case 'negative':
        return '부정적';
      default:
        return '중립적';
    }
  };

  const getMarketColor = (market: string) => {
    switch (market) {
      case 'KOSPI':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'NASDAQ':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'NYSE':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'TSE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Link href="/merry/stocks">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" />
            종목 목록으로 돌아가기
          </Button>
        </Link>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // stock이 null이거나 undefined인 경우 추가 보호
  if (!stock) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Link href="/merry/stocks">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" />
            종목 목록으로 돌아가기
          </Button>
        </Link>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">종목 정보를 불러올 수 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href="/merry/stocks">
        <Button variant="ghost" size="sm" className="mb-6">
          <ChevronLeft className="w-4 h-4 mr-1" />
          종목 목록으로 돌아가기
        </Button>
      </Link>

      {/* 종목 정보 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl lg:text-3xl font-bold truncate">{stock.company_name || stock.name}</h1>
                {getSentimentIcon(stock.sentiment)}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-sm">
                  {stock.ticker}
                </Badge>
                <Badge className={`text-sm ${getMarketColor(stock.market)}`}>
                  {stock.market}
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  {getSentimentText(stock.sentiment)}
                </Badge>
              </div>
            </div>
            
            <div className="text-left lg:text-right flex-shrink-0">
              <div className="flex flex-col lg:items-end">
                <div className="text-xl lg:text-2xl font-bold mb-1 break-words">
                  <span className="inline-block">
                    {stock.currency === 'USD' ? '$' : '₩'}{stock.currentPrice?.toLocaleString()}
                  </span>
                  {stock.priceChange && (
                    <span className={`block lg:inline lg:ml-2 text-base lg:text-lg mt-1 lg:mt-0 ${stock.priceChange?.startsWith('+') ? 'text-green-500' : stock.priceChange?.startsWith('-') ? 'text-red-500' : 'text-gray-500'}`}>
                      {stock.priceChange}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">현재가</p>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">{stock.description}</p>
          
          {/* 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg border">
              <div className="text-2xl font-bold text-primary">{stock.mention_count || 0}</div>
              <div className="text-sm text-muted-foreground">언급된 포스트</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg border">
              <div className="text-2xl font-bold text-primary">
                {getTagsLength(stock)}
              </div>
              <div className="text-sm text-muted-foreground">관련 태그</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg border">
              <div className="text-sm font-bold text-primary">
                {stock.first_mentioned_date 
                  ? new Date(stock.first_mentioned_date).toLocaleDateString('ko-KR')
                  : '정보 없음'
                }
              </div>
              <div className="text-sm text-muted-foreground">첫 언급</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg border">
              <div className="text-sm font-bold text-primary">
                {stock.last_mentioned_date 
                  ? new Date(stock.last_mentioned_date).toLocaleDateString('ko-KR')
                  : '정보 없음'
                }
              </div>
              <div className="text-sm text-muted-foreground">최근 언급</div>
            </div>
          </div>
          
          {/* 태그 */}
          <div className="space-y-2">
            <h3 className="font-semibold">관련 태그</h3>
            <div>
              {stock.tags ? (
                <StockTags 
                  tags={stock.tags} 
                  maxTags={8}
                  size="md"
                />
              ) : (
                <span className="text-sm text-muted-foreground">관련 태그 없음</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 가격 차트 */}
      <div className="mb-6">
        <ErrorBoundary level="section" showDetails={process.env.NODE_ENV === 'development'}>
          <StockPriceChart
            ticker={stock.ticker}
            timeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            stockName={stock.company_name || stock.name}
            description={stock.description}
            stock={stock}
          />
        </ErrorBoundary>
        
        {/* 모바일 가로모드 안내 */}
        <div className="mt-2 sm:hidden text-xs text-gray-500 dark:text-gray-400 text-center">
          📱 <strong>모바일 팁:</strong> 핸드폰을 가로로 눕히면 1Y(1년) 차트로 자동 전환됩니다
        </div>
      </div>


      {/* 관련 포스트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            관련 포스트 (총 {postsState.total}개 중 {postsState.posts.length}개 표시)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {stock.name}이(가) 언급된 메르의 최근 포스트들입니다
          </p>
        </CardHeader>
        <CardContent>
          {postsState.loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : postsState.posts.length > 0 ? (
            <>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 <strong>참고:</strong> 총 {postsState.total}개 포스트 중 
                  현재 {postsState.posts.length}개를 보여드립니다.
                  {postsState.hasMore && " 더보기를 눌러 추가 포스트를 확인하세요."}
                </p>
              </div>
              <div className="space-y-4">
                {Array.isArray(postsState.posts) && postsState.posts.map(post => (
                <Link key={post.id} href={`/merry/posts/${post.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border bg-card">
                    <div className="space-y-2">
                      <h4 className="font-semibold hover:text-primary transition-colors">
                        {post.title}
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.created_date).toLocaleDateString('ko-KR')}
                          </span>
                          {post.views && (
                            <span>{post.views.toLocaleString()} 조회</span>
                          )}
                        </div>
                        {post.category && (
                          <Badge variant="outline" className="text-xs">
                            {post.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
              </div>
              
              {/* 더보기 버튼 */}
              {postsState.hasMore && (
                <div className="mt-6 text-center">
                  <Button 
                    onClick={handleLoadMore}
                    disabled={postsState.loadingMore}
                    variant="outline"
                    size="lg"
                  >
                    {postsState.loadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        로딩 중...
                      </>
                    ) : (
                      <>
                        더보기 ({postsState.total - postsState.posts.length}개 남음)
                        <ChevronLeft className="w-4 h-4 ml-2 rotate-180" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <div className="space-y-2">
                <p className="font-medium">관련 포스트 정보 없음</p>
                <p className="text-sm">
                  {stock.name}에 대한 관련 포스트를 찾을 수 없습니다.<br/>
                  메르's Pick에 포함된 종목이지만 상세 포스트는 준비 중입니다.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}