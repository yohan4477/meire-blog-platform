'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Zap, 
  Target, 
  TrendingUp, 
  Clock, 
  DollarSign,
  BarChart3,
  Settings,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Lightbulb,
  Cpu,
  Database
} from 'lucide-react';

interface ComparisonResult {
  approaches: {
    ruleBased: {
      score: number;
      confidence: string;
      executionTime: number;
      strengths: string[];
      weaknesses: string[];
    };
    hybrid: {
      ruleBasedScore: number;
      semanticSimilarity: number;
      contextualRelevance: number;
      hybridScore: number;
      confidence: string;
      reasoning: string[];
      improvements: string[];
      strengths: string[];
      weaknesses: string[];
    };
  };
  comparison: {
    scoreDifference: number;
    confidenceImprovement: boolean;
    hybridAdvantages: string[];
    ruleAdvantages: string[];
    overallAssessment: string;
  };
  recommendation: {
    primary: string;
    reasoning: string;
    nextSteps: string[];
  };
}

interface BenchmarkData {
  approaches: Record<string, {
    accuracy: string;
    speed: string;
    cost: string;
    maintainability: string;
    scalability: string;
  }>;
  tradeoffAnalysis: {
    quickWin: string;
    longTerm: string;
    enterprise: string;
  };
  implementationRoadmap: {
    phase1: string;
    phase2: string;
    phase3: string;
  };
}

