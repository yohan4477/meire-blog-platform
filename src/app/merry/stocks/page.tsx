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
  sector?: string; // 섹터 정보 추가
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
  const [allStocks, setAllStocks] = useState<Stock[]>([]); // 전체 종목 데이터 (통계용)
  const [statsLoaded, setStatsLoaded] = useState(false);
  
  // 메인 로딩 상태 관리
  const mainLoading = useOptimizedLoading({
    minLoadingTime: 600,
    maxLoadingTime: 8000,
    retryAttempts: 3
  });
  
  // 가격 로딩 상태 관리
  const priceLoading = useOptimizedLoading({
    minLoadingTime: 200,
    maxLoadingTime: 5000,
    retryAttempts: 2
  });
  
  // 통계 로딩 상태 관리
  const statsLoading = useOptimizedLoading({
    minLoadingTime: 300,
    maxLoadingTime: 4000,
    retryAttempts: 2
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all'); // 국내/해외 필터
  const [majorSectorFilter, setMajorSectorFilter] = useState('all'); // 대분류 섹터 필터
  const [subSectorFilter, setSubSectorFilter] = useState('all'); // 소분류 섹터 필터
  
  // 1단계: 국내/해외 분류
  const regionCategories = {
    '국내': ['KOSPI', 'KOSDAQ', 'KRX'],
    '해외': ['NASDAQ', 'NYSE', 'TSE']
  };
  
  // 2단계: 대분류 섹터 (실제 DB에서 사용되는 sector 값 기반)
  const sectorCategories = {
    '기술/IT': ['기술', '반도체', '전자상거래'],
    '에너지/원자력': ['에너지', '원자력', '우라늄'],
    '산업/제조': ['철강', '조선', '소재', '화학'],
    '운송/모빌리티': ['전기차', '자동차'],
    '소비재/서비스': ['엔터테인먼트'],
    '헬스케어': ['제약', '헬스케어'],
    '신소재/배터리': ['배터리', '희토류']
  };
  
  // 3단계: 소분류 목록 가져오기
  const getSubSectors = (majorSector: string) => {
    return majorSector === 'all' ? [] : sectorCategories[majorSector] || [];
  };
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;

  useEffect(() => {
    // 통계 데이터를 먼저 빠르게 로드 (UX 개선)
    fetchAllStocksForStats();
    
    if (page === 1) {
      fetchStocksSequential();
    } else {
      fetchStocks(); // 페이지네이션은 기존 방식 유지
    }
  }, [page]);
  
  // 통계 카드용 전체 데이터 로드 (즉시 표시를 위한 빠른 로딩)
  const fetchAllStocksForStats = async () => {
    const result = await statsLoading.fetchWithLoading<{success: boolean, data: {stocks: Stock[]}}>
    (`/api/merry/stocks?limit=100&pricesOnly=false`);
    
    if (result?.success && result.data?.stocks) {
      setAllStocks(result.data.stocks);
      setStatsLoaded(true);
      console.log(`📊 통계용 데이터 로드 완료: ${result.data.stocks.length}개 종목`);
    }
  };

  // 🚀 순차적 API 호출: 기본 정보 먼저 → 가격 정보 나중에
  const fetchStocksSequential = async () => {
    // 1단계: 기본 종목 정보 빠르게 로드 (가격 정보 제외)
    console.log('🔥 Step 1: Loading basic stock information...');
    const basicResult = await mainLoading.fetchWithLoading<{success: boolean, data: {stocks: Stock[], hasMore: boolean}}>
    (`/api/merry/stocks?limit=${limit}&page=${page}&pricesOnly=false`);
    
    if (basicResult?.success && basicResult.data?.stocks) {
      // 기본 정보를 먼저 표시 (가격 정보 없이)
      const basicStocks = basicResult.data.stocks.map((stock: Stock) => ({
        ...stock,
        currentPrice: 0,
        priceChange: '+0.00%',
        currency: stock.currency || (stock.market === 'KOSPI' || stock.market === 'KOSDAQ' ? 'KRW' : 'USD')
      }));
      
      setStocks(basicStocks);
      setHasMore(basicResult.data.hasMore);
      console.log('✅ Step 1 완료: 기본 정보 로드 완료');
      
      // 2단계: 실시간 가격 정보 순차적으로 업데이트
      console.log('🔥 Step 2: Loading price information sequentially...');
      
      // 가격 정보는 별도 요청으로 처리 (백그라운드)
      setTimeout(() => updatePricesSequentially(basicStocks), 100);
    }
  };

  // 🔄 가격 정보 순차적 업데이트 
  const updatePricesSequentially = async (basicStocks: Stock[]) => {
    const priceResult = await priceLoading.fetchWithLoading<{success: boolean, data: {stocks: Stock[]}}>
    (`/api/merry/stocks?limit=${limit}&page=${page}&pricesOnly=true`);
    
    if (priceResult?.success && priceResult.data?.stocks) {
      // 가격 정보가 포함된 데이터로 업데이트
      setStocks(priceResult.data.stocks);
      console.log('✅ Step 2 완료: 가격 정보 업데이트 완료');
    } else {
      // 가격 정보 로딩 실패해도 기본 정보는 계속 표시
      console.warn('가격 정보 로딩 실패, 기본 정보만 표시');
    }
  };

  // 기존 페이지네이션용 함수 (2페이지 이상)  
  const [paginationLoading, setPaginationLoading] = useState(false);
  const fetchStocks = async () => {
    try {
      setPaginationLoading(true);
      const response = await fetch(`/api/merry/stocks?limit=${limit}&page=${page}`);
      const data = await response.json();
      
      if (data.success) {
        setStocks(prev => [...prev, ...data.data.stocks]);
        setHasMore(data.data.hasMore);
      }
    } catch (err) {
      console.error('종목 데이터 로딩 오류:', err);
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

  // 페이지에 표시될 종목 필터링 (페이지네이션된 데이터) - 3단계 필터링
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = (stock.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                          (stock.ticker?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    // 1단계: 국내/해외 필터링
    let matchesRegion = true;
    if (regionFilter !== 'all') {
      const regionMarkets = regionCategories[regionFilter] || [];
      matchesRegion = regionMarkets.includes(stock.market || 'NASDAQ');
    }
    
    // 2단계: 대분류 필터링
    let matchesMajorSector = true;
    if (majorSectorFilter !== 'all') {
      const majorSectorList = sectorCategories[majorSectorFilter] || [];
      matchesMajorSector = majorSectorList.includes(stock.sector || '');
    }
    
    // 3단계: 소분류 필터링
    let matchesSubSector = true;
    if (subSectorFilter !== 'all') {
      matchesSubSector = stock.sector === subSectorFilter;
    }
    
    const matchesSentiment = sentimentFilter === 'all' || stock.sentiment === sentimentFilter;
    
    return matchesSearch && matchesRegion && matchesMajorSector && matchesSubSector && matchesSentiment;
  });
  
  // 전체 데이터 필터링 (통계 카드용) - 3단계 필터링
  const filteredAllStocks = allStocks.filter(stock => {
    const matchesSearch = (stock.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                          (stock.ticker?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    // 1단계: 국내/해외 필터링
    let matchesRegion = true;
    if (regionFilter !== 'all') {
      const regionMarkets = regionCategories[regionFilter] || [];
      matchesRegion = regionMarkets.includes(stock.market || 'NASDAQ');
    }
    
    // 2단계: 대분류 필터링
    let matchesMajorSector = true;
    if (majorSectorFilter !== 'all') {
      const majorSectorList = sectorCategories[majorSectorFilter] || [];
      matchesMajorSector = majorSectorList.includes(stock.sector || '');
    }
    
    // 3단계: 소분류 필터링
    let matchesSubSector = true;
    if (subSectorFilter !== 'all') {
      matchesSubSector = stock.sector === subSectorFilter;
    }
    
    const matchesSentiment = sentimentFilter === 'all' || stock.sentiment === sentimentFilter;
    
    return matchesSearch && matchesRegion && matchesMajorSector && matchesSubSector && matchesSentiment;
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
          메르가 블로그에서 언급한 모든 종목들을 한눈에 확인하세요 (최신 언급일 순, 같은 날짜는 언급 적은 순)
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
            
            {/* 1단계: 국내/해외 선택 */}
            <Select value={regionFilter} onValueChange={(value) => {
              setRegionFilter(value);
              setMajorSectorFilter('all'); // 국내/해외 변경시 하위 필터 초기화
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

            {/* 2단계: 대분류 섹터 선택 */}
            <Select value={majorSectorFilter} onValueChange={(value) => {
              setMajorSectorFilter(value);
              setSubSectorFilter('all'); // 대분류 변경시 소분류 초기화
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
            
            {/* 3단계: 소분류 섹터 선택 (대분류 선택시에만 활성화) */}
            {majorSectorFilter !== 'all' && (
              <Select value={subSectorFilter} onValueChange={setSubSectorFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="세부 분류">
                    {subSectorFilter === 'all' ? '전체 세부분류' : subSectorFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 세부분류</SelectItem>
                  {getSubSectors(majorSectorFilter).map(subSector => (
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

            {/* 필터 초기화 버튼 */}
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
          
          {/* 활성 필터 표시 */}
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

      {/* 통계 카드 - 섹터 필터에 따른 동적 변경 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card 
          className={`bg-card dark:bg-card cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${regionFilter === 'all' && majorSectorFilter === 'all' && subSectorFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => {
            setRegionFilter('all');
            setMajorSectorFilter('all');
            setSubSectorFilter('all');
            setSentimentFilter('all');
          }}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{filteredAllStocks.length}</div>
            <div className="text-sm text-muted-foreground">총 종목 수</div>
          </CardContent>
        </Card>
        <Card className="bg-card dark:bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {filteredAllStocks.filter(s => (s.market || 'NASDAQ') === 'KOSPI').length}
            </div>
            <div className="text-sm text-muted-foreground">한국 종목</div>
          </CardContent>
        </Card>
        <Card className="bg-card dark:bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {filteredAllStocks.filter(s => ['NASDAQ', 'NYSE'].includes(s.market || 'NASDAQ')).length}
            </div>
            <div className="text-sm text-muted-foreground">미국 종목</div>
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

      {/* 종목 리스트 */}
      <DataStateHandler
        isLoading={mainLoading.isLoading && page === 1}
        hasError={!!mainLoading.error}
        isEmpty={!mainLoading.isLoading && !mainLoading.error && filteredStocks.length === 0}
        loadingConfig={{
          message: "메르가 언급한 종목들을 불러오는 중...",
          variant: "skeleton",
          size: "lg"
        }}
        errorConfig={{
          error: mainLoading.error || undefined,
          canRetry: mainLoading.canRetry,
          onRetry: () => {
            mainLoading.retry();
            if (page === 1) {
              fetchStocksSequential();
            } else {
              fetchStocks();
            }
          },
          isRetrying: mainLoading.isRetrying
        }}
        emptyConfig={{
          icon: BarChart3,
          message: "조건에 맞는 종목이 없습니다",
          description: "다른 필터 조건을 사용해보세요",
          action: (
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
          )
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStocks.map((stock) => (
          <Link key={stock.ticker} href={`/merry/stocks/${stock.ticker}`}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
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
                      {priceLoading.isLoading && stock.currentPrice === 0 ? (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs text-gray-500">가격 로딩중...</span>
                        </div>
                      ) : stock.currentPrice > 0 ? (
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
      </DataStateHandler>

      {/* 더보기 버튼 */}
      {hasMore && !paginationLoading && !mainLoading.isLoading && (
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
    </div>
  );
}