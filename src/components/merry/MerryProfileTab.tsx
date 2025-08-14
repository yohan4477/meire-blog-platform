'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Award, 
  Briefcase, 
  Heart,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
  Calendar,
  Target
} from 'lucide-react';

interface MerryAchievements {
  totalAnalyzed: number;
  corporateAchievements: Achievement[];
  daughterPortfolio: Portfolio;
  stockPredictions: Prediction[];
  sectorInsights: SectorInsight[];
  marketTiming: MarketTiming[];
  investmentPhilosophy: InvestmentPhilosophy;
  recentActivities: RecentActivity[];
}

interface Achievement {
  title: string;
  description: string;
  category: string;
  period?: string;
  date?: string;
  impact: 'high' | 'medium' | 'low';
  details: string;
}

interface Portfolio {
  totalValue: number;
  totalInvested: number;
  totalReturn: number;
  returnRate: number;
  period: string;
  benchmark: {
    kospi: number;
    sp500: number;
    nasdaq: number;
  };
  topHoldings: Holding[];
  monthlyContribution: number;
  strategy: string;
  riskLevel: string;
}

interface Holding {
  ticker: string;
  name: string;
  weight: number;
  returnRate: number;
  invested: number;
  currentValue: number;
}

interface Prediction {
  ticker: string;
  predictionDate: string;
  predictedPrice: number;
  actualPrice: number;
  accuracy: boolean;
  timeframe: string;
  reasoning: string;
  category: string;
}

interface SectorInsight {
  sector: string;
  insight: string;
  accuracy: boolean;
  impact: 'high' | 'medium' | 'low';
}

interface MarketTiming {
  event: string;
  prediction: string;
  accuracy: boolean;
  timing: string;
}

interface InvestmentPhilosophy {
  core: string;
  principles: string[];
  successRate: {
    stockPicks: string;
    sectorRotation: string;
    marketTiming: string;
  };
}

interface RecentActivity {
  date: string;
  activity: string;
  focus: string;
}