export default function HybridComparisonPage() {
  const [comparisonData, setComparisonData] = useState<ComparisonResult | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('comparison');
  const [selectedPostId, setSelectedPostId] = useState<number>(508); // 예시 포스트 ID

  useEffect(() => {
    loadComparisonData();
    loadBenchmarkData();
  }, []);

  const loadComparisonData = async () => {
    try {
      const response = await fetch(`/api/merry/hybrid-analysis?action=compare&postId=${selectedPostId}`);
      const data = await response.json();
      
      if (data.success) {
        setComparisonData(data.data);
      }
    } catch (error) {
      console.error('비교 데이터 로딩 실패:', error);
    }
  };

  const loadBenchmarkData = async () => {
    try {
      const response = await fetch('/api/merry/hybrid-analysis?action=benchmark');
      const data = await response.json();
      
      if (data.success) {
        setBenchmarkData(data.data);
      }
    } catch (error) {
      console.error('벤치마크 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const runComparison = async () => {
    setLoading(true);
    await loadComparisonData();
    setLoading(false);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getScoreDifferenceColor = (diff: number) => {
    if (diff > 10) return 'text-green-600';
    if (diff < -5) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>AI 접근법 비교 분석 중...</p>
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
            AI 접근법 비교 분석
          </h1>
          <p className="text-muted-foreground mt-2">
            룰 기반 vs 하이브리드 vs AI 사후 훈련 vs RAG 시스템 성능 비교
          </p>
        </div>
        <Button onClick={runComparison} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          분석 실행
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="comparison">실시간 비교</TabsTrigger>
          <TabsTrigger value="benchmark">성능 벤치마크</TabsTrigger>
          <TabsTrigger value="roadmap">구현 로드맵</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-6 mt-6">
          {comparisonData && (
            <>
              {/* 요약 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">룰 기반 점수</p>
                        <p className="text-2xl font-bold">{comparisonData.approaches.ruleBased.score}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">하이브리드 점수</p>
                        <p className="text-2xl font-bold">{Math.round(comparisonData.approaches.hybrid.hybridScore)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`w-5 h-5 ${getScoreDifferenceColor(comparisonData.comparison.scoreDifference)}`} />
                      <div>
                        <p className="text-sm text-muted-foreground">점수 차이</p>
                        <p className={`text-2xl font-bold ${getScoreDifferenceColor(comparisonData.comparison.scoreDifference)}`}>
                          {comparisonData.comparison.scoreDifference > 0 ? '+' : ''}{Math.round(comparisonData.comparison.scoreDifference)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">실행 시간</p>
                        <p className="text-2xl font-bold">{comparisonData.approaches.ruleBased.executionTime}ms</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 상세 비교 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 룰 기반 시스템 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      룰 기반 시스템 (현재)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>점수</span>
                      <div className="flex items-center gap-2">
                        <Progress value={comparisonData.approaches.ruleBased.score} className="w-20" />
                        <span className="font-bold">{comparisonData.approaches.ruleBased.score}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span>신뢰도</span>
                      <Badge className={getConfidenceColor(comparisonData.approaches.ruleBased.confidence)}>
                        {comparisonData.approaches.ruleBased.confidence}
                      </Badge>
                    </div>

                    <div>
                      <p className="font-medium text-green-600 mb-2">장점</p>
                      <ul className="text-sm space-y-1">
                        {comparisonData.approaches.ruleBased.strengths.map((strength, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="font-medium text-orange-600 mb-2">한계</p>
                      <ul className="text-sm space-y-1">
                        {comparisonData.approaches.ruleBased.weaknesses.map((weakness, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* 하이브리드 시스템 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      하이브리드 시스템 (제안)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">룰 기반</span>
                        <div className="flex items-center gap-2">
                          <Progress value={comparisonData.approaches.hybrid.ruleBasedScore} className="w-16" />
                          <span className="text-sm font-bold">{Math.round(comparisonData.approaches.hybrid.ruleBasedScore)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">의미적 유사도</span>
                        <div className="flex items-center gap-2">
                          <Progress value={comparisonData.approaches.hybrid.semanticSimilarity * 100} className="w-16" />
                          <span className="text-sm font-bold">{Math.round(comparisonData.approaches.hybrid.semanticSimilarity * 100)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">컨텍스트 관련성</span>
                        <div className="flex items-center gap-2">
                          <Progress value={comparisonData.approaches.hybrid.contextualRelevance * 100} className="w-16" />
                          <span className="text-sm font-bold">{Math.round(comparisonData.approaches.hybrid.contextualRelevance * 100)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="font-medium">최종 점수</span>
                        <div className="flex items-center gap-2">
                          <Progress value={comparisonData.approaches.hybrid.hybridScore} className="w-20" />
                          <span className="font-bold text-lg">{Math.round(comparisonData.approaches.hybrid.hybridScore)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span>신뢰도</span>
                      <Badge className={getConfidenceColor(comparisonData.approaches.hybrid.confidence)}>
                        {comparisonData.approaches.hybrid.confidence}
                      </Badge>
                    </div>

                    <div>
                      <p className="font-medium text-blue-600 mb-2">분석 근거</p>
                      <ul className="text-sm space-y-1">
                        {comparisonData.approaches.hybrid.reasoning.map((reason, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-blue-500" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {comparisonData.approaches.hybrid.improvements.length > 0 && (
                      <div>
                        <p className="font-medium text-purple-600 mb-2">개선 제안</p>
                        <ul className="text-sm space-y-1">
                          {comparisonData.approaches.hybrid.improvements.map((improvement, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-purple-500" />
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 추천 사항 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-600" />
                    추천 사항
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{comparisonData.recommendation.primary}</h3>
                      <p className="text-muted-foreground">{comparisonData.recommendation.reasoning}</p>
                    </div>
                    
                    <div>
                      <p className="font-medium mb-2">다음 단계</p>
                      <ul className="space-y-1">
                        {comparisonData.recommendation.nextSteps.map((step, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="benchmark" className="space-y-6 mt-6">
          {benchmarkData && (
            <>
              {/* 접근법 비교 테이블 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    AI 접근법 성능 벤치마크
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">접근법</th>
                          <th className="text-left p-3 font-medium">정확도</th>
                          <th className="text-left p-3 font-medium">속도</th>
                          <th className="text-left p-3 font-medium">비용</th>
                          <th className="text-left p-3 font-medium">유지보수</th>
                          <th className="text-left p-3 font-medium">확장성</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(benchmarkData.approaches).map(([name, metrics]) => (
                          <tr key={name} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">
                              {name === 'ruleBased' && '룰 기반 (현재)'}
                              {name === 'hybridProposed' && '하이브리드 (제안)'}
                              {name === 'fullAITraining' && 'AI 사후 훈련'}
                              {name === 'ragSystem' && 'RAG 시스템'}
                            </td>
                            <td className="p-3">{metrics.accuracy}</td>
                            <td className="p-3">{metrics.speed}</td>
                            <td className="p-3">
                              <Badge variant={
                                metrics.cost === '매우 낮음' ? 'default' :
                                metrics.cost === '낮음' ? 'secondary' :
                                metrics.cost === '보통' ? 'outline' : 'destructive'
                              }>
                                {metrics.cost}
                              </Badge>
                            </td>
                            <td className="p-3">{metrics.maintainability}</td>
                            <td className="p-3">{metrics.scalability}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* 트레이드오프 분석 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Zap className="w-5 h-5 text-yellow-600" />
                      빠른 개선
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{benchmarkData.tradeoffAnalysis.quickWin}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="w-5 h-5 text-blue-600" />
                      장기 전략
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{benchmarkData.tradeoffAnalysis.longTerm}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Cpu className="w-5 h-5 text-purple-600" />
                      엔터프라이즈
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{benchmarkData.tradeoffAnalysis.enterprise}</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-6 mt-6">
          {benchmarkData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-green-600" />
                  구현 로드맵
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Phase 1: 하이브리드 시스템 구축</h3>
                      <p className="text-muted-foreground">{benchmarkData.implementationRoadmap.phase1}</p>
                      <div className="mt-2">
                        <Badge variant="secondary">1-2개월</Badge>
                        <Badge variant="outline" className="ml-2">중간 위험도</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Phase 2: RAG 시스템 도입</h3>
                      <p className="text-muted-foreground">{benchmarkData.implementationRoadmap.phase2}</p>
                      <div className="mt-2">
                        <Badge variant="secondary">3-4개월</Badge>
                        <Badge variant="outline" className="ml-2">높은 위험도</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Phase 3: 전용 AI 모델 검토</h3>
                      <p className="text-muted-foreground">{benchmarkData.implementationRoadmap.phase3}</p>
                      <div className="mt-2">
                        <Badge variant="secondary">6개월+</Badge>
                        <Badge variant="destructive" className="ml-2">매우 높은 위험도</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}