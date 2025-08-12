'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, TrendingUp, BarChart3, User, Newspaper, Brain, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UnifiedDashboard from '@/components/dashboard/UnifiedDashboard';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [merryPosts, setMerryPosts] = useState<any[]>([]);
  const [curatedNews, setCuratedNews] = useState<any[]>([]);
  const [dailyDigest, setDailyDigest] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // 메르 블로그 최신 포스트 가져오기
  useEffect(() => {
    const fetchMerryPosts = async () => {
      try {
        const response = await fetch('/api/merry?limit=2');
        const result = await response.json();
        if (result.success && result.data) {
          setMerryPosts(result.data.slice(0, 2));
        }
      } catch (error) {
        console.error('메르 블로그 포스트 가져오기 실패:', error);
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
      }
    };
    fetchMerryPosts();
  }, []);

  // 큐레이션된 금융 콘텐츠 가져오기
  useEffect(() => {
    const fetchFinancialContent = async () => {
      try {
        const [curatedResponse, digestResponse] = await Promise.all([
          fetch('/api/financial-curation?action=curated&limit=3'),
          fetch('/api/financial-curation?action=digest')
        ]);
        
        const [curatedData, digestData] = await Promise.all([
          curatedResponse.json(),
          digestResponse.json()
        ]);
        
        if (curatedData.success) {
          setCuratedNews(curatedData.data.slice(0, 3));
        }
        
        if (digestData.success) {
          setDailyDigest(digestData.data);
        }
      } catch (error) {
        console.error('금융 콘텐츠 가져오기 실패:', error);
        // fallback 데이터
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
      }
    };
    
    fetchFinancialContent();
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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              메이레 투자 플랫폼
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              AI 에이전트가 분석하는 스마트 투자 플랫폼<br />
              국민연금, 기관투자자 포트폴리오 분석과 실시간 시장 인사이트를 한곳에서
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <Link href="/financial-curation">
                  🤖 AI 금융 큐레이션
                  <Brain className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/investment">
                  국민연금 분석
                  <BarChart3 className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/agent-workflows">
                  에이전트 관리
                  <Brain className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content with Tabs */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">통합 대시보드</TabsTrigger>
            <TabsTrigger value="insights">AI 인사이트</TabsTrigger>
            <TabsTrigger value="posts">투자 분석</TabsTrigger>
            <TabsTrigger value="merry">메르 블로그</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <UnifiedDashboard />
          </TabsContent>

          <TabsContent value="insights" className="mt-6 space-y-6">
            {/* AI 금융 큐레이션 섹션 */}
            <div className="bg-white rounded-lg p-6">
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
                  {dailyDigest.sectors_in_focus?.map((sector: string, index: number) => (
                    <Badge key={index} variant="secondary">{sector}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 큐레이션된 콘텐츠 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {curatedNews.map((content) => (
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
                  {content.tags?.slice(0, 3).map((tag: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {new Date(content.created_date).toLocaleString('ko-KR')}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 최근 포스트 */}
      <section className="py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">최근 포스트</h2>
          <Button variant="ghost" asChild>
            <Link href="/posts">
              전체보기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentPosts.map((post) => (
            <Link key={post.id} href={`/analysis/${post.slug}`}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="mb-2">{post.category}</Badge>
                    <Badge variant={post.rating.includes('분석') ? 'default' : post.rating.includes('트렌드') ? 'secondary' : 'outline'} className="text-xs">
                      {post.rating}
                    </Badge>
                  </div>
                  <h4 className="font-semibold mb-2 line-clamp-2 hover:text-primary transition-colors">{post.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {post.content}
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span className="font-medium">{post.author}</span>
                  <div className="flex items-center gap-2">
                    <span>{new Date(post.created_date).toLocaleDateString('ko-KR')}</span>
                    <span>•</span>
                    <span>{post.views?.toLocaleString()} 조회</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 메르 블로그 최신 포스트 */}
      <section className="py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">🎭 메르 블로그</h2>
          <Button variant="ghost" asChild>
            <Link href="/merry">
              전체보기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {merryPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {merryPosts.map((post) => (
              <Card key={post.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <Badge variant="secondary" className="mb-2">{post.category}</Badge>
                  <h4 className="font-semibold mb-2 line-clamp-2">
                    <Link href={`/merry/${post.id}`} className="hover:text-primary transition-colors">
                      {post.title}
                    </Link>
                  </h4>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {post.excerpt || post.content}
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{new Date(post.created_date).toLocaleDateString('ko-KR')}</span>
                  <span>{post.views || 0} 조회</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>메르 블로그 포스트를 불러오는 중...</p>
          </div>
        )}
      </section>

      {/* 간단한 안내 섹션 */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold mb-4">투자 데이터 분석</h3>
          <p className="text-muted-foreground">실시간 SEC 13F 데이터와 기관투자자 포트폴리오 분석</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <h4 className="text-xl font-semibold mb-4">🤖 AI 금융 큐레이션</h4>
            <p className="text-muted-foreground mb-4">
              Goldman Sachs, Bloomberg, BlackRock AI 에이전트가 분석한 맞춤형 금융 인사이트
            </p>
            <Button asChild>
              <Link href="/financial-curation">
                큐레이션 보기
                <Brain className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Card>
          
          <Card className="p-6">
            <h4 className="text-xl font-semibold mb-4">🏛️ 국민연금 포트폴리오</h4>
            <p className="text-muted-foreground mb-4">
              한국 국민연금공단의 해외주식 투자 현황을 실시간으로 추적합니다.
            </p>
            <Button asChild variant="outline">
              <Link href="/investment">
                자세히 보기
                <BarChart3 className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Card>

          <Card className="p-6">
            <h4 className="text-xl font-semibold mb-4">🌍 글로벌 기관투자자</h4>
            <p className="text-muted-foreground mb-4">
              버크셔 해서웨이, 타이거 글로벌 등 주요 기관투자자 비교 분석
            </p>
            <Button asChild variant="outline">
              <Link href="/institutional-investors">
                비교하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Card>

          <Card className="p-6">
            <h4 className="text-xl font-semibold mb-4">🎭 메르 블로그</h4>
            <p className="text-muted-foreground mb-4">
              우리형 메르의 일상과 투자 이야기를 만나보세요
            </p>
            <Button asChild variant="outline">
              <Link href="/merry">
                구경하기
                <User className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
}