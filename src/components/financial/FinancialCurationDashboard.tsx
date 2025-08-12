'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  Newspaper, 
  BarChart3, 
  Filter,
  RefreshCw,
  Bell,
  Eye,
  ExternalLink,
  Star
} from 'lucide-react';
import { CuratedContent, NewsItem } from '@/lib/financial-news-curator';

interface DashboardData {
  curated_content: CuratedContent[];
  daily_digest: {
    summary: string;
    top_stories: NewsItem[];
    market_outlook: any;
    sectors_in_focus: string[];
  };
  breaking_news: NewsItem[];
  portfolio_impact?: any;
}

interface FinancialCurationDashboardProps {
  userId?: string;
  portfolioSymbols?: string[];
  className?: string;
}

export function FinancialCurationDashboard({ 
  userId = 'default', 
  portfolioSymbols = [],
  className = ''
}: FinancialCurationDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('digest');
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);

  // 데이터 로드
  useEffect(() => {
    loadDashboardData();
    
    // 주기적 업데이트 (30초마다)
    const interval = setInterval(() => {
      checkForUpdates();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [userId]);

  // 대시보드 데이터 로드
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 병렬로 데이터 요청
      const [curatedResponse, digestResponse, breakingResponse] = await Promise.all([
        fetch(`/api/financial-curation?action=curated&userId=${userId}`),
        fetch('/api/financial-curation?action=digest'),
        fetch('/api/financial-curation?action=breaking')
      ]);
      
      const [curatedData, digestData, breakingData] = await Promise.all([
        curatedResponse.json(),
        digestResponse.json(),
        breakingResponse.json()
      ]);
      
      // 포트폴리오 영향 분석 (포트폴리오가 있는 경우)
      let portfolioImpact = null;
      if (portfolioSymbols.length > 0) {
        const impactResponse = await fetch('/api/financial-curation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'analyze_portfolio_impact',
            portfolioSymbols
          })
        });
        const impactData = await impactResponse.json();
        portfolioImpact = impactData.success ? impactData.data : null;
      }
      
      setDashboardData({
        curated_content: curatedData.success ? curatedData.data : [],
        daily_digest: digestData.success ? digestData.data : {
          summary: '',
          top_stories: [],
          market_outlook: {},
          sectors_in_focus: []
        },
        breaking_news: breakingData.success ? breakingData.data : [],
        portfolio_impact: portfolioImpact
      });
      
      // 브레이킹 뉴스 알림
      if (breakingData.success && breakingData.data.length > 0) {
        const newNotifications = breakingData.data.map((news: NewsItem) => 
          `🚨 브레이킹: ${news.title}`
        );
        setNotifications(prev => [...prev, ...newNotifications]);
      }
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 업데이트 체크
  const checkForUpdates = async () => {
    try {
      const response = await fetch('/api/financial-curation?action=breaking');
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        // 새로운 브레이킹 뉴스가 있는지 확인
        const existingIds = dashboardData?.breaking_news.map(n => n.id) || [];
        const newBreakingNews = data.data.filter((news: NewsItem) => 
          !existingIds.includes(news.id)
        );
        
        if (newBreakingNews.length > 0) {
          // 새로운 뉴스 알림
          const newNotifications = newBreakingNews.map((news: NewsItem) => 
            `🔥 새로운 브레이킹: ${news.title}`
          );
          setNotifications(prev => [...prev, ...newNotifications]);
          
          // 대시보드 데이터 업데이트
          setDashboardData(prev => prev ? {
            ...prev,
            breaking_news: [...newBreakingNews, ...prev.breaking_news]
          } : null);
        }
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  };

  // 수동 새로고침
  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      // 강제 새로고침 요청
      await fetch('/api/financial-curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force_refresh' })
      });
      
      // 데이터 재로드
      await loadDashboardData();
      
      setNotifications(prev => [
        ...prev, 
        '✨ 콘텐츠가 성공적으로 업데이트되었습니다!'
      ]);
      
    } catch (error) {
      console.error('Refresh failed:', error);
      setNotifications(prev => [
        ...prev, 
        '⚠️ 새로고침에 실패했습니다. 다시 시도해주세요.'
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // 알림 제거
  const dismissNotification = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">금융 콘텐츠 큐레이션</h2>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">콘텐츠 로드 중...</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">데이터를 불러오는데 실패했습니다.</p>
        <Button onClick={loadDashboardData} className="mt-4">
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">금융 콘텐츠 큐레이션</h2>
          <p className="text-muted-foreground">
AI 에이전트가 큐레이션한 실시간 금융 인사이트</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* 알림 버튼 */}
          <div className="relative">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {notifications.length}
                </Badge>
              )}
            </Button>
          </div>
          
          {/* 새로고침 버튼 */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </div>

      {/* 알림 목록 */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.slice(0, 3).map((notification, index) => (
            <Card key={index} className="p-3 bg-orange-50 border-orange-200">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-orange-800">{notification}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => dismissNotification(index)}
                >
                  ×
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 주요 메트릭 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Newspaper className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">오늘의 탑 뉴스</p>
              <p className="text-2xl font-bold">{dashboardData.daily_digest.top_stories.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">큐레이션된 콘텐츠</p>
              <p className="text-2xl font-bold">{dashboardData.curated_content.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">브레이킹 뉴스</p>
              <p className="text-2xl font-bold">{dashboardData.breaking_news.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">주요 섹터</p>
              <p className="text-2xl font-bold">{dashboardData.daily_digest.sectors_in_focus.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 메인 콘텐츠 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="digest">오늘의 요약</TabsTrigger>
          <TabsTrigger value="curated">큐레이션 콘텐츠</TabsTrigger>
          <TabsTrigger value="breaking">브레이킹 뉴스</TabsTrigger>
          <TabsTrigger value="portfolio">포트폴리오 영향</TabsTrigger>
        </TabsList>

        {/* 오늘의 요약 */}
        <TabsContent value="digest" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">오늘의 시장 요약</h3>
            <p className="text-muted-foreground mb-4">{dashboardData.daily_digest.summary}</p>
            
            {/* 주요 섹터 */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">주요 섹터</h4>
              <div className="flex flex-wrap gap-2">
                {dashboardData.daily_digest.sectors_in_focus.map((sector, index) => (
                  <Badge key={index} variant="secondary">{sector}</Badge>
                ))}
              </div>
            </div>
            
            {/* 시장 전망 */}
            {dashboardData.daily_digest.market_outlook && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">시장 전망</h4>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm">
                    전반적 전망: <Badge variant="outline">
                      {dashboardData.daily_digest.market_outlook.overall_sentiment || '중립'}
                    </Badge>
                  </p>
                </div>
              </div>
            )}
          </Card>
          
          {/* 탑 스토리 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData.daily_digest.top_stories.map((story, index) => (
              <NewsCard key={story.id} news={story} rank={index + 1} />
            ))}
          </div>
        </TabsContent>

        {/* 큐레이션 콘텐츠 */}
        <TabsContent value="curated" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">개인화된 콘텐츠</h3>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                필터
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {dashboardData.curated_content.map((content) => (
              <CuratedContentCard key={content.id} content={content} />
            ))}
          </div>
        </TabsContent>

        {/* 브레이킹 뉴스 */}
        <TabsContent value="breaking" className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold">브레이킹 뉴스</h3>
            <Badge variant="destructive">{dashboardData.breaking_news.length}</Badge>
          </div>
          
          {dashboardData.breaking_news.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">오늘은 브레이킹 뉴스가 없습니다.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {dashboardData.breaking_news.map((news) => (
                <NewsCard key={news.id} news={news} isBreaking />
              ))}
            </div>
          )}
        </TabsContent>

        {/* 포트폴리오 영향 */}
        <TabsContent value="portfolio" className="space-y-4">
          {dashboardData.portfolio_impact ? (
            <PortfolioImpactCard impact={dashboardData.portfolio_impact} />
          ) : (
            <Card className="p-8 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">포트폴리오 정보가 설정되지 않았습니다.</p>
              <p className="text-sm text-muted-foreground">포트폴리오 종목을 설정하면 맞춤형 영향 분석을 받아볼 수 있습니다.</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 뉴스 카드 컴포넌트
function NewsCard({ news, rank, isBreaking = false }: {
  news: NewsItem;
  rank?: number;
  isBreaking?: boolean;
}) {
  const getImpactBadgeVariant = (impact?: string) => {
    switch (impact) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className={`p-4 ${isBreaking ? 'border-red-200 bg-red-50' : ''}`}>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {rank && (
                <Badge variant="outline" className="text-xs">
                  #{rank}
                </Badge>
              )}
              {isBreaking && (
                <Badge variant="destructive" className="text-xs">
                  브레이킹
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">{news.source}</Badge>
              {news.sector && (
                <Badge variant="outline" className="text-xs">{news.sector}</Badge>
              )}
            </div>
            
            <h4 className="font-semibold text-sm leading-tight mb-2">
              {news.title}
            </h4>
            
            <p className="text-xs text-muted-foreground line-clamp-2">
              {news.summary || news.content}
            </p>
          </div>
          
          <div className="flex flex-col items-end space-y-1 ml-3">
            {news.investment_impact && (
              <Badge 
                variant={getImpactBadgeVariant(news.investment_impact)}
                className="text-xs"
              >
                {news.investment_impact}
              </Badge>
            )}
            {news.importance_score && (
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-500" />
                <span className="text-xs font-medium">
                  {(news.importance_score * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3" />
            <span>{new Date(news.published_date).toLocaleString('ko-KR')}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {news.related_stocks && news.related_stocks.length > 0 && (
              <div className="flex items-center space-x-1">
                <BarChart3 className="h-3 w-3" />
                <span>{news.related_stocks.join(', ')}</span>
              </div>
            )}
            
            <Button variant="ghost" size="sm" asChild>
              <a href={news.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// 큐레이션된 콘텐츠 카드
function CuratedContentCard({ content }: { content: CuratedContent }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'NEWS': return <Newspaper className="h-4 w-4" />;
      case 'ANALYSIS': return <BarChart3 className="h-4 w-4" />;
      case 'INSIGHT': return <TrendingUp className="h-4 w-4" />;
      default: return <Newspaper className="h-4 w-4" />;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'NEWS': return 'secondary';
      case 'ANALYSIS': return 'default';
      case 'INSIGHT': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant={getTypeBadgeVariant(content.type)} className="text-xs">
                <span className="mr-1">{getTypeIcon(content.type)}</span>
                {content.type}
              </Badge>
              <Badge variant="outline" className="text-xs">{content.source}</Badge>
            </div>
            
            <h4 className="font-semibold text-sm leading-tight mb-2">
              {content.title}
            </h4>
            
            <p className="text-xs text-muted-foreground line-clamp-3">
              {content.content}
            </p>
          </div>
          
          <div className="flex flex-col items-end space-y-1 ml-3">
            <div className="flex items-center space-x-1">
              <Star className="h-3 w-3 text-yellow-500" />
              <span className="text-xs font-medium">
                {(content.relevance_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {content.tags.slice(0, 5).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3" />
            <span>{new Date(content.created_date).toLocaleString('ko-KR')}</span>
          </div>
          
          {content.user_match_score && (
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3" />
              <span>매칭도 {(content.user_match_score * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// 포트폴리오 영향 카드
function PortfolioImpactCard({ impact }: { impact: any }) {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">포트폴리오 영향 분석</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{impact.total_portfolio_exposure}</p>
            <p className="text-xs text-muted-foreground">관련 뉴스</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{impact.high_impact_news}</p>
            <p className="text-xs text-muted-foreground">고영햤 뉴스</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{impact.positive_sentiment}</p>
            <p className="text-xs text-muted-foreground">긍정적 감정</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{(impact.risk_score * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">위험 지수</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">영향받는 종목</h4>
            <div className="flex flex-wrap gap-2">
              {impact.affected_symbols.map((symbol: string, index: number) => (
                <Badge key={index} variant="outline">{symbol}</Badge>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">추천 사항</h4>
            <ul className="space-y-1">
              {impact.recommendations.map((rec: string, index: number) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start">
                  <span className="mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default FinancialCurationDashboard;