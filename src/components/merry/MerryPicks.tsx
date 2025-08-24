'use client';

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Star,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { useOptimizedLoading } from '@/hooks/useOptimizedLoading';
import { DataStateHandler } from '@/components/ui/loading-states';

interface MerryPickStock {
  ticker: string;
  name: string;
  market: string;
  currency: string;
  last_mentioned_at: string;
  mention_count: number;
  current_price?: number;
  price_change?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  description?: string; // 회사 사업 정보
}

interface MerryPicksProps {
  limit?: number;
  showTitle?: boolean;
  compact?: boolean;
}

export default function MerryPicks({ 
  limit = 8, 
  showTitle = true,
  compact = false 
}: MerryPicksProps) {
  const loading = useOptimizedLoading({
    minLoadingTime: 500,  // UX를 위한 최소 로딩 시간
    maxLoadingTime: 8000, // 8초 timeout
    retryAttempts: 3
  });

  useEffect(() => {
    fetchMerryPicks();
  }, [limit, loading.retryCount]);

  const fetchMerryPicks = async () => {
    const result = await loading.fetchWithLoading<{success: boolean, data: {picks: MerryPickStock[]}}>(
      `/api/merry/picks?limit=${limit}&t=${Date.now()}`, // 캐시 버스터 추가
      { method: 'GET' }
    );

    if (result?.success && result.data?.picks) {
      console.log(`⭐ Loaded ${result.data.picks.length} Merry's picks`);
      console.log('📊 Merry\'s Pick 순서:', result.data.picks.map((p: any, i: number) => 
        `${i+1}. ${p.name}(${p.ticker}) - ${new Date(p.last_mentioned_at).toLocaleDateString('ko-KR')} - ${p.mention_count}번`
      ));
    }

    return result?.data?.picks || [];
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else if (diffInHours < 24 * 7) {
      const days = Math.floor(diffInHours / 24);
      return `${days}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatPrice = (price: number, currency: string): string => {
    const symbol = currency === 'USD' ? '$' : '₩';
    return `${symbol}${price.toLocaleString()}`;
  };

  const getPriceChangeColor = (change?: string): string => {
    if (!change) return 'text-muted-foreground';
    if (change.startsWith('+')) return 'text-green-500';
    if (change.startsWith('-')) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getMarketColor = (market: string): string => {
    switch (market) {
      case 'KOSPI': return 'bg-blue-100 text-blue-800';
      case 'NASDAQ': return 'bg-purple-100 text-purple-800';
      case 'NYSE': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'negative':
        return <TrendingDown className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  // picks 데이터를 로딩 결과에서 가져오기 위해 임시 상태 추가
  const [picks, setPicks] = React.useState<MerryPickStock[]>([]);

  React.useEffect(() => {
    if (!loading.isLoading && !loading.error) {
      fetchMerryPicks().then(setPicks);
    }
  }, [loading.isLoading, loading.error, loading.retryCount]);

  return (
    <Card className="w-full">
      {showTitle && (
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              메르's Pick
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              최신 언급일 기준 랭킹
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            메르가 최근에 언급한 종목들을 확인해보세요
          </p>
        </CardHeader>
      )}
      
      <CardContent>
        <DataStateHandler
          isLoading={loading.isLoading}
          hasError={!!loading.error}
          isEmpty={!loading.isLoading && !loading.error && picks.length === 0}
          loadingConfig={{
            message: "메르's Pick을 불러오는 중...",
            variant: "skeleton",
            size: "md"
          }}
          errorConfig={{
            error: loading.error || undefined,
            canRetry: loading.canRetry,
            onRetry: () => {
              loading.retry();
              fetchMerryPicks().then(setPicks);
            },
            isRetrying: loading.isRetrying
          }}
          emptyConfig={{
            icon: Star,
            message: "Pick 정보 없음",
            description: "메르가 최근에 언급한 종목 정보가 아직 준비되지 않았습니다."
          }}
        >
          <div className={`grid gap-4 ${
            compact 
              ? 'grid-cols-1 md:grid-cols-2' 
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          }`}>
            {picks.map((stock, index) => (
            <Link 
              key={stock.ticker} 
              href={`/merry/stocks/${stock.ticker}`}
              className="block group"
            >
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border group-hover:border-primary/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* 상단: 순위와 티커 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs w-6 h-6 rounded-full p-0 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <Badge className={`text-xs ${getMarketColor(stock.market)}`}>
                          {stock.market}
                        </Badge>
                      </div>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* 중앙: 종목 정보 */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                          {stock.name}
                        </h4>
                        {getSentimentIcon(stock.sentiment)}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {stock.ticker}
                      </p>
                      {/* 회사 소개 표시 */}
                      {stock.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {stock.description}
                        </p>
                      )}
                    </div>

                    {/* 현재가 (있는 경우) */}
                    {stock.current_price && (
                      <div className="space-y-1">
                        <div className="text-sm font-bold">
                          {formatPrice(stock.current_price, stock.currency)}
                        </div>
                        {stock.price_change && (
                          <div className={`text-xs ${getPriceChangeColor(stock.price_change)}`}>
                            {stock.price_change}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 하단: 언급 정보 */}
                    <div className="pt-2 border-t space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        최근: {new Date(stock.last_mentioned_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'numeric', 
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        # {stock.mention_count}개 포스트 (고유)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          </div>

          {/* 더 보기 링크 (compact 모드가 아닐 때만) */}
          {!compact && (
            <div className="text-center mt-6 pt-4 border-t">
              <Link 
                href="/merry/stocks" 
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                모든 종목 보기
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </DataStateHandler>
      </CardContent>
    </Card>
  );
}