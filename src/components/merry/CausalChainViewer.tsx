'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  Target, 
  ArrowRight,
  ArrowDown,
  Globe,
  Factory,
  DollarSign,
  Activity,
  Brain,
  Zap,
  RefreshCw
} from 'lucide-react';

// 타입 정의 (lib에서 가져와야 하지만 임시로 여기에 정의)
interface CausalStep {
  id?: number;
  chain_id?: number;
  step_order: number;
  step_type: 'trigger' | 'intermediate' | 'outcome';
  step_description: string;
  affected_entity: string;
  entity_type: 'country' | 'company' | 'sector' | 'commodity' | 'currency';
  impact_direction: 'positive' | 'negative' | 'neutral';
  confidence_score: number;
}

interface StockCorrelation {
  id?: number;
  chain_id?: number;
  ticker: string;
  company_name: string;
  correlation_type: 'direct' | 'supplier' | 'competitor' | 'sector';
  expected_impact: 'strong_positive' | 'positive' | 'neutral' | 'negative' | 'strong_negative';
  impact_probability: number;
  reasoning: string;
}

interface CausalChain {
  id?: number;
  chain_title: string;
  chain_description: string;
  source_post_id: number;
  confidence_score: number;
  prediction_horizon: '1w' | '1m' | '3m' | '6m' | '1y';
  investment_thesis: string;
  steps: CausalStep[];
  correlations: StockCorrelation[];
  created_at?: string;
}

interface CausalChainViewerProps {
  postId?: number;
  className?: string;
}