export default function MerryProfileTab() {
  const [achievements, setAchievements] = useState<MerryAchievements | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedPredictions, setCheckedPredictions] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    fetchMerryAchievements();
  }, []);

  const fetchMerryAchievements = async () => {
    try {
      const response = await fetch('/api/merry/achievements?limit=500');
      const result = await response.json();
      
      if (result.success) {
        setAchievements(result.data.achievements);
        
        // 성공한 예측들을 기본으로 체크
        const initialChecks: {[key: string]: boolean} = {};
        result.data.achievements.stockPredictions.forEach((pred: Prediction, index: number) => {
          initialChecks[`prediction-${index}`] = pred.accuracy;
        });
        setCheckedPredictions(initialChecks);
      }
    } catch (error) {
      console.error('메르 업적 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePredictionCheck = (predictionId: string, checked: boolean) => {
    setCheckedPredictions(prev => ({
      ...prev,
      [predictionId]: checked
    }));
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'career': return <Briefcase className="w-4 h-4" />;
      case 'award': return <Award className="w-4 h-4" />;
      case 'research': return <BarChart3 className="w-4 h-4" />;
      case 'education': return <Target className="w-4 h-4" />;
      case 'leadership': return <Trophy className="w-4 h-4" />;
      default: return <Trophy className="w-4 h-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            메르 소개
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
            <p className="text-muted-foreground">메르의 업적을 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!achievements) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            메르 소개
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>메르의 업적 정보를 불러올 수 없습니다.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          메르 소개
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {achievements.totalAnalyzed}개 포스트 분석 기반 업적 및 투자 성과
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="career" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="career">회사 업적</TabsTrigger>
            <TabsTrigger value="portfolio">딸 포트폴리오</TabsTrigger>
            <TabsTrigger value="predictions">투자 예측</TabsTrigger>
            <TabsTrigger value="philosophy">투자 철학</TabsTrigger>
          </TabsList>

          {/* 회사 업적 탭 */}
          <TabsContent value="career" className="space-y-4">
            <div className="grid gap-4">
              {achievements.corporateAchievements.map((achievement, index) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(achievement.category)}
                        <CardTitle className="text-lg">{achievement.title}</CardTitle>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getImpactColor(achievement.impact)} text-white`}
                        >
                          {achievement.impact === 'high' ? '높은 임팩트' : 
                           achievement.impact === 'medium' ? '중간 임팩트' : '낮은 임팩트'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {achievement.period || achievement.date}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      {achievement.description}
                    </p>
                    <p className="text-sm">
                      {achievement.details}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 딸 포트폴리오 탭 */}
          <TabsContent value="portfolio" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium">총 자산</span>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(achievements.daughterPortfolio.totalValue)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    투입: {formatCurrency(achievements.daughterPortfolio.totalInvested)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium">총 수익률</span>
                  </div>
                  <div className="text-2xl font-bold text-green-500">
                    +{achievements.daughterPortfolio.returnRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    수익: {formatCurrency(achievements.daughterPortfolio.totalReturn)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium">투자 기간</span>
                  </div>
                  <div className="text-lg font-bold">
                    {achievements.daughterPortfolio.period}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    월 {formatCurrency(achievements.daughterPortfolio.monthlyContribution)} 적립
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 벤치마크 비교 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  벤치마크 비교
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>메르 딸 포트폴리오</span>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(achievements.daughterPortfolio.returnRate, 100)} className="w-32" />
                      <span className="font-bold text-green-500">+{achievements.daughterPortfolio.returnRate.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>NASDAQ</span>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(achievements.daughterPortfolio.benchmark.nasdaq, 100)} className="w-32" />
                      <span className="font-bold">+{achievements.daughterPortfolio.benchmark.nasdaq.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>S&P 500</span>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(achievements.daughterPortfolio.benchmark.sp500, 100)} className="w-32" />
                      <span className="font-bold">+{achievements.daughterPortfolio.benchmark.sp500.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>KOSPI</span>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(achievements.daughterPortfolio.benchmark.kospi, 100)} className="w-32" />
                      <span className="font-bold">+{achievements.daughterPortfolio.benchmark.kospi.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 주요 보유 종목 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  주요 보유 종목
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {achievements.daughterPortfolio.topHoldings.map((holding, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{holding.ticker}</Badge>
                        <div>
                          <div className="font-medium">{holding.name}</div>
                          <div className="text-sm text-muted-foreground">
                            투입: {formatCurrency(holding.invested)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{holding.weight.toFixed(1)}%</div>
                        <div className={`text-sm ${holding.returnRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {holding.returnRate >= 0 ? '+' : ''}{holding.returnRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(holding.currentValue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 투자 예측 탭 */}
          <TabsContent value="predictions" className="space-y-4">
            <div className="space-y-4">
              {achievements.stockPredictions.map((prediction, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`prediction-${index}`}
                          checked={checkedPredictions[`prediction-${index}`] || false}
                          onCheckedChange={(checked) => 
                            handlePredictionCheck(`prediction-${index}`, checked as boolean)
                          }
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{prediction.ticker}</Badge>
                            <Badge 
                              variant={prediction.accuracy ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {prediction.accuracy ? (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              ) : (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              {prediction.accuracy ? '성공' : '실패'}
                            </Badge>
                            <Badge 
                              variant={prediction.category === '강력 매수' ? 'default' : 
                                      prediction.category === '매수' ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {prediction.category}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            예측일: {new Date(prediction.predictionDate).toLocaleDateString('ko-KR')} 
                            ({prediction.timeframe})
                          </div>
                          <div className="text-sm mt-1">
                            {prediction.reasoning}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">목표가</div>
                        <div className="font-bold">${formatNumber(prediction.predictedPrice)}</div>
                        <div className="text-sm text-muted-foreground">실제가</div>
                        <div className={`font-bold ${prediction.accuracy ? 'text-green-500' : 'text-red-500'}`}>
                          ${formatNumber(prediction.actualPrice)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 섹터 인사이트 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">섹터 인사이트</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {achievements.sectorInsights.map((insight, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{insight.sector}</Badge>
                        <Badge 
                          variant={insight.accuracy ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {insight.accuracy ? '정확' : '부정확'}
                        </Badge>
                      </div>
                      <p className="text-sm">{insight.insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 투자 철학 탭 */}
          <TabsContent value="philosophy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">핵심 투자 철학</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6 bg-primary/5 rounded-lg mb-4">
                  <h3 className="text-xl font-bold text-primary mb-2">
                    "{achievements.investmentPhilosophy.core}"
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">투자 원칙</h4>
                  <ul className="space-y-2">
                    {achievements.investmentPhilosophy.principles.map((principle, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{principle}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">투자 성공률</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {achievements.investmentPhilosophy.successRate.stockPicks}
                    </div>
                    <div className="text-sm text-muted-foreground">종목 선택</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {achievements.investmentPhilosophy.successRate.sectorRotation}
                    </div>
                    <div className="text-sm text-muted-foreground">섹터 로테이션</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {achievements.investmentPhilosophy.successRate.marketTiming}
                    </div>
                    <div className="text-sm text-muted-foreground">마켓 타이밍</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">최근 활동</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {achievements.recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{activity.activity}</div>
                        <div className="text-sm text-muted-foreground">{activity.focus}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(activity.date).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}