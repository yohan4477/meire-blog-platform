'use client';

import { useState, useEffect } from 'react';
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
  const [picks, setPicks] = useState<MerryPickStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMerryPicks();
  }, [limit]);

  const fetchMerryPicks = async () => {
    try {
      setLoading(true);
      
      // CLAUDE.md 요구사항: 최근 언급 순서, 성능 <500ms
      const cacheBuster = Date.now();
      const response = await fetch(`/api/merry/picks?limit=${limit}&t=${cacheBuster}`, {
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`⭐ Loaded ${data.data.picks.length} Merry's picks`);
          setPicks(data.data.picks);
        } else {
          setError('메르의 Pick 데이터를 불러올 수 없습니다.');
        }
      } else {
        setError('서버 응답 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Merry picks loading failed:', err);
      // CLAUDE.md 원칙: 실제 데이터 없으면 "정보 없음" 표시
      setError('Pick 정보 없음');
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <Card className="w-full">
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              메르's Pick
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: limit }).map((_, index) => (
              <div key={index} className="p-4 border rounded-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || picks.length === 0) {
    return (
      <Card className="w-full">
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              메르's Pick
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Pick 정보 없음</p>
              <p className="text-sm">
                메르가 최근에 언급한 종목 정보가<br/>
                아직 준비되지 않았습니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
                        {formatDate(stock.last_mentioned_at)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        총 {stock.mention_count}번 언급
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
      </CardContent>
    </Card>
  );
}