// 아이콘 매핑
const getStepTypeIcon = (stepType: string) => {
  switch (stepType) {
    case 'trigger': return <Zap className="h-4 w-4" />;
    case 'intermediate': return <ArrowRight className="h-4 w-4" />;
    case 'outcome': return <Target className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
};

const getEntityTypeIcon = (entityType: string) => {
  switch (entityType) {
    case 'country': return <Globe className="h-4 w-4" />;
    case 'company': return <Factory className="h-4 w-4" />;
    case 'sector': return <Activity className="h-4 w-4" />;
    case 'commodity': return <DollarSign className="h-4 w-4" />;
    case 'currency': return <DollarSign className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
};

const getImpactIcon = (direction: string) => {
  switch (direction) {
    case 'positive': return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'negative': return <TrendingDown className="h-4 w-4 text-red-500" />;
    case 'neutral': return <Activity className="h-4 w-4 text-gray-500" />;
    default: return <Activity className="h-4 w-4 text-gray-500" />;
  }
};

// 신뢰도 색상 매핑
const getConfidenceColor = (score: number) => {
  if (score >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
  if (score >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (score >= 0.4) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
};

// 예측 기간 표시
const getPredictionHorizonText = (horizon: string) => {
  const mapping: Record<string, string> = {
    '1w': '1주',
    '1m': '1개월', 
    '3m': '3개월',
    '6m': '6개월',
    '1y': '1년'
  };
  return mapping[horizon] || horizon;
};

// 임팩트 색상 매핑
const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'strong_positive': return 'bg-green-100 text-green-800 border-green-200';
    case 'positive': return 'bg-green-50 text-green-700 border-green-100';
    case 'neutral': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'negative': return 'bg-red-50 text-red-700 border-red-100';
    case 'strong_negative': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getImpactText = (impact: string) => {
  const mapping: Record<string, string> = {
    'strong_positive': '강한 긍정',
    'positive': '긍정',
    'neutral': '중립',
    'negative': '부정',
    'strong_negative': '강한 부정'
  };
  return mapping[impact] || impact;
};

export default function CausalChainViewer({ postId, className }: CausalChainViewerProps) {
  const [chains, setChains] = useState<CausalChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedChain, setSelectedChain] = useState<CausalChain | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 논리체인 로드
  const loadChains = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = postId 
        ? `/api/merry/analysis?postId=${postId}&limit=10`
        : '/api/merry/analysis?limit=20';
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setChains(data.data.chains || []);
        if (data.data.chains.length > 0 && !selectedChain) {
          setSelectedChain(data.data.chains[0]);
        }
      } else {
        setError(data.error || '논리체인을 불러올 수 없습니다.');
      }

    } catch (err) {
      console.error('논리체인 로드 실패:', err);
      setError('논리체인을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 새 분석 실행
  const runAnalysis = async () => {
    if (!postId) return;

    try {
      setAnalyzing(true);
      setError(null);

      const response = await fetch('/api/merry/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          postId, 
          forceReAnalysis: true 
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.chainFound) {
          // 새로운 논리체인이 생성됨
          await loadChains(); // 다시 로드
        } else {
          setError('이 포스트에서 의미있는 논리체인을 찾을 수 없습니다.');
        }
      } else {
        setError(data.error || '분석에 실패했습니다.');
      }

    } catch (err) {
      console.error('분석 실행 실패:', err);
      setError('분석을 실행하는 중 오류가 발생했습니다.');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    loadChains();
  }, [postId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>논리체인을 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 mb-4">{error}</p>
            {postId && (
              <Button onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    새로 분석하기
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chains.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="text-center">
            <Brain className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">
              {postId ? '이 포스트에서 논리체인을 찾지 못했습니다.' : '분석된 논리체인이 없습니다.'}
            </p>
            {postId && (
              <Button onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    분석 시작
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold">메르의 논리체인 분석</h2>
          <Badge variant="secondary">{chains.length}개 분석</Badge>
        </div>
        
        {postId && (
          <Button onClick={runAnalysis} disabled={analyzing} variant="outline" size="sm">
            {analyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                재분석 중...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                재분석
              </>
            )}
          </Button>
        )}
      </div>

      {/* 체인 선택 탭 (여러 개인 경우) */}
      {chains.length > 1 && (
        <div className="mb-6">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {chains.map((chain, index) => (
              <Button
                key={chain.id || index}
                variant={selectedChain?.id === chain.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedChain(chain)}
                className="whitespace-nowrap"
              >
                분석 #{index + 1}
                <Badge variant="secondary" className="ml-2">
                  {Math.round(chain.confidence_score * 100)}%
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 선택된 체인 표시 */}
      {selectedChain && (
        <Tabs defaultValue="flow" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="flow">논리 흐름</TabsTrigger>
            <TabsTrigger value="stocks">연관 종목</TabsTrigger>
            <TabsTrigger value="summary">분석 요약</TabsTrigger>
            <TabsTrigger value="details">상세 정보</TabsTrigger>
          </TabsList>

          {/* 논리 흐름 탭 */}
          <TabsContent value="flow" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowRight className="h-5 w-5" />
                  <span>논리 연결고리</span>
                  <Badge className={getConfidenceColor(selectedChain.confidence_score)}>
                    신뢰도 {Math.round(selectedChain.confidence_score * 100)}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedChain.steps.map((step, index) => (
                    <div key={step.id || index} className="flex items-start space-x-4">
                      {/* 단계 번호 */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                        {step.step_order}
                      </div>

                      {/* 단계 카드 */}
                      <div className="flex-1">
                        <Card className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {getStepTypeIcon(step.step_type)}
                                <Badge variant="outline" className="capitalize">
                                  {step.step_type}
                                </Badge>
                                {getEntityTypeIcon(step.entity_type)}
                                <Badge variant="secondary" className="text-xs">
                                  {step.affected_entity}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-2">
                                {getImpactIcon(step.impact_direction)}
                                <Badge className={getConfidenceColor(step.confidence_score)} variant="outline">
                                  {Math.round(step.confidence_score * 100)}%
                                </Badge>
                              </div>
                            </div>
                            <p className="text-gray-700 leading-relaxed">
                              {step.step_description}
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* 화살표 (마지막 단계가 아닌 경우) */}
                      {index < selectedChain.steps.length - 1 && (
                        <div className="flex-shrink-0 pt-4">
                          <ArrowDown className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 연관 종목 탭 */}
          <TabsContent value="stocks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>투자 기회 분석</span>
                  <Badge variant="secondary">
                    {selectedChain.correlations.length}개 종목
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedChain.correlations.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedChain.correlations.map((correlation, index) => (
                      <Card key={correlation.id || index} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-semibold">{correlation.ticker}</span>
                              <Badge variant="outline" className="text-xs">
                                {correlation.correlation_type}
                              </Badge>
                            </div>
                            <Badge className={getImpactColor(correlation.expected_impact)}>
                              {getImpactText(correlation.expected_impact)}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {correlation.company_name}
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            {correlation.reasoning}
                          </p>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>확률: {Math.round(correlation.impact_probability * 100)}%</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>연관 종목이 발견되지 않았습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 분석 요약 탭 */}
          <TabsContent value="summary" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* 핵심 메트릭 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">분석 메트릭</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">전체 신뢰도</span>
                    <Badge className={getConfidenceColor(selectedChain.confidence_score)}>
                      {Math.round(selectedChain.confidence_score * 100)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">예측 기간</span>
                    <Badge variant="outline" className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{getPredictionHorizonText(selectedChain.prediction_horizon)}</span>
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">논리 단계</span>
                    <Badge variant="secondary">
                      {selectedChain.steps.length}단계
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">연관 종목</span>
                    <Badge variant="secondary">
                      {selectedChain.correlations.length}개
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 투자 논제 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>투자 논제</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedChain.investment_thesis}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 상세 정보 탭 */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>상세 분석 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">분석 제목</h4>
                  <p className="text-gray-700">{selectedChain.chain_title}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">논리체인 요약</h4>
                  <p className="text-gray-700 leading-relaxed">{selectedChain.chain_description}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">원본 포스트</h4>
                  <Badge variant="outline">
                    Post ID: {selectedChain.source_post_id}
                  </Badge>
                </div>

                {selectedChain.created_at && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">분석 일시</h4>
                    <p className="text-gray-700">
                      {new Date(selectedChain.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}