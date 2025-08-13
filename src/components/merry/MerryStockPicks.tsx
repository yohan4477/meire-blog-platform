'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, ChevronRight, BarChart3, Calendar, Hash } from 'lucide-react';
import Link from 'next/link';

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

export default function MerryStockPicks() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await fetch('/api/merry/stocks?limit=5');
      const data = await response.json();
      
      if (data.success) {
        setStocks(data.data.stocks);
      } else {
        setError('종목 데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      setError('종목 데이터 로딩 중 오류가 발생했습니다.');
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

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            메르's Pick - 주목할 종목
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>메르's Pick</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            메르's Pick - 주목할 종목
          </CardTitle>
          <Link href="/merry/stocks">
            <Button variant="ghost" size="sm" className="gap-1">
              전체보기
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          메르가 블로그에서 언급한 종목들 (포스트 개수 기준 랭킹)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {stocks.map((stock, index) => (
          <Link key={stock.ticker} href={`/merry/stocks/${stock.ticker}`}>
            <div className="group p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all cursor-pointer">
              {/* 최다 언급 배지를 종목 위에 배치 */}
              {index === 0 && (
                <div className="mb-2">
                  <Badge variant="default" className="text-xs bg-gradient-to-r from-yellow-500 to-orange-500">
                    🏆 최근 3개월 최다 언급
                  </Badge>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-base sm:text-lg group-hover:text-primary transition-colors truncate">
                      {stock.name}
                    </h3>
                    {getSentimentIcon(stock.sentiment)}
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {stock.ticker}
                    </Badge>
                    <Badge className={`text-xs flex-shrink-0 ${getMarketColor(stock.market)}`}>
                      {stock.market}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {stock.description}
                  </p>
                </div>
                
                {/* 가격 정보를 별도 행으로 분리 (모바일에서) */}
                <div className="flex flex-col sm:text-right sm:min-w-0 sm:ml-4">
                  <div className="text-sm font-bold mb-1 flex flex-col sm:flex-row sm:items-center gap-1">
                    {stock.currentPrice !== null ? (
                      <>
                        <span className="truncate">
                          {stock.currency === 'USD' ? '$' : '₩'}{stock.currentPrice?.toLocaleString()}
                        </span>
                        {stock.priceChange && (
                          <span className={`text-xs flex-shrink-0 ${stock.priceChange?.startsWith('+') ? 'text-green-500' : stock.priceChange?.startsWith('-') ? 'text-red-500' : 'text-gray-500'}`}>
                            {stock.priceChange}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        가격 정보 없음
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Hash className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{stock.postCount || stock.mentions}개 포스트</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
                <div className="flex gap-1 flex-wrap">
                  {stock.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Calendar className="w-3 h-3" />
                  <span className="truncate">최근: {new Date(stock.lastMention).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}