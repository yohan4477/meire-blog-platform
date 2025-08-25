'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import Link from 'next/link';
import { formatKoreanDatetime } from '@/lib/date-utils';

interface TodayPost {
  id: number;
  logNo: number;
  title: string;
  summary: string;
  createdDate: string;
  views: number;
}

interface TodayPostsData {
  date: string;
  count: number;
  posts: TodayPost[];
}

export default function TodayPostsNotification() {
  const [todayPosts, setTodayPosts] = useState<TodayPostsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTodayPosts();
  }, []);

  const fetchTodayPosts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/merry/today-posts', {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });

      if (!response.ok) {
        throw new Error('오늘 포스트를 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setTodayPosts(data);
      setError(null);
    } catch (err) {
      console.error('오늘 포스트 로딩 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          {!isLoading && todayPosts && todayPosts.count > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {todayPosts.count}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-96">
        <SheetHeader>
          <SheetTitle>오늘의 새 포스트</SheetTitle>
          <SheetDescription>
            {todayPosts ? `${todayPosts.date}에 작성된 메르님의 새 포스트입니다` : '오늘 새로 작성된 포스트를 확인하세요'}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm text-gray-600">로딩 중...</span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{error}</p>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-2"
                onClick={fetchTodayPosts}
              >
                다시 시도
              </Button>
            </div>
          ) : todayPosts && todayPosts.posts.length > 0 ? (
            <>
              {todayPosts.posts.map((post) => (
                <Link 
                  key={post.id}
                  href={`/merry/posts/${post.logNo}`}
                  className="block"
                >
                  <div className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-colors cursor-pointer bg-white">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                        {post.title}
                      </h4>
                      <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0 bg-blue-100 text-blue-700">
                        NEW
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-3">
                      {post.summary}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{post.createdDate}</span>
                      <span>조회 {post.views}회</span>
                    </div>
                  </div>
                </Link>
              ))}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">오늘 새로운 포스트가 없습니다</p>
              <p className="text-xs mt-1">메르님의 새로운 소식을 기다려주세요!</p>
            </div>
          )}
          
          {todayPosts && todayPosts.count > 0 && (
            <div className="pt-4 border-t">
              <Link href="/merry">
                <Button variant="outline" className="w-full text-sm">
                  전체 포스트 보기 →
                </Button>
              </Link>
            </div>
          )}
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <Button 
            variant="outline" 
            className="w-full text-sm"
            onClick={fetchTodayPosts}
          >
            새로고침
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}