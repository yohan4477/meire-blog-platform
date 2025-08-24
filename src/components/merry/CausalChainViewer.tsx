'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Brain, TrendingUp, TrendingDown } from 'lucide-react';

interface CausalLink {
  id: string;
  from: string;
  to: string;
  relationship: string;
  strength: 'weak' | 'medium' | 'strong';
  type: 'positive' | 'negative' | 'neutral';
}

interface CausalNode {
  id: string;
  title: string;
  description: string;
  type: 'event' | 'factor' | 'outcome';
  impact: 'positive' | 'negative' | 'neutral';
}

interface CausalChainViewerProps {
  logNo?: string;
  nodes?: CausalNode[];
  links?: CausalLink[];
  className?: string;
}

export default function CausalChainViewer({ 
  logNo,
  nodes = [],
  links = [],
  className = '' 
}: CausalChainViewerProps) {
  // 더미 데이터 (실제 구현시에는 API에서 가져올 데이터)
  const defaultNodes: CausalNode[] = [
    {
      id: 'event1',
      title: '원자력 발전소 재가동',
      description: '후쿠시마 이후 중단된 원자력 발전소들이 점진적으로 재가동되고 있음',
      type: 'event',
      impact: 'positive'
    },
    {
      id: 'factor1', 
      title: '우라늄 수요 증가',
      description: '전세계적으로 원자력 발전에 대한 재평가와 우라늄 수요 급증',
      type: 'factor',
      impact: 'positive'
    },
    {
      id: 'outcome1',
      title: '우라늄 관련 종목 상승',
      description: 'UEC, OCLR 등 우라늄 관련 종목들의 주가 상승세',
      type: 'outcome', 
      impact: 'positive'
    }
  ];

  const defaultLinks: CausalLink[] = [
    {
      id: 'link1',
      from: 'event1',
      to: 'factor1',
      relationship: '촉발',
      strength: 'strong',
      type: 'positive'
    },
    {
      id: 'link2',
      from: 'factor1', 
      to: 'outcome1',
      relationship: '결과',
      strength: 'strong',
      type: 'positive'
    }
  ];

  const displayNodes = nodes.length > 0 ? nodes : defaultNodes;
  const displayLinks = links.length > 0 ? links : defaultLinks;

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Brain className="w-4 h-4 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'negative':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'event':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'factor':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'outcome':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          논리체인 분석
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          메르의 투자 논리를 단계별로 분석한 인과관계 체인입니다
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 논리체인 시각화 */}
          <div className="flex flex-col gap-4">
            {displayNodes.map((node, index) => (
              <React.Fragment key={node.id}>
                {/* 노드 카드 */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {getImpactIcon(node.impact)}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm">{node.title}</h4>
                              <Badge className={getNodeTypeColor(node.type)} variant="secondary">
                                {node.type === 'event' ? '사건' : 
                                 node.type === 'factor' ? '요인' : '결과'}
                              </Badge>
                              <Badge className={getImpactColor(node.impact)} variant="secondary">
                                {node.impact === 'positive' ? '긍정' : 
                                 node.impact === 'negative' ? '부정' : '중립'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {node.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* 연결 화살표 (마지막 노드가 아닌 경우만) */}
                {index < displayNodes.length - 1 && (
                  <div className="flex items-center justify-center py-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-px bg-border flex-1 max-w-[40px]"></div>
                      <ArrowRight className="w-4 h-4" />
                      <div className="h-px bg-border flex-1 max-w-[40px]"></div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* 분석 요약 */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              논리체인 요약
            </h5>
            <p className="text-xs text-muted-foreground leading-relaxed">
              이 논리체인은 메르의 투자 판단 과정을 체계적으로 분석한 것으로, 
              각 단계별 인과관계를 통해 투자 아이디어의 논리적 타당성을 검증할 수 있습니다.
              긍정적 요인들이 연쇄적으로 작용하여 투자 기회를 창출하는 구조를 보여줍니다.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}