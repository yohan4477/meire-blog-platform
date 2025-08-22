'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  FileText,
  Brain,
  Target,
  Clock,
  Activity,
  ArrowRight,
  Plus,
  RefreshCw
} from 'lucide-react';

/**
 * 메르 주간보고 메인 대시보드
 * 
 * 기능:
 * - 주간보고서 리스트 표시
 * - 대시보드 지표 요약
 * - 카테고리별 분석 현황
 * - 종목 트렌드 요약
 * - 새 보고서 생성 기능
 * 
 * @author Meire Blog Platform
 * @created 2025-08-21
 */

interface WeeklyReport {
  id: number;
  weekRange: {
    start: string;
    end: string;
  };
  reportDate: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  title: string;
  summary: string;
  stats: {
    totalPosts: number;
    analyzedPosts: number;
    stockTrends: number;
    aiInsights: number;
    stockMentions: number;
  };
  generatedAt?: string;
  createdAt: string;
}

interface DashboardStats {
  totalReports: number;
  weeklyPosts: number;
  stockMentions: number;
  avgSentiment: number;
}

export default function WeeklyReportPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // 데이터 로딩
  useEffect(() => {
    loadWeeklyReports();
    loadDashboardStats();
  }, []);

  const loadWeeklyReports = async () => {
    try {
      const response = await fetch('/api/merry/weekly-reports?limit=10');
      const result = await response.json();
      
      if (result.success) {
        setReports(result.data || []);
      } else {
        console.error('주간보고서 로딩 실패:', result.error);
      }
    } catch (error) {
      console.error('API 호출 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      // 실제 통계 계산
      const totalReports = reports.length;
      const weeklyPosts = reports.reduce((sum, report) => sum + (report.stats?.totalPosts || 0), 0);
      const stockMentions = reports.reduce((sum, report) => sum + (report.stats?.stockMentions || 0), 0);
      const avgPostsPerWeek = totalReports > 0 ? Math.round(weeklyPosts / totalReports) : 0;
      
      setDashboardStats({
        totalReports,
        weeklyPosts: avgPostsPerWeek,
        stockMentions,
        avgSentiment: 0 // 감정 분석은 별도 계산 필요
      });
    } catch (error) {
      console.error('대시보드 통계 로딩 실패:', error);
    }
  };

  const generateNewReport = async () => {
    if (generating) return;

    setGenerating(true);
    
    try {
      // 지난 주 날짜 계산
      const now = new Date();
      const lastWeekStart = new Date(now);
      const lastWeekEnd = new Date(now);
      
      // 지난 주 월요일부터 일요일까지
      lastWeekStart.setDate(now.getDate() - now.getDay() - 6);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);

      const response = await fetch('/api/merry/weekly-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weekStartDate: lastWeekStart.toISOString().split('T')[0],
          weekEndDate: lastWeekEnd.toISOString().split('T')[0]
        })
      });

      const result = await response.json();
      
      if (result.success) {
        await loadWeeklyReports();
        alert('새로운 주간보고서가 생성되었습니다!');
      } else {
        alert(`보고서 생성 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('보고서 생성 실패:', error);
      alert('보고서 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'generating': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <TrendingUp className="h-4 w-4" />;
      case 'generating': return <Clock className="h-4 w-4" />;
      case 'failed': return <TrendingDown className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  const formatWeekRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    return `${startDate.getMonth() + 1}월 ${startDate.getDate()}일 ~ ${endDate.getMonth() + 1}월 ${endDate.getDate()}일`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            📊 메르 주간보고
          </h1>
          <p className="text-muted-foreground">
            메르의 투자 인사이트를 주간 단위로 분석하고 시각화합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadWeeklyReports}
            disabled={generating}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button 
            onClick={generateNewReport}
            disabled={generating}
            size="sm"
          >
            {generating ? (
              <Clock className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            새 보고서 생성
          </Button>
        </div>
      </div>

      {/* 대시보드 통계 카드 */}
      {dashboardStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  총 보고서
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {dashboardStats.totalReports}
                </p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  주간 포스트
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {dashboardStats.weeklyPosts}
                </p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  종목 언급
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {dashboardStats.stockMentions}
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  평균 감정
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {(dashboardStats.avgSentiment * 100).toFixed(1)}%
                </p>
              </div>
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
        </div>
      )}

      {/* 탭 컨텐츠 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="reports">보고서 리스트</TabsTrigger>
          <TabsTrigger value="analytics">분석 현황</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* 최근 보고서 하이라이트 */}
          {reports.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                최신 주간보고서
              </h3>
              <div className="space-y-4">
                {reports.slice(0, 3).map((report) => (
                  <div key={report.id} className="border-l-4 border-primary pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground">
                        {report.title}
                      </h4>
                      <Badge className={getStatusColor(report.status)}>
                        {getStatusIcon(report.status)}
                        <span className="ml-1">
                          {report.status === 'completed' ? '완료' : 
                           report.status === 'generating' ? '생성중' : 
                           report.status === 'failed' ? '실패' : '대기중'}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      📅 {formatWeekRange(report.weekRange.start, report.weekRange.end)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {report.summary}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex space-x-4 text-xs text-muted-foreground">
                        <span>📝 {report.stats.totalPosts}개 포스트</span>
                        <span>📊 {report.stats.stockTrends}개 종목</span>
                        <span>🧠 {report.stats.aiInsights}개 인사이트</span>
                      </div>
                      {report.status === 'completed' && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/merry/weekly-report/${report.id}`}>
                            자세히 보기 <ArrowRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 빈 상태 */}
          {reports.length === 0 && (
            <Card className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">주간보고서가 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                새로운 주간보고서를 생성하여 메르의 투자 인사이트를 분석해보세요.
              </p>
              <Button onClick={generateNewReport} disabled={generating}>
                <Plus className="h-4 w-4 mr-2" />
                첫 번째 보고서 생성하기
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {report.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      📅 {formatWeekRange(report.weekRange.start, report.weekRange.end)} · 
                      생성일: {formatDate(report.createdAt)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(report.status)}>
                    {getStatusIcon(report.status)}
                    <span className="ml-1">
                      {report.status === 'completed' ? '완료' : 
                       report.status === 'generating' ? '생성중' : 
                       report.status === 'failed' ? '실패' : '대기중'}
                    </span>
                  </Badge>
                </div>
                
                <p className="text-muted-foreground mb-4">
                  {report.summary}
                </p>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {report.stats.totalPosts}
                    </p>
                    <p className="text-xs text-muted-foreground">총 포스트</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {report.stats.stockTrends}
                    </p>
                    <p className="text-xs text-muted-foreground">종목 트렌드</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {report.stats.aiInsights}
                    </p>
                    <p className="text-xs text-muted-foreground">AI 인사이트</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {report.stats.stockMentions}
                    </p>
                    <p className="text-xs text-muted-foreground">종목 언급</p>
                  </div>
                </div>
                
                {report.status === 'completed' && (
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/merry/weekly-report/${report.id}`}>
                        상세 보고서 보기 <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">카테고리별 분석 현황</h3>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center py-4">
                  보고서를 생성하면 카테고리별 분석이 표시됩니다.
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">주요 종목 트렌드</h3>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center py-4">
                  보고서를 생성하면 종목 트렌드가 표시됩니다.
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}