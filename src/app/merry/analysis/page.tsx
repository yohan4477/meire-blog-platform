'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, AlertTriangle, Clock, Target, ArrowRight, ChevronDown, ChevronUp, FileText, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
// import CausalChainVisualization from '@/components/merry/CausalChainVisualization';
import { useRouter } from 'next/navigation';

interface CausalChain {
  id: number;
  chain_title: string;
  chain_description: string;
  confidence_score: number;
  prediction_horizon: '1w' | '1m' | '3m' | '6m' | '1y';
  investment_thesis: string;
  created_at: string;
  source_post_id: number;
}

interface AnalysisData {
  chains: CausalChain[];
  total: number;
  message: string;
}

export default function MerryAnalysisPage() {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedChain, setExpandedChain] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'summary' | 'detailed'>('summary');
  const router = useRouter();

  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/merry/analysis?limit=20');
        const result = await response.json();
        
        if (result.success) {
          setAnalysisData(result.data);
        } else {
          setError(result.error || '데이터를 불러올 수 없습니다.');
        }
      } catch (error) {
        console.error('분석 데이터 로딩 실패:', error);
        setError('서버 연결에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisData();
  }, []);

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getHorizonIcon = (horizon: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      '1w': <Clock className="h-4 w-4" />,
      '1m': <Clock className="h-4 w-4" />,
      '3m': <TrendingUp className="h-4 w-4" />,
      '6m': <Target className="h-4 w-4" />,
      '1y': <Target className="h-4 w-4" />
    };
    return iconMap[horizon] || <Clock className="h-4 w-4" />;
  };

  const handleViewPost = (postId: number) => {
    router.push(`/merry/${postId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-6xl">
          <Card className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">데이터 로딩 실패</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              다시 시도
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-3 mb-4">
            <Brain className="h-8 w-8" />
            <h1 className="text-3xl font-bold">메르 AI 분석 대시보드</h1>
          </div>
          <p className="text-purple-100 max-w-2xl">
            메르의 블로그 글에서 추출된 논리체인과 투자 인사이트를 AI가 실시간으로 분석합니다.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">분석된 논리체인</p>
                <p className="text-2xl font-bold">{analysisData?.total || 0}개</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">평균 신뢰도</p>
                <p className="text-2xl font-bold">
                  {analysisData?.chains.length 
                    ? Math.round((analysisData.chains.reduce((acc, chain) => acc + chain.confidence_score, 0) / analysisData.chains.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">활성 예측</p>
                <p className="text-2xl font-bold">
                  {analysisData?.chains.filter(chain => 
                    new Date(chain.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                  ).length || 0}개
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Analysis Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">논리체인 분석 결과</h2>
            <div className="flex items-center space-x-2">
              <Button
                variant={selectedView === 'summary' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedView('summary')}
              >
                요약 보기
              </Button>
              <Button
                variant={selectedView === 'detailed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedView('detailed')}
              >
                상세 시각화
              </Button>
              <Badge variant="secondary">{analysisData?.message}</Badge>
            </div>
          </div>

          {analysisData?.chains.length === 0 ? (
            <Card className="p-8 text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">분석 결과가 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                아직 분석된 논리체인이 없습니다. 메르의 새로운 블로그 포스트가 업로드되면 자동으로 분석됩니다.
              </p>
              <Button asChild>
                <a href="/api/merry/analysis" target="_blank">
                  새로운 분석 실행
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {selectedView === 'summary' ? (
                // 기존 요약 카드 형태
                analysisData?.chains.map((chain) => (
                  <Card key={chain.id} className="overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{chain.chain_title}</h3>
                          <p className="text-muted-foreground text-sm mb-3">
                            {chain.chain_description}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Badge className={getConfidenceColor(chain.confidence_score)}>
                            신뢰도 {Math.round(chain.confidence_score * 100)}%
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            {getHorizonIcon(chain.prediction_horizon)}
                            <span>{chain.prediction_horizon}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            포스트 #{chain.source_post_id}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(chain.created_at).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPost(chain.source_post_id)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            원문 보기
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedChain(expandedChain === chain.id ? null : chain.id)}
                          >
                            {expandedChain === chain.id ? (
                              <>
                                접기 <ChevronUp className="ml-1 h-4 w-4" />
                              </>
                            ) : (
                              <>
                                자세히 <ChevronDown className="ml-1 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {expandedChain === chain.id && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-medium mb-2">💡 투자 논제</h4>
                          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                            {chain.investment_thesis}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                // 새로운 상세 시각화 형태 - 임시 비활성화
                analysisData?.chains.map((chain) => (
                  <Card key={chain.id} className="p-6">
                    <h3 className="text-lg font-semibold mb-2">{chain.chain_title}</h3>
                    <p className="text-muted-foreground">시각화 컴포넌트 재구축 예정</p>
                  </Card>
                  // <CausalChainVisualization
                  //   key={chain.id}
                  //   chain={{...chain, steps: [], correlations: []}}
                  //   onViewPost={handleViewPost}
                  // />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}