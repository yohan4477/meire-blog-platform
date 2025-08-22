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
  Award, 
  Briefcase, 
  CheckCircle,
  BarChart3,
  Target
} from 'lucide-react';

interface MerryAchievements {
  totalAnalyzed: number;
  corporateAchievements: Achievement[];
  investmentPhilosophy: InvestmentPhilosophy;
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






interface InvestmentPhilosophy {
  core: string;
  principles: string[];
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
      
      if (result.success && result.data?.achievements) {
        setAchievements(result.data.achievements);
        
        // 체크박스 초기화 (투자 예측 탭 제거됨)
        setCheckedPredictions({});
      } else {
        console.warn('업적 데이터 구조 불일치:', result);
        // 기본값 설정
        setAchievements({
          totalAnalyzed: 0,
          corporateAchievements: [],
          investmentPhilosophy: {
            core: "장기 가치 투자",
            principles: []
          }
        });
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
        <Tabs defaultValue="philosophy" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="philosophy">투자 철학</TabsTrigger>
            <TabsTrigger value="career">메르 업적</TabsTrigger>
          </TabsList>

          {/* 메르 업적 탭 */}
          <TabsContent value="career" className="space-y-4">
            <div className="grid gap-4">
              {Array.isArray(achievements?.corporateAchievements) && achievements.corporateAchievements.length > 0 ? achievements.corporateAchievements.map((achievement, index) => (
                  <Card key={index} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(achievement?.category || 'default')}
                          <CardTitle className="text-lg">{achievement?.title || '업적 제목 없음'}</CardTitle>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getImpactColor(achievement?.impact || 'low')} text-white`}
                          >
                            {achievement?.impact === 'high' ? '높은 임팩트' : 
                             achievement?.impact === 'medium' ? '중간 임팩트' : '낮은 임팩트'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {achievement?.period || achievement?.date || '날짜 정보 없음'}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        {achievement?.description || '설명 정보 없음'}
                      </p>
                      <p className="text-sm">
                        {achievement?.details || '상세 정보 없음'}
                      </p>
                    </CardContent>
                  </Card>
                )) : (
                  <Card className="border-l-4 border-l-muted">
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground">
                        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>업적 정보를 불러오는 중입니다...</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>
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
                    "{achievements.investmentPhilosophy?.core || '장기 가치 투자'}"
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">투자 원칙</h4>
                  <ul className="space-y-2">
                    {Array.isArray(achievements?.investmentPhilosophy?.principles) && achievements.investmentPhilosophy.principles.length > 0 ? (
                      achievements.investmentPhilosophy.principles.map((principle, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">{principle || '원칙 정보 없음'}</span>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">투자 원칙 정보가 없습니다.</span>
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>



          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}