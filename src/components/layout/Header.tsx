'use client';

import Link from 'next/link';
import { Search, BarChart3, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">Y</span>
            </div>
            <span className="font-bold text-xl">요르의 투자 블로그</span>
          </Link>

          {/* 네비게이션 */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              홈
            </Link>
            <Link 
              href="/posts" 
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              포스트
            </Link>
            <Link 
              href="/philosophy" 
              className="text-sm font-medium hover:text-primary transition-colors flex items-center space-x-1"
            >
              <BookOpen className="h-4 w-4" />
              <span>투자 철학</span>
            </Link>
            <Link 
              href="/investment" 
              className="text-sm font-medium hover:text-primary transition-colors flex items-center space-x-1"
            >
              <BarChart3 className="h-4 w-4" />
              <span>투자 현황</span>
            </Link>
          </nav>

          {/* 검색 및 액션 */}
          <div className="flex items-center space-x-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="검색..."
                className="pl-10 w-64"
              />
            </div>
            <Button variant="ghost" size="icon" className="sm:hidden">
              <Search className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}