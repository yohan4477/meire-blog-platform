'use client';

import React, { useState, useEffect } from 'react';
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
import { useOptimizedLoading } from '@/hooks/useOptimizedLoading';
import { DataStateHandler } from '@/components/ui/loading-states';

interface Stock {
  ticker: string;
  name?: string;
  company_name: string;
  market?: string;
  sector?: string;
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
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [majorSectorFilter, setMajorSectorFilter] = useState('all');
  const [subSectorFilter, setSubSectorFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const limit = 10;

  // 1단계: 국내/해외 분류
  const regionCategories = {
    '국내': ['KOSPI', 'KOSDAQ', 'KRX'],
    '해외': ['NASDAQ', 'NYSE', 'TSE']
  };
  
  // 2단계: 대분류 섹터
  const sectorCategories = {
    '기술/IT': ['기술', '반도체', '전자상거래'],
    '에너지/원자력': ['에너지', '원자력', '우라늄'],
    '산업/제조': ['철강', '조선', '소재', '화학'],
    '운송/모빌리티': ['전기차', '자동차'],
    '소비재/서비스': ['엔터테인먼트'],
    '헬스케어': ['제약', '헬스케어'],
    '신소재/배터리': ['배터리', '희토류']
  };
  
  const getSubSectors = (majorSector: string) => {
    return majorSector === 'all' ? [] : (sectorCategories as any)[majorSector] || [];
  };

  // ✅ FIXED 간단한 useEffect - 첫 페이지 로드
  useEffect(() => {
    console.log('🎯 useEffect [page] 실행:', page);
    
    // 첫 페이지인 경우
    if (page === 1) {
      loadFirstPageData();
    } else {
      // 추가 페이지 로드
      loadMorePages();
    }
  }, [page]);

  // ✅ FIXED 필터 변경시 처리
  useEffect(() => {
    console.log('🎯 useEffect [filters] 실행');
    if (page === 1) {
      loadFirstPageData();
    } else {
      setPage(1); // 첫 페이지로 리셋
    }
  }, [regionFilter, majorSectorFilter, subSectorFilter, sentimentFilter, searchTerm]);

  // ✅ FIXED 첫 페이지 데이터 로드
  const loadFirstPageData = async () => {
    console.log('🚀 첫 페이지 데이터 로드 시작');
    
    try {
      setLoading(true);
      setError(null);
      
      // 통계 데이터와 종목 데이터 병렬 로드
      const [statsResponse, stocksResponse] = await Promise.all([
        loadStatsData(),
        loadStocksData(1)
      ]);
      
      console.log('✅ 첫 페이지 데이터 로드 완료');
    } catch (error) {
      console.error('❌ 첫 페이지 데이터 로드 실패:', error);
      setError('데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED 통계 데이터 로드
  const loadStatsData = async () => {
    try {
      console.log('📊 통계 데이터 로딩...');
      const response = await fetch('/api/merry/stocks?limit=100&pricesOnly=false');
      const result = await response.json();
      
      if (result?.success && result.data?.stocks) {
        setAllStocks(result.data.stocks);
        setStatsLoaded(true);
        console.log('✅ 통계 데이터 로드 완료:', result.data.stocks.length, '개');
      }
      return result;
    } catch (error) {
      console.error('❌ 통계 데이터 로딩 실패:', error);
      throw error;
    }
  };

  // ✅ FIXED 종목 데이터 로드
  const loadStocksData = async (targetPage: number) => {
    try {
      // 필터 파라미터 구성
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: targetPage.toString(),
        pricesOnly: 'false'
      });
      
      if (regionFilter !== 'all') params.set('region', regionFilter);
      if (majorSectorFilter !== 'all') params.set('majorSector', majorSectorFilter);
      if (subSectorFilter !== 'all') params.set('subSector', subSectorFilter);
      if (sentimentFilter !== 'all') params.set('sentiment', sentimentFilter);
      if (searchTerm) params.set('search', searchTerm);
      
      const apiUrl = `/api/merry/stocks?${params.toString()}`;
      console.log('📊 종목 데이터 로딩:', apiUrl);
      
      const response = await fetch(apiUrl);
      const result = await response.json();
      
      if (result?.success && result.data?.stocks) {
        console.log('✅ 종목 데이터 로드 완료:', result.data.stocks.length, '개');
        
        if (targetPage === 1) {
          // 첫 페이지는 완전 교체
          setStocks(result.data.stocks);
        } else {
          // 추가 페이지는 기존 데이터에 추가
          setStocks(prev => [...prev, ...result.data.stocks]);
        }
        
        setHasMore(result.data.hasMore);
      }
      return result;
    } catch (error) {
      console.error('❌ 종목 데이터 로딩 실패:', error);
      throw error;
    }
  };

  // ✅ FIXED 추가 페이지 로드
  const loadMorePages = async () => {
    if (paginationLoading) return;
    
    try {
      setPaginationLoading(true);
      await loadStocksData(page);
      console.log('✅ 추가 페이지 로드 완료:', page);
    } catch (error) {
      console.error('❌ 추가 페이지 로드 실패:', error);
    } finally {
      setPaginationLoading(false);
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

  // 필터링된 종목들
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = (stock.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                          (stock.ticker?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    let matchesRegion = true;
    if (regionFilter !== 'all') {
      const regionMarkets = (regionCategories as any)[regionFilter] || [];
      matchesRegion = regionMarkets.includes(stock.market || 'NASDAQ');
    }
    
    let matchesMajorSector = true;
    if (majorSectorFilter !== 'all') {
      const majorSectorList = (sectorCategories as any)[majorSectorFilter] || [];
      matchesMajorSector = majorSectorList.includes(stock.sector || '');
    }
    
    let matchesSubSector = true;
    if (subSectorFilter !== 'all') {
      matchesSubSector = stock.sector === subSectorFilter;
    }
    
    const matchesSentiment = sentimentFilter === 'all' || stock.sentiment === sentimentFilter;
    
    return matchesSearch && matchesRegion && matchesMajorSector && matchesSubSector && matchesSentiment;
  });

  // 통계용 필터링된 전체 데이터
  const filteredAllStocks = allStocks.filter(stock => {
    const matchesSearch = (stock.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                          (stock.ticker?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    let matchesRegion = true;
    if (regionFilter !== 'all') {
      const regionMarkets = (regionCategories as any)[regionFilter] || [];
      matchesRegion = regionMarkets.includes(stock.market || 'NASDAQ');
    }
    
    let matchesMajorSector = true;
    if (majorSectorFilter !== 'all') {
      const majorSectorList = (sectorCategories as any)[majorSectorFilter] || [];
      matchesMajorSector = majorSectorList.includes(stock.sector || '');
    }
    
    let matchesSubSector = true;
    if (subSectorFilter !== 'all') {
      matchesSubSector = stock.sector === subSectorFilter;
    }
    
    const matchesSentiment = sentimentFilter === 'all' || stock.sentiment === sentimentFilter;
    
    return matchesSearch && matchesRegion && matchesMajorSector && matchesSubSector && matchesSentiment;
  });

  console.log('🔍 렌더링 상태:', {
    loading,
    error,
    stocksLength: stocks.length,
    filteredStocksLength: filteredStocks.length,
    allStocksLength: allStocks.length,
    page
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
          메르 종목 리스트
        </h1>
        <p className="text-muted-foreground">
          메르가 블로그에서 언급한 모든 종목들을 한눈에 확인하세요
        </p>
        
        {/* 수동 로드 버튼 (필요시) */}
        {!loading && stocks.length === 0 && !error && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-600 mb-2">데이터를 다시 불러오시겠습니까?</p>
            <Button onClick={loadFirstPageData} variant="outline" size="sm">
              🔄 다시 로드
            </Button>
          </div>
        )}
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
            
            <Select value={regionFilter} onValueChange={(value) => {
              setRegionFilter(value);
              setMajorSectorFilter('all');
              setSubSectorFilter('all');
            }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="지역 선택">
                  {regionFilter === 'all' ? '전체 지역' : regionFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 지역</SelectItem>
                <SelectItem value="국내">국내 (KOSPI/KOSDAQ)</SelectItem>
                <SelectItem value="해외">해외 (NASDAQ/NYSE)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={majorSectorFilter} onValueChange={(value) => {
              setMajorSectorFilter(value);
              setSubSectorFilter('all');
            }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="섹터 선택">
                  {majorSectorFilter === 'all' ? '전체 섹터' : majorSectorFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 섹터</SelectItem>
                {Object.keys(sectorCategories).map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {majorSectorFilter !== 'all' && (
              <Select value={subSectorFilter} onValueChange={setSubSectorFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="세부 분류">
                    {subSectorFilter === 'all' ? '전체 세부분류' : subSectorFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 세부분류</SelectItem>
                  {getSubSectors(majorSectorFilter).map((subSector: string) => (
                    <SelectItem key={subSector} value={subSector}>{subSector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="감정 분석">
                  {sentimentFilter === 'all' ? '전체 감정' : 
                   sentimentFilter === 'positive' ? '긍정적' :
                   sentimentFilter === 'negative' ? '부정적' : '중립적'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 감정</SelectItem>
                <SelectItem value="positive">긍정적</SelectItem>
                <SelectItem value="neutral">중립적</SelectItem>
                <SelectItem value="negative">부정적</SelectItem>
              </SelectContent>
            </Select>

            {(regionFilter !== 'all' || majorSectorFilter !== 'all' || subSectorFilter !== 'all' || sentimentFilter !== 'all' || searchTerm) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRegionFilter('all');
                  setMajorSectorFilter('all');
                  setSubSectorFilter('all');
                  setSentimentFilter('all');
                  setSearchTerm('');
                }}
                className="whitespace-nowrap"
              >
                <Filter className="w-4 h-4 mr-1" />
                필터 초기화
              </Button>
            )}
          </div>
          
          {(regionFilter !== 'all' || majorSectorFilter !== 'all' || subSectorFilter !== 'all' || sentimentFilter !== 'all' || searchTerm) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  검색: "{searchTerm}"
                </Badge>
              )}
              {regionFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  지역: {regionFilter}
                </Badge>
              )}
              {majorSectorFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  섹터: {majorSectorFilter}
                </Badge>
              )}
              {subSectorFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  세부섹터: {subSectorFilter}
                </Badge>
              )}
              {sentimentFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  종목판단: {sentimentFilter === 'positive' ? '긍정' : sentimentFilter === 'negative' ? '부정' : '중립'}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card dark:bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{filteredAllStocks.length}</div>
            <div className="text-sm text-muted-foreground">총 종목 수</div>
          </CardContent>
        </Card>
        <Card className="bg-card dark:bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {filteredAllStocks.filter(s => ['KOSPI', 'KOSDAQ', 'KRX'].includes(s.market || 'NASDAQ')).length}
            </div>
            <div className="text-sm text-muted-foreground">한국 종목</div>
          </CardContent>
        </Card>
        <Card className="bg-card dark:bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {filteredAllStocks.filter(s => ['NASDAQ', 'NYSE', 'TSE'].includes(s.market || 'NASDAQ')).length}
            </div>
            <div className="text-sm text-muted-foreground">해외 종목</div>
          </CardContent>
        </Card>
        <Card className="bg-card dark:bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {filteredAllStocks.reduce((sum, s) => sum + (s.postCount || s.mentions || s.mention_count || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">전체 포스트 수</div>
          </CardContent>
        </Card>
      </div>

      {/* 로딩/에러/빈 상태 처리 */}
      {loading && page === 1 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>메르가 언급한 종목들을 불러오는 중...</span>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">❌ {error}</p>
          <Button onClick={loadFirstPageData} variant="outline">
            🔄 다시 시도
          </Button>
        </div>
      ) : filteredStocks.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">조건에 맞는 종목이 없습니다</p>
          <Button 
            onClick={() => {
              setRegionFilter('all');
              setMajorSectorFilter('all');
              setSubSectorFilter('all');
              setSentimentFilter('all');
              setSearchTerm('');
            }}
            variant="outline"
          >
            필터 초기화
          </Button>
        </div>
      ) : (
        <>
          {/* 종목 리스트 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStocks.map((stock) => (
              <Link key={`stock-${stock.ticker}-${stock.market}`} href={`/merry/stocks/${stock.ticker}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer" data-testid="stock-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{stock.name || stock.company_name}</h3>
                          {getSentimentIcon(stock.sentiment || 'neutral')}
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
                          {stock.currentPrice > 0 ? (
                            <>
                              {stock.currency === 'USD' ? '$' : '₩'}{stock.currentPrice?.toLocaleString()}
                              <span className={`ml-1 text-xs ${stock.priceChange?.startsWith('+') ? 'text-green-500' : stock.priceChange?.startsWith('-') ? 'text-red-500' : 'text-gray-500'}`}>
                                {stock.priceChange}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-500">가격 정보 없음</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Hash className="w-3 h-3" />
                          언급 {stock.mention_count}개 · 분석 {stock.analyzed_count}개
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
                              tagsArray = [];
                            }
                          } else if (Array.isArray(stock.tags)) {
                            tagsArray = stock.tags;
                          }
                        }
                        
                        return tagsArray.length > 0 ? (
                          tagsArray.slice(0, 4).map((tag, tagIndex) => (
                            <Badge key={`${stock.ticker}-${stock.market}-tag-${tagIndex}-${tag}`} variant="secondary" className="text-xs">
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
          {hasMore && !paginationLoading && (
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

          {paginationLoading && page > 1 && (
            <div className="text-center mt-8">
              <div className="inline-flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>종목 불러오는 중...</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}