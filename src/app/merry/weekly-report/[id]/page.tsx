'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { 
  ArrowLeft,
  Calendar,
  FileText,
  Brain,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Users,
  Star,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import WorldMap from '@/components/merry/WorldMap';
import EconomicChart from '@/components/merry/EconomicChart';

/**
 * 개별 주간보고서 상세 페이지
 * 
 * @author Meire Blog Platform
 * @created 2025-08-21
 */

interface DetailedReport {
  id: number;
  weekRange: { start: string; end: string };
  reportDate: string;
  status: string;
  title: string;
  summary: string;
  insights: string;
  stats: {
    totalPosts: number;
    totalStockMentions: number;
    analyzedPosts: number;
    categories: number;
    stockTrends: number;
    aiInsights: number;
  };
  postAnalyses: Array<{
    id: number;
    postTitle: string;
    postDate: string;
    category: string;
    sentimentScore: number;
    marketImpactScore: number;
    keyThemes: string[];
    insights: string;
  }>;
  categoryAnalyses: Array<{
    category: string;
    postCount: number;
    avgSentimentScore: number;
    keyInsights: string;
    topKeywords: string[];
    trendAnalysis: string;
  }>;
  stockTrends: Array<{
    ticker: string;
    companyName?: string;
    mentionCount: number;
    avgSentimentScore: number;
    priceChangePercent?: number;
    trendCategory: string;
    keyEvents?: string;
    analystNote: string;
  }>;
  aiInsights: Array<{
    id: number;
    type: string;
    title: string;
    content: string;
    confidence: number;
    supportingPosts: number[];
    priority: number;
  }>;
  metrics: Array<{
    name: string;
    value: number;
    unit: string;
    changePercent?: number;
    trendDirection?: string;
    interpretation: string;
  }>;
  generatedAt?: string;
  createdAt: string;
}

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export default function WeeklyReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [report, setReport] = useState<DetailedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [reportId, setReportId] = useState<string>('');

  useEffect(() => {
    params.then(({ id }) => {
      setReportId(id);
      loadReportDetails(id);
    });
  }, [params]);

  const loadReportDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/merry/weekly-reports/${id}`);
      const result = await response.json();
      
      if (result.success) {
        setReport(result.data);
      } else {
        console.error('보고서 로딩 실패:', result.error);
      }
    } catch (error) {
      console.error('API 호출 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatWeekRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    return `${startDate.getMonth() + 1}월 ${startDate.getDate()}일 ~ ${endDate.getMonth() + 1}월 ${endDate.getDate()}일`;
  };

  const getSentimentColor = (sentiment: number | null | undefined) => {
    if (sentiment == null) return 'text-gray-600';
    if (sentiment > 0.2) return 'text-green-600';
    if (sentiment < -0.2) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSentimentIcon = (sentiment: number | null | undefined) => {
    if (sentiment == null) return <Activity className="h-4 w-4" />;
    if (sentiment > 0.2) return <TrendingUp className="h-4 w-4" />;
    if (sentiment < -0.2) return <TrendingDown className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const formatNumber = (value: number | null | undefined, decimals: number = 1): string => {
    if (value == null || isNaN(value)) return '정보 없음';
    return value.toFixed(decimals);
  };

  const formatPercentage = (value: number | null | undefined, decimals: number = 1): string => {
    if (value == null || isNaN(value)) return '정보 없음';
    return `${(value * 100).toFixed(decimals)}%`;
  };

  const formatPriceChange = (value: number | null | undefined): string => {
    if (value == null || isNaN(value)) return '정보 없음';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getTrendCategoryColor = (category: string) => {
    switch (category) {
      case '상승': return 'bg-green-100 text-green-800';
      case '하락': return 'bg-red-100 text-red-800';
      case '주목': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInsightTypeLabel = (type: string) => {
    switch (type) {
      case 'market_outlook': return '시장 전망';
      case 'sector_analysis': return '섹터 분석';
      case 'risk_assessment': return '리스크 평가';
      case 'opportunity_highlight': return '기회 발굴';
      default: return type;
    }
  };

  const getPriorityIcon = (priority: number) => {
    if (priority >= 4) return <Star className="h-4 w-4 text-yellow-500" />;
    if (priority >= 3) return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    return <CheckCircle className="h-4 w-4 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">보고서를 찾을 수 없습니다</h2>
          <p className="text-muted-foreground mb-4">
            요청하신 주간보고서가 존재하지 않거나 접근할 수 없습니다.
          </p>
          <Button asChild>
            <Link href="/merry/weekly-report">
              <ArrowLeft className="h-4 w-4 mr-2" />
              보고서 목록으로 돌아가기
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/merry/weekly-report">
            <ArrowLeft className="h-4 w-4 mr-2" />
            주간보고 목록으로
          </Link>
        </Button>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {report.title}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatWeekRange(report.weekRange.start, report.weekRange.end)}
              </span>
              <span>생성일: {formatDate(report.createdAt)}</span>
              {report.generatedAt && (
                <span>완료일: {formatDate(report.generatedAt)}</span>
              )}
            </div>
          </div>
          <Badge variant="outline" className="bg-green-100 text-green-800">
            <CheckCircle className="h-4 w-4 mr-1" />
            분석 완료
          </Badge>
        </div>
      </div>

      {/* 요약 섹션 */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">📋 보고서 요약</h2>
        <p className="text-muted-foreground mb-4">{report.summary}</p>
        <p className="text-foreground">{report.insights}</p>
      </Card>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <Card className="p-4 text-center">
          <FileText className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-2xl font-bold">{report.stats.totalPosts}</p>
          <p className="text-xs text-muted-foreground">총 포스트</p>
        </Card>
        <Card className="p-4 text-center">
          <Target className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-2xl font-bold">{report.stats.totalStockMentions}</p>
          <p className="text-xs text-muted-foreground">종목 언급</p>
        </Card>
        <Card className="p-4 text-center">
          <BarChart3 className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-2xl font-bold">{report.stats.categories}</p>
          <p className="text-xs text-muted-foreground">카테고리</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-2xl font-bold">{report.stats.stockTrends}</p>
          <p className="text-xs text-muted-foreground">종목 트렌드</p>
        </Card>
        <Card className="p-4 text-center">
          <Brain className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-2xl font-bold">{report.stats.aiInsights}</p>
          <p className="text-xs text-muted-foreground">AI 인사이트</p>
        </Card>
        <Card className="p-4 text-center">
          <Users className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-2xl font-bold">{report.stats.analyzedPosts}</p>
          <p className="text-xs text-muted-foreground">분석 완료</p>
        </Card>
      </div>

      {/* 탭 메뉴 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="posts">포스트 분석</TabsTrigger>
          <TabsTrigger value="categories">카테고리</TabsTrigger>
          <TabsTrigger value="stocks">종목 트렌드</TabsTrigger>
          <TabsTrigger value="insights">AI 인사이트</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* 세계 지정학적 이벤트 지도 */}
          <WorldMap className="mb-6" />

          {/* 경제 지표 차트 */}
          <EconomicChart className="mb-6" />

          {/* 주요 지표 */}
          {report.metrics.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">📊 주요 지표</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {report.metrics.map((metric, index) => (
                  <div key={index} className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      {metric.name}
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {metric.value != null ? metric.value.toLocaleString() : '정보 없음'} {metric.unit || ''}
                    </p>
                    {metric.changePercent != null && !isNaN(metric.changePercent) && (
                      <p className={`text-xs ${metric.changePercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {metric.changePercent > 0 ? '↗' : '↘'} {Math.abs(metric.changePercent).toFixed(1)}%
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {metric.interpretation}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 카테고리 요약 */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">🗂️ 카테고리별 요약</h3>
            <div className="space-y-3">
              {report.categoryAnalyses.map((category) => (
                <div key={category.category} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{category.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {category.postCount}개 포스트 · 평균 감정: {formatPercentage(category.avgSentimentScore)}
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {category.postCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="mt-6">
          <div className="space-y-4">
            {report.postAnalyses.map((post) => (
              <Card key={post.id} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-foreground flex-1">
                    {post.postTitle}
                  </h4>
                  <Badge className="ml-2 bg-blue-100 text-blue-800">
                    {post.category}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                  <span>{formatDate(post.postDate)}</span>
                  <span className={`flex items-center ${getSentimentColor(post.sentimentScore)}`}>
                    {getSentimentIcon(post.sentimentScore)}
                    <span className="ml-1">
                      감정: {formatPercentage(post.sentimentScore)}
                    </span>
                  </span>
                  <span>
                    시장 영향도: {formatPercentage(post.marketImpactScore)}
                  </span>
                </div>
                
                {post.keyThemes.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-1">주요 테마:</p>
                    <div className="flex flex-wrap gap-1">
                      {post.keyThemes.map((theme, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground">
                  {post.insights}
                </p>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {report.categoryAnalyses.map((category) => (
              <Card key={category.category} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{category.category}</h3>
                  <Badge className="bg-primary/10 text-primary">
                    {category.postCount}개 포스트
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">평균 감정 점수</span>
                    <span className={`font-medium ${getSentimentColor(category.avgSentimentScore)}`}>
                      {formatPercentage(category.avgSentimentScore)}
                    </span>
                  </div>
                  
                  {category.topKeywords.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">주요 키워드</p>
                      <div className="flex flex-wrap gap-1">
                        {category.topKeywords.map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium mb-1">핵심 인사이트</p>
                    <p className="text-sm text-muted-foreground">
                      {category.keyInsights}
                    </p>
                  </div>
                  
                  {category.trendAnalysis && (
                    <div>
                      <p className="text-sm font-medium mb-1">트렌드 분석</p>
                      <p className="text-sm text-muted-foreground">
                        {category.trendAnalysis}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stocks" className="mt-6">
          <div className="space-y-4">
            {report.stockTrends.map((stock, index) => (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center">
                      {stock.ticker}
                      {stock.companyName && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          {stock.companyName}
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getTrendCategoryColor(stock.trendCategory)}>
                      {stock.trendCategory}
                    </Badge>
                    <Badge variant="outline">
                      {stock.mentionCount}회 언급
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">언급 횟수</p>
                    <p className="text-lg font-bold text-primary">
                      {stock.mentionCount}회
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">평균 감정</p>
                    <p className={`text-lg font-bold ${getSentimentColor(stock.avgSentimentScore)}`}>
                      {formatPercentage(stock.avgSentimentScore)}
                    </p>
                  </div>
                  {stock.priceChangePercent !== undefined && stock.priceChangePercent !== null && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">주가 변동</p>
                      <p className={`text-lg font-bold ${(stock.priceChangePercent ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPriceChange(stock.priceChangePercent)}
                      </p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">트렌드</p>
                    <p className="text-lg font-bold text-foreground">
                      {stock.trendCategory}
                    </p>
                  </div>
                </div>
                
                {stock.keyEvents && (
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-1">주요 이벤트</p>
                    <p className="text-sm text-muted-foreground">
                      {stock.keyEvents}
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium mb-1">애널리스트 노트</p>
                  <p className="text-sm text-muted-foreground">
                    {stock.analystNote}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <div className="space-y-4">
            {report.aiInsights
              .sort((a, b) => b.priority - a.priority)
              .map((insight) => (
                <Card key={insight.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {getPriorityIcon(insight.priority)}
                      <h3 className="text-lg font-semibold">{insight.title}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-purple-100 text-purple-800">
                        {getInsightTypeLabel(insight.type)}
                      </Badge>
                      <Badge variant="outline">
                        신뢰도: {formatPercentage(insight.confidence, 0)}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-4">
                    {insight.content}
                  </p>
                  
                  {insight.supportingPosts.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">지원 근거</p>
                      <p className="text-sm text-muted-foreground">
                        {insight.supportingPosts.length}개의 포스트가 이 인사이트를 뒷받침합니다.
                      </p>
                    </div>
                  )}
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}