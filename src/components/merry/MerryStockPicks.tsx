'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, ChevronRight, BarChart3, Calendar, Hash } from 'lucide-react';
import Link from 'next/link';

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
  recentPosts?: any[];
}

export default function MerryStockPicks() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStocksData();
  }, []);

  // 📊 순차적 로딩: 1단계 기본 정보 → 2단계 가격 정보
  const loadStocksData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 1단계: 메르스 픽 기본 정보 로딩 시작...');
      
      // 1단계: 메르's Pick 감정 랭킹 로드 (빠른 렌더링, 캐시 활용)
      const basicResponse = await fetch(`/api/merry/picks?limit=5`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!basicResponse.ok) {
        throw new Error(`HTTP ${basicResponse.status}: ${basicResponse.statusText}`);
      }
      
      const basicData = await basicResponse.json();
      console.log('📊 1단계 완료:', basicData.data?.picks?.length, '개 메르\'s Pick (감정 랭킹)');
      console.log('🔄 감정 랭킹 순서:', basicData.data?.picks?.map((p: any, i: number) => 
        `${i+1}. ${p.name}(${p.ticker}) - 감정: ${p.sentiment}(${p.sentiment_score?.toFixed(2)})`
      ).join(', '));
      
      if (basicData.success && basicData.data && basicData.data.picks) {
        // 1단계 데이터로 즉시 화면 렌더링 (감정 기반 랭킹 적용)
        setStocks(basicData.data.picks.map((stock: any) => ({
          ...stock,
          company_name: stock.name, // API 구조 매핑
          mention_count: stock.mention_count || 0,
          analyzed_count: stock.analyzed_count || 0,
          last_mentioned_at: stock.last_mentioned_at,
          sentiment: stock.sentiment,
          description: stock.description || '',
          currentPrice: stock.current_price || null,
          priceChange: stock.price_change || null,
          currency: stock.currency || 'USD'
        })));
        setLoading(false); // 메르's Pick 감정 랭킹 로딩 완료
        console.log('✅ 메르\'s Pick 감정 랭킹 로딩 완료!');
        
      } else {
        console.error('📊 메르\'s Pick 데이터 구조 문제:', {
          success: basicData.success,
          hasData: !!basicData.data,
          hasPicks: !!basicData.data?.picks,
          picksLength: basicData.data?.picks?.length || 0
        });
        setError('메르\'s Pick 데이터를 불러올 수 없습니다.');
        setLoading(false);
      }
    } catch (err) {
      console.error('📊 종목 데이터 로딩 에러:', err);
      
      // 에러 메시지 구분
      const errorMessage = err instanceof Error && err.message && err.message.includes('데이터베이스 연결')
        ? '💥 데이터베이스 연결 실패 - 잠시 후 다시 시도해주세요'
        : '📊 종목 데이터 로딩 실패 - 네트워크를 확인하고 새로고침해주세요';
        
      setError(errorMessage);
      setLoading(false);
    }
  };

  const getSentimentIcon = (sentiment: string | undefined) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  // 종목별 특성 뱃지 (Individual Stock Badges)
  const getStockCharacteristicBadges = (stock: any) => {
    const badges = [];
    
    // 오늘 언급 뱃지
    const today = new Date().toISOString().split('T')[0];
    const lastMentionDate = (stock.lastMention || stock.last_mentioned_at)?.split(' ')[0];
    if (lastMentionDate === today) {
      badges.push({
        icon: '🆕',
        text: '오늘 언급',
        className: 'bg-gradient-to-r from-red-500 to-pink-500 text-white animate-pulse'
      });
    }
    
    // 트럼프 관련 뱃지 (실제 데이터 기반)
    const trumpRelatedStocks: Record<string, { mentions: number; relevance: string }> = {
      'INTC': { mentions: 3, relevance: 'high' },
      'LLY': { mentions: 6, relevance: 'high' },
      'UNH': { mentions: 4, relevance: 'medium' },
      '005930': { mentions: 24, relevance: 'high' },
      'TSLA': { mentions: 15, relevance: 'high' }
    };
    
    if (trumpRelatedStocks[stock.ticker]) {
      const trumpData = trumpRelatedStocks[stock.ticker];
      if (trumpData && trumpData.relevance === 'high') {
        badges.push({
          icon: '🇺🇸',
          text: '트럼프 관련',
          className: 'bg-gradient-to-r from-blue-600 to-red-600 text-white'
        });
      }
    }
    
    return badges;
  };

  // 순위 뱃지 제거 - 최신 언급일 순, 언급 적은 순 정렬과 맞지 않음
  const getRankingBadge = (stock: any, index: number, allStocks: any[]): { icon: string; text: string; className: string } | null => {
    // 순위 뱃지 모두 제거
    return null;
  };

  const getMarketColor = (market: string | undefined) => {
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
            <span className="text-base sm:text-lg font-semibold whitespace-nowrap sm:whitespace-normal">
              메르's Pick<span className="block sm:inline text-sm sm:text-base font-normal text-muted-foreground ml-2">주목할 종목</span>
            </span>
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
      <Card className="w-full border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-500" />
            <span className="text-base sm:text-lg font-semibold whitespace-nowrap sm:whitespace-normal text-red-700 dark:text-red-300">
              메르's Pick<span className="block sm:inline text-sm sm:text-base font-normal text-muted-foreground ml-2">로딩 실패</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="text-4xl">⚠️</div>
            <p className="text-red-600 dark:text-red-400 text-center font-medium">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
            >
              다시 시도
            </Button>
          </div>
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
            <span className="text-base sm:text-lg font-semibold whitespace-nowrap sm:whitespace-normal">
              메르's Pick<span className="block sm:inline text-sm sm:text-base font-normal text-muted-foreground ml-2">주목할 종목</span>
            </span>
          </CardTitle>
          <Link href="/merry/stocks">
            <Button variant="ghost" size="sm" className="gap-1">
              전체보기
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          (감정 점수 기준 랭킹 - 긍정적 감정이 높을수록 상위 노출)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {stocks.map((stock, index) => {
          const characteristicBadges = getStockCharacteristicBadges(stock);
          const rankingBadge = getRankingBadge(stock, index, stocks);
          
          return (
          <Link key={stock.ticker} href={`/merry/stocks/${stock.ticker}`}>
            <div className="group p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all cursor-pointer">
              {/* 뱃지 시스템 - 순위 뱃지를 먼저 표시 */}
              <div className="mb-2 flex flex-wrap gap-1">
                {/* 1. 상대적 순위 뱃지 (가장 먼저 표시) */}
                {rankingBadge && (
                  <Badge className={`text-xs ${rankingBadge.className}`}>
                    {rankingBadge.icon} {rankingBadge.text}
                  </Badge>
                )}
                
                {/* 2. 종목별 특성 뱃지 (개별 종목) */}
                {characteristicBadges.map((badge, badgeIndex) => (
                  <Badge key={`${stock.ticker}-badge-${badgeIndex}-${badge.text}`} className={`text-xs ${badge.className}`}>
                    {badge.icon} {badge.text}
                  </Badge>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-base sm:text-lg group-hover:text-primary transition-colors truncate">
                      {stock.name || stock.company_name}
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
                    {stock.description && stock.description.length > 35 
                      ? `${stock.description.substring(0, 35)}...` 
                      : stock.description || '회사 정보 없음'}
                  </p>
                </div>
                
                {/* 가격 정보를 별도 행으로 분리 (모바일에서) */}
                <div className="flex flex-col sm:text-right sm:min-w-0 sm:ml-4">
                  <div className="text-sm font-bold mb-1 flex flex-col sm:flex-row sm:items-center gap-1">
                    {pricesLoading ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <div className="animate-spin h-3 w-3 border border-gray-300 rounded-full border-t-blue-600"></div>
                        가격 로딩중...
                      </span>
                    ) : stock.currentPrice !== null ? (
                      <>
                        <span className="truncate">
                          {stock.currency === 'USD' ? '$' : '₩'}{stock.currentPrice?.toLocaleString()}
                        </span>
                        {stock.priceChange && (
                          <span className={`text-xs flex-shrink-0 ${
                            typeof stock.priceChange === 'number' ? 
                              (stock.priceChange > 0 ? 'text-green-500' : stock.priceChange < 0 ? 'text-red-500' : 'text-gray-500') :
                              (typeof stock.priceChange === 'string' && stock.priceChange.startsWith('+') ? 'text-green-500' : 
                               typeof stock.priceChange === 'string' && stock.priceChange.startsWith('-') ? 'text-red-500' : 'text-gray-500')
                          }`}>
                            {typeof stock.priceChange === 'number' ? 
                              (stock.priceChange > 0 ? `+${stock.priceChange}` : stock.priceChange.toString()) :
                              stock.priceChange
                            }
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
                    <span className="truncate">
                      언급 {stock.mention_count}개 · 분석 {stock.analyzed_count}개
                      {/* 실제 언급 수 정보 표시 (개발 환경에서만) */}
                      {process.env.NODE_ENV === 'development' && (stock as any).actual_mention_count !== undefined && (
                        <span className="ml-1 text-gray-400 text-xs" title={`실제 블로그 포스트에서 언급된 횟수: ${(stock as any).actual_mention_count}`}>
                          (실제: {(stock as any).actual_mention_count})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
                <div className="flex gap-1 flex-wrap">
                  {/* 🔧 API에서 이미 배열로 변환되므로 간단한 처리 */}
                  {Array.isArray(stock.tags) && stock.tags.length > 0 ? (
                    stock.tags.slice(0, 3).map((tag, tagIndex) => (
                      <Badge key={`${stock.ticker}-tag-${tagIndex}-${tag}`} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      태그 없음
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Calendar className="w-3 h-3" />
                  <span className="truncate">
                    최근: {(stock.lastMention || stock.last_mentioned_at) && typeof (stock.lastMention || stock.last_mentioned_at) === 'string' ? (
                      (() => {
                        try {
                          return new Date(stock.lastMention || stock.last_mentioned_at).toLocaleDateString('ko-KR');
                        } catch (e) {
                          return '날짜 오류';
                        }
                      })()
                    ) : '정보 없음'}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        )})}
      </CardContent>
    </Card>
  );
}