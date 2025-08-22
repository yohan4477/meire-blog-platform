'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, TrendingUp, BarChart3, User, Bell, Brain } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('profile');

  // 🚀 병렬 API 호출로 성능 최적화
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      
      try {
        // 핵심 데이터 로딩 (올바른 API 엔드포인트 사용)
        const merryResponse = await fetch('/api/merry/posts?limit=2').catch(err => ({ error: err }));

        // 메르 블로그 포스트 처리 (안전한 JSON 파싱)
        if ('error' in merryResponse) {
          console.warn('메르 블로그 fetch 실패:', merryResponse.error);
        } else {
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

        // financial-curation 관련 코드 모두 제거

      } catch (error) {
        console.error('데이터 로딩 실패:', error);
        
        // 에러 발생시 빈 데이터 처리 (가짜 데이터 제거)
        setMerryPosts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, []);


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
              <Button variant="default" size="lg" asChild className="w-full sm:w-auto min-w-0 text-sm sm:text-base">
                <Link href="/merry/weekly-report" className="flex items-center justify-center">
                  <span className="truncate">📊 메르 주간보고</span>
                  <BarChart3 className="ml-2 h-4 w-4 flex-shrink-0" />
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
            {/* AI 금융 큐레이션 섹션 제거됨 */}
            <div className="bg-card rounded-lg p-6">
              <div className="text-center text-muted-foreground">
                <p>AI 금융 큐레이션 기능이 제거되었습니다.</p>
              </div>
            </div>
          </TabsContent>


          <TabsContent value="profile" className="mt-6">
            <MerryProfileTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* 국민연금 분석 & 에이전트 관리 (맨 하단 배치) */}
      <section className="bg-card border-t">
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
    </div>
  );
}