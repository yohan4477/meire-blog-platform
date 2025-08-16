'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, TrendingUp, BarChart3, User, Newspaper, Brain, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// 동적 import로 성능 최적화

const MerryStockPicks = dynamic(
  () => import('@/components/merry/MerryStockPicks'),
  { 
    loading: () => <Skeleton className="h-96 w-full" />,
    ssr: true // SSR 활성화로 첫 로딩 성능 향상
  }
);

const MerryProfileTab = dynamic(
  () => import('@/components/merry/MerryProfileTab'),
  { 
    loading: () => <Skeleton className="h-96 w-full" />,
    ssr: false 
  }
);


export default function Home() {
  const [loading, setLoading] = useState(false);
  const [merryPosts, setMerryPosts] = useState<any[]>([]);
  const [curatedNews, setCuratedNews] = useState<any[]>([]);
  const [dailyDigest, setDailyDigest] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('profile');

  // 🚀 병렬 API 호출로 성능 최적화
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      
      try {
        // 핵심 데이터 병렬 로딩 (가장 중요한 API들)
        const [merryResponse, curatedResponse] = await Promise.all([
          fetch('/api/merry?limit=2').catch(err => ({ error: err })),
          fetch('/api/financial-curation?action=curated&limit=3').catch(err => ({ error: err }))
        ]);

        // 메르 블로그 포스트 처리 (안전한 JSON 파싱)
        if (!merryResponse.error) {
          try {
            const merryResult = await merryResponse.json();
            if (merryResult.success && merryResult.data) {
              setMerryPosts(merryResult.data.slice(0, 2));
            }
          } catch (jsonError) {
            console.warn('메르 블로그 JSON 파싱 실패:', jsonError);
            // Fallback 데이터 사용
          }
        }

        // 큐레이션 뉴스 처리 (안전한 JSON 파싱)
        if (!curatedResponse.error) {
          try {
            const curatedData = await curatedResponse.json();
            if (curatedData.success && Array.isArray(curatedData.data)) {
              setCuratedNews(curatedData.data.slice(0, 3));
            } else {
              console.warn('큐레이션 뉴스 데이터가 배열이 아님:', curatedData);
            }
          } catch (jsonError) {
            console.warn('큐레이션 뉴스 JSON 파싱 실패:', jsonError);
            // Fallback 데이터 사용
          }
        }

        // 다이제스트는 비동기로 나중에 로드 (성능 최적화)
        setTimeout(async () => {
          try {
            const digestResponse = await fetch('/api/financial-curation?action=digest');
            const digestData = await digestResponse.json();
            
            if (digestData.success) {
              setDailyDigest(digestData.data);
            }
          } catch (error) {
            console.error('Daily digest 로딩 실패:', error);
            // JSON 파싱 에러도 여기서 안전하게 처리됨
          }
        }, 1000); // 1초로 단축

      } catch (error) {
        console.error('데이터 로딩 실패:', error);
        
        // fallback 데이터
        setMerryPosts([
          {
            id: 1,
            title: '우리형 메르의 첫 번째 이야기',
            excerpt: '메르의 첫 번째 포스트입니다.',
            category: '일상',
            created_date: '2025-01-10T00:00:00.000Z',
            views: 156,
            featured: true
          }
        ]);
        
        setCuratedNews([
          {
            id: 'demo_1',
            title: 'AI 칩 수요 급증으로 반도체 주식 상승세',
            content: '인공지능 붐으로 인한 칩 수요 증가가 반도체 업계 전반에 긍정적 영향을 미치고 있습니다.',
            type: 'NEWS',
            relevance_score: 0.9,
            tags: ['Technology', 'AI', 'Semiconductors'],
            created_date: new Date().toISOString()
          },
          {
            id: 'demo_2',
            title: '연준 금리 결정 앞두고 시장 관망세',
            content: '다음 주 연방준비제도 회의를 앞두고 투자자들이 신중한 접근을 보이고 있습니다.',
            type: 'ANALYSIS',
            relevance_score: 0.8,
            tags: ['Federal Reserve', 'Interest Rates', 'Market'],
            created_date: new Date().toISOString()
          },
          {
            id: 'demo_3',
            title: 'AI 포트폴리오 최적화 인사이트',
            content: 'BlackRock 에이전트가 분석한 현재 시장 상황에서의 포트폴리오 최적화 전략입니다.',
            type: 'INSIGHT',
            relevance_score: 0.85,
            tags: ['AI', 'Portfolio', 'Optimization'],
            created_date: new Date().toISOString()
          }
        ]);
        
        setDailyDigest({
          summary: '오늘의 주요 뉴스 3건 중 투자 영향도가 높은 뉴스가 2건 확인되었습니다. 시장 전망: 중립적 분위기를 보이고 있습니다.',
          top_stories: [],
          sectors_in_focus: ['Technology', 'Finance', 'Healthcare']
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, []);

  // 요르의 개인 투자 분석 포스트들 (실제 클릭 가능)
  const recentPosts = [
    {
      id: 1,
      slug: 'nps-2025-strategy',
      title: "국민연금 포트폴리오 변화 살펴보기",
      content: "최근 공개된 국민연금 13F 파일링을 보면서 흥미로운 변화들을 발견했습니다. AI 관련주 비중이 늘어나고 있고, 전반적으로 어떻게 바뀌고 있는지 정리해봤어요.",
      category: "투자분석",
      created_date: "2025-01-12T00:00:00.000Z",
      author: "요르",
      views: 1250,
      rating: "투자 분석"
    },
    {
      id: 2,
      slug: 'global-institutional-comparison',
      title: "버크셔, 타이거 글로벌... 대형 펀드들은 뭘 사고 있을까?",
      content: "워렌 버핏의 버크셔 해서웨이부터 타이거 글로벌, 시타델까지... 유명한 기관투자자들이 최근에 뭘 사고 팔고 있는지 궁금해서 13F 파일링을 뒤져봤어요.",
      category: "시장분석",
      created_date: "2025-01-10T00:00:00.000Z",
      author: "요르",
      views: 980,
      rating: "투자 동향"
    },
    {
      id: 3,
      slug: '13f-trend-analysis',
      title: "13F 파일링 뒤져보니 나온 흥미로운 트렌드들",
      content: "SEC 13F 파일링을 대량으로 분석해봤더니 재미있는 패턴들이 보이네요. AI 투자도 이제 선별적으로 하고, 중국 주식은 계속 빼고 있고, ESG도 대세가 된 것 같아요.",
      category: "데이터분석",
      created_date: "2025-01-08T00:00:00.000Z",
      author: "요르",
      views: 756,
      rating: "데이터 분석"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-card border-b">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              요르의 투자 플랫폼
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-4 break-keep">
              니가 뭘 알어. 니가 뭘 아냐고.<br />
              요르가 말아주는 주식 분석 플랫폼
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center max-w-4xl mx-auto px-2">
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto min-w-0 text-sm sm:text-base">
                <Link href="/merry" className="flex items-center justify-center">
                  <span className="truncate">📝 메르 블로그</span>
                  <User className="ml-2 h-4 w-4 flex-shrink-0" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto min-w-0 text-sm sm:text-base">
                <Link href="/merry/stocks" className="flex items-center justify-center">
                  <span className="truncate">📊 종목 분석</span>
                  <TrendingUp className="ml-2 h-4 w-4 flex-shrink-0" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 메르's Pick - 주목할 종목 (최상단 배치) */}
      <section className="bg-muted/50 border-b">
        <div className="container mx-auto px-4 py-6">
          <MerryStockPicks />
        </div>
      </section>
      
      {/* 국민연금 분석 & 에이전트 관리 (하단 배치) */}
      <section className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  국민연금 분석
                </h3>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/investment">
                    자세히 보기
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                국민연금공단의 최신 포트폴리오 변화와 투자 전략을 분석합니다
              </p>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Brain className="mr-2 h-5 w-5" />
                  에이전트 관리
                </h3>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/agent-workflows">
                    자세히 보기
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                AI 에이전트들의 분석 워크플로우를 관리하고 모니터링합니다
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Content with Tabs */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="profile" className="text-xs sm:text-sm px-1 sm:px-2 py-2 min-w-0">
              <span className="hidden sm:inline">👤 </span>
              <span className="truncate">메르 소개</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs sm:text-sm px-1 sm:px-2 py-2 min-w-0">
              <span className="hidden sm:inline">🤖 </span>
              <span className="truncate">AI 인사이트</span>
            </TabsTrigger>
          </TabsList>


          <TabsContent value="insights" className="mt-6 space-y-6">
            {/* AI 금융 큐레이션 섹션 */}
            <div className="bg-card rounded-lg p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold">🤖 AI 금융 큐레이션</h2>
                  <p className="text-muted-foreground mt-2">
                    Goldman Sachs, Bloomberg, BlackRock AI 에이전트가 분석한 실시간 금융 인사이트
                  </p>
                </div>
                <Button variant="ghost" asChild>
                  <Link href="/financial-curation">
                    전체보기
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* 오늘의 시장 요약 */}
              {dailyDigest && (
                <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Newspaper className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">📊 오늘의 시장 요약</h3>
                      <p className="text-muted-foreground mb-3">{dailyDigest.summary}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm font-medium text-muted-foreground">주요 섹터:</span>
                        {Array.isArray(dailyDigest.sectors_in_focus) && dailyDigest.sectors_in_focus.length > 0 ? (
                          dailyDigest.sectors_in_focus.map((sector: string, index: number) => (
                            <Badge key={index} variant="secondary">{sector || '석터'}</Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            석터 정보 없음
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* 큐레이션된 콘텐츠 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.isArray(curatedNews) && curatedNews.length > 0 ? curatedNews.map((content) => (
                  <Card key={content.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant={content.type === 'NEWS' ? 'secondary' : 
                                  content.type === 'ANALYSIS' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          <span className="mr-1">
                            {content.type === 'NEWS' ? <Newspaper className="h-3 w-3" /> :
                             content.type === 'ANALYSIS' ? <BarChart3 className="h-3 w-3" /> :
                             <Brain className="h-3 w-3" />}
                          </span>
                          {content.type}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-xs font-medium">
                            {Math.round(content.relevance_score * 100)}%
                          </span>
                        </div>
                      </div>
                      
                      <h4 className="font-semibold text-sm leading-tight">{content.title}</h4>
                      
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {content.content}
                      </p>
                      
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(content.tags) && content.tags.length > 0 ? (
                          content.tags.slice(0, 3).map((tag: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag || '태그'}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            태그 없음
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {new Date(content.created_date).toLocaleString('ko-KR')}
                      </div>
                    </div>
                  </Card>
                )) : (
                  <Card className="p-6 col-span-full">
                    <div className="text-center text-muted-foreground">
                      <p>큐레이션된 뉴스를 불러오는 중입니다...</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>


          <TabsContent value="profile" className="mt-6">
            <MerryProfileTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}