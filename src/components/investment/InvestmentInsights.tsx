'use client';

import { useState, useEffect } from 'react';
import { ScionHolding } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Zap,
  AlertTriangle,
  Crown,
  Eye,
  BarChart3,
  Brain,
  RefreshCw
} from 'lucide-react';

interface InvestmentInsightsProps {
  holdings: ScionHolding[];
  className?: string;
}

interface Insight {
  type: 'concentration' | 'sector' | 'momentum' | 'value' | 'risk' | 'strategy';
  title: string;
  description: string;
  data: any;
  severity: 'high' | 'medium' | 'low';
  icon: any;
}

export default function InvestmentInsights({ holdings, className = "" }: InvestmentInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    generateInsights();
  }, [holdings]);

  const generateInsights = () => {
    setLoading(true);
    const newInsights: Insight[] = [];

    // 1. 집중도 분석
    const top5Holdings = holdings.slice(0, 5);
    const top5Concentration = top5Holdings.reduce((sum, h) => sum + h.portfolioPercent, 0);
    
    if (top5Concentration > 70) {
      newInsights.push({
        type: 'concentration',
        title: '고집중 포트폴리오',
        description: `상위 5개 종목이 전체 포트폴리오의 ${top5Concentration.toFixed(1)}%를 차지. 분산투자보다 확신 있는 종목에 집중하는 전략.`,
        data: { percentage: top5Concentration, topStocks: top5Holdings.map(h => h.ticker) },
        severity: 'high',
        icon: Target
      });
    }

    // 2. 섹터/업종 트렌드 분석
    const sectorCount = new Map<string, number>();
    holdings.forEach(holding => {
      // 간단한 섹터 분류 (실제로는 더 정교한 분류 필요)
      let sector = 'Other';
      if (holding.name.toLowerCase().includes('technology') || 
          holding.ticker?.includes('TECH') ||
          ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA'].includes(holding.ticker || '')) {
        sector = 'Technology';
      } else if (holding.name.toLowerCase().includes('financial') ||
                 holding.name.toLowerCase().includes('bank')) {
        sector = 'Financial';
      } else if (holding.name.toLowerCase().includes('healthcare') ||
                 holding.name.toLowerCase().includes('pharmaceutical')) {
        sector = 'Healthcare';
      }
      
      sectorCount.set(sector, (sectorCount.get(sector) || 0) + holding.portfolioPercent);
    });

    const dominantSector = Array.from(sectorCount.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (dominantSector && dominantSector[1] > 40) {
      newInsights.push({
        type: 'sector',
        title: `${dominantSector[0]} 섹터 집중`,
        description: `${dominantSector[0]} 섹터에 ${dominantSector[1].toFixed(1)}% 비중으로 투자. 특정 섹터에 대한 강한 확신을 보여주는 포지션.`,
        data: { sector: dominantSector[0], percentage: dominantSector[1] },
        severity: 'medium',
        icon: BarChart3
      });
    }

    // 3. 포지션 사이즈 전략 분석
    const megaPositions = holdings.filter(h => h.portfolioPercent > 10);
    const smallPositions = holdings.filter(h => h.portfolioPercent < 1);
    
    if (megaPositions.length > 0) {
      newInsights.push({
        type: 'strategy',
        title: '메가 포지션 전략',
        description: `${megaPositions.length}개 종목에 각각 10% 이상 투자. ${megaPositions.map(h => h.ticker).join(', ')}에 대한 강한 확신.`,
        data: { count: megaPositions.length, stocks: megaPositions },
        severity: 'high',
        icon: Crown
      });
    }

    // 4. 가치투자 vs 성장투자 패턴 분석
    const largeCaps = holdings.filter(h => h.marketValue > 1000000000); // 10억 이상
    const growthIndicators = holdings.filter(h => 
      h.name.toLowerCase().includes('growth') ||
      h.name.toLowerCase().includes('tech') ||
      ['NVDA', 'TSLA', 'META'].includes(h.ticker || '')
    );

    if (largeCaps.length / holdings.length > 0.7) {
      newInsights.push({
        type: 'value',
        title: '대형주 중심 포트폴리오',
        description: `전체 종목의 ${((largeCaps.length / holdings.length) * 100).toFixed(0)}%가 대형주. 안정성과 배당을 중시하는 가치투자 성향.`,
        data: { percentage: (largeCaps.length / holdings.length) * 100 },
        severity: 'low',
        icon: Brain
      });
    }

    // 5. 리스크 분석
    if (holdings.length < 15) {
      newInsights.push({
        type: 'risk',
        title: '집중투자 리스크',
        description: `총 ${holdings.length}개 종목으로 구성. 분산이 적어 개별 종목 리스크가 높지만, 관리가 용이하고 확신있는 투자 가능.`,
        data: { stockCount: holdings.length },
        severity: 'medium',
        icon: AlertTriangle
      });
    }

    // 6. 모멘텀/변화 패턴
    const newPositions = holdings.filter(h => h.change?.type === 'new');
    const increasedPositions = holdings.filter(h => h.change?.type === 'increased');
    const decreasedPositions = holdings.filter(h => h.change?.type === 'decreased');

    if (newPositions.length > 0 || increasedPositions.length > 0) {
      newInsights.push({
        type: 'momentum',
        title: '활발한 포트폴리오 조정',
        description: `신규 매수 ${newPositions.length}개, 증량 ${increasedPositions.length}개. 시장 변화에 적극적으로 대응하는 모습.`,
        data: { 
          newCount: newPositions.length, 
          increasedCount: increasedPositions.length,
          newStocks: newPositions.map(h => h.ticker)
        },
        severity: 'medium',
        icon: Zap
      });
    }

    setInsights(newInsights.slice(0, 6)); // 최대 6개 인사이트
    setLoading(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-l-red-500 bg-red-50/50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50/50';
      case 'low': return 'border-l-green-500 bg-green-50/50';
      default: return 'border-l-gray-500 bg-gray-50/50';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return <Badge variant="destructive" className="text-xs">핵심</Badge>;
      case 'medium': return <Badge variant="default" className="text-xs">주요</Badge>;
      case 'low': return <Badge variant="outline" className="text-xs">보조</Badge>;
      default: return null;
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Brain className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-bold">투자 전략 인사이트</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">니가 뭘 알아</span>
          <Button
            variant="outline"
            size="sm"
            onClick={generateInsights}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            분석 새로고침
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((insight, index) => {
          const IconComponent = insight.icon;
          
          return (
            <div 
              key={index}
              className={`p-4 rounded-lg border-l-4 ${getSeverityColor(insight.severity)} transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">{insight.title}</h4>
                    {getSeverityBadge(insight.severity)}
                  </div>
                </div>
              </div>
              
              <p className="text-muted-foreground leading-relaxed">
                {insight.description}
              </p>

              {/* 데이터 시각화 */}
              {insight.type === 'concentration' && (
                <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm font-medium mb-2">상위 5종목: {insight.data.topStocks.join(', ')}</div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all duration-500"
                      style={{ width: `${insight.data.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {insight.data.percentage.toFixed(1)}% 집중도
                  </div>
                </div>
              )}

              {insight.type === 'momentum' && insight.data.newStocks.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-medium text-green-600">
                    새로 추가된 종목: {insight.data.newStocks.join(', ')}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {insights.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>포트폴리오 분석을 위한 데이터를 수집하고 있습니다.</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-muted-foreground">투자 전략을 분석하고 있습니다...</p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          * 이 분석은 공개된 SEC 13F 보고서를 바탕으로 한 해석이며, 실제 투자전략과 다를 수 있습니다.
        </p>
      </div>
    </Card>
  );
}