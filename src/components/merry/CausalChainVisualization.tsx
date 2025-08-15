'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  ArrowDown, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  ExternalLink,
  FileText 
} from 'lucide-react';

interface CausalStep {
  id?: number;
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
  created_at?: string;
  steps: CausalStep[];
  correlations: StockCorrelation[];
}

interface CausalChainVisualizationProps {
  chain: CausalChain;
  onViewPost?: (postId: number) => void;
}

export default function CausalChainVisualization({ 
  chain, 
  onViewPost 
}: CausalChainVisualizationProps) {
  
  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case 'trigger':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'intermediate':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'outcome':
        return <Target className="h-4 w-4 text-green-500" />;
      default:
        return <ArrowRight className="h-4 w-4" />;
    }
  };

  const getStepTypeLabel = (stepType: string) => {
    switch (stepType) {
      case 'trigger':
        return '트리거';
      case 'intermediate':
        return '중간단계';
      case 'outcome':
        return '결과';
      default:
        return stepType;
    }
  };

  const getStepTypeColor = (stepType: string) => {
    switch (stepType) {
      case 'trigger':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'intermediate':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'outcome':
        return 'bg-green-50 border-green-200 text-green-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getImpactIcon = (direction: string) => {
    switch (direction) {
      case 'positive':
        return '📈';
      case 'negative':
        return '📉';
      case 'neutral':
        return '📊';
      default:
        return '❓';
    }
  };

  const getExpectedImpactColor = (impact: string) => {
    switch (impact) {
      case 'strong_positive':
        return 'text-green-600 bg-green-50';
      case 'positive':
        return 'text-green-500 bg-green-50';
      case 'strong_negative':
        return 'text-red-600 bg-red-50';
      case 'negative':
        return 'text-red-500 bg-red-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  const getExpectedImpactLabel = (impact: string) => {
    switch (impact) {
      case 'strong_positive':
        return '강한 상승';
      case 'positive':
        return '상승';
      case 'strong_negative':
        return '강한 하락';
      case 'negative':
        return '하락';
      default:
        return '중립';
    }
  };

  const getHorizonLabel = (horizon: string) => {
    switch (horizon) {
      case '1w':
        return '1주';
      case '1m':
        return '1개월';
      case '3m':
        return '3개월';
      case '6m':
        return '6개월';
      case '1y':
        return '1년';
      default:
        return horizon;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{chain.chain_title}</CardTitle>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                신뢰도 {Math.round(chain.confidence_score * 100)}%
              </Badge>
              <Badge variant="secondary" className="text-xs">
                예측기간 {getHorizonLabel(chain.prediction_horizon)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {chain.steps.length}단계
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewPost?.(chain.source_post_id)}
            className="flex items-center space-x-1"
          >
            <FileText className="h-4 w-4" />
            <span>원문 보기</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 논리체인 시각화 */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center space-x-2">
            <ArrowDown className="h-4 w-4" />
            <span>논리체인 흐름</span>
          </h4>
          
          <div className="space-y-3">
            {chain.steps.map((step, index) => (
              <div key={step.id || index} className="relative">
                <div className={`p-4 rounded-lg border-2 ${getStepTypeColor(step.step_type)}`}>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-white border-2 border-current flex items-center justify-center text-xs font-bold">
                        {step.step_order}
                      </div>
                      {getStepIcon(step.step_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {getStepTypeLabel(step.step_type)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {step.affected_entity}
                        </Badge>
                        <span className="text-xs">
                          {getImpactIcon(step.impact_direction)}
                        </span>
                      </div>
                      
                      <p className="text-sm leading-relaxed">
                        {step.step_description}
                      </p>
                      
                      <div className="mt-2 text-xs text-muted-foreground">
                        신뢰도: {Math.round(step.confidence_score * 100)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* 화살표 연결선 */}
                {index < chain.steps.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowDown className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 투자 논제 */}
        {chain.investment_thesis && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border">
            <h4 className="font-semibold text-sm mb-2 flex items-center space-x-2">
              <Target className="h-4 w-4 text-purple-600" />
              <span>💡 투자 논제</span>
            </h4>
            <p className="text-sm text-gray-700">{chain.investment_thesis}</p>
          </div>
        )}

        {/* 연관 종목 */}
        {chain.correlations && chain.correlations.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span>📈 연관 종목 분석</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {chain.correlations.map((correlation, index) => (
                <div key={correlation.id || index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{correlation.ticker}</span>
                      <Badge variant="outline" className="text-xs">
                        {correlation.correlation_type}
                      </Badge>
                    </div>
                    <Badge className={`text-xs ${getExpectedImpactColor(correlation.expected_impact)}`}>
                      {getExpectedImpactLabel(correlation.expected_impact)}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {correlation.company_name}
                  </p>
                  
                  <p className="text-xs text-gray-600 mb-2">
                    {correlation.reasoning}
                  </p>
                  
                  <div className="text-xs text-muted-foreground">
                    영향 확률: {Math.round(correlation.impact_probability * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}