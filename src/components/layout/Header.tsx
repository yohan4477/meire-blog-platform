'use client';

import Link from 'next/link';
import { Search, BarChart3, BookOpen, User, PieChart, Brain, Bot, Home, TrendingUp, Activity, Menu, X, Bell, Settings, Shield } from 'lucide-react';
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
import TodayPostsNotification from '@/components/layout/TodayPostsNotification';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [isAgentActive, setIsAgentActive] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleAdminAccess = () => {
    if (adminPassword === 'admin123') {
      setIsAdminDialogOpen(false);
      setAdminPassword('');
      router.push('/admin/errors');
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  // 검색 기능
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    setIsSearching(true);
    setIsSearchOpen(true);

    try {
      const response = await fetch(`/api/search/stocks?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // 기존 타이머 클리어
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 300ms 후에 검색 실행 (디바운싱)
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(query);
    }, 300);
  };

  const handleSearchResultClick = (stock: any) => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
    router.push(`/merry/stocks/${stock.ticker}`);
  };

  // 검색창 외부 클릭시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navigationItems = [
    { href: "/", label: "홈", icon: Home },
    { href: "/merry", label: "메르 블로그", icon: User },
  ];
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="flex items-center space-x-1 sm:space-x-2 flex-shrink min-w-0">
            <div className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs sm:text-sm lg:text-lg">M</span>
            </div>
            <div className="flex flex-col min-w-0 max-w-[160px] sm:max-w-none">
              <span className="font-bold text-xs sm:text-sm lg:text-base leading-none whitespace-nowrap truncate">요르의 투자 플랫폼</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap truncate">니가 뭘 알아. 니가 뭘 아냐고.</span>
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
              href="/merry" 
              className="px-3 py-2 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors flex items-center space-x-1"
            >
              <User className="h-4 w-4" />
              <span>메르 블로그</span>
            </Link>
            
            {/* 관리자 버튼 */}
            <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
              <DialogTrigger asChild>
                <button
                  className="px-3 py-2 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors flex items-center space-x-1"
                >
                  <Shield className="h-4 w-4" />
                  <span>관리자</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>관리자 접근</DialogTitle>
                  <DialogDescription>
                    관리자 페이지에 접근하려면 비밀번호를 입력하세요.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                      비밀번호
                    </Label>
                    <input
                      id="password"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAdminAccess()}
                      className="col-span-3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="비밀번호를 입력하세요"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleAdminAccess}
                    className="w-full"
                  >
                    접근
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </nav>

          {/* 검색 및 액션 */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <div className="relative hidden sm:block" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="종목 검색"
                className="pl-10 w-48 lg:w-64"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery && setIsSearchOpen(true)}
              />
              
              {/* 검색 결과 드롭다운 */}
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                        <span>검색 중...</span>
                      </div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((stock: any, index) => (
                        <button
                          key={index}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between transition-colors"
                          onClick={() => handleSearchResultClick(stock)}
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">{stock.name}</span>
                              <span className="text-sm text-gray-500">({stock.ticker})</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {stock.market} • 언급 {stock.mentionCount}회
                            </div>
                          </div>
                          <div className="text-xs text-blue-600">
                            보기 →
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>"{searchQuery}"에 대한 검색 결과가 없습니다.</p>
                      <p className="text-xs mt-1">테슬라, 삼성전자, 애플 등으로 검색해보세요.</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8">
              <Search className="h-4 w-4" />
            </Button>

            {/* 오늘 포스트 알림 */}
            <TodayPostsNotification />

            <ThemeToggle />
            
            {/* 모바일 메뉴 */}
            <Sheet>
              <SheetTrigger asChild className="xl:hidden">
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
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
                      <SheetTitle className="text-sm sm:text-base whitespace-nowrap">요르의 투자 플랫폼</SheetTitle>
                      <SheetDescription className="text-xs whitespace-nowrap">니가 뭘 알아. 니가 뭘 아냐고.</SheetDescription>
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
                  
                  {/* 모바일 관리자 버튼 */}
                  <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
                    <DialogTrigger asChild>
                      <button
                        className="flex items-center space-x-3 px-3 py-3 text-sm font-medium hover:text-primary hover:bg-accent rounded-md transition-colors w-full text-left"
                      >
                        <Shield className="h-5 w-5" />
                        <span className="flex-1">관리자</span>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>관리자 접근</DialogTitle>
                        <DialogDescription>
                          관리자 페이지에 접근하려면 비밀번호를 입력하세요.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="mobile-password" className="text-right">
                            비밀번호
                          </Label>
                          <input
                            id="mobile-password"
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAdminAccess()}
                            className="col-span-3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="비밀번호를 입력하세요"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={handleAdminAccess}
                          className="w-full"
                        >
                          접근
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </nav>

                <div className="mt-6 pt-6 border-t space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="종목 검색"
                      className="pl-10 w-full"
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
                    
                    {/* 모바일 검색 결과 */}
                    {isSearchOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                        {isSearching ? (
                          <div className="p-4 text-center text-gray-500">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                              <span>검색 중...</span>
                            </div>
                          </div>
                        ) : searchResults.length > 0 ? (
                          <div className="py-2">
                            {searchResults.map((stock: any, index) => (
                              <button
                                key={index}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between transition-colors"
                                onClick={() => handleSearchResultClick(stock)}
                              >
                                <div className="flex flex-col">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-900">{stock.name}</span>
                                    <span className="text-sm text-gray-500">({stock.ticker})</span>
                                  </div>
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {stock.market} • 언급 {stock.mentionCount}회
                                  </div>
                                </div>
                                <div className="text-xs text-blue-600">
                                  보기 →
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : searchQuery ? (
                          <div className="p-4 text-center text-gray-500">
                            <p>"{searchQuery}"에 대한 검색 결과가 없습니다.</p>
                            <p className="text-xs mt-1">테슬라, 삼성전자, 애플 등으로 검색해보세요.</p>
                          </div>
                        ) : null}
                      </div>
                    )}
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