'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
// Sheet 관련 import 제거 - 상세 정보 패널 필요 없음
import { TrendingUp, TrendingDown, Calendar, DollarSign, BarChart3, Zap, Target, Activity, Info } from 'lucide-react';

// 🎨 반응형 차트 테마 시스템 (다크모드/라이트모드 대응)
const getChartTheme = (isDark: boolean = false) => ({
  // 메인 배경 - 다크모드 조건부
  background: {
    primary: isDark ? '#0a0e1a' : '#ffffff',      // 차트 배경
    secondary: isDark ? '#111827' : '#f8fafc',     // 카드 배경
    tertiary: isDark ? '#1f2937' : '#f1f5f9',      // 패널 배경
    elevated: isDark ? '#374151' : '#e2e8f0',      // 호버/활성 상태
  },
  
  // 텍스트 색상 - 다크모드 조건부
  text: {
    primary: isDark ? '#f9fafb' : '#0f172a',       // 주요 텍스트
    secondary: isDark ? '#d1d5db' : '#475569',     // 보조 텍스트
    muted: isDark ? '#9ca3af' : '#64748b',         // 비활성 텍스트
    accent: isDark ? '#60a5fa' : '#3b82f6',        // 강조 텍스트
  },
  
  // 차트 색상 - 다크모드 조건부
  chart: {
    line: '#3b82f6',                               // 메인 라인 (공통)
    lineGlow: isDark ? '#1d4ed8' : '#3b82f6',      // 라인 글로우
    grid: isDark ? '#374151' : '#e2e8f0',          // 그리드 라인
    gridMajor: isDark ? '#4b5563' : '#cbd5e1',     // 주요 그리드
    axis: isDark ? '#6b7280' : '#64748b',          // 축 색상
    crosshair: isDark ? '#60a5fa' : '#3b82f6',     // 크로스헤어
  },
  
  // 감정 분석 마커 - 다크모드 조건부
  sentiment: {
    positive: {
      primary: '#10b981',                          // 긍정 (공통)
      secondary: '#059669',                        // 어두운 긍정
      glow: '#6ee7b7',                            // 글로우
      background: isDark ? '#064e3b' : '#ecfdf5', // 배경
    },
    negative: {
      primary: '#ef4444',                          // 부정 (공통)
      secondary: '#dc2626',                        // 어두운 부정
      glow: '#fca5a5',                            // 글로우
      background: isDark ? '#7f1d1d' : '#fef2f2', // 배경
    },
    neutral: {
      primary: isDark ? '#6b7280' : '#64748b',     // 중립
      secondary: isDark ? '#4b5563' : '#475569',   // 어두운 중립
      glow: isDark ? '#d1d5db' : '#94a3b8',       // 글로우
      background: isDark ? '#374151' : '#f1f5f9', // 배경
    },
    warning: {
      primary: '#f59e0b',                          // 경고 (데이터 부족)
      secondary: '#d97706',                        // 어두운 경고
      glow: '#fbbf24',                            // 글로우
      background: isDark ? '#451a03' : '#fef3c7', // 배경
    },
  },
  
  // 인터랙션 색상 - 다크모드 조건부
  interaction: {
    hover: isDark ? '#1e40af' : '#2563eb',       // 호버
    active: '#2563eb',                           // 활성 (공통)
    focus: '#3b82f6',                            // 포커스 (공통)
    selection: isDark ? '#1e3a8a' : '#dbeafe',   // 선택 영역
  },
  
  // 그라데이션 - 다크모드 조건부
  gradients: {
    pricePositive: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    priceNegative: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    chartGlow: `linear-gradient(90deg, transparent 0%, ${isDark ? '#3b82f6' : '#60a5fa'} 50%, transparent 100%)`,
  }
});

interface PricePoint {
  date: string;
  price: number;
  postTitle?: string;
  postId?: number;
  isCurrentPrice?: boolean;
  sentiments?: {
    sentiment: string;
    score: number;
    confidence: number;
    keywords: any;
    context: string;
  }[];
  posts?: {
    id: number;
    title: string;
    excerpt: string;
    views: number;
    date: number;
  }[];
}

interface StockPriceChartProps {
  ticker: string;
  stockName: string;
  currency: string;
  recentPosts?: any[];
  currentPrice?: number;
}

