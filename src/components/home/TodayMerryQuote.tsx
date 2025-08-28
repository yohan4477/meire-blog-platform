'use client';

import React, { useEffect } from 'react';
import { Calendar, Clock, TrendingUp, Quote } from 'lucide-react';
import Link from 'next/link';

interface TodayQuote {
  log_no: string;
  title: string;
  quote: string;
  insight: string;
  relatedTickers: string[];
  date: string;
  readTime: string;
}

interface TodayQuotesResponse {
  quotes: TodayQuote[];
  isToday: boolean;
}

// 종목명과 티커를 강조하는 함수
const highlightStockNames = (text: string, relatedTickers: string[]) => {
  if (!text || !relatedTickers.length) return text;
  
  // 일반적인 종목명 매핑
  const stockNameMap: { [key: string]: string } = {
    'TSLA': '테슬라',
    'AAPL': '애플',
    'GOOGL': '구글',
    'NVDA': '엔비디아',
    'META': '메타',
    'MSFT': '마이크로소프트',
    'AMZN': '아마존',
    '005930': '삼성전자',
    '000660': 'SK하이닉스',
    'TSM': 'TSMC',
    'INTC': '인텔'
  };
  
  let highlightedText = text;
  
  try {
    // 관련 티커와 해당 종목명을 모두 강조
    relatedTickers.forEach(ticker => {
      const stockName = stockNameMap[ticker];
      
      // 안전한 정규식 이스케이프 함수
      const escapeRegex = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      };
      
      // 티커 강조 (예: TSLA, 005930)
      const escapedTicker = escapeRegex(ticker);
      const tickerRegex = new RegExp(`\\b${escapedTicker}\\b`, 'gi');
      highlightedText = highlightedText.replace(tickerRegex, 
        `<span class="text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-md">${ticker}</span>`
      );
      
      // 종목명 강조 (예: 테슬라)
      if (stockName) {
        const escapedStockName = escapeRegex(stockName);
        const nameRegex = new RegExp(`\\b${escapedStockName}\\b`, 'gi');
        highlightedText = highlightedText.replace(nameRegex, 
          `<span class="text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-md">${stockName}</span>`
        );
      }
    });
  } catch (error) {
    console.warn('Highlight error:', error);
    return text; // Fallback to original text
  }
  
  return highlightedText;
};

export function TodayMerryQuote() {
  const [quotesData, setQuotesData] = React.useState<TodayQuotesResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    fetchTodayQuotes();
  }, []);

  const fetchTodayQuotes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // ⚡ 캐시된 데이터 먼저 시도 (5분 캐시)
      const response = await fetch(`/api/today-merry-quote`, {
        next: { revalidate: 300 } // 5분 revalidation
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setQuotesData(result);
      
      // 캐시 상태 로깅
      const cacheStatus = response.headers.get('X-Cache') || 'UNKNOWN';
      const responseTime = response.headers.get('X-Response-Time') || '0ms';
      console.log(`⚡ Today Merry Quote 로딩: ${responseTime} (${cacheStatus})`);
      
    } catch (error) {
      console.error('메르님 말씀 로딩 실패:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-4 sm:p-6 lg:p-8 border shadow-lg hover:shadow-xl transition-all duration-300">
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">메르님의 오늘 인사이트를 분석하는 중...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-red-500 mb-4">⚠️ 로딩 실패</div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={fetchTodayQuotes}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            다시 시도
          </button>
        </div>
      ) : !quotesData || !quotesData.quotes.length ? (
        <div className="text-center py-8">
          <Quote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">오늘의 말씀을 준비하고 있습니다...</p>
        </div>
      ) : (
        <div className="space-y-0">
      {/* 헤더 - 모바일 최적화 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-primary p-1.5 sm:p-2 rounded-lg flex-shrink-0">
            <Quote className="text-primary-foreground w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground leading-tight">
              메르님 한 줄 코멘트
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">
                {quotesData?.quotes?.length && quotesData.quotes.length > 0 && quotesData.quotes[0]?.date && new Date(quotesData.quotes[0].date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short'
                })}
              </span>
              <span className="ml-2 text-primary font-medium">
                ({quotesData?.quotes?.length || 0}개 포스트)
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-primary text-xs sm:text-sm font-medium bg-primary/10 px-2 sm:px-3 py-1 rounded-full self-start sm:self-auto">
          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
          <span>{quotesData?.quotes?.length && quotesData.quotes.length > 0 ? quotesData.quotes[0]?.readTime : '3분 읽기'}</span>
        </div>
      </div>

      {/* 메인 컨텐츠 - 다중 포스트 지원 */}
      <div className="space-y-6 sm:space-y-8">
        {quotesData?.quotes?.map((quote, index) => (
          <div 
            key={quote.log_no} 
            className="block"
          >
            <div className={`space-y-4 ${index > 0 ? 'pt-6 border-t border-border' : ''} bg-muted/10 rounded-lg p-4 border border-border/50`}>
            {/* 포스트 제목 (항상 표시) */}
            <div className="mb-3">
              <h4 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2 hover:text-primary transition-colors">
                {quotesData?.quotes && quotesData.quotes.length > 1 && (
                  <span className="w-6 h-6 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                )}
                <span className="line-clamp-2">{quote.title}</span>
              </h4>
            </div>
            
            {/* 핵심 한줄 요약 */}
            <div className="relative">
              <div className="absolute left-0 top-0 w-1 h-full bg-primary rounded-full group-hover:w-2 transition-all duration-200"></div>
              <div className="pl-4 sm:pl-6">
                <h3 className="text-xs sm:text-sm font-semibold text-primary mb-2 flex items-center gap-1">
                  <span>💡</span>
                  <span>핵심 한줄 요약</span>
                </h3>
                <p 
                  className="text-sm sm:text-base lg:text-lg leading-relaxed text-foreground font-medium break-keep"
                  dangerouslySetInnerHTML={{ 
                    __html: `"${highlightStockNames(quote.quote, quote.relatedTickers)}"` 
                  }}
                />
              </div>
            </div>

            {/* 투자 인사이트 */}
            <div className="bg-card rounded-xl p-3 sm:p-4 lg:p-5 border group-hover:border-primary/20 transition-all duration-200">
              <h3 className="text-xs sm:text-sm font-semibold text-primary mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>🎯 투자 인사이트</span>
              </h3>
              <div 
                className="text-sm sm:text-base text-foreground leading-relaxed break-keep"
                dangerouslySetInnerHTML={{ 
                  __html: highlightStockNames(quote.insight, quote.relatedTickers)
                }}
              />
            </div>

            {/* 관련 종목 */}
            {quote.relatedTickers.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1">
                  <span>📈</span>
                  <span>언급 종목:</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {quote.relatedTickers.map((ticker, tickerIndex) => (
                    <span
                      key={`${quote.log_no}-ticker-${ticker}-${tickerIndex}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = `/merry/stocks/${ticker}`;
                      }}
                      className="inline-flex items-center px-2 sm:px-3 py-1 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium hover:bg-primary/20 transition-all duration-200 border border-primary/20 cursor-pointer"
                    >
                      {ticker}
                    </span>
                  ))}
                </div>
              </div>
            )}
              {/* 해당 포스트 보기 버튼 */}
              <div className="pt-3 sm:pt-4 border-t border-border">
                <Link 
                  href={`/merry/posts/${quote.log_no}`}
                  className="inline-block px-3 py-2 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors cursor-pointer border border-gray-400 hover:border-primary"
                >
                  해당 포스트 보기 &gt;
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
      )}
    </div>
  );
}