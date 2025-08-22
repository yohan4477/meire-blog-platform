'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp, Quote } from 'lucide-react';
import Link from 'next/link';

interface TodayQuote {
  id: string;
  title: string;
  quote: string;
  insight: string;
  relatedTickers: string[];
  date: string;
  readTime: string;
}

export function TodayMerryQuote() {
  const [todayQuote, setTodayQuote] = useState<TodayQuote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTodayQuote() {
      try {
        const response = await fetch('/api/today-merry-quote');
        if (response.ok) {
          const data = await response.json();
          setTodayQuote(data);
        }
      } catch (error) {
        console.error('오늘의 메르님 말씀 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTodayQuote();
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-8 border shadow-lg">
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-muted rounded"></div>
            <div className="h-6 w-48 bg-muted rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-4/5"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!todayQuote) {
    return (
      <div className="bg-card rounded-2xl p-8 border">
        <div className="flex items-center gap-2 mb-4">
          <Quote className="text-muted-foreground w-6 h-6" />
          <h2 className="text-xl font-bold text-muted-foreground">오늘의 메르님 말씀</h2>
        </div>
        <p className="text-muted-foreground">오늘의 말씀을 준비 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 sm:p-6 lg:p-8 border shadow-lg hover:shadow-xl transition-all duration-300">
      {/* 헤더 - 모바일 최적화 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-primary p-1.5 sm:p-2 rounded-lg flex-shrink-0">
            <Quote className="text-primary-foreground w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground leading-tight">
              오늘의 메르님 말씀
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">
                {new Date(todayQuote.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short'
                })}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-primary text-xs sm:text-sm font-medium bg-primary/10 px-2 sm:px-3 py-1 rounded-full self-start sm:self-auto">
          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
          <span>{todayQuote.readTime}</span>
        </div>
      </div>

      {/* 메인 컨텐츠 - 모바일 최적화 */}
      <div className="space-y-4 sm:space-y-6">
        {/* 핵심 한줄 요약 - 모바일 최적화 */}
        <div className="relative">
          <div className="absolute left-0 top-0 w-1 h-full bg-primary rounded-full"></div>
          <div className="pl-4 sm:pl-6">
            <h3 className="text-xs sm:text-sm font-semibold text-primary mb-2 flex items-center gap-1">
              <span>💡</span>
              <span>핵심 한줄 요약</span>
            </h3>
            <p className="text-sm sm:text-base lg:text-lg leading-relaxed text-foreground font-medium break-keep">
              "{todayQuote.quote}"
            </p>
          </div>
        </div>

        {/* 투자 인사이트 - 모바일 최적화 */}
        <div className="bg-card rounded-xl p-3 sm:p-4 lg:p-5 border">
          <h3 className="text-xs sm:text-sm font-semibold text-primary mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>🎯 투자 인사이트</span>
          </h3>
          <p className="text-sm sm:text-base text-foreground leading-relaxed break-keep">
            {todayQuote.insight}
          </p>
        </div>

        {/* 관련 종목 - 모바일 최적화 */}
        {todayQuote.relatedTickers.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1">
              <span>📈</span>
              <span>언급 종목:</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {todayQuote.relatedTickers.map((ticker, index) => (
                <Link
                  key={ticker}
                  href={`/merry/stocks/${ticker}`}
                  className="inline-flex items-center px-2 sm:px-3 py-1 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium hover:bg-primary/20 transition-all duration-200 border border-primary/20"
                >
                  {ticker}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 전체 포스트 보기 버튼 - 모바일 최적화 */}
        <div className="pt-3 sm:pt-4 border-t border-border">
          <Link
            href="/posts"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors duration-200 text-sm sm:text-base"
          >
            <span>전체 포스트 보기</span>
            <svg className="w-3 h-3 sm:w-4 sm:h-4 transform group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}