export default function StockPriceChart({ 
  ticker, 
  stockName, 
  currency, 
  recentPosts = [], 
  currentPrice = 0 
}: StockPriceChartProps) {
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [yAxisDomain, setYAxisDomain] = useState<[number, number] | null>(null);
  const [zoomState, setZoomState] = useState<{
    left?: string | number;
    right?: string | number;
    refAreaLeft?: string | number;
    refAreaRight?: string | number;
    top?: number;
    bottom?: number;
    isZooming?: boolean;
  }>({});
  const [zoomHistory, setZoomHistory] = useState<Array<{
    xDomain: [string | number | undefined, string | number | undefined];
    yDomain: [number, number] | null;
  }>>([]);
  const [timeRange, setTimeRange] = useState<string>('6M');
  const [priceChange, setPriceChange] = useState<{ 
    value: number; 
    percentage: number; 
    isPositive: boolean; 
  } | null>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  // Sheet 관련 state 제거 - 상세 정보 패널 필요 없음
  
  // 🤳 모바일 터치 스와이핑 상태
  const [touchInteraction, setTouchInteraction] = useState<{
    isActive: boolean;
    activePoint: PricePoint | null;
    position: { x: number; y: number } | null;
    touchStartX: number | null;
    isSwiping: boolean;
  }>({
    isActive: false,
    activePoint: null,
    position: null,
    touchStartX: null,
    isSwiping: false,
  });

  // 필터링된 데이터 계산 - 줌 범위에 따른 데이터 필터링
  const filteredData = useMemo(() => {
    let data = priceData;
    
    // 1. 시간 범위 기반 필터링 (timeRange: 1M, 3M, 6M)
    if (timeRange && data.length > 0) {
      const now = new Date();
      const daysToShow = timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : 180;
      const cutoffDate = new Date(now.getTime() - (daysToShow * 24 * 60 * 60 * 1000));
      
      data = data.filter(d => {
        const dataDate = new Date(d.date);
        return dataDate >= cutoffDate;
      });
      
      console.log(`📅 Filtered data for ${timeRange}: ${data.length} days (from ${cutoffDate.toLocaleDateString()})`);
    }
    
    // 2. X축 줌 범위가 있으면 추가 필터링
    if (zoomState.left && zoomState.right) {
      const startDate = new Date(zoomState.left).getTime();
      const endDate = new Date(zoomState.right).getTime();
      data = data.filter(d => {
        const dataDate = new Date(d.date).getTime();
        return dataDate >= startDate && dataDate <= endDate;
      });
      
      console.log(`🔍 Zoom filtered data: ${data.length} days`);
    }
    
    return data;
  }, [priceData, timeRange, zoomState.left, zoomState.right]);

  // 다크모드 감지 - 안전한 클라이언트 전용 실행
  useEffect(() => {
    // 클라이언트 전용 실행 보장
    if (typeof window === 'undefined') return;
    
    const checkDarkMode = () => {
      try {
        if (document?.documentElement?.classList) {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      } catch (error) {
        console.warn('다크모드 감지 실패:', error);
        setIsDarkMode(false); // 기본값
      }
    };
    
    checkDarkMode();
    
    // MutationObserver 안전한 생성
    let observer: MutationObserver | null = null;
    try {
      if (typeof MutationObserver !== 'undefined' && document?.documentElement) {
        observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class']
        });
      }
    } catch (error) {
      console.warn('MutationObserver 생성 실패:', error);
    }
    
    return () => {
      try {
        observer?.disconnect();
      } catch (error) {
        console.warn('MutationObserver 정리 실패:', error);
      }
    };
  }, []);

  useEffect(() => {
    console.log(`🔄 [DEBUG] StockPriceChart useEffect triggered - ticker: ${ticker}, timeRange: ${timeRange}`);
    fetchAllPostsAndGenerateChart();
  }, [ticker, currentPrice, timeRange]);

  const fetchAllPostsAndGenerateChart = async () => {
    console.log(`🚀 [DEBUG] fetchAllPostsAndGenerateChart called for ${ticker}, timeRange: ${timeRange}`);
    try {
      // 선택된 기간에 따른 포스트 가져오기
      const period = timeRange.toLowerCase().replace('m', 'mo'); // 6M -> 6mo
      const cacheBuster = Date.now();
      console.log(`📅 Fetching posts for period: ${timeRange} (API: ${period})`);
      
      // 포스트와 감정 분석 데이터를 병렬로 가져오기
      const [postsResponse, sentimentResponse] = await Promise.all([
        fetch(`/api/merry/stocks/${ticker}/posts/full?period=${period}&t=${cacheBuster}`, {
          cache: 'no-store'
        }),
        fetch(`/api/merry/stocks/${ticker}/sentiments?period=${period}&t=${cacheBuster}`, {
          cache: 'no-store'
        })
      ]);
      
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        if (postsData.success) {
          console.log(`📊 Loaded ${postsData.data.posts.length} posts for ${ticker} chart (${timeRange} period)`);
          setAllPosts(postsData.data.posts);
          
          // 감정 분석 데이터 처리
          if (sentimentResponse.ok) {
            const sentimentDataResponse = await sentimentResponse.json();
            console.log(`🎯 Loaded sentiment data for ${ticker}:`, sentimentDataResponse);
            console.log(`📅 Available sentiment dates:`, Object.keys(sentimentDataResponse?.sentimentByDate || {}));
            setSentimentData(sentimentDataResponse);
          } else {
            console.warn('🚨 감정 분석 데이터 로딩 실패:', sentimentResponse.status);
            setSentimentData(null);
          }
          
          // 포스트 로드 후 차트 생성
          await generatePriceHistory(postsData.data.posts);
          return;
        }
      }
    } catch (error) {
      console.error('전체 포스트 로딩 실패:', error);
    }
    
    // 포스트 로드 실패시 기본 차트 생성
    await generatePriceHistory([]);
  };

  const generatePriceHistory = async (postsData?: any[]) => {
    try {
      const chartData: PricePoint[] = [];

      // 실제 주식 가격 API 호출 (선택된 기간)
      const priceData = await fetchRealStockPrices(ticker, stockName, timeRange);
      
      if (priceData && priceData.length > 0) {
        // API에서 받은 실제 가격 데이터 사용
        priceData.forEach((dataPoint) => {
          chartData.push({
            date: dataPoint.date,
            price: dataPoint.price,
            isCurrentPrice: false
          });
        });

        // 전달받은 postsData 또는 상태의 allPosts 사용
        const postsToUse = postsData && postsData.length > 0 ? postsData : 
                          allPosts.length > 0 ? allPosts : recentPosts;
        
        console.log(`🎯 Using ${postsToUse.length} posts for chart markers`);
        
        if (postsToUse && postsToUse.length > 0) {
          console.log(`🎯 Processing ${postsToUse.length} posts for chart markers`);
          
          postsToUse.forEach((post, index) => {
            let mentionDate: Date;
            if (typeof post.created_date === 'number') {
              mentionDate = new Date(post.created_date);
            } else {
              mentionDate = new Date(post.created_date);
            }
            
            const postDateStr = mentionDate.toISOString().split('T')[0];
            console.log(`📅 Post ${index + 1}: "${post.title.substring(0, 30)}..." on ${postDateStr}`);
            
            // 정확한 날짜 매칭을 먼저 시도
            let matchingPoint = chartData.find(p => p.date === postDateStr);
            
            // 정확한 매칭이 없으면 가장 가까운 날짜 찾기 (±7일 범위)
            if (!matchingPoint) {
              const postTime = mentionDate.getTime();
              const dayMs = 24 * 60 * 60 * 1000;
              
              let closestPoint = null;
              let closestDistance = Infinity;
              
              chartData.forEach(point => {
                const pointTime = new Date(point.date).getTime();
                const distance = Math.abs(pointTime - postTime);
                
                // 7일 이내에서 가장 가까운 점 찾기
                if (distance < 7 * dayMs && distance < closestDistance) {
                  closestDistance = distance;
                  closestPoint = point;
                }
              });
              
              matchingPoint = closestPoint;
              if (matchingPoint) {
                console.log(`🔗 Matched post "${post.title.substring(0, 30)}..." (${postDateStr}) to chart point (${matchingPoint.date})`);
              }
            } else {
              console.log(`✅ Exact match for post "${post.title.substring(0, 30)}..." on ${postDateStr}`);
            }
            
            if (matchingPoint) {
              // 해당 날짜의 데이터 포인트에 언급 정보 추가
              if (!matchingPoint.postTitle) {
                matchingPoint.postTitle = post.title;
                matchingPoint.postId = post.id;
                
                // 감정 분석 데이터 추가
                const postDateStr = typeof matchingPoint.date === 'string' && matchingPoint.date.match(/^\d{4}-\d{2}-\d{2}$/)
                  ? matchingPoint.date
                  : new Date(matchingPoint.date).toISOString().split('T')[0];
                console.log(`🔍 Looking for sentiment data on date: ${postDateStr}`, { 
                  rawDate: matchingPoint.date,
                  availableDates: Object.keys(sentimentData?.sentimentByDate || {}),
                  sentimentDataExists: !!sentimentData,
                  hasMatchingDate: !!(sentimentData?.sentimentByDate && sentimentData.sentimentByDate[postDateStr])
                });
                if (sentimentData && sentimentData.sentimentByDate && sentimentData.sentimentByDate[postDateStr]) {
                  matchingPoint.sentiments = sentimentData.sentimentByDate[postDateStr].sentiments;
                  matchingPoint.posts = sentimentData.sentimentByDate[postDateStr].posts;
                  console.log(`🎯 Added sentiment data to marker on ${postDateStr}:`, matchingPoint.sentiments);
                }
              } else {
                // 여러 포스트가 같은 날짜에 있으면 제목 합치기
                matchingPoint.postTitle = `${matchingPoint.postTitle} | ${post.title}`;
                
                // 감정 분석 데이터도 합치기
                const postDateStr = typeof matchingPoint.date === 'string' && matchingPoint.date.match(/^\d{4}-\d{2}-\d{2}$/)
                  ? matchingPoint.date
                  : new Date(matchingPoint.date).toISOString().split('T')[0];
                if (sentimentData && sentimentData.sentimentByDate && sentimentData.sentimentByDate[postDateStr]) {
                  if (!matchingPoint.sentiments) matchingPoint.sentiments = [];
                  if (!matchingPoint.posts) matchingPoint.posts = [];
                  
                  matchingPoint.sentiments = [...matchingPoint.sentiments, ...sentimentData.sentimentByDate[postDateStr].sentiments];
                  matchingPoint.posts = [...matchingPoint.posts, ...sentimentData.sentimentByDate[postDateStr].posts];
                  console.log(`🎯 Merged sentiment data to existing marker on ${postDateStr}:`, matchingPoint.sentiments);
                }
              }
            } else {
              console.log(`⚠️ No matching chart point found for post "${post.title.substring(0, 30)}..." (${postDateStr})`);
            }
          });
          
          const markersCount = chartData.filter(p => p.postTitle && !p.isCurrentPrice).length;
          const sentimentMarkers = chartData.filter(p => p.sentiments && p.sentiments.length > 0).length;
          console.log(`📊 Total markers created: ${markersCount} out of ${postsToUse.length} posts`);
          console.log(`🎭 Sentiment markers: ${sentimentMarkers} out of ${markersCount} total markers`);
        }

        // 현재가 추가/업데이트
        const today = new Date().toISOString().split('T')[0];
        const todayPoint = chartData.find(p => p.date === today);
        const todayPrice = currentPrice || (chartData.length > 0 ? chartData[chartData.length - 1].price : 0);
        
        if (todayPoint) {
          todayPoint.price = todayPrice;
          todayPoint.isCurrentPrice = true;
          if (!todayPoint.postTitle) {
            todayPoint.postTitle = '현재가';
          }
        } else {
          chartData.push({
            date: today,
            price: todayPrice,
            postTitle: '현재가',
            isCurrentPrice: true
          });
        }

        // 날짜순으로 정렬
        chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Y축 범위 최적화를 위한 최소/최대값 계산
        calculateYAxisDomain(chartData);

        // 가격 변화 계산 (첫째 날 vs 마지막 날)
        if (chartData.length >= 2) {
          const firstPrice = chartData[0].price;
          const lastPrice = chartData[chartData.length - 1].price;
          const change = lastPrice - firstPrice;
          const changePercentage = (change / firstPrice) * 100;

          setPriceChange({
            value: change,
            percentage: changePercentage,
            isPositive: change >= 0
          });
        }
      }

      // CLAUDE.md 원칙: 실제 데이터만 사용, dummy data 금지
      setPriceData(chartData); // 빈 배열이든 실제 데이터든 그대로 설정
      setLoading(false);
    } catch (error) {
      console.error('가격 데이터 로딩 실패:', error);
      setPriceData([]);
      setLoading(false);
    }
  };

  // 실제 주식 가격 API 호출 (기간별)
  const fetchRealStockPrices = async (ticker: string, stockName: string, period: string = '6M') => {
    try {
      // 한국 주식과 미국 주식 구분
      const isKoreanStock = ticker.length === 6 && !isNaN(Number(ticker));
      
      if (isKoreanStock) {
        // 한국 주식: KIS API 또는 Yahoo Finance Korea 사용
        return await fetchKoreanStockPrice(ticker, period);
      } else {
        // 미국 주식: Alpha Vantage 또는 Yahoo Finance 사용
        return await fetchUSStockPrice(ticker, period);
      }
    } catch (error) {
      console.error('주식 가격 API 호출 실패:', error);
      return null;
    }
  };

  // 한국 주식 가격 (Yahoo Finance Korea)
  const fetchKoreanStockPrice = async (ticker: string, period: string = '6M') => {
    try {
      // 기간을 API 형식으로 변환
      const apiPeriod = period.toLowerCase().replace('m', 'mo'); // 6M -> 6mo
      const cacheBuster = Date.now();
      const response = await fetch(`/api/stock-price?ticker=${ticker}.KS&period=${apiPeriod}&t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success && data.prices) {
        return data.prices;
      }
      return null;
    } catch (error) {
      console.error('한국 주식 가격 조회 실패:', error);
      return null;
    }
  };

  // 미국 주식 가격
  const fetchUSStockPrice = async (ticker: string, period: string = '6M') => {
    try {
      // 기간을 API 형식으로 변환
      const apiPeriod = period.toLowerCase().replace('m', 'mo'); // 6M -> 6mo
      const cacheBuster = Date.now();
      const response = await fetch(`/api/stock-price?ticker=${ticker}&period=${apiPeriod}&t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success && data.prices) {
        return data.prices;
      }
      return null;
    } catch (error) {
      console.error('미국 주식 가격 조회 실패:', error);
      return null;
    }
  };



  const formatPrice = (price: number): string => {
    const symbol = currency === 'USD' ? '$' : '₩';
    return `${symbol}${price.toLocaleString()}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  const handleMarkerClick = (data: PricePoint) => {
    try {
      if (data && data.postTitle && !data.isCurrentPrice && data.postId) {
        // allPosts에서 해당 포스트 찾기
        const post = allPosts.find(p => p.id === data.postId);
        if (post) {
          setSelectedPost(post);
          // Sheet 열기 제거 - 툴팁만 표시
        }
      }
    } catch (error) {
      console.warn('마커 클릭 에러:', error);
    }
  };

  // 🛡️ 안전한 테마 헬퍼 함수
  const getSafeTheme = () => {
    try {
      return getChartTheme(isDarkMode ?? false);
    } catch (error) {
      console.warn('테마 로딩 에러:', error);
      return getChartTheme(false); // 기본값으로 라이트 테마 사용
    }
  };

  // 🚀 프로페셔널 툴팁 컴포넌트 (다크모드/라이트모드 대응)
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    const theme = getSafeTheme();
    
    // 언급된 날짜나 현재가가 아니면 툴팁을 표시하지 않음
    if (!data.postTitle && !data.isCurrentPrice) {
      return null;
    }

    const getSentimentInfo = (sentiments: any[]) => {
      if (!sentiments || sentiments.length === 0) return null;
      
      const counts = sentiments.reduce((acc, s) => {
        acc[s.sentiment] = (acc[s.sentiment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const dominant = Object.entries(counts)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0];
      
      return {
        type: dominant[0],
        count: dominant[1],
        total: sentiments.length,
        avgConfidence: sentiments.reduce((sum, s) => sum + s.confidence, 0) / sentiments.length
      };
    };

    const sentimentInfo = getSentimentInfo(data.sentiments || []);
    
    return (
      <div 
        className="relative"
        style={{
          background: `linear-gradient(135deg, ${getChartTheme(isDarkMode).background.secondary} 0%, ${getChartTheme(isDarkMode).background.tertiary} 100%)`,
          border: `1px solid ${getChartTheme(isDarkMode).chart.grid}`,
          borderRadius: '12px',
          padding: '16px',
          maxWidth: '320px',
          boxShadow: isDarkMode ? `
            0 20px 25px -5px rgba(0, 0, 0, 0.3),
            0 10px 10px -5px rgba(0, 0, 0, 0.2),
            0 0 0 1px rgba(59, 130, 246, 0.1)
          ` : `
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.05),
            0 0 0 1px rgba(59, 130, 246, 0.1)
          `,
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
        }}
      >
        {/* 🎯 헤더 섹션 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ 
                background: data.isCurrentPrice 
                  ? getChartTheme(isDarkMode).sentiment.positive.primary 
                  : getChartTheme(isDarkMode).chart.line,
                boxShadow: `0 0 8px ${data.isCurrentPrice 
                  ? getChartTheme(isDarkMode).sentiment.positive.glow 
                  : getChartTheme(isDarkMode).chart.crosshair}50`
              }}
            />
            <span 
              className="text-xs font-medium tracking-wide"
              style={{ color: getChartTheme(isDarkMode).text.secondary }}
            >
              {formatDate(label)}
            </span>
          </div>
          {data.isCurrentPrice && (
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3" style={{ color: getChartTheme(isDarkMode).sentiment.positive.primary }} />
              <span 
                className="text-xs font-bold"
                style={{ color: getChartTheme(isDarkMode).sentiment.positive.primary }}
              >
                LIVE
              </span>
            </div>
          )}
        </div>

        {/* 💰 가격 정보 */}
        <div className="mb-4">
          <div 
            className="text-2xl font-bold tracking-tight"
            style={{ 
              color: getChartTheme(isDarkMode).text.primary,
              textShadow: `0 0 10px ${getChartTheme(isDarkMode).chart.crosshair}30`
            }}
          >
            {formatPrice(payload[0].value)}
          </div>
          {priceChange && !data.isCurrentPrice && (
            <div className="flex items-center gap-2 mt-1">
              <div 
                className="text-sm font-medium"
                style={{ 
                  color: priceChange.isPositive 
                    ? getChartTheme(isDarkMode).sentiment.positive.primary 
                    : getChartTheme(isDarkMode).sentiment.negative.primary
                }}
              >
                {priceChange.isPositive ? '+' : ''}{priceChange.percentage.toFixed(1)}%
              </div>
              <div 
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ 
                  background: priceChange.isPositive 
                    ? getChartTheme(isDarkMode).sentiment.positive.background 
                    : getChartTheme(isDarkMode).sentiment.negative.background,
                  color: priceChange.isPositive 
                    ? getChartTheme(isDarkMode).sentiment.positive.primary 
                    : getChartTheme(isDarkMode).sentiment.negative.primary
                }}
              >
                {formatPrice(Math.abs(priceChange.value))}
              </div>
            </div>
          )}
        </div>

        {/* 📝 포스트 정보 */}
        {data.postTitle && !data.isCurrentPrice && (
          <div 
            className="rounded-lg p-3 mb-3 relative overflow-hidden"
            style={{ 
              background: `linear-gradient(135deg, ${getChartTheme(isDarkMode).interaction.selection}40 0%, ${getChartTheme(isDarkMode).background.tertiary} 100%)`,
              border: `1px solid ${getChartTheme(isDarkMode).chart.line}30`
            }}
          >
            <div className="flex items-start gap-2 mb-2">
              <Target className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: getChartTheme(isDarkMode).text.accent }} />
              <div>
                <div 
                  className="text-xs font-medium mb-1"
                  style={{ color: getChartTheme(isDarkMode).text.accent }}
                >
                  메르의 언급
                </div>
                <div 
                  className="text-sm leading-relaxed line-clamp-2"
                  style={{ color: getChartTheme(isDarkMode).text.primary }}
                >
                  {data.postTitle}
                </div>
              </div>
            </div>

            {/* 🎯 감정 분석 섹션 */}
            {sentimentInfo && (
              <div 
                className="pt-3 mt-3"
                style={{ borderTop: `1px solid ${getChartTheme(isDarkMode).chart.grid}` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3" style={{ color: getChartTheme(isDarkMode).text.accent }} />
                    <span 
                      className="text-xs font-medium"
                      style={{ color: getChartTheme(isDarkMode).text.secondary }}
                    >
                      감정 분석
                    </span>
                  </div>
                  <div 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ 
                      background: sentimentInfo.type === 'positive' ? '#16a34a' : sentimentInfo.type === 'negative' ? '#dc2626' : '#2563eb',
                      color: '#ffffff'
                    }}
                  >
                    {sentimentInfo.type.toUpperCase()}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div style={{ color: getChartTheme(isDarkMode).text.muted }}>신뢰도</div>
                    <div 
                      className="font-medium"
                      style={{ color: getChartTheme(isDarkMode).text.secondary }}
                    >
                      {(sentimentInfo.avgConfidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ color: getChartTheme(isDarkMode).text.muted }}>분석 수</div>
                    <div 
                      className="font-medium"
                      style={{ color: getChartTheme(isDarkMode).text.secondary }}
                    >
                      {sentimentInfo.total}개
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 클릭 유도 */}
            {data.postId && (
              <div className="mt-3 pt-2" style={{ borderTop: `1px dashed ${getChartTheme(isDarkMode).chart.grid}` }}>
                <button 
                  onClick={() => handleMarkerClick(data)}
                  className="text-xs hover:underline transition-all duration-200"
                  style={{ 
                    color: getChartTheme(isDarkMode).text.accent,
                  }}
                >
                  포스트 자세히 보기 →
                </button>
              </div>
            )}
          </div>
        )}

        {/* 🔥 현재가 표시 */}
        {data.isCurrentPrice && (
          <div 
            className="rounded-lg p-3"
            style={{ 
              background: `linear-gradient(135deg, ${getChartTheme(isDarkMode).sentiment.positive.background} 0%, ${getChartTheme(isDarkMode).background.tertiary} 100%)`,
              border: `1px solid ${getChartTheme(isDarkMode).sentiment.positive.primary}30`
            }}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full animate-ping"
                style={{ background: getChartTheme(isDarkMode).sentiment.positive.primary }}
              />
              <span 
                className="text-sm font-medium"
                style={{ color: getChartTheme(isDarkMode).sentiment.positive.primary }}
              >
                실시간 현재가
              </span>
            </div>
          </div>
        )}

        {/* 💫 글로우 효과 */}
        <div 
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: getChartTheme(isDarkMode).gradients.chartGlow,
            opacity: 0.1,
            zIndex: -1
          }}
        />
      </div>
    );
  };

  const calculateYAxisDomain = (data: PricePoint[], xDomain?: [string | number | undefined, string | number | undefined]) => {
    let dataToUse = data;
    
    // X축 줌 범위가 있으면 해당 범위의 데이터만 필터링
    if (xDomain && xDomain[0] && xDomain[1]) {
      const startDate = new Date(xDomain[0]).getTime();
      const endDate = new Date(xDomain[1]).getTime();
      dataToUse = data.filter(d => {
        const dataDate = new Date(d.date).getTime();
        return dataDate >= startDate && dataDate <= endDate;
      });
    }
    
    const prices = dataToUse.map(d => d.price).filter(p => p > 0);
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const padding = (maxPrice - minPrice) * 0.1; // 10% 여백으로 적당하게
      
      const yAxisMin = Math.max(0, minPrice - padding);
      const yAxisMax = maxPrice + padding;
      
      setYAxisDomain([yAxisMin, yAxisMax]);
      console.log(`📊 Y-axis range: ${yAxisMin.toFixed(0)} - ${yAxisMax.toFixed(0)} (${dataToUse.length}/${data.length} points)`);
    }
  };

  const handleMouseDown = (e: any) => {
    if (!e) return;
    const { activeLabel } = e;
    if (activeLabel) {
      setZoomState(prev => ({ ...prev, refAreaLeft: activeLabel, isZooming: true }));
    }
  };

  const handleMouseMove = (e: any) => {
    if (!zoomState.isZooming || !e) return;
    const { activeLabel } = e;
    if (activeLabel && zoomState.refAreaLeft !== activeLabel) {
      setZoomState(prev => ({ ...prev, refAreaRight: activeLabel }));
    }
  };

  const handleMouseUp = () => {
    if (!zoomState.isZooming) return;
    
    let { refAreaLeft, refAreaRight } = zoomState;
    
    if (refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight) {
      // 날짜 순서 확인 및 정렬
      if (new Date(refAreaLeft).getTime() > new Date(refAreaRight).getTime()) {
        [refAreaLeft, refAreaRight] = [refAreaRight, refAreaLeft];
      }
      
      // 현재 상태를 히스토리에 저장
      setZoomHistory(prev => [
        ...prev,
        {
          xDomain: [zoomState.left, zoomState.right],
          yDomain
        }
      ]);
      
      // 새로운 줌 범위 설정
      setZoomState({
        left: refAreaLeft,
        right: refAreaRight
      });
      
      // Y축 범위도 새로 계산
      calculateYAxisDomain(priceData, [refAreaLeft, refAreaRight]);
      
      console.log(`🔍 Zoomed to: ${refAreaLeft} ~ ${refAreaRight}`);
    }
    
    setZoomState(prev => ({ ...prev, refAreaLeft: undefined, refAreaRight: undefined, isZooming: false }));
  };

  // 🤳 모바일 터치 이벤트 핸들러들
  const handleTouchStart = (e: React.TouchEvent) => {
    // 강화된 안전성 검사
    if (!e || !e.touches || e.touches.length === 0) {
      console.warn('터치 이벤트 또는 터치 배열이 없음');
      return;
    }
    
    const touch = e.touches[0];
    if (!touch || typeof touch.clientX !== 'number' || typeof touch.clientY !== 'number') {
      console.warn('유효하지 않은 터치 객체');
      return;
    }
    
    try {
      const target = e.currentTarget;
      if (!target || typeof target.getBoundingClientRect !== 'function') {
        console.warn('유효하지 않은 터치 타겟');
        return;
      }
      
      const rect = target.getBoundingClientRect();
      if (!rect || typeof rect.left !== 'number' || typeof rect.top !== 'number') {
        console.warn('유효하지 않은 바운딩 렉트');
        return;
      }
      
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // 차트 영역 내부인지 확인
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        console.warn('터치가 차트 영역 밖에 있음');
        return;
      }
      
      setTouchInteraction(prev => ({
        ...prev,
        isActive: true,
        touchStartX: x,
        isSwiping: false,
        position: { x, y }
      }));
    } catch (error) {
      console.error('터치 시작 처리 중 오류:', error);
      // 오류 시 안전한 상태로 초기화
      setTouchInteraction({
        isActive: false,
        activePoint: null,
        position: null,
        touchStartX: null,
        isSwiping: false,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchInteraction.isActive) return;
    
    const touch = e.touches[0];
    if (!touch) return; // 터치 없음 방지
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // 스와이핑 거리 계산
    const deltaX = Math.abs(x - (touchInteraction.touchStartX || 0));
    
    // 최소 스와이핑 거리를 넘으면 스와이핑 모드 활성화
    if (deltaX > 10) {
      setTouchInteraction(prev => ({ ...prev, isSwiping: true }));
    }
    
    // 차트 데이터에서 현재 터치 위치에 해당하는 포인트 찾기 (안전 장치)
    if (priceData && priceData.length > 0) {
      const chartWidth = rect.width - 60; // 마진 고려
      const dataIndex = Math.round((x - 30) / chartWidth * (priceData.length - 1));
      const clampedIndex = Math.max(0, Math.min(dataIndex, priceData.length - 1));
      const activePoint = priceData[clampedIndex];
      
      setTouchInteraction(prev => ({
        ...prev,
        position: { x, y },
        activePoint: activePoint || null
      }));
    } else {
      // 데이터 없을 때는 위치만 업데이트
      setTouchInteraction(prev => ({
        ...prev,
        position: { x, y },
        activePoint: null
      }));
    }
    
    // 기본 터치 스크롤 방지 (차트 위에서만)
    if (touchInteraction.isSwiping) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // 짧은 지연 후 터치 상태 초기화 (부드러운 사라짐 효과)
    setTimeout(() => {
      setTouchInteraction({
        isActive: false,
        activePoint: null,
        position: null,
        touchStartX: null,
        isSwiping: false,
      });
    }, 500);
  };

  const handleZoomOut = () => {
    if (zoomHistory.length > 0) {
      const lastState = zoomHistory[zoomHistory.length - 1];
      setZoomState({
        left: lastState.xDomain[0],
        right: lastState.xDomain[1]
      });
      setYAxisDomain(lastState.yDomain);
      setZoomHistory(prev => prev.slice(0, -1));
    } else {
      // 전체 범위로 리셋
      setZoomState({});
      calculateYAxisDomain(priceData);
    }
  };

  const handleReset = () => {
    setZoomState({});
    setZoomHistory([]);
    calculateYAxisDomain(priceData);
    setTimeRange('6M');
  };

  const handleTimeRangeChange = (range: string) => {
    console.log(`📅 Changing time range to: ${range}`);
    setTimeRange(range);
    setZoomState({});
    setZoomHistory([]);
    setLoading(true);
    
    // 새로운 기간에 대한 데이터를 다시 가져옴 (useEffect가 트리거됨)
    // fetchAllPostsAndGenerateChart()는 useEffect를 통해 자동 호출됨
  };

  if (loading) {
    return (
      <div 
        className="w-full rounded-xl overflow-hidden relative"
        style={{
          background: `linear-gradient(135deg, ${getChartTheme(isDarkMode).background.secondary} 0%, ${getChartTheme(isDarkMode).background.tertiary} 100%)`,
          border: `1px solid ${getChartTheme(isDarkMode).chart.grid}`,
          boxShadow: `
            0 20px 25px -5px rgba(0, 0, 0, 0.2),
            0 10px 10px -5px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(59, 130, 246, 0.05)
          `
        }}
      >
        <div 
          className="px-6 py-4 border-b"
          style={{ 
            borderColor: getChartTheme(isDarkMode).chart.grid,
            background: `linear-gradient(90deg, ${getChartTheme(isDarkMode).background.secondary} 0%, ${getChartTheme(isDarkMode).background.tertiary} 100%)`
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg animate-pulse"
              style={{ background: `${getChartTheme(isDarkMode).chart.line}20` }}
            >
              <BarChart3 
                className="w-5 h-5"
                style={{ color: getChartTheme(isDarkMode).chart.line }}
              />
            </div>
            <div>
              <h3 
                className="text-lg font-bold tracking-tight"
                style={{ color: getChartTheme(isDarkMode).text.primary }}
              >
                가격 차트
              </h3>
              <p 
                className="text-sm mt-1"
                style={{ color: getChartTheme(isDarkMode).text.muted }}
              >
                차트 데이터를 불러오는 중입니다...
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div 
            className="h-80 rounded-lg flex items-center justify-center relative overflow-hidden"
            style={{
              background: getChartTheme(isDarkMode).background.primary,
              border: `1px solid ${getChartTheme(isDarkMode).chart.grid}`,
            }}
          >
            {/* 스켈레톤 로딩 애니메이션 */}
            <div className="absolute inset-0">
              <div 
                className="w-full h-full opacity-20 animate-pulse"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${getChartTheme(isDarkMode).chart.line}40 50%, transparent 100%)`,
                  backgroundSize: '200% 100%',
                }}
              />
            </div>
            
            <div className="text-center z-10">
              <div 
                className="w-12 h-12 rounded-full border-2 border-transparent border-t-current animate-spin mx-auto mb-4"
                style={{ color: getChartTheme(isDarkMode).chart.line }}
              />
              <p 
                className="text-sm font-medium"
                style={{ color: getChartTheme(isDarkMode).text.secondary }}
              >
                차트를 불러오는 중...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CLAUDE.md 원칙: 실제 데이터 없으면 "정보 없음" 명확히 표시
  if (priceData.length === 0) {
    return (
      <div 
        className="w-full rounded-xl overflow-hidden relative"
        style={{
          background: `linear-gradient(135deg, ${getChartTheme(isDarkMode).background.secondary} 0%, ${getChartTheme(isDarkMode).background.tertiary} 100%)`,
          border: `1px solid ${getChartTheme(isDarkMode).chart.grid}`,
          boxShadow: `
            0 20px 25px -5px rgba(0, 0, 0, 0.2),
            0 10px 10px -5px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(59, 130, 246, 0.05)
          `
        }}
      >
        <div 
          className="px-6 py-4 border-b"
          style={{ 
            borderColor: getChartTheme(isDarkMode).chart.grid,
            background: `linear-gradient(90deg, ${getChartTheme(isDarkMode).background.secondary} 0%, ${getChartTheme(isDarkMode).background.tertiary} 100%)`
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ background: `${getChartTheme(isDarkMode).chart.line}20` }}
            >
              <BarChart3 
                className="w-5 h-5"
                style={{ color: getChartTheme(isDarkMode).chart.line }}
              />
            </div>
            <div>
              <h3 
                className="text-lg font-bold tracking-tight"
                style={{ color: getChartTheme(isDarkMode).text.primary }}
              >
                {stockName} 가격 차트
              </h3>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div 
            className="text-center py-12"
            style={{ color: getChartTheme(isDarkMode).text.muted }}
          >
            <div 
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ background: `${getChartTheme(isDarkMode).chart.grid}30` }}
            >
              <BarChart3 
                className="w-8 h-8 opacity-50"
                style={{ color: getChartTheme(isDarkMode).text.muted }}
              />
            </div>
            <div className="space-y-3">
              <h4 
                className="text-xl font-semibold"
                style={{ color: getChartTheme(isDarkMode).text.secondary }}
              >
                가격 정보 없음
              </h4>
              <p 
                className="text-sm leading-relaxed max-w-sm mx-auto"
                style={{ color: getChartTheme(isDarkMode).text.muted }}
              >
                {stockName}({ticker})의 6개월치 가격 데이터가<br/>
                아직 준비되지 않았습니다.
              </p>
              <p 
                className="text-xs mt-4"
                style={{ 
                  color: getChartTheme(isDarkMode).text.muted,
                  opacity: 0.7 
                }}
              >
                💡 메르가 언급한 종목만 차트 데이터를 제공합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full rounded-xl overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg, ${getChartTheme(isDarkMode).background.secondary} 0%, ${getChartTheme(isDarkMode).background.tertiary} 100%)`,
        border: `1px solid ${getChartTheme(isDarkMode).chart.grid}`,
        boxShadow: `
          0 20px 25px -5px rgba(0, 0, 0, 0.2),
          0 10px 10px -5px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(59, 130, 246, 0.05)
        `
      }}
    >
      {/* 🎨 프로페셔널 헤더 */}
      <div 
        className="px-6 py-4 border-b relative"
        style={{ 
          borderColor: getChartTheme(isDarkMode).chart.grid,
          background: `linear-gradient(90deg, ${getChartTheme(isDarkMode).background.secondary} 0%, ${getChartTheme(isDarkMode).background.tertiary} 100%)`
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ background: `${getChartTheme(isDarkMode).chart.line}20` }}
            >
              <BarChart3 
                className="w-5 h-5"
                style={{ color: getChartTheme(isDarkMode).chart.line }}
              />
            </div>
            <div>
              <h3 
                className="text-lg font-bold tracking-tight"
                style={{ color: getChartTheme(isDarkMode).text.primary }}
              >
                {stockName} 가격 차트
              </h3>
              <p 
                className="text-sm mt-1"
                style={{ color: getChartTheme(isDarkMode).text.muted }}
              >
                최근 {timeRange} 가격 변화 추이 및 메르의 언급 시점
              </p>
            </div>
          </div>
          
          {/* 🏷️ 티커 & 성과 배지 */}
          <div className="flex items-center gap-3">
            <div 
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ 
                background: `${getChartTheme(isDarkMode).text.accent}20`,
                color: getChartTheme(isDarkMode).text.accent,
                border: `1px solid ${getChartTheme(isDarkMode).text.accent}30`
              }}
            >
              {ticker}
            </div>
            {priceChange && (
              <div 
                className="px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5"
                style={{ 
                  background: priceChange.isPositive 
                    ? `${getChartTheme(isDarkMode).sentiment.positive.primary}20`
                    : `${getChartTheme(isDarkMode).sentiment.negative.primary}20`,
                  color: priceChange.isPositive 
                    ? getChartTheme(isDarkMode).sentiment.positive.primary
                    : getChartTheme(isDarkMode).sentiment.negative.primary,
                  border: `1px solid ${priceChange.isPositive 
                    ? getChartTheme(isDarkMode).sentiment.positive.primary
                    : getChartTheme(isDarkMode).sentiment.negative.primary}30`
                }}
              >
                {priceChange.isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {priceChange.isPositive ? '+' : ''}{priceChange.percentage.toFixed(1)}%
              </div>
            )}
          </div>
        </div>
        
        {/* 💫 헤더 글로우 효과 */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            background: getChartTheme(isDarkMode).gradients.chartGlow,
            zIndex: -1
          }}
        />
      </div>
      
      <div className="p-4">
        {/* 🎛️ 프로페셔널 컨트롤 패널 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span 
              className="text-sm font-medium"
              style={{ color: getChartTheme(isDarkMode).text.secondary }}
            >
              기간:
            </span>
            <div className="flex gap-1">
              {['1M', '3M', '6M'].map((range) => (
                <button
                  key={range}
                  onClick={() => handleTimeRangeChange(range)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105"
                  style={{ 
                    background: timeRange === range 
                      ? getChartTheme(isDarkMode).chart.line
                      : 'transparent',
                    color: timeRange === range 
                      ? getChartTheme(isDarkMode).background.primary
                      : getChartTheme(isDarkMode).text.secondary,
                    border: `1px solid ${timeRange === range 
                      ? getChartTheme(isDarkMode).chart.line
                      : getChartTheme(isDarkMode).chart.grid}`,
                    boxShadow: timeRange === range 
                      ? `0 0 10px ${getChartTheme(isDarkMode).chart.line}30`
                      : 'none'
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
            
            {/* 📊 실제 데이터 범위 표시 */}
            <div className="mt-2 text-xs flex items-center gap-2">
              <Info className="w-3 h-3" style={{ color: getChartTheme(isDarkMode).text.muted }} />
              <span style={{ color: getChartTheme(isDarkMode).text.muted }}>
                실제 데이터: {filteredData.length > 0 ? formatDate(filteredData[0]?.date || '') : '-'} ~ {filteredData.length > 0 ? formatDate(filteredData[filteredData.length - 1]?.date || '') : '-'} ({filteredData.length}일)
              </span>
              {filteredData.length > 0 && filteredData.length < (timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : 180) && (
                <span 
                  className="px-2 py-0.5 rounded text-xs"
                  style={{ 
                    background: `${getChartTheme(isDarkMode).sentiment.warning.primary}20`,
                    color: getChartTheme(isDarkMode).sentiment.warning.primary
                  }}
                >
                  데이터 부족
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {(zoomState.left && zoomState.right) && (
              <div 
                className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                style={{ 
                  background: `${getChartTheme(isDarkMode).interaction.focus}20`,
                  color: getChartTheme(isDarkMode).interaction.focus,
                  border: `1px solid ${getChartTheme(isDarkMode).interaction.focus}30`
                }}
              >
                📅 {formatDate(zoomState.left.toString())} ~ {formatDate(zoomState.right.toString())}
              </div>
            )}
            {zoomHistory.length > 0 && (
              <button 
                onClick={handleZoomOut}
                className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105"
                style={{ 
                  background: 'transparent',
                  color: getChartTheme(isDarkMode).text.secondary,
                  border: `1px solid ${getChartTheme(isDarkMode).chart.grid}`,
                }}
              >
                ↶ 뒤로
              </button>
            )}
            <button 
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105"
              style={{ 
                background: 'transparent',
                color: getChartTheme(isDarkMode).text.secondary,
                border: `1px solid ${getChartTheme(isDarkMode).chart.grid}`,
              }}
            >
              🔄 초기화
            </button>
          </div>
        </div>
        
        {/* 📊 차트 컨테이너 - 다크 배경 + 터치 이벤트 */}
        <div 
          className="h-72 w-full rounded-lg relative overflow-hidden"
          data-testid="stock-price-chart"
          style={{
            background: getChartTheme(isDarkMode).background.primary,
            border: `1px solid ${getChartTheme(isDarkMode).chart.grid}`,
            boxShadow: `inset 0 2px 4px rgba(0, 0, 0, 0.2)`
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={priceData} 
              margin={{ top: 15, right: 15, left: 15, bottom: 25 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              isAnimationActive={false}
            >
              {/* 🎨 프로페셔널 그리드 시스템 */}
              <CartesianGrid 
                strokeDasharray="1 3"
                stroke={getChartTheme(isDarkMode).chart.grid}
                strokeWidth={0.5}
                opacity={0.6}
                horizontal={true}
                vertical={false}
              />
              
              {/* 📅 X축 (시간) - TradingView 스타일 */}
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ 
                  fontSize: 11, 
                  fill: getChartTheme(isDarkMode).text.muted,
                  fontWeight: 500 
                }}
                axisLine={{ 
                  stroke: getChartTheme(isDarkMode).chart.axis, 
                  strokeWidth: 1 
                }}
                tickLine={{ 
                  stroke: getChartTheme(isDarkMode).chart.axis, 
                  strokeWidth: 1 
                }}
                domain={zoomState.left && zoomState.right ? [zoomState.left, zoomState.right] : 
                  filteredData.length > 0 ? [filteredData[0].date, filteredData[filteredData.length - 1].date] : ['dataMin', 'dataMax']}
                type="category"
                allowDataOverflow
                height={40}
                interval="preserveStartEnd"
              />
              
              {/* 💰 Y축 (가격) - 전문적인 가격 표시 */}
              <YAxis 
                domain={yAxisDomain || ['dataMin - 10', 'dataMax + 10']}
                tickFormatter={(value) => formatPrice(value)}
                tick={{ 
                  fontSize: 11, 
                  fill: getChartTheme(isDarkMode).text.muted,
                  fontWeight: 500 
                }}
                axisLine={{ 
                  stroke: getChartTheme(isDarkMode).chart.axis, 
                  strokeWidth: 1 
                }}
                tickLine={{ 
                  stroke: getChartTheme(isDarkMode).chart.axis, 
                  strokeWidth: 1 
                }}
                width={80}
                orientation="right"
              />
              
              {/* 🎯 고급 툴팁 시스템 - 고정 위치 */}
              <Tooltip 
                content={<CustomTooltip />}
                animationDuration={200}
                animationEasing="ease-out"
                allowEscapeViewBox={{ x: false, y: false }}
                position={{ x: 20, y: 20 }}
                offset={0}
                cursor={{ 
                  stroke: getChartTheme(isDarkMode).chart.crosshair, 
                  strokeWidth: 1, 
                  strokeDasharray: '2 2',
                  opacity: 0.8 
                }}
                wrapperStyle={{ 
                  zIndex: 1000,
                  pointerEvents: 'none',
                  position: 'fixed',
                  top: '20px',
                  left: '20px'
                }}
              />
              
              {/* 📊 메인 가격 라인 - 글로우 효과 */}
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={getChartTheme(isDarkMode).chart.line}
                strokeWidth={2.5}
                style={{}}
                isAnimationActive={false}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  
                  // 🎯 포스트 언급 마커 (감정 분석 기반 고급 시각화)
                  if (payload.postTitle && !payload.isCurrentPrice) {
                    console.log(`🎨 Rendering marker for: ${payload.postTitle}`, { sentiments: payload.sentiments });
                    // 감정 분석에 따른 마커 스타일 결정
                    const currentTheme = getSafeTheme();
                    let markerTheme = currentTheme.sentiment.neutral;
                    let intensity = 0.7;
                    
                    if (payload.sentiments && payload.sentiments.length > 0) {
                      const sentimentCounts = payload.sentiments.reduce((acc: any, s: any) => {
                        acc[s.sentiment] = (acc[s.sentiment] || 0) + 1;
                        return acc;
                      }, {});
                      
                      const dominantSentiment = Object.entries(sentimentCounts)
                        .sort(([,a], [,b]) => (b as number) - (a as number))[0][0];
                      
                      markerTheme = currentTheme.sentiment[dominantSentiment as keyof typeof currentTheme.sentiment] || currentTheme.sentiment.neutral;
                      
                      // 감정 강도에 따른 시각적 효과 조정
                      const avgConfidence = payload.sentiments.reduce((sum: number, s: any) => sum + s.confidence, 0) / payload.sentiments.length;
                      intensity = Math.max(0.5, avgConfidence);
                    }
                    
                    return (
                      <g>
                        {/* 외부 글로우 효과 - 다크모드 조건부 */}
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={12} 
                          fill={markerTheme.primary}
                          opacity={isDarkMode ? 0.1 * intensity : 0.05 * intensity}
                        />
                        
                        {/* 중간 링 - 다크모드 조건부 */}
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={8} 
                          fill="none" 
                          stroke={markerTheme.primary}
                          strokeWidth={1}
                          opacity={isDarkMode ? 0.3 * intensity : 0.2 * intensity}
                        />
                        
                        {/* 투명한 클릭 영역 확대 */}
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={14} 
                          fill="transparent" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleMarkerClick(payload)}
                        />
                        
                        {/* 메인 마커 */}
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={5} 
                          fill="none" 
                          stroke={markerTheme.primary} 
                          strokeWidth={2.5}
                          style={{ 
                            cursor: 'pointer', 
                            pointerEvents: 'none'
                          }}
                        />
                        
                        {/* 내부 점 */}
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={2} 
                          fill={markerTheme.secondary}
                          style={{ pointerEvents: 'none' }}
                        />
                        
                        {/* 감정 분석 인디케이터 */}
                        {payload.sentiments && payload.sentiments.length > 0 && (
                          <>
                            <circle 
                              cx={cx + 7} 
                              cy={cy - 7} 
                              r={3} 
                              fill={markerTheme.background}
                              stroke={markerTheme.primary}
                              strokeWidth={1.5}
                              style={{}}
                            />
                            <circle 
                              cx={cx + 7} 
                              cy={cy - 7} 
                              r={1.5} 
                              fill={markerTheme.primary}
                            />
                          </>
                        )}
                      </g>
                    );
                  }
                  
                  // 🔥 현재가 마커 (단순한 빈 원)
                  if (payload.isCurrentPrice) {
                    return (
                      <g>
                        {/* 단순한 빈 원 마커 */}
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={5} 
                          fill="none"
                          stroke={getSafeTheme().sentiment.positive.primary}
                          strokeWidth={2.5}
                          style={{ cursor: 'pointer' }}
                        />
                      </g>
                    );
                  }
                  
                  return null;
                }}
                dotSize={0}
                activeDot={{ 
                  r: 8, 
                  fill: getChartTheme(isDarkMode).chart.line,
                  stroke: getChartTheme(isDarkMode).background.primary, 
                  strokeWidth: 3,
                  style: { 
                    cursor: 'crosshair'
                  }
                }}
                name=""
                connectNulls={false}
              />
              
              {/* 🔍 줌 선택 영역 */}
              {zoomState.refAreaLeft && zoomState.refAreaRight && (
                <ReferenceArea
                  x1={zoomState.refAreaLeft}
                  x2={zoomState.refAreaRight}
                  stroke={getChartTheme(isDarkMode).interaction.selection}
                  strokeOpacity={0.8}
                  fill={getChartTheme(isDarkMode).interaction.selection}
                  fillOpacity={0.15}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          
          {/* 🤳 모바일 터치 인터랙션 오버레이 - 언급한 날짜에만 표시 */}
          {touchInteraction.isActive && touchInteraction.activePoint && touchInteraction.position && 
           touchInteraction.activePoint.postTitle && (
            <div 
              className="absolute pointer-events-none z-10"
              style={{
                left: touchInteraction.position.x - 75,
                top: touchInteraction.position.y - 120,
                transform: 'translateY(-100%)',
                transition: 'all 0.2s ease-out'
              }}
            >
              {/* 터치 포인트 인디케이터 */}
              <div 
                className="absolute w-3 h-3 rounded-full animate-ping"
                style={{
                  background: getChartTheme(isDarkMode).interaction.focus,
                  left: '50%',
                  top: '100%',
                  transform: 'translate(-50%, 10px)',
                  opacity: 0.7
                }}
              />
              <div 
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: getChartTheme(isDarkMode).interaction.focus,
                  left: '50%',
                  top: '100%',
                  transform: 'translate(-50%, 11px)'
                }}
              />
              
              {/* 정보 카드 */}
              <div 
                className="px-4 py-3 rounded-xl shadow-xl border backdrop-blur-sm"
                style={{
                  background: `${getChartTheme(isDarkMode).background.secondary}f0`,
                  border: `1px solid ${getChartTheme(isDarkMode).chart.grid}`,
                  minWidth: '150px'
                }}
              >
                {/* 날짜 */}
                <div 
                  className="text-xs font-medium mb-1 text-center"
                  style={{ color: getChartTheme(isDarkMode).text.muted }}
                >
                  📅 {formatDate(touchInteraction.activePoint.date)}
                </div>
                
                {/* 가격 */}
                <div 
                  className="text-lg font-bold text-center mb-2"
                  style={{ color: getChartTheme(isDarkMode).text.primary }}
                >
                  {formatPrice(touchInteraction.activePoint.price)}
                </div>
                
                {/* 포스트 정보 */}
                {touchInteraction.activePoint.postTitle && (
                  <div 
                    className="text-xs text-center p-2 rounded-lg"
                    style={{ 
                      background: `${getChartTheme(isDarkMode).interaction.focus}20`,
                      color: getChartTheme(isDarkMode).interaction.focus
                    }}
                  >
                    📝 {touchInteraction.activePoint.postTitle}
                  </div>
                )}
                
                {/* 감정 분석 정보 */}
                {touchInteraction.activePoint.sentiments && touchInteraction.activePoint.sentiments.length > 0 && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: getChartTheme(isDarkMode).chart.grid }}>
                    <div 
                      className="text-xs text-center"
                      style={{ color: getChartTheme(isDarkMode).text.secondary }}
                    >
                      🎯 {touchInteraction.activePoint.sentiments[0].sentiment.toUpperCase()}
                      <span className="ml-1" style={{ color: getChartTheme(isDarkMode).text.muted }}>
                        ({(touchInteraction.activePoint.sentiments[0].confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                )}
                
                {/* 현재가 표시 */}
                {touchInteraction.activePoint.isCurrentPrice && (
                  <div 
                    className="text-xs text-center mt-2 px-2 py-1 rounded-full"
                    style={{ 
                      background: getChartTheme(isDarkMode).sentiment.positive.primary,
                      color: '#ffffff'
                    }}
                  >
                    🔥 실시간 현재가
                  </div>
                )}
                
                {/* 터치 힌트 - 언급한 날에만 표시 */}
                {touchInteraction.activePoint.postTitle && (
                  <div 
                    className="text-xs text-center mt-2 opacity-75"
                    style={{ color: getSafeTheme().text.muted }}
                  >
                    👆 스와이프하여 다른 지점 보기
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 📈 프로페셔널 통계 대시보드 */}
        <div 
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 pt-2"
          style={{ borderTop: `1px solid ${getChartTheme(isDarkMode).chart.grid}` }}
        >
          {/* 첫 언급가 */}
          <div 
            className="text-center p-3 rounded-lg relative overflow-hidden"
            style={{ 
              background: `linear-gradient(135deg, ${getChartTheme(isDarkMode).background.tertiary} 0%, ${getChartTheme(isDarkMode).background.secondary} 100%)`,
              border: `1px solid ${getChartTheme(isDarkMode).chart.grid}`
            }}
          >
            <div 
              className="text-xl font-bold tracking-tight"
              style={{ color: getChartTheme(isDarkMode).text.primary }}
            >
              {formatPrice(priceData[0]?.price || 0)}
            </div>
            <div 
              className="text-sm font-medium mt-1"
              style={{ color: getChartTheme(isDarkMode).text.secondary }}
            >
              첫 언급가
            </div>
            <div 
              className="text-xs mt-2 flex items-center justify-center gap-1"
              style={{ color: getChartTheme(isDarkMode).text.muted }}
            >
              <Calendar className="w-3 h-3" />
              {formatDate(priceData[0]?.date || '')}
            </div>
          </div>

          {/* 현재가 */}
          <div 
            className="text-center p-3 rounded-lg relative overflow-hidden"
            style={{ 
              background: `linear-gradient(135deg, ${getChartTheme(isDarkMode).sentiment.positive.background}40 0%, ${getChartTheme(isDarkMode).background.tertiary} 100%)`,
              border: `1px solid ${getChartTheme(isDarkMode).sentiment.positive.primary}30`
            }}
          >
            <div 
              className="text-xl font-bold tracking-tight flex items-center justify-center gap-2"
              style={{ color: getChartTheme(isDarkMode).sentiment.positive.primary }}
            >
              <Activity className="w-4 h-4" />
              {formatPrice(priceData[priceData.length - 1]?.price || 0)}
            </div>
            <div 
              className="text-sm font-medium mt-1"
              style={{ color: getChartTheme(isDarkMode).sentiment.positive.primary }}
            >
              현재가
            </div>
            <div 
              className="text-xs mt-2 flex items-center justify-center gap-1"
              style={{ color: getChartTheme(isDarkMode).text.muted }}
            >
              <Calendar className="w-3 h-3" />
              {formatDate(priceData[priceData.length - 1]?.date || '')}
            </div>
          </div>

          {/* 가격 변동 */}
          <div 
            className="text-center p-3 rounded-lg relative overflow-hidden"
            style={{ 
              background: priceChange?.isPositive 
                ? `linear-gradient(135deg, ${getChartTheme(isDarkMode).sentiment.positive.background}40 0%, ${getChartTheme(isDarkMode).background.tertiary} 100%)`
                : `linear-gradient(135deg, ${getChartTheme(isDarkMode).sentiment.negative.background}40 0%, ${getChartTheme(isDarkMode).background.tertiary} 100%)`,
              border: `1px solid ${priceChange?.isPositive 
                ? getChartTheme(isDarkMode).sentiment.positive.primary
                : getChartTheme(isDarkMode).sentiment.negative.primary}30`
            }}
          >
            <div 
              className="text-xl font-bold tracking-tight flex items-center justify-center gap-2"
              style={{ 
                color: priceChange?.isPositive 
                  ? getChartTheme(isDarkMode).sentiment.positive.primary
                  : getChartTheme(isDarkMode).sentiment.negative.primary
              }}
            >
              {priceChange?.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {priceChange ? formatPrice(Math.abs(priceChange.value)) : '-'}
            </div>
            <div 
              className="text-sm font-medium mt-1"
              style={{ color: getChartTheme(isDarkMode).text.secondary }}
            >
              가격 변동
            </div>
            <div 
              className="text-xs mt-2 font-medium"
              style={{ 
                color: priceChange?.isPositive 
                  ? getChartTheme(isDarkMode).sentiment.positive.primary
                  : getChartTheme(isDarkMode).sentiment.negative.primary
              }}
            >
              {priceChange ? `${priceChange.isPositive ? '+' : '-'}${Math.abs(priceChange.percentage).toFixed(1)}%` : '-'}
            </div>
          </div>

          {/* 언급 통계 */}
          <div 
            className="text-center p-3 rounded-lg relative overflow-hidden"
            style={{ 
              background: `linear-gradient(135deg, ${getChartTheme(isDarkMode).text.accent}20 0%, ${getChartTheme(isDarkMode).background.tertiary} 100%)`,
              border: `1px solid ${getChartTheme(isDarkMode).text.accent}30`
            }}
          >
            <div 
              className="text-xl font-bold tracking-tight flex items-center justify-center gap-2"
              style={{ color: getChartTheme(isDarkMode).text.accent }}
            >
              <Target className="w-4 h-4" />
              {allPosts.length > 0 ? allPosts.length : recentPosts.length}개
            </div>
            <div 
              className="text-sm font-medium mt-1"
              style={{ color: getChartTheme(isDarkMode).text.secondary }}
            >
              최근 {timeRange} 언급
            </div>
            <div 
              className="text-xs mt-2 flex items-center justify-center gap-1"
              style={{ color: getChartTheme(isDarkMode).text.muted }}
            >
              <Calendar className="w-3 h-3" />
              {priceData.filter(p => p.postTitle && !p.isCurrentPrice).length}회 언급
            </div>
            {(zoomState.left && zoomState.right) && (
              <div 
                className="text-xs mt-1 font-medium"
                style={{ color: getChartTheme(isDarkMode).interaction.focus }}
              >
                🔍 줌: {formatDate(zoomState.left.toString())} ~ {formatDate(zoomState.right.toString())}
              </div>
            )}
          </div>
        </div>

        {/* 📝 데이터 설명 및 안내 */}
        {filteredData.length > 0 && filteredData.length < (timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : 180) && (
          <div 
            className="mt-2 p-2 rounded-lg border-l-4"
            style={{ 
              background: `${getChartTheme(isDarkMode).sentiment.warning.primary}10`,
              borderLeftColor: getChartTheme(isDarkMode).sentiment.warning.primary,
              border: `1px solid ${getChartTheme(isDarkMode).sentiment.warning.primary}30`
            }}
          >
            <div className="flex items-start gap-3">
              <Info 
                className="w-5 h-5 mt-0.5"
                style={{ color: getChartTheme(isDarkMode).sentiment.warning.primary }}
              />
              <div>
                <h4 
                  className="text-sm font-medium mb-1"
                  style={{ color: getChartTheme(isDarkMode).sentiment.warning.primary }}
                >
                  📊 데이터 범위 안내
                </h4>
                <p 
                  className="text-xs leading-relaxed"
                  style={{ color: getChartTheme(isDarkMode).text.secondary }}
                >
                  현재 {timeRange} 차트와 다른 기간 차트가 동일하게 보이는 이유는 데이터베이스에 저장된 가격 데이터가 
                  <strong className="mx-1" style={{ color: getChartTheme(isDarkMode).text.primary }}>
                    {formatDate(filteredData[0]?.date || '')} ~ {formatDate(filteredData[filteredData.length - 1]?.date || '')}
                  </strong>
                  ({filteredData.length}일)로 제한되어 있기 때문입니다. 
                  더 많은 히스토리컬 데이터가 축적되면 기간별 차이가 나타날 예정입니다.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}