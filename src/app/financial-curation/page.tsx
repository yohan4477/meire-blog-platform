'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialCurationDashboard } from '@/components/financial/FinancialCurationDashboard';
import { 
  Settings, 
  User, 
  Bell, 
  TrendingUp, 
  BarChart3,
  Newspaper,
  Brain,
  Target,
  Clock,
  Star
} from 'lucide-react';
import { ExtendedUserProfile, UserPreferences } from '@/lib/user-profile-manager';
import { subscribeToNotifications, Notification } from '@/lib/notification-system';

export default function FinancialCurationPage() {
  const [userProfile, setUserProfile] = useState<ExtendedUserProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isProfileSetup, setIsProfileSetup] = useState(false);
  const userId = 'demo_user'; // 실제 구현에서는 인증된 사용자 ID

  // 사용자 프로필 로드
  useEffect(() => {
    loadUserProfile();
  }, []);

  // 알림 구독
  useEffect(() => {
    if (userProfile) {
      const unsubscribe = subscribeToNotifications(userId, (notification) => {
        setNotifications(prev => [notification, ...prev.slice(0, 9)]); // 최대 10개
      });
      
      return unsubscribe;
    }
  }, [userProfile, userId]);

  const loadUserProfile = async () => {
    try {
      // 사용자 프로필 로드 또는 기본 프로필 생성
      const stored = localStorage.getItem(`user_profile_${userId}`);
      
      if (stored) {
        const profile = JSON.parse(stored) as ExtendedUserProfile;
        setUserProfile(profile);
        setIsProfileSetup(true);
      } else {
        // 기본 프로필 생성
        const defaultProfile: ExtendedUserProfile = {
          id: userId,
          interests: ['technology', 'AI', 'market analysis'],
          sectors: ['Technology', 'Finance'],
          portfolio_symbols: ['AAPL', 'GOOGL', 'MSFT'],
          risk_tolerance: 'MEDIUM',
          news_frequency: 'HOURLY',
          content_types: ['NEWS', 'ANALYSIS', 'INSIGHTS'],
          email: '',
          created_date: new Date().toISOString(),
          last_active: new Date().toISOString(),
          preferences: {
            notifications_enabled: true,
            notification_types: ['BREAKING', 'DIGEST', 'PORTFOLIO'],
            update_frequency: 'HOURLY',
            digest_time: '09:00',
            email_notifications: false,
            push_notifications: true,
            theme_preference: 'AUTO',
            language: 'ko'
          },
          subscription_tier: 'FREE',
          api_usage: {
            daily_requests: 0,
            monthly_requests: 0,
            last_reset: new Date().toISOString()
          }
        };
        
        setUserProfile(defaultProfile);
        localStorage.setItem(`user_profile_${userId}`, JSON.stringify(defaultProfile));
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const updateUserProfile = async (updates: Partial<ExtendedUserProfile>) => {
    if (!userProfile) return;
    
    const updatedProfile = { ...userProfile, ...updates };
    setUserProfile(updatedProfile);
    localStorage.setItem(`user_profile_${userId}`, JSON.stringify(updatedProfile));
    
    // API로 서버에도 업데이트
    try {
      await fetch('/api/financial-curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          userId,
          profile: updatedProfile
        })
      });
    } catch (error) {
      console.error('Failed to update profile on server:', error);
    }
  };

  if (!userProfile) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">금융 콘텐츠 큐레이션</h1>
            <p className="text-muted-foreground mt-1">
