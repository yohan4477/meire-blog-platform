'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ChevronLeft, 
  Calendar,
  Hash,
  BarChart3,
  ExternalLink,
  Clock,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// 동적 import로 차트 컴포넌트 최적화
const StockPriceChart = dynamic(
  () => import('@/components/merry/StockPriceChart'),
  { 
    loading: () => <div className="h-80 bg-gray-100 rounded-lg animate-pulse" />,
    ssr: false 
  }
);

interface Stock {
  ticker: string;
  name: string;
  market: string;
  mentions: number;
  postCount: number;
  firstMention: string;
  lastMention: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  tags: string[];
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

export default function StockDetailPage() {
  const params = useParams();
  const ticker = params?.ticker as string;
  
  const [stock, setStock] = useState<Stock | null>(null);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('1Y'); // 1Y 기본값 설정
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

  useEffect(() => {
    if (ticker) {
      fetchStockData();
      fetchRelatedPosts(0, true); // 첫 번째 로드
    }
  }, [ticker]);

  const fetchStockData = async () => {
    try {
      const response = await fetch(`/api/merry/stocks?limit=1000`);
      const data = await response.json();
      
      if (data.success) {
        const foundStock = data.data.stocks.find((s: Stock) => s.ticker === ticker);
        if (foundStock) {
          setStock(foundStock);
        } else {
          setError('종목을 찾을 수 없습니다.');
        }
      }
    } catch (err) {
      setError('종목 데이터를 불러올 수 없습니다.');
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
        const newPosts = data.data.posts.map((post: any) => ({
          ...post,
          created_date: post.published_date || post.created_date
        }));

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
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{stock.name}</h1>
                {getSentimentIcon(stock.sentiment)}
              </div>
              <div className="flex items-center gap-2">
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
            
            <div className="text-right">
              <div className="text-2xl font-bold mb-1">
                {stock.currency === 'USD' ? '$' : '₩'}{stock.currentPrice?.toLocaleString()}
                <span className={`ml-2 text-lg ${stock.priceChange?.startsWith('+') ? 'text-green-500' : stock.priceChange?.startsWith('-') ? 'text-red-500' : 'text-gray-500'}`}>
                  {stock.priceChange}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">현재가</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">{stock.description}</p>
          
          {/* 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{stock.postCount || stock.mentions}</div>
              <div className="text-sm text-muted-foreground">언급된 포스트</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{stock.tags.length}</div>
              <div className="text-sm text-muted-foreground">관련 태그</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-bold text-primary">
                {new Date(stock.firstMention).toLocaleDateString('ko-KR')}
              </div>
              <div className="text-sm text-muted-foreground">첫 언급</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-bold text-primary">
                {new Date(stock.lastMention).toLocaleDateString('ko-KR')}
              </div>
              <div className="text-sm text-muted-foreground">최근 언급</div>
            </div>
          </div>
          
          {/* 태그 */}
          <div className="space-y-2">
            <h3 className="font-semibold">관련 태그</h3>
            <div className="flex flex-wrap gap-2">
              {stock.tags.map(tag => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 가격 차트 */}
      <div className="mb-6">
        <StockPriceChart
          ticker={stock.ticker}
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
        />
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
                {postsState.posts.map(post => (
                <Link key={post.id} href={`/merry/${post.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border">
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