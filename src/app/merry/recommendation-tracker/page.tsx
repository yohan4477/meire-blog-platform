'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Brain, 
  BarChart3, 
  Calendar,
  Zap,
  Award,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface Prediction {
  postId: number;
  title: string;
  created_date: string;
  probability: {
    total: number;
    level: string;
    breakdown: {
      sources: number;
      logic: number;
      stocks: number;
      timeFlow: number;
      keywords: number;
    };
  };
  analysis: {
    sources: string[];
    stockMentions: string[];
    logicElements: string[];
  };
  recommendation: {
    isLikelyRecommendation: boolean;
    confidence: string;
    reasoning: string;
  };
}

interface Pattern {
  sourcePatterns: Record<string, any>;
  logicFlowPattern: any;
  keywordPatterns: any;
  stockPatterns: Record<string, any>;
}

export default function RecommendationTrackerPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [patterns, setPatterns] = useState<Pattern | null>(null);
  const [highProbPosts, setHighProbPosts] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('predictions');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadRecentPredictions(),
        loadLearnedPatterns(),
        loadHighProbabilityPosts()
      ]);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    }
    setLoading(false);
  };

  const loadRecentPredictions = async () => {
    try {
      const response = await fetch('/api/merry/recommendation-predict?action=recent&limit=10');
      const data = await response.json();
      
      if (data.success) {
        setPredictions(data.data.predictions);
      }
    } catch (error) {
      console.error('예측 데이터 로딩 실패:', error);
    }
  };

  const loadLearnedPatterns = async () => {
    try {
      const response = await fetch('/api/merry/pattern-learning?action=patterns');
      const data = await response.json();
      
      if (data.success) {
        setPatterns(data.data.patterns);
      }
    } catch (error) {
      console.error('패턴 데이터 로딩 실패:', error);
    }
  };

  const loadHighProbabilityPosts = async () => {
    try {
      const response = await fetch('/api/merry/recommendation-predict?action=high-probability');
      const data = await response.json();
      
      if (data.success) {
        setHighProbPosts(data.data.highProbabilityPosts);
      }
    } catch (error) {
      console.error('고확률 포스트 로딩 실패:', error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const getProbabilityColor = (level: string) => {
    switch (level) {
      case '매우 높음': return 'bg-green-500';
      case '높음': return 'bg-blue-500';
      case '보통': return 'bg-yellow-500';
      case '낮음': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>메르 추천 패턴 분석 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-purple-600" />
            메르 추천 패턴 추적기
          </h1>
          <p className="text-muted-foreground mt-2">
            AI가 학습한 메르의 추천 패턴으로 새로운 포스트의 추천 가능성을 예측합니다
          </p>
        </div>
        <Button 
          onClick={refreshData} 
          disabled={refreshing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 요약 통계 */}
      {predictions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">분석된 포스트</p>
                  <p className="text-2xl font-bold">{predictions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">고확률 추천</p>
                  <p className="text-2xl font-bold">
                    {predictions.filter(p => p.probability.total >= 60).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">평균 확률</p>
                  <p className="text-2xl font-bold">
                    {Math.round(predictions.reduce((sum, p) => sum + p.probability.total, 0) / predictions.length)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">최고 확률</p>
                  <p className="text-2xl font-bold">
                    {Math.max(...predictions.map(p => p.probability.total))}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="predictions">최신 예측</TabsTrigger>
          <TabsTrigger value="high-probability">고확률 포스트</TabsTrigger>
          <TabsTrigger value="patterns">학습된 패턴</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                최근 포스트 추천 가능성 분석
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.map((prediction, index) => (
                  <div key={prediction.postId} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Link 
                          href={`/merry/${prediction.postId}`}
                          className="text-lg font-semibold hover:text-primary transition-colors"
                        >
                          {prediction.title}
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(prediction.created_date).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={`${getProbabilityColor(prediction.probability.level)} text-white`}
                        >
                          {prediction.probability.total}%
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={getConfidenceColor(prediction.recommendation.confidence)}
                        >
                          {prediction.recommendation.confidence}
                        </Badge>
                      </div>
                    </div>

                    {/* 확률 상세 분석 */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">출처</p>
                        <p className="font-semibold">{prediction.probability.breakdown.sources}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">논리</p>
                        <p className="font-semibold">{prediction.probability.breakdown.logic}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">종목</p>
                        <p className="font-semibold">{prediction.probability.breakdown.stocks}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">시간</p>
                        <p className="font-semibold">{prediction.probability.breakdown.timeFlow}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">키워드</p>
                        <p className="font-semibold">{prediction.probability.breakdown.keywords}</p>
                      </div>
                    </div>

                    <Progress 
                      value={prediction.probability.total} 
                      className="mb-3 h-2"
                    />

                    {/* 분석 요소 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium mb-1">출처 패턴</p>
                        <p className="text-muted-foreground">
                          {prediction.analysis.sources.join(', ') || '없음'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium mb-1">종목 언급</p>
                        <p className="text-muted-foreground">
                          {prediction.analysis.stockMentions.join(', ') || '없음'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium mb-1">논리 요소</p>
                        <p className="text-muted-foreground">
                          {prediction.analysis.logicElements.join(', ') || '없음'}
                        </p>
                      </div>
                    </div>

                    {prediction.recommendation.isLikelyRecommendation && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-green-600" />
                          <p className="text-sm font-medium text-green-800">
                            추천 가능성 높음
                          </p>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          {prediction.recommendation.reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="high-probability" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                고확률 추천 포스트 (60% 이상)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {highProbPosts.length > 0 ? (
                <div className="space-y-4">
                  {highProbPosts.map((post, index) => (
                    <div key={post.postId} className="border rounded-lg p-4 bg-green-50">
                      <div className="flex items-start justify-between mb-2">
                        <Link 
                          href={`/merry/${post.postId}`}
                          className="text-lg font-semibold hover:text-primary transition-colors flex-1"
                        >
                          {post.title}
                        </Link>
                        <Badge className="bg-green-500 text-white">
                          {post.probability.total}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {new Date(post.created_date).toLocaleDateString('ko-KR')}
                      </p>
                      <p className="text-sm text-green-700">
                        {post.recommendation.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    최근 30일간 고확률 추천 포스트가 없습니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6 mt-6">
          {patterns && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 출처 패턴 */}
              <Card>
                <CardHeader>
                  <CardTitle>학습된 출처 패턴</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(patterns.sourcePatterns).map(([source, data]) => (
                      <div key={source} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{source}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">빈도: {data.frequency}/10</p>
                          <p className="text-sm">신뢰도: {data.credibility}/10</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 논리 흐름 패턴 */}
              <Card>
                <CardHeader>
                  <CardTitle>논리 흐름 패턴</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                        1
                      </div>
                      <p className="font-medium">{patterns.logicFlowPattern.step1}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                        2
                      </div>
                      <p className="font-medium">{patterns.logicFlowPattern.step2}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                        3
                      </div>
                      <p className="font-medium">{patterns.logicFlowPattern.step3}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                        4
                      </div>
                      <p className="font-medium">{patterns.logicFlowPattern.step4}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      {patterns.logicFlowPattern.description}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 키워드 패턴 */}
              <Card>
                <CardHeader>
                  <CardTitle>키워드 패턴</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-green-600 mb-2">고확신 키워드</p>
                      <div className="flex flex-wrap gap-1">
                        {patterns.keywordPatterns.high_confidence.map((keyword: string) => (
                          <Badge key={keyword} className="bg-green-100 text-green-800">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-blue-600 mb-2">중확신 키워드</p>
                      <div className="flex flex-wrap gap-1">
                        {patterns.keywordPatterns.medium_confidence.map((keyword: string) => (
                          <Badge key={keyword} className="bg-blue-100 text-blue-800">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-purple-600 mb-2">시간 표현</p>
                      <div className="flex flex-wrap gap-1">
                        {patterns.keywordPatterns.time_indicators.map((keyword: string) => (
                          <Badge key={keyword} className="bg-purple-100 text-purple-800">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 종목 패턴 */}
              <Card>
                <CardHeader>
                  <CardTitle>종목 언급 패턴</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(patterns.stockPatterns).map(([ticker, data]) => (
                      <div key={ticker} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{ticker}</p>
                          {data.avgPrice && (
                            <p className="text-sm text-muted-foreground">
                              평균 언급가: {data.avgPrice}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm">빈도: {data.frequency}/10</p>
                          <p className="text-sm">확신도: {data.confidence}/10</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}