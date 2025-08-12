'use client';

import Link from 'next/link';
import { Search, BarChart3, BookOpen, User, PieChart, Brain, Bot, Home, TrendingUp, Activity, Menu, X, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { useState } from 'react';

export default function Header() {
  const [isAgentActive, setIsAgentActive] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'AI 포트폴리오 분석 완료',
      message: 'Goldman Sachs 에이전트가 최신 포트폴리오 분석을 완료했습니다.',
      time: '5분 전',
      type: 'success',
      read: false
    },
    {
      id: 2,
      title: '국민연금 새로운 13F 파일링',
      message: '국민연금공단의 새로운 13F 파일링이 SEC에 제출되었습니다.',
      time: '15분 전',
      type: 'info',
      read: false
    },
    {
      id: 3,
      title: '시장 변동성 경고',
      message: 'BlackRock 에이전트가 높은 시장 변동성을 감지했습니다.',
      time: '1시간 전',
      type: 'warning',
      read: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const navigationItems = [
    { href: "/", label: "홈", icon: Home },
    { href: "/financial-curation", label: "AI 큐레이션", icon: Brain },
    { href: "/investment", label: "국민연금 분석", icon: BarChart3 },
    { href: "/institutional-investors", label: "기관투자자", icon: TrendingUp },
    { href: "/agent-workflows", label: "에이전트", icon: Activity, badge: isAgentActive ? "Live" : null },
    { href: "/merry", label: "메르 블로그", icon: User },
  ];
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none">요르의 투자 플랫폼</span>
              <span className="text-xs text-muted-foreground">니가 뭘 알아. 니가 뭘 아냐고</span>
            </div>
          </Link>

          {/* 네비게이션 */}
          <nav className="hidden xl:flex items-center space-x-1">
            <Link 
              href="/" 
              className="px-3 py-2 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors flex items-center space-x-1"
            >
              <Home className="h-4 w-4" />
              <span>홈</span>
            </Link>
            <Link 
              href="/financial-curation" 
              className="px-3 py-2 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors flex items-center space-x-1"
            >
              <Brain className="h-4 w-4" />
              <span>AI 큐레이션</span>
            </Link>
            <Link 
              href="/investment" 
              className="px-3 py-2 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors flex items-center space-x-1"
            >
              <BarChart3 className="h-4 w-4" />
              <span>국민연금 분석</span>
            </Link>
            <Link 
              href="/institutional-investors" 
              className="px-3 py-2 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors flex items-center space-x-1"
            >
              <TrendingUp className="h-4 w-4" />
              <span>기관투자자</span>
            </Link>
            <Link 
              href="/agent-workflows" 
              className="px-3 py-2 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors flex items-center space-x-1"
            >
              <Activity className="h-4 w-4" />
              <span>에이전트</span>
              {isAgentActive && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
                  Live
                </Badge>
              )}
            </Link>
            <Link 
              href="/merry" 
              className="px-3 py-2 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors flex items-center space-x-1"
            >
              <User className="h-4 w-4" />
              <span>메르 블로그</span>
            </Link>
          </nav>

          {/* 검색 및 액션 */}
          <div className="flex items-center space-x-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="검색..."
                className="pl-10 w-48 lg:w-64"
              />
            </div>
            <Button variant="ghost" size="icon" className="sm:hidden">
              <Search className="h-5 w-5" />
            </Button>

            {/* 알림 시스템 */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-96">
                <SheetHeader>
                  <SheetTitle>알림</SheetTitle>
                  <SheetDescription>
                    최신 AI 분석 결과와 시장 정보를 확인하세요
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-4 rounded-lg border transition-colors ${
                        notification.read 
                          ? 'bg-gray-50 border-gray-200' 
                          : 'bg-white border-blue-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className={`font-medium text-sm ${
                          notification.read ? 'text-gray-700' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              notification.type === 'success' ? 'default' :
                              notification.type === 'warning' ? 'destructive' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {notification.type === 'success' ? '완료' :
                             notification.type === 'warning' ? '주의' : '정보'}
                          </Badge>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                      </div>
                      <p className={`text-xs mb-2 ${
                        notification.read ? 'text-gray-500' : 'text-gray-600'
                      }`}>
                        {notification.message}
                      </p>
                      <div className="text-xs text-gray-400">
                        {notification.time}
                      </div>
                    </div>
                  ))}
                  
                  {notifications.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">새로운 알림이 없습니다</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full text-sm"
                    onClick={() => setNotifications(prev => 
                      prev.map(n => ({ ...n, read: true }))
                    )}
                  >
                    모든 알림 읽음 처리
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <ThemeToggle />
            
            {/* 모바일 메뉴 */}
            <Sheet>
              <SheetTrigger asChild className="xl:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">메뉴 열기</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">M</span>
                    </div>
                    <div className="flex flex-col text-left">
                      <SheetTitle className="text-base">요르의 투자 플랫폼</SheetTitle>
                      <SheetDescription className="text-xs">니가 뭘 알아. 니가 뭘 아냐고</SheetDescription>
                    </div>
                  </div>
                </SheetHeader>
                
                <nav className="flex flex-col space-y-2 mt-8">
                  {navigationItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center space-x-3 px-3 py-3 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors"
                      >
                        <IconComponent className="h-5 w-5" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs px-2 py-0.5 h-auto">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </nav>

                <div className="mt-6 pt-6 border-t space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="검색..."
                      className="pl-10 w-full"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">테마</span>
                    <ThemeToggle />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}