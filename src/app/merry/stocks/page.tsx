'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Search, 
  BarChart3, 
  Calendar, 
  Hash,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Stock {
  ticker: string;
  name?: string;
  company_name: string;
  market?: string;
  mentions?: number;
  mention_count: number;
  analyzed_count: number;
  postCount?: number;
  firstMention?: string;
  lastMention?: string;
  last_mentioned_at: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  tags?: string[] | string;
  description: string;
  currentPrice: number;
  currency: string;
  priceChange: string;
}

export default function MerryStocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [marketFilter, setMarketFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;

  useEffect(() => {
    fetchStocks();
  }, [page]);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/merry/stocks?limit=${limit}&page=${page}`);
      const data = await response.json();
      
      if (data.success) {
        if (page === 1) {
          setStocks(data.data.stocks);
        } else {
          setStocks(prev => [...prev, ...data.data.stocks]);
        }
        setHasMore(data.data.hasMore);
      }
    } catch (err) {
      console.error('종목 데이터 로딩 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
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

  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = (stock.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                          (stock.ticker?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesMarket = marketFilter === 'all' || stock.market === marketFilter;
    const matchesSentiment = sentimentFilter === 'all' || stock.sentiment === sentimentFilter;
    
    return matchesSearch && matchesMarket && matchesSentiment;
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href="/merry">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" />
            메르 블로그로 돌아가기
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary" />
          메르's Stock Universe
        </h1>
        <p className="text-muted-foreground">
          메르가 블로그에서 언급한 모든 종목들을 한눈에 확인하세요
        </p>
      </div>

      {/* 필터 섹션 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="종목명 또는 티커로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={marketFilter} onValueChange={setMarketFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="시장 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 시장</SelectItem>
                <SelectItem value="KOSPI">KOSPI</SelectItem>
                <SelectItem value="NASDAQ">NASDAQ</SelectItem>
                <SelectItem value="NYSE">NYSE</SelectItem>
                <SelectItem value="TSE">TSE</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="관점 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="positive">긍정적</SelectItem>
                <SelectItem value="neutral">중립적</SelectItem>
                <SelectItem value="negative">부정적</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드 - 다크 모드 호환 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card dark:bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{stocks.length}</div>
            <div className="text-sm text-muted-foreground">총 종목 수</div>
          </CardContent>
        </Card>
        <Card className="bg-card dark:bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {stocks.filter(s => (s.market || 'NASDAQ') === 'KOSPI').length}
            </div>
            <div className="text-sm text-muted-foreground">국내 종목</div>
          </CardContent>
        </Card>
        <Card className="bg-card dark:bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {stocks.filter(s => ['NASDAQ', 'NYSE'].includes(s.market || 'NASDAQ')).length}
            </div>
            <div className="text-sm text-muted-foreground">미국 종목</div>
          </CardContent>
        </Card>
        <Card className="bg-card dark:bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {stocks.reduce((sum, s) => sum + (s.postCount || s.mentions || s.mention_count || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">총 포스트 수</div>
          </CardContent>
        </Card>
      </div>

      {/* 종목 리스트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStocks.map((stock) => (
          <Link key={stock.ticker} href={`/merry/stocks/${stock.ticker}`}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{stock.name || stock.company_name}</h3>
                      {getSentimentIcon(stock.sentiment)}
                    </div>
                    <div className="flex gap-2 mb-2">
                      <Badge variant="outline">{stock.ticker}</Badge>
                      <Badge className={getMarketColor(stock.market || 'NASDAQ')}>
                        {stock.market || 'NASDAQ'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold mb-1">
                      {stock.currency === 'USD' ? '$' : '₩'}{stock.currentPrice?.toLocaleString()}
                      <span className={`ml-1 text-xs ${stock.priceChange?.startsWith('+') ? 'text-green-500' : stock.priceChange?.startsWith('-') ? 'text-red-500' : 'text-gray-500'}`}>
                        {stock.priceChange}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Hash className="w-3 h-3" />
                      {stock.mention_count}개 포스트 중 {stock.analyzed_count}개 분석 완료
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {stock.description}
                </p>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {(() => {
                    let tagsArray: string[] = [];
                    
                    if (stock.tags) {
                      if (typeof stock.tags === 'string') {
                        try {
                          const parsed = JSON.parse(stock.tags);
                          tagsArray = Array.isArray(parsed) ? parsed : [];
                        } catch (e) {
                          console.warn('Failed to parse tags:', e);
                          tagsArray = [];
                        }
                      } else if (Array.isArray(stock.tags)) {
                        tagsArray = stock.tags;
                      }
                    }
                    
                    return tagsArray.length > 0 ? (
                      tagsArray.slice(0, 4).map((tag, tagIndex) => (
                        <Badge key={`${stock.ticker}-tag-${tagIndex}`} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        태그 없음
                      </Badge>
                    );
                  })()}
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    첫 언급: {stock.firstMention ? new Date(stock.firstMention).toLocaleDateString('ko-KR') : '정보 없음'}
                  </span>
                  <span>
                    최근: {(stock.lastMention || stock.last_mentioned_at) ? new Date(stock.lastMention || stock.last_mentioned_at).toLocaleDateString('ko-KR') : '정보 없음'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 더보기 버튼 */}
      {hasMore && !loading && (
        <div className="text-center mt-8">
          <Button 
            onClick={() => setPage(prev => prev + 1)}
            variant="outline"
            size="lg"
          >
            더 많은 종목 보기
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {loading && page > 1 && (
        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>종목 불러오는 중...</span>
          </div>
        </div>
      )}
    </div>
  );
}