AI 에이전트가 분석한 개인화된 금융 인사이트</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* 알림 버튼 */}
            <div className="relative">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {notifications.filter(n => !n.read).length}
                  </Badge>
                )}
              </Button>
            </div>
            
            {/* 사용자 메뉴 */}
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              {userProfile.subscription_tier}
            </Button>
          </div>
        </div>
        
        {/* 사용자 상태 정보 */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">
            <Target className="h-3 w-3 mr-1" />
            {userProfile.sectors.length}개 섹터
          </Badge>
          <Badge variant="secondary">
            <BarChart3 className="h-3 w-3 mr-1" />
            {userProfile.portfolio_symbols?.length || 0}개 종목
          </Badge>
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {userProfile.preferences.update_frequency}
          </Badge>
          <Badge variant="outline">
            <Star className="h-3 w-3 mr-1" />
            위험도: {userProfile.risk_tolerance}
          </Badge>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            대시보드
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Brain className="h-4 w-4 mr-2" />
            AI 인사이트
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            알림
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            설정
          </TabsTrigger>
        </TabsList>

        {/* 대시보드 */}
        <TabsContent value="dashboard">
          <FinancialCurationDashboard 
            userId={userId}
            portfolioSymbols={userProfile.portfolio_symbols}
          />
        </TabsContent>

        {/* AI 인사이트 */}
        <TabsContent value="insights">
          <AIInsightsSection userProfile={userProfile} />
        </TabsContent>

        {/* 알림 */}
        <TabsContent value="notifications">
          <NotificationsSection 
            notifications={notifications}
            onMarkAsRead={(ids) => {
              setNotifications(prev => 
                prev.map(n => 
                  ids.includes(n.id) ? { ...n, read: true } : n
                )
              );
            }}
          />
        </TabsContent>

        {/* 설정 */}
        <TabsContent value="settings">
          <SettingsSection 
            userProfile={userProfile}
            onUpdateProfile={updateUserProfile}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// AI 인사이트 섹션
function AIInsightsSection({ userProfile }: { userProfile: ExtendedUserProfile }) {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      // AI 에이전트들로부터 인사이트 생성
      const [goldmanResponse, bloombergResponse, blackrockResponse] = await Promise.all([
        fetch('/api/ai-agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_type: 'goldman_sachs',
            action: 'market_outlook',
            parameters: { timeframe: '1W' }
          })
        }),
        fetch('/api/ai-agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_type: 'bloomberg',
            action: 'market_summary',
            parameters: {}
          })
        }),
        fetch('/api/ai-agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_type: 'blackrock',
            action: 'asset_allocation',
            parameters: {
              riskProfile: userProfile.risk_tolerance.toLowerCase(),
              timeHorizon: '1Y'
            }
          })
        })
      ]);
      
      const [goldman, bloomberg, blackrock] = await Promise.all([
        goldmanResponse.json(),
        bloombergResponse.json(),
        blackrockResponse.json()
      ]);
      
      const generatedInsights = [
        {
          id: 'goldman_outlook',
          agent: 'Goldman Sachs',
          title: '주간 시장 전망',
          data: goldman.data,
          confidence: goldman.metadata?.confidence_score || 0.8,
          generated_at: new Date().toISOString()
        },
        {
          id: 'bloomberg_summary',
          agent: 'Bloomberg',
          title: '시장 요약',
          data: bloomberg.data,
          confidence: bloomberg.metadata?.confidence_score || 0.85,
          generated_at: new Date().toISOString()
        },
        {
          id: 'blackrock_allocation',
          agent: 'BlackRock',
          title: '자산 배분 추천',
          data: blackrock.data,
          confidence: blackrock.metadata?.confidence_score || 0.75,
          generated_at: new Date().toISOString()
        }
      ];
      
      setInsights(generatedInsights);
      
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">AI 에이전트 인사이트</h3>
        <Button onClick={generateInsights} disabled={loading}>
          {loading ? '생성 중...' : '인사이트 생성'}
        </Button>
      </div>
      
      {insights.length === 0 ? (
        <Card className="p-8 text-center">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
AI 에이전트들이 당신을 위한 맞춤 인사이트를 준비하고 있습니다.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}

// 인사이트 카드
function InsightCard({ insight }: { insight: any }) {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline">{insight.agent}</Badge>
          <div className="flex items-center space-x-1">
            <Star className="h-3 w-3 text-yellow-500" />
            <span className="text-xs font-medium">
              {(insight.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        
        <h4 className="font-semibold">{insight.title}</h4>
        
        <div className="text-sm text-muted-foreground">
          {insight.data && typeof insight.data === 'object' ? (
            <pre className="whitespace-pre-wrap text-xs">
              {JSON.stringify(insight.data, null, 2)}
            </pre>
          ) : (
            <p>{insight.data}</p>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          생성 시간: {new Date(insight.generated_at).toLocaleString('ko-KR')}
        </div>
      </div>
    </Card>
  );
}

// 알림 섹션
function NotificationsSection({ 
  notifications, 
  onMarkAsRead 
}: { 
  notifications: Notification[];
  onMarkAsRead: (ids: string[]) => void;
}) {
  const markAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    onMarkAsRead(unreadIds);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">알림</h3>
        {notifications.filter(n => !n.read).length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            모두 읽음 처리
          </Button>
        )}
      </div>
      
      {notifications.length === 0 ? (
        <Card className="p-8 text-center">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">아직 알림이 없습니다.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationCard 
              key={notification.id} 
              notification={notification}
              onMarkAsRead={() => onMarkAsRead([notification.id])}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 알림 카드
function NotificationCard({ 
  notification, 
  onMarkAsRead 
}: { 
  notification: Notification;
  onMarkAsRead: () => void;
}) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'destructive';
      case 'HIGH': return 'default';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card className={`p-4 ${!notification.read ? 'border-l-4 border-l-blue-500' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Badge variant={getPriorityColor(notification.priority)}>
              {notification.type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {notification.priority}
            </Badge>
          </div>
          
          <h4 className="font-medium text-sm">{notification.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
          
          <div className="text-xs text-muted-foreground mt-2">
            {new Date(notification.created_at).toLocaleString('ko-KR')}
          </div>
        </div>
        
        {!notification.read && (
          <Button variant="ghost" size="sm" onClick={onMarkAsRead}>
            읽음
          </Button>
        )}
      </div>
    </Card>
  );
}

// 설정 섹션
function SettingsSection({ 
  userProfile, 
  onUpdateProfile 
}: { 
  userProfile: ExtendedUserProfile;
  onUpdateProfile: (updates: Partial<ExtendedUserProfile>) => void;
}) {
  const [portfolioSymbols, setPortfolioSymbols] = useState(
    userProfile.portfolio_symbols?.join(', ') || ''
  );
  const [interests, setInterests] = useState(
    userProfile.interests.join(', ')
  );
  const [sectors, setSectors] = useState(
    userProfile.sectors.join(', ')
  );

  const saveSettings = () => {
    onUpdateProfile({
      portfolio_symbols: portfolioSymbols.split(',').map(s => s.trim()).filter(Boolean),
      interests: interests.split(',').map(s => s.trim()).filter(Boolean),
      sectors: sectors.split(',').map(s => s.trim()).filter(Boolean)
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">설정</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h4 className="font-medium mb-4">포트폴리오 설정</h4>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">관심 종목 (쉼표로 구분)</label>
              <input 
                type="text" 
                value={portfolioSymbols}
                onChange={(e) => setPortfolioSymbols(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
                placeholder="AAPL, GOOGL, MSFT"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">관심 사 (쉼표로 구분)</label>
              <input 
                type="text" 
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
                placeholder="technology, AI, blockchain"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">관심 섹터 (쉼표로 구분)</label>
              <input 
                type="text" 
                value={sectors}
                onChange={(e) => setSectors(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
                placeholder="Technology, Finance, Healthcare"
              />
            </div>
            
            <Button onClick={saveSettings} className="w-full">
              설정 저장
            </Button>
          </div>
        </Card>
        
        <Card className="p-6">
          <h4 className="font-medium mb-4">알림 설정</h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">브레이킹 뉴스</span>
              <input 
                type="checkbox" 
                checked={userProfile.preferences.notification_types.includes('BREAKING')}
                onChange={(e) => {
                  const types = e.target.checked 
                    ? [...userProfile.preferences.notification_types, 'BREAKING']
                    : userProfile.preferences.notification_types.filter(t => t !== 'BREAKING');
                  onUpdateProfile({
                    preferences: {
                      ...userProfile.preferences,
                      notification_types: types as any
                    }
                  });
                }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">일일 다이제스트</span>
              <input 
                type="checkbox" 
                checked={userProfile.preferences.notification_types.includes('DIGEST')}
                onChange={(e) => {
                  const types = e.target.checked 
                    ? [...userProfile.preferences.notification_types, 'DIGEST']
                    : userProfile.preferences.notification_types.filter(t => t !== 'DIGEST');
                  onUpdateProfile({
                    preferences: {
                      ...userProfile.preferences,
                      notification_types: types as any
                    }
                  });
                }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">포트폴리오 알림</span>
              <input 
                type="checkbox" 
                checked={userProfile.preferences.notification_types.includes('PORTFOLIO')}
                onChange={(e) => {
                  const types = e.target.checked 
                    ? [...userProfile.preferences.notification_types, 'PORTFOLIO']
                    : userProfile.preferences.notification_types.filter(t => t !== 'PORTFOLIO');
                  onUpdateProfile({
                    preferences: {
                      ...userProfile.preferences,
                      notification_types: types as any
                    }
                  });
                }}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}